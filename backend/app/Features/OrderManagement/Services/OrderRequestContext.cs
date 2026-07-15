namespace PhaenoPortal.App.Features.OrderManagement.Services;

using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record OrderTenantContext(
    User Actor,
    Organization Organization,
    OrganizationMembership Membership);

public sealed class OrderRequestContext(
    AppDbContext dbContext,
    IExternalIdentityContext externalIdentityContext)
{
    private const string SelectedOrganizationHeader = "X-Organization-Id";

    public async Task<OrderTenantContext> RequireTenantAsync(
        HttpContext httpContext,
        OrganizationKind requiredKind,
        bool requireOrganizationAdmin,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken)
            ?? throw new OrderManagementException(
                "active_actor_required",
                "An active portal user is required.",
                StatusCodes.Status401Unauthorized);

        if (!httpContext.Request.Headers.TryGetValue(SelectedOrganizationHeader, out var values)
            || !Guid.TryParse(values.FirstOrDefault(), out var organizationId))
        {
            throw new OrderManagementException(
                "selected_organization_required",
                "Select an organization before accessing order management.",
                StatusCodes.Status400BadRequest);
        }

        var membership = actor.Memberships.FirstOrDefault(candidate =>
            candidate.OrganizationId == organizationId
            && candidate.IsActive
            && candidate.Organization is { IsActive: true });

        if (membership?.Organization == null || membership.Organization.Kind != requiredKind)
        {
            throw new OrderManagementException(
                "order_not_found",
                "The requested order resource was not found.",
                StatusCodes.Status404NotFound);
        }

        if (requireOrganizationAdmin && !membership.IsOrganizationAdmin)
        {
            throw new OrderManagementException(
                "organization_admin_required",
                "An active organization administrator is required for this action.",
                StatusCodes.Status403Forbidden);
        }

        return new OrderTenantContext(actor, membership.Organization, membership);
    }

    public async Task<User> RequirePlatformAdminAsync(
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken)
            ?? throw new OrderManagementException(
                "active_actor_required",
                "An active portal user is required.",
                StatusCodes.Status401Unauthorized);

        if (!AccountAccess.IsPlatformAdmin(actor))
        {
            throw new OrderManagementException(
                "platform_capability_required",
                "This Phaeno operation requires an order-management platform capability.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }
}
