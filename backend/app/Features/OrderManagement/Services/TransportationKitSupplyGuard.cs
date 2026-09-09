namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class TransportationKitSupplyGuard
{
    public static async Task<string?> PreparationBlockAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
    {
        var bound = await db.SampleShippingStockKits.AsNoTracking().SingleOrDefaultAsync(kit => kit.BoundSampleShipmentId == shipment.Id, ct);
        if (bound is not null) return bound.TransportationKitRequestLineId.HasValue && !bound.CustomerReceivedAt.HasValue
            ? "Confirm receipt of this transportation kit before preparing samples." : null;
        if (shipment.ReturnKit is not null) return null;
        if (!await HasRequestsAsync(db, shipment, ct)) return null;
        var counts = await PlanningCountsAsync(db, shipment, ct);
        var hasReceived = counts.Any(item => item.Value > 0 && (!shipment.ContainerDefinitionId.HasValue
            || item.Key == shipment.ContainerDefinitionId));
        return hasReceived ? null : "Confirm receipt of the ordered transportation kits before preparing samples. Kits on the way are not yet available.";
    }
    public static async Task EnsurePackingAsync(PSeqOperationsDbContext db, SampleShipment shipment,
        IReadOnlyList<ContainerQuantityRequest> selection, CancellationToken ct)
    {
        if (!await HasRequestsAsync(db, shipment, ct)) return;
        var available = await PlanningCountsAsync(db, shipment, ct);
        foreach (var item in selection.Where(item => item.Quantity > 0))
            if (item.Quantity > available.GetValueOrDefault(item.ContainerDefinitionId))
                throw new OrderManagementException("transportation_kit_receipt_required",
                    "Confirm receipt of enough transportation kits for these containers. Kits already allocated to other sample shipments are unavailable.", 409);
    }
    public static async Task<IReadOnlyList<ContainerQuantityRequest>?> LimitAvailabilityAsync(PSeqOperationsDbContext db,
        SampleShipment shipment, IReadOnlyList<SampleShippingContainerDefinitionDto> definitions,
        IReadOnlyList<ContainerQuantityRequest>? supplied, CancellationToken ct)
    {
        if (!await HasRequestsAsync(db, shipment, ct)) return supplied;
        if (supplied is not null && (supplied.Select(item => item.ContainerDefinitionId).Distinct().Count() != supplied.Count
            || supplied.Any(item => item.Quantity < 0 || !definitions.Any(definition => definition.Id == item.ContainerDefinitionId))))
            throw new OrderManagementException("container_packing_invalid", "Enter each compatible container size once with a nonnegative available quantity.");
        var counts = await PlanningCountsAsync(db, shipment, ct);
        return definitions.Select(item => new ContainerQuantityRequest(item.Id,
            Math.Min(counts.GetValueOrDefault(item.Id), supplied?.FirstOrDefault(value => value.ContainerDefinitionId == item.Id)?.Quantity ?? int.MaxValue))).ToArray();
    }
    private static async Task<Dictionary<Guid, int>> PlanningCountsAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
    {
        var available = await AvailableAsync(db, shipment).Select(kit => kit.ContainerDefinitionId).ToListAsync(ct);
        var alreadyPrepared = await db.SampleShipments.AsNoTracking().Where(item => item.Id != shipment.Id
            && item.OrganizationId == shipment.OrganizationId && item.DepartmentId == shipment.DepartmentId
            && item.AuthorizationSource == shipment.AuthorizationSource && item.AuthorizationSourceId == shipment.AuthorizationSourceId
            && item.Status == SampleShipmentStatus.Preparing && item.ContainerDefinitionId.HasValue && item.ReturnKit == null
            && item.Items.Any()).Select(item => item.ContainerDefinitionId!.Value).ToListAsync(ct);
        return available.Distinct().ToDictionary(id => id, id => Math.Max(0, available.Count(value => value == id) - alreadyPrepared.Count(value => value == id)));
    }
    public static async Task EnsureBoundReceiptAsync(PSeqOperationsDbContext db, Guid shipmentId, CancellationToken ct)
    {
        if (await db.SampleShippingStockKits.AnyAsync(kit => kit.BoundSampleShipmentId == shipmentId
            && kit.TransportationKitRequestLineId.HasValue && !kit.CustomerReceivedAt.HasValue, ct))
            throw new OrderManagementException("transportation_kit_receipt_required", "Confirm receipt of the transportation kit before shipping samples.", 409);
    }
    private static Task<bool> HasRequestsAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
        => db.TransportationKitRequests.AnyAsync(item => item.OrganizationId == shipment.OrganizationId
            && item.DepartmentId == shipment.DepartmentId && item.LabServiceOrderId == shipment.AuthorizationSourceId
            && item.Status != TransportationKitRequestStatus.Cancelled, ct);
    private static IQueryable<SampleShippingStockKit> AvailableAsync(PSeqOperationsDbContext db, SampleShipment shipment)
        => db.SampleShippingStockKits.AsNoTracking().Where(kit => kit.OrganizationId == shipment.OrganizationId
            && kit.DepartmentId == shipment.DepartmentId && kit.AuthorizationSource == shipment.AuthorizationSource
            && kit.AuthorizationSourceId == shipment.AuthorizationSourceId && kit.TransportationKitRequestLineId.HasValue
            && kit.CustomerDeliveryLocationId == db.TransportationKitRequests
                .Where(request => request.OrganizationId == shipment.OrganizationId && request.DepartmentId == shipment.DepartmentId
                    && request.LabServiceOrderId == shipment.AuthorizationSourceId && request.Status != TransportationKitRequestStatus.Cancelled)
                .OrderByDescending(request => request.RequestedAt).ThenByDescending(request => request.Id)
                .Select(request => (Guid?)request.DeliveryLocationId).FirstOrDefault()
            && kit.CustomerReceivedAt.HasValue && !kit.BoundSampleShipmentId.HasValue);
}
