namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabAssemblyDelivery(PSeqOperationsDbContext db, LabAssemblyService service,
    IOptions<LabAssemblyOptions> options, TimeProvider time)
{
    public const string ConflictAttention = "Conflicting processing evidence requires Operations reconciliation. Saved execution facts remain unchanged.";
    public async Task<bool> BeginAttemptAsync(Guid id, string kind, CancellationToken ct)
    {
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, ct);
        var job = await service.RequireJobAsync(id, ct); await db.Entry(job).ReloadAsync(ct);
        var command = await db.Set<LabAssemblyCommand>().SingleOrDefaultAsync(c => c.LabAssemblyJobId == id && c.Kind == kind, ct)
            ?? throw LabAssemblyService.Error("The saved delivery identity is missing. Operations must reconcile this attempt.", 409);
        await db.Entry(command).ReloadAsync(ct);
        if (job.IsTerminal || kind == "Run" && job.CancellationRequestedAtUtc.HasValue) command.Suppress();
        var now = time.GetUtcNow().UtcDateTime;
        var due = command.IsDue(now);
        if (due) command.Attempt(now, options.Value.RetryInitialSeconds, options.Value.RetryMaximumSeconds);
        await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return due;
    }
    public async Task ConfirmAsync(LabAssemblyJob job, CancellationToken ct)
    {
        var now = time.GetUtcNow().UtcDateTime;
        foreach (var command in await db.Set<LabAssemblyCommand>().Where(c => c.LabAssemblyJobId == job.Id).ToListAsync(ct))
        {
            await db.Entry(command).ReloadAsync(ct);
            if (job.IsTerminal || command.Kind == "Run" && job.State == "Running") command.Confirm(now);
            else if (command.Kind == "Run" && job.State == "Accepted") command.Receive(now);
        }
    }
    public async Task CheckDeadlinesAsync(Guid id, CancellationToken ct)
    {
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, ct);
        var job = await service.RequireJobAsync(id, ct); await db.Entry(job).ReloadAsync(ct);
        if (await RefreshAttentionAsync(job, ct)) service.Record(job, "DeliveryAttentionRequired");
        await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
    }
    public async Task<bool> RefreshAttentionAsync(LabAssemblyJob job, CancellationToken ct)
    {
        if (await HasConflictAsync(job.Id, ct)) return job.SetAttention(ConflictAttention);
        if (job.IsTerminal) return false;
        var now = time.GetUtcNow().UtcDateTime;
        var pending = await db.Set<LabAssemblyCommand>().Where(c => c.LabAssemblyJobId == job.Id
            && c.ConfirmedAtUtc == null && !c.Suppressed).OrderBy(c => c.Kind).ToListAsync(ct);
        string? attention = null;
        foreach (var command in pending)
        {
            // Queries can return tracked commands whose confirmation was just changed in this transaction.
            if (command.ConfirmedAtUtc.HasValue || command.Suppressed || command.Kind == "Run" && job.State == "Queued") continue;
            var deadline = command.Kind == "Cancel" ? options.Value.CancellationConfirmationSeconds
                : command.ReceivedAtUtc.HasValue ? options.Value.StartConfirmationSeconds : options.Value.CommandReceiptSeconds;
            var since = command.Kind == "Run" ? command.ReceivedAtUtc ?? command.FirstAttemptAtUtc ?? command.RequestedAtUtc
                : command.FirstAttemptAtUtc ?? command.RequestedAtUtc;
            if (command.Escalate(now, Math.Clamp(options.Value.EscalationSeconds, 60, 86400))) service.Record(job, "DeliveryEscalated");
            if (command.EscalatedAtUtc.HasValue || now >= since.AddSeconds(Math.Clamp(deadline, 1, 86400)))
            {
                var missing = command.Kind == "Cancel" ? "cancellation outcome" : command.ReceivedAtUtc.HasValue ? "execution start" : "Run receipt";
                attention ??= command.EscalatedAtUtc.HasValue
                    ? $"Unconfirmed {missing}. Escalated for Operations review after the configured deadline; recovery continues."
                    : $"Unconfirmed {missing}. Recovery continues; execution has not been inferred from delivery.";
            }
        }
        return attention is not null && job.SetAttention(attention);
    }
    public Task<bool> HasConflictAsync(Guid id, CancellationToken ct) => db.Set<LabAssemblyReceipt>()
        .AnyAsync(r => r.LabAssemblyJobId == id && (r.Outcome == "Conflict" || r.ConflictSha256 != null), ct);
}
