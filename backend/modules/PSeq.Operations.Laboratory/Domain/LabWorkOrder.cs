namespace PSeq.Operations.Laboratory.Domain;

using PSeq.Operations.Laboratory.Common.Persistence;

public enum LabAuthorizationSource
{
    CommercialOrder,
    TrialProject
}

public enum LabWorkOrderStatus
{
    AwaitingSpecimens,
    OnHold,
    Processing,
    ScientificReview,
    ReadyForRelease,
    Cancelled
}

public sealed class LabWorkOrder : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid AuthorizationId { get; private set; }
    public int CurrentAuthorizationVersion { get; private set; }
    public LabAuthorizationSource AuthorizationSource { get; private set; }
    public Guid AuthorizationSourceId { get; private set; }
    public Guid SubmittingOrganizationId { get; private set; }
    public string ServiceKey { get; private set; } = null!;
    public int ServiceVersion { get; private set; }
    public string TurnaroundPolicyKey { get; private set; } = null!;
    public string? OpaqueSubmitterReference { get; private set; }
    public LabWorkOrderStatus Status { get; private set; } = LabWorkOrderStatus.AwaitingSpecimens;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    public ICollection<LabWorkAuthorizationVersion> AuthorizationVersions { get; } = [];
    public ICollection<LabSpecimen> Specimens { get; } = [];
    public ICollection<LabWorkEvent> Events { get; } = [];
    public ICollection<LabScientificApproval> ScientificApprovals { get; } = [];

    private LabWorkOrder()
    {
    }

    public LabWorkOrder(
        Guid authorizationId,
        int authorizationVersion,
        LabAuthorizationSource authorizationSource,
        Guid authorizationSourceId,
        Guid submittingOrganizationId,
        string serviceKey,
        int serviceVersion,
        string turnaroundPolicyKey,
        string? opaqueSubmitterReference)
    {
        if (authorizationId == Guid.Empty
            || authorizationSourceId == Guid.Empty
            || submittingOrganizationId == Guid.Empty)
        {
            throw new ArgumentException("Lab work identifiers must be non-empty.");
        }

        if (authorizationVersion < 1 || serviceVersion < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(authorizationVersion),
                "Authorization and service versions must be positive.");
        }

        AuthorizationId = authorizationId;
        CurrentAuthorizationVersion = authorizationVersion;
        AuthorizationSource = authorizationSource;
        AuthorizationSourceId = authorizationSourceId;
        SubmittingOrganizationId = submittingOrganizationId;
        ServiceKey = Required(serviceKey, nameof(serviceKey));
        ServiceVersion = serviceVersion;
        TurnaroundPolicyKey = Required(turnaroundPolicyKey, nameof(turnaroundPolicyKey));
        OpaqueSubmitterReference = Optional(opaqueSubmitterReference);
    }

    public void RecordAuthorizationVersion(
        int authorizationVersion,
        string serviceKey,
        int serviceVersion,
        string turnaroundPolicyKey,
        string? opaqueSubmitterReference)
    {
        if (authorizationVersion <= CurrentAuthorizationVersion)
        {
            throw new InvalidOperationException("A replacement authorization version must move forward.");
        }

        if (serviceVersion < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(serviceVersion));
        }

        CurrentAuthorizationVersion = authorizationVersion;
        ServiceKey = Required(serviceKey, nameof(serviceKey));
        ServiceVersion = serviceVersion;
        TurnaroundPolicyKey = Required(turnaroundPolicyKey, nameof(turnaroundPolicyKey));
        OpaqueSubmitterReference = Optional(opaqueSubmitterReference);
    }

    public void CancelBeforeExecution()
    {
        if (Status != LabWorkOrderStatus.AwaitingSpecimens)
        {
            throw new InvalidOperationException("Only work awaiting specimens can be cancelled automatically.");
        }

        Status = LabWorkOrderStatus.Cancelled;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    private static string Required(string value, string parameterName) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("A value is required.", parameterName)
            : value.Trim();

    private static string? Optional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class LabWorkAuthorizationVersion
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid CommandId { get; private set; }
    public Guid CorrelationId { get; private set; }
    public int AuthorizationVersion { get; private set; }
    public int ContractVersion { get; private set; }
    public string SnapshotJson { get; private set; } = null!;
    public string PayloadSha256 { get; private set; } = null!;
    public DateTime OccurredAtUtc { get; private set; }

    private LabWorkAuthorizationVersion()
    {
    }

    public LabWorkAuthorizationVersion(
        Guid labWorkOrderId,
        Guid commandId,
        Guid correlationId,
        int authorizationVersion,
        int contractVersion,
        string snapshotJson,
        string payloadSha256,
        DateTime occurredAtUtc)
    {
        if (labWorkOrderId == Guid.Empty || commandId == Guid.Empty || correlationId == Guid.Empty)
        {
            throw new ArgumentException("Authorization identifiers must be non-empty.");
        }

        if (authorizationVersion < 1 || contractVersion < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(authorizationVersion),
                "Authorization and contract versions must be positive.");
        }

        if (string.IsNullOrWhiteSpace(snapshotJson))
        {
            throw new ArgumentException("An immutable authorization snapshot is required.", nameof(snapshotJson));
        }

        if (payloadSha256.Length != 64 || payloadSha256.Any(character => !Uri.IsHexDigit(character)))
        {
            throw new ArgumentException("Payload SHA-256 must be a 64-character hexadecimal value.", nameof(payloadSha256));
        }

        LabWorkOrderId = labWorkOrderId;
        CommandId = commandId;
        CorrelationId = correlationId;
        AuthorizationVersion = authorizationVersion;
        ContractVersion = contractVersion;
        SnapshotJson = snapshotJson;
        PayloadSha256 = payloadSha256.ToLowerInvariant();
        OccurredAtUtc = occurredAtUtc;
    }
}
