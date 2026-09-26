namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;
using System.Text.Json;

public sealed class SampleShippingStockKit : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string KitNumber { get; private set; } = null!;
    public Guid ContainerDefinitionId { get; private set; }
    public Guid? FinishedKitProductId { get; private set; }
    public Guid? AssemblyWorkflowRevisionId { get; private set; }
    public DateTime? AssemblyCompletedAt { get; private set; }
    public string ContainerSnapshotJson { get; private set; } = null!;
    public string? ProductExpirySnapshotJson { get; private set; }
    public DateTime? WithdrawnAt { get; private set; }
    public Guid? WithdrawnByUserId { get; private set; }
    public string? WithdrawalReason { get; private set; }
    public int TubeCapacity { get; private set; }
    public string TubeSupplierName { get; private set; } = null!;
    public string TubeBarcodeNamespace { get; private set; } = SupplierTubeBarcode.LegacyNamespace;
    public string TubeProductNumber { get; private set; } = null!;
    public string? TubeLotNumber { get; private set; }
    public string ShipperSupplierName { get; private set; } = null!;
    public string ShipperProductNumber { get; private set; } = null!;
    public Guid? TubeSupplierProductId { get; private set; }
    public Guid? ShipperSupplierProductId { get; private set; }
    public string? TubeProductDescription { get; private set; }
    public string? ShipperProductDescription { get; private set; }
    public Guid? OrganizationId { get; private set; }
    public Guid? DepartmentId { get; private set; }
    public SampleShipmentAuthorizationSource? AuthorizationSource { get; private set; }
    public Guid? AuthorizationSourceId { get; private set; }
    public Guid? BoundSampleShipmentId { get; private set; }
    public Guid? ReservedSampleShipmentId { get; private set; }
    public DateTime? ReservedAt { get; private set; }
    public Guid? ReservedByUserId { get; private set; }
    public Guid? TransportationKitRequestLineId { get; private set; }
    public Guid? CustomerDeliveryLocationId { get; private set; }
    public DateTime? CustomerReceivedAt { get; private set; }
    public Guid? CustomerReceivedByUserId { get; private set; }
    public string? OutboundCarrier { get; private set; }
    public string? OutboundTrackingNumber { get; private set; }
    public DateTime? FulfilledAt { get; private set; }
    public DateTime? TubesVerifiedAt { get; private set; }
    public Guid? TubesVerifiedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<SampleShippingStockTube> Tubes { get; private set; } = [];

    private SampleShippingStockKit() { }

    public SampleShippingStockKit(string kitNumber, Guid definitionId, string snapshotJson, int tubeCapacity,
        string tubeSupplierName, string tubeProductNumber, string? tubeLotNumber,
        string shipperSupplierName, string shipperProductNumber,
        Guid? tubeSupplierProductId = null, Guid? shipperSupplierProductId = null,
        string? tubeProductDescription = null, string? shipperProductDescription = null,
        string? productExpirySnapshotJson = null, string? tubeBarcodeNamespace = null,
        Guid? finishedKitProductId = null, Guid? assemblyWorkflowRevisionId = null)
    {
        if (definitionId == Guid.Empty) throw new ArgumentException("Select a container type.");
        if (tubeCapacity is < 1 or > 10_000) throw new ArgumentOutOfRangeException(nameof(tubeCapacity));
        KitNumber = SampleShippingText.Reference(kitNumber, nameof(kitNumber));
        ContainerDefinitionId = definitionId;
        FinishedKitProductId = finishedKitProductId;
        AssemblyWorkflowRevisionId = assemblyWorkflowRevisionId;
        ContainerSnapshotJson = OrderText.Json(snapshotJson);
        ProductExpirySnapshotJson = productExpirySnapshotJson is null ? null : OrderText.Json(productExpirySnapshotJson);
        TubeCapacity = tubeCapacity;
        TubeSupplierProductId = tubeSupplierProductId;
        ShipperSupplierProductId = shipperSupplierProductId;
        TubeProductDescription = OrderText.Optional(tubeProductDescription, 1000);
        ShipperProductDescription = OrderText.Optional(shipperProductDescription, 1000);
        TubeSupplierName = OrderText.Required(tubeSupplierName, nameof(tubeSupplierName), 255);
        TubeBarcodeNamespace = string.IsNullOrWhiteSpace(tubeBarcodeNamespace)
            ? SupplierTubeBarcode.LegacyNamespace : OrderText.Required(tubeBarcodeNamespace, nameof(tubeBarcodeNamespace), 50);
        TubeProductNumber = SampleShippingText.ProductNumber(tubeProductNumber, nameof(tubeProductNumber));
        TubeLotNumber = OrderText.Optional(tubeLotNumber, 100);
        ShipperSupplierName = OrderText.Required(shipperSupplierName, nameof(shipperSupplierName), 255);
        ShipperProductNumber = SampleShippingText.ProductNumber(shipperProductNumber, nameof(shipperProductNumber));
    }

    public void Dispatch(SampleShipment jobContext, string carrier, string trackingNumber, DateTime fulfilledAt)
    {
        EnsurePhysicallyUsable(DateTime.UtcNow);
        if (FulfilledAt.HasValue || OrganizationId.HasValue)
            throw new InvalidOperationException("This kit has already been dispatched.");
        EnsureVerifiedTubes();
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
        EnsurePhysicallyUsable(DateTime.UtcNow);
        if (!FulfilledAt.HasValue || BoundSampleShipmentId.HasValue)
            throw new InvalidOperationException("The kit must be dispatched and unused.");
        if (TransportationKitRequestLineId.HasValue && !CustomerReceivedAt.HasValue)
            throw new InvalidOperationException("Confirm receipt of the transportation kit before preparing its sample shipment.");
        if (shipment.OrganizationId != OrganizationId || shipment.DepartmentId != DepartmentId
            || shipment.ContainerDefinitionId != ContainerDefinitionId
            || (ReservedSampleShipmentId.HasValue ? ReservedSampleShipmentId != shipment.Id
                : shipment.AuthorizationSource != AuthorizationSource || shipment.AuthorizationSourceId != AuthorizationSourceId))
            throw new InvalidOperationException("This kit does not match the selected job and container type.");
        BoundSampleShipmentId = shipment.Id;
    }

    public void Reserve(SampleShipment shipment, Guid actorId, DateTime utcNow)
    {
        EnsurePhysicallyUsable(utcNow);
        if (!CustomerReceivedAt.HasValue || BoundSampleShipmentId.HasValue || ReservedSampleShipmentId.HasValue
            || actorId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc
            || shipment.Status != SampleShipmentStatus.Preparing
            || shipment.OrganizationId != OrganizationId || shipment.DepartmentId != DepartmentId
            || shipment.DepartureDeliveryLocationId != CustomerDeliveryLocationId
            || shipment.ContainerDefinitionId != ContainerDefinitionId)
            throw new InvalidOperationException("This container is not available at the selected delivery location. Refresh and scan an available container.");
        ReservedSampleShipmentId = shipment.Id; ReservedAt = utcNow; ReservedByUserId = actorId;
    }

    public void ReleaseReservation()
    {
        if (BoundSampleShipmentId.HasValue) throw new InvalidOperationException("A container in use cannot be released.");
        ReservedSampleShipmentId = null; ReservedAt = null; ReservedByUserId = null;
    }

    public void DispatchToLocation(CustomerDeliveryLocation location, string carrier, string trackingNumber, DateTime fulfilledAt)
    {
        EnsurePhysicallyUsable(DateTime.UtcNow);
        if (FulfilledAt.HasValue || OrganizationId.HasValue || !location.IsActive)
            throw new InvalidOperationException("Choose an active delivery location for an undispatched container.");
        EnsureVerifiedTubes();
        if (fulfilledAt.Kind != DateTimeKind.Utc || fulfilledAt > DateTime.UtcNow.AddMinutes(5) || fulfilledAt < CreatedAt.AddMinutes(-1))
            throw new ArgumentException("Enter a valid dispatch time after the kit was prepared.");
        OrganizationId = location.OrganizationId; DepartmentId = location.DepartmentId; CustomerDeliveryLocationId = location.Id;
        OutboundCarrier = OrderText.Required(carrier, nameof(carrier), 255);
        OutboundTrackingNumber = OrderText.Required(trackingNumber, nameof(trackingNumber), 255);
        FulfilledAt = fulfilledAt;
    }

    public void LinkTransportationRequest(TransportationKitRequest request, TransportationKitRequestLine line)
    {
        EnsurePhysicallyUsable(DateTime.UtcNow);
        if (TransportationKitRequestLineId.HasValue || !FulfilledAt.HasValue || BoundSampleShipmentId.HasValue
            || line.TransportationKitRequestId != request.Id || line.ContainerDefinitionId != ContainerDefinitionId
            || request.OrganizationId != OrganizationId || request.DepartmentId != DepartmentId
            || (AuthorizationSourceId.HasValue && (request.LabServiceOrderId != AuthorizationSourceId
                || AuthorizationSource != SampleShipmentAuthorizationSource.CustomerLabServiceOrder))
            || (CustomerDeliveryLocationId.HasValue && CustomerDeliveryLocationId != request.DeliveryLocationId))
            throw new InvalidOperationException("Dispatch this unused kit for the matching transportation-kit request.");
        TransportationKitRequestLineId = line.Id; CustomerDeliveryLocationId = request.DeliveryLocationId;
        AuthorizationSource = SampleShipmentAuthorizationSource.CustomerLabServiceOrder; AuthorizationSourceId = request.LabServiceOrderId;
    }
    public void ConfirmCustomerReceipt(Guid actorUserId, DateTime utcNow)
    {
        if (!CustomerDeliveryLocationId.HasValue || !FulfilledAt.HasValue || actorUserId == Guid.Empty
            || utcNow.Kind != DateTimeKind.Utc || utcNow < FulfilledAt.Value)
            throw new InvalidOperationException("Only a dispatched transportation kit can be acknowledged as received.");
        if (CustomerReceivedAt.HasValue) return;
        CustomerReceivedAt = utcNow; CustomerReceivedByUserId = actorUserId;
    }

    public void Withdraw(Guid actorUserId, DateTime utcNow, string reason)
    {
        if (actorUserId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Record the actor and UTC withdrawal time.");
        if (WithdrawnAt.HasValue) throw new InvalidOperationException("This physical kit is already withdrawn.");
        WithdrawalReason = OrderText.Required(reason, "Withdrawal reason", 1000);
        WithdrawnAt = utcNow;
        WithdrawnByUserId = actorUserId;
    }

    public void EnsurePhysicallyUsable(DateTime utcNow)
    {
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Use a UTC validation time.");
        if (WithdrawnAt.HasValue)
            throw new InvalidOperationException("This physical Transportation kit was withdrawn and cannot be sent or used.");
        if (ProductExpirySnapshotJson is null)
            throw new InvalidOperationException("This kit has no product-expiration record. Review its physical inventory before use.");
        using var document = JsonDocument.Parse(ProductExpirySnapshotJson);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
            throw new InvalidOperationException("The kit's product-expiration record is invalid.");
        foreach (var product in document.RootElement.EnumerateArray())
        {
            if (!product.TryGetProperty("canExpire", out var canExpire) || canExpire.ValueKind != JsonValueKind.True)
                continue;
            if (!product.TryGetProperty("expirationDate", out var value) || value.ValueKind != JsonValueKind.String
                || !DateOnly.TryParse(value.GetString(), out var expirationDate)
                || expirationDate < DateOnly.FromDateTime(utcNow))
                throw new InvalidOperationException("A kit component has expired or has no verified expiration date.");
        }
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void VerifyTubeRoster(Guid actorUserId, IReadOnlyCollection<string> scanned, DateTime utcNow)
    {
        if (FulfilledAt.HasValue || actorUserId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc)
            throw new InvalidOperationException("Only an undispatched kit can have its physical tube roster verified.");
        if (Tubes.Count != TubeCapacity || !TubeSupplierProductId.HasValue)
            throw new InvalidOperationException($"Register exactly {TubeCapacity} physical tubes with a saved tube product first.");
        var saved = Tubes.Select(tube => tube.SupplierBarcode).ToHashSet(StringComparer.Ordinal);
        if (saved.Count != TubeCapacity || Tubes.Any(tube => tube.TubeSupplierProductId != TubeSupplierProductId
                || tube.BarcodeNamespace != TubeBarcodeNamespace)
            || scanned.Count != TubeCapacity || !saved.SetEquals(scanned))
            throw new InvalidOperationException("Rescan every physical tube in this kit. The verified roster must exactly match its registered tube IDs and product.");
        TubesVerifiedAt = utcNow;
        TubesVerifiedByUserId = actorUserId;
    }

    public void InvalidateTubeVerification()
    {
        if (FulfilledAt.HasValue) throw new InvalidOperationException("A dispatched tube roster is frozen.");
        TubesVerifiedAt = null;
        TubesVerifiedByUserId = null;
    }

    private void EnsureVerifiedTubes()
    {
        if (FinishedKitProductId.HasValue && (!AssemblyWorkflowRevisionId.HasValue || !AssemblyCompletedAt.HasValue))
            throw new InvalidOperationException("Complete the approved kit assembly workflow before dispatch.");
        if (!TubesVerifiedAt.HasValue || !TubesVerifiedByUserId.HasValue || Tubes.Count != TubeCapacity
            || Tubes.Select(tube => tube.SupplierBarcode).Distinct(StringComparer.Ordinal).Count() != TubeCapacity
            || Tubes.Any(tube => tube.TubeSupplierProductId != TubeSupplierProductId || tube.BarcodeNamespace != TubeBarcodeNamespace))
            throw new InvalidOperationException("Verify the full physical tube roster before dispatch.");
    }
    public void CompleteAssembly(DateTime utcNow)
    {
        if (!FinishedKitProductId.HasValue || !AssemblyWorkflowRevisionId.HasValue || FulfilledAt.HasValue
            || AssemblyCompletedAt.HasValue || utcNow.Kind != DateTimeKind.Utc)
            throw new InvalidOperationException("Only an active Phaeno kit assembly can be completed.");
        AssemblyCompletedAt = utcNow;
    }
    public void ConfirmTubeLotNumber(string lotNumber)
    {
        var normalized = OrderText.Required(lotNumber, nameof(lotNumber), 100);
        if (TubeLotNumber is not null && !string.Equals(TubeLotNumber, normalized, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("The tube inventory lot does not match this kit's recorded tube lot number.");
        TubeLotNumber = normalized;
    }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class SampleShippingStockTube
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleShippingStockKitId { get; private set; }
    public string SupplierBarcode { get; private set; } = null!;
    public string BarcodeNamespace { get; private set; } = SupplierTubeBarcode.LegacyNamespace;
    public Guid? TubeSupplierProductId { get; private set; }
    private SampleShippingStockTube() { }
    public SampleShippingStockTube(Guid kitId, string supplierBarcode, string? barcodeNamespace = null, Guid? tubeSupplierProductId = null)
    {
        if (kitId == Guid.Empty) throw new ArgumentException("Choose a stock kit.");
        if (!SupplierTubeBarcode.TryNormalize(supplierBarcode, out var normalized))
            throw new ArgumentException("Scan a complete tube barcode.");
        SampleShippingStockKitId = kitId;
        SupplierBarcode = normalized;
        BarcodeNamespace = string.IsNullOrWhiteSpace(barcodeNamespace)
            ? SupplierTubeBarcode.LegacyNamespace : OrderText.Required(barcodeNamespace, nameof(barcodeNamespace), 50);
        TubeSupplierProductId = tubeSupplierProductId;
    }
}

public sealed class SampleShippingStockTubeCorrection
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleShippingStockKitId { get; private set; }
    public string PreviousBarcode { get; private set; } = null!;
    public string ReplacementBarcode { get; private set; } = null!;
    public string BarcodeNamespace { get; private set; } = null!;
    public string Reason { get; private set; } = null!;
    public Guid CorrectedByUserId { get; private set; }
    public DateTime CorrectedAt { get; private set; }
    private SampleShippingStockTubeCorrection() { }
    public SampleShippingStockTubeCorrection(Guid kitId, string previous, string replacement, string barcodeNamespace,
        string reason, Guid actorId, DateTime utcNow)
    {
        if (kitId == Guid.Empty || actorId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Record a valid kit, operator, and correction time.");
        SampleShippingStockKitId = kitId;
        PreviousBarcode = previous;
        ReplacementBarcode = replacement;
        BarcodeNamespace = barcodeNamespace;
        Reason = OrderText.Required(reason, nameof(reason), 1000);
        CorrectedByUserId = actorId;
        CorrectedAt = utcNow;
    }
}
