namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Durable Queued/Dispatching job rows are the dispatch outbox. No in-process fire-and-forget jobs.</summary>
public sealed class LabAssemblyWorker(IServiceScopeFactory scopes, ILabAssemblyProvider provider,
    IOptions<LabAssemblyOptions> options, ILogger<LabAssemblyWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Clamp(options.Value.PollSeconds, 2, 60)));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            if (!options.Value.WorkerEnabled || !provider.Availability.Available) continue;
            try { await PumpAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception error) { logger.LogError("Assembly runner check failed ({ErrorType}); saved jobs will be reconciled.", error.GetType().Name); }
        }
    }

    public async Task PumpAsync(CancellationToken ct)
    {
        if (!options.Value.WorkerEnabled || !provider.Availability.Available) return;
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        // Connection-owned advisory lease: only one dispatcher across API replicas. A process loss releases it.
        // Unlike a heartbeat table, polling transient progress does not write lease/progress rows.
        var locked = false;
        try
        {
            if (db.Database.IsNpgsql())
            {
                await db.Database.OpenConnectionAsync(ct);
                await using var command = db.Database.GetDbConnection().CreateCommand();
                command.CommandText = "SELECT pg_try_advisory_lock(20260922, 1)";
                locked = (bool)(await command.ExecuteScalarAsync(ct))!;
                if (!locked) return;
            }
            var jobs = await db.Set<LabAssemblyJob>().AsNoTracking()
                .Where(j => j.AttentionReason != null || j.State != "Succeeded" && j.State != "Failed" && j.State != "Terminated" && j.State != "CancelledBeforeStart")
                .OrderBy(j => j.RequestedAtUtc).Select(j => new { j.Id, j.State }).ToListAsync(ct);
            foreach (var candidate in jobs.Where(j => j.State != "Queued"))
            {
                await using var jobScope = scopes.CreateAsyncScope();
                await jobScope.ServiceProvider.GetRequiredService<LabAssemblyProcessor>().ProcessAsync(candidate.Id, ct);
            }
            var active = await db.Set<LabAssemblyJob>().CountAsync(j => j.State == "Dispatching" || j.State == "Accepted" || j.State == "Running", ct);
            var slots = Math.Max(0, Math.Clamp(options.Value.MaximumConcurrentJobs, 1, 32) - active);
            foreach (var candidate in jobs.Where(j => j.State == "Queued"))
            {
                if (slots == 0) break;
                await using var jobScope = scopes.CreateAsyncScope();
                await jobScope.ServiceProvider.GetRequiredService<LabAssemblyProcessor>().ProcessAsync(candidate.Id, ct);
                var state = await db.Set<LabAssemblyJob>().AsNoTracking().Where(j => j.Id == candidate.Id).Select(j => j.State).SingleAsync(ct);
                if (state is "Dispatching" or "Accepted" or "Running") slots--;
            }
        }
        finally
        {
            if (locked)
            {
                await using var command = db.Database.GetDbConnection().CreateCommand();
                command.CommandText = "SELECT pg_advisory_unlock(20260922, 1)";
                await command.ExecuteScalarAsync(CancellationToken.None);
            }
            if (db.Database.IsNpgsql()) await db.Database.CloseConnectionAsync();
        }
    }
}

public sealed class LabAssemblyProcessor(PSeqOperationsDbContext db, LabAssemblyService service,
    ILabAssemblyProvider provider, LabAssemblyProgress progress, TimeProvider time)
{
    public async Task ProcessAsync(Guid id, CancellationToken ct)
    {
        if (!provider.Availability.Available) return;
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(30));
        var token = timeout.Token;
        try
        {
            var job = await service.RequireJobAsync(id, token);
            if (job.IsTerminal && job.AttentionReason is null) { progress.Forget(id); return; }
            if (job.ProviderKey != provider.Key) throw LabAssemblyService.Error("This job requires its original processing provider.", 409);
            if (job.State == "Queued")
            {
                await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, token);
                await db.Entry(job).ReloadAsync(token);
                if (job.IsTerminal) return;
                var work = await service.RequireStartableAsync(job.LabWorkOrderId, job.LabSpecimenId, job.RequestedByUserId, token);
                await VerifyFrozenInputsAsync(job, token);
                if (job.BeginDispatch(time.GetUtcNow().UtcDateTime)) service.Record(job, "DispatchRequested");
                db.Entry(work).Property(w => w.UpdatedAt).IsModified = true;
                await db.SaveChangesAsync(token);
                if (tx is not null) await tx.CommitAsync(token);
            }
            // Always reconcile first, including after a lost start acknowledgement or API restart.
            var snapshot = await provider.FindAsync(id, token);
            if (snapshot is null)
            {
                await db.Entry(job).ReloadAsync(token);
                if (job.IsTerminal) return;
                if (job.State != "Dispatching" || job.CancellationRequestedAtUtc.HasValue || !provider.SupportsIdempotentStart)
                    throw LabAssemblyService.Error("The processing outcome is unknown. Reconciliation is required before another start.", 409);
                await using (var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, token))
                {
                    await service.RequireStartableAsync(job.LabWorkOrderId, job.LabSpecimenId, job.RequestedByUserId, token);
                    await VerifyFrozenInputsAsync(job, token);
                    if (tx is not null) await tx.CommitAsync(token);
                }
                snapshot = await provider.StartAsync(job, token);
            }
            await ApplyAsync(id, snapshot, token);
            await db.Entry(job).ReloadAsync(token);
            if (!job.IsTerminal && job.CancellationRequestedAtUtc.HasValue && provider.Availability.SupportsCancellation)
            {
                var cancelled = await provider.CancelAsync(id, job.CancellationReason!, token);
                if (cancelled is not null) await ApplyAsync(id, cancelled, token);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception error) when (error is not OutOfMemoryException)
        {
            db.ChangeTracker.Clear();
            await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, ct);
            var job = await service.RequireJobAsync(id, ct);
            // Fixed, user-safe explanations: provider exceptions can contain URLs or credentials.
            var message = error is OrderManagementException domain ? domain.Message
                : error is ArgumentException or InvalidOperationException
                    ? "The processing service returned inconsistent execution evidence. Operations must reconcile this job."
                    : "The processing service could not be reached. The job outcome remains unconfirmed; recovery will retry.";
            if (job.SetAttention(message)) { service.Record(job, "AttentionRequired"); await db.SaveChangesAsync(ct); }
            if (tx is not null) await tx.CommitAsync(ct);
            progress.Forget(id);
        }
    }

    public async Task ApplyAsync(Guid id, AssemblyProviderSnapshot snapshot, CancellationToken ct)
    {
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, ct);
        var job = await service.RequireJobAsync(id, ct);
        await db.Entry(job).ReloadAsync(ct);
        if (job.IsTerminal && snapshot.ProviderJobId == job.ProviderJobId && snapshot.State is "Accepted" or "Running")
        { progress.Forget(id); return; }
        if (snapshot.OutputManifestJson is { } manifest)
        {
            if (manifest.Length > 1_000_000) throw new ArgumentException("Output receipt exceeds its size limit.");
            using var parsed = JsonDocument.Parse(manifest);
        }
        var changed = job.Observe(snapshot.ProviderJobId, snapshot.State, snapshot.StartedAtUtc, snapshot.StoppedAtUtc,
            snapshot.DispositionAtUtc, snapshot.Reason, snapshot.OutputManifestJson, snapshot.NeverStarted, time.GetUtcNow().UtcDateTime);
        if (changed)
        {
            service.Record(job, job.State);
            await db.SaveChangesAsync(ct);
        }
        if (tx is not null) await tx.CommitAsync(ct);
        if (job.IsTerminal) progress.Forget(id);
        else if (snapshot.Percentage is { } percentage) progress.Report(id, percentage, snapshot.ProgressSequence);
    }

    private async Task VerifyFrozenInputsAsync(LabAssemblyJob job, CancellationToken ct)
    {
        var frozen = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json)!;
        var receipt = await provider.VerifyInputsAsync(frozen.Inputs, ct);
        LabAssemblyService.ValidateVerification(frozen.Inputs, receipt, time.GetUtcNow().UtcDateTime);
        if (!receipt.Files.OrderBy(f => f.SequencingOutputId).SequenceEqual(frozen.Verification.Files.OrderBy(f => f.SequencingOutputId)))
            throw LabAssemblyService.Error("The S3 objects changed after this assembly request. Record corrected inputs before a new attempt.", 409);
    }
}
