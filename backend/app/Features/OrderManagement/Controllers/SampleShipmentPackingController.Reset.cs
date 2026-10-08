namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class SampleShipmentPackingController
{
    [HttpGet("reset")]
    public async Task<ShipmentPackingResetContextDto> ReadReset(Guid shipmentId, CancellationToken ct)
    {
        var tenant = await context.RequireSampleShippingTenantAsync(HttpContext, false, ct);
        return await new SampleShipmentPackingResetService(db).ReadAsync(shipmentId, tenant.Organization.Id,
            tenant.Department.Id, tenant.IsDepartmentAdmin, ct);
    }

    [HttpPost("reset")]
    public async Task<SampleShipmentWorkflowDto> Reset(Guid shipmentId, [FromBody] ShipmentPackingResetRequest request, CancellationToken ct)
    {
        var tenant = await context.RequireSampleShippingTenantAsync(HttpContext, true, ct);
        var poolId = await new SampleShipmentPackingResetService(db).ResetAsync(shipmentId, tenant.Organization.Id,
            tenant.Department.Id, request, ct);
        return await reader.ReadAsync(poolId, tenant.Organization.Id, tenant.Department.Id, ct);
    }
}
