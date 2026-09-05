namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record RegisterResultPackageRequest(
    Guid OrganizationId, Guid? LabServiceOrderId, Guid LabWorkOrderId,
    Guid? LabSampleId, Guid? CorrectsPackageId, string ManifestJson,
    string ManifestSha256, int ExpectedArtifactCount, string IdempotencyKey, Guid? TrialProjectId = null, Guid? TrialSampleId = null);
public sealed record RegisterResultArtifactRequest(
    string LogicalRole, string FileName, string ContentType, long SizeBytes,
    string Sha256, string ObjectStorageKey);
public sealed record RegisterResultArtifactsRequest(
    IReadOnlyList<RegisterResultArtifactRequest> Artifacts);
public sealed record ResultArtifactScanRequest(
    Guid ArtifactId, string ActualSha256, bool MalwareClean, string? Detail);
public sealed record CompleteResultScanRequest(IReadOnlyList<ResultArtifactScanRequest> Artifacts);
public sealed record ResultPackageMutationRequest(long Version, string? Reason = null);
public sealed record ResultPackageDto(
    Guid Id, Guid OrganizationId, Guid? LabServiceOrderId, Guid LabWorkOrderId,
    Guid? LabSampleId, int PackageVersion, Guid? CorrectsPackageId, string State,
    string PipelineProviderKey, string PipelineSubmissionId, string ManifestSha256,
    int ExpectedArtifactCount, Guid? ScientificApprovalId, DateTime? ReleasedAtUtc,
    string? FailureCode, string? FailureDetail, string? RetentionState, long Version,
    IReadOnlyList<ResultArtifactDto> Artifacts, Guid? TrialProjectId = null, Guid? TrialSampleId = null);
public sealed record ResultArtifactDto(
    Guid Id, string LogicalRole, string FileName, string ContentType, long SizeBytes,
    string Sha256, string ScanState, DateTime? ScanCompletedAtUtc, DateTime? DeletedAtUtc);
public sealed record ResultPackageRegistrationDto(
    ResultPackageDto Package, IReadOnlyList<string> ObjectStorageUploadTargets);

[ServiceFilter(typeof(PhaenoPortal.App.Features.Trials.Services.TrialWorkGuard))]
[ApiController]
[AllowAnonymous]
[Route("api/integrations/pseq-results")]
public sealed class PSeqResultPipelineController(
    PSeqOperationsDbContext dbContext,
    IPSeqResultPipelineAdapter pipelineAdapter,
    IOptions<PSeqOrderToCashOptions> options) : ControllerBase
{
    private PSeqOrderToCashOptions Rollout => options.Value;

    [HttpPost("packages")]
    public async Task<ResultPackageRegistrationDto> RegisterPackage(
        [FromBody] RegisterResultPackageRequest request, CancellationToken cancellationToken)
    {
        RequirePipelineAuthentication();
        if (!Rollout.GovernedPSeqResults)
            throw new OrderManagementException("governed_results_disabled", "Governed result delivery is not enabled.", StatusCodes.Status404NotFound);
        RequireGovernedResultsConfiguration();
        if (request.ExpectedArtifactCount < 1 || string.IsNullOrWhiteSpace(request.IdempotencyKey))
            throw Invalid("result_manifest_invalid", "A non-empty idempotency key and at least one artifact are required.");
        var normalizedManifest = NormalizeJson(request.ManifestJson);
        var calculatedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(normalizedManifest)));
        if (!CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(calculatedHash),
            Encoding.ASCII.GetBytes(request.ManifestSha256.Trim().ToUpperInvariant())))
            throw Invalid("result_manifest_checksum_mismatch", "The manifest checksum does not match its normalized content.");

        var existing = await dbContext.ResultOutputPackages.AsNoTracking()
            .SingleOrDefaultAsync(item => item.IdempotencyKey == request.IdempotencyKey, cancellationToken);
        if (existing is not null)
        {
            if (existing.ManifestSha256 != calculatedHash || existing.OrganizationId != request.OrganizationId
                || existing.LabServiceOrderId != request.LabServiceOrderId || existing.LabWorkOrderId != request.LabWorkOrderId
                || existing.LabSampleId != request.LabSampleId || existing.TrialProjectId != request.TrialProjectId || existing.TrialSampleId != request.TrialSampleId)
                throw Conflict("result_idempotency_conflict", "The idempotency key was already used with a different manifest.");
            return new ResultPackageRegistrationDto(await MapAsync(existing, cancellationToken), []);
        }

        var validReferences = await dbContext.LabServiceOrders.AsNoTracking().AnyAsync(order =>
            order.Id == request.LabServiceOrderId && order.OrganizationId == request.OrganizationId
            && dbContext.LabSamples.Any(sample => sample.Id == request.LabSampleId
                && sample.LabServiceOrderId == order.Id)
            && dbContext.CommercialLabAuthorizations.Any(authorization =>
                authorization.CommercialOrderId == order.Id
                && authorization.OrganizationId == request.OrganizationId
                && authorization.LabWorkOrderId == request.LabWorkOrderId
                && authorization.Status == CommercialLabAuthorizationStatus.Accepted
                && dbContext.LabWorkOrders.Any(work =>
                    work.Id == request.LabWorkOrderId
                    && work.AuthorizationId == authorization.AuthorizationId
                    && work.SubmittingOrganizationId == request.OrganizationId)), cancellationToken);
        if (request.TrialProjectId.HasValue || request.TrialSampleId.HasValue)
        {
            validReferences = request.LabServiceOrderId is null && request.LabSampleId is null && await dbContext.TrialSamples.AsNoTracking().AnyAsync(sample =>
                sample.Id == request.TrialSampleId && sample.TrialProjectId == request.TrialProjectId && sample.LabWorkOrderId == request.LabWorkOrderId
                && dbContext.TrialProjects.Any(trial => trial.Id == sample.TrialProjectId && trial.OrganizationId == request.OrganizationId && !trial.IsOnHold
                    && (trial.Status == PSeq.Operations.Commercial.Trials.Domain.TrialStatus.InProgress
                        || trial.Status == PSeq.Operations.Commercial.Trials.Domain.TrialStatus.Completed && request.CorrectsPackageId != null))
                && dbContext.LabWorkOrders.Any(work => work.Id == sample.LabWorkOrderId && work.AuthorizationId == sample.AuthorizationId
                    && work.SubmittingOrganizationId == request.OrganizationId), cancellationToken);
        }
        if (!validReferences)
            throw Invalid("result_package_scope_invalid", "The organization, order, work order, and sample do not describe one authorized PSeq result scope.");
        if (request.CorrectsPackageId.HasValue && !await dbContext.ResultOutputPackages.AnyAsync(item =>
            item.Id == request.CorrectsPackageId.Value && item.LabSampleId == request.LabSampleId && item.TrialSampleId == request.TrialSampleId
            && item.State == ResultOutputPackageState.Released, cancellationToken))
            throw Invalid("result_correction_target_invalid", "A correction must reference a released package for the same sample.");

        var packageVersion = await dbContext.ResultOutputPackages
            .CountAsync(item => request.TrialSampleId.HasValue ? item.TrialSampleId == request.TrialSampleId : item.LabSampleId == request.LabSampleId, cancellationToken) + 1;
        var transfer = await pipelineAdapter.RegisterManifestAsync(new PSeqResultManifestRegistration(
            request.OrganizationId, request.LabServiceOrderId, request.LabWorkOrderId,
            request.LabSampleId, packageVersion, normalizedManifest, calculatedHash,
            request.ExpectedArtifactCount, request.IdempotencyKey, request.TrialProjectId, request.TrialSampleId), cancellationToken);
        var package = new ResultOutputPackage(request.OrganizationId, request.LabServiceOrderId,
            request.LabWorkOrderId, request.LabSampleId, packageVersion, request.CorrectsPackageId,
            transfer.ProviderKey, transfer.PipelineSubmissionId, request.IdempotencyKey,
            normalizedManifest, calculatedHash, request.ExpectedArtifactCount, request.TrialProjectId, request.TrialSampleId);
        dbContext.ResultOutputPackages.Add(package);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new ResultPackageRegistrationDto(await MapAsync(package, cancellationToken),
            transfer.ObjectStorageUploadTargets);
    }

    [HttpPost("packages/{packageId:guid}/artifacts")]
    public async Task<ResultPackageDto> RegisterArtifacts(Guid packageId,
        [FromBody] RegisterResultArtifactsRequest request, CancellationToken cancellationToken)
    {
        RequirePipelineAuthentication();
        RequireGovernedResultsConfiguration();
        var package = await dbContext.ResultOutputPackages.SingleOrDefaultAsync(item => item.Id == packageId, cancellationToken)
            ?? throw Missing();
        if (package.State != ResultOutputPackageState.Uploading)
            throw Conflict("result_package_not_uploading", "Artifacts can be registered only while the package is uploading.");
        if (request.Artifacts.Count != package.ExpectedArtifactCount)
            throw Invalid("result_manifest_incomplete", "Register exactly the artifact count declared by the manifest.");
        if (await dbContext.ResultArtifacts.AnyAsync(item => item.ResultOutputPackageId == package.Id, cancellationToken))
            throw Conflict("result_artifacts_already_registered", "Artifacts were already registered for this package.");
        foreach (var item in request.Artifacts)
            dbContext.ResultArtifacts.Add(new ResultArtifact(package.Id, item.LogicalRole,
                item.FileName, item.ContentType, item.SizeBytes, item.Sha256, item.ObjectStorageKey));
        package.BeginScanning();
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(package, cancellationToken);
    }

    [HttpPost("packages/{packageId:guid}/scan-result")]
    public async Task<ResultPackageDto> CompleteScan(Guid packageId,
        [FromBody] CompleteResultScanRequest request, CancellationToken cancellationToken)
    {
        RequirePipelineAuthentication();
        RequireGovernedResultsConfiguration();
        var package = await dbContext.ResultOutputPackages.SingleOrDefaultAsync(item => item.Id == packageId, cancellationToken)
            ?? throw Missing();
        if (package.State != ResultOutputPackageState.Scanning)
            throw Conflict("result_package_not_scanning", "Scan results can be recorded only for a scanning package.");
        var artifacts = await dbContext.ResultArtifacts.Where(item => item.ResultOutputPackageId == package.Id).ToListAsync(cancellationToken);
        if (request.Artifacts.Count != artifacts.Count || request.Artifacts.Select(item => item.ArtifactId).Distinct().Count() != artifacts.Count)
            throw Invalid("result_scan_manifest_incomplete", "Provide one scan result for every registered artifact.");
        var byId = request.Artifacts.ToDictionary(item => item.ArtifactId);
        var checksumsMatch = true;
        var malwareClean = true;
        foreach (var artifact in artifacts)
        {
            if (!byId.TryGetValue(artifact.Id, out var result))
                throw Invalid("result_scan_manifest_incomplete", "Provide one scan result for every registered artifact.");
            var checksumMatch = string.Equals(artifact.Sha256, result.ActualSha256.Trim(), StringComparison.OrdinalIgnoreCase);
            checksumsMatch &= checksumMatch;
            malwareClean &= result.MalwareClean;
            artifact.BeginScan();
            artifact.CompleteScan(checksumMatch && result.MalwareClean,
                checksumMatch ? result.Detail : "Artifact checksum mismatch.", DateTime.UtcNow);
        }
        if (checksumsMatch && malwareClean)
            package.MarkReadyForReview(artifacts.Count, true, true);
        else
            package.Fail(checksumsMatch ? "malware_scan_rejected" : "artifact_checksum_mismatch",
                checksumsMatch ? "One or more artifacts failed malware scanning." : "One or more artifact checksums did not match the manifest.");
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(package, cancellationToken);
    }

    private void RequirePipelineAuthentication()
    {
        var header = Rollout.PipelineServiceSecretHeaderName;
        if (string.IsNullOrWhiteSpace(header)
            || !Request.Headers.TryGetValue(header, out var supplied)
            || !FixedTimeEquals(supplied.ToString(), Rollout.PipelineServiceSecret))
            throw new OrderManagementException("pipeline_authentication_failed", "Pipeline authentication failed.", StatusCodes.Status401Unauthorized);
    }

    private void RequireGovernedResultsConfiguration()
    {
        if (!Rollout.GovernedPSeqResults)
            throw new OrderManagementException("governed_results_disabled",
                "Governed result delivery is not enabled.", StatusCodes.Status404NotFound);
        if (Rollout.ValidateGovernedResults().Count > 0)
            throw new OrderManagementException("result_delivery_configuration_invalid",
                "Governed result delivery configuration is incomplete.",
                StatusCodes.Status503ServiceUnavailable);
    }

    private async Task<ResultPackageDto> MapAsync(ResultOutputPackage package, CancellationToken cancellationToken)
    {
        var artifacts = await dbContext.ResultArtifacts.AsNoTracking()
            .Where(item => item.ResultOutputPackageId == package.Id).OrderBy(item => item.FileName)
            .Select(item => new ResultArtifactDto(item.Id, item.LogicalRole, item.FileName,
                item.ContentType, item.SizeBytes, item.Sha256, item.ScanState.ToString(),
                item.ScanCompletedAtUtc, item.DeletedAtUtc)).ToListAsync(cancellationToken);
        return Map(package, artifacts);
    }

    internal static ResultPackageDto Map(ResultOutputPackage package, IReadOnlyList<ResultArtifactDto> artifacts) =>
        Map(package, artifacts, null);

    internal static ResultPackageDto Map(ResultOutputPackage package,
        IReadOnlyList<ResultArtifactDto> artifacts, string? retentionState) =>
        new(package.Id, package.OrganizationId, package.LabServiceOrderId, package.LabWorkOrderId,
            package.LabSampleId, package.PackageVersion, package.CorrectsPackageId, package.State.ToString(),
            package.PipelineProviderKey, package.PipelineSubmissionId, package.ManifestSha256,
            package.ExpectedArtifactCount, package.ScientificApprovalId, package.ReleasedAtUtc,
            package.FailureCode, package.FailureDetail, retentionState, package.Version, artifacts, package.TrialProjectId, package.TrialSampleId);

    private static string NormalizeJson(string value)
    {
        try { using var document = JsonDocument.Parse(value); return document.RootElement.GetRawText(); }
        catch (JsonException) { throw Invalid("result_manifest_invalid", "The result manifest is invalid JSON."); }
    }
    private static bool FixedTimeEquals(string left, string right) =>
        CryptographicOperations.FixedTimeEquals(
            SHA256.HashData(Encoding.UTF8.GetBytes(left)),
            SHA256.HashData(Encoding.UTF8.GetBytes(right)));
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("result_package_not_found", "The result package was not found.", StatusCodes.Status404NotFound);
}

[ApiController]
[Authorize]
[Route("api/platform/pseq-result-packages")]
public sealed class PSeqResultReleaseController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    IOptions<PSeqOrderToCashOptions> options,
    ReleasedDeliverableRetentionSnapshotService retentionSnapshots,
    GovernedResultRetentionService retentionService) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<IReadOnlyList<ResultPackageDto>> List([FromQuery] string? state, CancellationToken cancellationToken)
    {
        RequireGovernedResultsConfiguration();
        await requestContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.ResultReleaseManager,
            options.Value.BusinessRoles || options.Value.DualControlEnforced, cancellationToken);
        var query = dbContext.ResultOutputPackages.AsNoTracking().Where(value => value.TrialProjectId == null);
        if (!string.IsNullOrWhiteSpace(state))
        {
            if (!Enum.TryParse<ResultOutputPackageState>(state, true, out var parsed))
                throw new OrderManagementException("result_package_state_invalid", "The result package state is invalid.");
            query = query.Where(item => item.State == parsed);
        }
        var packages = await query.OrderByDescending(item => item.CreatedAt).Take(250).ToListAsync(cancellationToken);
        var packageIds = packages.Select(item => item.Id).ToList();
        var artifacts = await dbContext.ResultArtifacts.AsNoTracking().Where(item => packageIds.Contains(item.ResultOutputPackageId))
            .OrderBy(item => item.FileName).ToListAsync(cancellationToken);
        var retention = await retentionService.ReadAsync(packages, artifacts, await RetentionTransaction.ClockAsync(dbContext, cancellationToken), cancellationToken);
        return packages.Select(package => PSeqResultPipelineController.Map(package,
            artifacts.Where(item => item.ResultOutputPackageId == package.Id)
                .Select(item => new ResultArtifactDto(item.Id, item.LogicalRole, item.FileName, item.ContentType,
                    item.SizeBytes, item.Sha256, item.ScanState.ToString(), item.ScanCompletedAtUtc, item.DeletedAtUtc)).ToList(),
            retention[package.Id].State)).ToList();
    }

    [HttpPost("{packageId:guid}/release")]
    public async Task<ResultPackageDto> Release(Guid packageId,
        [FromBody] ResultPackageMutationRequest request, CancellationToken cancellationToken)
    {
        RequireGovernedResultsConfiguration();
        var actor = await requestContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.ResultReleaseManager,
            options.Value.BusinessRoles || options.Value.DualControlEnforced, cancellationToken);
        var package = await dbContext.ResultOutputPackages.SingleOrDefaultAsync(item => item.Id == packageId, cancellationToken)
            ?? throw new OrderManagementException("result_package_not_found", "The result package was not found.", StatusCodes.Status404NotFound);
        if (package.TrialProjectId.HasValue) throw new OrderManagementException("trial_release_required", "Release Trial results from the owning Trial Project.", StatusCodes.Status409Conflict);
        EnsureVersion(package.Version, request.Version);
        var now = DateTime.UtcNow;
        package.Release(actor.Id, now);
        var release = new LabResultRelease(package.OrganizationId, package.LabServiceOrderId!.Value,
            package.LabSampleId!.Value, package.PackageVersion, "PSeq", package.PipelineProviderKey,
            $"Output package {package.Id}; manifest SHA-256 {package.ManifestSha256}", "ScientificallyApproved",
            JsonSerializer.Serialize(new { resultOutputPackageId = package.Id }, JsonOptions), now);
        release.MarkReady(false);
        release.Release(now);
        dbContext.LabResultReleases.Add(release);
        var snapshot = await retentionSnapshots.CaptureLabResultAsync(release, now, cancellationToken);
        dbContext.ResultRetentionSchedules.Add(new ResultRetentionSchedule(package.Id, snapshot));
        dbContext.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(package.Id, null,
            ResultDeliveryEvidenceKind.Notification, actor.Id, now,
            JsonSerializer.Serialize(new { status = "queued", paymentGateApplied = false }, JsonOptions)));
        var departmentId = await dbContext.LabServiceOrders.AsNoTracking()
            .Where(order => order.Id == package.LabServiceOrderId)
            .Select(order => order.DepartmentId)
            .SingleAsync(cancellationToken);
        dbContext.OrderNotifications.Add(new OrderNotification(package.OrganizationId, null,
            OrderWorkflowTypes.LabService, package.LabServiceOrderId!.Value, "pseq-result-released",
            "PSeq result available", "A scientifically approved PSeq result package is available for download.", departmentId));
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await List(package.State.ToString(), cancellationToken)).Single(item => item.Id == package.Id);
    }

    [HttpPost("{packageId:guid}/withdraw")]
    public async Task<ResultPackageDto> Withdraw(Guid packageId,
        [FromBody] ResultPackageMutationRequest request, CancellationToken cancellationToken)
    {
        RequireGovernedResultsConfiguration();
        var actor = await requestContext.RequireBusinessRoleAsync(HttpContext, BusinessRole.ResultReleaseManager,
            options.Value.BusinessRoles || options.Value.DualControlEnforced, cancellationToken);
        var package = await dbContext.ResultOutputPackages.SingleOrDefaultAsync(item => item.Id == packageId, cancellationToken)
            ?? throw new OrderManagementException("result_package_not_found", "The result package was not found.", StatusCodes.Status404NotFound);
        EnsureVersion(package.Version, request.Version);
        if (package.TrialProjectId.HasValue) throw new OrderManagementException("trial_release_required", "Manage Trial results from the owning Trial Project.", StatusCodes.Status409Conflict);
        package.Withdraw(actor.Id, DateTime.UtcNow, request.Reason ?? "Withdrawn by result release manager.");
        var release = await dbContext.LabResultReleases.SingleOrDefaultAsync(item =>
            item.LabSampleId == package.LabSampleId && item.ReleaseVersion == package.PackageVersion, cancellationToken);
        release?.Withdraw();
        dbContext.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(package.Id, null,
            ResultDeliveryEvidenceKind.Withdrawn, actor.Id, DateTime.UtcNow,
            JsonSerializer.Serialize(new { reason = request.Reason }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await List(package.State.ToString(), cancellationToken)).Single(item => item.Id == package.Id);
    }

    [HttpPost("{packageId:guid}/authorize-reissue")]
    public async Task<ResultPackageDto> AuthorizeReissue(Guid packageId,
        [FromBody] ResultPackageMutationRequest request, CancellationToken cancellationToken)
    {
        RequireGovernedResultsConfiguration();
        var actor = await requestContext.RequireBusinessRoleAsync(HttpContext,
            BusinessRole.ResultReleaseManager,
            options.Value.BusinessRoles || options.Value.DualControlEnforced,
            cancellationToken);
        var package = await dbContext.ResultOutputPackages
            .SingleOrDefaultAsync(item => item.Id == packageId, cancellationToken)
            ?? throw new OrderManagementException("result_package_not_found",
                "The result package was not found.", StatusCodes.Status404NotFound);
        EnsureVersion(package.Version, request.Version);
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new OrderManagementException("result_reissue_reason_required",
                "A reason is required to authorize reissue.");
        var schedule = await dbContext.ResultRetentionSchedules
            .SingleOrDefaultAsync(item => item.ResultOutputPackageId == package.Id,
                cancellationToken)
            ?? throw new OrderManagementException("result_retention_not_found",
                "The result package does not have a retention schedule.",
                StatusCodes.Status404NotFound);
        try { schedule.Reissue(); }
        catch (InvalidOperationException exception)
        {
            throw new OrderManagementException("result_reissue_not_ready",
                exception.Message, StatusCodes.Status409Conflict);
        }
        dbContext.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(package.Id,
            null, ResultDeliveryEvidenceKind.Reissued, actor.Id, DateTime.UtcNow,
            JsonSerializer.Serialize(new { reason = request.Reason }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await List(package.State.ToString(), cancellationToken))
            .Single(item => item.Id == package.Id);
    }

    private static void EnsureVersion(long actual, long expected)
    {
        if (actual != expected)
            throw new OrderManagementException("concurrency_conflict", "This record changed. Refresh and try again.", StatusCodes.Status409Conflict);
    }

    private void RequireGovernedResultsConfiguration()
    {
        if (!options.Value.GovernedPSeqResults)
            throw new OrderManagementException("governed_results_disabled",
                "Governed result delivery is not enabled.", StatusCodes.Status404NotFound);
        if (options.Value.ValidateGovernedResults().Count > 0)
            throw new OrderManagementException("result_delivery_configuration_invalid",
                "Governed result delivery configuration is incomplete.",
                StatusCodes.Status503ServiceUnavailable);
    }
}
