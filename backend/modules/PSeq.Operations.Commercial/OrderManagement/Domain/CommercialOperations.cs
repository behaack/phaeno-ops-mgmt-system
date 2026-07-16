namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CommercialDocumentLink : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string WorkflowType { get; private set; } = null!;
    public Guid WorkflowId { get; private set; }
    public CommercialDocumentKind Kind { get; private set; }
    public string? ExternalDocumentId { get; private set; }
    public string? DocumentNumber { get; private set; }
    public string? DocumentUrl { get; private set; }
    public IntegrationStatus SyncStatus { get; private set; } = IntegrationStatus.Pending;
    public decimal Total { get; private set; }
    public decimal Balance { get; private set; }
    public string Currency { get; private set; } = "USD";
    public DateTime? SynchronizedAt { get; private set; }
    public string? LastError { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CommercialDocumentLink() { }

    public CommercialDocumentLink(
        string workflowType,
        Guid workflowId,
        CommercialDocumentKind kind,
        decimal total,
        string currency)
    {
        WorkflowType = OrderText.Required(workflowType, nameof(workflowType), 100);
        WorkflowId = workflowId;
        Kind = kind;
        if (total < 0) throw new ArgumentOutOfRangeException(nameof(total));
        Total = decimal.Round(total, 2, MidpointRounding.AwayFromZero);
        Balance = Total;
        Currency = OrderText.Currency(currency);
    }

    public void MarkSynchronized(
        string externalDocumentId,
        string documentNumber,
        string? documentUrl,
        decimal total,
        decimal balance,
        string currency,
        DateTime synchronizedAt)
    {
        ExternalDocumentId = OrderText.Required(externalDocumentId, nameof(externalDocumentId), 255);
        DocumentNumber = OrderText.Required(documentNumber, nameof(documentNumber), 255);
        DocumentUrl = OrderText.Optional(documentUrl, 2000);
        Total = decimal.Round(total, 2, MidpointRounding.AwayFromZero);
        Balance = decimal.Round(balance, 2, MidpointRounding.AwayFromZero);
        Currency = OrderText.Currency(currency);
        SyncStatus = IntegrationStatus.Succeeded;
        SynchronizedAt = synchronizedAt;
        LastError = null;
    }

    public void MarkFailed(string error)
    {
        SyncStatus = IntegrationStatus.Failed;
        LastError = OrderText.Required(error, nameof(error), 2000);
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class OrderOutboxMessage : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public IntegrationOperation Operation { get; private set; }
    public string WorkflowType { get; private set; } = null!;
    public Guid WorkflowId { get; private set; }
    public string IdempotencyKey { get; private set; } = null!;
    public string PayloadJson { get; private set; } = "{}";
    public IntegrationStatus Status { get; private set; } = IntegrationStatus.Pending;
    public int AttemptCount { get; private set; }
    public DateTime NextAttemptAt { get; private set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; private set; }
    public string? LastError { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private OrderOutboxMessage() { }

    public OrderOutboxMessage(
        IntegrationOperation operation,
        string workflowType,
        Guid workflowId,
        string idempotencyKey,
        string payloadJson)
    {
        Operation = operation;
        WorkflowType = OrderText.Required(workflowType, nameof(workflowType), 100);
        WorkflowId = workflowId;
        IdempotencyKey = OrderText.Required(idempotencyKey, nameof(idempotencyKey), 255);
        PayloadJson = OrderText.Json(payloadJson);
    }

    public void BeginAttempt(DateTime utcNow)
    {
        if (Status == IntegrationStatus.Succeeded) throw new InvalidOperationException("A completed outbox message cannot be retried.");
        Status = IntegrationStatus.Processing;
        AttemptCount++;
        NextAttemptAt = utcNow;
    }

    public void Complete(DateTime utcNow)
    {
        Status = IntegrationStatus.Succeeded;
        CompletedAt = utcNow;
        LastError = null;
    }

    public void Fail(string error, DateTime nextAttemptAt, bool needsAttention)
    {
        Status = needsAttention ? IntegrationStatus.NeedsAttention : IntegrationStatus.Failed;
        LastError = OrderText.Required(error, nameof(error), 2000);
        NextAttemptAt = nextAttemptAt;
    }

    public void Retry(DateTime utcNow)
    {
        if (Status is not (IntegrationStatus.Failed or IntegrationStatus.NeedsAttention))
            throw new InvalidOperationException("Only failed messages can be retried.");
        Status = IntegrationStatus.Pending;
        NextAttemptAt = utcNow;
        LastError = null;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class OrderIdempotencyRecord
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ActorUserId { get; private set; }
    public string Scope { get; private set; } = null!;
    public string IdempotencyKey { get; private set; } = null!;
    public string RequestHash { get; private set; } = null!;
    public int StatusCode { get; private set; }
    public string ResponseJson { get; private set; } = "{}";
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    private OrderIdempotencyRecord() { }

    public OrderIdempotencyRecord(
        Guid actorUserId,
        string scope,
        string idempotencyKey,
        string requestHash,
        int statusCode,
        string responseJson)
    {
        ActorUserId = actorUserId;
        Scope = OrderText.Required(scope, nameof(scope), 200);
        IdempotencyKey = OrderText.Required(idempotencyKey, nameof(idempotencyKey), 255);
        RequestHash = OrderText.Required(requestHash, nameof(requestHash), 64);
        StatusCode = statusCode;
        ResponseJson = OrderText.Json(responseJson);
    }
}

public sealed class OrderNotification : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid? RecipientUserId { get; private set; }
    public string WorkflowType { get; private set; } = null!;
    public Guid WorkflowId { get; private set; }
    public string EventType { get; private set; } = null!;
    public string Subject { get; private set; } = null!;
    public string Body { get; private set; } = null!;
    public OrderNotificationStatus Status { get; private set; } = OrderNotificationStatus.Pending;
    public int AttemptCount { get; private set; }
    public DateTime NextAttemptAt { get; private set; } = DateTime.UtcNow;
    public string? LastError { get; private set; }
    public DateTime? SentAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private OrderNotification() { }

    public OrderNotification(
        Guid organizationId,
        Guid? recipientUserId,
        string workflowType,
        Guid workflowId,
        string eventType,
        string subject,
        string body)
    {
        OrganizationId = organizationId;
        RecipientUserId = recipientUserId;
        WorkflowType = OrderText.Required(workflowType, nameof(workflowType), 100);
        WorkflowId = workflowId;
        EventType = OrderText.Required(eventType, nameof(eventType), 100);
        Subject = OrderText.Required(subject, nameof(subject), 500);
        Body = OrderText.Required(body, nameof(body), 4000);
    }

    public void BeginAttempt() { Status = OrderNotificationStatus.Sending; AttemptCount++; }
    public void MarkSent(DateTime utcNow) { Status = OrderNotificationStatus.Sent; SentAt = utcNow; LastError = null; }
    public void MarkFailed(string error, DateTime nextAttemptAt) { Status = OrderNotificationStatus.Failed; LastError = OrderText.Required(error, nameof(error), 2000); NextAttemptAt = nextAttemptAt; }
    public void Retry(DateTime utcNow)
    {
        if (Status != OrderNotificationStatus.Failed) throw new InvalidOperationException("Only a failed notification can be retried.");
        Status = OrderNotificationStatus.Pending;
        AttemptCount = 0;
        NextAttemptAt = utcNow;
        LastError = null;
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
