namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Infrastructure.Api;
using Microsoft.Net.Http.Headers;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record CustomerResultArtifactDto(
    Guid Id, string LogicalRole, string FileName, string ContentType,
    long SizeBytes, string Sha256, DateTime? DeletedAtUtc);
public sealed record CustomerResultPackageDto(
    Guid Id, Guid LabSampleId, int PackageVersion, string State,
    DateTime? ReleasedAtUtc, string? RetentionState, bool IsDownloadAvailable,
    IReadOnlyList<CustomerResultArtifactDto> Artifacts, ReleasedDeliverableRetentionDto? Retention = null);

[ApiController]
[Authorize]
[Route("api/lab-service-orders/{orderId:guid}/samples/{sampleId:guid}/result-packages")]
public sealed class PSeqResultDownloadsController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    IOperationalFileStorage fileStorage,
    ReleasedDeliverableDownloadAttemptService downloadAttempts,
    GovernedResultRetentionService retentionService,
    ILogger<CompletionTrackedFileStreamResult> fileDownloadLogger) : ControllerBase
{
    [HttpGet("/api/lab-service-orders/{orderId:guid}/result-packages")]
    public async Task<IReadOnlyList<CustomerResultPackageDto>> List(
        Guid orderId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext,
            OrganizationKind.Customer, false, cancellationToken);
        await RequireDepartmentOrderAsync(orderId, tenant, cancellationToken);
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
            .Where(item => packageIds.Contains(item.ResultOutputPackageId))
            .OrderBy(item => item.FileName).ToListAsync(cancellationToken);
        var retention = await retentionService.ReadAsync(packages, artifacts, await RetentionTransaction.ClockAsync(dbContext, cancellationToken), cancellationToken);
        return packages.Select(package =>
        {
            var status = retention[package.Id];
            return new CustomerResultPackageDto(package.Id, package.LabSampleId,
                package.PackageVersion, package.State.ToString(), package.ReleasedAtUtc,
                status.State, status.IsDownloadAvailable,
                artifacts.Where(item => item.ResultOutputPackageId == package.Id && item.ScanState == ResultArtifactScanState.Clean)
                    .Select(item => new CustomerResultArtifactDto(item.Id, item.LogicalRole,
                        item.FileName, item.ContentType, item.SizeBytes, item.Sha256,
                        item.DeletedAtUtc)).ToList(), status.Retention);
        }).ToList();
    }

    [HttpGet("{packageId:guid}/artifacts/{artifactId:guid}/download")]
    [SkipApiEnvelope]
    public async Task<IActionResult> Download(Guid orderId, Guid sampleId, Guid packageId,
        Guid artifactId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext,
            OrganizationKind.Customer, false, cancellationToken);
        await RequireDepartmentOrderAsync(orderId, tenant, cancellationToken);
        var package = await dbContext.ResultOutputPackages.AsNoTracking().SingleOrDefaultAsync(item =>
            item.Id == packageId && item.OrganizationId == tenant.Organization.Id
            && item.LabServiceOrderId == orderId && item.LabSampleId == sampleId
            && item.State == ResultOutputPackageState.Released, cancellationToken);
        if (package is null)
            throw new OrderManagementException("result_package_not_found", "The result package was not found.", StatusCodes.Status404NotFound);
        var artifacts = await dbContext.ResultArtifacts.AsNoTracking()
            .Where(item => item.ResultOutputPackageId == package.Id).ToListAsync(cancellationToken);
        var status = (await retentionService.ReadAsync([package], artifacts, await RetentionTransaction.ClockAsync(dbContext, cancellationToken), cancellationToken))[package.Id];
        if (!status.IsDownloadAvailable)
            throw new OrderManagementException("result_retention_cutoff_reached",
                "The download period for this result package has ended. Contact Phaeno for an authorized reissue.",
                StatusCodes.Status410Gone);
        var artifact = artifacts.SingleOrDefault(item => item.Id == artifactId
            && item.ScanState == ResultArtifactScanState.Clean && item.DeletedAtUtc == null);
        if (artifact is null)
            throw new OrderManagementException("result_artifact_not_found", "The result artifact was not found.", StatusCodes.Status404NotFound);
        var transfer = await downloadAttempts.StartPSeqArtifactAsync(package, artifact, tenant.Actor.Id,
            DateTime.UtcNow, status.AdmissionCutoffAtUtc, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString(), cancellationToken);
        Stream stream;
        try { stream = await fileStorage.OpenReadAsync(artifact.ObjectStorageKey, cancellationToken); }
        catch (OperationCanceledException) when (HttpContext.RequestAborted.IsCancellationRequested)
        {
            await downloadAttempts.CompleteAsync(transfer.AttemptIds, OperationalFileDownloadOutcome.Cancelled,
                DateTime.UtcNow, "request_cancelled_before_stream", false, CancellationToken.None);
            throw;
        }
        catch
        {
            await downloadAttempts.CompleteAsync(transfer.AttemptIds, OperationalFileDownloadOutcome.Failed,
                DateTime.UtcNow, "storage_open_failed", false, CancellationToken.None);
            throw;
        }
        return new CompletionTrackedFileStreamResult(stream, artifact.ContentType, artifact.FileName,
            Request.Headers.ContainsKey(HeaderNames.Range), transfer, downloadAttempts, fileDownloadLogger);
    }

    private async Task RequireDepartmentOrderAsync(Guid orderId, OrderTenantContext tenant, CancellationToken cancellationToken)
    {
        if (!await dbContext.LabServiceOrders.AsNoTracking().AnyAsync(order =>
                order.Id == orderId && order.OrganizationId == tenant.Organization.Id
                && order.DepartmentId == tenant.Department.Id, cancellationToken))
        {
            throw new OrderManagementException("result_package_not_found", "The result package was not found.", StatusCodes.Status404NotFound);
        }
    }
}
