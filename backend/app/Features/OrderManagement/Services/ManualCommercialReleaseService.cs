namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class ManualCommercialReleaseService(
    PSeqOperationsDbContext dbContext,
    ReleasedDeliverableRetentionSnapshotService retentionSnapshots)
{
    public async Task ApplyAssemblyReleaseGateAsync(
        Guid requestId,
        decimal outstandingBalance,
        CancellationToken cancellationToken)
    {
        var request = await dbContext.DataAssemblyRequests.AsNoTracking()
            .FirstAsync(candidate => candidate.Id == requestId, cancellationToken);
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.OrganizationId == request.OrganizationId, cancellationToken);
        var mayRelease = profile?.AssemblyCreditApproved == true || outstandingBalance == 0;
        var releases = await dbContext.AssemblyOutputReleases
            .Where(release => release.DataAssemblyRequestId == requestId
                && release.ReleaseStatus != FileReleaseStatus.Withdrawn)
            .ToListAsync(cancellationToken);
        var files = await dbContext.ManagedOperationalFiles
            .Where(file => file.WorkflowId == requestId
                && file.Purpose == OperationalFilePurpose.AssemblyOutput
                && file.ReleaseStatus != FileReleaseStatus.Withdrawn)
            .ToListAsync(cancellationToken);
        var releasedAtUtc = DateTime.UtcNow;
        foreach (var release in releases)
        {
            if (mayRelease && release.Release(releasedAtUtc))
                await retentionSnapshots.CaptureAssemblyOutputAsync(release, releasedAtUtc, cancellationToken);
            else if (!mayRelease)
                release.MarkReady(holdForPayment: true);
        }
        foreach (var file in files)
        {
            if (mayRelease) file.Release(releasedAtUtc);
            else file.HoldForPayment();
        }
    }

}
