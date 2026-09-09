namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class SampleShippingStockKit : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string KitNumber { get; private set; } = null!;
    public Guid ContainerDefinitionId { get; private set; }
    public string ContainerSnapshotJson { get; private set; } = null!;
    public int TubeCapacity { get; private set; }
    public string TubeSupplierName { get; private set; } = null!;
    public string TubeProductNumber { get; private set; } = null!;
    public string? TubeLotNumber { get; private set; }
    public string ShipperSupplierName { get; private set; } = null!;
    public string ShipperProductNumber { get; private set; } = null!;
    public Guid? OrganizationId { get; private set; }
    public Guid? DepartmentId { get; private set; }
    public SampleShipmentAuthorizationSource? AuthorizationSource { get; private set; }
    public Guid? AuthorizationSourceId { get; private set; }
    public Guid? BoundSampleShipmentId { get; private set; }
    public Guid? TransportationKitRequestLineId { get; private set; }
    public Guid? CustomerDeliveryLocationId { get; private set; }
    public DateTime? CustomerReceivedAt { get; private set; }
    public Guid? CustomerReceivedByUserId { get; private set; }
    public string? OutboundCarrier { get; private set; }
    public string? OutboundTrackingNumber { get; private set; }
    public DateTime? FulfilledAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<SampleShippingStockTube> Tubes { get; private set; } = [];

    private SampleShippingStockKit() { }

    public SampleShippingStockKit(string kitNumber, Guid definitionId, string snapshotJson, int tubeCapacity,
        string tubeSupplierName, string tubeProductNumber, string? tubeLotNumber,
        string shipperSupplierName, string shipperProductNumber)
    {
        if (definitionId == Guid.Empty) throw new ArgumentException("Select a container type.");
        if (tubeCapacity is < 1 or > 10_000) throw new ArgumentOutOfRangeException(nameof(tubeCapacity));
        KitNumber = SampleShippingText.Reference(kitNumber, nameof(kitNumber));
        ContainerDefinitionId = definitionId;
        ContainerSnapshotJson = OrderText.Json(snapshotJson);
        TubeCapacity = tubeCapacity;
        TubeSupplierName = OrderText.Required(tubeSupplierName, nameof(tubeSupplierName), 255);
        TubeProductNumber = SampleShippingText.ProductNumber(tubeProductNumber, nameof(tubeProductNumber));
        TubeLotNumber = OrderText.Optional(tubeLotNumber, 100);
        ShipperSupplierName = OrderText.Required(shipperSupplierName, nameof(shipperSupplierName), 255);
        ShipperProductNumber = SampleShippingText.ProductNumber(shipperProductNumber, nameof(shipperProductNumber));
    }

    public void Dispatch(SampleShipment jobContext, string carrier, string trackingNumber, DateTime fulfilledAt)
    {
        if (FulfilledAt.HasValue || OrganizationId.HasValue)
            throw new InvalidOperationException("This kit has already been dispatched.");
        if (Tubes.Count != TubeCapacity || Tubes.Select(tube => tube.SupplierBarcode).Distinct().Count() != TubeCapacity)
            throw new InvalidOperationException($"Register exactly {TubeCapacity} unique tubes before dispatch.");
        if (jobContext.Status == SampleShipmentStatus.Cancelled)
            throw new InvalidOperationException("Choose an active authorized job.");
        if (fulfilledAt.Kind != DateTimeKind.Utc || fulfilledAt > DateTime.UtcNow.AddMinutes(5)
            || fulfilledAt < CreatedAt.AddMinutes(-1))
            throw new ArgumentException("Enter a valid dispatch time after the kit was prepared.");
        OutboundCarrier = OrderText.Required(carrier, nameof(carrier), 255);
        OutboundTrackingNumber = OrderText.Required(trackingNumber, nameof(trackingNumber), 255);
        OrganizationId = jobContext.OrganizationId;
        DepartmentId = jobContext.DepartmentId;
        AuthorizationSource = jobContext.AuthorizationSource;
        AuthorizationSourceId = jobContext.AuthorizationSourceId;
        FulfilledAt = fulfilledAt;
    }

    public void Bind(SampleShipment shipment)
    {
        if (!FulfilledAt.HasValue || BoundSampleShipmentId.HasValue)
            throw new InvalidOperationException("The kit must be dispatched and unused.");
        if (TransportationKitRequestLineId.HasValue && !CustomerReceivedAt.HasValue)
            throw new InvalidOperationException("Confirm receipt of the transportation kit before preparing its sample shipment.");
        if (shipment.OrganizationId != OrganizationId || shipment.DepartmentId != DepartmentId
            || shipment.AuthorizationSource != AuthorizationSource || shipment.AuthorizationSourceId != AuthorizationSourceId
            || shipment.ContainerDefinitionId != ContainerDefinitionId)
            throw new InvalidOperationException("This kit does not match the selected job and container type.");
        BoundSampleShipmentId = shipment.Id;
    }

    public void LinkTransportationRequest(TransportationKitRequest request, TransportationKitRequestLine line)
    {
        if (TransportationKitRequestLineId.HasValue || !FulfilledAt.HasValue || BoundSampleShipmentId.HasValue
            || line.TransportationKitRequestId != request.Id || line.ContainerDefinitionId != ContainerDefinitionId
            || request.OrganizationId != OrganizationId || request.DepartmentId != DepartmentId
            || request.LabServiceOrderId != AuthorizationSourceId || AuthorizationSource != SampleShipmentAuthorizationSource.CustomerLabServiceOrder)
            throw new InvalidOperationException("Dispatch this unused kit for the matching transportation-kit request.");
        TransportationKitRequestLineId = line.Id; CustomerDeliveryLocationId = request.DeliveryLocationId;
    }
    public void ConfirmCustomerReceipt(Guid actorUserId, DateTime utcNow)
    {
        if (!TransportationKitRequestLineId.HasValue || !FulfilledAt.HasValue || actorUserId == Guid.Empty
            || utcNow.Kind != DateTimeKind.Utc || utcNow < FulfilledAt.Value)
            throw new InvalidOperationException("Only a dispatched transportation kit can be acknowledged as received.");
        if (CustomerReceivedAt.HasValue) return;
        CustomerReceivedAt = utcNow; CustomerReceivedByUserId = actorUserId;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleShippingStockTube
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleShippingStockKitId { get; private set; }
    public string SupplierBarcode { get; private set; } = null!;
    private SampleShippingStockTube() { }
    public SampleShippingStockTube(Guid kitId, string supplierBarcode)
    {
        if (kitId == Guid.Empty) throw new ArgumentException("Choose a stock kit.");
        if (!SupplierTubeBarcode.TryNormalize(supplierBarcode, out var normalized))
            throw new ArgumentException("Scan a complete tube barcode.");
        SampleShippingStockKitId = kitId;
        SupplierBarcode = normalized;
    }
}
