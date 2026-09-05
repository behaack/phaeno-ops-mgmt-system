namespace PhaenoPortal.App.Features.FileManagement.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

internal sealed record RetainedFile(Guid Id, string Name, long SizeBytes, string Sha256, string StorageKey, bool Clean);
internal sealed record RetainedPackage(Guid Id, ReleasedDeliverablePackageType Type, Guid WorkflowId, Guid DepartmentId, Guid? SampleId,
    bool Released, int ExpectedFiles, IReadOnlyList<RetainedFile> Files);

public sealed class ReleasedDeliverableLifecycleService(PSeqOperationsDbContext db, IOperationalFileStorage storage,
    GovernedRetentionCheckpointService governed, ManagedReleaseRetentionCheckpointService managed)
{
    internal async Task<RetainedPackage?> ReadPackageAsync(ReleasedDeliverableRetentionSnapshot snapshot, CancellationToken token)
    {
        var pseqId = await db.ResultRetentionSchedules.AsNoTracking().Where(value => value.RetentionSnapshotId == snapshot.Id)
            .Select(value => (Guid?)value.ResultOutputPackageId).SingleOrDefaultAsync(token);
        if (pseqId.HasValue)
        {
            var package = await db.ResultOutputPackages.AsNoTracking().SingleOrDefaultAsync(value => value.Id == pseqId && value.OrganizationId == snapshot.OrganizationId, token);
            if (package is null) return null;
            var order = await db.LabServiceOrders.AsNoTracking().SingleAsync(value => value.Id == package.LabServiceOrderId && value.OrganizationId == snapshot.OrganizationId, token);
            var artifacts = await db.ResultArtifacts.AsNoTracking().Where(value => value.ResultOutputPackageId == package.Id).ToListAsync(token);
            return new(package.Id, ReleasedDeliverablePackageType.PSeqResult, order.Id, order.DepartmentId, package.LabSampleId,
                package.State == ResultOutputPackageState.Released, package.ExpectedArtifactCount,
                artifacts.Select(value => new RetainedFile(value.Id, value.FileName, value.SizeBytes, value.Sha256, value.ObjectStorageKey, value.ScanState == ResultArtifactScanState.Clean)).ToList());
        }
        var type = snapshot.LabResultReleaseId.HasValue ? ReleasedDeliverablePackageType.LabResult : ReleasedDeliverablePackageType.AssemblyOutput;
        var id = snapshot.LabResultReleaseId ?? snapshot.AssemblyOutputReleaseId!.Value;
        var release = await new ManagedReleaseRetentionService(db).ReadPackageAsync(type, id, token);
        if (release is null || release.OrganizationId != snapshot.OrganizationId) return null;
        var purpose = type == ReleasedDeliverablePackageType.LabResult ? OperationalFilePurpose.LabResult : OperationalFilePurpose.AssemblyOutput;
        var files = await db.ManagedOperationalFiles.AsNoTracking().Where(value => release.FileIds.Contains(value.Id)
            && value.OrganizationId == snapshot.OrganizationId && value.WorkflowId == release.WorkflowId && value.Purpose == purpose
            && (type == ReleasedDeliverablePackageType.LabResult ? value.ParentRecordId == release.SampleId : value.ParentRecordId == id)).ToListAsync(token);
        return new(id, type, release.WorkflowId, release.DepartmentId, release.SampleId, release.Status == FileReleaseStatus.Released && !release.IsDiscarded,
            release.FileIds.Count, files.Select(value => new RetainedFile(value.Id, value.FileName, value.SizeBytes, value.Sha256, value.StorageKey, value.ScanStatus == OperationalFileScanStatus.Clean)).ToList());
    }

    internal async Task ProcessCleanupAsync(Guid snapshotId, CancellationToken token, DateTime? evaluationTime = null)
    {
        var snapshot = await db.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.Id == snapshotId, token);
        var initial = await ReadPackageAsync(snapshot, token);
        if (initial is null) return;
        await using var transaction = await RetentionTransaction.OpenAsync(db, initial.Id, token);
        await db.Entry(snapshot).ReloadAsync(token);
        if (snapshot.ByteDeletedAtUtc.HasValue) return;
        var now = evaluationTime ?? await RetentionTransaction.ClockAsync(db, token);
        if (initial.Type == ReleasedDeliverablePackageType.PSeqResult) await governed.ProcessAsync(initial.Id, token, now);
        else await managed.ProcessAsync(initial.Type, initial.Id, token, now);
        if (!snapshot.DownloadAccessClosedAtUtc.HasValue) { await transaction.CommitAsync(token); return; }
        var package = await ReadPackageAsync(snapshot, token);
        string? blocked = package is null || package.ExpectedFiles == 0 || package.Files.Count != package.ExpectedFiles ? "UnavailablePackage" : null;
        if (blocked is null)
        {
            await LockFilesAsync(package!, token);
            package = await ReadPackageAsync(snapshot, token);
            if (package!.Files.Any(file => !file.Clean) || await db.ReleasedDeliverablePreservationHolds.AnyAsync(value => value.RetentionSnapshotId == snapshot.Id && value.ReleasedAtUtc == null, token)) blocked = "Preserved";
            else if (await db.OperationalFileDownloads.AnyAsync(value => value.OrganizationId == snapshot.OrganizationId
                && (value.ReleasedPackageId == package.Id || value.ReleasedPackageId == snapshot.LabResultReleaseId)
                && value.Outcome == OperationalFileDownloadOutcome.Started && value.LeaseExpiresAtUtc > now, token)) blocked = "WaitingForLease";
            else if (await HasSharedSourcesAsync(snapshot, package, token)) blocked = "SharedSource";
        }
        if (blocked is not null) snapshot.RecordCleanup(blocked, now);
        else
        {
            try
            {
                foreach (var key in package!.Files.Select(file => file.StorageKey).Distinct()) await storage.DeleteIfExistsAsync(key, token);
                if (package.Type == ReleasedDeliverablePackageType.PSeqResult)
                {
                    var artifacts = await db.ResultArtifacts.Where(value => value.ResultOutputPackageId == package.Id && value.DeletedAtUtc == null).ToListAsync(token);
                    foreach (var artifact in artifacts) artifact.MarkDeleted(now);
                }
                snapshot.RecordCleanup("Deleted", evaluationTime ?? await RetentionTransaction.ClockAsync(db, token));
            }
            catch (OperationCanceledException) when (token.IsCancellationRequested) { throw; }
            catch (Exception error) when (error is not Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                // Object deletion is idempotent. A partial provider failure retries the same immutable keys.
                snapshot.RecordCleanup("DeletionFailed", now);
            }
        }
        await db.SaveChangesAsync(token); await transaction.CommitAsync(token);
    }

    private async Task<bool> HasSharedSourcesAsync(ReleasedDeliverableRetentionSnapshot snapshot, RetainedPackage package, CancellationToken token)
    {
        var keys = package.Files.Select(file => file.StorageKey).Distinct().ToArray();
        var ids = package.Files.Select(file => file.Id).ToArray();
        if (await db.ResultArtifacts.AnyAsync(value => keys.Contains(value.ObjectStorageKey) && value.ResultOutputPackageId != package.Id, token)) return true;
        if (await db.ManagedOperationalFiles.AnyAsync(value => keys.Contains(value.StorageKey)
            && (package.Type == ReleasedDeliverablePackageType.PSeqResult || !ids.Contains(value.Id)), token)) return true;
        if (package.Type == ReleasedDeliverablePackageType.LabResult)
        {
            var manifests = await db.LabResultReleases.AsNoTracking().Where(value => value.Id != snapshot.LabResultReleaseId).Select(value => value.ManifestJson).ToListAsync(token);
            if (manifests.Any(manifest => ReleasedDeliverableManifest.ReadFileIds(manifest).Any(ids.Contains))) return true;
        }
        return false;
    }

#pragma warning disable EF1002
    private async Task LockFilesAsync(RetainedPackage package, CancellationToken token)
    {
        var entity = db.Model.FindEntityType(package.Type == ReleasedDeliverablePackageType.PSeqResult ? typeof(ResultArtifact) : typeof(ManagedOperationalFile))!;
        var table = $"\"{entity.GetSchema()!.Replace("\"", "\"\"")}\".\"{entity.GetTableName()!.Replace("\"", "\"\"")}\"";
        foreach (var id in package.Files.Select(file => file.Id).Order())
            await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {table} WHERE id = {{0}} FOR SHARE", [id], token);
    }
#pragma warning restore EF1002
}

public sealed class ReleasedDeliverableCleanupWorker(IServiceScopeFactory scopes, IOptions<OrderManagementOptions> options,
    IOptions<PSeqOrderToCashOptions> pseq, ILogger<ReleasedDeliverableCleanupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken token)
    {
        if (!options.Value.ReleasedDeliverableByteDeletion) return;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                var now = await RetentionTransaction.ClockAsync(db, token);
                var general = options.Value.CanProcessRetention(pseq.Value.AttentionOperations);
                var governed = pseq.Value.GovernedPSeqResults && pseq.Value.GovernedRetentionProcessing;
                var ids = await db.ReleasedDeliverableRetentionSnapshots.AsNoTracking().Where(snapshot => snapshot.ByteDeletedAtUtc == null
                    && snapshot.StandardDeletionAtUtc <= now && (snapshot.NextDeletionAttemptAtUtc == null || snapshot.NextDeletionAttemptAtUtc <= now)
                    && ((general && !db.ResultRetentionSchedules.Any(schedule => schedule.RetentionSnapshotId == snapshot.Id))
                        || (governed && db.ResultRetentionSchedules.Any(schedule => schedule.RetentionSnapshotId == snapshot.Id))))
                    .OrderBy(value => value.StandardDeletionAtUtc).Select(value => value.Id).ToListAsync(token);
                foreach (var id in ids)
                {
                    await using var itemScope = scopes.CreateAsyncScope();
                    try { await itemScope.ServiceProvider.GetRequiredService<ReleasedDeliverableLifecycleService>().ProcessCleanupAsync(id, token); }
                    catch (OperationCanceledException) when (token.IsCancellationRequested) { throw; }
                    catch (Exception error) { logger.LogError(error, "Package cleanup failed for {SnapshotId}.", id); }
                }
            }
            catch (OperationCanceledException) when (token.IsCancellationRequested) { break; }
            catch (Exception error) { logger.LogError(error, "Package cleanup polling failed."); }
        } while (await timer.WaitForNextTickAsync(token));
    }
}
