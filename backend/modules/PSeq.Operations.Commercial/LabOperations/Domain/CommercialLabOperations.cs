namespace PSeq.Operations.Commercial.LabOperations.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum CommercialLabAuthorizationStatus
{
    Pending,
    Accepted,
    ManualReviewRequired,
    Rejected,
    Cancelled
}

public sealed class CommercialLabAuthorization : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid AuthorizationId { get; private set; }
    public Guid CommercialOrderId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public int AuthorizationVersion { get; private set; }
    public Guid CommandId { get; private set; }
    public string AuthorizationSnapshotJson { get; private set; } = null!;
    public CommercialLabAuthorizationStatus Status { get; private set; } = CommercialLabAuthorizationStatus.Pending;
    public Guid? LabWorkOrderId { get; private set; }
    public string? ProviderReasonCode { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CommercialLabAuthorization() { }

    public CommercialLabAuthorization(Guid authorizationId, Guid commercialOrderId,
        Guid organizationId, int authorizationVersion, Guid commandId,
        string authorizationSnapshotJson)
    {
        if (authorizationId == Guid.Empty || commercialOrderId == Guid.Empty
            || organizationId == Guid.Empty || commandId == Guid.Empty)
            throw new ArgumentException("Authorization, order, organization, and command identifiers are required.");
        if (authorizationVersion < 1) throw new ArgumentOutOfRangeException(nameof(authorizationVersion));
        AuthorizationId = authorizationId;
        CommercialOrderId = commercialOrderId;
        OrganizationId = organizationId;
        AuthorizationVersion = authorizationVersion;
        CommandId = commandId;
        AuthorizationSnapshotJson = string.IsNullOrWhiteSpace(authorizationSnapshotJson)
            ? throw new ArgumentException("An authorization snapshot is required.")
            : authorizationSnapshotJson;
    }

    public void RecordOutcome(Guid? workOrderId, string disposition, string? reasonCode)
    {
        LabWorkOrderId = workOrderId;
        ProviderReasonCode = string.IsNullOrWhiteSpace(reasonCode) ? null : reasonCode.Trim();
        Status = disposition switch
        {
            "Accepted" or "AlreadyApplied" => CommercialLabAuthorizationStatus.Accepted,
            "ManualReviewRequired" => CommercialLabAuthorizationStatus.ManualReviewRequired,
            _ => CommercialLabAuthorizationStatus.Rejected
        };
    }

    public void MarkCancelled() => Status = CommercialLabAuthorizationStatus.Cancelled;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class CommercialLabWorkProjection
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid AuthorizationId { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public int AuthorizationVersion { get; private set; }
    public string Milestone { get; private set; } = null!;
    public string ScheduleHealth { get; private set; } = null!;
    public DateTime? ExpectedCompletionAtUtc { get; private set; }
    public int ActiveCustomerActionCount { get; private set; }
    public string? CustomerSafeSummary { get; private set; }
    public string? PermittedQcProjectionJson { get; private set; }
    public DateTime LastChangedAtUtc { get; private set; }
    public long ProjectionVersion { get; private set; }

    private CommercialLabWorkProjection() { }

    public CommercialLabWorkProjection(Guid authorizationId, Guid workOrderId,
        int authorizationVersion, string milestone, string scheduleHealth,
        DateTime? expectedCompletionAtUtc, int activeCustomerActionCount,
        string? customerSafeSummary, string? permittedQcProjectionJson,
        DateTime lastChangedAtUtc, long projectionVersion)
    {
        AuthorizationId = authorizationId;
        LabWorkOrderId = workOrderId;
        Apply(authorizationVersion, milestone, scheduleHealth, expectedCompletionAtUtc,
            activeCustomerActionCount, customerSafeSummary, permittedQcProjectionJson,
            lastChangedAtUtc, projectionVersion);
    }

    public bool Apply(int authorizationVersion, string milestone, string scheduleHealth,
        DateTime? expectedCompletionAtUtc, int activeCustomerActionCount,
        string? customerSafeSummary, string? permittedQcProjectionJson,
        DateTime lastChangedAtUtc, long projectionVersion)
    {
        if (projectionVersion <= ProjectionVersion) return false;
        if (authorizationVersion < 1 || activeCustomerActionCount < 0)
            throw new ArgumentOutOfRangeException(nameof(authorizationVersion));
        AuthorizationVersion = authorizationVersion;
        Milestone = Required(milestone);
        ScheduleHealth = Required(scheduleHealth);
        ExpectedCompletionAtUtc = expectedCompletionAtUtc;
        ActiveCustomerActionCount = activeCustomerActionCount;
        CustomerSafeSummary = string.IsNullOrWhiteSpace(customerSafeSummary) ? null : customerSafeSummary.Trim();
        PermittedQcProjectionJson = string.IsNullOrWhiteSpace(permittedQcProjectionJson) ? null : permittedQcProjectionJson;
        LastChangedAtUtc = lastChangedAtUtc;
        ProjectionVersion = projectionVersion;
        return true;
    }

    private static string Required(string value) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException("A projection value is required.") : value.Trim();
}

public sealed class LabOperationsEventReceipt
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid EventId { get; private set; }
    public Guid AuthorizationId { get; private set; }
    public long ProjectionVersion { get; private set; }
    public DateTime ProcessedAtUtc { get; private set; }

    private LabOperationsEventReceipt() { }

    public LabOperationsEventReceipt(Guid eventId, Guid authorizationId,
        long projectionVersion, DateTime processedAtUtc)
    {
        EventId = eventId != Guid.Empty ? eventId : throw new ArgumentException("An event is required.");
        AuthorizationId = authorizationId != Guid.Empty ? authorizationId : throw new ArgumentException("An authorization is required.");
        ProjectionVersion = projectionVersion > 0 ? projectionVersion : throw new ArgumentOutOfRangeException(nameof(projectionVersion));
        ProcessedAtUtc = processedAtUtc;
    }
}
