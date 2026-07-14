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
[Route("api/curated-data")]
public sealed class CuratedDataController(
    AppDbContext dbContext,
    IExternalIdentityContext externalIdentityContext,
    IManagedFileStorage fileStorage) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<TenantDatasetDto>> List(
        CancellationToken cancellationToken)
    {
        var (_, organization) = await RequireTenantAccessAsync(
            requireOrganizationAdmin: false,
            cancellationToken);
        var grants = await AccessibleGrantQuery(organization.Id)
            .OrderBy(grant => grant.CuratedDataset.Name)
            .ToListAsync(cancellationToken);
        return grants.Select(DataProvisioningMappings.ToTenantDto).ToList();
    }

    [HttpGet("{datasetId:guid}")]
    public async Task<TenantDatasetDto> Get(
        Guid datasetId,
        CancellationToken cancellationToken)
    {
        var (_, organization) = await RequireTenantAccessAsync(
            requireOrganizationAdmin: false,
            cancellationToken);
        var grant = await ReadAccessibleGrantAsync(
            organization.Id,
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
        var (actor, organization) = await RequireTenantAccessAsync(
            requireOrganizationAdmin: false,
            cancellationToken);
        var grant = await ReadAccessibleGrantAsync(
            organization.Id,
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
                actor,
                organization,
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
        var (actor, organization) = await RequireTenantAccessAsync(
            requireOrganizationAdmin: false,
            cancellationToken);
        var grant = await ReadAccessibleGrantAsync(
            organization.Id,
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
                actor,
                organization,
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
        var (_, organization) = await RequireTenantAccessAsync(
            requireOrganizationAdmin: true,
            cancellationToken);
        var downloads = await (
            from download in dbContext.DatasetDownloadAudits.AsNoTracking()
            join user in dbContext.Users.AsNoTracking() on download.UserId equals user.Id
            where download.OrganizationId == organization.Id
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

    private Task<(User Actor, Organization Organization)> RequireTenantAccessAsync(
        bool requireOrganizationAdmin,
        CancellationToken cancellationToken)
    {
        return DataProvisioningAuthorization.RequireTenantAccessAsync(
            HttpContext,
            dbContext,
            externalIdentityContext,
            requireOrganizationAdmin,
            cancellationToken);
    }

    private IQueryable<OrganizationDatasetGrant> AccessibleGrantQuery(Guid organizationId)
    {
        return dbContext.OrganizationDatasetGrants
            .AsNoTracking()
            .Include(grant => grant.CuratedDataset)
            .Include(grant => grant.CuratedDatasetVersion)
            .ThenInclude(version => version.Files)
            .ThenInclude(file => file.ManagedFile)
            .Where(grant => grant.OrganizationId == organizationId
                && grant.Status == OrganizationDatasetGrantStatus.Active
                && grant.CuratedDatasetVersion.Status == CuratedDatasetVersionStatus.Published);
    }

    private async Task<OrganizationDatasetGrant> ReadAccessibleGrantAsync(
        Guid organizationId,
        Guid datasetId,
        CancellationToken cancellationToken)
    {
        return await AccessibleGrantQuery(organizationId)
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

    private static DataProvisioningException NotFound(string code, string message)
    {
        return new DataProvisioningException(code, message, StatusCodes.Status404NotFound);
    }
}
