namespace PhaenoPortal.App.Features.Crm.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/crm/companies")]
public sealed class CrmCompaniesController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet]
    public async Task<CrmCompanyListDto> ListCompanies(
        [FromQuery] string? search,
        [FromQuery] bool includeInactive = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        EnsurePagination(page, pageSize);

        var query = dbContext.CrmCompanies
            .AsNoTracking()
            .Include(value => value.Owner)
            .AsQueryable();
        if (!includeInactive)
        {
            query = query.Where(value => value.IsActive);
        }

        var normalizedSearch = search?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedSearch))
        {
            var searchPattern = $"%{EscapeLikePattern(normalizedSearch)}%";
            query = query.Where(value =>
                EF.Functions.ILike(value.Name, searchPattern, "\\")
                || (value.DomainName != null && EF.Functions.ILike(value.DomainName, searchPattern, "\\"))
                || (value.Industry != null && EF.Functions.ILike(value.Industry, searchPattern, "\\")));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var companies = await query
            .OrderBy(value => value.Name)
            .ThenBy(value => value.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new CrmCompanyListDto
        {
            Items = companies.Select(value => ToDto(value)).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    [HttpGet("{companyId:guid}")]
    public async Task<CrmCompanyDto> GetCompany(Guid companyId, CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        return ToDto(await RequireCompanyAsync(companyId, tracking: false, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<CrmCompanyDto>> CreateCompany(
        [FromBody] CreateCrmCompanyRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        await EnsureUniqueNameAsync(request.Name, null, cancellationToken);
        var company = Execute(() => new CrmCompany(
            request.Name,
            actor.Id,
            request.WebsiteUrl,
            request.DomainName,
            request.Phone,
            request.Industry,
            request.Description,
            request.AddressLine1,
            request.AddressLine2,
            request.City,
            request.Region,
            request.PostalCode,
            request.CountryCode,
            request.EmployeeCount,
            request.LifecycleState,
            request.Source,
            request.Tags));

        dbContext.CrmCompanies.Add(company);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/companies/{company.Id}", ToDto(company, actor));
    }

    [HttpPut("{companyId:guid}")]
    public async Task<CrmCompanyDto> UpdateCompany(
        Guid companyId,
        [FromBody] UpdateCrmCompanyRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var company = await RequireCompanyAsync(companyId, tracking: true, cancellationToken);
        EnsureVersion(company.Version, request.Version);
        await EnsureUniqueNameAsync(request.Name, companyId, cancellationToken);
        Execute(() => company.UpdateProfile(
            request.Name,
            request.WebsiteUrl,
            request.DomainName,
            request.Phone,
            request.Industry,
            request.Description,
            request.AddressLine1,
            request.AddressLine2,
            request.City,
            request.Region,
            request.PostalCode,
            request.CountryCode,
            request.EmployeeCount,
            request.LifecycleState,
            request.Source,
            request.Tags));

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(company);
    }

    [HttpPost("{companyId:guid}/deactivate")]
    public async Task<CrmCompanyDto> DeactivateCompany(
        Guid companyId,
        [FromBody] ChangeCrmCompanyActiveRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var company = await RequireCompanyAsync(companyId, tracking: true, cancellationToken);
        EnsureVersion(company.Version, request.Version);
        Execute(company.Deactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(company);
    }

    [HttpPost("{companyId:guid}/reactivate")]
    public async Task<CrmCompanyDto> ReactivateCompany(
        Guid companyId,
        [FromBody] ChangeCrmCompanyActiveRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var company = await RequireCompanyAsync(companyId, tracking: true, cancellationToken);
        EnsureVersion(company.Version, request.Version);
        Execute(company.Reactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(company);
    }

    [HttpPost("{companyId:guid}/owner")]
    public async Task<CrmCompanyDto> AssignOwner(
        Guid companyId,
        [FromBody] AssignCrmOwnerRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var company = await RequireCompanyAsync(companyId, tracking: true, cancellationToken);
        EnsureVersion(company.Version, request.Version);
        var owner = await dbContext.Users.FirstOrDefaultAsync(
            value => value.Id == request.OwnerUserId && value.IsActive && value.Memberships.Any(membership => membership.IsActive && membership.Organization!.Kind == OrganizationKind.Phaeno),
            cancellationToken)
            ?? throw NotFound("crm_owner_not_found", "The selected active Phaeno owner was not found.");
        Execute(() => company.AssignOwner(owner.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(company, owner);
    }

    [HttpPost("{companyId:guid}/merge")]
    public async Task<CrmCompanyDto> MergeCompany(
        Guid companyId,
        [FromBody] MergeCrmRecordRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var source = await RequireCompanyAsync(companyId, tracking: true, cancellationToken);
        EnsureVersion(source.Version, request.Version);
        var target = await RequireCompanyAsync(request.TargetId, tracking: true, cancellationToken);
        if (!target.IsActive || target.MergedIntoCompanyId.HasValue)
        {
            throw Conflict("crm_merge_target_invalid", "Select an active, unmerged target company.");
        }

        var sourceAssociations = await dbContext.CrmCompanyContacts
            .Where(value => value.CompanyId == source.Id)
            .ToListAsync(cancellationToken);
        var targetContactIds = await dbContext.CrmCompanyContacts
            .Where(value => value.CompanyId == target.Id)
            .Select(value => value.ContactId)
            .ToListAsync(cancellationToken);
        foreach (var association in sourceAssociations)
        {
            if (targetContactIds.Contains(association.ContactId))
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                Execute(() => association.End(today < association.EffectiveFrom ? association.EffectiveFrom : today));
            }
            else
            {
                association.ReassignCompany(target.Id);
            }
        }

        foreach (var opportunity in await dbContext.CrmOpportunities.Where(value => value.CompanyId == source.Id).ToListAsync(cancellationToken)) opportunity.ReassignCompany(target.Id);
        foreach (var lead in await dbContext.CrmLeads.Where(value => value.ConvertedCompanyId == source.Id).ToListAsync(cancellationToken)) lead.ReassignConvertedCompany(target.Id);
        foreach (var activity in await dbContext.CrmActivities.Where(value => value.CompanyId == source.Id).ToListAsync(cancellationToken)) activity.ReassignCompany(target.Id);
        foreach (var task in await dbContext.CrmTasks.Where(value => value.CompanyId == source.Id).ToListAsync(cancellationToken)) task.ReassignCompany(target.Id);
        foreach (var handoff in await dbContext.CrmHandoffs.Where(value => value.CompanyId == source.Id).ToListAsync(cancellationToken)) handoff.ReassignCompany(target.Id);

        var targetOrganizationIds = await dbContext.CrmPortalAccountLinks
            .Where(value => value.CompanyId == target.Id)
            .Select(value => value.OrganizationId)
            .ToListAsync(cancellationToken);
        foreach (var link in await dbContext.CrmPortalAccountLinks.Where(value => value.CompanyId == source.Id).ToListAsync(cancellationToken))
        {
            if (targetOrganizationIds.Contains(link.OrganizationId)) link.Deactivate();
            else link.ReassignCompany(target.Id);
        }

        await CopyMissingCustomFieldValues(source.Id, target.Id, cancellationToken);

        Execute(() => target.AddAlias(source.Name));
        Execute(() => source.MergeInto(target.Id, target.Name));
        dbContext.CrmMergeRecords.Add(new CrmMergeRecord(
            CrmRecordType.Company,
            source.Id,
            target.Id,
            request.Reason,
            actor.Id,
            DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(target);
    }

    private async Task CopyMissingCustomFieldValues(Guid sourceId, Guid targetId, CancellationToken cancellationToken)
    {
        var targetDefinitionIds = await dbContext.CrmCustomFieldValues.Where(value => value.RecordId == targetId && value.Definition.RecordType == CrmRecordType.Company).Select(value => value.DefinitionId).ToListAsync(cancellationToken);
        foreach (var value in await dbContext.CrmCustomFieldValues.AsNoTracking().Where(value => value.RecordId == sourceId && value.Definition.RecordType == CrmRecordType.Company && !targetDefinitionIds.Contains(value.DefinitionId)).ToListAsync(cancellationToken))
        {
            dbContext.CrmCustomFieldValues.Add(Execute(() => new CrmCustomFieldValue(value.DefinitionId, targetId, value.ValueJson)));
        }
    }

    private async Task<User> RequirePlatformAdminAsync(CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            HttpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null || !AccountAuthorization.IsPlatformAdmin(actor))
        {
            throw new CrmException(
                "crm_access_forbidden",
                "Phaeno CRM access is required.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    private async Task<CrmCompany> RequireCompanyAsync(
        Guid companyId,
        bool tracking,
        CancellationToken cancellationToken)
    {
        var query = dbContext.CrmCompanies.Include(value => value.Owner).AsQueryable();
        if (!tracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(value => value.Id == companyId, cancellationToken)
            ?? throw NotFound("crm_company_not_found", "The CRM company was not found.");
    }

    private async Task EnsureUniqueNameAsync(
        string name,
        Guid? excludedCompanyId,
        CancellationToken cancellationToken)
    {
        var normalizedName = name?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedName))
        {
            return;
        }

        var duplicate = await dbContext.CrmCompanies
            .AsNoTracking()
            .AnyAsync(value => (!excludedCompanyId.HasValue || value.Id != excludedCompanyId.Value)
                && value.Name.ToLower() == normalizedName.ToLower(),
                cancellationToken);
        if (duplicate)
        {
            throw Conflict(
                "crm_company_name_already_exists",
                "A CRM company with this name already exists.");
        }
    }

    private static CrmCompanyDto ToDto(CrmCompany value, User? owner = null)
    {
        var resolvedOwner = owner ?? value.Owner;
        return new CrmCompanyDto
        {
            Id = value.Id,
            Name = value.Name,
            WebsiteUrl = value.WebsiteUrl,
            DomainName = value.DomainName,
            Phone = value.Phone,
            Industry = value.Industry,
            Description = value.Description,
            AddressLine1 = value.AddressLine1,
            AddressLine2 = value.AddressLine2,
            City = value.City,
            Region = value.Region,
            PostalCode = value.PostalCode,
            CountryCode = value.CountryCode,
            EmployeeCount = value.EmployeeCount,
            LifecycleState = value.LifecycleState,
            Source = value.Source,
            Tags = value.Tags,
            Aliases = value.Aliases,
            MergedIntoCompanyId = value.MergedIntoCompanyId,
            OwnerUserId = value.OwnerUserId,
            OwnerName = $"{resolvedOwner.FirstName} {resolvedOwner.LastName}".Trim(),
            IsActive = value.IsActive,
            CreatedAt = value.CreatedAt,
            UpdatedAt = value.UpdatedAt,
            Version = value.Version
        };
    }

    private static string EscapeLikePattern(string value) => value
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("%", "\\%", StringComparison.Ordinal)
        .Replace("_", "\\_", StringComparison.Ordinal);

    private static void EnsurePagination(int page, int pageSize)
    {
        if (page < 1 || pageSize is < 1 or > 100)
        {
            throw new CrmException(
                "crm_pagination_invalid",
                "Page must be at least 1 and page size must be between 1 and 100.");
        }
    }

    private static void EnsureVersion(long currentVersion, long requestedVersion)
    {
        if (currentVersion != requestedVersion)
        {
            throw new DbUpdateConcurrencyException();
        }
    }

    private static T Execute<T>(Func<T> action)
    {
        try
        {
            return action();
        }
        catch (ArgumentException exception)
        {
            throw new CrmException("invalid_crm_company", exception.Message);
        }
    }

    private static void Execute(Action action) => Execute(() =>
    {
        action();
        return true;
    });

    private static CrmException NotFound(string code, string message) =>
        new(code, message, StatusCodes.Status404NotFound);

    private static CrmException Conflict(string code, string message) =>
        new(code, message, StatusCodes.Status409Conflict);
}
