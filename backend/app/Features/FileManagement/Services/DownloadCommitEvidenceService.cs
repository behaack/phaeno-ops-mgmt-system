namespace PhaenoPortal.App.Features.FileManagement.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public class DownloadCommitEvidenceService(PSeqOperationsDbContext db)
{
    public virtual async Task EnsureTransferReadyAsync(CancellationToken token)
    {
        if (db.Database.CurrentTransaction is not null)
            throw Unavailable(); // No response may start under an uncommitted caller-owned transaction.
        await EnsureTrackingAsync(token);
    }

    public async Task EnsureTrackingAsync(CancellationToken token)
    {
        var enabled = await db.Database.SqlQuery<bool>($"SELECT current_setting('track_commit_timestamp') = 'on' AS \"Value\"").SingleAsync(token);
        if (!enabled) throw new OrderManagementException("retention_commit_tracking_unavailable",
            "Verified download timing is unavailable. Phaeno Operations must review database commit tracking.", StatusCodes.Status503ServiceUnavailable);
    }

    public async Task<OperationalDownloadCommitEvidence> CaptureAsync(Guid attemptId, DownloadCommitPhase phase,
        DateTime? admissionCutoff, CancellationToken token)
    {
        if (db.Database.CurrentTransaction is null) throw new InvalidOperationException("Commit evidence must be captured in the download transaction.");
        var transactionId = await db.Database.SqlQuery<string>($"SELECT pg_current_xact_id()::text AS \"Value\"").SingleAsync(token);
        var evidence = new OperationalDownloadCommitEvidence(attemptId, phase, transactionId,
            await RetentionTransaction.ClockAsync(db, token), admissionCutoff);
        db.OperationalDownloadCommitEvidence.Add(evidence);
        return evidence;
    }

    public virtual async Task ResolveAsync(IReadOnlyCollection<Guid> evidenceIds, CancellationToken token)
    {
        var pending = await db.OperationalDownloadCommitEvidence.AsNoTracking()
            .Where(value => evidenceIds.Contains(value.Id) && value.CommittedAtUtc == null).ToListAsync(token);
        if (pending.Count == 0) return;
        await EnsureTrackingAsync(token);
        foreach (var evidence in pending)
        {
            // xid8 retains the epoch. Refuse old/wrapped identities before converting to xid.
            var committed = await db.Database.SqlQuery<DateTime?>($"SELECT CASE WHEN pg_current_xact_id()::text::numeric - {evidence.SourceTransactionId}::numeric BETWEEN 0 AND 2147483647 THEN pg_xact_commit_timestamp({evidence.SourceTransactionId}::xid8::xid) END AS \"Value\"").SingleAsync(token);
            if (!committed.HasValue) throw Unavailable();
            var observed = await RetentionTransaction.ClockAsync(db, token);
            if (committed.Value > observed) throw Unavailable();
            await db.OperationalDownloadCommitEvidence.Where(value => value.Id == evidence.Id && value.CommittedAtUtc == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(value => value.CommittedAtUtc, committed)
                    .SetProperty(value => value.ObservedAtUtc, observed).SetProperty(value => value.Version, value => value.Version + 1), token);
        }
    }

    public async Task<DateTime> ReadCommitAsync(Guid evidenceId, CancellationToken token)
    {
        await ResolveAsync([evidenceId], token);
        return await db.OperationalDownloadCommitEvidence.AsNoTracking().Where(value => value.Id == evidenceId)
            .Select(value => value.CommittedAtUtc).SingleAsync(token) ?? throw Unavailable();
    }

    public async Task<IReadOnlyDictionary<Guid, DateTime>> ReadCompletionsAsync(IReadOnlyCollection<OperationalFileDownload> attempts, CancellationToken token)
    {
        var ids = attempts.Where(value => value.Outcome == OperationalFileDownloadOutcome.Succeeded && value.CountsForReleasedPackageRetention).Select(value => value.Id).Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<Guid, DateTime>();
        var events = await db.OperationalDownloadCommitEvidence.AsNoTracking().Where(value => ids.Contains(value.OperationalFileDownloadId)
            && value.Phase == DownloadCommitPhase.Completion).ToListAsync(token);
        if (events.Count != ids.Count) throw Unavailable(); // Historical evidence is never invented from request timestamps.
        await ResolveAsync(events.Select(value => value.Id).ToList(), token);
        return await db.OperationalDownloadCommitEvidence.AsNoTracking().Where(value => ids.Contains(value.OperationalFileDownloadId)
            && value.Phase == DownloadCommitPhase.Completion).ToDictionaryAsync(value => value.OperationalFileDownloadId,
                value => value.CommittedAtUtc!.Value, token);
    }

    internal static OrderManagementException Unavailable() => new("retention_commit_evidence_unavailable",
        "The download commit time could not be verified. Try again or contact Phaeno Operations; the retention decision has not been changed.", StatusCodes.Status503ServiceUnavailable);
}

public sealed class DownloadCommitEvidenceReconciler(IServiceScopeFactory scopes, IOptions<PSeqOrderToCashOptions> options, IOptions<OrderManagementOptions> orderOptions,
    ILogger<DownloadCommitEvidenceReconciler> logger) : BackgroundService
{
    public override async Task StartAsync(CancellationToken token)
    {
        if (options.Value.GovernedPSeqResults || orderOptions.Value.ReleasedDeliverableRetentionEnforcement)
        {
            await using var scope = scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<DownloadCommitEvidenceService>().EnsureTrackingAsync(token);
        }
        await base.StartAsync(token);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.GovernedPSeqResults && !orderOptions.Value.ReleasedDeliverableRetentionEnforcement) return;
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                var ids = await db.OperationalDownloadCommitEvidence.AsNoTracking().Where(value => value.CommittedAtUtc == null)
                    .OrderBy(value => value.RecordedAtUtc).Select(value => value.Id).ToListAsync(stoppingToken);
                foreach (var id in ids)
                {
                    try { await scope.ServiceProvider.GetRequiredService<DownloadCommitEvidenceService>().ResolveAsync([id], stoppingToken); }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { throw; }
                    catch (Exception error) { logger.LogError(error, "Download commit evidence {EvidenceId} requires Operations review.", id); }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error) { logger.LogError(error, "Download commit evidence reconciliation failed."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
