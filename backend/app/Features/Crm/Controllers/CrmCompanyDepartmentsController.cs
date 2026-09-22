namespace PhaenoPortal.App.Features.Crm.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/crm/companies/{companyId:guid}/departments")]
public sealed class CrmCompanyDepartmentsController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<DepartmentDto>> CreateDepartment(Guid companyId,
        [FromBody] UpsertDepartmentRequest request, CancellationToken cancellationToken)
    {
        var actor = await CrmAccess.RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        await CrmCompanySetup.LockAsync(dbContext, companyId, cancellationToken);
        var company = await dbContext.CrmCompanies.SingleOrDefaultAsync(value => value.Id == companyId && value.IsActive, cancellationToken)
            ?? throw CrmAccess.NotFound("crm_company_not_found", "The active Company was not found.");
        var organizationId = company.AccessOrganizationId ?? company.SetupOrganizationId;
        if (!organizationId.HasValue)
        {
            if (await dbContext.Organizations.AnyAsync(value => value.Name == company.Name, cancellationToken))
                throw CrmAccess.Conflict("crm_company_setup_name_conflict", "An organization already uses this Company name. Resolve its Company association before creating a separate department setup.");
            var organization = new Organization(company.Name, OrganizationKind.Prospect,
                company.Description is { Length: > 1000 } ? company.Description[..1000] : company.Description);
            organization.Deactivate();
            dbContext.Organizations.Add(organization);
            company.SetUpDepartments(organization.Id);
            organizationId = organization.Id;
            AccountAudit.Add(dbContext, HttpContext, nameof(CrmCompany), company.Id,
                "CompanyDepartmentsSetUp", organization.Id, actor.Id, new { company.Name });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // Reuse reference allocation, validation, auditing and the surrounding transaction.
        var result = (Created<DepartmentDto>)await DepartmentEndpoints.CreateDepartment(
            organizationId.Value, request, HttpContext, dbContext, externalIdentityContext, cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return Created($"/api/organizations/{organizationId}/departments/{result.Value!.Id}", result.Value);
    }
}
