namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabWorkEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid? LabSpecimenId { get; private set; }
    public string EventCode { get; private set; } = null!;
    public DateTime OccurredAtUtc { get; private set; }
    public Guid? ActorUserId { get; private set; }
    public string DetailsJson { get; private set; } = "{}";

    private LabWorkEvent()
    {
    }

    public LabWorkEvent(
        Guid labWorkOrderId,
        Guid? labSpecimenId,
        string eventCode,
        DateTime occurredAtUtc,
        Guid? actorUserId,
        string detailsJson)
    {
        if (labWorkOrderId == Guid.Empty)
        {
            throw new ArgumentException("A Lab work-order identifier is required.", nameof(labWorkOrderId));
        }

        LabWorkOrderId = labWorkOrderId;
        LabSpecimenId = labSpecimenId;
        EventCode = string.IsNullOrWhiteSpace(eventCode)
            ? throw new ArgumentException("A controlled event code is required.", nameof(eventCode))
            : eventCode.Trim();
        OccurredAtUtc = occurredAtUtc;
        ActorUserId = actorUserId;
        DetailsJson = string.IsNullOrWhiteSpace(detailsJson) ? "{}" : detailsJson;
    }
}

public sealed class LabScientificApproval
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public int ApprovalVersion { get; private set; }
    public string ReleaseDefinitionKey { get; private set; } = null!;
    public int ReleaseDefinitionVersion { get; private set; }
    public string? PermittedQcProjectionJson { get; private set; }
    public Guid ApprovedByUserId { get; private set; }
    public DateTime ApprovedAtUtc { get; private set; }
    public long ProjectionVersion { get; private set; }

    private LabScientificApproval()
    {
    }

    public LabScientificApproval(
        Guid labWorkOrderId,
        int approvalVersion,
        string releaseDefinitionKey,
        int releaseDefinitionVersion,
        string? permittedQcProjectionJson,
        Guid approvedByUserId,
        DateTime approvedAtUtc,
        long projectionVersion)
    {
        if (labWorkOrderId == Guid.Empty || approvedByUserId == Guid.Empty)
        {
            throw new ArgumentException("Work-order and approver identifiers must be non-empty.");
        }

        if (approvalVersion < 1 || releaseDefinitionVersion < 1 || projectionVersion < 1)
        {
            throw new ArgumentOutOfRangeException(
                nameof(approvalVersion),
                "Approval, release-definition, and projection versions must be positive.");
        }

        LabWorkOrderId = labWorkOrderId;
        ApprovalVersion = approvalVersion;
        ReleaseDefinitionKey = string.IsNullOrWhiteSpace(releaseDefinitionKey)
            ? throw new ArgumentException("A release-definition key is required.", nameof(releaseDefinitionKey))
            : releaseDefinitionKey.Trim();
        ReleaseDefinitionVersion = releaseDefinitionVersion;
        PermittedQcProjectionJson = string.IsNullOrWhiteSpace(permittedQcProjectionJson)
            ? null
            : permittedQcProjectionJson;
        ApprovedByUserId = approvedByUserId;
        ApprovedAtUtc = approvedAtUtc;
        ProjectionVersion = projectionVersion;
    }
}
