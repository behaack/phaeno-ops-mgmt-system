namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public sealed class DpsEventReceiver(PSeqOperationsDbContext db, LabAssemblyReceiptService receipts,
    LabAssemblyProcessor processor, LabAssemblyService service, DpsHandoff handoff, IOptions<DpsOptions> options, TimeProvider time)
{
    public async Task ReceiveEventAsync(DpsEvent evidence, Func<Guid, Guid, string, Guid?, string?, CancellationToken, Task> acknowledge, CancellationToken ct)
    {
        var job = await RequireJob(evidence.JobId, evidence.Environment, ct);
        DpsContract.Validate("event", JsonSerializer.SerializeToElement(evidence, DpsContract.Json));
        var now = time.GetUtcNow().UtcDateTime;
        DpsContract.RequireUtc(evidence.OccurredAtUtc, now); DpsContract.RequireUtc(evidence.StartedAtUtc, now);
        DpsContract.RequireUtc(evidence.StoppedAtUtc, now); DpsContract.RequireUtc(evidence.DispositionAtUtc, now);
        if (evidence.OccurredAtUtc < job.RequestedAtUtc || evidence.StartedAtUtc < job.RequestedAtUtc
            || evidence.StartedAtUtc > evidence.OccurredAtUtc || evidence.StartedAtUtc > evidence.StoppedAtUtc
            || evidence.StoppedAtUtc > evidence.DispositionAtUtc || evidence.DispositionAtUtc > evidence.OccurredAtUtc) throw DpsContract.Invalid();
        if (evidence.EventType == "Progress") {
            if (now - evidence.OccurredAtUtc < TimeSpan.FromMinutes(2))
                await receipts.ReceiveProgressAsync(job.Id, DpsContract.Provider, evidence.ProviderJobId, evidence.Percentage!.Value, evidence.Sequence, ct);
            await acknowledge(job.Id, evidence.EventId, "received", null, null, ct); return;
        }
        string? output = null;
        if (evidence.OutputManifest is { } locator) {
            var manifest = await handoff.ReadOutputAsync(job, locator, evidence, ct);
            output = JsonSerializer.Serialize(manifest, DpsContract.Json);
        }
        var snapshot = new AssemblyProviderSnapshot(evidence.ProviderJobId, evidence.EventType, evidence.StartedAtUtc,
            evidence.StoppedAtUtc, evidence.DispositionAtUtc, evidence.Reason, output, evidence.NeverStarted);
        var result = await receipts.ReceiveAsync(new(job.Id, DpsContract.Provider, evidence.EventId.ToString("D"), evidence.Sequence, evidence.OccurredAtUtc, snapshot), ct);
        await acknowledge(job.Id, evidence.EventId, result.ReadyToAcknowledge ? "committed" : "conflict",
            result.ReadyToAcknowledge ? result.ReceiptId : null, result.ReadyToAcknowledge ? null : "Conflicting execution evidence requires Operations reconciliation.", ct);
    }
    public async Task ReceiveCommandAsync(DpsReceipt evidence, CancellationToken ct)
    {
        DpsContract.Validate("command_receipt", JsonSerializer.SerializeToElement(evidence, DpsContract.Json));
        var now = time.GetUtcNow().UtcDateTime; DpsContract.RequireUtc(evidence.OccurredAtUtc, now);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await SampleShippingPackingData.LockAsync(db, "assembly-event:" + DpsContract.Provider + ":command:" + evidence.ReceiptId, ct);
        await SampleShippingPackingData.LockAsync(db, "assembly-job:" + evidence.JobId, ct);
        var job = await RequireJob(evidence.JobId, evidence.Environment, ct); await db.Entry(job).ReloadAsync(ct);
        var command = await db.Set<LabAssemblyCommand>().SingleAsync(c => c.Id == evidence.CommandId && c.LabAssemblyJobId == job.Id
            && c.Kind == (evidence.CommandKind == "Start" ? "Run" : "Cancel"), ct);
        await db.Entry(command).ReloadAsync(ct);
        if (evidence.OccurredAtUtc < command.RequestedAtUtc || evidence.ProviderJobId is not null && job.ProviderJobId is not null
            && evidence.ProviderJobId != job.ProviderJobId) throw DpsContract.Invalid();
        var key = "command:" + evidence.ReceiptId.ToString("D");
        var json = JsonSerializer.Serialize(evidence, DpsContract.Json);
        var hash = DpsS3Objects.Hash(System.Text.Encoding.UTF8.GetBytes(json));
        var existing = await db.Set<LabAssemblyReceipt>().SingleOrDefaultAsync(r => r.ProviderKey == DpsContract.Provider && r.ProviderEventId == key, ct);
        var contradiction = command.ReceivedAtUtc.HasValue && evidence.Outcome != "Accepted"
            || command.Suppressed && evidence.Outcome == "Accepted";
        if (existing is not null) {
            if (existing.LabAssemblyJobId != job.Id) throw DpsContract.Invalid();
            if (!existing.PayloadSha256.Equals(hash, StringComparison.OrdinalIgnoreCase)) {
                existing.Conflict(hash, now); job.SetAttention(LabAssemblyDelivery.ConflictAttention); service.Record(job, "ReceiptConflict");
            }
        } else {
            if (contradiction) {
                if (job.SetAttention(LabAssemblyDelivery.ConflictAttention)) service.Record(job, "ReceiptConflict");
            } else if (evidence.Outcome == "Accepted") {
                command.Receive(now);
                if (evidence.CommandKind == "Start" && !job.IsTerminal && (job.State is "Queued" or "Dispatching" or "Accepted"))
                    await processor.ApplyAsync(job.Id, new(evidence.ProviderJobId!, "Accepted"), ct);
            } else {
                command.Suppress();
                if (!job.IsTerminal && job.SetAttention("DPS did not accept the saved " + evidence.CommandKind + " command. Reconciliation is required.")) service.Record(job, "DispatchRejected");
            }
            // Control receipts use a separate event-ID namespace; their sentinel sequence is excluded from lifecycle ordering.
            db.Add(new LabAssemblyReceipt(job.Id, DpsContract.Provider, key, 1, evidence.OccurredAtUtc, now, hash, json, contradiction ? "Conflict" : "Applied"));
        }
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        if (existing?.ConflictSha256 is not null || existing?.Outcome == "Conflict" || contradiction) throw DpsContract.Invalid();
    }
    public async Task RejectEventAsync(JsonElement candidate, string topic,
        Func<Guid, Guid, string, Guid?, string?, CancellationToken, Task> acknowledge, CancellationToken ct)
    {
        if (candidate.ValueKind != JsonValueKind.Object || !candidate.TryGetProperty("dto_id", out var dto) || !dto.TryGetInt32(out var number) || number != 102
            || !candidate.TryGetProperty("environment", out var environment) || environment.GetString() != options.Value.Environment
            || !candidate.TryGetProperty("contract_version", out var version) || version.GetString() != DpsContract.Version
            || !candidate.TryGetProperty("job_id", out var jobValue) || !jobValue.TryGetGuid(out var job) || job == Guid.Empty
            || !candidate.TryGetProperty("event_id", out var eventValue) || !eventValue.TryGetGuid(out var @event) || @event == Guid.Empty
            || topic != $"{options.Value.TopicRoot}/jobs/{job:D}/events") return;
        _ = await RequireJob(job, options.Value.Environment, ct);
        await acknowledge(job, @event, "rejected", null, "Invalid scoped DPS evidence. No lifecycle commit was acknowledged.", ct);
    }
    private async Task<LabAssemblyJob> RequireJob(Guid id, string environment, CancellationToken ct)
    {
        var job = await db.Set<LabAssemblyJob>().SingleOrDefaultAsync(j => j.Id == id && j.ProviderKey == DpsContract.Provider, ct) ?? throw DpsContract.Invalid();
        var frozen = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json) ?? throw DpsContract.Invalid();
        if (environment != options.Value.Environment || frozen.Dps?.Instructions.Environment != environment) throw DpsContract.Invalid();
        return job;
    }
}
