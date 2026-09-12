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
    Received,
    OnHold,
    Processing,
    AwaitingExternalSequencing,
    DataProcessing,
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
    public Guid? LabServiceWorkflowVersionId { get; private set; }
    public string? TubeUsePolicyKey { get; private set; }
    public int? TubeUsePolicyVersion { get; private set; }
    public int? TubeUsePolicyAuthorizationVersion { get; private set; }
    public string TurnaroundPolicyKey { get; private set; } = null!;
    public int? MinimumTurnaroundDays { get; private set; }
    public int? MaximumTurnaroundDays { get; private set; }
    public DateTime? OriginalTargetAtUtc { get; private set; }
    public DateTime? ExpectedCompletionAtUtc { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }
    public bool HasTimingOverride { get; private set; }
    public string? OpaqueSubmitterReference { get; private set; }
    public LabWorkOrderStatus Status { get; private set; } = LabWorkOrderStatus.AwaitingSpecimens;
    public long ProjectionVersion { get; private set; } = 1;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    public ICollection<LabWorkAuthorizationVersion> AuthorizationVersions { get; } = [];
    public ICollection<LabSpecimen> Specimens { get; } = [];
    public ICollection<LabWorkEvent> Events { get; } = [];
    public ICollection<LabScientificApproval> ScientificApprovals { get; } = [];

    public void SetTubeUsePolicy(string key, int version)
    {
        if (key != LabTubeUsePolicy.RunOneWithFailureFallback || version != LabTubeUsePolicy.Version)
            throw new ArgumentException("The tube-use policy is not supported.");
        if (TubeUsePolicyKey is not null && (TubeUsePolicyKey != key || TubeUsePolicyVersion != version))
            throw new InvalidOperationException("The authorized tube-use policy cannot be replaced.");
        TubeUsePolicyKey = key; TubeUsePolicyVersion = version;
        TubeUsePolicyAuthorizationVersion ??= CurrentAuthorizationVersion;
    }

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
        string? opaqueSubmitterReference,
        Guid? labServiceWorkflowVersionId = null,
        int? minimumTurnaroundDays = null,
        int? maximumTurnaroundDays = null)
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
        LabServiceWorkflowVersionId = ValidOptionalId(
            labServiceWorkflowVersionId, nameof(labServiceWorkflowVersionId));
        TurnaroundPolicyKey = Required(turnaroundPolicyKey, nameof(turnaroundPolicyKey));
        OpaqueSubmitterReference = Optional(opaqueSubmitterReference);
        if (minimumTurnaroundDays.HasValue != maximumTurnaroundDays.HasValue
            || minimumTurnaroundDays is < 1 or > 365 || maximumTurnaroundDays is < 1 or > 365
            || minimumTurnaroundDays > maximumTurnaroundDays)
            throw new ArgumentException("A complete valid turnaround range is required.");
        MinimumTurnaroundDays = minimumTurnaroundDays;
        MaximumTurnaroundDays = maximumTurnaroundDays;
    }

    public void RecordAuthorizationVersion(
        int authorizationVersion,
        string serviceKey,
        int serviceVersion,
        string turnaroundPolicyKey,
        string? opaqueSubmitterReference,
        Guid? labServiceWorkflowVersionId = null)
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
        LabServiceWorkflowVersionId = ValidOptionalId(
            labServiceWorkflowVersionId, nameof(labServiceWorkflowVersionId));
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
        ProjectionVersion++;
    }

    public void RecordMilestone(LabWorkOrderStatus status)
    {
        if (Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease)
        {
            throw new InvalidOperationException("A terminal Lab work order cannot transition.");
        }

        var allowed = (Status, status) switch
        {
            (LabWorkOrderStatus.AwaitingSpecimens, LabWorkOrderStatus.Received) => true,
            (LabWorkOrderStatus.AwaitingSpecimens, LabWorkOrderStatus.OnHold) => true,
            (LabWorkOrderStatus.AwaitingSpecimens, LabWorkOrderStatus.Processing) => true,
            (LabWorkOrderStatus.OnHold, LabWorkOrderStatus.AwaitingSpecimens) => true,
            (LabWorkOrderStatus.OnHold, LabWorkOrderStatus.Received) => true,
            (LabWorkOrderStatus.OnHold, LabWorkOrderStatus.Processing) => true,
            (LabWorkOrderStatus.OnHold, LabWorkOrderStatus.AwaitingExternalSequencing) => true,
            (LabWorkOrderStatus.OnHold, LabWorkOrderStatus.DataProcessing) => true,
            (LabWorkOrderStatus.OnHold, LabWorkOrderStatus.ScientificReview) => true,
            (LabWorkOrderStatus.Received, LabWorkOrderStatus.OnHold) => true,
            (LabWorkOrderStatus.Received, LabWorkOrderStatus.Processing) => true,
            (LabWorkOrderStatus.Processing, LabWorkOrderStatus.OnHold) => true,
            (LabWorkOrderStatus.Processing, LabWorkOrderStatus.AwaitingExternalSequencing) => true,
            (LabWorkOrderStatus.Processing, LabWorkOrderStatus.DataProcessing) => true,
            (LabWorkOrderStatus.Processing, LabWorkOrderStatus.ScientificReview) => true,
            (LabWorkOrderStatus.AwaitingExternalSequencing, LabWorkOrderStatus.OnHold) => true,
            (LabWorkOrderStatus.AwaitingExternalSequencing, LabWorkOrderStatus.DataProcessing) => true,
            (LabWorkOrderStatus.DataProcessing, LabWorkOrderStatus.OnHold) => true,
            (LabWorkOrderStatus.DataProcessing, LabWorkOrderStatus.ScientificReview) => true,
            (LabWorkOrderStatus.ScientificReview, LabWorkOrderStatus.OnHold) => true,
            (LabWorkOrderStatus.ScientificReview, LabWorkOrderStatus.Processing) => true,
            (LabWorkOrderStatus.ScientificReview, LabWorkOrderStatus.ReadyForRelease) => true,
            _ => false
        };
        if (!allowed)
        {
            throw new InvalidOperationException($"A Lab work order cannot transition from {Status} to {status}.");
        }

        Status = status;
        if (status == LabWorkOrderStatus.ReadyForRelease)
        {
            CompletedAtUtc ??= DateTime.UtcNow;
            foreach (var specimen in Specimens) specimen.Complete(CompletedAtUtc.Value);
        }
        ProjectionVersion++;
    }

    public void RefreshAcceptedSpecimenTargets()
    {
        if (!MaximumTurnaroundDays.HasValue) return;
        foreach (var specimen in Specimens.Where(value => value.AcceptedAtUtc.HasValue))
            specimen.SetOriginalTarget(MaximumTurnaroundDays.Value);
        OriginalTargetAtUtc = Specimens.Select(value => value.OriginalTargetAtUtc).Max();
        if (!HasTimingOverride) ExpectedCompletionAtUtc = OriginalTargetAtUtc;
    }

    public void OverrideExpectedCompletion(DateTime expectedAtUtc)
    {
        if (Status is LabWorkOrderStatus.ReadyForRelease or LabWorkOrderStatus.Cancelled || !OriginalTargetAtUtc.HasValue)
            throw new InvalidOperationException("Only an accepted, unfinished Job with a quoted turnaround can change its expected completion.");
        if (expectedAtUtc.Kind != DateTimeKind.Utc || expectedAtUtc <= DateTime.UtcNow)
            throw new ArgumentException("Expected completion must be a future UTC date.");
        if (ExpectedCompletionAtUtc == expectedAtUtc) throw new InvalidOperationException("Choose a different expected completion date.");
        ExpectedCompletionAtUtc = expectedAtUtc;
        HasTimingOverride = true;
        ProjectionVersion++;
    }

    public string ScheduleHealth(DateTime now) => Status is LabWorkOrderStatus.ReadyForRelease or LabWorkOrderStatus.Cancelled ? "Complete"
        : ExpectedCompletionAtUtc < now ? "Delayed"
        : Status == LabWorkOrderStatus.OnHold || ExpectedCompletionAtUtc > OriginalTargetAtUtc ? "AtRisk" : "OnTrack";

    public void AdvanceProjectionVersion() => ProjectionVersion++;

    public void PinServiceWorkflow(Guid workflowVersionId)
    {
        if (workflowVersionId == Guid.Empty)
            throw new ArgumentException("A workflow version is required.", nameof(workflowVersionId));
        if (LabServiceWorkflowVersionId.HasValue && LabServiceWorkflowVersionId != workflowVersionId)
            throw new InvalidOperationException("This laboratory job is already pinned to a different workflow version.");
        LabServiceWorkflowVersionId = workflowVersionId;
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

    private static Guid? ValidOptionalId(Guid? value, string parameterName) =>
        value == Guid.Empty ? throw new ArgumentException("An identifier cannot be empty.", parameterName) : value;
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
