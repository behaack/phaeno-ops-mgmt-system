namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class PartnerShippingAddress : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string Label { get; private set; } = null!;
    public string Recipient { get; private set; } = null!;
    public string Line1 { get; private set; } = null!;
    public string? Line2 { get; private set; }
    public string City { get; private set; } = null!;
    public string Region { get; private set; } = null!;
    public string PostalCode { get; private set; } = null!;
    public string CountryCode { get; private set; } = null!;
    public string? Phone { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private PartnerShippingAddress() { }

    public PartnerShippingAddress(
        Guid organizationId,
        string label,
        string recipient,
        string line1,
        string? line2,
        string city,
        string region,
        string postalCode,
        string countryCode,
        string? phone)
    {
        OrganizationId = organizationId;
        Update(label, recipient, line1, line2, city, region, postalCode, countryCode, phone);
    }

    public void Update(
        string label,
        string recipient,
        string line1,
        string? line2,
        string city,
        string region,
        string postalCode,
        string countryCode,
        string? phone)
    {
        Label = OrderText.Required(label, nameof(label), 100);
        Recipient = OrderText.Required(recipient, nameof(recipient), 255);
        Line1 = OrderText.Required(line1, nameof(line1), 255);
        Line2 = OrderText.Optional(line2, 255);
        City = OrderText.Required(city, nameof(city), 255);
        Region = OrderText.Required(region, nameof(region), 255);
        PostalCode = OrderText.Required(postalCode, nameof(postalCode), 50);
        CountryCode = OrderText.Required(countryCode, nameof(countryCode), 2).ToUpperInvariant();
        if (CountryCode.Length != 2) throw new ArgumentException("Country code must contain two letters.", nameof(countryCode));
        Phone = OrderText.Optional(phone, 100);
    }

    public void Deactivate() => IsActive = false;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class PartnerReagentOrder : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string OrderNumber { get; private set; } = null!;
    public ReagentOrderStatus Status { get; private set; } = ReagentOrderStatus.Draft;
    public ReagentOrderStatus? ResumeStatus { get; private set; }
    public string? PurchaseOrderNumber { get; private set; }
    public Guid? ShippingAddressId { get; private set; }
    public string? ShippingAddressSnapshotJson { get; private set; }
    public string? PlacementSnapshotJson { get; private set; }
    public DateTime? RequestedDeliveryDate { get; private set; }
    public string? ShippingInstructions { get; private set; }
    public DateTime? PlacedAt { get; private set; }
    public DateTime? AcceptedAt { get; private set; }
    public DateTime? FulfilledAt { get; private set; }
    public bool IsDiscarded { get; private set; }
    public string? TenantSafeReason { get; private set; }
    public string? InternalNote { get; private set; }
    public Guid? AssignedToUserId { get; private set; }
    public DateTime? DueAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<PartnerReagentOrderLine> Lines { get; } = [];
    public ICollection<ReagentShipment> Shipments { get; } = [];

    private PartnerReagentOrder() { }

    public PartnerReagentOrder(Guid organizationId, string orderNumber)
    {
        OrganizationId = organizationId;
        OrderNumber = OrderText.Required(orderNumber, nameof(orderNumber), 50);
    }

    public void Place(
        string purchaseOrderNumber,
        Guid shippingAddressId,
        string shippingAddressSnapshotJson,
        DateTime? requestedDeliveryDate,
        string? shippingInstructions,
        DateTime utcNow)
    {
        EnsureStatus(ReagentOrderStatus.Draft);
        if (Lines.Count == 0) throw new InvalidOperationException("At least one reagent line is required.");
        PurchaseOrderNumber = OrderText.Required(purchaseOrderNumber, nameof(purchaseOrderNumber), 255);
        ShippingAddressId = shippingAddressId;
        ShippingAddressSnapshotJson = OrderText.Json(shippingAddressSnapshotJson);
        RequestedDeliveryDate = requestedDeliveryDate;
        ShippingInstructions = OrderText.Optional(shippingInstructions, 2000);
        PlacedAt = utcNow;
        SetStatus(ReagentOrderStatus.Placed, null, null);
    }

    public void MarkCommerciallySynchronized() => Transition(ReagentOrderStatus.Placed, ReagentOrderStatus.UnderReview);

    public void RecordPlacementSnapshot(string placementSnapshotJson)
    {
        EnsureStatus(ReagentOrderStatus.Placed);
        if (PlacementSnapshotJson != null) throw new InvalidOperationException("The placement snapshot is immutable.");
        PlacementSnapshotJson = OrderText.Json(placementSnapshotJson);
    }

    public void Accept(DateTime utcNow)
    {
        EnsureStatus(ReagentOrderStatus.UnderReview);
        AcceptedAt = utcNow;
        SetStatus(ReagentOrderStatus.Accepted, null, null);
    }

    public void StartProcessing() => Transition(ReagentOrderStatus.Accepted, ReagentOrderStatus.Processing);

    public void RecordShipmentProgress()
    {
        EnsureStatus(ReagentOrderStatus.Processing, ReagentOrderStatus.PartiallyShipped);
        var remaining = Lines.Sum(line => line.RemainingQuantity);
        var shipped = Lines.Sum(line => line.ShippedQuantity);
        SetStatus(remaining > 0 && shipped > 0 ? ReagentOrderStatus.PartiallyShipped : ReagentOrderStatus.Shipped, null, null);
    }

    public void Fulfill(DateTime utcNow)
    {
        EnsureStatus(ReagentOrderStatus.Shipped);
        if (Lines.Any(line => line.RemainingQuantity > 0)) throw new InvalidOperationException("All active quantities must be shipped or cancelled.");
        FulfilledAt = utcNow;
        SetStatus(ReagentOrderStatus.Fulfilled, null, null);
    }

    public void PutOnHold(string reason, string? internalNote)
    {
        if (IsTerminal() || Status == ReagentOrderStatus.OnHold) throw new InvalidOperationException("This reagent order cannot be held.");
        ResumeStatus = Status;
        SetStatus(ReagentOrderStatus.OnHold, reason, internalNote);
    }

    public void ReleaseHold(string reason, string? internalNote)
    {
        EnsureStatus(ReagentOrderStatus.OnHold);
        var resume = ResumeStatus ?? ReagentOrderStatus.UnderReview;
        ResumeStatus = null;
        SetStatus(resume, reason, internalNote);
    }

    public void RequestCancellation()
    {
        EnsureStatus(ReagentOrderStatus.Accepted, ReagentOrderStatus.Processing, ReagentOrderStatus.PartiallyShipped, ReagentOrderStatus.OnHold);
        ResumeStatus = Status;
        SetStatus(ReagentOrderStatus.CancellationRequested, null, null);
    }

    public void ResolveCancellation(CancellationRequestStatus decision, string reason, string? internalNote)
    {
        EnsureStatus(ReagentOrderStatus.CancellationRequested);
        if (decision == CancellationRequestStatus.Approved)
        {
            SetStatus(ReagentOrderStatus.Cancelled, reason, internalNote);
            ResumeStatus = null;
            return;
        }
        var resume = ResumeStatus ?? ReagentOrderStatus.Processing;
        ResumeStatus = null;
        SetStatus(resume, reason, internalNote);
    }

    public void CancelBeforeAcceptance(string reason)
    {
        EnsureStatus(ReagentOrderStatus.Draft, ReagentOrderStatus.Placed, ReagentOrderStatus.UnderReview);
        SetStatus(ReagentOrderStatus.Cancelled, reason, null);
    }

    public void Reject(string reason, string? internalNote)
    {
        EnsureStatus(ReagentOrderStatus.UnderReview, ReagentOrderStatus.OnHold);
        SetStatus(ReagentOrderStatus.Rejected, reason, internalNote);
    }

    public void DiscardDraft() { EnsureStatus(ReagentOrderStatus.Draft); IsDiscarded = true; }
    public void Assign(Guid? userId, DateTime? dueAt) { AssignedToUserId = userId; DueAt = userId.HasValue ? dueAt : null; }
    public bool IsTerminal() => Status is ReagentOrderStatus.Fulfilled or ReagentOrderStatus.Cancelled or ReagentOrderStatus.Rejected;

    private void Transition(ReagentOrderStatus from, ReagentOrderStatus to) { EnsureStatus(from); SetStatus(to, null, null); }
    private void SetStatus(ReagentOrderStatus status, string? reason, string? internalNote) { Status = status; TenantSafeReason = OrderText.Optional(reason, 2000); InternalNote = OrderText.Optional(internalNote, 4000); }
    private void EnsureStatus(params ReagentOrderStatus[] allowed) { if (!allowed.Contains(Status)) throw new InvalidOperationException($"Reagent order cannot transition from {Status}."); }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class PartnerReagentOrderLine : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PartnerReagentOrderId { get; private set; }
    public Guid OfferingId { get; private set; }
    public Guid QboCatalogItemId { get; private set; }
    public string ExternalItemId { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public decimal Quantity { get; private set; }
    public string Unit { get; private set; } = null!;
    public decimal UnitPrice { get; private set; }
    public string Currency { get; private set; } = "USD";
    public decimal LineTotal { get; private set; }
    public string? Note { get; private set; }
    public decimal ShippedQuantity { get; private set; }
    public decimal CancelledQuantity { get; private set; }
    public DateTime? EstimatedShipDate { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public decimal RemainingQuantity => Quantity - ShippedQuantity - CancelledQuantity;

    private PartnerReagentOrderLine() { }

    public PartnerReagentOrderLine(Guid partnerReagentOrderId, Guid offeringId, decimal quantity, string? note)
    {
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        PartnerReagentOrderId = partnerReagentOrderId;
        OfferingId = offeringId;
        Quantity = quantity;
        Note = OrderText.Optional(note, 2000);
        ExternalItemId = string.Empty;
        Description = string.Empty;
        Unit = string.Empty;
    }

    public void Snapshot(
        Guid qboCatalogItemId,
        string externalItemId,
        string description,
        string unit,
        decimal unitPrice,
        string currency)
    {
        if (ShippedQuantity > 0) throw new InvalidOperationException("A shipped line cannot be repriced.");
        QboCatalogItemId = qboCatalogItemId;
        ExternalItemId = OrderText.Required(externalItemId, nameof(externalItemId), 255);
        Description = OrderText.Required(description, nameof(description), 1000);
        Unit = OrderText.Required(unit, nameof(unit), 100);
        if (unitPrice < 0) throw new ArgumentOutOfRangeException(nameof(unitPrice));
        UnitPrice = decimal.Round(unitPrice, 2, MidpointRounding.AwayFromZero);
        Currency = OrderText.Currency(currency);
        LineTotal = decimal.Round(Quantity * UnitPrice, 2, MidpointRounding.AwayFromZero);
    }

    public void ApplyApprovedSubstitution(
        Guid offeringId,
        Guid qboCatalogItemId,
        string externalItemId,
        string description,
        string unit,
        decimal unitPrice,
        string currency)
    {
        if (ShippedQuantity > 0 || CancelledQuantity > 0)
            throw new InvalidOperationException("A partially fulfilled line cannot be replaced by a substitution.");
        OfferingId = offeringId;
        Snapshot(qboCatalogItemId, externalItemId, description, unit, unitPrice, currency);
    }

    public void AllocateShipment(decimal quantity)
    {
        if (quantity <= 0 || quantity > RemainingQuantity) throw new ArgumentOutOfRangeException(nameof(quantity));
        ShippedQuantity += quantity;
    }

    public void CancelRemainder(decimal quantity)
    {
        if (quantity <= 0 || quantity > RemainingQuantity) throw new ArgumentOutOfRangeException(nameof(quantity));
        CancelledQuantity += quantity;
    }

    public void SetEstimatedShipDate(DateTime? value) => EstimatedShipDate = value;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class ReagentShipment : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PartnerReagentOrderId { get; private set; }
    public string ShipmentNumber { get; private set; } = null!;
    public string PackingSlipNumber { get; private set; } = null!;
    public string Carrier { get; private set; } = null!;
    public string? Service { get; private set; }
    public string TrackingNumber { get; private set; } = null!;
    public DateTime ShippedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<ReagentShipmentLine> Lines { get; } = [];

    private ReagentShipment() { }
    public ReagentShipment(Guid orderId, string shipmentNumber, string packingSlipNumber, string carrier, string? service, string trackingNumber, DateTime shippedAt)
    {
        PartnerReagentOrderId = orderId;
        ShipmentNumber = OrderText.Required(shipmentNumber, nameof(shipmentNumber), 100);
        PackingSlipNumber = OrderText.Required(packingSlipNumber, nameof(packingSlipNumber), 100);
        Carrier = OrderText.Required(carrier, nameof(carrier), 255);
        Service = OrderText.Optional(service, 255);
        TrackingNumber = OrderText.Required(trackingNumber, nameof(trackingNumber), 255);
        ShippedAt = shippedAt;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class ReagentShipmentLine
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ReagentShipmentId { get; private set; }
    public Guid PartnerReagentOrderLineId { get; private set; }
    public decimal Quantity { get; private set; }
    public string LotBatchNumber { get; private set; } = null!;
    public DateTime? ExpiresAt { get; private set; }

    private ReagentShipmentLine() { }
    public ReagentShipmentLine(Guid shipmentId, Guid orderLineId, decimal quantity, string lotBatchNumber, DateTime? expiresAt)
    {
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        ReagentShipmentId = shipmentId;
        PartnerReagentOrderLineId = orderLineId;
        Quantity = quantity;
        LotBatchNumber = OrderText.Required(lotBatchNumber, nameof(lotBatchNumber), 255);
        ExpiresAt = expiresAt;
    }
}

public sealed class ReagentOrderAdjustment : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PartnerReagentOrderId { get; private set; }
    public Guid OriginalLineId { get; private set; }
    public Guid ProposedOfferingId { get; private set; }
    public string BeforeJson { get; private set; } = "{}";
    public string AfterJson { get; private set; } = "{}";
    public string Reason { get; private set; } = null!;
    public decimal TotalDifference { get; private set; }
    public ReagentAdjustmentStatus Status { get; private set; } = ReagentAdjustmentStatus.Proposed;
    public Guid? DecidedByUserId { get; private set; }
    public DateTime? DecidedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private ReagentOrderAdjustment() { }
    public ReagentOrderAdjustment(Guid orderId, Guid originalLineId, Guid proposedOfferingId, string beforeJson, string afterJson, string reason, decimal totalDifference)
    {
        PartnerReagentOrderId = orderId;
        OriginalLineId = originalLineId;
        ProposedOfferingId = proposedOfferingId;
        BeforeJson = OrderText.Json(beforeJson);
        AfterJson = OrderText.Json(afterJson);
        Reason = OrderText.Required(reason, nameof(reason), 2000);
        TotalDifference = decimal.Round(totalDifference, 2, MidpointRounding.AwayFromZero);
    }

    public void Decide(bool approved, Guid actorUserId, DateTime utcNow)
    {
        if (Status != ReagentAdjustmentStatus.Proposed) throw new InvalidOperationException("This adjustment has already been decided.");
        Status = approved ? ReagentAdjustmentStatus.Approved : ReagentAdjustmentStatus.Declined;
        DecidedByUserId = actorUserId;
        DecidedAt = utcNow;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
