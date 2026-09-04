namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record OrderTenantContext(
    User Actor,
    Organization Organization,
    OrganizationMembership Membership,
    OrganizationDepartment Department,
    bool IsDepartmentAdmin);

public sealed class OrderRequestContext(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext)
{
    private const string SelectedOrganizationHeader = "X-Organization-Id";
    private const string SelectedDepartmentHeader = "X-Department-Id";

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

        var department = await ResolveDepartmentAsync(httpContext, membership, cancellationToken);
        var isDepartmentAdmin = membership.IsOrganizationAdmin
            || await dbContext.OrganizationDepartmentMemberships.AsNoTracking().AnyAsync(value =>
                value.OrganizationMembershipId == membership.Id
                && value.DepartmentId == department.Id
                && value.IsActive
                && value.IsDepartmentAdmin,
                cancellationToken);

        if (requireOrganizationAdmin && !isDepartmentAdmin)
        {
            throw new OrderManagementException(
                "department_admin_required",
                "An active organization or department administrator is required for this action.",
                StatusCodes.Status403Forbidden);
        }

        return new OrderTenantContext(actor, membership.Organization, membership, department, isDepartmentAdmin);
    }

    public async Task<OrderTenantContext> RequireSampleShippingTenantAsync(
        HttpContext httpContext,
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
            throw new OrderManagementException(
                "selected_organization_required",
                "Select an organization before accessing sample shipping.");

        var membership = actor.Memberships.FirstOrDefault(candidate =>
            candidate.OrganizationId == organizationId
            && candidate.IsActive
            && candidate.Organization is { IsActive: true });
        if (membership?.Organization == null
            || membership.Organization.Kind is not (OrganizationKind.Prospect or OrganizationKind.Customer))
            throw new OrderManagementException(
                "sample_shipment_not_found",
                "The requested sample-shipping resource was not found.",
                StatusCodes.Status404NotFound);
        var department = await ResolveDepartmentAsync(httpContext, membership, cancellationToken);
        var isDepartmentAdmin = membership.IsOrganizationAdmin
            || await dbContext.OrganizationDepartmentMemberships.AsNoTracking().AnyAsync(value =>
                value.OrganizationMembershipId == membership.Id
                && value.DepartmentId == department.Id
                && value.IsActive
                && value.IsDepartmentAdmin,
                cancellationToken);
        if (requireOrganizationAdmin && !isDepartmentAdmin)
            throw new OrderManagementException(
                "department_admin_required",
                "An active organization or department administrator is required for this action.",
                StatusCodes.Status403Forbidden);

        return new OrderTenantContext(actor, membership.Organization, membership, department, isDepartmentAdmin);
    }

    private async Task<OrganizationDepartment> ResolveDepartmentAsync(
        HttpContext httpContext,
        OrganizationMembership membership,
        CancellationToken cancellationToken)
    {
        Guid? selectedDepartmentId = null;
        if (httpContext.Request.Headers.TryGetValue(SelectedDepartmentHeader, out var values))
        {
            if (!Guid.TryParse(values.FirstOrDefault(), out var parsedDepartmentId))
            {
                throw new OrderManagementException(
                    "selected_department_invalid",
                    "Select a valid department before accessing this workflow.",
                    StatusCodes.Status400BadRequest);
            }

            selectedDepartmentId = parsedDepartmentId;
        }

        var query = dbContext.OrganizationDepartments.AsNoTracking()
            .Where(value => value.OrganizationId == membership.OrganizationId && value.IsActive);
        if (!membership.IsOrganizationAdmin)
        {
            query = query.Where(value => dbContext.OrganizationDepartmentMemberships.Any(access =>
                access.OrganizationMembershipId == membership.Id
                && access.DepartmentId == value.Id
                && access.IsActive));
        }

        var department = selectedDepartmentId.HasValue
            ? await query.SingleOrDefaultAsync(value => value.Id == selectedDepartmentId.Value, cancellationToken)
            : await query.OrderByDescending(value => value.IsDefault)
                .ThenBy(value => value.Name)
                .FirstOrDefaultAsync(cancellationToken);
        return department ?? throw new OrderManagementException(
            "order_not_found",
            "The requested order resource was not found.",
            StatusCodes.Status404NotFound);
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

        var isLabNamespace = httpContext.Request.Path.StartsWithSegments("/api/platform/lab-operations");
        var isLabOwnedAction = IsExplicitLabOwnedAction(httpContext.Request);
        var hasLabManufacturingRole = isLabOwnedAction
            && actor.Memberships.Any(membership => membership.IsActive
                && membership.Organization is { IsActive: true, Kind: OrganizationKind.Phaeno })
            && await dbContext.LabRoleAssignments.AsNoTracking().AnyAsync(
                assignment => assignment.UserId == actor.Id
                    && assignment.IsActive
                    && (assignment.Role == LabRole.Operator
                        || assignment.Role == LabRole.Supervisor
                        || assignment.Role == LabRole.OperationsAdministrator),
                cancellationToken);

        if (!AccountAuthorization.IsPlatformAdmin(actor) && !hasLabManufacturingRole)
        {
            throw new OrderManagementException(
                isLabNamespace ? "lab_capability_required" : "platform_capability_required",
                isLabNamespace
                    ? "This action requires an assigned Phaeno laboratory operations role."
                    : "This Phaeno operation requires an order-management platform capability.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    public async Task<User> RequireBusinessRoleAsync(
        HttpContext httpContext,
        BusinessRole role,
        bool enforceBusinessRoles,
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

        if (!enforceBusinessRoles && AccountAuthorization.IsPlatformAdmin(actor)) return actor;

        var hasRole = await dbContext.BusinessRoleAssignments.AsNoTracking().AnyAsync(
            assignment => assignment.UserId == actor.Id
                && assignment.Role == role
                && assignment.IsActive,
            cancellationToken);
        if (!hasRole)
        {
            throw new OrderManagementException(
                "business_role_required",
                $"The {role} role is required for this action.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    public async Task<User> RequireAnyBusinessRoleAsync(
        HttpContext httpContext,
        IReadOnlyCollection<BusinessRole> roles,
        bool enforceBusinessRoles,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext, dbContext, externalIdentityContext, cancellationToken)
            ?? throw new OrderManagementException("active_actor_required",
                "An active portal user is required.", StatusCodes.Status401Unauthorized);
        if (!enforceBusinessRoles && AccountAuthorization.IsPlatformAdmin(actor)) return actor;
        var hasRole = await dbContext.BusinessRoleAssignments.AsNoTracking().AnyAsync(assignment =>
            assignment.UserId == actor.Id && assignment.IsActive && roles.Contains(assignment.Role),
            cancellationToken);
        if (!hasRole)
            throw new OrderManagementException("business_role_required",
                "An assigned commercial, release, billing, cash, or reconciliation role is required.",
                StatusCodes.Status403Forbidden);
        return actor;
    }
    private static bool IsExplicitLabOwnedAction(HttpRequest request)
    {
        var path = request.Path.Value ?? string.Empty;

        if (HttpMethods.IsGet(request.Method)
            && path.Equals("/api/platform/lab-operations/sample-shipping/packets/scan", StringComparison.OrdinalIgnoreCase))
            return true;

        const string shippingPrefix = "/api/platform/lab-operations/sample-shipping/workflow/";
        if (path.StartsWith(shippingPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var segments = SplitRelativePath(path, shippingPrefix);
            if (HttpMethods.IsGet(request.Method))
                return segments is ["shipments"]
                    or ["shipments", _]
                    or ["tubes", "scan"];
            if (!HttpMethods.IsPost(request.Method)) return false;
            return segments is ["shipments", _, "return-kit"]
                or ["return-kits", _, "tubes"]
                or ["return-kits", _, "fulfill"];
        }

        const string kitPrefix = "/api/platform/lab-operations/pseq-kit-orders";
        if (path.StartsWith(kitPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var segments = SplitRelativePath(path, kitPrefix);
            if (HttpMethods.IsGet(request.Method))
                return segments is [] or [_];
            if (!HttpMethods.IsPost(request.Method)) return false;
            return segments is [_, "start-processing"]
                or [_, "hold"]
                or [_, "release-hold"]
                or [_, "adjustments"]
                or [_, "shipments"]
                or [_, "fulfill"];
        }

        const string assemblyPrefix = "/api/platform/lab-operations/data-assembly-requests";
        if (path.StartsWith(assemblyPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var segments = SplitRelativePath(path, assemblyPrefix);
            if (HttpMethods.IsGet(request.Method))
                return segments is [] or [_];
            if (!HttpMethods.IsPost(request.Method)) return false;
            return segments is [_, "begin-intake"]
                or [_, "accept-intake"]
                or [_, "processing-runs"]
                or [_, "outputs", "release"]
                or [_, "complete"]
                or [_, "hold"]
                or [_, "release-hold"]
                or [_, "processing-runs", _, "decision"]
                or [_, "processing-runs", _, "outputs"];
        }

        return false;
    }

    private static string[] SplitRelativePath(string path, string prefix) =>
        path[prefix.Length..]
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
