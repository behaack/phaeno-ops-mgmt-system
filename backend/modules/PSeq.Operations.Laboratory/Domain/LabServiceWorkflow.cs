namespace PSeq.Operations.Laboratory.Domain;

public enum LabServiceWorkflowStatus
{
    Draft,
    Approved,
    Production,
    Retired,
    Discarded
}

public enum LabServiceWorkflowStageRequirement
{
    Required,
    Optional,
    Conditional
}

public sealed class LabServiceWorkflow : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string ServiceKey { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    public int LatestVersion { get; private set; }

    private LabServiceWorkflow() { }

    public LabServiceWorkflow(string serviceKey, string name, string? description)
    {
        ServiceKey = Required(serviceKey, nameof(serviceKey), 255).ToLowerInvariant();
        Name = Required(name, nameof(name), 255);
        Description = Optional(description, 2000);
    }

    public void RecordVersion(int version)
    {
        if (version != LatestVersion + 1)
            throw new InvalidOperationException("Workflow versions must be sequential.");
        LatestVersion = version;
    }
}

public sealed class LabServiceWorkflowVersion : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceWorkflowId { get; private set; }
    public int WorkflowVersion { get; private set; }
    public LabServiceWorkflowStatus Status { get; private set; } = LabServiceWorkflowStatus.Draft;
    public Guid AuthoredByUserId { get; private set; }
    public DateTime AuthoredAtUtc { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public Guid? ProductionByUserId { get; private set; }
    public DateTime? ProductionAtUtc { get; private set; }

    private LabServiceWorkflowVersion() { }

    public LabServiceWorkflowVersion(Guid labServiceWorkflowId, int workflowVersion,
        Guid authoredByUserId, DateTime authoredAtUtc)
    {
        LabServiceWorkflowId = labServiceWorkflowId != Guid.Empty
            ? labServiceWorkflowId
            : throw new ArgumentException("A service workflow is required.");
        WorkflowVersion = workflowVersion > 0
            ? workflowVersion
            : throw new ArgumentOutOfRangeException(nameof(workflowVersion));
        AuthoredByUserId = authoredByUserId != Guid.Empty
            ? authoredByUserId
            : throw new ArgumentException("An author is required.");
        AuthoredAtUtc = authoredAtUtc;
    }

    public void Approve(Guid actorUserId, DateTime utcNow, bool enforceActorSeparation = true)
    {
        if (Status != LabServiceWorkflowStatus.Draft)
            throw new InvalidOperationException("Only a draft workflow can be approved.");
        RequireActor(actorUserId, "An approval actor is required.");
        if (enforceActorSeparation && actorUserId == AuthoredByUserId)
            throw new InvalidOperationException("A workflow author cannot approve the same workflow version.");
        Status = LabServiceWorkflowStatus.Approved;
        ApprovedByUserId = actorUserId;
        ApprovedAtUtc = utcNow;
    }

    public void WithdrawApproval()
    {
        if (Status != LabServiceWorkflowStatus.Approved)
            throw new InvalidOperationException("Only an approved workflow can return to draft.");
        Status = LabServiceWorkflowStatus.Draft;
        ApprovedByUserId = null;
        ApprovedAtUtc = null;
    }

    public void Discard()
    {
        if (Status != LabServiceWorkflowStatus.Draft)
            throw new InvalidOperationException("Only a draft workflow can be discarded.");
        Status = LabServiceWorkflowStatus.Discarded;
    }

    public void PromoteToProduction(Guid actorUserId, DateTime utcNow,
        bool enforceActorSeparation = true)
    {
        if (Status != LabServiceWorkflowStatus.Approved)
            throw new InvalidOperationException("Only an approved workflow can enter production.");
        RequireActor(actorUserId, "A production actor is required.");
        if (enforceActorSeparation && actorUserId == AuthoredByUserId)
            throw new InvalidOperationException("A workflow author cannot promote the same workflow version.");
        Status = LabServiceWorkflowStatus.Production;
        ProductionByUserId = actorUserId;
        ProductionAtUtc = utcNow;
    }

    public void Retire()
    {
        if (Status != LabServiceWorkflowStatus.Production)
            throw new InvalidOperationException("Only a production workflow can be retired.");
        Status = LabServiceWorkflowStatus.Retired;
    }

    private static void RequireActor(Guid actorUserId, string message)
    {
        if (actorUserId == Guid.Empty) throw new ArgumentException(message);
    }
}

public sealed class LabServiceWorkflowStage
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceWorkflowVersionId { get; private set; }
    public int Sequence { get; private set; }
    public string Name { get; private set; } = null!;
    public Guid LabProtocolVersionId { get; private set; }
    public LabServiceWorkflowStageRequirement Requirement { get; private set; }
    public string? Condition { get; private set; }
    public string? HandoffCriteria { get; private set; }

    private LabServiceWorkflowStage() { }

    public LabServiceWorkflowStage(Guid labServiceWorkflowVersionId, int sequence,
        string name, Guid labProtocolVersionId, LabServiceWorkflowStageRequirement requirement,
        string? condition, string? handoffCriteria)
    {
        LabServiceWorkflowVersionId = labServiceWorkflowVersionId != Guid.Empty
            ? labServiceWorkflowVersionId
            : throw new ArgumentException("A workflow version is required.");
        Sequence = sequence > 0 ? sequence : throw new ArgumentOutOfRangeException(nameof(sequence));
        Name = LabAuditedEntity.Required(name, nameof(name), 255);
        LabProtocolVersionId = labProtocolVersionId != Guid.Empty
            ? labProtocolVersionId
            : throw new ArgumentException("A protocol version is required.");
        Requirement = requirement;
        Condition = requirement == LabServiceWorkflowStageRequirement.Conditional
            ? LabAuditedEntity.Required(condition ?? string.Empty, nameof(condition), 1000)
            : LabAuditedEntity.Optional(condition, 1000);
        HandoffCriteria = LabAuditedEntity.Optional(handoffCriteria, 2000);
    }
}
