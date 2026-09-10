namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class TransportationKitRequestService
{
    public async Task DispatchLocationAsync(Guid kitId, Guid actorId, DispatchStockKitRequest body, CancellationToken ct)
    {
        var locationId = body.DeliveryLocationId ?? throw Invalid("Choose a Customer delivery location.");
        var location = await db.CustomerDeliveryLocations.AsNoTracking().SingleOrDefaultAsync(item => item.Id == locationId, ct) ?? throw Missing();
        if (body.RequestId.HasValue)
        {
            var source = await LoadAsync(body.RequestId.Value, location.OrganizationId, location.DepartmentId, ct);
            if (source.DeliveryLocationId != locationId) throw Conflict("The selected request has a different delivery location.");
            await SampleShippingPackingData.LockAsync(db, $"sample-shipping:{source.LabServiceOrderId}", ct);
            var request = await FreshRequestAsync(source.Id, location.OrganizationId, location.DepartmentId, ct);
            await SampleShippingPackingData.LockAsync(db, $"stock-kit:{kitId}", ct);
            var kit = await db.SampleShippingStockKits.SingleOrDefaultAsync(item => item.Id == kitId, ct) ?? throw Missing();
            await db.Entry(kit).ReloadAsync(ct);
            if (kit.TransportationKitRequestLineId.HasValue)
            {
                if (!request.Lines.Any(item => item.Id == kit.TransportationKitRequestLineId)) throw Conflict("This container fulfilled another request.");
                EnsureLocationDispatchMatches(kit, request.OrganizationId, request.DepartmentId, locationId,
                    body.OutboundCarrier, body.OutboundTrackingNumber, body.FulfilledAt);
                return;
            }
            Version(kit.Version, body.Version);
            await DispatchAsync(request.Id, actorId, new(request.Version, [kitId], body.OutboundCarrier, body.OutboundTrackingNumber, body.FulfilledAt), ct);
            return;
        }
        await SampleShippingPackingData.LockAsync(db, $"stock-kit:{kitId}", ct);
        var standalone = await db.SampleShippingStockKits.Include(item => item.Tubes).SingleOrDefaultAsync(item => item.Id == kitId, ct) ?? throw Missing();
        if (await db.TransportationKitRequests.AnyAsync(request => request.DeliveryLocationId == locationId && !request.ClosedAt.HasValue
            && request.Lines.Any(line => line.ContainerDefinitionId == standalone.ContainerDefinitionId), ct))
            throw Conflict("Choose the open transportation-kit request for this delivery location so fulfillment is recorded together.");
        if (standalone.FulfilledAt.HasValue)
        {
            if (standalone.TransportationKitRequestLineId.HasValue) throw Conflict("Review this container's existing request.");
            EnsureLocationDispatchMatches(standalone, location.OrganizationId, location.DepartmentId, locationId,
                body.OutboundCarrier, body.OutboundTrackingNumber, body.FulfilledAt);
            return;
        }
        Version(standalone.Version, body.Version);
        var definition = await catalog.ReadAsync(standalone.ContainerDefinitionId, ct);
        if (!definition.IsActive || definition.DeactivatedAt.HasValue || definition.EffectiveFrom > DateTime.UtcNow)
            throw Conflict("This physical container revision has been withdrawn and cannot be dispatched.");
        Execute(() => standalone.DispatchToLocation(location, body.OutboundCarrier, body.OutboundTrackingNumber, body.FulfilledAt.ToUniversalTime()));
        await db.SaveChangesAsync(ct);
    }

    public async Task<LocationTransportationKitInventoryDto> LocationInventoryAsync(Guid locationId, OrderTenantContext tenant, CancellationToken ct)
    {
        // Inactive historical locations remain readable for receipt; they cannot be selected for new reservations.
        var location = await db.CustomerDeliveryLocations.AsNoTracking().SingleOrDefaultAsync(item => item.Id == locationId
            && item.OrganizationId == tenant.Organization.Id && item.DepartmentId == tenant.Department.Id, ct) ?? throw Missing();
        var kits = await TransportationKitInventory.AtLocation(db, tenant.Organization.Id, tenant.Department.Id, locationId)
            .OrderBy(item => item.KitNumber).ToArrayAsync(ct);
        var requests = await db.TransportationKitRequests.AsNoTracking().Include(item => item.Lines)
            .Where(item => item.DeliveryLocationId == locationId && item.OrganizationId == tenant.Organization.Id && item.DepartmentId == tenant.Department.Id)
            .OrderBy(item => item.ClosedAt.HasValue).ThenByDescending(item => item.RequestedAt).ToArrayAsync(ct);
        return new(location.ToDto(), await TransportationKitInventory.MapAsync(db, kits, ct),
            await MapManyAsync(requests, tenant.IsDepartmentAdmin, false, ct), tenant.IsDepartmentAdmin);
    }

    public async Task<LocationTransportationKitInventoryDto> ReceiveLocationAsync(Guid locationId, OrderTenantContext tenant,
        ReceiveLocationStockKitsRequest body, CancellationToken ct)
    {
        await LocationInventoryAsync(locationId, tenant, ct);
        if (body.Kits is null || body.Kits.Count == 0 || body.Kits.Any(item => item.Version < 1))
            throw Invalid("Choose the containers that arrived.");
        var ids = UniqueIds(body.Kits.Select(item => item.StockKitId).ToArray());
        var before = await TransportationKitInventory.AtLocation(db, tenant.Organization.Id, tenant.Department.Id, locationId)
            .Where(item => ids.Contains(item.Id)).ToArrayAsync(ct);
        if (before.Length != ids.Length) throw Missing();
        var lineIds = before.Where(item => item.TransportationKitRequestLineId.HasValue).Select(item => item.TransportationKitRequestLineId!.Value).ToArray();
        var requestIds = await db.TransportationKitRequestLines.Where(item => lineIds.Contains(item.Id))
            .Select(item => item.TransportationKitRequestId).Distinct().Order().ToArrayAsync(ct);
        var requests = new List<TransportationKitRequest>();
        foreach (var id in requestIds) requests.Add(await FreshRequestAsync(id, tenant.Organization.Id, tenant.Department.Id, ct));
        foreach (var id in ids.Order()) await SampleShippingPackingData.LockAsync(db, $"stock-kit:{id}", ct);
        var selected = await db.SampleShippingStockKits.Where(item => ids.Contains(item.Id)).ToArrayAsync(ct);
        var changed = new List<SampleShippingStockKit>();
        foreach (var kit in selected)
        {
            await db.Entry(kit).ReloadAsync(ct);
            if (kit.OrganizationId != tenant.Organization.Id || kit.DepartmentId != tenant.Department.Id || kit.CustomerDeliveryLocationId != locationId) throw Missing();
            if (kit.CustomerReceivedAt.HasValue) continue;
            Version(kit.Version, body.Kits.Single(item => item.StockKitId == kit.Id).Version);
            Execute(() => kit.ConfirmCustomerReceipt(tenant.Actor.Id, DateTime.UtcNow));
            changed.Add(kit);
        }
        foreach (var request in requests)
        {
            var ownIds = request.Lines.Select(item => item.Id).ToArray();
            var changedForRequest = changed.Where(kit => kit.TransportationKitRequestLineId.HasValue && ownIds.Contains(kit.TransportationKitRequestLineId.Value)).ToArray();
            if (changedForRequest.Length == 0) continue;
            var persisted = await RequestKitsAsync(request, ct);
            Execute(() => request.Reconcile(persisted.Where(kit => !selected.Any(item => item.Id == kit.Id)).Concat(selected.Where(kit => kit.TransportationKitRequestLineId.HasValue && ownIds.Contains(kit.TransportationKitRequestLineId.Value))).ToArray(), DateTime.UtcNow));
            db.Entry(request).Property(item => item.Version).IsModified = true;
            AddEvent(request, tenant.Actor.Id, "CustomerReceived", $"Customer confirmed receipt of {changedForRequest.Length} transportation kit(s).");
        }
        await db.SaveChangesAsync(ct);
        return await LocationInventoryAsync(locationId, tenant, ct);
    }
}
