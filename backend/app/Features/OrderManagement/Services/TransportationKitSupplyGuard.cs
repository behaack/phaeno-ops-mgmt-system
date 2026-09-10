namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class TransportationKitSupplyGuard
{
    // Retained internal name for legacy callers: the Customer branch now requires received location inventory.
    public static Task<bool> RequiresOrderedKitsAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
        => shipment.AuthorizationSource != SampleShipmentAuthorizationSource.CustomerLabServiceOrder ? Task.FromResult(false)
            : db.LabServiceOrders.AsNoTracking().AnyAsync(job => job.Id == shipment.AuthorizationSourceId
                && job.OrganizationId == shipment.OrganizationId && job.DepartmentId == shipment.DepartmentId && job.AcceptedQuoteId.HasValue
                && db.Organizations.Any(org => org.Id == job.OrganizationId && org.Kind == OrganizationKind.Customer), ct);

    public static async Task<string?> PreparationBlockAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct, Guid? locationId = null)
    {
        if (shipment.Status == SampleShipmentStatus.Cancelled)
            return "This container configuration has been replaced. Open the current tubes awaiting containers to continue.";
        var bound = await db.SampleShippingStockKits.AsNoTracking().SingleOrDefaultAsync(kit => kit.BoundSampleShipmentId == shipment.Id, ct);
        if (bound is not null) return bound.TransportationKitRequestLineId.HasValue && !bound.CustomerReceivedAt.HasValue
            ? "Confirm receipt of this transportation kit before preparing samples." : null;
        if (shipment.ReturnKit is not null) return null;
        if (!await RequiresOrderedKitsAsync(db, shipment, ct)) return null;
        if (shipment.Items.Count == 0) return "There are no tubes awaiting containers in this configuration. Open the current preparation pool.";
        var job = await db.LabServiceOrders.AsNoTracking().SingleAsync(item => item.Id == shipment.AuthorizationSourceId, ct);
        if (TransportationKitRequestService.JobBlock(job) is { } jobReason) return jobReason;
        var reserved = await db.SampleShippingStockKits.AsNoTracking().SingleOrDefaultAsync(kit => kit.ReservedSampleShipmentId == shipment.Id, ct);
        if (reserved is not null) return reserved.CustomerReceivedAt.HasValue ? null : "Confirm receipt of the selected container before preparing samples.";
        locationId = await TransportationKitInventory.LocationAsync(db, shipment, locationId, ct);
        if (!locationId.HasValue) return "Choose a departure delivery location to view its available containers.";
        var options = await TransportationKitInventory.OptionsAsync(db, shipment, locationId, ct);
        return options.Count > 0 ? null : "No compatible received containers are available at this location. Order transportation kits or confirm the containers that have arrived.";
    }
    public static async Task EnsurePreparationAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
    {
        if (await PreparationBlockAsync(db, shipment, ct) is { } reason)
            throw new OrderManagementException("transportation_kit_unavailable", reason, 409);
    }
    public static async Task EnsureRequestFulfillmentAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
    {
        if (await RequiresOrderedKitsAsync(db, shipment, ct))
            throw new OrderManagementException("transportation_kit_order_required", "Dispatch a registered container to the Customer's delivery location, then reserve it during preparation.", 409);
    }
    public static async Task EnsureOrderedStockAsync(PSeqOperationsDbContext db, SampleShipment shipment, SampleShippingStockKit kit, CancellationToken ct)
    {
        if (await RequiresOrderedKitsAsync(db, shipment, ct) && (kit.ReservedSampleShipmentId != shipment.Id
            || kit.OrganizationId != shipment.OrganizationId || kit.DepartmentId != shipment.DepartmentId
            || kit.CustomerDeliveryLocationId != shipment.DepartureDeliveryLocationId || !kit.CustomerReceivedAt.HasValue))
            throw new OrderManagementException("container_reservation_required", "Scan a tube belonging to the physical container assigned to this shipment.", 409);
    }
    public static async Task EnsurePackingAsync(PSeqOperationsDbContext db, SampleShipment shipment,
        IReadOnlyList<ContainerQuantityRequest> selection, CancellationToken ct, Guid? locationId = null)
    {
        if (!await RequiresOrderedKitsAsync(db, shipment, ct)) return;
        if (await PreparationBlockAsync(db, shipment, ct, locationId) is { } reason)
            throw new OrderManagementException("transportation_kit_unavailable", reason, 409);
        locationId = await TransportationKitInventory.LocationAsync(db, shipment, locationId, ct);
        var available = await TransportationKitInventory.Available(db, shipment, locationId).Select(item => item.ContainerDefinitionId).ToArrayAsync(ct);
        foreach (var item in selection.Where(item => item.Quantity > 0))
            if (item.Quantity > available.Count(id => id == item.ContainerDefinitionId))
                throw new OrderManagementException("container_unavailable", "A selected container is no longer available at this location. Refresh and review the containers.", 409);
    }
    public static async Task<IReadOnlyList<ContainerQuantityRequest>?> LimitAvailabilityAsync(PSeqOperationsDbContext db,
        SampleShipment shipment, IReadOnlyList<SampleShippingContainerDefinitionDto> definitions,
        IReadOnlyList<ContainerQuantityRequest>? supplied, CancellationToken ct, Guid? locationId = null)
    {
        if (!await RequiresOrderedKitsAsync(db, shipment, ct)) return supplied;
        if (supplied is not null && (supplied.Select(item => item.ContainerDefinitionId).Distinct().Count() != supplied.Count
            || supplied.Any(item => item.Quantity < 0 || !definitions.Any(definition => definition.Id == item.ContainerDefinitionId))))
            throw new OrderManagementException("container_packing_invalid", "Enter each compatible container size once with a nonnegative available quantity.");
        locationId = await TransportationKitInventory.LocationAsync(db, shipment, locationId, ct);
        var available = await TransportationKitInventory.Available(db, shipment, locationId).Select(item => item.ContainerDefinitionId).ToArrayAsync(ct);
        return definitions.Select(item => new ContainerQuantityRequest(item.Id, Math.Min(available.Count(id => id == item.Id),
            supplied?.FirstOrDefault(value => value.ContainerDefinitionId == item.Id)?.Quantity ?? int.MaxValue))).ToArray();
    }
    public static async Task EnsureBoundReceiptAsync(PSeqOperationsDbContext db, Guid shipmentId, CancellationToken ct)
    {
        var shipment = await db.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Include(item => item.ReturnKit).SingleAsync(item => item.Id == shipmentId, ct);
        await EnsurePreparationAsync(db, shipment, ct);
    }
}
