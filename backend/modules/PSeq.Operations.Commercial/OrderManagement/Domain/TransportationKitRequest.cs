namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum TransportationKitRequestStatus { Pending, PartiallyDispatched, Dispatched, Received, Cancelled }

public sealed class TransportationKitRequest : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public Guid DeliveryLocationId { get; private set; }
    public string DeliveryAddressSnapshotJson { get; private set; } = null!;
    public Guid RequestedByUserId { get; private set; }
    public DateTime RequestedAt { get; private set; }
    public TransportationKitRequestStatus Status { get; private set; } = TransportationKitRequestStatus.Pending;
    public DateTime? ClosedAt { get; private set; }
    public string? CancellationReason { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<TransportationKitRequestLine> Lines { get; private set; } = [];

    private TransportationKitRequest() { }
    public TransportationKitRequest(Guid jobId, Guid organizationId, Guid departmentId, Guid locationId,
        string addressSnapshotJson, Guid requestedByUserId, DateTime utcNow)
    {
        if (new[] { jobId, organizationId, departmentId, locationId, requestedByUserId }.Any(id => id == Guid.Empty))
            throw new ArgumentException("Choose an authorized Job, delivery location and requesting user.");
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Request time must be UTC.");
        LabServiceOrderId = jobId; OrganizationId = organizationId; DepartmentId = departmentId;
        DeliveryLocationId = locationId; DeliveryAddressSnapshotJson = OrderText.Json(addressSnapshotJson);
        RequestedByUserId = requestedByUserId; RequestedAt = utcNow;
    }
    public void Reconcile(IReadOnlyCollection<SampleShippingStockKit> kits, DateTime utcNow)
    {
        if (Status == TransportationKitRequestStatus.Cancelled) throw new InvalidOperationException("This request was cancelled.");
        var expected = Lines.Sum(line => line.Quantity);
        if (expected < 1 || kits.Count > expected || kits.Any(kit => !kit.FulfilledAt.HasValue
            || !Lines.Any(line => line.Id == kit.TransportationKitRequestLineId && line.ContainerDefinitionId == kit.ContainerDefinitionId)
            || kit.OrganizationId != OrganizationId || kit.DepartmentId != DepartmentId || kit.AuthorizationSourceId != LabServiceOrderId))
            throw new InvalidOperationException("Dispatched kits must match this request and its quantities.");
        foreach (var line in Lines)
            if (kits.Count(kit => kit.TransportationKitRequestLineId == line.Id) > line.Quantity)
                throw new InvalidOperationException("Do not dispatch more kits than requested for a size.");
        Status = kits.Count == 0 ? TransportationKitRequestStatus.Pending
            : kits.Count < expected ? TransportationKitRequestStatus.PartiallyDispatched
            : kits.All(kit => kit.CustomerReceivedAt.HasValue) ? TransportationKitRequestStatus.Received
            : TransportationKitRequestStatus.Dispatched;
        if (Status == TransportationKitRequestStatus.Received) ClosedAt ??= utcNow;
    }
    public void Cancel(string? reason, DateTime utcNow)
    {
        if (Status != TransportationKitRequestStatus.Pending) throw new InvalidOperationException("Only a request with no dispatched kits can be cancelled.");
        Status = TransportationKitRequestStatus.Cancelled;
        CancellationReason = OrderText.Optional(reason, 2000); ClosedAt = utcNow;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class TransportationKitRequestLine
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TransportationKitRequestId { get; private set; }
    public Guid ContainerDefinitionId { get; private set; }
    public string ContainerSnapshotJson { get; private set; } = null!;
    public int Quantity { get; private set; }
    private TransportationKitRequestLine() { }
    public TransportationKitRequestLine(Guid requestId, Guid definitionId, string snapshotJson, int quantity)
    {
        if (requestId == Guid.Empty || definitionId == Guid.Empty || quantity is < 1 or > 10000)
            throw new ArgumentException("Each requested size needs a positive whole-number quantity.");
        TransportationKitRequestId = requestId; ContainerDefinitionId = definitionId;
        ContainerSnapshotJson = OrderText.Json(snapshotJson); Quantity = quantity;
    }
}
