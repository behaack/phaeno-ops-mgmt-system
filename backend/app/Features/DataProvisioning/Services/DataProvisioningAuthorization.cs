namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record DataProvisioningTenantContext(
    User Actor,
    Organization Organization,
    OrganizationMembership Membership,
    OrganizationDepartment Department,
    bool IsDepartmentAdmin);

public static class DataProvisioningAuthorization
{
    public const string SelectedOrganizationHeader = "X-Organization-Id";
    public const string SelectedDepartmentHeader = "X-Department-Id";

    public static async Task<User> RequirePlatformAdminAsync(
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null || !AccountAuthorization.IsPlatformAdmin(actor))
        {
            throw new DataProvisioningException(
                "dataset_administration_forbidden",
                "Phaeno dataset administration access is required.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    public static async Task<DataProvisioningTenantContext> RequireTenantAccessAsync(
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        bool requireScopeAdmin,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null)
        {
            throw new DataProvisioningException(
                "tenant_access_forbidden",
                "Active organization access is required.",
                StatusCodes.Status403Forbidden);
        }

        if (!httpContext.Request.Headers.TryGetValue(SelectedOrganizationHeader, out var values)
            || !Guid.TryParse(values.FirstOrDefault(), out var organizationId))
        {
            throw new DataProvisioningException(
                "selected_organization_required",
                "Select an organization before accessing curated data.");
        }

        var membership = actor.Memberships.FirstOrDefault(m =>
            m.OrganizationId == organizationId
            && m.IsActive
            && m.Organization?.IsActive == true);
        if (membership?.Organization == null
            || !AccountAuthorization.CanViewOrganizationDatasets(actor, organizationId))
        {
            throw new DataProvisioningException(
                "tenant_access_forbidden",
                "You do not have access to curated data for the selected organization.",
                StatusCodes.Status403Forbidden);
        }

        Guid? selectedDepartmentId = null;
        if (httpContext.Request.Headers.TryGetValue(SelectedDepartmentHeader, out var departmentValues))
        {
            if (!Guid.TryParse(departmentValues.FirstOrDefault(), out var parsedDepartmentId))
            {
                throw new DataProvisioningException(
                    "selected_department_invalid",
                    "Select a valid department before accessing curated data.");
            }

            selectedDepartmentId = parsedDepartmentId;
        }

        var departmentQuery = dbContext.OrganizationDepartments.AsNoTracking()
            .Where(department => department.OrganizationId == organizationId && department.IsActive);
        if (!membership.IsOrganizationAdmin)
        {
            departmentQuery = departmentQuery.Where(department =>
                dbContext.OrganizationDepartmentMemberships.Any(access =>
                    access.OrganizationMembershipId == membership.Id
                    && access.DepartmentId == department.Id
                    && access.IsActive));
        }

        var department = selectedDepartmentId.HasValue
            ? await departmentQuery.SingleOrDefaultAsync(
                candidate => candidate.Id == selectedDepartmentId.Value,
                cancellationToken)
            : await departmentQuery
                .OrderByDescending(candidate => candidate.IsDefault)
                .ThenBy(candidate => candidate.Name)
                .FirstOrDefaultAsync(cancellationToken);
        if (department is null)
        {
            throw new DataProvisioningException(
                "department_unavailable",
                "The selected department is not available to this user.",
                StatusCodes.Status403Forbidden);
        }

        var isDepartmentAdmin = membership.IsOrganizationAdmin
            || await dbContext.OrganizationDepartmentMemberships.AsNoTracking().AnyAsync(access =>
                access.OrganizationMembershipId == membership.Id
                && access.DepartmentId == department.Id
                && access.IsActive
                && access.IsDepartmentAdmin,
                cancellationToken);
        if (requireScopeAdmin && !isDepartmentAdmin)
        {
            throw new DataProvisioningException(
                "tenant_access_forbidden",
                "Organization or department administrator access is required for the selected department.",
                StatusCodes.Status403Forbidden);
        }

        return new DataProvisioningTenantContext(
            actor,
            membership.Organization,
            membership,
            department,
            isDepartmentAdmin);
    }
}
