namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed record ReconcileAssemblyRequest(Guid Id, long Version, string EvidenceFingerprint,
    string Reason, string VerificationEvidence, bool ConfirmedStopped);
public sealed record AssemblyReconciliationObservation(string Status, AssemblyProviderSnapshot? Execution = null);
public interface ILabAssemblyReconciliationProvider
{
    // A read-only observation: do not apply receipts or acknowledge disputed evidence during review.
    Task<AssemblyReconciliationObservation> ObserveForReconciliationAsync(Guid id, CancellationToken ct);
}
public sealed record AssemblyReviewedConflict(Guid ReceiptId, string PayloadSha256, string? ConflictSha256);
public sealed record AssemblyReviewedConflictEvent(Guid EventId, string EvidenceSha256);
public sealed record AssemblySavedExecution(string State, string? ProviderJobId, DateTime? StartedAtUtc,
    DateTime? StoppedAtUtc, DateTime? DispositionAtUtc, string? DispositionReason);
public sealed record AssemblyReconciliationDecision(Guid Id, long ReviewedVersion, string EvidenceFingerprint,
    string Reason, string VerificationEvidence, bool ConfirmedStopped, AssemblySavedExecution SavedExecution,
    IReadOnlyList<AssemblyReviewedConflict> Conflicts, IReadOnlyList<AssemblyReviewedConflictEvent> ConflictEvents,
    IReadOnlyList<AssemblyReceiptReview> ReviewedReceipts,
    AssemblyReconciliationObservation ProviderObservation, DateTime ProviderObservedAtUtc);
public sealed record AssemblyReconciliationRecord(Guid Id, DateTime RecordedAtUtc, Guid? ActorUserId,
    AssemblyReconciliationDecision Decision);
public sealed record AssemblyReceiptReview(Guid Id, string EventId, long Sequence, string Outcome, string PayloadSha256,
    string? ConflictSha256, DateTime OccurredAtUtc, DateTime ReceivedAtUtc, string? State, string? ProviderJobId,
    DateTime? StartedAtUtc, DateTime? StoppedAtUtc, DateTime? DispositionAtUtc, string? Reason);
public sealed record AssemblyConflictObservation(Guid Id, DateTime RecordedAtUtc, string EventId, string PayloadSha256,
    string? State, DateTime? StartedAtUtc, DateTime? StoppedAtUtc, string? Reason);
public sealed record AssemblyReconciliationReview(bool HasUnresolvedConflict, bool Eligible, string? IneligibleReason,
    string EvidenceFingerprint, IReadOnlyList<AssemblyReceiptReview> Receipts,
    IReadOnlyList<AssemblyConflictObservation> AdditionalEvidence, IReadOnlyList<AssemblyReconciliationRecord> Decisions);

public sealed class LabAssemblyReconciliationService(PSeqOperationsDbContext db, LabAssemblyService service,
    ILabAssemblyProvider provider, TimeProvider time)
{
    internal const string DecisionKind = "ConflictReconciled";
    private sealed record ConflictEvidence(IReadOnlyList<AssemblyReviewedConflict> Receipts,
        IReadOnlyList<AssemblyReviewedConflictEvent> Events, string Fingerprint)
    {
        public bool Any => Receipts.Count > 0;
    }

    public async Task<AssemblyReconciliationReview> ReviewAsync(LabAssemblyJob job, CancellationToken ct)
    {
        var evidence = await ReadEvidenceAsync(db, job.Id, ct);
        var decisions = await DecisionsAsync(db, job.Id, ct);
        var unresolved = evidence.Any && !decisions.Any(d => d.Decision.EvidenceFingerprint == evidence.Fingerprint);
        var receipts = await db.Set<LabAssemblyReceipt>().AsNoTracking().Where(r => r.LabAssemblyJobId == job.Id)
            .OrderBy(r => r.Sequence).ThenBy(r => r.ReceivedAtUtc).ToListAsync(ct);
        var observations = await ObservationsAsync(db, job.Id, ct);
        var ineligible = !unresolved ? "There is no unresolved processing conflict."
            : !CanRetain(job.State) ? "Only ended unsuccessful attempts can be reconciled for repeat. Active or successful execution requires further investigation."
            : receipts.Where(r => r.Outcome == "Conflict" || r.ConflictSha256 != null).Any(r => IsActiveOrSuccessful(r.PayloadJson))
                || observations.Any(o => o.State is "Accepted" or "Running" or "Succeeded")
                ? "The disputed evidence includes active or successful processing. Establish its outcome before authorizing a repeat."
            : null;
        return new(unresolved, ineligible is null, ineligible, evidence.Fingerprint, receipts.Select(Receipt).ToArray(), observations, decisions);
    }

    public async Task ReconcileAsync(Guid workId, Guid id, ReconcileAssemblyRequest request, Guid actorId, CancellationToken ct)
    {
        if (request.Id == Guid.Empty || !request.ConfirmedStopped || string.IsNullOrWhiteSpace(request.Reason)
            || request.Reason.Trim().Length > 2000 || string.IsNullOrWhiteSpace(request.VerificationEvidence)
            || request.VerificationEvidence.Trim().Length > 4000 || request.EvidenceFingerprint?.Length != 64)
            throw LabAssemblyService.Error("Explain the decision, document independent verification, and confirm that the original execution has stopped and cannot resume.");
        var normalized = request with { Reason = request.Reason.Trim(), VerificationEvidence = request.VerificationEvidence.Trim() };
        // Obtain an independent read-only provider observation before taking the attempt lock.
        var preliminary = await service.RequireJobAsync(id, ct);
        if (preliminary.LabWorkOrderId != workId) throw LabAssemblyService.Error("Assembly job not found in this Lab Job.", 404);
        var replay = await ExistingAsync(request.Id, workId, id, normalized, actorId, ct);
        if (replay) return;
        if (!CanRetain(preliminary.State)) throw LabAssemblyService.Error("Only ended unsuccessful attempts can be reconciled for repeat.", 409);
        var observation = new AssemblyReconciliationObservation("UnavailableOrInconsistent");
        if (preliminary.ProviderKey == provider.Key && provider is ILabAssemblyReconciliationProvider observer)
        {
            try
            {
                observation = await observer.ObserveForReconciliationAsync(id, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception error) when (error is not OutOfMemoryException) { /* Independent evidence is still mandatory; never retain unsafe provider errors. */ }
        }
        var observedAt = time.GetUtcNow().UtcDateTime;
        if (observation.Execution is { } execution && preliminary.ProviderJobId is not null && execution.ProviderJobId != preliminary.ProviderJobId)
            throw LabAssemblyService.Error("The provider observation belongs to a different execution. Establish the original execution's outcome before reconciling.", 409);
        if (observation.Execution?.State is "Accepted" or "Running" or "Succeeded")
            throw LabAssemblyService.Error("The processing service reports active or successful execution. Investigate that evidence before authorizing a repeat.", 409);
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-reconciliation:" + request.Id, ct);
        await SampleShippingPackingData.LockAsync(db, "assembly-job:" + id, ct);
        if (await ExistingAsync(request.Id, workId, id, normalized, actorId, ct)) return;
        var job = await service.RequireJobAsync(id, ct); await db.Entry(job).ReloadAsync(ct);
        if (job.Version != request.Version) throw LabAssemblyService.Error("This attempt changed. Review the latest execution and receipts before reconciling.", 409);
        var review = await ReviewAsync(job, ct);
        if (review.EvidenceFingerprint != request.EvidenceFingerprint)
            throw LabAssemblyService.Error("Processing evidence changed. Review the latest receipts before reconciling.", 409);
        if (!review.Eligible) throw LabAssemblyService.Error(review.IneligibleReason!, 409);
        var evidence = await ReadEvidenceAsync(db, id, ct);
        var decision = new AssemblyReconciliationDecision(request.Id, job.Version, evidence.Fingerprint, normalized.Reason,
            normalized.VerificationEvidence, true, new(job.State, job.ProviderJobId, job.StartedAtUtc, job.StoppedAtUtc,
                job.DispositionAtUtc, job.DispositionReason), evidence.Receipts, evidence.Events, review.Receipts, observation, observedAt);
        // Preserve every execution fact and receipt. Only the reviewed attention condition is closed.
        job.SetAttention(null);
        service.Record(job, DecisionKind, actorId, decision, request.Id);
        await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
    }

    private async Task<bool> ExistingAsync(Guid requestId, Guid workId, Guid id, ReconcileAssemblyRequest request, Guid actorId, CancellationToken ct)
    {
        var existing = await db.Set<LabAssemblyEvent>().AsNoTracking().SingleOrDefaultAsync(e => e.Id == requestId, ct);
        if (existing is null) return false;
        var decision = existing.Kind == DecisionKind ? JsonSerializer.Deserialize<AssemblyReconciliationDecision>(existing.EvidenceJson, LabAssemblyService.Json) : null;
        if (existing.LabAssemblyJobId != id || existing.ActorUserId != actorId || decision is null
            || decision.ReviewedVersion != request.Version || decision.EvidenceFingerprint != request.EvidenceFingerprint
            || decision.Reason != request.Reason || decision.VerificationEvidence != request.VerificationEvidence
            || !decision.ConfirmedStopped || !await db.Set<LabAssemblyJob>().AnyAsync(j => j.Id == id && j.LabWorkOrderId == workId, ct))
            throw LabAssemblyService.Error("This request identity already belongs to a different reconciliation decision.", 409);
        return true;
    }

    internal static bool CanRetain(string state) => state is "Failed" or "Terminated" or "CancelledBeforeStart";
    internal static async Task<bool> HasUnresolvedConflictAsync(PSeqOperationsDbContext db, Guid id, CancellationToken ct)
    {
        var evidence = await ReadEvidenceAsync(db, id, ct);
        return evidence.Any && !(await DecisionsAsync(db, id, ct)).Any(d => d.Decision.EvidenceFingerprint == evidence.Fingerprint);
    }
    private static async Task<ConflictEvidence> ReadEvidenceAsync(PSeqOperationsDbContext db, Guid id, CancellationToken ct)
    {
        var receipts = await db.Set<LabAssemblyReceipt>().AsNoTracking().Where(r => r.LabAssemblyJobId == id
            && (r.Outcome == "Conflict" || r.ConflictSha256 != null)).OrderBy(r => r.Id)
            .Select(r => new AssemblyReviewedConflict(r.Id, r.PayloadSha256, r.ConflictSha256)).ToListAsync(ct);
        if (receipts.Count == 0) return new(receipts, [], Hash("No conflicts"));
        var events = await db.Set<LabAssemblyEvent>().AsNoTracking().Where(e => e.LabAssemblyJobId == id && e.Kind == "ReceiptConflict")
            .OrderBy(e => e.Id).Select(e => new { e.Id, e.EvidenceJson }).ToListAsync(ct);
        var journal = events.Select(e => new AssemblyReviewedConflictEvent(e.Id, Hash(e.EvidenceJson))).ToArray();
        return new(receipts, journal, Hash(JsonSerializer.Serialize(new { receipts, events = journal }, LabAssemblyService.Json)));
    }
    private static async Task<IReadOnlyList<AssemblyReconciliationRecord>> DecisionsAsync(PSeqOperationsDbContext db, Guid id, CancellationToken ct)
    {
        var events = await db.Set<LabAssemblyEvent>().AsNoTracking().Where(e => e.LabAssemblyJobId == id && e.Kind == DecisionKind)
            .OrderBy(e => e.RecordedAtUtc).ToListAsync(ct);
        return events.Select(e => new AssemblyReconciliationRecord(e.Id, e.RecordedAtUtc, e.ActorUserId,
            JsonSerializer.Deserialize<AssemblyReconciliationDecision>(e.EvidenceJson, LabAssemblyService.Json)!)).ToArray();
    }
    internal static async Task RecordChangedPayloadAsync(PSeqOperationsDbContext db, LabAssemblyService service,
        LabAssemblyJob job, LabAssemblyReceipt receipt, string hash, string payload, DateTime now, CancellationToken ct)
    {
        var events = await db.Set<LabAssemblyEvent>().AsNoTracking().Where(e => e.LabAssemblyJobId == job.Id && e.Kind == "ReceiptConflict")
            .Select(e => e.EvidenceJson).ToListAsync(ct);
        if (events.Any(json => { using var document = JsonDocument.Parse(json); var root = document.RootElement;
            return root.TryGetProperty("observedPayloadSha256", out var savedHash) && savedHash.GetString() == hash
                && root.TryGetProperty("receiptId", out var savedReceipt) && savedReceipt.GetGuid() == receipt.Id; })) return;
        job.SetAttention(LabAssemblyDelivery.ConflictAttention);
        receipt.Conflict(hash, now);
        service.Record(job, "ReceiptConflict", evidence: new { receiptId = receipt.Id, receipt.ProviderEventId,
            observedPayloadSha256 = hash, observedPayload = JsonSerializer.Deserialize<JsonElement>(payload) });
    }
    private static async Task<IReadOnlyList<AssemblyConflictObservation>> ObservationsAsync(PSeqOperationsDbContext db, Guid id, CancellationToken ct)
    {
        var events = await db.Set<LabAssemblyEvent>().AsNoTracking().Where(e => e.LabAssemblyJobId == id && e.Kind == "ReceiptConflict")
            .OrderBy(e => e.RecordedAtUtc).ToListAsync(ct);
        var rows = new List<AssemblyConflictObservation>();
        foreach (var e in events)
        {
            using var document = JsonDocument.Parse(e.EvidenceJson); var root = document.RootElement;
            if (!root.TryGetProperty("observedPayload", out var payload)) continue;
            rows.Add(new(e.Id, e.RecordedAtUtc, Text(root, "providerEventId") ?? "", Text(root, "observedPayloadSha256")!,
                Text(payload, "state"), Timestamp(payload, "startedAtUtc"), Timestamp(payload, "stoppedAtUtc"), Text(payload, "reason")));
        }
        return rows;
    }
    private static AssemblyReceiptReview Receipt(LabAssemblyReceipt receipt)
    {
        using var document = JsonDocument.Parse(receipt.PayloadJson); var p = document.RootElement;
        return new(receipt.Id, receipt.ProviderEventId, receipt.Sequence, receipt.Outcome, receipt.PayloadSha256,
            receipt.ConflictSha256, receipt.OccurredAtUtc, receipt.ReceivedAtUtc, Text(p, "state"), Text(p, "providerJobId"),
            Timestamp(p, "startedAtUtc"), Timestamp(p, "stoppedAtUtc"), Timestamp(p, "dispositionAtUtc"), Text(p, "reason"));
    }
    private static bool IsActiveOrSuccessful(string json)
    { using var document = JsonDocument.Parse(json); return Text(document.RootElement, "state") is "Accepted" or "Running" or "Succeeded"; }
    private static string? Text(JsonElement p, string name) => p.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    private static DateTime? Timestamp(JsonElement p, string name) => p.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String && value.TryGetDateTime(out var result) ? result : null;
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
