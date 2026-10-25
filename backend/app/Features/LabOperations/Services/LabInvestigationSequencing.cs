namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Frozen sendout membership is the authority for shared history, including failed and unperformed runs.</summary>
internal sealed class LabInvestigationSequencing(PSeqOperationsDbContext db)
{
    private static readonly string[] MemberFields = ["memberId", "workOrderId", "specimenId", "libraryId", "libraryKey",
        "libraryContainerId", "libraryContainerBarcode", "sequencingContainerId", "containerBarcode", "materialTransferId",
        "quantity", "quantityUnit", "catalogItemId", "catalogVersion", "catalogServiceName", "minimumSequencingVolumeUl"];
    private static readonly string[] SharedEventFields = ["evidence", "carrier", "trackingReference", "providerReference",
        "expectedCompletionAtUtc", "recordedAtUtc", "from", "to", "status", "resultVersion", "resultVersionId", "isCorrection"];

    internal static IReadOnlyList<JsonElement> Members(string manifest, IReadOnlyDictionary<Guid, string> libraries)
    {
        using var json = JsonDocument.Parse(manifest);
        if (!json.RootElement.TryGetProperty("members", out var members) || members.ValueKind != JsonValueKind.Array) throw Invalid();
        var selected = new List<JsonElement>();
        var seen = new HashSet<Guid>();
        foreach (var member in members.EnumerateArray())
        {
            if (!member.TryGetProperty("libraryId", out var id) || !id.TryGetGuid(out var libraryId) || !libraries.TryGetValue(libraryId, out var key)) continue;
            if (!seen.Add(libraryId) || !member.TryGetProperty("libraryKey", out var savedKey) || savedKey.GetString() != key) throw Invalid();
            selected.Add(JsonSerializer.SerializeToElement(member.EnumerateObject().Where(p => MemberFields.Contains(p.Name))
                .ToDictionary(p => p.Name, p => p.Value.Clone()), JsonSerializerOptions.Web));
        }
        return selected;
    }

    internal static object Version(LabVendorResultsVersion version, IReadOnlyDictionary<Guid, string> libraries)
    {
        var snapshot = JsonSerializer.Deserialize<VendorResultsSnapshot>(version.SnapshotJson, JsonSerializerOptions.Web) ?? throw Invalid();
        var members = Members(snapshot.ManifestJson, libraries);
        var libraryIds = members.Select(m => m.GetProperty("libraryId").GetGuid()).ToHashSet();
        var outcomes = snapshot.Libraries.Where(l => libraryIds.Contains(l.LibraryId)).ToArray();
        if (snapshot.SendoutId != version.LabNgsSendoutId || outcomes.Length != libraryIds.Count
            || outcomes.Select(l => l.LibraryId).Distinct().Count() != libraryIds.Count
            || outcomes.Any(l => libraries[l.LibraryId] != l.LibraryKey)) throw Invalid();
        var memberIds = outcomes.Select(l => l.MemberId).ToHashSet();
        return new { version.Id, version.LabNgsSendoutId, version.ResultVersion, version.RecordedAtUtc,
            version.RecordedByUserId, version.RecordedByName,
            scope = "Shared vendor result version; only this sample's library outcomes and files are included.",
            snapshot.ProviderName, snapshot.VendorJobReference, snapshot.RunNotPerformed, snapshot.RunStartedAtUtc,
            snapshot.RunCompletedAtUtc, snapshot.ResultsReceivedAtUtc, snapshot.BatchCompletedAtUtc,
            libraries = outcomes, fastqSets = snapshot.FastqSets?.Where(s => memberIds.Contains(s.MemberId)).ToArray() ?? [],
            sequencingRuns = snapshot.SequencingRuns?.Where(r => r.SetId.HasValue
                ? snapshot.FastqSets?.Any(s => s.SetId == r.SetId && memberIds.Contains(s.MemberId)) == true
                : (snapshot.FastqSets?.Count ?? 0) == 0).Select(r => new { r.SetId, r.GroupNumber, r.RunReference,
                    scope = r.SetId.HasValue ? "This sample's exact FASTQ group."
                        : "Shared failed-run declaration; per-library run coverage was not recorded. Other sample mapping and batch documents remain in the vendor workspace.",
                    scientificEvidence = r.SetId.HasValue ? r.ScientificEvidence : new LabScientificEvidence(1,
                        Instrument: r.ScientificEvidence.Instrument, Flowcell: r.ScientificEvidence.Flowcell, Lane: r.ScientificEvidence.Lane,
                        RunStartedAtUtc: r.ScientificEvidence.RunStartedAtUtc, RunCompletedAtUtc: r.ScientificEvidence.RunCompletedAtUtc,
                        ReceivedAtUtc: r.ScientificEvidence.ReceivedAtUtc) }).ToArray() ?? [],
            actualRunAvailability = snapshot.RunNotPerformed ? "Run not performed."
                : snapshot.SequencingRuns?.Count > 0 ? "Explicit vendor-declared actual-run evidence; not scientific qualification."
                : "Unknown: this version did not capture actual sequencing-run provenance separately from the vendor job.",
            correctionRecorded = version.ResultVersion > 1,
            sharedNotesAvailability = "Batch-wide notes and correction explanations remain in the original vendor result version." };
    }

    internal static object Custody(LabCustodyEvent entry, bool containerSpecific)
    {
        using var details = JsonDocument.Parse(entry.DetailsJson);
        if (details.RootElement.ValueKind != JsonValueKind.Object) throw Invalid();
        // Shared result payloads contain other libraries' exceptions, file IDs and before-snapshots.
        // Their safe sample-specific contents are supplied by Version, never by returning raw JSON.
        var filtered = details.RootElement.EnumerateObject().Where(p => SharedEventFields.Contains(p.Name)
            && p.Value.ValueKind is not (JsonValueKind.Array or JsonValueKind.Object))
            .ToDictionary(p => p.Name, p => p.Value.Clone());
        return new { entry.Id, entry.LabNgsSendoutId, entry.LabContainerId, entry.EventCode, entry.LocationOrParty,
            entry.RecordedByUserId, entry.OccurredAtUtc,
            scope = containerSpecific ? "This sample's physical tube" : "Shared sendout event applying through frozen sample membership",
            details = containerSpecific ? details.RootElement.Clone() : JsonSerializer.SerializeToElement(filtered),
            detailsAvailability = containerSpecific ? "Original evidence for this sample's tube."
                : "Scoped details only; original batch-wide evidence remains in the batch workspace." };
    }

    public async Task<IReadOnlyCollection<Guid>> ReadAsync(Guid workId, Guid specimenId, Dictionary<string, object> evidence,
        List<string> limited, int limit, CancellationToken ct)
    {
        var libraries = await db.LabLibraries.AsNoTracking().Where(l => l.LabWorkOrderId == workId && l.LabSpecimenId == specimenId)
            .OrderBy(l => l.Id).Take(limit + 1).ToListAsync(ct);
        if (libraries.Count > limit) { limited.Add("sequencingHistory"); libraries.RemoveAt(limit); }
        var identities = libraries.ToDictionary(l => l.Id, l => l.LibraryKey);
        Expression<Func<LabNgsSendout, bool>> predicate = s => false;
        foreach (var library in libraries)
        {
            var needle = JsonSerializer.Serialize(new { members = new[] { new { libraryId = library.Id } } });
            Expression<Func<LabNgsSendout, bool>> next = s => EF.Functions.JsonContains(s.ManifestJson, needle);
            var body = new ReplaceParameter(next.Parameters[0], predicate.Parameters[0]).Visit(next.Body)!;
            predicate = Expression.Lambda<Func<LabNgsSendout, bool>>(Expression.OrElse(predicate.Body, body), predicate.Parameters);
        }
        var sendouts = await db.LabNgsSendouts.AsNoTracking().Where(predicate).OrderBy(s => s.CreatedAt).ThenBy(s => s.Id)
            .Take(limit + 1).ToListAsync(ct);
        if (sendouts.Count > limit) { limited.Add("sequencingHistory"); sendouts.RemoveAt(limit); }
        var membership = sendouts.ToDictionary(s => s.Id, s => Members(s.ManifestJson, identities));
        evidence["sequencingHistory"] = sendouts.Select(s => new { s.Id, s.LabOperationalBatchId, s.ProviderName,
            s.ProviderReference, s.Status, s.ShippedAtUtc, s.ProviderReceivedAtUtc,
            frozenMembers = membership[s.Id], scope = "Shared sendout; frozen membership is limited to this sample." }).ToArray();
        var sendoutIds = membership.Where(m => m.Value.Count > 0).Select(m => m.Key).ToArray();
        var versions = await db.LabVendorResultsVersions.AsNoTracking().Where(v => sendoutIds.Contains(v.LabNgsSendoutId))
            .OrderBy(v => v.RecordedAtUtc).ThenBy(v => v.Id).Take(limit + 1).ToListAsync(ct);
        if (versions.Count > limit) { limited.Add("vendorResults"); versions.RemoveAt(limit); }
        evidence["vendorResults"] = versions.Select(v => Version(v, identities)).ToArray();
        var containerIds = db.LabContainers.Where(c => c.LabWorkOrderId == workId && c.LabSpecimenId == specimenId).Select(c => c.Id);
        var custody = await db.LabCustodyEvents.AsNoTracking().Where(e => e.LabContainerId.HasValue
                ? containerIds.Contains(e.LabContainerId.Value) : sendoutIds.Contains(e.LabNgsSendoutId))
            .OrderBy(e => e.OccurredAtUtc).ThenBy(e => e.Id).Take(limit + 1).ToListAsync(ct);
        if (custody.Count > limit) { limited.Add("custody"); custody.RemoveAt(limit); }
        evidence["custody"] = custody.Select(e => Custody(e, e.LabContainerId.HasValue)).ToArray();
        return versions.Select(v => v.RecordedByUserId).Concat(custody.Select(e => e.RecordedByUserId)).Distinct().ToArray();
    }

    private sealed class ReplaceParameter(ParameterExpression source, ParameterExpression target) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) => node == source ? target : base.VisitParameter(node);
    }
    private static OrderManagementException Invalid() => new("investigation_sequencing_scope_invalid",
        "Saved sequencing membership or vendor history could not be resolved. Investigate the original sendout before using this evidence.", 409);
}
