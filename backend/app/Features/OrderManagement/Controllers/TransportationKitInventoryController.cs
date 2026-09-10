namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

[ApiController, Authorize]
[Route("api/customer-delivery-locations/{locationId:guid}/transportation-kits")]
public sealed class TransportationKitInventoryController(OrderRequestContext context, OrderIdempotencyService idempotency,
    TransportationKitRequestService service) : ControllerBase
{
    [HttpGet]
    public async Task<LocationTransportationKitInventoryDto> Read(Guid locationId, CancellationToken ct)
        => await service.LocationInventoryAsync(locationId, await context.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, ct), ct);

    [HttpPost("received")]
    public async Task<LocationTransportationKitInventoryDto> Receive(Guid locationId, [FromBody] ReceiveLocationStockKitsRequest body, CancellationToken ct)
    {
        var tenant = await context.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, ct);
        var result = await idempotency.ExecuteAsync(tenant.Actor.Id, $"location-inventory:{locationId}:received", idempotency.RequireKey(HttpContext), body,
            token => service.ReceiveLocationAsync(locationId, tenant, body, token), cancellationToken: ct);
        return result.Response;
    }
}
