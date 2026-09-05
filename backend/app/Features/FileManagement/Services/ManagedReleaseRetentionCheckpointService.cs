namespace PhaenoPortal.App.Features.FileManagement.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class ManagedReleaseRetentionCheckpointService(PSeqOperationsDbContext db, GovernedRetentionCheckpointService notices)
{
    // Match download admission/completion's package lock. Explicit time is only for deterministic local verification.
    internal async Task ProcessAsync(ReleasedDeliverablePackageType type, Guid packageId, CancellationToken token, DateTime? evaluationTime = null)
    {
        if (type is not (ReleasedDeliverablePackageType.LabResult or ReleasedDeliverablePackageType.AssemblyOutput))
            throw new ArgumentException("A Lab or Assembly release is required.", nameof(type));
        await using var transaction = await RetentionTransaction.OpenAsync(db, packageId, token);
        var snapshot = await db.ReleasedDeliverableRetentionSnapshots.SingleOrDefaultAsync(value =>
            (type == ReleasedDeliverablePackageType.LabResult ? value.LabResultReleaseId == packageId : value.AssemblyOutputReleaseId == packageId)
            && !db.ResultRetentionSchedules.Any(schedule => schedule.RetentionSnapshotId == value.Id), token);
        if (snapshot is null) return; // Legacy releases and governed projections have no general checkpoints.
        await db.Entry(snapshot).ReloadAsync(token);
        if (snapshot.ByteDeletedAtUtc.HasValue) return;
        var now = evaluationTime ?? await RetentionTransaction.ClockAsync(db, token);
        var package = await new ManagedReleaseRetentionService(db).ReadPackageAsync(type, packageId, token);
        if (package is null || package.OrganizationId != snapshot.OrganizationId) return;
        var attempts = await db.OperationalFileDownloads.AsNoTracking().Where(value => value.ReleasedPackageType == type
            && value.ReleasedPackageId == packageId && value.OrganizationId == snapshot.OrganizationId).ToListAsync(token);
        var commits = await new DownloadCommitEvidenceService(db).ReadCompletionsAsync(attempts, token);
        var download = ReleasedDeliverableDownloadProjection.Create(package.FileIds, attempts, now, commits);
        var decision = ReleasedDeliverableRetentionDecision.Evaluate(snapshot, download.Files.Values.Select(value => value.DownloadedAtUtc).ToList(), now);
        if (now >= snapshot.StandardDeletionAtUtc) snapshot.ApplyDeadlineDecision(decision, now);
        var purpose = type == ReleasedDeliverablePackageType.LabResult ? OperationalFilePurpose.LabResult : OperationalFilePurpose.AssemblyOutput;
        var available = !snapshot.IsQuarantined && package.Status == FileReleaseStatus.Released && !package.IsDiscarded && package.FileIds.Count > 0
            && await db.ManagedOperationalFiles.AsNoTracking().CountAsync(file => package.FileIds.Contains(file.Id)
                && file.OrganizationId == package.OrganizationId && file.WorkflowId == package.WorkflowId && file.Purpose == purpose
                && (type == ReleasedDeliverablePackageType.LabResult ? file.ParentRecordId == package.SampleId : file.ParentRecordId == packageId)
                && file.ReleaseStatus == FileReleaseStatus.Released && file.ScanStatus == OperationalFileScanStatus.Clean, token) == package.FileIds.Count;
        var route = type == ReleasedDeliverablePackageType.LabResult ? $"/lab-services/{package.WorkflowId:D}" : $"/data-assembly/{package.WorkflowId:D}";
        if (!snapshot.WarningCheckpointAtUtc.HasValue && now >= snapshot.WarningAtUtc)
        {
            if (!available) snapshot.RecordWarningCheckpoint(now, "SkippedUnavailable", null);
            else if (now >= snapshot.StandardDeletionAtUtc) snapshot.RecordWarningCheckpoint(now, "SkippedPastStandard", null);
            else if (download.Status == ReleasedDeliverableDownloadStatus.Downloaded) snapshot.RecordWarningCheckpoint(now, "SkippedComplete", null);
            else
            {
                var notice = await notices.QueueAsync(snapshot, packageId, route, "retention-warning", snapshot.StandardDeletionAtUtc, token);
                snapshot.RecordWarningCheckpoint(now, "Queued", notice.Id);
            }
        }
        if (available && snapshot.GraceActivatedAtUtc.HasValue && !snapshot.GraceNotificationId.HasValue)
        {
            var notice = await notices.QueueAsync(snapshot, packageId, route, "retention-grace", snapshot.PotentialFinalDeletionAtUtc, token);
            snapshot.RecordGraceNotification(notice.Id);
        }
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
    }
}

public sealed class ManagedReleaseRetentionWorker(IServiceScopeFactory scopes, IOptions<OrderManagementOptions> options,
    IOptions<PSeqOrderToCashOptions> operations, ILogger<ManagedReleaseRetentionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.CanProcessRetention(operations.Value.AttentionOperations)) return;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try { await ProcessPendingAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error) { logger.LogError(error, "General retention polling failed."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    internal async Task<int> ProcessPendingAsync(CancellationToken token)
    {
        if (!options.Value.CanProcessRetention(operations.Value.AttentionOperations)) return 0;
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var now = await RetentionTransaction.ClockAsync(db, token);
        var releases = await db.ReleasedDeliverableRetentionSnapshots.AsNoTracking()
            .Where(snapshot => snapshot.ByteDeletedAtUtc == null
                && !db.ResultRetentionSchedules.Any(schedule => schedule.RetentionSnapshotId == snapshot.Id)
                && ((snapshot.WarningCheckpointAtUtc == null && snapshot.WarningAtUtc <= now)
                    || (snapshot.StandardCheckpointAtUtc == null && snapshot.StandardDeletionAtUtc <= now)
                    || (snapshot.GraceActivatedAtUtc != null && snapshot.GraceNotificationId == null && snapshot.DownloadAccessClosedAtUtc == null)
                    || (snapshot.DownloadAccessClosedAtUtc == null && snapshot.PotentialFinalDeletionAtUtc <= now)))
            .OrderBy(snapshot => snapshot.WarningAtUtc)
            .Select(snapshot => new { snapshot.LabResultReleaseId, snapshot.AssemblyOutputReleaseId }).ToListAsync(token);
        foreach (var release in releases)
        {
            await using var packageScope = scopes.CreateAsyncScope();
            var id = release.LabResultReleaseId ?? release.AssemblyOutputReleaseId!.Value;
            var type = release.LabResultReleaseId.HasValue ? ReleasedDeliverablePackageType.LabResult : ReleasedDeliverablePackageType.AssemblyOutput;
            try { await packageScope.ServiceProvider.GetRequiredService<ManagedReleaseRetentionCheckpointService>().ProcessAsync(type, id, token); }
            catch (OperationCanceledException) when (token.IsCancellationRequested) { throw; }
            catch (Exception error) { logger.LogError(error, "Retention checkpoint failed for {PackageId}.", id); }
        }
        return releases.Count;
    }
}
