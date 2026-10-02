namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabServiceOrdersController
{
    [HttpGet("{orderId:guid}/phase-kit-supply")]
    public async Task<LabOrderKitWorkspaceDto> ReadPhaseKitSupply(Guid orderId, [FromQuery] Guid? deliveryLocationId, CancellationToken ct)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, ct);
        var order = await ReadOrderAsync(orderId, tenant, ct);
        return await transportationKits.PhaseWorkspaceAsync(order, tenant.IsDepartmentAdmin, deliveryLocationId, ct);
    }

    [HttpPost("{orderId:guid}/phase-kit-requests")]
    public async Task<LabOrderKitWorkspaceDto> RequestPhaseKits(Guid orderId, [FromBody] RequestLabPhaseKitsRequest body, CancellationToken ct)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, ct);
        if (!tenant.IsDepartmentAdmin)
            throw new OrderManagementException("department_administrator_required",
                "An organization or department administrator can request transportation kits.", StatusCodes.Status403Forbidden);
        await ReadOrderAsync(orderId, tenant, ct);
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id, $"lab-order:{orderId}:phase-kits",
            idempotency.RequireKey(HttpContext), body, async token =>
            {
                var order = await ReadLockedRosterAsync(orderId, tenant, token);
                await SampleShippingPackingData.LockAsync(dbContext, $"sample-shipping:{orderId}", token);
                await transportationKits.RequestPhasesAsync(order, tenant.Actor.Id, body, token);
                return await transportationKits.PhaseWorkspaceAsync(order, tenant.IsDepartmentAdmin, body.DeliveryLocationId, token);
            }, cancellationToken: ct, concurrencyScope: $"lab-order:{orderId}:sample-roster");
        return execution.Response;
    }
}
