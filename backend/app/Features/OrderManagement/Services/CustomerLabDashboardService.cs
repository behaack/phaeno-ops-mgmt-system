namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record CustomerLabDashboardSummary(int AttentionCount, int NewResultCount);
public sealed record CustomerLabDashboardResponse(CustomerLabDashboardSummary Summary, PagedResult<OrderListItemDto> Requests);

public sealed class CustomerLabDashboardService(PSeqOperationsDbContext db)
{
    public IQueryable<LabServiceOrder> Orders(Guid organizationId, Guid departmentId) =>
        db.LabServiceOrders.AsNoTracking().Where(order => order.OrganizationId == organizationId
            && order.DepartmentId == departmentId && !order.IsDiscarded);

    public static IQueryable<LabServiceOrder> RequiringAttention(IQueryable<LabServiceOrder> orders) =>
        orders.Where(order => order.Status == LabServiceOrderStatus.QuoteIssued
            || order.Status == LabServiceOrderStatus.ChangesRequested
            || order.Status == LabServiceOrderStatus.DraftRequest
            || order.Status == LabServiceOrderStatus.PlacedAwaitingSamples
            || order.Status == LabServiceOrderStatus.OnHold);

    public async Task<CustomerLabDashboardSummary> ReadAsync(Guid organizationId, Guid departmentId, CancellationToken token)
    {
        var attention = await RequiringAttention(Orders(organizationId, departmentId)).CountAsync(token);
        var results = await NewResultsAsync(organizationId, departmentId, token);
        return new(attention, results.Count);
    }

    public async Task<IReadOnlyList<ResultOutputPackage>> NewResultsAsync(Guid organizationId, Guid departmentId, CancellationToken token)
    {
        var now = await RetentionTransaction.ClockAsync(db, token);
        var packages = await NewResultCandidates(organizationId, departmentId, now).ToListAsync(token);
        if (packages.Count == 0) return [];
        var ids = packages.Select(package => package.Id).ToArray();
        var artifacts = await db.ResultArtifacts.AsNoTracking()
            .Where(artifact => ids.Contains(artifact.ResultOutputPackageId)).ToListAsync(token);
        var artifactsByPackage = artifacts.ToLookup(artifact => artifact.ResultOutputPackageId);
        var retention = await new GovernedResultRetentionService(db).ReadAsync(packages, artifacts, now, token);
        // Governed packages use verified commit evidence from the retention projection.
        // Legacy packages retain the established completed-transfer projection.
        var legacyFiles = packages.Where(package => retention[package.Id].Retention?.Download is null)
            .ToDictionary(package => package.Id, package => (IReadOnlyCollection<Guid>)artifactsByPackage[package.Id]
                .Select(artifact => artifact.Id).ToArray());
        var legacyDownloads = await new ReleasedDeliverableDownloadProjectionService(db)
            .ReadAsync(organizationId, ReleasedDeliverablePackageType.PSeqResult, legacyFiles, now, token);
        return packages.Where(package => retention[package.Id].IsDownloadAvailable
            && (retention[package.Id].Retention?.Download?.Status
                ?? legacyDownloads[package.Id].Status.ToString()) != nameof(ReleasedDeliverableDownloadStatus.Downloaded)).ToArray();
    }

    internal IQueryable<ResultOutputPackage> NewResultCandidates(Guid organizationId, Guid departmentId, DateTime now)
    {
        var orderIds = Orders(organizationId, departmentId).Select(order => order.Id);
        var countedDownloads = db.OperationalFileDownloads.AsNoTracking().Where(attempt =>
            attempt.OrganizationId == organizationId
            && attempt.ReleasedPackageType == ReleasedDeliverablePackageType.PSeqResult
            && attempt.Outcome == OperationalFileDownloadOutcome.Succeeded
            && attempt.CountsForReleasedPackageRetention);
        var completedDownloads = countedDownloads.Where(attempt => attempt.CompletedAtUtc <= now);
        var governedSchedules = db.ResultRetentionSchedules.AsNoTracking()
            .Where(schedule => schedule.RetentionSnapshotId.HasValue);
        return db.ResultOutputPackages.AsNoTracking().Where(package =>
            package.OrganizationId == organizationId && package.LabServiceOrderId.HasValue
            && orderIds.Contains(package.LabServiceOrderId.Value) && package.ReleasedAtUtc.HasValue
            && package.State == ResultOutputPackageState.Released
            // Keep packages with no files because the existing projection decides their status.
            && (!db.ResultArtifacts.Any(artifact => artifact.ResultOutputPackageId == package.Id)
                // A missing completed file can still make this a new result.
                || db.ResultArtifacts.Any(artifact => artifact.ResultOutputPackageId == package.Id
                    && !completedDownloads.Any(attempt => attempt.ReleasedPackageId == package.Id
                        && attempt.ResultArtifactId == artifact.Id
                        && (!governedSchedules.Any(schedule => schedule.ResultOutputPackageId == package.Id)
                            || db.OperationalDownloadCommitEvidence.Any(evidence =>
                                evidence.OperationalFileDownloadId == attempt.Id
                                && evidence.Phase == DownloadCommitPhase.Completion
                                && evidence.CommittedAtUtc <= now))))
                // Keep malformed or unresolved governed evidence for the authoritative
                // retention projection to reject or reconcile instead of hiding it.
                || governedSchedules.Any(schedule => schedule.ResultOutputPackageId == package.Id
                    && (!db.ReleasedDeliverableRetentionSnapshots.Any(snapshot =>
                            snapshot.Id == schedule.RetentionSnapshotId && snapshot.OrganizationId == organizationId)
                        || countedDownloads.Any(attempt => attempt.ReleasedPackageId == package.Id
                            && (db.OperationalDownloadCommitEvidence.Count(evidence =>
                                    evidence.OperationalFileDownloadId == attempt.Id
                                    && evidence.Phase == DownloadCommitPhase.Completion) != 1
                                || !db.OperationalDownloadCommitEvidence.Any(evidence =>
                                    evidence.OperationalFileDownloadId == attempt.Id
                                    && evidence.Phase == DownloadCommitPhase.Completion
                                    && evidence.CommittedAtUtc.HasValue)))))));
    }
}
