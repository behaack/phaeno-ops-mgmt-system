namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record RecordedTransportationKitStockDto(Guid ContainerDefinitionId, int AvailableQuantity, int InTransitQuantity);
public sealed record ShipmentKitSupplyDto(Guid ShipmentId, long ShipmentVersion, Guid JobId, string JobNumber,
    int TubeCount, Guid? DeliveryLocationId, IReadOnlyList<CustomerDeliveryLocationDto> Locations,
    ContainerPackingPreviewDto Recommendation, IReadOnlyList<RecordedTransportationKitStockDto> RecordedStock,
    string InventoryStatus, TransportationKitRequestDto? Request, bool CanRequestKits, string? RequestBlockedReason,
    bool CanPrepareSamples, string? PreparationBlockedReason);
public sealed record TransportationKitRequestLineDto(Guid Id, Guid ContainerDefinitionId, string Sku, string CommonName,
    int TubeCapacity, int RequestedQuantity, int DispatchedQuantity, int ReceivedQuantity);
public sealed record TransportationKitDispatchDto(Guid StockKitId, string KitNumber, Guid RequestLineId,
    Guid ContainerDefinitionId, string OutboundCarrier, string OutboundTrackingNumber, DateTime DispatchedAt, DateTime? ReceivedAt);
public sealed record TransportationKitRequestDto(Guid Id, Guid JobId, string JobNumber, Guid OrganizationId,
    Guid DepartmentId, Guid DeliveryLocationId, CustomerDeliveryLocationDto DeliveryAddress, string Status,
    DateTime RequestedAt, long Version, bool IncludedInLabOrder, IReadOnlyList<TransportationKitRequestLineDto> Lines,
    IReadOnlyList<TransportationKitDispatchDto> Kits, bool CanConfirmReceipt, bool CanCancel, string? CancellationReason,
    string OrganizationName, string DepartmentName);
public sealed record AvailableTransportationStockKitDto(Guid Id, string KitNumber, Guid ContainerDefinitionId,
    string Sku, string CommonName, int TubeCapacity, long Version);
public sealed record TransportationKitRequestDetailDto(TransportationKitRequestDto Request,
    IReadOnlyList<AvailableTransportationStockKitDto> AvailableStockKits, bool CanDispatch, string? DispatchBlockedReason);
public sealed record CreateTransportationKitRequest(long ShipmentVersion, Guid DeliveryLocationId,
    long DeliveryLocationVersion, IReadOnlyList<ContainerQuantityRequest> Containers);
public sealed record DispatchTransportationKitsRequest(long Version, IReadOnlyList<Guid> StockKitIds,
    string OutboundCarrier, string OutboundTrackingNumber, DateTime FulfilledAt);
public sealed record ReceiveTransportationKitsRequest(long Version, IReadOnlyList<Guid> StockKitIds);
public sealed record CancelTransportationKitRequest(long Version, string? Reason = null);
