namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController, Authorize]
public sealed class TransportationKitRequestsController(OrderRequestContext context,
    OrderIdempotencyService idempotency, TransportationKitRequestService service) : ControllerBase
{
    [HttpGet("api/sample-shipping/{shipmentId:guid}/kit-supply")]
    public async Task<ShipmentKitSupplyDto> Supply(Guid shipmentId, [FromQuery] Guid? deliveryLocationId, CancellationToken ct)
        => await service.SupplyAsync(shipmentId, await context.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, ct), deliveryLocationId, ct);

    [HttpPost("api/sample-shipping/{shipmentId:guid}/kit-requests")]
    public async Task<TransportationKitRequestDto> Create(Guid shipmentId, [FromBody] CreateTransportationKitRequest body, CancellationToken ct)
    {
        var tenant = await context.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, ct);
        var shipment = await service.ShipmentAsync(shipmentId, tenant, ct);
        var result = await idempotency.ExecuteAsync(tenant.Actor.Id, $"transportation-kits:{shipment.AuthorizationSourceId}:request",
            idempotency.RequireKey(HttpContext), body, token => service.CreateAsync(shipmentId, tenant, body, token),
            cancellationToken: ct, concurrencyScope: $"lab-order:{shipment.AuthorizationSourceId}");
        return result.Response;
    }
    [HttpPost("api/transportation-kit-requests/{id:guid}/received")]
    public async Task<TransportationKitRequestDto> Receive(Guid id, [FromBody] ReceiveTransportationKitsRequest body, CancellationToken ct)
    {
        var tenant = await context.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, ct);
        await service.LoadAsync(id, tenant.Organization.Id, tenant.Department.Id, ct);
        var result = await idempotency.ExecuteAsync(tenant.Actor.Id, $"transportation-kits:{id}:received", idempotency.RequireKey(HttpContext), body,
            token => service.ReceiveAsync(id, tenant, body, token), cancellationToken: ct);
        return result.Response;
    }
    [HttpPost("api/transportation-kit-requests/{id:guid}/cancel")]
    public async Task<TransportationKitRequestDto> Cancel(Guid id, [FromBody] CancelTransportationKitRequest body, CancellationToken ct)
    {
        var tenant = await context.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, ct);
        await service.LoadAsync(id, tenant.Organization.Id, tenant.Department.Id, ct);
        var result = await idempotency.ExecuteAsync(tenant.Actor.Id, $"transportation-kits:{id}:cancel", idempotency.RequireKey(HttpContext), body,
            token => service.CancelAsync(id, tenant.Organization.Id, tenant.Department.Id, tenant.Actor.Id, false, body, token), cancellationToken: ct);
        return result.Response;
    }
}

[ApiController, Authorize]
[Route("api/platform/sample-shipping/kit-requests")]
public sealed class PlatformTransportationKitRequestsController(PSeqOperationsDbContext db, OrderRequestContext context,
    OrderIdempotencyService idempotency, TransportationKitRequestService service) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<TransportationKitRequestDto>> List([FromQuery] string? status, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var query = db.TransportationKitRequests.AsNoTracking().Include(item => item.Lines).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<TransportationKitRequestStatus>(status, true, out var parsed))
                throw new OrderManagementException("transportation_kit_status_invalid", "Choose a supported request status.");
            query = query.Where(item => item.Status == parsed);
        }
        var requests = await query.OrderBy(item => item.ClosedAt.HasValue).ThenByDescending(item => item.RequestedAt).ToListAsync(ct);
        return await service.MapManyAsync(requests, false, true, ct);
    }
    [HttpGet("{id:guid}")]
    public async Task<TransportationKitRequestDetailDto> Read(Guid id, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        return await service.DetailAsync(await service.LoadAsync(id, null, null, ct), ct);
    }
    [HttpPost("{id:guid}/dispatch")]
    public async Task<TransportationKitRequestDetailDto> Dispatch(Guid id, [FromBody] DispatchTransportationKitsRequest body, CancellationToken ct)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        var request = await service.LoadAsync(id, null, null, ct);
        var result = await idempotency.ExecuteAsync(actor.Id, $"transportation-kits:{id}:dispatch", idempotency.RequireKey(HttpContext), body,
            token => service.DispatchAsync(id, actor.Id, body, token), cancellationToken: ct, concurrencyScope: $"lab-order:{request.LabServiceOrderId}");
        return result.Response;
    }
    [HttpPost("{id:guid}/cancel")]
    public async Task<TransportationKitRequestDto> Cancel(Guid id, [FromBody] CancelTransportationKitRequest body, CancellationToken ct)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        await service.LoadAsync(id, null, null, ct);
        var result = await idempotency.ExecuteAsync(actor.Id, $"transportation-kits:{id}:cancel", idempotency.RequireKey(HttpContext), body,
            token => service.CancelAsync(id, null, null, actor.Id, true, body, token), cancellationToken: ct);
        return result.Response;
    }
}
