namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class TransportationKitInventory
{
    public static IQueryable<SampleShippingStockKit> AtLocation(PSeqOperationsDbContext db, Guid organizationId, Guid departmentId, Guid? locationId)
        => db.SampleShippingStockKits.AsNoTracking().Where(kit => locationId.HasValue && kit.OrganizationId == organizationId
            && kit.DepartmentId == departmentId && kit.CustomerDeliveryLocationId == locationId && kit.FulfilledAt.HasValue);
    public static IQueryable<SampleShippingStockKit> Available(PSeqOperationsDbContext db, SampleShipment shipment, Guid? locationId)
        => AtLocation(db, shipment.OrganizationId, shipment.DepartmentId, locationId).Where(kit => kit.CustomerReceivedAt.HasValue
            && !kit.ReservedSampleShipmentId.HasValue && !kit.BoundSampleShipmentId.HasValue);
    public static async Task<IReadOnlyList<CustomerDeliveryLocationDto>> LocationsAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
        => (await db.CustomerDeliveryLocations.AsNoTracking().Where(item => item.OrganizationId == shipment.OrganizationId
                && item.DepartmentId == shipment.DepartmentId && item.IsActive)
            .OrderByDescending(item => item.IsDefault).ThenBy(item => item.Label).ToListAsync(ct)).Select(item => item.ToDto()).ToArray();
    public static async Task<Guid?> LocationAsync(PSeqOperationsDbContext db, SampleShipment shipment, Guid? requested, CancellationToken ct)
    {
        var locations = await LocationsAsync(db, shipment, ct);
        var location = requested ?? shipment.DepartureDeliveryLocationId ?? locations.FirstOrDefault(item => item.IsDefault)?.Id
            ?? (locations.Count == 1 ? locations[0].Id : null);
        if (location.HasValue && !locations.Any(item => item.Id == location))
            throw new OrderManagementException("transportation_location_not_found", "Choose an active delivery location in your department.", 404);
        return location;
    }
    public static async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> OptionsAsync(PSeqOperationsDbContext db,
        SampleShipment shipment, Guid? locationId, CancellationToken ct)
    {
        if (shipment.Items.Count == 0) return [];
        var ids = await Available(db, shipment, locationId).Select(item => item.ContainerDefinitionId).Distinct().ToArrayAsync(ct);
        return await new SampleShippingContainerCatalogService(db).ReadStockCompatibleAsync(
            await SampleShippingPackingData.ContextsAsync(db, shipment, ct), ids, ct);
    }
    public static async Task<IReadOnlyList<LocationStockKitDto>> MapAsync(PSeqOperationsDbContext db,
        IReadOnlyList<SampleShippingStockKit> kits, CancellationToken ct)
    {
        var lineIds = kits.Where(item => item.TransportationKitRequestLineId.HasValue).Select(item => item.TransportationKitRequestLineId!.Value).Distinct().ToArray();
        var lines = await db.TransportationKitRequestLines.AsNoTracking().Where(item => lineIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.TransportationKitRequestId, ct);
        var shipmentIds = kits.Select(item => item.BoundSampleShipmentId ?? item.ReservedSampleShipmentId).Where(item => item.HasValue).Select(item => item!.Value).Distinct().ToArray();
        var assignments = await db.SampleShipments.AsNoTracking().Where(item => shipmentIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => new { item.AuthorizationSourceId, item.AuthorizationReference }, ct);
        var originIds = kits.Where(item => item.AuthorizationSourceId.HasValue).Select(item => item.AuthorizationSourceId!.Value).Distinct().ToArray();
        var origins = await db.LabServiceOrders.AsNoTracking().Where(item => originIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.OrderNumber, ct);
        return kits.Select(kit =>
        {
            var assignedId = kit.BoundSampleShipmentId ?? kit.ReservedSampleShipmentId;
            var assigned = assignedId.HasValue ? assignments.GetValueOrDefault(assignedId.Value) : null;
            return new LocationStockKitDto(kit.Id, kit.KitNumber, SampleShippingPackingData.Container(kit.ContainerSnapshotJson)!, kit.Version,
                Status(kit), kit.CustomerDeliveryLocationId, kit.TransportationKitRequestLineId.HasValue ? lines.GetValueOrDefault(kit.TransportationKitRequestLineId.Value) : null,
                kit.AuthorizationSourceId, kit.AuthorizationSourceId.HasValue ? origins.GetValueOrDefault(kit.AuthorizationSourceId.Value) : null,
                assigned?.AuthorizationSourceId, assigned?.AuthorizationReference, kit.ReservedSampleShipmentId, kit.BoundSampleShipmentId,
                kit.FulfilledAt, kit.CustomerReceivedAt);
        }).ToArray();
    }
    public static string Status(SampleShippingStockKit kit) => kit.BoundSampleShipmentId.HasValue ? "InUse"
        : kit.ReservedSampleShipmentId.HasValue ? "Assigned" : !kit.FulfilledAt.HasValue ? "Preparing"
        : !kit.CustomerDeliveryLocationId.HasValue ? "NeedsReview" : kit.CustomerReceivedAt.HasValue ? "Available" : "OnTheWay";

    public static async Task ReleaseAsync(PSeqOperationsDbContext db, IReadOnlyList<Guid> shipmentIds, CancellationToken ct)
    {
        var ids = await db.SampleShippingStockKits.AsNoTracking().Where(item => item.ReservedSampleShipmentId.HasValue
            && shipmentIds.Contains(item.ReservedSampleShipmentId.Value) && !item.BoundSampleShipmentId.HasValue)
            .Select(item => item.Id).Order().ToArrayAsync(ct);
        foreach (var id in ids) await SampleShippingPackingData.LockAsync(db, $"stock-kit:{id}", ct);
        var kits = await db.SampleShippingStockKits.Where(item => ids.Contains(item.Id)).ToArrayAsync(ct);
        foreach (var kit in kits)
        {
            await db.Entry(kit).ReloadAsync(ct);
            if (kit.BoundSampleShipmentId.HasValue) throw new OrderManagementException("container_in_use", "Tube scanning has started; this container cannot be released.", 409);
            kit.ReleaseReservation();
        }
    }
}
