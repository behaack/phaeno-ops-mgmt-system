namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record ShipmentContainerDto(Guid DefinitionId, string Sku, string CommonName, int Capacity);
public sealed record SampleOtherShipmentDto(Guid ShipmentId, string ShipmentNumber, int TubeCount);
public sealed record ShipmentPackingContextDto(Guid ShipmentId, long Version, int TubeCount,
    IReadOnlyList<SampleShippingContainerDefinitionDto> ContainerTypes, bool CanPack, string? BlockedReason);
public sealed record ShipmentPackingPreviewRequest(IReadOnlyList<ContainerQuantityRequest>? Availability = null,
    IReadOnlyList<ContainerQuantityRequest>? Selection = null);
public sealed record ConfirmShipmentPackingRequest(long Version, IReadOnlyList<ContainerQuantityRequest> Containers,
    IReadOnlyList<ContainerQuantityRequest>? Availability = null, IReadOnlyList<int>? ContainerTubeCounts = null);
public sealed record ShipmentPackingVersionDto(Guid ShipmentId, long Version);
public sealed record ShipmentPackingResetContextDto(bool CanReset, string? BlockedReason, int ContainerCount,
    int TubeCount, IReadOnlyList<ShipmentPackingVersionDto> Shipments);
public sealed record ShipmentPackingResetRequest(IReadOnlyList<ShipmentPackingVersionDto> Shipments);
public sealed record StockKitTubeDto(Guid Id, string SupplierBarcode);
public sealed record StockKitDto(Guid Id, string KitNumber, ShipmentContainerDto Container,
    string TubeSupplierName, string TubeProductNumber, string? TubeLotNumber,
    string ShipperSupplierName, string ShipperProductNumber, string Status,
    Guid? OrganizationId, Guid? AuthorizationSourceId, string? AuthorizationReference,
    Guid? BoundSampleShipmentId, string? OutboundCarrier, string? OutboundTrackingNumber,
    DateTime? FulfilledAt, long Version, IReadOnlyList<StockKitTubeDto> Tubes);
public sealed record CreateStockKitRequest(Guid ContainerDefinitionId, string TubeSupplierName,
    string TubeProductNumber, string? TubeLotNumber, string ShipperSupplierName, string ShipperProductNumber);
public sealed record DispatchStockKitRequest(Guid ShipmentId, long Version, string OutboundCarrier,
    string OutboundTrackingNumber, DateTime FulfilledAt);
