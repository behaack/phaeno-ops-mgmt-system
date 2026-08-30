namespace PhaenoPortal.App.Features.OrderToCash;

using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;
using PSeq.Operations.Laboratory.Domain;

[ApiController]
[Authorize]
[Route("api/order-to-cash/results")]
public sealed class GovernedResultsController(
    PSeqOperationsDbContext dbContext,
    OrderToCashAuthorization authorization,
    IExternalIdentityContext externalIdentityContext,
    DualControlService dualControl,
    IOptions<OrderToCashOptions> options) : ControllerBase
{
    [HttpPost("packages")]
    [AllowAnonymous]
    public async Task<ActionResult<ResultPackageDto>> RegisterPackage(
        [FromBody] RegisterResultPackageRequest request,
        CancellationToken cancellationToken)
    {
        RequireFeatureAndPipelineKey();
        var existing = await dbContext.ResultOutputPackages.Include(value => value.Artifacts)
            .SingleOrDefaultAsync(value => value.PipelineName == request.PipelineName
                && value.ManifestIdentity == request.ManifestIdentity, cancellationToken);
        if (existing is not null)
        {
            if (!string.Equals(existing.ManifestSha256, request.ManifestSha256, StringComparison.OrdinalIgnoreCase))
                throw Conflict("result_manifest_identity_conflict", "The manifest identity was already registered with different content.");
            return Ok(ToDto(existing));
        }

        var order = await dbContext.LabServiceOrders.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == request.LabServiceOrderId, cancellationToken)
            ?? throw Missing("result_order_missing", "The PSeq Job was not found.");
        var workOrder = await dbContext.LabWorkOrders.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == request.LabWorkOrderId, cancellationToken)
            ?? throw Missing("result_lab_work_missing", "The Lab work order was not found.");
        var authorizationRecord = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .SingleOrDefaultAsync(value => value.CommercialOrderId == order.Id
                && value.LabWorkOrderId == workOrder.Id, cancellationToken)
            ?? throw Conflict("result_lab_order_mismatch", "The Lab work order is not authorized for this PSeq Job.");
        if (request.OrganizationId != order.OrganizationId || request.OrganizationId != workOrder.SubmittingOrganizationId)
            throw Conflict("result_tenant_mismatch", "The package tenant does not match the authorized work.");
        if (request.Artifacts.Count == 0)
            throw Invalid("result_artifacts_required", "A result package must contain at least one final deliverable.");
        if (request.Artifacts.Select(value => value.ArtifactIdentity).Distinct(StringComparer.Ordinal).Count() != request.Artifacts.Count)
            throw Invalid("result_artifact_identity_duplicate", "Artifact identities must be unique within the package.");

        var expectedVersion = await dbContext.ResultOutputPackages.CountAsync(value =>
            value.LabWorkOrderId == request.LabWorkOrderId && value.LabSampleId == request.LabSampleId,
            cancellationToken) + 1;
        if (request.PackageVersion != expectedVersion)
            throw Conflict("result_package_version_invalid", $"The next package version is {expectedVersion}.");
        if (request.PackageVersion > 1 && !request.CorrectsPackageId.HasValue)
            throw Invalid("result_correction_reference_required", "A corrected package must identify the prior package.");

        var package = new ResultOutputPackage(request.OrganizationId, request.LabServiceOrderId,
            request.LabWorkOrderId, request.LabSampleId, request.PackageVersion,
            request.CorrectsPackageId, request.PipelineName, request.PipelineVersion,
            request.ManifestIdentity, request.ManifestSha256, request.ManifestJson,
            request.StorageProvider, request.StorageObjectPrefix);
        foreach (var item in request.Artifacts)
            package.Artifacts.Add(new ResultArtifact(package.Id, item.ArtifactIdentity, item.FileName,
                item.MediaType, item.SizeBytes, item.Sha256, item.StorageObjectKey, DateTime.UtcNow));
        dbContext.ResultOutputPackages.Add(package);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetPackage), new { id = package.Id }, ToDto(package));
    }

    [HttpPost("packages/{id:guid}/begin-scan")]
    [AllowAnonymous]
    public async Task<ActionResult<ResultPackageDto>> BeginScan(Guid id, CancellationToken cancellationToken)
    {
        RequireFeatureAndPipelineKey();
        var package = await ReadPackage(id, cancellationToken);
        package.BeginScanning();
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(package));
    }

    [HttpPost("packages/{id:guid}/artifacts/{artifactId:guid}/scan")]
    [AllowAnonymous]
    public async Task<ActionResult<ResultPackageDto>> RecordArtifactScan(Guid id, Guid artifactId,
        [FromBody] RecordResultArtifactScanRequest request, CancellationToken cancellationToken)
    {
        RequireFeatureAndPipelineKey();
        var package = await ReadPackage(id, cancellationToken);
        var artifact = package.Artifacts.SingleOrDefault(value => value.Id == artifactId)
            ?? throw Missing("result_artifact_missing", "The result artifact was not found.");
        artifact.RecordScan(request.Status, request.Details, DateTime.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(package));
    }

    [HttpPost("packages/{id:guid}/ready-for-review")]
    [AllowAnonymous]
    public async Task<ActionResult<ResultPackageDto>> ReadyForReview(Guid id, CancellationToken cancellationToken)
    {
        RequireFeatureAndPipelineKey();
        var package = await ReadPackage(id, cancellationToken);
        package.MarkReadyForReview();
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(package));
    }

    [HttpPost("packages/{id:guid}/scientific-approval")]
    public async Task<ActionResult<ResultPackageDto>> ScientificallyApprove(Guid id,
        [FromBody] ScientificApprovalRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.ReadActorAsync(HttpContext, cancellationToken)
            ?? throw new OrderManagementException("authentication_required", "An active POMS user is required.", StatusCodes.Status401Unauthorized);
        var isReviewer = await dbContext.LabRoleAssignments.AsNoTracking().AnyAsync(value =>
            value.UserId == actor.Id && value.Role == LabRole.ScientificReviewer && value.IsActive,
            cancellationToken);
        if (!isReviewer)
            throw new OrderManagementException("scientific_reviewer_required", "The Scientific Reviewer role is required.", StatusCodes.Status403Forbidden);
        var package = await ReadPackage(id, cancellationToken);
        if (package.Version != request.Version) throw new DbUpdateConcurrencyException();
        var contributors = await dbContext.LabWorkEvents.AsNoTracking()
            .Where(value => value.LabWorkOrderId == package.LabWorkOrderId)
            .Select(value => value.ActorUserId).ToListAsync(cancellationToken);
        await dualControl.CheckAsync("scientific_approver_not_contributor", nameof(ResultOutputPackage),
            package.Id, actor.Id, contributors, cancellationToken);
        var workOrder = await dbContext.LabWorkOrders.SingleAsync(value => value.Id == package.LabWorkOrderId, cancellationToken);
        var approvalVersion = await dbContext.LabScientificApprovals.CountAsync(value =>
            value.LabWorkOrderId == workOrder.Id, cancellationToken) + 1;
        var approval = new LabScientificApproval(workOrder.Id, approvalVersion,
            "pseq_result_output_package", package.PackageVersion, request.PermittedQcProjectionJson,
            actor.Id, DateTime.UtcNow, workOrder.ProjectionVersion);
        dbContext.LabScientificApprovals.Add(approval);
        package.ScientificallyApprove(approval.Id, actor.Id, DateTime.UtcNow);
        package.MarkReadyForRelease(approval.Id);
        if (workOrder.Status == LabWorkOrderStatus.ScientificReview)
            workOrder.RecordMilestone(LabWorkOrderStatus.ReadyForRelease);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(package));
    }

    [HttpPost("packages/{id:guid}/release")]
    public async Task<ActionResult<ResultPackageDto>> Release(Guid id,
        [FromBody] VersionedReasonRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.ResultReleaseManager, cancellationToken);
        var package = await ReadPackage(id, cancellationToken);
        if (package.Version != request.Version) throw new DbUpdateConcurrencyException();
        if (package.Release(actor.Id, DateTime.UtcNow))
        {
            dbContext.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(package.Id,
                ResultDeliveryEvidenceKind.NotificationQueued, actor.Id,
                System.Text.Json.JsonSerializer.Serialize(new { request.Reason }), DateTime.UtcNow));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(package));
    }

    [HttpPost("packages/{id:guid}/withdraw")]
    public async Task<ActionResult<ResultPackageDto>> Withdraw(Guid id,
        [FromBody] VersionedReasonRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.ResultReleaseManager, cancellationToken);
        var package = await ReadPackage(id, cancellationToken);
        if (package.Version != request.Version) throw new DbUpdateConcurrencyException();
        package.Withdraw(actor.Id, DateTime.UtcNow, request.Reason);
        dbContext.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(package.Id,
            ResultDeliveryEvidenceKind.Withdrawn, actor.Id,
            System.Text.Json.JsonSerializer.Serialize(new { request.Reason }), DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(package));
    }

    [HttpGet("packages/{id:guid}")]
    public async Task<ActionResult<ResultPackageDto>> GetPackage(Guid id, CancellationToken cancellationToken)
    {
        RequireFeature();
        var package = await ReadPackage(id, cancellationToken);
        await EnsureCanReadAsync(package, cancellationToken);
        return Ok(ToDto(package));
    }

    [HttpGet("packages")]
    public async Task<ActionResult<IReadOnlyList<ResultPackageDto>>> ListPackages(
        [FromQuery] Guid? organizationId, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, dbContext,
            externalIdentityContext, cancellationToken)
            ?? throw new OrderManagementException("authentication_required", "An active user is required.", StatusCodes.Status401Unauthorized);
        var isPhaeno = actor.Memberships.Any(value => value.IsActive && value.Organization?.IsPhaeno() == true);
        var query = dbContext.ResultOutputPackages.AsNoTracking().Include(value => value.Artifacts).AsQueryable();
        if (isPhaeno)
        {
            if (organizationId.HasValue) query = query.Where(value => value.OrganizationId == organizationId);
        }
        else
        {
            var allowedIds = actor.Memberships.Where(value => value.IsActive).Select(value => value.OrganizationId).ToArray();
            query = query.Where(value => allowedIds.Contains(value.OrganizationId)
                && value.Status == ResultOutputPackageStatus.Released);
        }
        var values = await query.OrderByDescending(value => value.CreatedAt).ToListAsync(cancellationToken);
        return Ok(values.Select(ToDto).ToArray());
    }

    private async Task<ResultOutputPackage> ReadPackage(Guid id, CancellationToken cancellationToken) =>
        await dbContext.ResultOutputPackages.Include(value => value.Artifacts)
            .SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
        ?? throw Missing("result_package_missing", "The result package was not found.");

    private async Task EnsureCanReadAsync(ResultOutputPackage package, CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, dbContext,
            externalIdentityContext, cancellationToken)
            ?? throw new OrderManagementException("authentication_required", "An active user is required.", StatusCodes.Status401Unauthorized);
        var isPhaeno = actor.Memberships.Any(value => value.IsActive && value.Organization?.IsPhaeno() == true);
        var isCustomerMember = actor.Memberships.Any(value => value.IsActive && value.OrganizationId == package.OrganizationId);
        if (!isPhaeno && (!isCustomerMember || package.Status != ResultOutputPackageStatus.Released))
            throw new OrderManagementException("result_package_forbidden", "This result package is unavailable.", StatusCodes.Status403Forbidden);
    }

    private void RequireFeature()
    {
        if (!options.Value.Features.GovernedPSeqResults) throw Missing("feature_disabled", "Governed PSeq results are not enabled.");
    }

    private void RequireFeatureAndPipelineKey()
    {
        RequireFeature();
        var supplied = Request.Headers["X-PSeq-Pipeline-Key"].ToString();
        var expected = options.Value.PipelineRegistration.ApiKey;
        var left = Encoding.UTF8.GetBytes(supplied); var right = Encoding.UTF8.GetBytes(expected);
        if (left.Length != right.Length || !CryptographicOperations.FixedTimeEquals(left, right))
            throw new OrderManagementException("pipeline_authentication_failed", "Pipeline authentication failed.", StatusCodes.Status401Unauthorized);
    }

    private static ResultPackageDto ToDto(ResultOutputPackage value) => new(
        value.Id, value.OrganizationId, value.LabServiceOrderId, value.LabWorkOrderId,
        value.LabSampleId, value.PackageVersion, value.CorrectsPackageId, value.PipelineName,
        value.PipelineVersion, value.ManifestIdentity, value.ManifestSha256, value.Status,
        value.FailureReason, value.ScientificApprovalId, value.ScientificallyApprovedAtUtc,
        value.ReleasedAtUtc, value.WithdrawnAtUtc, value.WithdrawalReason, value.CreatedAt,
        value.Version, value.Artifacts.OrderBy(item => item.ArtifactIdentity).Select(item =>
            new ResultArtifactDto(item.Id, item.ArtifactIdentity, item.FileName, item.MediaType,
                item.SizeBytes, item.Sha256, item.ScanStatus, item.ScanDetails)).ToArray());

    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing(string code, string message) => new(code, message, StatusCodes.Status404NotFound);
}

public sealed record RegisterResultPackageRequest(Guid OrganizationId, Guid LabServiceOrderId,
    Guid LabWorkOrderId, Guid? LabSampleId, int PackageVersion, Guid? CorrectsPackageId,
    string PipelineName, string PipelineVersion, string ManifestIdentity, string ManifestSha256,
    string ManifestJson, string StorageProvider, string StorageObjectPrefix,
    IReadOnlyList<RegisterResultArtifactRequest> Artifacts);
public sealed record RegisterResultArtifactRequest(string ArtifactIdentity, string FileName,
    string MediaType, long SizeBytes, string Sha256, string StorageObjectKey);
public sealed record RecordResultArtifactScanRequest(ResultArtifactScanStatus Status, string? Details);
public sealed record ScientificApprovalRequest(long Version, string? PermittedQcProjectionJson);
public sealed record VersionedReasonRequest(long Version, string Reason);
public sealed record ResultPackageDto(Guid Id, Guid OrganizationId, Guid LabServiceOrderId,
    Guid LabWorkOrderId, Guid? LabSampleId, int PackageVersion, Guid? CorrectsPackageId,
    string PipelineName, string PipelineVersion, string ManifestIdentity, string ManifestSha256,
    ResultOutputPackageStatus Status, string? FailureReason, Guid? ScientificApprovalId,
    DateTime? ScientificallyApprovedAtUtc, DateTime? ReleasedAtUtc, DateTime? WithdrawnAtUtc,
    string? WithdrawalReason, DateTime CreatedAt, long Version, IReadOnlyList<ResultArtifactDto> Artifacts);
public sealed record ResultArtifactDto(Guid Id, string ArtifactIdentity, string FileName,
    string MediaType, long SizeBytes, string Sha256, ResultArtifactScanStatus ScanStatus, string? ScanDetails);
