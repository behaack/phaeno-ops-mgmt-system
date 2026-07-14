namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class DataProvisioningAuthorization
{
    public const string SelectedOrganizationHeader = "X-Organization-Id";

    public static async Task<User> RequirePlatformAdminAsync(
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null || !AccountAccess.IsPlatformAdmin(actor))
        {
            throw new DataProvisioningException(
                "dataset_administration_forbidden",
                "Phaeno dataset administration access is required.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    public static async Task<(User Actor, Organization Organization)> RequireTenantAccessAsync(
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        bool requireOrganizationAdmin,
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
            || !AccountAccess.CanViewOrganizationDatasets(actor, organizationId)
            || (requireOrganizationAdmin && !membership.IsOrganizationAdmin))
        {
            throw new DataProvisioningException(
                "tenant_access_forbidden",
                "You do not have access to curated data for the selected organization.",
                StatusCodes.Status403Forbidden);
        }

        return (actor, membership.Organization);
    }
}
