namespace PhaenoPortal.App.Features.FileManagement.Services;

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class GovernedRetentionCheckpointService(PSeqOperationsDbContext db, IOptions<InvitationOptions> links)
{
    public const string WorkflowType = "ReleasedDeliverableRetention";

    // The explicit time is for deterministic local verification; the worker uses the database clock after locking.
    internal async Task ProcessAsync(Guid packageId, CancellationToken token, DateTime? evaluationTime = null)
    {
        await using var transaction = await RetentionTransaction.OpenAsync(db, packageId, token);
        var now = evaluationTime ?? await RetentionTransaction.ClockAsync(db, token);
        var package = await db.ResultOutputPackages.AsNoTracking().SingleAsync(value => value.Id == packageId, token);
        var snapshot = await ApplyDeadlineAsync(db, packageId, now, token);
        if (snapshot is null || package.State != ResultOutputPackageState.Released || snapshot.ByteDeletedAtUtc.HasValue)
        {
            await db.SaveChangesAsync(token);
            await transaction.CommitAsync(token);
            return;
        }
        var artifacts = await db.ResultArtifacts.AsNoTracking().Where(value => value.ResultOutputPackageId == packageId).ToListAsync(token);
        var attempts = await db.OperationalFileDownloads.AsNoTracking().Where(value => value.ReleasedPackageType == ReleasedDeliverablePackageType.PSeqResult
            && value.ReleasedPackageId == packageId && value.OrganizationId == package.OrganizationId).ToListAsync(token);
        var committed = await new DownloadCommitEvidenceService(db).ReadCompletionsAsync(attempts, token);
        var download = ReleasedDeliverableDownloadProjection.Create(artifacts.Select(value => value.Id).ToList(), attempts, now, committed);
        var available = !snapshot.IsQuarantined && artifacts.Count == package.ExpectedArtifactCount && artifacts.Count > 0
            && artifacts.All(value => value.ScanState == ResultArtifactScanState.Clean && !value.DeletedAtUtc.HasValue);
        if (!snapshot.WarningCheckpointAtUtc.HasValue && now >= snapshot.WarningAtUtc)
        {
            if (!available) snapshot.RecordWarningCheckpoint(now, "SkippedUnavailable", null);
            else if (now >= snapshot.StandardDeletionAtUtc) snapshot.RecordWarningCheckpoint(now, "SkippedPastStandard", null);
            else if (download.Status == ReleasedDeliverableDownloadStatus.Downloaded) snapshot.RecordWarningCheckpoint(now, "SkippedComplete", null);
            else
            {
                var notice = await QueueAsync(snapshot, package.Id, $"/lab-services/{package.LabServiceOrderId:D}", "retention-warning", snapshot.StandardDeletionAtUtc, token);
                snapshot.RecordWarningCheckpoint(now, "Queued", notice.Id);
            }
        }
        if (available && snapshot.GraceActivatedAtUtc.HasValue && !snapshot.GraceNotificationId.HasValue)
        {
            var notice = await QueueAsync(snapshot, package.Id, $"/lab-services/{package.LabServiceOrderId:D}", "retention-grace", snapshot.PotentialFinalDeletionAtUtc, token);
            snapshot.RecordGraceNotification(notice.Id);
        }
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
    }

    internal static async Task<ReleasedDeliverableRetentionSnapshot?> ApplyDeadlineAsync(
        PSeqOperationsDbContext db, Guid packageId, DateTime now, CancellationToken token)
    {
        var snapshotId = await db.ResultRetentionSchedules.AsNoTracking().Where(value => value.ResultOutputPackageId == packageId)
            .Select(value => value.RetentionSnapshotId).SingleOrDefaultAsync(token);
        if (!snapshotId.HasValue) return null;
        var snapshot = await db.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.Id == snapshotId.Value, token);
        await db.Entry(snapshot).ReloadAsync(token);
        if (now < snapshot.StandardDeletionAtUtc || snapshot.DownloadAccessClosedAtUtc.HasValue) return snapshot;
        var files = await db.ResultArtifacts.AsNoTracking().Where(value => value.ResultOutputPackageId == packageId).Select(value => value.Id).ToListAsync(token);
        var expected = await db.ResultOutputPackages.AsNoTracking().Where(value => value.Id == packageId).Select(value => value.ExpectedArtifactCount).SingleAsync(token);
        var attempts = await db.OperationalFileDownloads.AsNoTracking().Where(value => value.ReleasedPackageType == ReleasedDeliverablePackageType.PSeqResult
            && value.ReleasedPackageId == packageId && value.OrganizationId == snapshot.OrganizationId).ToListAsync(token);
        var committed = await new DownloadCommitEvidenceService(db).ReadCompletionsAsync(attempts, token);
        var completed = ReleasedDeliverableDownloadProjection.Create(files, attempts, now, committed).Files.Values.Select(value => value.DownloadedAtUtc).ToList();
        if (files.Count != expected) completed.Add(null); // Incomplete manifests cannot erase grace.
        snapshot.ApplyDeadlineDecision(ReleasedDeliverableRetentionDecision.Evaluate(snapshot, completed, now), now);
        return snapshot;
    }

    internal async Task<OrderNotification> QueueAsync(ReleasedDeliverableRetentionSnapshot snapshot, Guid packageId, string portalPath,
        string eventType, DateTime deadline, CancellationToken token)
    {
        if (!Uri.TryCreate(links.Value.PublicBaseUrl, UriKind.Absolute, out var origin)
            || origin.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(origin.UserInfo)
            || !string.IsNullOrEmpty(origin.Query) || !string.IsNullOrEmpty(origin.Fragment))
            throw new InvalidOperationException("Retention notices require an HTTPS Portal base URL without credentials, query, or fragment.");
        var route = new Uri(origin, portalPath);
        var date = deadline.ToString("yyyy-MM-dd HH:mm:ss 'UTC'", CultureInfo.InvariantCulture);
        var grace = eventType == "retention-grace";
        var notice = new OrderNotification(snapshot.OrganizationId, null, WorkflowType, snapshot.Id, eventType,
            grace ? "Result package grace period" : "Result package download reminder",
            $"Package {packageId:D}. " + (grace ? $"This package received a grace period through {date}. "
                : $"This package has files that have not completed a download. Its standard retention deadline is {date}. ")
            + $"Sign in to the Portal to review current availability and retention dates: {route.AbsoluteUri}");
        db.OrderNotifications.Add(notice);
        var recipients = await OrganizationNotificationRecipients.ReadAsync(db, snapshot.OrganizationId, null, null, false, token);
        if (recipients.Count == 0)
        {
            notice.MarkFailed("No active organization administrators. Correct administrator access, then retry this notification.", DateTime.UtcNow.AddMinutes(2));
            await ReportFailureAsync(db, notice, token);
        }
        return notice;
    }

    internal static async Task SynchronizeFailuresAsync(PSeqOperationsDbContext db, CancellationToken token)
    {
        var failures = await db.OrderNotifications.AsNoTracking().Where(value => value.WorkflowType == WorkflowType
            && value.Status == OrderNotificationStatus.Failed).ToListAsync(token);
        foreach (var notice in failures)
        {
            await using var transaction = await RetentionTransaction.OpenAsync(db, notice.WorkflowId, token);
            // Recheck after acquiring the lock: another dispatcher may have recovered it.
            if (await db.OrderNotifications.AsNoTracking().AnyAsync(value => value.Id == notice.Id && value.Status == OrderNotificationStatus.Failed, token))
            {
                await ReportFailureAsync(db, notice, token);
                await db.SaveChangesAsync(token);
            }
            await transaction.CommitAsync(token);
        }
    }

    internal static async Task ReportFailureAsync(PSeqOperationsDbContext db, OrderNotification notice, CancellationToken token)
    {
        if (db.Database.CurrentTransaction is null) throw new InvalidOperationException("Retention failures must be recorded with their notification transaction.");
        await using var transaction = await RetentionTransaction.OpenAsync(db, notice.WorkflowId, token);
        var snapshot = await db.ReleasedDeliverableRetentionSnapshots.AsNoTracking().SingleAsync(value => value.Id == notice.WorkflowId
            && value.OrganizationId == notice.OrganizationId, token);
        var deadline = snapshot.GraceActivatedAtUtc.HasValue || notice.EventType == "retention-grace"
            ? snapshot.PotentialFinalDeletionAtUtc : snapshot.StandardDeletionAtUtc;
        var packageId = await db.ResultRetentionSchedules.AsNoTracking().Where(value => value.RetentionSnapshotId == snapshot.Id)
            .Select(value => (Guid?)value.ResultOutputPackageId).SingleOrDefaultAsync(token)
            ?? snapshot.LabResultReleaseId ?? snapshot.AssemblyOutputReleaseId ?? snapshot.TrialResultReleaseId
            ?? throw new InvalidOperationException("Retention notice has no retained package.");
        var summary = $"Urgent: retention notice needs attention for package {packageId:D}. Deadline {deadline:yyyy-MM-dd HH:mm:ss} UTC.";
        var action = $"Review active organization administrators and notification delivery. Correct the cause and retry notification {notice.Id:D}. The retention deadline does not change.";
        var item = await db.OperationalAttentionItems.SingleOrDefaultAsync(value => value.Category == OperationalAttentionCategory.RetentionNoticeFailure
            && value.SourceType == WorkflowType && value.SourceId == snapshot.Id, token);
        if (item is null) db.OperationalAttentionItems.Add(new(OperationalAttentionCategory.RetentionNoticeFailure,
            notice.OrganizationId, WorkflowType, snapshot.Id, notice.AttemptCount, summary, action));
        else if (item.Status == OperationalAttentionStatus.Resolved) item.ReopenRetentionFailure(notice.AttemptCount, summary, action);
        else item.Refresh(notice.AttemptCount, summary, action);
        // The caller saves notice + attention atomically. This helper is only called inside its transaction.
        await transaction.CommitAsync(token);
    }
}

public sealed class GovernedRetentionWorker(IServiceScopeFactory scopes, IOptions<PSeqOrderToCashOptions> options,
    ILogger<GovernedRetentionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.GovernedRetentionProcessing || !options.Value.GovernedPSeqResults) return;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                var now = await RetentionTransaction.ClockAsync(db, stoppingToken);
                var ids = await (from schedule in db.ResultRetentionSchedules.AsNoTracking()
                    join snapshot in db.ReleasedDeliverableRetentionSnapshots on schedule.RetentionSnapshotId equals snapshot.Id
                    join package in db.ResultOutputPackages on schedule.ResultOutputPackageId equals package.Id
                    where package.State == ResultOutputPackageState.Released && snapshot.ByteDeletedAtUtc == null
                        && ((snapshot.WarningCheckpointAtUtc == null && snapshot.WarningAtUtc <= now)
                            || (snapshot.StandardCheckpointAtUtc == null && snapshot.StandardDeletionAtUtc <= now)
                            || (snapshot.GraceActivatedAtUtc != null && snapshot.GraceNotificationId == null)
                            || (snapshot.DownloadAccessClosedAtUtc == null && snapshot.PotentialFinalDeletionAtUtc <= now))
                    orderby snapshot.WarningAtUtc
                    select package.Id).ToListAsync(stoppingToken);
                foreach (var id in ids)
                {
                    // Isolate a package failure and its tracking state so later packages still progress.
                    await using var packageScope = scopes.CreateAsyncScope();
                    try { await packageScope.ServiceProvider.GetRequiredService<GovernedRetentionCheckpointService>().ProcessAsync(id, stoppingToken); }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { throw; }
                    catch (Exception error) { logger.LogError(error, "Retention checkpoint failed for {PackageId}.", id); }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error) { logger.LogError(error, "Governed retention polling failed."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
