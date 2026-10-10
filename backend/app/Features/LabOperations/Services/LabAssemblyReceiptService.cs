namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Internal normalized contract, not a DPS wire DTO or enum mapping.</summary>
public sealed record AssemblyLifecycleMessage(Guid JobId, string ProviderKey, string EventId, long Sequence,
    DateTime OccurredAtUtc, AssemblyProviderSnapshot Snapshot);
public sealed record AssemblyReceiptResult(Guid ReceiptId, bool ReadyToAcknowledge, bool Duplicate, bool Conflict);

public sealed class LabAssemblyReceiptService(PSeqOperationsDbContext db, LabAssemblyService service,
    LabAssemblyProcessor processor, LabAssemblyProgress progress, TimeProvider time)
{
    public async Task<AssemblyReceiptResult> ReceiveAsync(AssemblyLifecycleMessage message, CancellationToken ct)
    {
        if (db.Database.CurrentTransaction is not null) throw new InvalidOperationException("Lifecycle receipt must own its commit boundary.");
        var now = time.GetUtcNow().UtcDateTime;
        if (message.JobId == Guid.Empty || string.IsNullOrWhiteSpace(message.ProviderKey) || message.ProviderKey.Length > 100
            || string.IsNullOrWhiteSpace(message.EventId) || message.EventId.Length > 128 || message.Sequence < 1
            || message.ProviderKey != message.ProviderKey.Trim() || message.EventId != message.EventId.Trim()
            || message.OccurredAtUtc.Kind != DateTimeKind.Utc || message.OccurredAtUtc > now.AddMinutes(5))
            throw LabAssemblyService.Error("Invalid processing lifecycle identity or occurrence time.");
        if (message.Snapshot is null || string.IsNullOrWhiteSpace(message.Snapshot.ProviderJobId) || message.Snapshot.ProviderJobId.Length > 255
            || message.Snapshot.ProviderJobId != message.Snapshot.ProviderJobId.Trim()
            || message.Snapshot.State is not ("Accepted" or "Running" or "Succeeded" or "Failed" or "Terminated" or "CancelledBeforeStart"))
            throw LabAssemblyService.Error("Invalid processing lifecycle state or execution identity.");
        // Progress belongs only in the volatile cache and must not alter lifecycle deduplication.
        var snapshot = message.Snapshot;
        var json = JsonSerializer.Serialize(new
        {
            message.JobId, message.ProviderKey, message.EventId, message.Sequence, OccurredAtUtc = Precision(message.OccurredAtUtc),
            snapshot.ProviderJobId, snapshot.State, StartedAtUtc = Precision(snapshot.StartedAtUtc), StoppedAtUtc = Precision(snapshot.StoppedAtUtc),
            DispositionAtUtc = Precision(snapshot.DispositionAtUtc), snapshot.Reason, snapshot.OutputManifestJson, snapshot.NeverStarted,
        }, LabAssemblyService.Json);
        if (Encoding.UTF8.GetByteCount(json) > 1_100_000) throw LabAssemblyService.Error("Processing lifecycle evidence exceeds its limit.");
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)));
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await SampleShippingPackingData.LockAsync(db, "assembly-event:" + message.ProviderKey + ":" + message.EventId, ct);
        await SampleShippingPackingData.LockAsync(db, "assembly-job:" + message.JobId, ct);
        var job = await service.RequireJobAsync(message.JobId, ct); await db.Entry(job).ReloadAsync(ct);
        if (job.ProviderKey != message.ProviderKey) throw LabAssemblyService.Error("Processing evidence does not belong to this attempt's provider.", 409);
        if (job.ProviderJobId is not null && job.ProviderJobId != message.Snapshot.ProviderJobId)
            throw LabAssemblyService.Error("Processing evidence changed this attempt's execution identity.", 409);
        var receipt = await db.Set<LabAssemblyReceipt>().SingleOrDefaultAsync(r => r.ProviderKey == message.ProviderKey && r.ProviderEventId == message.EventId, ct);
        var duplicate = receipt is not null;
        if (receipt is not null)
        {
            // Another receiver may have recorded a conflict while this context retained the original receipt.
            await db.Entry(receipt).ReloadAsync(ct);
            if (receipt.LabAssemblyJobId != job.Id) throw LabAssemblyService.Error("Processing event identity belongs to another attempt.", 409);
            if (receipt.PayloadSha256 != hash)
            {
                receipt.Conflict(hash, now);
                if (job.SetAttention(LabAssemblyDelivery.ConflictAttention)) service.Record(job, "ReceiptConflict");
            }
        }
        else
        {
            var sequence = await db.Set<LabAssemblyReceipt>().Where(r => r.LabAssemblyJobId == job.Id && r.Outcome == "Applied"
                && !r.ProviderEventId.StartsWith("command:"))
                .Select(r => (long?)r.Sequence).MaxAsync(ct) ?? 0;
            var outcome = "Applied";
            if ((message.Sequence <= sequence || job.IsTerminal) && !IsFinal(message.Snapshot.State)) outcome = "Ignored";
            else
            {
                try
                {
                    if (message.Sequence <= sequence && !job.IsTerminal) throw new InvalidOperationException("Terminal evidence preceded a later lifecycle event.");
                    await processor.ApplyAsync(job.Id, message.Snapshot, ct);
                }
                catch (Exception error) when (error is ArgumentException or InvalidOperationException or OrderManagementException or JsonException)
                {
                    outcome = "Conflict";
                    if (job.SetAttention(LabAssemblyDelivery.ConflictAttention)) service.Record(job, "ReceiptConflict");
                }
            }
            receipt = new(job.Id, message.ProviderKey, message.EventId, message.Sequence, message.OccurredAtUtc, now, hash, json, outcome);
            db.Add(receipt);
        }
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return new(receipt.Id, receipt.CanAcknowledge, duplicate, !receipt.CanAcknowledge);
    }
    public async Task ReceiveProgressAsync(Guid id, string providerKey, string providerJobId, double percentage, long sequence, CancellationToken ct)
    {
        var job = await db.Set<LabAssemblyJob>().AsNoTracking().SingleOrDefaultAsync(j => j.Id == id, ct)
            ?? throw LabAssemblyService.Error("Assembly attempt not found.", 404);
        if (string.IsNullOrWhiteSpace(providerJobId) || job.ProviderKey != providerKey || job.ProviderJobId != providerJobId || sequence < 1
            || !double.IsFinite(percentage) || percentage is < 0 or > 100)
            throw LabAssemblyService.Error("Progress does not match the confirmed processing attempt.", 409);
        if (!job.IsTerminal) progress.Report(id, percentage, sequence);
    }
    private static bool IsFinal(string state) => state is "Succeeded" or "Failed" or "Terminated" or "CancelledBeforeStart";
    private static DateTime? Precision(DateTime? value) => value.HasValue
        ? new DateTime(value.Value.Ticks - value.Value.Ticks % 10, value.Value.Kind) : null;
}
