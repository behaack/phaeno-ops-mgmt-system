namespace PhaenoPortal.App.Features.DataProvisioning.Controllers;

using System.IO.Compression;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.DataProvisioning.Domain;
using PhaenoPortal.App.Features.DataProvisioning.DTOs;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/data-provisioning/governance")]
public sealed class DataGovernanceAdminController(
    AppDbContext dbContext,
    IExternalIdentityContext externalIdentityContext,
    IManagedFileStorage fileStorage) : ControllerBase
{
    [HttpGet("incidents")]
    public async Task<IReadOnlyList<DataGovernanceIncidentDto>> ListIncidents(
        [FromQuery] DataGovernanceIncidentStatus? status,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var query = IncidentQuery(tracking: false);
        if (status.HasValue)
        {
            query = query.Where(incident => incident.Status == status.Value);
        }

        var incidents = await query
            .OrderByDescending(incident => incident.CreatedAt)
            .Take(500)
            .ToListAsync(cancellationToken);
        return incidents.Select(DataProvisioningMappings.ToDto).ToList();
    }

    [HttpGet("incidents/{id:guid}")]
    public async Task<DataGovernanceIncidentDto> GetIncident(
        Guid id,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var incident = await ReadIncidentAsync(id, tracking: false, cancellationToken);
        return DataProvisioningMappings.ToDto(incident);
    }

    [HttpPost("source-samples/{sourceSampleId:guid}/quarantine")]
    public async Task<ActionResult<DataGovernanceIncidentDto>> QuarantineSource(
        Guid sourceSampleId,
        [FromBody] QuarantineSourceRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var now = DateTime.UtcNow;
        if (request.AttestationDueAt <= now)
        {
            throw Validation("attestationDueAt must be in the future.");
        }

        var source = await dbContext.SourceSamples
            .FirstOrDefaultAsync(item => item.Id == sourceSampleId, cancellationToken)
            ?? throw NotFound("source_sample_not_found", "The source sample was not found.");
        if (await dbContext.DataGovernanceIncidents.AnyAsync(
            incident => incident.SourceSampleId == sourceSampleId
                && incident.Status == DataGovernanceIncidentStatus.Open,
            cancellationToken))
        {
            throw new DataProvisioningException(
                "governance_incident_already_open",
                "This source sample already has an open governance incident.",
                StatusCodes.Status409Conflict);
        }

        var versions = await dbContext.CuratedDatasetVersions
            .Include(version => version.CuratedDataset)
            .Where(version => version.SourceSampleId == sourceSampleId
                && (version.Status == CuratedDatasetVersionStatus.Published
                    || version.Status == CuratedDatasetVersionStatus.Retired))
            .ToListAsync(cancellationToken);
        if (versions.Count == 0)
        {
            throw new DataProvisioningException(
                "governance_no_published_versions",
                "No published or retired curated versions use this source sample.",
                StatusCodes.Status409Conflict);
        }

        var versionIds = versions.Select(version => version.Id).ToHashSet();
        var activeGrants = await dbContext.OrganizationDatasetGrants
            .Include(grant => grant.Organization)
            .Include(grant => grant.CuratedDataset)
            .Include(grant => grant.CuratedDatasetVersion)
            .Where(grant => versionIds.Contains(grant.CuratedDatasetVersionId)
                && grant.Status == OrganizationDatasetGrantStatus.Active)
            .ToListAsync(cancellationToken);

        var incident = new DataGovernanceIncident(
            source,
            request.Category,
            RequireText(request.Reason, "reason", 2000),
            RequireText(request.ExternalGuidance, "externalGuidance", 4000),
            RequireText(request.InternalNotes, "internalNotes", 4000),
            request.AttestationDueAt);
        dbContext.DataGovernanceIncidents.Add(incident);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        foreach (var version in versions)
        {
            var priorStatus = version.Quarantine();
            incident.AffectedVersions.Add(new DataGovernanceAffectedVersion(
                incident.Id,
                version,
                priorStatus));
            if (version.CuratedDataset.EligibleVersionId == version.Id)
            {
                version.CuratedDataset.RemoveEligibility();
            }
        }

        foreach (var grantGroup in activeGrants.GroupBy(grant => grant.OrganizationId))
        {
            var organization = grantGroup.First().Organization;
            var affected = new DataGovernanceAffectedOrganization(
                incident.Id,
                organization,
                grantGroup.Count());
            incident.AffectedOrganizations.Add(affected);
            dbContext.DataProvisioningNotices.Add(CreateNotice(
                organization,
                DataProvisioningNoticeKind.Quarantine,
                "Curated data access temporarily paused",
                $"Phaeno temporarily paused access to {grantGroup.Count()} assigned curated data version(s) while it investigates a data-governance concern. {incident.ExternalGuidance}",
                now,
                incident.Id));
        }

        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(DataGovernanceIncident),
            incident.Id,
            "DataGovernanceQuarantineStarted",
            organizationId: null,
            actor.Id,
            new
            {
                sourceSampleId,
                request.Category,
                affectedVersionCount = versions.Count,
                affectedOrganizationCount = incident.AffectedOrganizations.Count
            });
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var saved = await ReadIncidentAsync(incident.Id, tracking: false, cancellationToken);
        return CreatedAtAction(nameof(GetIncident), new { id = incident.Id }, DataProvisioningMappings.ToDto(saved));
    }

    [HttpPost("incidents/{id:guid}/clear")]
    public async Task<DataGovernanceIncidentDto> ClearIncident(
        Guid id,
        [FromBody] ClearGovernanceIncidentRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        if (!request.ImmutableContentConfirmedUnchanged)
        {
            throw Validation("ImmutableContentConfirmedUnchanged must be confirmed before access can resume.");
        }

        var incident = await ReadIncidentAsync(id, tracking: true, cancellationToken);
        EnsureVersion(incident.Version, request.Version);
        var resolution = RequireText(request.Resolution, "resolution", 4000);
        var now = DateTime.UtcNow;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        foreach (var affectedVersion in incident.AffectedVersions)
        {
            affectedVersion.CuratedDatasetVersion.ClearQuarantine(affectedVersion.PriorStatus);
        }

        incident.Clear(resolution, actor.Id, now);
        var affectedVersionIds = incident.AffectedVersions
            .Select(item => item.CuratedDatasetVersionId)
            .ToHashSet();
        var activeOrganizationIds = await dbContext.OrganizationDatasetGrants
            .Where(grant => affectedVersionIds.Contains(grant.CuratedDatasetVersionId)
                && grant.Status == OrganizationDatasetGrantStatus.Active)
            .Select(grant => grant.OrganizationId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var activeOrganizationSet = activeOrganizationIds.ToHashSet();

        foreach (var affectedOrganization in incident.AffectedOrganizations)
        {
            if (affectedOrganization.Organization.IsActive
                && activeOrganizationSet.Contains(affectedOrganization.OrganizationId))
            {
                affectedOrganization.MarkResumed();
                dbContext.DataProvisioningNotices.Add(CreateNotice(
                    affectedOrganization.Organization,
                    DataProvisioningNoticeKind.QuarantineCleared,
                    "Curated data access restored",
                    "Phaeno completed its review, confirmed the immutable curated content was unchanged, and restored your organization's existing access.",
                    now,
                    incident.Id));
            }
            else
            {
                affectedOrganization.MarkInactive();
            }
        }

        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(DataGovernanceIncident),
            incident.Id,
            "DataGovernanceQuarantineCleared",
            organizationId: null,
            actor.Id,
            new { resolution, immutableContentConfirmedUnchanged = true });
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(incident);
    }

    [HttpPost("incidents/{id:guid}/withdraw")]
    public async Task<DataGovernanceIncidentDto> WithdrawIncident(
        Guid id,
        [FromBody] WithdrawGovernanceIncidentRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var incident = await ReadIncidentAsync(id, tracking: true, cancellationToken);
        EnsureVersion(incident.Version, request.Version);
        var resolution = RequireText(request.Resolution, "resolution", 4000);
        var now = DateTime.UtcNow;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        foreach (var affectedVersion in incident.AffectedVersions)
        {
            affectedVersion.CuratedDatasetVersion.Withdraw();
        }

        incident.ConfirmUnsafe(resolution, actor.Id, now);
        foreach (var affectedOrganization in incident.AffectedOrganizations)
        {
            affectedOrganization.RequireAttestation();
            dbContext.DataProvisioningNotices.Add(CreateNotice(
                affectedOrganization.Organization,
                DataProvisioningNoticeKind.Withdrawal,
                "Action required: curated data withdrawn",
                $"Phaeno permanently withdrew affected curated data after confirming it was unsafe to share. Delete or otherwise remediate previously downloaded copies and submit an attestation by {incident.AttestationDueAt:yyyy-MM-dd}. {incident.ExternalGuidance}",
                now,
                incident.Id));
        }

        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(DataGovernanceIncident),
            incident.Id,
            "DataGovernanceContentWithdrawn",
            organizationId: null,
            actor.Id,
            new { resolution, attestationDueAt = incident.AttestationDueAt });
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(incident);
    }

    [HttpPost("incidents/{id:guid}/follow-ups")]
    public async Task<DataGovernanceIncidentDto> AddFollowUp(
        Guid id,
        [FromBody] GovernanceFollowUpRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var incident = await ReadIncidentAsync(id, tracking: true, cancellationToken);
        incident.FollowUps.Add(new DataGovernanceFollowUp(
            incident.Id,
            organizationId: null,
            "InternalNote",
            RequireText(request.Notes, "notes", 4000),
            actor.Id,
            DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(incident);
    }

    [HttpPost("incidents/{id:guid}/organizations/{organizationId:guid}/remind")]
    public async Task<DataGovernanceIncidentDto> RemindOrganization(
        Guid id,
        Guid organizationId,
        [FromBody] GovernanceFollowUpRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var incident = await ReadIncidentAsync(id, tracking: true, cancellationToken);
        var affected = incident.AffectedOrganizations
            .FirstOrDefault(item => item.OrganizationId == organizationId)
            ?? throw NotFound("affected_organization_not_found", "The organization is not affected by this incident.");
        var notes = RequireText(request.Notes, "notes", 4000);
        var now = DateTime.UtcNow;
        affected.RecordReminder(now);
        incident.FollowUps.Add(new DataGovernanceFollowUp(
            incident.Id,
            organizationId,
            "AttestationReminder",
            notes,
            actor.Id,
            now));
        dbContext.DataProvisioningNotices.Add(CreateNotice(
            affected.Organization,
            DataProvisioningNoticeKind.AttestationReminder,
            "Reminder: curated data attestation required",
            $"Your organization's remediation attestation remains due by {incident.AttestationDueAt:yyyy-MM-dd}. {incident.ExternalGuidance}",
            now,
            incident.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(incident);
    }

    [HttpPost("incidents/{id:guid}/organizations/{organizationId:guid}/attestation")]
    public async Task<DataGovernanceIncidentDto> RecordAttestation(
        Guid id,
        Guid organizationId,
        [FromBody] GovernanceAttestationRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var incident = await ReadIncidentAsync(id, tracking: true, cancellationToken);
        var affected = incident.AffectedOrganizations
            .FirstOrDefault(item => item.OrganizationId == organizationId)
            ?? throw NotFound("affected_organization_not_found", "The organization is not affected by this incident.");
        EnsureVersion(affected.Version, request.Version);
        var contact = RequireText(request.OrganizationContact, "organizationContact", 500);
        var evidence = RequireText(request.EvidenceSource, "evidenceSource", 1000);
        var notes = RequireText(request.Notes, "notes", 4000);
        var now = DateTime.UtcNow;
        affected.Attest(actor.Id, AttestationSource.RecordedByPhaeno, contact, evidence, notes, now);
        incident.FollowUps.Add(new DataGovernanceFollowUp(
            incident.Id,
            organizationId,
            "AttestationRecorded",
            notes,
            actor.Id,
            now));
        await dbContext.SaveChangesAsync(cancellationToken);
        return DataProvisioningMappings.ToDto(incident);
    }

    [HttpGet("incidents/{incidentId:guid}/versions/{versionId:guid}/files/{fileId:guid}")]
    [SkipApiEnvelope]
    public async Task<IActionResult> DownloadInvestigationFile(
        Guid incidentId,
        Guid versionId,
        Guid fileId,
        [FromHeader(Name = "X-Investigation-Reason")] string? investigationReason,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var reason = RequireText(investigationReason, "X-Investigation-Reason", 2000);
        var incident = await ReadInvestigableIncidentAsync(incidentId, versionId, cancellationToken);
        var versionFile = await dbContext.CuratedDatasetVersionFiles
            .AsNoTracking()
            .Include(file => file.ManagedFile)
            .FirstOrDefaultAsync(
                file => file.Id == fileId && file.CuratedDatasetVersionId == versionId,
                cancellationToken)
            ?? throw NotFound("dataset_file_not_found", "The investigation file was not found.");
        var stream = await fileStorage.OpenReadAsync(versionFile.ManagedFile.StorageKey, cancellationToken);
        try
        {
            AddInvestigationAudit(incident, versionId, actor, reason, "File", versionFile.ManagedFileId);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await stream.DisposeAsync();
            throw;
        }

        return File(stream, versionFile.ContentType, versionFile.FileName, enableRangeProcessing: true);
    }

    [HttpGet("incidents/{incidentId:guid}/versions/{versionId:guid}/archive")]
    [SkipApiEnvelope]
    public async Task<IActionResult> DownloadInvestigationArchive(
        Guid incidentId,
        Guid versionId,
        [FromHeader(Name = "X-Investigation-Reason")] string? investigationReason,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var reason = RequireText(investigationReason, "X-Investigation-Reason", 2000);
        var incident = await ReadInvestigableIncidentAsync(incidentId, versionId, cancellationToken);
        var version = await dbContext.CuratedDatasetVersions
            .AsNoTracking()
            .Include(item => item.CuratedDataset)
            .Include(item => item.Files)
                .ThenInclude(file => file.ManagedFile)
            .FirstAsync(item => item.Id == versionId, cancellationToken);

        var archiveStream = new MemoryStream();
        try
        {
            using (var archive = new ZipArchive(archiveStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var versionFile in version.Files.OrderBy(file => file.FileName))
                {
                    var entryName = MakeUniqueArchiveName(versionFile, usedNames);
                    var entry = archive.CreateEntry(entryName, CompressionLevel.Fastest);
                    await using var source = await fileStorage.OpenReadAsync(
                        versionFile.ManagedFile.StorageKey,
                        cancellationToken);
                    await using var destination = entry.Open();
                    await source.CopyToAsync(destination, cancellationToken);
                }
            }

            archiveStream.Position = 0;
            AddInvestigationAudit(incident, versionId, actor, reason, "Archive", managedFileId: null);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await archiveStream.DisposeAsync();
            throw;
        }

        var safeName = string.Concat(version.CuratedDataset.Name.Select(character =>
            Path.GetInvalidFileNameChars().Contains(character) ? '-' : character));
        return File(
            archiveStream,
            "application/zip",
            $"investigation-{safeName}-v{version.VersionNumber}.zip");
    }

    private Task<User> RequirePlatformAdminAsync(CancellationToken cancellationToken)
    {
        return DataProvisioningAuthorization.RequirePlatformAdminAsync(
            HttpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
    }

    private IQueryable<DataGovernanceIncident> IncidentQuery(bool tracking)
    {
        var query = dbContext.DataGovernanceIncidents
            .Include(incident => incident.SourceSample)
            .Include(incident => incident.AffectedVersions)
                .ThenInclude(affected => affected.CuratedDatasetVersion)
                    .ThenInclude(version => version.CuratedDataset)
            .Include(incident => incident.AffectedOrganizations)
                .ThenInclude(affected => affected.Organization)
            .Include(incident => incident.FollowUps)
            .AsQueryable();
        return tracking ? query : query.AsNoTracking();
    }

    private async Task<DataGovernanceIncident> ReadIncidentAsync(
        Guid id,
        bool tracking,
        CancellationToken cancellationToken)
    {
        return await IncidentQuery(tracking)
            .FirstOrDefaultAsync(incident => incident.Id == id, cancellationToken)
            ?? throw NotFound("governance_incident_not_found", "The governance incident was not found.");
    }

    private async Task<DataGovernanceIncident> ReadInvestigableIncidentAsync(
        Guid incidentId,
        Guid versionId,
        CancellationToken cancellationToken)
    {
        var incident = await IncidentQuery(tracking: false)
            .FirstOrDefaultAsync(
                item => item.Id == incidentId
                    && item.Status != DataGovernanceIncidentStatus.Cleared
                    && item.AffectedVersions.Any(affected => affected.CuratedDatasetVersionId == versionId),
                cancellationToken)
            ?? throw NotFound(
                "governance_investigation_content_not_found",
                "The requested version is not available for this governance investigation.");
        return incident;
    }

    private void AddInvestigationAudit(
        DataGovernanceIncident incident,
        Guid versionId,
        User actor,
        string reason,
        string downloadKind,
        Guid? managedFileId)
    {
        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(DataGovernanceIncident),
            incident.Id,
            "GovernanceInvestigationContentDownloaded",
            organizationId: null,
            actor.Id,
            new { versionId, downloadKind, managedFileId, reason });
    }

    private static DataProvisioningNotice CreateNotice(
        Organization organization,
        DataProvisioningNoticeKind kind,
        string subject,
        string body,
        DateTime createdAt,
        Guid incidentId)
    {
        return new DataProvisioningNotice(
            organization,
            kind,
            subject,
            body,
            createdAt,
            incidentId);
    }

    private static string MakeUniqueArchiveName(
        CuratedDatasetVersionFile versionFile,
        HashSet<string> usedNames)
    {
        var fileName = Path.GetFileName(versionFile.FileName);
        if (usedNames.Add(fileName))
        {
            return fileName;
        }

        var extension = Path.GetExtension(fileName);
        var baseName = Path.GetFileNameWithoutExtension(fileName);
        var uniqueName = $"{baseName}-{versionFile.Id:N}{extension}";
        usedNames.Add(uniqueName);
        return uniqueName;
    }

    private static string RequireText(string? value, string fieldName, int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw Validation($"{fieldName} is required.");
        }

        var trimmed = value.Trim();
        if (trimmed.Length > maximumLength)
        {
            throw Validation($"{fieldName} must be {maximumLength} characters or fewer.");
        }

        return trimmed;
    }

    private static void EnsureVersion(long currentVersion, long requestedVersion)
    {
        if (currentVersion != requestedVersion)
        {
            throw new DbUpdateConcurrencyException();
        }
    }

    private static DataProvisioningException Validation(string message)
    {
        return new DataProvisioningException("validation_error", message);
    }

    private static DataProvisioningException NotFound(string code, string message)
    {
        return new DataProvisioningException(code, message, StatusCodes.Status404NotFound);
    }
}
