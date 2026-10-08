namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CustomerDeliveryLocationsReplaceDefaultWithConcurrencyAndPreserveInactiveDetails()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var department = await scope.DbContext.OrganizationDepartments.SingleAsync(item => item.OrganizationId == scope.CustomerOrganization.Id && item.IsDefault);
        var controller = scope.DeliveryLocationController();
        var firstInput = DeliveryLocationInput(scope.CustomerOrganization.Id, department.Id, "Receiving A", true);
        var first = await controller.Create(firstInput, default);
        scope.ClearTrackedState();
        var second = await controller.Create(firstInput with { Label = "Receiving B" }, default);
        scope.ClearTrackedState();
        var list = await controller.List(scope.CustomerOrganization.Id, department.Id, default);
        Assert.Equal(2, list.Count);
        Assert.Equal(second.Id, Assert.Single(list, item => item.IsDefault).Id);
        Assert.True(list.Single(item => item.Id == first.Id).Version > first.Version);
        var conflict = await Assert.ThrowsAsync<OrderManagementException>(() => controller.Update(first.Id,
            firstInput with { Version = first.Version, Recipient = "Changed" }, default));
        Assert.Equal(409, conflict.StatusCode);
        scope.ClearTrackedState();
        Assert.Equal("Receiving team", (await controller.Read(first.Id, default)).Recipient);
        var deactivated = await controller.Deactivate(second.Id, second.Version, default);
        Assert.False(deactivated.IsActive);
        Assert.False(deactivated.IsDefault);
        scope.ClearTrackedState();
        Assert.Equal(first.Id, Assert.Single(await controller.List(scope.CustomerOrganization.Id, department.Id, default)).Id);
        Assert.Equal("Receiving B", (await controller.Read(second.Id, default)).Label);
    }

    [PostgreSqlReferenceFact]
    public async Task CustomerDeliveryLocationsRejectOtherTenantAndMemberWritesWhilePhaenoCanManage()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var department = await scope.DbContext.OrganizationDepartments.SingleAsync(item => item.OrganizationId == scope.CustomerOrganization.Id && item.IsDefault);
        var input = DeliveryLocationInput(scope.CustomerOrganization.Id, department.Id, "Receiving", true);
        var location = await scope.DeliveryLocationController(platform: true).Create(input, default);
        scope.ClearTrackedState();
        Assert.Equal(location.Id, (await scope.DeliveryLocationController().Read(location.Id, default)).Id);
        var foreign = scope.DeliveryLocationController(otherCustomer: true);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => foreign.Read(location.Id, default))).StatusCode);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => foreign.List(input.OrganizationId, input.DepartmentId, default))).StatusCode);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => foreign.Update(location.Id, input with { Version = location.Version }, default))).StatusCode);
        scope.ClearTrackedState();
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(item => item.OrganizationId == scope.CustomerOrganization.Id && item.UserId == scope.CustomerUser.Id);
        membership.SetOrganizationAdmin(false);
        scope.DbContext.OrganizationDepartmentMemberships.Add(new(membership.Id, department.Id));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        Assert.Single(await scope.DeliveryLocationController().List(input.OrganizationId, input.DepartmentId, default));
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.DeliveryLocationController().Create(input, default))).StatusCode);
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.DeliveryLocationController().Deactivate(location.Id, location.Version, default))).StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task CustomerDeliveryLocationsRespectDepartmentOwnershipAndRejectInvalidAddressWithoutReplacingDefault()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var department = await scope.DbContext.OrganizationDepartments.SingleAsync(item => item.OrganizationId == scope.CustomerOrganization.Id && item.IsDefault);
        var other = new OrganizationDepartment(scope.CustomerOrganization.Id, "DELIVERY-OTHER", "Other Department");
        scope.DbContext.OrganizationDepartments.Add(other);
        await scope.DbContext.SaveChangesAsync();
        var input = DeliveryLocationInput(scope.CustomerOrganization.Id, department.Id, "Receiving", true);
        var saved = await scope.DeliveryLocationController().Create(input, default);
        scope.ClearTrackedState();
        var invalid = await Assert.ThrowsAsync<OrderManagementException>(() => scope.DeliveryLocationController().Create(input with { CountryCode = "12" }, default));
        Assert.Equal("customer_delivery_location_invalid", invalid.ErrorCode);
        Assert.True((await scope.DeliveryLocationController().Read(saved.Id, default)).IsDefault);
        var otherSaved = await scope.DeliveryLocationController().Create(input with { DepartmentId = other.Id }, default);
        scope.ClearTrackedState();
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(item => item.OrganizationId == scope.CustomerOrganization.Id && item.UserId == scope.CustomerUser.Id);
        membership.SetOrganizationAdmin(false);
        scope.DbContext.OrganizationDepartmentMemberships.Add(new(membership.Id, department.Id, true));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        Assert.Single(await scope.DeliveryLocationController().List(input.OrganizationId, input.DepartmentId, default));
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.DeliveryLocationController().Read(otherSaved.Id, default))).StatusCode);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.DeliveryLocationController().Create(input with { DepartmentId = other.Id }, default))).StatusCode);
    }

    private static CustomerDeliveryLocationWriteRequest DeliveryLocationInput(Guid organizationId, Guid departmentId, string label, bool isDefault)
        => new(organizationId, departmentId, label, "Receiving team", "10 Test Way", null, "Seattle", "WA", "98101", "us", null, "Use receiving entrance.", isDefault);

    private sealed partial class ShippingTestScope
    {
        public CustomerDeliveryLocationsController DeliveryLocationController(bool platform = false, bool otherCustomer = false)
        {
            var identity = new FixedIdentityContext(platform ? platformIdentity : otherCustomer ? otherCustomerIdentity : customerIdentity);
            var http = new DefaultHttpContext();
            if (!platform) http.Request.Headers["X-Organization-Id"] = (otherCustomer ? OtherCustomerOrganization.Id : CustomerOrganization.Id).ToString();
            return new(DbContext, new OrderRequestContext(DbContext, identity), identity)
                { ControllerContext = new() { HttpContext = http } };
        }
    }
}
