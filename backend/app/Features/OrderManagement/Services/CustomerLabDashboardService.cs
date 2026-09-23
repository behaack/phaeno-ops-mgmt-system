namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record CustomerLabDashboardSummary(int AttentionCount, int NewResultCount);

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
        var orderIds = Orders(organizationId, departmentId).Select(order => order.Id);
        var packages = await db.ResultOutputPackages.AsNoTracking().Where(package =>
            package.OrganizationId == organizationId && package.LabServiceOrderId.HasValue
            && orderIds.Contains(package.LabServiceOrderId.Value) && package.ReleasedAtUtc.HasValue
            && package.State == ResultOutputPackageState.Released).ToListAsync(token);
        if (packages.Count == 0) return [];
        var ids = packages.Select(package => package.Id).ToArray();
        var artifacts = await db.ResultArtifacts.AsNoTracking()
            .Where(artifact => ids.Contains(artifact.ResultOutputPackageId)).ToListAsync(token);
        var now = await RetentionTransaction.ClockAsync(db, token);
        var retention = await new GovernedResultRetentionService(db).ReadAsync(packages, artifacts, now, token);
        // Governed packages use verified commit evidence from the retention projection.
        // Legacy packages retain the established completed-transfer projection.
        var legacyFiles = packages.Where(package => retention[package.Id].Retention?.Download is null)
            .ToDictionary(package => package.Id, package => (IReadOnlyCollection<Guid>)artifacts
                .Where(artifact => artifact.ResultOutputPackageId == package.Id).Select(artifact => artifact.Id).ToArray());
        var legacyDownloads = await new ReleasedDeliverableDownloadProjectionService(db)
            .ReadAsync(organizationId, ReleasedDeliverablePackageType.PSeqResult, legacyFiles, now, token);
        return packages.Where(package => retention[package.Id].IsDownloadAvailable
            && (retention[package.Id].Retention?.Download?.Status
                ?? legacyDownloads[package.Id].Status.ToString()) != nameof(ReleasedDeliverableDownloadStatus.Downloaded)).ToArray();
    }
}
