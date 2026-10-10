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
            if (!options.Value.WorkerEnabled) continue;
            try { await PumpAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception error) { logger.LogError("Assembly runner check failed ({ErrorType}); saved jobs will be reconciled.", error.GetType().Name); }
        }
    }

    public async Task PumpAsync(CancellationToken ct)
    {
        if (!options.Value.WorkerEnabled) return;
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
                await jobScope.ServiceProvider.GetRequiredService<LabAssemblyDelivery>().CheckDeadlinesAsync(candidate.Id, ct);
                if (provider.Availability.Available || candidate.State == "Succeeded") await jobScope.ServiceProvider.GetRequiredService<LabAssemblyProcessor>().ProcessAsync(candidate.Id, ct);
            }
            if (!provider.Availability.Available) return;
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
    ILabAssemblyProvider provider, LabAssemblyProgress progress, TimeProvider time, LabAssemblyDelivery delivery,
    DpsOutputAdmission? outputAdmission = null, IOptions<DpsOptions>? dpsOptions = null, IOptions<LabAssemblyOptions>? assemblyOptions = null)
{
    public async Task ProcessAsync(Guid id, CancellationToken ct, bool failInitialDispatch = false, string requiredCommandKind = "Run")
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(provider.Key == DpsContract.Provider ? Math.Clamp(dpsOptions?.Value.OperationTimeoutSeconds ?? 300, 30, 900) : 30));
        var token = timeout.Token;
        try
        {
            var job = await service.RequireJobAsync(id, token);
            if (job.State == "Succeeded" && job.ProviderKey == DpsContract.Provider && !job.LabAnalysisRunId.HasValue
                && job.AttentionReason != LabAssemblyDelivery.ConflictAttention) {
                if (outputAdmission is null) throw DpsContract.Invalid();
                await outputAdmission.AdmitAsync(id, token); return;
            }
            if (job.IsTerminal && job.AttentionReason is null) { progress.Forget(id); return; }
            if (!provider.Availability.Available) {
                if (failInitialDispatch) throw DpsMqttClient.Unavailable();
                return;
            }
            if (job.ProviderKey != provider.Key) throw LabAssemblyService.Error("This job requires its original processing provider.", 409);
            if (job.State == "Queued")
            {
                await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, token);
                await db.Entry(job).ReloadAsync(token);
                if (job.IsTerminal) return;
                await SampleShippingPackingData.LockAsync(db, "assembly-dispatch-capacity", token);
                var limit = Math.Clamp(assemblyOptions?.Value.MaximumConcurrentJobs ?? 4, 1, 32);
                if (await db.Set<LabAssemblyJob>().CountAsync(j => j.State == "Dispatching" || j.State == "Accepted" || j.State == "Running", token) >= limit)
                    throw new OrderManagementException("assembly_dispatch_capacity", "Assembly dispatch is waiting for a processing slot. The saved request remains queued.", 503);
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
                if (!await delivery.BeginAttemptAsync(id, "Run", token)) return;
                snapshot = await provider.StartAsync(job, token);
            }
            await ApplyAsync(id, snapshot, token);
            await db.Entry(job).ReloadAsync(token);
            if (!job.IsTerminal && job.CancellationRequestedAtUtc.HasValue && provider.Availability.SupportsCancellation)
            {
                if (!await delivery.BeginAttemptAsync(id, "Cancel", token)) return;
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
            var confirmed = job.State is "Accepted" or "Running" or "Succeeded" or "Failed" or "Terminated";
            var message = job.State == "Succeeded" && job.ProviderKey == DpsContract.Provider
                ? "DPS outputs could not be admitted. The execution outcome remains saved; output admission will retry."
                : confirmed ? "DPS recovery or command delivery is unavailable. Recorded execution facts remain unchanged; reconciliation will continue."
                : error is OrderManagementException domain ? domain.Message
                : error is ArgumentException or InvalidOperationException
                    ? "The processing service returned inconsistent execution evidence. Operations must reconcile this job."
                    : "The processing service could not be reached. The job outcome remains unconfirmed; recovery will retry.";
            if (await delivery.RefreshAttentionAsync(job, ct)) service.Record(job, "DeliveryAttentionRequired");
            else if (job.AttentionReason is null || !job.AttentionReason.StartsWith("Unconfirmed ") && job.AttentionReason != LabAssemblyDelivery.ConflictAttention)
            { if (job.SetAttention(message)) service.Record(job, "AttentionRequired"); }
            await db.SaveChangesAsync(ct);
            if (tx is not null) await tx.CommitAsync(ct);
            progress.Forget(id);
            if (failInitialDispatch && (requiredCommandKind == "Cancel" || !confirmed || job.AttentionReason == LabAssemblyDelivery.ConflictAttention)) throw new OrderManagementException("assembly_dispatch_failed",
                $"DPS {requiredCommandKind} dispatch failed or was not confirmed for saved attempt {id:D}. Open this attempt and reconcile its original ID; its recorded execution facts remain unchanged.",
                error is OrderManagementException rejected && rejected.StatusCode == 502 ? 502 : 503,
                new { assemblyJobId = id, commandKind = requiredCommandKind, dispatchConfirmed = requiredCommandKind == "Run" && confirmed });
        }
    }

    public async Task ApplyAsync(Guid id, AssemblyProviderSnapshot snapshot, CancellationToken ct)
    {
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, ct);
        var job = await service.RequireJobAsync(id, ct);
        await db.Entry(job).ReloadAsync(ct);
        if (await delivery.HasConflictAsync(id, ct)) throw LabAssemblyService.Error(LabAssemblyDelivery.ConflictAttention, 409);
        if (job.ProviderKey == DpsContract.Provider && (snapshot.State is "Accepted" or "Running" or "Succeeded")
            && await db.Set<LabAssemblyCommand>().AnyAsync(c => c.LabAssemblyJobId == id && c.Kind == "Run" && c.Suppressed, ct))
            throw DpsContract.Invalid();
        if (job.IsTerminal && snapshot.ProviderJobId == job.ProviderJobId && snapshot.State is "Accepted" or "Running")
        { progress.Forget(id); return; }
        if (snapshot.OutputManifestJson is { } manifest)
        {
            if (manifest.Length > 1_000_000) throw new ArgumentException("Output receipt exceeds its size limit.");
            using var parsed = JsonDocument.Parse(manifest);
        }
        var changed = job.Observe(snapshot.ProviderJobId, snapshot.State, snapshot.StartedAtUtc, snapshot.StoppedAtUtc,
            snapshot.DispositionAtUtc, snapshot.Reason, snapshot.OutputManifestJson, snapshot.NeverStarted, time.GetUtcNow().UtcDateTime);
        if (job.State == "Succeeded" && job.ProviderKey == DpsContract.Provider && !job.LabAnalysisRunId.HasValue && job.AttentionReason is null)
            changed |= job.SetAttention(DpsOutputAdmission.Pending);
        await delivery.ConfirmAsync(job, ct);
        if (await delivery.RefreshAttentionAsync(job, ct)) changed = true;
        if (changed)
        {
            service.Record(job, job.State);
            await db.SaveChangesAsync(ct);
        }
        else await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        if (job.IsTerminal) progress.Forget(id);
        else if (snapshot.Percentage is { } percentage) progress.Report(id, percentage, snapshot.ProgressSequence);
    }

    private async Task VerifyFrozenInputsAsync(LabAssemblyJob job, CancellationToken ct)
    {
        var frozen = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json)!;
        if (job.ProviderKey == DpsContract.Provider && !await db.LabWorkOrders.AnyAsync(w => w.Id == job.LabWorkOrderId
            && w.SubmittingOrganizationId == job.OrganizationId && w.CurrentAuthorizationVersion == frozen.AuthorizationVersion, ct))
            throw LabAssemblyService.Error("The Lab Job authorization changed after this request. Reconcile its saved assembly scope before dispatch.", 409);
        var ids = frozen.Inputs.Select(i => i.SequencingOutputId).ToArray();
        var inputs = await db.LabSequencingOutputs.AsNoTracking().Where(o => ids.Contains(o.Id)
            && o.LabWorkOrderId == job.LabWorkOrderId && o.LabSpecimenId == job.LabSpecimenId).ToListAsync(ct);
        if (inputs.Count != ids.Length) throw LabAssemblyService.Error("An assembly input is missing or outside this sample's scope.", 409);
        await new LabResultLineageService(db).RequireCurrentFastqInputsAsync(inputs, ct);
        var receipt = await provider.VerifyInputsAsync(frozen.Inputs, ct);
        LabAssemblyService.ValidateVerification(frozen.Inputs, receipt, time.GetUtcNow().UtcDateTime);
        if (!receipt.Files.OrderBy(f => f.SequencingOutputId).SequenceEqual(frozen.Verification.Files.OrderBy(f => f.SequencingOutputId)))
            throw LabAssemblyService.Error("The S3 objects changed after this assembly request. Record corrected inputs before a new attempt.", 409);
    }
}
