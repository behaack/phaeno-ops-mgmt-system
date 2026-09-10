namespace PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed record LabShipmentQueueItemDto(Guid Id, string ShipmentNumber, string OrganizationName,
    string AuthorizationReference, Guid LabWorkOrderId, string DestinationName, string Status,
    string? Carrier, string? TrackingNumber, DateTime? ShippedAt, DateTime? ContainerReceivedAt,
    string? PacketBarcode, string? PacketNumber, int ExpectedTubeCount, int AccessionedTubeCount);

public sealed record LabShipmentReceiptRequest(string Barcode);
public sealed record LabShipmentReceiptDto(Guid ShipmentId, string ShipmentNumber, string Barcode,
    DateTime ReceivedAt, bool AlreadyReceived);
