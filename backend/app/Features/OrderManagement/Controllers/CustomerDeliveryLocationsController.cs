namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/customer-delivery-locations")]
public sealed class CustomerDeliveryLocationsController(PSeqOperationsDbContext db, OrderRequestContext context,
    IExternalIdentityContext identity) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<CustomerDeliveryLocationDto>> List([FromQuery] Guid? organizationId,
        [FromQuery] Guid? departmentId, CancellationToken ct)
    {
        var scope = await ScopeAsync(organizationId, departmentId, false, ct);
        var locations = await db.CustomerDeliveryLocations.AsNoTracking()
            .Where(item => item.OrganizationId == scope.OrganizationId && item.DepartmentId == scope.DepartmentId && item.IsActive)
            .OrderByDescending(item => item.IsDefault).ThenBy(item => item.Label).ToListAsync(ct);
        return locations.Select(item => item.ToDto()).ToArray();
    }

    [HttpGet("{id:guid}")]
    public async Task<CustomerDeliveryLocationDto> Read(Guid id, CancellationToken ct)
    {
        var item = await db.CustomerDeliveryLocations.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        await ScopeAsync(item.OrganizationId, item.DepartmentId, false, ct);
        return item.ToDto();
    }

    [HttpPost]
    public async Task<CustomerDeliveryLocationDto> Create([FromBody] CustomerDeliveryLocationWriteRequest request, CancellationToken ct)
    {
        var scope = await ScopeAsync(request.OrganizationId, request.DepartmentId, true, ct);
        var item = Construct(scope, request);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, LockKey(scope), ct);
        if (item.IsDefault) await ClearDefaultAsync(scope, item.Id, ct);
        db.CustomerDeliveryLocations.Add(item);
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        Response.StatusCode = StatusCodes.Status201Created;
        return item.ToDto();
    }

    [HttpPatch("{id:guid}")]
    public async Task<CustomerDeliveryLocationDto> Update(Guid id, [FromBody] CustomerDeliveryLocationWriteRequest request, CancellationToken ct)
    {
        var scope = await ScopeAsync(request.OrganizationId, request.DepartmentId, true, ct);
        var validated = Construct(scope, request);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, LockKey(scope), ct);
        var item = await FindAsync(id, scope, ct);
        CheckVersion(item, request.Version);
        if (validated.IsDefault) await ClearDefaultAsync(scope, item.Id, ct);
        item.Update(validated.Label, validated.Recipient, validated.Line1, validated.Line2, validated.City,
            validated.Region, validated.PostalCode, validated.CountryCode, validated.Phone, validated.DeliveryInstructions, validated.IsDefault);
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return item.ToDto();
    }

    [HttpDelete("{id:guid}")]
    public async Task<CustomerDeliveryLocationDto> Deactivate(Guid id, [FromQuery] long version, CancellationToken ct)
    {
        var observed = await db.CustomerDeliveryLocations.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        var scope = await ScopeAsync(observed.OrganizationId, observed.DepartmentId, true, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, LockKey(scope), ct);
        var item = await FindAsync(id, scope, ct);
        CheckVersion(item, version);
        item.Deactivate();
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return item.ToDto();
    }

    private async Task<(Guid OrganizationId, Guid DepartmentId)> ScopeAsync(Guid? organizationId, Guid? departmentId, bool write, CancellationToken ct)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, db, identity, ct)
            ?? throw new OrderManagementException("active_actor_required", "An active portal user is required.", 401);
        if (AccountAuthorization.IsPlatformAdmin(actor))
        {
            await context.RequirePlatformAdminAsync(HttpContext, ct);
            if (!organizationId.HasValue || !departmentId.HasValue) throw Invalid("Choose a Customer and Department.");
        }
        else
        {
            var tenant = await context.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, ct);
            organizationId ??= tenant.Organization.Id;
            departmentId ??= tenant.Department.Id;
            if (organizationId != tenant.Organization.Id) throw Missing();
            if (!tenant.Membership.IsOrganizationAdmin)
            {
                var access = await db.OrganizationDepartmentMemberships.AsNoTracking().SingleOrDefaultAsync(item =>
                    item.OrganizationMembershipId == tenant.Membership.Id && item.DepartmentId == departmentId.Value && item.IsActive, ct);
                if (access is null) throw Missing();
                if (write && !access.IsDepartmentAdmin)
                    throw new OrderManagementException("department_admin_required", "An organization or Department administrator is required to manage delivery locations.", 403);
            }
        }
        var valid = await db.OrganizationDepartments.AsNoTracking().AnyAsync(item => item.Id == departmentId.Value
            && item.OrganizationId == organizationId.Value && item.IsActive
            && db.Organizations.Any(organization => organization.Id == item.OrganizationId && organization.IsActive
                && organization.Kind == OrganizationKind.Customer), ct);
        if (!valid) throw Missing();
        return (organizationId.Value, departmentId.Value);
    }

    private async Task<CustomerDeliveryLocation> FindAsync(Guid id, (Guid OrganizationId, Guid DepartmentId) scope, CancellationToken ct)
        => await db.CustomerDeliveryLocations.SingleOrDefaultAsync(item => item.Id == id && item.IsActive
            && item.OrganizationId == scope.OrganizationId && item.DepartmentId == scope.DepartmentId, ct) ?? throw Missing();

    private async Task ClearDefaultAsync((Guid OrganizationId, Guid DepartmentId) scope, Guid except, CancellationToken ct)
    {
        var defaults = await db.CustomerDeliveryLocations.Where(item => item.Id != except && item.IsActive && item.IsDefault
            && item.OrganizationId == scope.OrganizationId && item.DepartmentId == scope.DepartmentId).ToListAsync(ct);
        foreach (var item in defaults) item.ClearDefault();
        if (defaults.Count > 0) await db.SaveChangesAsync(ct);
    }

    private static CustomerDeliveryLocation Construct((Guid OrganizationId, Guid DepartmentId) scope, CustomerDeliveryLocationWriteRequest request)
    {
        try { return new(scope.OrganizationId, scope.DepartmentId, request.Label, request.Recipient, request.Line1,
            request.Line2, request.City, request.Region, request.PostalCode, request.CountryCode, request.Phone, request.DeliveryInstructions, request.IsDefault); }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
    }
    private static void CheckVersion(CustomerDeliveryLocation item, long? version)
    {
        if (version != item.Version) throw new OrderManagementException("customer_delivery_location_changed", "This delivery location changed. Refresh and review it before saving.", 409);
    }
    private static string LockKey((Guid OrganizationId, Guid DepartmentId) scope) => $"customer-delivery-locations:{scope.OrganizationId}:{scope.DepartmentId}";
    private static OrderManagementException Missing() => new("customer_delivery_location_not_found", "The Customer delivery location or Department was not found.", 404);
    private static OrderManagementException Invalid(string message) => new("customer_delivery_location_invalid", message);
}
