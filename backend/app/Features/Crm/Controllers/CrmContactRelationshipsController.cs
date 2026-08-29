namespace PhaenoPortal.App.Features.Crm.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using static PhaenoPortal.App.Features.Crm.Services.CrmAccess;

[ApiController]
[Authorize]
[Route("api/platform/crm")]
public sealed class CrmContactRelationshipsController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet("companies/{companyId:guid}/contacts")]
    public async Task<IReadOnlyList<CrmCompanyContactDto>> ListCompanyContacts(Guid companyId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var values = await Query().Where(value => value.CompanyId == companyId)
            .OrderByDescending(value => value.IsPrimaryCompany).ThenBy(value => value.Contact.LastName).ThenBy(value => value.Contact.FirstName)
            .ToListAsync(cancellationToken);
        return values.Select(value => ToDto(value)).ToList();
    }

    [HttpGet("contacts/{contactId:guid}/companies")]
    public async Task<IReadOnlyList<CrmCompanyContactDto>> ListContactCompanies(Guid contactId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var values = await Query().Where(value => value.ContactId == contactId)
            .OrderByDescending(value => value.IsPrimaryCompany).ThenBy(value => value.Company.Name)
            .ToListAsync(cancellationToken);
        return values.Select(value => ToDto(value)).ToList();
    }

    [HttpPost("companies/{companyId:guid}/contacts")]
    public async Task<ActionResult<CrmCompanyContactDto>> Associate(Guid companyId, [FromBody] AssociateCrmContactRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var company = await dbContext.CrmCompanies.FirstOrDefaultAsync(value => value.Id == companyId && value.IsActive, cancellationToken)
            ?? throw NotFound("crm_company_not_found", "The active CRM company was not found.");
        var contact = await dbContext.CrmContacts.FirstOrDefaultAsync(value => value.Id == request.ContactId && value.IsActive, cancellationToken)
            ?? throw NotFound("crm_contact_not_found", "The active CRM contact was not found.");
        if (await dbContext.CrmCompanyContacts.AnyAsync(value => value.CompanyId == companyId && value.ContactId == request.ContactId && value.IsActive, cancellationToken))
        {
            throw Conflict("crm_company_contact_exists", "This contact is already associated with the company.");
        }

        if (request.IsPrimaryCompany) await ClearPrimary(request.ContactId, null, cancellationToken);
        var value = Execute(() => new CrmCompanyContact(companyId, request.ContactId, request.JobTitle, request.RelationshipRole, request.IsPrimaryCompany, request.EffectiveFrom));
        dbContext.CrmCompanyContacts.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/companies/{companyId}/contacts/{value.Id}", ToDto(value, company.Name, contact.DisplayName));
    }

    [HttpPut("companies/{companyId:guid}/contacts/{associationId:guid}")]
    public async Task<CrmCompanyContactDto> Update(Guid companyId, Guid associationId, [FromBody] UpdateCrmCompanyContactRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await dbContext.CrmCompanyContacts.Include(item => item.Company).Include(item => item.Contact)
            .FirstOrDefaultAsync(item => item.Id == associationId && item.CompanyId == companyId, cancellationToken)
            ?? throw NotFound("crm_company_contact_not_found", "The company-contact relationship was not found.");
        EnsureVersion(value.Version, request.Version);
        if (request.IsPrimaryCompany) await ClearPrimary(value.ContactId, value.Id, cancellationToken);
        Execute(() => value.Update(request.JobTitle, request.RelationshipRole, request.IsPrimaryCompany, request.EffectiveFrom, request.EffectiveTo));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    private async Task ClearPrimary(Guid contactId, Guid? excludedId, CancellationToken cancellationToken)
    {
        var primaries = await dbContext.CrmCompanyContacts.Where(value => value.ContactId == contactId && value.IsPrimaryCompany && (!excludedId.HasValue || value.Id != excludedId.Value)).ToListAsync(cancellationToken);
        foreach (var primary in primaries) primary.MakeSecondary();
    }

    private IQueryable<CrmCompanyContact> Query() => dbContext.CrmCompanyContacts.AsNoTracking().Include(value => value.Company).Include(value => value.Contact);
    private async Task RequireActor(CancellationToken cancellationToken) => _ = await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
    private static CrmException NotFound(string code, string message) => CrmAccess.NotFound(code, message);
    private static CrmException Conflict(string code, string message) => CrmAccess.Conflict(code, message);

    private static CrmCompanyContactDto ToDto(CrmCompanyContact value) => ToDto(value, value.Company.Name, value.Contact.DisplayName);
    private static CrmCompanyContactDto ToDto(CrmCompanyContact value, string companyName, string contactName) =>
        new(value.Id, value.CompanyId, companyName, value.ContactId, contactName, value.JobTitle, value.RelationshipRole, value.IsPrimaryCompany, value.EffectiveFrom, value.EffectiveTo, value.IsActive, value.Version);
}
