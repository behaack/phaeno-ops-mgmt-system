namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record CustomerResultArtifactDto(
    Guid Id, string LogicalRole, string FileName, string ContentType,
    long SizeBytes, string Sha256, DateTime? DeletedAtUtc);
public sealed record CustomerResultPackageDto(
    Guid Id, Guid LabSampleId, int PackageVersion, string State,
    DateTime? ReleasedAtUtc, string? RetentionState, bool IsDownloadAvailable,
    IReadOnlyList<CustomerResultArtifactDto> Artifacts);

[ApiController]
[Authorize]
[Route("api/lab-service-orders/{orderId:guid}/samples/{sampleId:guid}/result-packages")]
public sealed class PSeqResultDownloadsController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    IOperationalFileStorage fileStorage) : ControllerBase
{
    [HttpGet("/api/lab-service-orders/{orderId:guid}/result-packages")]
    public async Task<IReadOnlyList<CustomerResultPackageDto>> List(
        Guid orderId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext,
            OrganizationKind.Customer, false, cancellationToken);
        var packages = await dbContext.ResultOutputPackages.AsNoTracking()
            .Where(item => item.OrganizationId == tenant.Organization.Id
                && item.LabServiceOrderId == orderId
                && item.ReleasedAtUtc.HasValue
                && (item.State == ResultOutputPackageState.Released
                    || item.State == ResultOutputPackageState.Withdrawn))
            .OrderBy(item => item.LabSampleId).ThenByDescending(item => item.PackageVersion)
            .ToListAsync(cancellationToken);
        var packageIds = packages.Select(item => item.Id).ToList();
        var artifacts = await dbContext.ResultArtifacts.AsNoTracking()
            .Where(item => packageIds.Contains(item.ResultOutputPackageId)
                && item.ScanState == ResultArtifactScanState.Clean)
            .OrderBy(item => item.FileName).ToListAsync(cancellationToken);
        var schedules = await dbContext.ResultRetentionSchedules.AsNoTracking()
            .Where(item => packageIds.Contains(item.ResultOutputPackageId))
            .ToDictionaryAsync(item => item.ResultOutputPackageId, cancellationToken);
        return packages.Select(package =>
        {
            schedules.TryGetValue(package.Id, out var schedule);
            var downloadAvailable = package.State == ResultOutputPackageState.Released
                && (schedule is null || schedule.State is ResultRetentionState.Active
                    or ResultRetentionState.WarningDue);
            return new CustomerResultPackageDto(package.Id, package.LabSampleId,
                package.PackageVersion, package.State.ToString(), package.ReleasedAtUtc,
                schedule?.State.ToString(), downloadAvailable,
                artifacts.Where(item => item.ResultOutputPackageId == package.Id)
                    .Select(item => new CustomerResultArtifactDto(item.Id, item.LogicalRole,
                        item.FileName, item.ContentType, item.SizeBytes, item.Sha256,
                        item.DeletedAtUtc)).ToList());
        }).ToList();
    }

    [HttpGet("{packageId:guid}/artifacts/{artifactId:guid}/download")]
    public async Task<IActionResult> Download(Guid orderId, Guid sampleId, Guid packageId,
        Guid artifactId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext,
            OrganizationKind.Customer, false, cancellationToken);
        var package = await dbContext.ResultOutputPackages.AsNoTracking().SingleOrDefaultAsync(item =>
            item.Id == packageId && item.OrganizationId == tenant.Organization.Id
            && item.LabServiceOrderId == orderId && item.LabSampleId == sampleId
            && item.State == ResultOutputPackageState.Released, cancellationToken);
        if (package is null)
            throw new OrderManagementException("result_package_not_found", "The result package was not found.", StatusCodes.Status404NotFound);
        var retentionState = await dbContext.ResultRetentionSchedules.AsNoTracking()
            .Where(item => item.ResultOutputPackageId == package.Id)
            .Select(item => (ResultRetentionState?)item.State)
            .SingleOrDefaultAsync(cancellationToken);
        if (retentionState is ResultRetentionState.Cutoff
            or ResultRetentionState.Grace
            or ResultRetentionState.Deleted
            or ResultRetentionState.Reissued)
            throw new OrderManagementException("result_retention_cutoff_reached",
                "The download period for this result package has ended. Contact Phaeno for an authorized reissue.",
                StatusCodes.Status410Gone);
        var artifact = await dbContext.ResultArtifacts.AsNoTracking().SingleOrDefaultAsync(item =>
            item.Id == artifactId && item.ResultOutputPackageId == package.Id
            && item.ScanState == ResultArtifactScanState.Clean && item.DeletedAtUtc == null,
            cancellationToken);
        if (artifact is null)
            throw new OrderManagementException("result_artifact_not_found", "The result artifact was not found.", StatusCodes.Status404NotFound);
        var stream = await fileStorage.OpenReadAsync(artifact.ObjectStorageKey, cancellationToken);
        dbContext.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(package.Id, artifact.Id,
            ResultDeliveryEvidenceKind.Download, tenant.Actor.Id, DateTime.UtcNow,
            JsonSerializer.Serialize(new
            {
                remoteAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                userAgent = Request.Headers.UserAgent.ToString()
            })));
        await dbContext.SaveChangesAsync(cancellationToken);
        return File(stream, artifact.ContentType, artifact.FileName, enableRangeProcessing: true);
    }
}
