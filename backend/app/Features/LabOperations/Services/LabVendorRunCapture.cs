namespace PhaenoPortal.App.Features.LabOperations.Services;

using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

/// <summary>Actual instrument acquisitions are distinct from vendor jobs and purchased-run allocations.</summary>
internal static class LabVendorRunCapture
{
    internal static RecordVendorResultsRequest Normalize(RecordVendorResultsRequest request, DateTime now)
    {
        var entries = request.SequencingRuns ?? [];
        if (entries.Count > 256 || entries.Any(e => e is null || e.ScientificEvidence is null)
            || request.RunNotPerformed && entries.Count != 0)
            throw Invalid("Run not performed has no actual-run evidence; otherwise supply at most 256 explicit group mappings.");
        var normalized = new List<VendorSequencingRunCapture>();
        foreach (var entry in entries)
        {
            if (entry.SetId == Guid.Empty || entry.SetId.HasValue != entry.GroupNumber.HasValue || entry.GroupNumber <= 0
                || entry.SetId.HasValue && !request.FastqSetIds.Contains(entry.SetId.Value)
                || !entry.SetId.HasValue && request.FastqSetIds.Count > 0)
                throw Invalid("Map each actual run to an exact selected file set and group. Unmapped run evidence is only for receipts without FASTQ files.");
            try
            {
                var evidence = entry.ScientificEvidence with { ReceivedAtUtc = request.ResultsReceivedAtUtc,
                    Software = entry.ScientificEvidence.Software?.Count > 0 ? entry.ScientificEvidence.Software : null,
                    Documents = entry.ScientificEvidence.Documents?.Count > 0 ? entry.ScientificEvidence.Documents : null };
                evidence = evidence.Normalize(now);
                if (!evidence.RunStartedAtUtc.HasValue || !evidence.RunCompletedAtUtc.HasValue
                    || evidence.RunStartedAtUtc < request.RunStartedAtUtc || evidence.RunCompletedAtUtc > request.RunCompletedAtUtc
                    || evidence.RunCompletedAtUtc > evidence.ReceivedAtUtc || evidence.InputRoles?.Count > 0)
                    throw new ArgumentException("Record actual run start/completion inside the vendor receipt's overall run window, before receipt.");
                normalized.Add(entry with { RunReference = PSeq.Operations.Laboratory.Domain.LabLineageText.Required(entry.RunReference, 255), ScientificEvidence = evidence });
            }
            catch (ArgumentException ex) { throw Invalid(ex.Message); }
        }
        if (normalized.Where(e => e.SetId.HasValue).Select(e => (e.SetId, e.GroupNumber)).Distinct().Count() != normalized.Count(e => e.SetId.HasValue))
            throw Invalid("Each selected file group requires exactly one actual sequencing-run mapping.");
        if (normalized.Where(e => e.SetId.HasValue).GroupBy(e => e.SetId).Any(g => g.Select(e => e.RunReference).Distinct(StringComparer.Ordinal).Count() > 1))
            throw Invalid("A file set belongs to one purchased run and actual acquisition. Use a separately authorized purchased run for distinct acquisitions.");
        if (normalized.GroupBy(e => e.RunReference, StringComparer.Ordinal).Any(g =>
            g.Select(e => e.ScientificEvidence.RunStartedAtUtc).Distinct().Count() > 1
            || g.Select(e => e.ScientificEvidence.RunCompletedAtUtc).Distinct().Count() > 1
            || g.Select(e => e.ScientificEvidence.Instrument).Where(i => i != null).Distinct(StringComparer.Ordinal).Count() > 1))
            throw Invalid("The same actual acquisition reference must retain consistent run times and instrument identity across its groups.");
        return request with { SequencingRuns = normalized.OrderBy(e => e.SetId).ThenBy(e => e.GroupNumber).ThenBy(e => e.RunReference, StringComparer.Ordinal).ToArray() };
    }

    internal static void RequireGroups(IReadOnlyList<VendorSequencingRunCapture>? entries, Guid setId, IEnumerable<int> groups)
    {
        var expected = groups.Distinct().Order().ToArray();
        var actual = (entries ?? []).Where(e => e.SetId == setId).Select(e => e.GroupNumber!.Value).Order().ToArray();
        if (!expected.SequenceEqual(actual)) throw Invalid("Record the actual sequencing run and provenance for every selected FASTQ group, without extra groups.");
    }

    private static OrderManagementException Invalid(string message) => new("vendor_run_capture_invalid", message, 400);
}
