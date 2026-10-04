namespace PhaenoPortal.App.Features.Crm.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class CrmOpportunityDepartments
{
    public static Task<List<CrmOpportunityDepartmentDto>> ReadAsync(
        PSeqOperationsDbContext db, CrmCompany company, CancellationToken token)
    {
        var organizationId = company.AccessOrganizationId ?? company.SetupOrganizationId;
        return db.OrganizationDepartments.AsNoTracking()
            .Where(value => organizationId.HasValue && value.OrganizationId == organizationId && value.IsActive)
            .OrderBy(value => value.Name).ThenBy(value => value.Id)
            .Select(value => new CrmOpportunityDepartmentDto(value.Id, value.Name)).ToListAsync(token);
    }

    public static async Task<Guid?> ResolveAsync(
        PSeqOperationsDbContext db, CrmCompany company, Guid? departmentId, CancellationToken token)
    {
        var departments = await ReadAsync(db, company, token);
        if (departmentId.HasValue)
        {
            if (!departments.Any(value => value.Id == departmentId))
                throw new CrmException("crm_opportunity_department_invalid", "Select an active Department belonging to this Company.");
            return departmentId;
        }
        if (departments.Count > 1)
            throw new CrmException("crm_opportunity_department_required", "Select a Department for this Company.");
        return departments.SingleOrDefault()?.Id;
    }
}
