namespace PhaenoPortal.App.Features.DataProvisioning.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.DataProvisioning.Domain;
using PhaenoPortal.App.Features.DataProvisioning.DTOs;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/data-provisioning")]
public sealed class DataProvisioningAdminController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext,
    DataProvisioningProfile profile,
    IManagedFileStorage fileStorage,
    IManagedFileScanner fileScanner) : ControllerBase
{
    [HttpPost("organizations")]
    public async Task<ActionResult<CreateProvisionedOrganizationResultDto>> CreateProvisionedOrganization(
        [FromBody] CreateProvisionedOrganizationRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        if (request.Kind == OrganizationKind.Phaeno)
        {
            throw new DataProvisioningException(
                "organization_kind_not_allowed",
                "New tenant organizations must be a Prospect, Customer, or Partner.");
        }

        var name = RequireText(request.Name, "name", 255);
        if (await dbContext.Organizations.AnyAsync(
            organization => organization.Name.ToLower() == name.ToLower(),
            cancellationToken))
        {
            throw new DataProvisioningException(
                "organization_name_exists",
                "An organization with this name already exists.",
                StatusCodes.Status409Conflict);
        }

        var versionIds = request.DatasetVersionIds.Distinct().ToList();
        var versions = await dbContext.CuratedDatasetVersions
            .Include(version => version.CuratedDataset)
            .Where(version => versionIds.Contains(version.Id))
            .ToDictionaryAsync(version => version.Id, cancellationToken);
        var organization = new Organization(
            name,
            request.Kind,
            OptionalText(request.Description, "description", 2000));
        dbContext.Organizations.Add(organization);
        await dbContext.SaveChangesAsync(cancellationToken);

        var grantResults = new List<ProvisioningResultDto>();
        foreach (var versionId in versionIds)
        {
            if (!versions.TryGetValue(versionId, out var datasetVersion))
            {
                grantResults.Add(FailedProvisioningResult(
                    $"organization-create-{organization.Id:N}-{versionId:N}",
                    "dataset_version_not_found",
                    "The selected curated dataset version was not found."));
                continue;
            }

            var now = DateTime.UtcNow;
            var idempotencyKey = $"organization-create-{organization.Id:N}-{versionId:N}";
            var run = new ProvisioningRun(
                organization,
                datasetVersion,
                idempotencyKey,
                actor.Id,
                now,
                ProvisioningRunKind.OrganizationCreationGrant);
            if (datasetVersion.Status != CuratedDatasetVersionStatus.Published
                || datasetVersion.CuratedDataset.EligibleVersionId != datasetVersion.Id
                || !datasetVersion.CuratedDataset.IsActive)
            {
                run.Fail(
                    "dataset_version_not_grantable",
                    "The selected exact version is not currently eligible for organization assignment.",
                    now);
                dbContext.ProvisioningRuns.Add(run);
                await dbContext.SaveChangesAsync(cancellationToken);
                grantResults.Add(ToProvisioningResult(run, grant: null));
                continue;
            }

            try
            {
                profile.EnsureExternalPublicationAllowed(datasetVersion.IsSynthetic);
                var grant = new OrganizationDatasetGrant(
                    organization,
                    datasetVersion.CuratedDataset,
                    datasetVersion,
                    actor.Id,
                    now);
                dbContext.OrganizationDatasetGrants.Add(grant);
                run.Succeed(grant.Id, now);
                dbContext.ProvisioningRuns.Add(run);
                dbContext.DataProvisioningNotices.Add(CreateNotice(
                    organization,
                    DataProvisioningNoticeKind.Grant,
                    $"Sample data assigned: {datasetVersion.CuratedDataset.Name}",
                    $"Phaeno assigned {datasetVersion.CuratedDataset.Name} version {datasetVersion.VersionNumber} to your organization.",
                    now,
                    grantId: grant.Id));
                await dbContext.SaveChangesAsync(cancellationToken);
                grantResults.Add(ToProvisioningResult(run, grant));
            }
            catch (DataProvisioningException exception)
            {
                run.Fail(exception.ErrorCode, exception.Message, DateTime.UtcNow);
                dbContext.ProvisioningRuns.Add(run);
                await dbContext.SaveChangesAsync(cancellationToken);
                grantResults.Add(ToProvisioningResult(run, grant: null));
            }
        }

        var result = new CreateProvisionedOrganizationResultDto
        {
            Organization = new OrganizationDto
            {
                Id = organization.Id,
                Name = organization.Name,
                Description = organization.Description,
                Kind = organization.Kind,
                PortalReadiness = organization.PortalReadiness,
                PortalReadinessNote = organization.PortalReadinessNote,
                IsActive = organization.IsActive,
                CreatedAt = organization.CreatedAt,
                UpdatedAt = organization.UpdatedAt,
                Version = organization.Version
            },
            PackageGrants = grantResults
        };
        return Created($"/api/organizations/{organization.Id}", result);
    }

    [HttpGet("source-samples")]
    public async Task<IReadOnlyList<SourceSampleDto>> ListSourceSamples(
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var sources = await dbContext.SourceSamples
            .AsNoTracking()
            .Include(source => source.Files)
            .OrderBy(source => source.Label)
            .ToListAsync(cancellationToken);
        return sources.Select(DataProvisioningMappings.ToDto).ToList();
    }

    [HttpGet("source-samples/{id:guid}")]
    public async Task<SourceSampleDto> GetSourceSample(
        Guid id,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(
            await ReadSourceAsync(id, tracking: false, cancellationToken));
    }

    [HttpPost("source-samples")]
    public async Task<ActionResult<SourceSampleDto>> CreateSourceSample(
        [FromBody] CreateSourceSampleRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var label = RequireText(request.Label, "label", 255);
        profile.EnsureSyntheticFixturesAllowed(request.IsSynthetic);

        if (await dbContext.SourceSamples.AnyAsync(
            source => source.Label.ToLower() == label.ToLower(),
            cancellationToken))
        {
            throw new DataProvisioningException(
                "source_sample_label_exists",
                "A source sample with this label already exists.",
                StatusCodes.Status409Conflict);
        }

        var source = new SourceSample(label, request.IsSynthetic);
        dbContext.SourceSamples.Add(source);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(
            nameof(GetSourceSample),
            new { id = source.Id },
            DataProvisioningMappings.ToDto(source));
    }

    [HttpPut("source-samples/{id:guid}")]
    public async Task<SourceSampleDto> UpdateSourceSample(
        Guid id,
        [FromBody] UpdateSourceSampleRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var source = await ReadSourceAsync(id, tracking: true, cancellationToken);
        EnsureVersion(source.Version, request.Version);
        EnsureSourceDraft(source);

        source.UpdateMetadata(
            RequireText(request.Label, "label", 255),
            RequireText(request.Description, "description", 2000),
            RequireText(request.BiologicalContext, "biologicalContext", 2000),
            RequireText(request.AssayContext, "assayContext", 2000),
            RequireText(request.AnalysisSummary, "analysisSummary", 4000),
            RequireText(request.QcStatus, "qcStatus", 500),
            RequireText(request.Provenance, "provenance", 2000));
        var now = DateTime.UtcNow;
        source.ConfirmOwnership(
            RequireText(request.OwnershipBasis, "ownershipBasis", 2000),
            OptionalText(request.OwnershipEvidenceReference, "ownershipEvidenceReference", 1000),
            actor.Id,
            now);
        source.ConfirmDeidentification(
            RequireText(request.DeidentificationMethod, "deidentificationMethod", 1000),
            OptionalText(request.DeidentificationNotes, "deidentificationNotes", 2000),
            actor.Id,
            now);

        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(source);
    }

    [HttpPost("source-samples/{id:guid}/files")]
    [Consumes("multipart/form-data")]
    [RequestFormLimits(MultipartBodyLengthLimit = 52_428_800)]
    public async Task<ActionResult<ManagedFileDto>> UploadSourceFile(
        Guid id,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var source = await ReadSourceAsync(id, tracking: true, cancellationToken);
        EnsureSourceDraft(source);

        if (file.Length <= 0)
        {
            throw new DataProvisioningException("empty_file", "Select a non-empty file.");
        }

        var fileName = Path.GetFileName(file.FileName).Trim();
        if (string.IsNullOrWhiteSpace(fileName) || fileName.Length > 512)
        {
            throw new DataProvisioningException(
                "invalid_file_name",
                "The file name is missing or too long.");
        }

        var (extension, fileKind) = profile.ResolveFileKind(fileName);
        StoredFileResult stored;
        await using (var stream = file.OpenReadStream())
        {
            stored = await fileStorage.SaveAsync(
                stream,
                extension,
                profile.MaximumUploadBytes,
                cancellationToken);
        }

        try
        {
            var scan = await fileScanner.ScanAsync(stored.StorageKey, cancellationToken);
            var managedFile = new ManagedFile(
                source.Id,
                fileName,
                fileKind,
                string.IsNullOrWhiteSpace(file.ContentType)
                    ? "application/octet-stream"
                    : file.ContentType,
                stored.SizeBytes,
                stored.Sha256,
                stored.StorageKey);
            managedFile.RecordScan(scan.Status, scan.Message);
            source.Files.Add(managedFile);
            dbContext.ManagedFiles.Add(managedFile);
            // Mark the aggregate modified so a concurrent ready/archive transition
            // cannot allow a late file insert into an immutable revision.
            source.MarkUpdated(DateTime.UtcNow, actor.Id);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Created(string.Empty, DataProvisioningMappings.ToDto(managedFile));
        }
        catch
        {
            await fileStorage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None);
            throw;
        }
    }

    [HttpPost("source-samples/{id:guid}/ready")]
    public async Task<SourceSampleDto> MarkSourceReady(
        Guid id,
        [FromBody] VersionedCommandRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var source = await ReadSourceAsync(id, tracking: true, cancellationToken);
        EnsureVersion(source.Version, request.Version);
        profile.EnsureSyntheticFixturesAllowed(source.IsSynthetic);

        var errors = ValidateReadiness(source);
        if (errors.Count > 0)
        {
            throw new DataProvisioningException(
                "source_sample_not_ready",
                "The complete source revision is not ready for curation.",
                details: errors);
        }

        source.MarkReady(actor.Id, DateTime.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(source);
    }

    [HttpPost("source-samples/{id:guid}/archive")]
    public async Task<SourceSampleDto> ArchiveSource(
        Guid id,
        [FromBody] VersionedCommandRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var source = await ReadSourceAsync(id, tracking: true, cancellationToken);
        EnsureVersion(source.Version, request.Version);
        if (source.Status != SourceSampleStatus.Ready)
        {
            throw new DataProvisioningException(
                "source_sample_not_archivable",
                "Only a ready source sample can be archived.");
        }

        source.Archive(actor.Id, DateTime.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(source);
    }

    [HttpDelete("source-samples/{id:guid}")]
    public async Task<IActionResult> DiscardSourceDraft(
        Guid id,
        [FromBody] DiscardDraftRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var source = await ReadSourceAsync(id, tracking: true, cancellationToken);
        EnsureVersion(source.Version, request.Version);
        var reason = RequireText(request.Reason, "reason", 2000);
        if (source.Status != SourceSampleStatus.Draft)
        {
            throw new DataProvisioningException(
                "source_sample_not_discardable",
                "Only an unreferenced draft source sample can be discarded.");
        }

        if (await dbContext.CuratedDatasetVersions.AnyAsync(
            version => version.SourceSampleId == source.Id,
            cancellationToken))
        {
            throw new DataProvisioningException(
                "source_sample_in_use",
                "This source revision is referenced by curated data and cannot be discarded.",
                StatusCodes.Status409Conflict);
        }

        var storageKeys = source.Files.Select(file => file.StorageKey).ToList();
        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(SourceSample),
            source.Id,
            "SourceDraftDiscarded",
            organizationId: null,
            actor.Id,
            new { reason, fileCount = storageKeys.Count });
        dbContext.ManagedFiles.RemoveRange(source.Files);
        dbContext.SourceSamples.Remove(source);
        await dbContext.SaveChangesAsync(cancellationToken);

        foreach (var storageKey in storageKeys)
        {
            await fileStorage.DeleteIfExistsAsync(storageKey, cancellationToken);
        }

        return NoContent();
    }

    [HttpGet("datasets")]
    public async Task<IReadOnlyList<CuratedDatasetDto>> ListDatasets(
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var datasets = await DatasetQuery(tracking: false)
            .OrderBy(dataset => dataset.Name)
            .ToListAsync(cancellationToken);
        return datasets.Select(DataProvisioningMappings.ToDto).ToList();
    }

    [HttpGet("datasets/{id:guid}")]
    public async Task<CuratedDatasetDto> GetDataset(
        Guid id,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var dataset = await DatasetQuery(tracking: false)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw NotFound("curated_dataset_not_found", "The curated dataset was not found.");
        return DataProvisioningMappings.ToDto(dataset);
    }

    [HttpPut("datasets/{id:guid}")]
    public async Task<CuratedDatasetDto> UpdateDataset(
        Guid id,
        [FromBody] UpdateCuratedDatasetRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var dataset = await DatasetQuery(tracking: true)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw NotFound("curated_dataset_not_found", "The curated dataset was not found.");
        EnsureVersion(dataset.Version, request.Version);
        dataset.Update(
            RequireText(request.Name, "name", 255),
            RequireText(request.Description, "description", 2000));
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(dataset);
    }

    [HttpPost("datasets/{id:guid}/deactivate")]
    public async Task<CuratedDatasetDto> DeactivateDataset(
        Guid id,
        [FromBody] ReasonedVersionedCommandRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var dataset = await DatasetQuery(tracking: true)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw NotFound("curated_dataset_not_found", "The curated dataset was not found.");
        EnsureVersion(dataset.Version, request.Version);
        if (!dataset.IsActive)
        {
            throw new DataProvisioningException(
                "curated_dataset_inactive",
                "The curated dataset is already inactive.",
                StatusCodes.Status409Conflict);
        }

        var reason = RequireText(request.Reason, "reason", 2000);
        dataset.Deactivate();
        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(CuratedDataset),
            dataset.Id,
            "CuratedDatasetDeactivated",
            organizationId: null,
            actor.Id,
            new { reason, existingGrantsPreserved = true });
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(dataset);
    }

    [HttpPost("datasets/{id:guid}/reactivate")]
    public async Task<CuratedDatasetDto> ReactivateDataset(
        Guid id,
        [FromBody] VersionedCommandRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var dataset = await DatasetQuery(tracking: true)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw NotFound("curated_dataset_not_found", "The curated dataset was not found.");
        EnsureVersion(dataset.Version, request.Version);
        dataset.Reactivate();
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(dataset);
    }

    [HttpPost("datasets")]
    public async Task<ActionResult<CuratedDatasetDto>> CreateDataset(
        [FromBody] CreateCuratedDatasetRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var name = RequireText(request.Name, "name", 255);
        var description = RequireText(request.Description, "description", 2000);
        if (await dbContext.CuratedDatasets.AnyAsync(
            dataset => dataset.Name.ToLower() == name.ToLower(),
            cancellationToken))
        {
            throw new DataProvisioningException(
                "curated_dataset_name_exists",
                "A curated dataset with this name already exists.",
                StatusCodes.Status409Conflict);
        }

        var dataset = new CuratedDataset(name, description);
        dbContext.CuratedDatasets.Add(dataset);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetDataset), new { id = dataset.Id }, DataProvisioningMappings.ToDto(dataset));
    }

    [HttpPost("datasets/{id:guid}/versions")]
    public async Task<ActionResult<CuratedDatasetVersionDto>> CreateDatasetVersion(
        Guid id,
        [FromBody] CreateCuratedDatasetVersionRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var dataset = await DatasetQuery(tracking: true)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw NotFound("curated_dataset_not_found", "The curated dataset was not found.");
        EnsureVersion(dataset.Version, request.DatasetVersion);
        if (!dataset.IsActive)
        {
            throw new DataProvisioningException(
                "curated_dataset_inactive",
                "A new version cannot be created for an inactive curated dataset.",
                StatusCodes.Status409Conflict);
        }
        var source = await ReadSourceAsync(request.SourceSampleId, tracking: true, cancellationToken);
        if (source.Status != SourceSampleStatus.Ready)
        {
            throw new DataProvisioningException(
                "source_sample_not_ready",
                "Only a ready source revision can be snapshotted.");
        }

        profile.EnsureSyntheticFixturesAllowed(source.IsSynthetic);
        var nextVersion = dataset.Versions.Count == 0
            ? 1
            : dataset.Versions.Max(version => version.VersionNumber) + 1;
        var version = new CuratedDatasetVersion(
            dataset.Id,
            nextVersion,
            source,
            RequireText(request.ReleaseNotes, "releaseNotes", 4000),
            DateTime.UtcNow);
        foreach (var sourceFile in source.Files.OrderBy(file => file.FileName))
        {
            version.Files.Add(new CuratedDatasetVersionFile(version.Id, sourceFile));
        }

        var manifest = DatasetManifestService.Build(version);
        version.SetManifest(manifest.ManifestJson, manifest.ContentChecksum);
        dataset.Versions.Add(version);
        dbContext.CuratedDatasetVersions.Add(version);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created(string.Empty, DataProvisioningMappings.ToDto(version));
    }

    [HttpPost("datasets/{datasetId:guid}/versions/{versionId:guid}/publish")]
    public async Task<CuratedDatasetVersionDto> PublishDatasetVersion(
        Guid datasetId,
        Guid versionId,
        [FromBody] VersionedCommandRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var version = await dbContext.CuratedDatasetVersions
            .Include(item => item.CuratedDataset)
            .Include(item => item.Files)
            .ThenInclude(file => file.ManagedFile)
            .FirstOrDefaultAsync(
                item => item.Id == versionId && item.CuratedDatasetId == datasetId,
                cancellationToken)
            ?? throw NotFound("dataset_version_not_found", "The curated dataset version was not found.");
        EnsureVersion(version.Version, request.Version);
        profile.EnsureExternalPublicationAllowed(version.IsSynthetic);

        if (!version.CuratedDataset.IsActive)
        {
            throw new DataProvisioningException(
                "curated_dataset_inactive",
                "A version cannot be published while its curated dataset is inactive.",
                StatusCodes.Status409Conflict);
        }

        if (await dbContext.DataGovernanceIncidents.AnyAsync(
            incident => incident.SourceSampleId == version.SourceSampleId
                && incident.Status == DataGovernanceIncidentStatus.Open,
            cancellationToken))
        {
            throw new DataProvisioningException(
                "source_sample_quarantined",
                "A curated version cannot be published while its source sample has an open governance incident.",
                StatusCodes.Status409Conflict);
        }

        var errors = new List<string>();
        if (version.Status != CuratedDatasetVersionStatus.Draft)
        {
            errors.Add("Only a draft version can be published.");
        }
        if (version.Files.Count == 0)
        {
            errors.Add("At least one managed file is required.");
        }
        if (version.Files.Any(file => file.ManagedFile.ScanStatus != ManagedFileScanStatus.Clean))
        {
            errors.Add("Every managed file must have a clean scan result.");
        }
        var manifest = DatasetManifestService.Build(version);
        if (!DatasetManifestService.SemanticallyEquals(
                manifest.ManifestJson,
                version.ManifestJson)
            || !string.Equals(manifest.ContentChecksum, version.ContentChecksum, StringComparison.Ordinal))
        {
            errors.Add("The immutable manifest or checksum no longer matches the draft snapshot.");
        }
        if (errors.Count > 0)
        {
            throw new DataProvisioningException(
                "dataset_version_not_publishable",
                "The complete curated version cannot be published.",
                details: errors);
        }

        version.Publish(actor.Id, DateTime.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(version);
    }

    [HttpPost("datasets/{datasetId:guid}/versions/{versionId:guid}/retire")]
    public async Task<CuratedDatasetVersionDto> RetireDatasetVersion(
        Guid datasetId,
        Guid versionId,
        [FromBody] ReasonedVersionedCommandRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var dataset = await DatasetQuery(tracking: true)
            .FirstOrDefaultAsync(item => item.Id == datasetId, cancellationToken)
            ?? throw NotFound("curated_dataset_not_found", "The curated dataset was not found.");
        var version = dataset.Versions.FirstOrDefault(item => item.Id == versionId)
            ?? throw NotFound("dataset_version_not_found", "The curated dataset version was not found.");
        EnsureVersion(version.Version, request.Version);
        var reason = RequireText(request.Reason, "reason", 2000);
        version.Retire();
        if (dataset.EligibleVersionId == version.Id)
        {
            dataset.RemoveEligibility();
        }

        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(CuratedDatasetVersion),
            version.Id,
            "CuratedDatasetVersionRetired",
            organizationId: null,
            actor.Id,
            new { reason, existingGrantsPreserved = true });
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(version);
    }

    [HttpPost("datasets/{id:guid}/eligibility")]
    public async Task<CuratedDatasetDto> SetDatasetEligibility(
        Guid id,
        [FromBody] SetDatasetEligibilityRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var dataset = await DatasetQuery(tracking: true)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw NotFound("curated_dataset_not_found", "The curated dataset was not found.");
        EnsureVersion(dataset.Version, request.Version);

        if (!request.IsEligible)
        {
            dataset.RemoveEligibility();
        }
        else
        {
            if (!dataset.IsActive)
            {
                throw new DataProvisioningException(
                    "curated_dataset_inactive",
                    "An inactive curated dataset cannot be added to the eligible catalog.",
                    StatusCodes.Status409Conflict);
            }
            var version = dataset.Versions.FirstOrDefault(item => item.Id == request.DatasetVersionId)
                ?? throw NotFound("dataset_version_not_found", "The curated dataset version was not found.");
            profile.EnsureExternalPublicationAllowed(version.IsSynthetic);
            if (version.Status != CuratedDatasetVersionStatus.Published)
            {
                throw new DataProvisioningException(
                    "dataset_version_not_published",
                    "Only a published version can be added to the eligible catalog.");
            }

            dataset.SetEligibleVersion(version, actor.Id, DateTime.UtcNow);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(dataset);
    }

    [HttpPost("datasets/{id:guid}/remove-eligibility")]
    public async Task<RemoveDatasetEligibilityResultDto> RemoveDatasetEligibility(
        Guid id,
        [FromBody] RemoveDatasetEligibilityRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var dataset = await DatasetQuery(tracking: true)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw NotFound("curated_dataset_not_found", "The curated dataset was not found.");
        EnsureVersion(dataset.Version, request.Version);
        var reason = request.RevokeAllActiveGrants
            ? RequireText(request.Reason, "reason", 2000)
            : null;
        dataset.RemoveEligibility();

        var revokedGrantCount = 0;
        if (request.RevokeAllActiveGrants)
        {
            var activeGrants = await GrantQuery(tracking: true)
                .Where(grant => grant.CuratedDatasetId == dataset.Id
                    && grant.Status == OrganizationDatasetGrantStatus.Active)
                .ToListAsync(cancellationToken);
            var now = DateTime.UtcNow;
            foreach (var grant in activeGrants)
            {
                grant.Revoke(reason!, actor.Id, now);
                var run = new ProvisioningRun(
                    grant.Organization,
                    grant.CuratedDatasetVersion,
                    $"bulk-revoke-{dataset.Id:N}-{grant.Id:N}",
                    actor.Id,
                    now,
                    ProvisioningRunKind.BulkRevocation,
                    grant.Id);
                run.Succeed(grant.Id, now);
                dbContext.ProvisioningRuns.Add(run);
                dbContext.DataProvisioningNotices.Add(CreateNotice(
                    grant.Organization,
                    DataProvisioningNoticeKind.Revocation,
                    $"Access revoked: {dataset.Name}",
                    $"Phaeno revoked organization access to {dataset.Name}. Previously downloaded copies cannot be recalled. Reason: {reason}",
                    now,
                    grantId: grant.Id));
                revokedGrantCount++;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new RemoveDatasetEligibilityResultDto
        {
            Dataset = DataProvisioningMappings.ToDto(dataset),
            RevokedGrantCount = revokedGrantCount
        };
    }

    [HttpGet("organizations/{organizationId:guid}/grants")]
    public async Task<IReadOnlyList<DatasetGrantDto>> ListOrganizationGrants(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var grants = await GrantQuery(tracking: false)
            .Where(grant => grant.OrganizationId == organizationId)
            .OrderByDescending(grant => grant.GrantedAt)
            .ToListAsync(cancellationToken);
        return grants.Select(DataProvisioningMappings.ToDto).ToList();
    }

    [HttpPost("organizations/{organizationId:guid}/grants")]
    public async Task<ProvisioningResultDto> GrantDataset(
        Guid organizationId,
        [FromBody] GrantDatasetRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var idempotencyKey = RequireText(request.IdempotencyKey, "idempotencyKey", 255);
        var priorRun = await dbContext.ProvisioningRuns
            .AsNoTracking()
            .Include(run => run.OrganizationDatasetGrant)!
                .ThenInclude(grant => grant!.Organization)
            .Include(run => run.OrganizationDatasetGrant)!
                .ThenInclude(grant => grant!.CuratedDataset)
            .Include(run => run.OrganizationDatasetGrant)!
                .ThenInclude(grant => grant!.CuratedDatasetVersion)
            .FirstOrDefaultAsync(
                run => run.OrganizationId == organizationId
                    && run.IdempotencyKey == idempotencyKey,
                cancellationToken);
        if (priorRun != null)
        {
            return ToProvisioningResult(priorRun, priorRun.OrganizationDatasetGrant);
        }

        var organization = await dbContext.Organizations.FindAsync([organizationId], cancellationToken)
            ?? throw NotFound("organization_not_found", "The target organization was not found.");
        if (!organization.IsActive || !organization.IsExternalOrganization())
        {
            throw new DataProvisioningException(
                "organization_not_grantable",
                "Curated data can be granted only to an active Prospect, Customer, or Partner.");
        }

        var datasetVersion = await dbContext.CuratedDatasetVersions
            .Include(version => version.CuratedDataset)
            .FirstOrDefaultAsync(version => version.Id == request.DatasetVersionId, cancellationToken)
            ?? throw NotFound("dataset_version_not_found", "The curated dataset version was not found.");
        profile.EnsureExternalPublicationAllowed(datasetVersion.IsSynthetic);
        if (datasetVersion.Status != CuratedDatasetVersionStatus.Published
            || datasetVersion.CuratedDataset.EligibleVersionId != datasetVersion.Id
            || !datasetVersion.CuratedDataset.IsActive)
        {
            throw new DataProvisioningException(
                "dataset_version_not_grantable",
                "The selected exact version is not currently eligible for organization assignment.");
        }

        var activeGrant = await GrantQuery(tracking: true)
            .FirstOrDefaultAsync(
                grant => grant.OrganizationId == organizationId
                    && grant.CuratedDatasetId == datasetVersion.CuratedDatasetId
                    && grant.Status == OrganizationDatasetGrantStatus.Active,
                cancellationToken);
        if (activeGrant != null && activeGrant.CuratedDatasetVersionId != datasetVersion.Id)
        {
            throw new DataProvisioningException(
                "dataset_upgrade_requires_explicit_command",
                "This organization already has a different active version. Use the explicit upgrade workflow.",
                StatusCodes.Status409Conflict);
        }

        var now = DateTime.UtcNow;
        var grant = activeGrant ?? new OrganizationDatasetGrant(
            organization,
            datasetVersion.CuratedDataset,
            datasetVersion,
            actor.Id,
            now);
        if (activeGrant == null)
        {
            dbContext.OrganizationDatasetGrants.Add(grant);
            dbContext.DataProvisioningNotices.Add(CreateNotice(
                organization,
                DataProvisioningNoticeKind.Grant,
                $"Sample data assigned: {datasetVersion.CuratedDataset.Name}",
                $"Phaeno assigned {datasetVersion.CuratedDataset.Name} version {datasetVersion.VersionNumber} to your organization.",
                now,
                grantId: grant.Id));
        }

        var run = new ProvisioningRun(
            organization,
            datasetVersion,
            idempotencyKey,
            actor.Id,
            now);
        run.Succeed(grant.Id, now);
        dbContext.ProvisioningRuns.Add(run);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToProvisioningResult(run, grant);
    }

    [HttpPost("grants/{id:guid}/upgrade")]
    public async Task<ProvisioningResultDto> UpgradeGrant(
        Guid id,
        [FromBody] UpgradeDatasetGrantRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var idempotencyKey = RequireText(request.IdempotencyKey, "idempotencyKey", 255);
        var priorRun = await dbContext.ProvisioningRuns
            .AsNoTracking()
            .Include(run => run.OrganizationDatasetGrant)!
                .ThenInclude(grant => grant!.Organization)
            .Include(run => run.OrganizationDatasetGrant)!
                .ThenInclude(grant => grant!.CuratedDataset)
            .Include(run => run.OrganizationDatasetGrant)!
                .ThenInclude(grant => grant!.CuratedDatasetVersion)
            .FirstOrDefaultAsync(
                run => run.IdempotencyKey == idempotencyKey
                    && run.Kind == ProvisioningRunKind.Upgrade
                    && run.PreviousOrganizationDatasetGrantId == id,
                cancellationToken);
        if (priorRun != null)
        {
            return ToProvisioningResult(priorRun, priorRun.OrganizationDatasetGrant);
        }

        var currentGrant = await GrantQuery(tracking: true)
            .FirstOrDefaultAsync(grant => grant.Id == id, cancellationToken)
            ?? throw NotFound("dataset_grant_not_found", "The dataset grant was not found.");
        EnsureVersion(currentGrant.Version, request.Version);
        if (currentGrant.Status != OrganizationDatasetGrantStatus.Active)
        {
            throw new DataProvisioningException(
                "dataset_grant_not_active",
                "Only an active dataset grant can be upgraded.",
                StatusCodes.Status409Conflict);
        }

        var targetVersion = await dbContext.CuratedDatasetVersions
            .Include(version => version.CuratedDataset)
            .FirstOrDefaultAsync(version => version.Id == request.DatasetVersionId, cancellationToken)
            ?? throw NotFound("dataset_version_not_found", "The target curated dataset version was not found.");
        profile.EnsureExternalPublicationAllowed(targetVersion.IsSynthetic);
        if (targetVersion.CuratedDatasetId != currentGrant.CuratedDatasetId
            || targetVersion.VersionNumber <= currentGrant.CuratedDatasetVersion.VersionNumber
            || targetVersion.Status != CuratedDatasetVersionStatus.Published
            || targetVersion.CuratedDataset.EligibleVersionId != targetVersion.Id
            || !targetVersion.CuratedDataset.IsActive)
        {
            throw new DataProvisioningException(
                "dataset_version_not_upgradeable",
                "Select a newer published version that is currently eligible for this dataset.");
        }

        var now = DateTime.UtcNow;
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        currentGrant.Supersede(actor.Id, now);
        await dbContext.SaveChangesAsync(cancellationToken);

        var replacement = new OrganizationDatasetGrant(
            currentGrant.Organization,
            currentGrant.CuratedDataset,
            targetVersion,
            actor.Id,
            now);
        dbContext.OrganizationDatasetGrants.Add(replacement);
        var run = new ProvisioningRun(
            currentGrant.Organization,
            targetVersion,
            idempotencyKey,
            actor.Id,
            now,
            ProvisioningRunKind.Upgrade,
            currentGrant.Id);
        run.Succeed(replacement.Id, now);
        dbContext.ProvisioningRuns.Add(run);
        dbContext.DataProvisioningNotices.Add(CreateNotice(
            currentGrant.Organization,
            DataProvisioningNoticeKind.Upgrade,
            $"Sample data upgraded: {currentGrant.CuratedDataset.Name}",
            $"Phaeno upgraded {currentGrant.CuratedDataset.Name} from version {currentGrant.CuratedDatasetVersion.VersionNumber} to version {targetVersion.VersionNumber}.",
            now,
            grantId: replacement.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToProvisioningResult(run, replacement);
    }

    [HttpPost("grants/{id:guid}/revoke")]
    public async Task<DatasetGrantDto> RevokeGrant(
        Guid id,
        [FromBody] RevokeDatasetGrantRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var grant = await GrantQuery(tracking: true)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw NotFound("dataset_grant_not_found", "The dataset grant was not found.");
        EnsureVersion(grant.Version, request.Version);
        if (grant.Status != OrganizationDatasetGrantStatus.Active)
        {
            throw new DataProvisioningException(
                "dataset_grant_not_active",
                "Only an active dataset grant can be revoked.");
        }

        grant.Revoke(
            RequireText(request.Reason, "reason", 2000),
            actor.Id,
            DateTime.UtcNow);
        dbContext.DataProvisioningNotices.Add(CreateNotice(
            grant.Organization,
            DataProvisioningNoticeKind.Revocation,
            $"Access revoked: {grant.CuratedDataset.Name}",
            $"Phaeno revoked organization access to {grant.CuratedDataset.Name}. Previously downloaded copies cannot be recalled. Reason: {request.Reason.Trim()}",
            DateTime.UtcNow,
            grantId: grant.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(grant);
    }

    [HttpGet("provisioning-runs")]
    public async Task<IReadOnlyList<ProvisioningRunDto>> ListProvisioningRuns(
        [FromQuery] Guid? organizationId,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var query = dbContext.ProvisioningRuns.AsNoTracking();
        if (organizationId.HasValue)
        {
            query = query.Where(run => run.OrganizationId == organizationId.Value);
        }

        var runs = await query
            .OrderByDescending(run => run.RequestedAt)
            .Take(500)
            .ToListAsync(cancellationToken);
        return runs.Select(DataProvisioningMappings.ToDto).ToList();
    }

    [HttpGet("activity")]
    public async Task<IReadOnlyList<DataProvisioningNoticeDto>> ListActivity(
        [FromQuery] Guid? organizationId,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var query = dbContext.DataProvisioningNotices.AsNoTracking();
        if (organizationId.HasValue)
        {
            query = query.Where(notice => notice.OrganizationId == organizationId.Value);
        }

        var notices = await query
            .OrderByDescending(notice => notice.CreatedAt)
            .Take(500)
            .ToListAsync(cancellationToken);
        return notices.Select(DataProvisioningMappings.ToDto).ToList();
    }

    private Task<User> RequirePlatformAdminAsync(
        CancellationToken cancellationToken)
    {
        return DataProvisioningAuthorization.RequirePlatformAdminAsync(
            HttpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
    }

    private async Task<SourceSample> ReadSourceAsync(
        Guid id,
        bool tracking,
        CancellationToken cancellationToken)
    {
        var query = dbContext.SourceSamples.Include(source => source.Files).AsQueryable();
        if (!tracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(source => source.Id == id, cancellationToken)
            ?? throw NotFound("source_sample_not_found", "The source sample was not found.");
    }

    private IQueryable<CuratedDataset> DatasetQuery(bool tracking)
    {
        var query = dbContext.CuratedDatasets
            .Include(dataset => dataset.Versions)
            .ThenInclude(version => version.Files)
            .ThenInclude(file => file.ManagedFile)
            .AsQueryable();
        return tracking ? query : query.AsNoTracking();
    }

    private IQueryable<OrganizationDatasetGrant> GrantQuery(bool tracking)
    {
        var query = dbContext.OrganizationDatasetGrants
            .Include(grant => grant.Organization)
            .Include(grant => grant.CuratedDataset)
            .Include(grant => grant.CuratedDatasetVersion)
            .AsQueryable();
        return tracking ? query : query.AsNoTracking();
    }

    private static IReadOnlyList<string> ValidateReadiness(SourceSample source)
    {
        var errors = new List<string>();
        AddMissing(errors, source.Label, "Label");
        AddMissing(errors, source.Description, "Description");
        AddMissing(errors, source.BiologicalContext, "Biological context");
        AddMissing(errors, source.AssayContext, "Assay context");
        AddMissing(errors, source.AnalysisSummary, "Analysis summary");
        AddMissing(errors, source.QcStatus, "QC status");
        AddMissing(errors, source.Provenance, "Provenance");
        AddMissing(errors, source.OwnershipBasis, "Ownership basis");
        AddMissing(errors, source.DeidentificationMethod, "De-identification method");
        if (!source.OwnershipConfirmedByUserId.HasValue || !source.OwnershipConfirmedAt.HasValue)
        {
            errors.Add("Ownership confirmation is required.");
        }
        if (!source.DeidentificationConfirmedByUserId.HasValue
            || !source.DeidentificationConfirmedAt.HasValue)
        {
            errors.Add("De-identification confirmation is required.");
        }
        if (source.Files.Count == 0)
        {
            errors.Add("At least one approved managed file is required.");
        }
        if (source.Files.Any(file => file.ScanStatus != ManagedFileScanStatus.Clean))
        {
            errors.Add("Every managed file must have a clean scan result.");
        }
        if (source.Files.Any(file => file.Sha256.Length != 64))
        {
            errors.Add("Every managed file must have a valid SHA-256 checksum.");
        }
        return errors;
    }

    private static void AddMissing(List<string> errors, string? value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add($"{label} is required.");
        }
    }

    private static string RequireText(string? value, string fieldName, int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DataProvisioningException(
                "validation_error",
                $"{fieldName} is required.");
        }

        var trimmed = value.Trim();
        if (trimmed.Length > maximumLength)
        {
            throw new DataProvisioningException(
                "validation_error",
                $"{fieldName} must be {maximumLength} characters or fewer.");
        }

        return trimmed;
    }

    private static string? OptionalText(string? value, string fieldName, int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return RequireText(value, fieldName, maximumLength);
    }

    private static void EnsureVersion(long currentVersion, long requestedVersion)
    {
        if (currentVersion != requestedVersion)
        {
            throw new DbUpdateConcurrencyException();
        }
    }

    private static void EnsureSourceDraft(SourceSample source)
    {
        if (source.Status != SourceSampleStatus.Draft)
        {
            throw new DataProvisioningException(
                "source_revision_immutable",
                "A ready or archived source revision is immutable.",
                StatusCodes.Status409Conflict);
        }
    }

    private static DataProvisioningException NotFound(string code, string message)
    {
        return new DataProvisioningException(code, message, StatusCodes.Status404NotFound);
    }

    private static DataProvisioningNotice CreateNotice(
        Organization organization,
        DataProvisioningNoticeKind kind,
        string subject,
        string body,
        DateTime createdAt,
        Guid? incidentId = null,
        Guid? grantId = null)
    {
        return new DataProvisioningNotice(
            organization,
            kind,
            subject,
            body,
            createdAt,
            incidentId,
            grantId);
    }

    private static ProvisioningResultDto ToProvisioningResult(
        ProvisioningRun run,
        OrganizationDatasetGrant? grant)
    {
        return new ProvisioningResultDto
        {
            ProvisioningRunId = run.Id,
            Status = run.Status,
            IdempotencyKey = run.IdempotencyKey,
            Grant = grant == null ? null : DataProvisioningMappings.ToDto(grant),
            FailureCode = run.FailureCode,
            FailureMessage = run.FailureMessage
        };
    }

    private static ProvisioningResultDto FailedProvisioningResult(
        string idempotencyKey,
        string failureCode,
        string failureMessage)
    {
        return new ProvisioningResultDto
        {
            ProvisioningRunId = Guid.Empty,
            Status = ProvisioningRunStatus.Failed,
            IdempotencyKey = idempotencyKey,
            Grant = null,
            FailureCode = failureCode,
            FailureMessage = failureMessage
        };
    }
}
