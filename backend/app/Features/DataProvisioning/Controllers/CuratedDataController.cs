namespace PhaenoPortal.App.Features.DataProvisioning.Controllers;

using System.IO.Compression;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.DataProvisioning.DTOs;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/curated-data")]
public sealed class CuratedDataController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext,
    IManagedFileStorage fileStorage) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<TenantDatasetDto>> List(
        CancellationToken cancellationToken)
    {
        var tenant = await RequireTenantAccessAsync(
            requireScopeAdmin: false,
            cancellationToken);
        var grants = await AccessibleGrantQuery(tenant.Organization.Id, tenant.Department.Id)
            .OrderBy(grant => grant.CuratedDataset.Name)
            .ToListAsync(cancellationToken);
        return grants.Select(DataProvisioningMappings.ToTenantDto).ToList();
    }

    [HttpGet("{datasetId:guid}")]
    public async Task<TenantDatasetDto> Get(
        Guid datasetId,
        CancellationToken cancellationToken)
    {
        var tenant = await RequireTenantAccessAsync(
            requireScopeAdmin: false,
            cancellationToken);
        var grant = await ReadAccessibleGrantAsync(
            tenant.Organization.Id,
            tenant.Department.Id,
            datasetId,
            cancellationToken);
        return DataProvisioningMappings.ToTenantDto(grant);
    }

    [HttpGet("{datasetId:guid}/files/{fileId:guid}")]
    [SkipApiEnvelope]
    public async Task<IActionResult> DownloadFile(
        Guid datasetId,
        Guid fileId,
        CancellationToken cancellationToken)
    {
        var tenant = await RequireTenantAccessAsync(
            requireScopeAdmin: false,
            cancellationToken);
        var grant = await ReadAccessibleGrantAsync(
            tenant.Organization.Id,
            tenant.Department.Id,
            datasetId,
            cancellationToken);
        var versionFile = grant.CuratedDatasetVersion.Files.FirstOrDefault(file => file.Id == fileId)
            ?? throw NotFound("dataset_file_not_found", "The requested dataset file was not found.");

        var stream = await fileStorage.OpenReadAsync(
            versionFile.ManagedFile.StorageKey,
            cancellationToken);
        try
        {
            AddDownloadAudit(
                tenant.Actor,
                tenant.Organization,
                grant,
                DatasetDownloadKind.File,
                versionFile.ManagedFileId);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await stream.DisposeAsync();
            throw;
        }

        return File(
            stream,
            versionFile.ContentType,
            versionFile.FileName,
            enableRangeProcessing: true);
    }

    [HttpGet("{datasetId:guid}/archive")]
    [SkipApiEnvelope]
    public async Task<IActionResult> DownloadArchive(
        Guid datasetId,
        CancellationToken cancellationToken)
    {
        var tenant = await RequireTenantAccessAsync(
            requireScopeAdmin: false,
            cancellationToken);
        var grant = await ReadAccessibleGrantAsync(
            tenant.Organization.Id,
            tenant.Department.Id,
            datasetId,
            cancellationToken);

        var archiveStream = new MemoryStream();
        try
        {
            using (var archive = new ZipArchive(archiveStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var versionFile in grant.CuratedDatasetVersion.Files
                    .OrderBy(file => file.FileName, StringComparer.OrdinalIgnoreCase))
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
            AddDownloadAudit(
                tenant.Actor,
                tenant.Organization,
                grant,
                DatasetDownloadKind.Archive,
                managedFileId: null);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await archiveStream.DisposeAsync();
            throw;
        }

        var safeName = string.Concat(
            grant.CuratedDataset.Name.Select(character =>
                Path.GetInvalidFileNameChars().Contains(character) ? '-' : character));
        return File(
            archiveStream,
            "application/zip",
            $"{safeName}-v{grant.CuratedDatasetVersion.VersionNumber}.zip");
    }

    [HttpGet("downloads")]
    public async Task<IReadOnlyList<DatasetDownloadAuditDto>> ListDownloadHistory(
        CancellationToken cancellationToken)
    {
        var tenant = await RequireTenantAccessAsync(
            requireScopeAdmin: true,
            cancellationToken);
        var downloads = await (
            from download in dbContext.DatasetDownloadAudits.AsNoTracking()
            join user in dbContext.Users.AsNoTracking() on download.UserId equals user.Id
            join grant in dbContext.OrganizationDatasetGrants.AsNoTracking()
                on download.OrganizationDatasetGrantId equals grant.Id
            where download.OrganizationId == tenant.Organization.Id
                && (grant.DepartmentId == null || grant.DepartmentId == tenant.Department.Id)
            orderby download.DownloadedAt descending
            select new DatasetDownloadAuditDto
            {
                Id = download.Id,
                UserId = download.UserId,
                UserEmail = user.Email,
                DatasetVersionId = download.CuratedDatasetVersionId,
                Kind = download.Kind,
                ManagedFileId = download.ManagedFileId,
                DownloadedAt = download.DownloadedAt
            })
            .Take(500)
            .ToListAsync(cancellationToken);
        return downloads;
    }

    [HttpGet("activity")]
    public async Task<IReadOnlyList<DataProvisioningNoticeDto>> ListActivity(
        CancellationToken cancellationToken)
    {
        var tenant = await RequireTenantAccessAsync(
            requireScopeAdmin: false,
            cancellationToken);
        var notices = await dbContext.DataProvisioningNotices
            .AsNoTracking()
            .Where(notice => notice.OrganizationId == tenant.Organization.Id
                && (notice.OrganizationDatasetGrantId == null
                    || dbContext.OrganizationDatasetGrants.Any(grant =>
                        grant.Id == notice.OrganizationDatasetGrantId
                        && (grant.DepartmentId == null || grant.DepartmentId == tenant.Department.Id))))
            .OrderByDescending(notice => notice.CreatedAt)
            .Take(500)
            .ToListAsync(cancellationToken);
        return notices.Select(DataProvisioningMappings.ToDto).ToList();
    }

    [HttpGet("governance-incidents")]
    public async Task<IReadOnlyList<TenantGovernanceIncidentDto>> ListGovernanceIncidents(
        CancellationToken cancellationToken)
    {
        var tenant = await RequireTenantAccessAsync(
            requireScopeAdmin: false,
            cancellationToken);
        var affectedOrganizations = await dbContext.DataGovernanceAffectedOrganizations
            .AsNoTracking()
            .Include(affected => affected.Incident)
            .Where(affected => affected.OrganizationId == tenant.Organization.Id)
            .OrderByDescending(affected => affected.Incident.CreatedAt)
            .Take(500)
            .ToListAsync(cancellationToken);
        return affectedOrganizations.Select(ToTenantIncidentDto).ToList();
    }

    [HttpPost("governance-incidents/{incidentId:guid}/attestation")]
    public async Task<TenantGovernanceIncidentDto> SubmitGovernanceAttestation(
        Guid incidentId,
        [FromBody] TenantGovernanceAttestationRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await RequireTenantAccessAsync(
            requireScopeAdmin: true,
            cancellationToken);
        if (!tenant.Membership.IsOrganizationAdmin)
        {
            throw new DataProvisioningException(
                "tenant_access_forbidden",
                "Organization administrator access is required to submit a governance attestation.",
                StatusCodes.Status403Forbidden);
        }
        var affected = await dbContext.DataGovernanceAffectedOrganizations
            .Include(item => item.Incident)
            .FirstOrDefaultAsync(
                item => item.IncidentId == incidentId
                    && item.OrganizationId == tenant.Organization.Id,
                cancellationToken)
            ?? throw NotFound(
                "governance_incident_not_found",
                "The governance incident is not assigned to the selected organization.");
        if (affected.Version != request.Version)
        {
            throw new DbUpdateConcurrencyException();
        }

        var notes = RequireText(request.Notes, "notes", 4000);
        var now = DateTime.UtcNow;
        affected.Attest(
            tenant.Actor.Id,
            AttestationSource.SubmittedInPortal,
            tenant.Actor.Email,
            "Submitted in portal",
            notes,
            now);
        dbContext.DataGovernanceFollowUps.Add(new DataGovernanceFollowUp(
            affected.IncidentId,
            tenant.Organization.Id,
            "AttestationSubmittedInPortal",
            notes,
            tenant.Actor.Id,
            now));
        AccountAudit.Add(
            dbContext,
            HttpContext,
            nameof(DataGovernanceAffectedOrganization),
            affected.Id,
            "DataGovernanceAttestationSubmitted",
            tenant.Organization.Id,
            tenant.Actor.Id,
            new { affected.IncidentId });
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToTenantIncidentDto(affected);
    }

    private Task<DataProvisioningTenantContext> RequireTenantAccessAsync(
        bool requireScopeAdmin,
        CancellationToken cancellationToken)
    {
        return DataProvisioningAuthorization.RequireTenantAccessAsync(
            HttpContext,
            dbContext,
            externalIdentityContext,
            requireScopeAdmin,
            cancellationToken);
    }

    private IQueryable<OrganizationDatasetGrant> AccessibleGrantQuery(
        Guid organizationId,
        Guid departmentId)
    {
        return dbContext.OrganizationDatasetGrants
            .AsNoTracking()
            .Include(grant => grant.CuratedDataset)
            .Include(grant => grant.CuratedDatasetVersion)
            .ThenInclude(version => version.Files)
            .ThenInclude(file => file.ManagedFile)
            .Where(grant => grant.OrganizationId == organizationId
                && (grant.DepartmentId == null || grant.DepartmentId == departmentId)
                && grant.Status == OrganizationDatasetGrantStatus.Active
                && (grant.CuratedDatasetVersion.Status == CuratedDatasetVersionStatus.Published
                    || grant.CuratedDatasetVersion.Status == CuratedDatasetVersionStatus.Retired));
    }

    private async Task<OrganizationDatasetGrant> ReadAccessibleGrantAsync(
        Guid organizationId,
        Guid departmentId,
        Guid datasetId,
        CancellationToken cancellationToken)
    {
        return await AccessibleGrantQuery(organizationId, departmentId)
            .FirstOrDefaultAsync(
                grant => grant.CuratedDatasetId == datasetId,
                cancellationToken)
            ?? throw NotFound(
                "curated_dataset_not_found",
                "The curated dataset is not available to the selected organization.");
    }

    private void AddDownloadAudit(
        User actor,
        Organization organization,
        OrganizationDatasetGrant grant,
        DatasetDownloadKind kind,
        Guid? managedFileId)
    {
        dbContext.DatasetDownloadAudits.Add(new DatasetDownloadAudit(
            organization.Id,
            grant.Id,
            grant.CuratedDatasetVersionId,
            actor.Id,
            kind,
            managedFileId,
            DateTime.UtcNow,
            HttpContext.TraceIdentifier,
            HttpContext.Connection.RemoteIpAddress?.ToString()));
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

    private static TenantGovernanceIncidentDto ToTenantIncidentDto(
        DataGovernanceAffectedOrganization affected)
    {
        return new TenantGovernanceIncidentDto
        {
            Id = affected.IncidentId,
            Category = affected.Incident.Category,
            Status = affected.Incident.Status,
            ExternalGuidance = affected.Incident.ExternalGuidance,
            AttestationDueAt = affected.Incident.AttestationDueAt,
            OrganizationStatus = affected.Status,
            ReminderCount = affected.ReminderCount,
            LastRemindedAt = affected.LastRemindedAt,
            AttestedAt = affected.AttestedAt,
            CreatedAt = affected.Incident.CreatedAt,
            Version = affected.Version
        };
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

    private static DataProvisioningException NotFound(string code, string message)
    {
        return new DataProvisioningException(code, message, StatusCodes.Status404NotFound);
    }
}
