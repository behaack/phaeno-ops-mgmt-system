namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class OrderStatusEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string WorkflowType { get; private set; } = null!;
    public Guid WorkflowId { get; private set; }
    public Guid? ChildRecordId { get; private set; }
    public string FromStatus { get; private set; } = null!;
    public string ToStatus { get; private set; } = null!;
    public string? TenantSafeReason { get; private set; }
    public string? InternalNote { get; private set; }
    public Guid ActorUserId { get; private set; }
    public DateTime OccurredAt { get; private set; }

    private OrderStatusEvent() { }

    public OrderStatusEvent(
        Guid organizationId,
        string workflowType,
        Guid workflowId,
        Guid? childRecordId,
        string fromStatus,
        string toStatus,
        string? tenantSafeReason,
        string? internalNote,
        Guid actorUserId,
        DateTime occurredAt)
    {
        OrganizationId = organizationId;
        WorkflowType = OrderText.Required(workflowType, nameof(workflowType), 100);
        WorkflowId = workflowId;
        ChildRecordId = childRecordId;
        FromStatus = OrderText.Required(fromStatus, nameof(fromStatus), 100);
        ToStatus = OrderText.Required(toStatus, nameof(toStatus), 100);
        TenantSafeReason = OrderText.Optional(tenantSafeReason, 2000);
        InternalNote = OrderText.Optional(internalNote, 4000);
        ActorUserId = actorUserId;
        OccurredAt = occurredAt;
    }
}

public sealed class OrderCancellationRequest : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string WorkflowType { get; private set; } = null!;
    public Guid WorkflowId { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public string Reason { get; private set; } = null!;
    public string ScopeJson { get; private set; } = "{}";
    public CancellationRequestStatus Status { get; private set; } = CancellationRequestStatus.Pending;
    public string? DecisionReason { get; private set; }
    public Guid? DecidedByUserId { get; private set; }
    public DateTime? DecidedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private OrderCancellationRequest() { }

    public OrderCancellationRequest(
        Guid organizationId,
        string workflowType,
        Guid workflowId,
        Guid requestedByUserId,
        string reason,
        string scopeJson)
    {
        OrganizationId = organizationId;
        WorkflowType = OrderText.Required(workflowType, nameof(workflowType), 100);
        WorkflowId = workflowId;
        RequestedByUserId = requestedByUserId;
        Reason = OrderText.Required(reason, nameof(reason), 2000);
        ScopeJson = OrderText.Json(scopeJson);
    }

    public void Decide(
        CancellationRequestStatus status,
        string reason,
        Guid actorUserId,
        DateTime decidedAt)
    {
        if (Status != CancellationRequestStatus.Pending)
            throw new InvalidOperationException("This cancellation request has already been decided.");
        if (status == CancellationRequestStatus.Pending)
            throw new ArgumentException("A final cancellation status is required.", nameof(status));
        Status = status;
        DecisionReason = OrderText.Required(reason, nameof(reason), 2000);
        DecidedByUserId = actorUserId;
        DecidedAt = decidedAt;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public static class OrderWorkflowTypes
{
    public const string LabService = "LabService";
    public const string Reagent = "Reagent";
    public const string DataAssembly = "DataAssembly";
}
