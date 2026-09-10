namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record LocationStockKitDto(Guid StockKitId, string KitNumber, ShipmentContainerDto Container,
    long Version, string Status, Guid? DeliveryLocationId, Guid? RequestId, Guid? OriginatingJobId,
    string? OriginatingJobNumber, Guid? AssignedJobId, string? AssignedJobNumber, Guid? ReservedShipmentId,
    Guid? BoundShipmentId, DateTime? DispatchedAt, DateTime? ReceivedAt);
public sealed record LocationTransportationKitInventoryDto(CustomerDeliveryLocationDto Location,
    IReadOnlyList<LocationStockKitDto> Kits, IReadOnlyList<TransportationKitRequestDto> Requests, bool CanManageInventory);
public sealed record StockKitSelectionRequest(Guid StockKitId, long Version);
public sealed record ReceiveLocationStockKitsRequest(IReadOnlyList<StockKitSelectionRequest> Kits);
