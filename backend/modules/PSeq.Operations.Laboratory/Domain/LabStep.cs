namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabStep : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Key { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    public int LatestVersion { get; private set; }
    public DateTime? RetiredAtUtc { get; private set; }
    public Guid? RetiredByUserId { get; private set; }
    public string? RetirementReason { get; private set; }

    public void RequireCurrent()
    {
        if (RetiredAtUtc.HasValue) throw new InvalidOperationException("The Lab step is retired and cannot be changed or used for new work.");
    }

    public void Retire(string reason, Guid actorUserId, DateTime utcNow)
    {
        RequireCurrent();
        var validatedReason = Required(reason, nameof(reason), 1000);
        if (actorUserId == Guid.Empty) throw new ArgumentException("A retirement actor is required.", nameof(actorUserId));
        RetirementReason = validatedReason;
        RetiredByUserId = actorUserId;
        RetiredAtUtc = utcNow;
    }

    private LabStep() { }

    public LabStep(string key, string name, string? description)
    {
        Key = Required(key, nameof(key), 100);
        UpdateDetails(name, description);
    }

    public void UpdateDetails(string name, string? description)
    {
        RequireCurrent();
        Name = Required(name, nameof(name), 255);
        Description = Optional(description, 2000);
    }

    public void RecordVersion(int version)
    {
        RequireCurrent();
        if (version != LatestVersion + 1) throw new InvalidOperationException("Protocol versions must be sequential.");
        LatestVersion = version;
    }
}

public sealed class LabStepVersion
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabStepId { get; private set; }
    public int StepVersion { get; private set; }
    public LabProtocolStatus Status { get; private set; } = LabProtocolStatus.Draft;
    public string DefinitionJson { get; private set; } = null!;
    public Guid AuthoredByUserId { get; private set; }
    public DateTime AuthoredAtUtc { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public string? ApprovalOverrideReason { get; private set; }

    private LabStepVersion() { }

    public LabStepVersion(Guid labStepId, int stepVersion, string definitionJson,
        Guid authoredByUserId, DateTime authoredAtUtc)
    {
        LabStepId = labStepId != Guid.Empty ? labStepId : throw new ArgumentException("A Lab step is required.");
        StepVersion = stepVersion > 0 ? stepVersion : throw new ArgumentOutOfRangeException(nameof(stepVersion));
        DefinitionJson = RequiredDefinition(definitionJson);
        AuthoredByUserId = authoredByUserId != Guid.Empty ? authoredByUserId : throw new ArgumentException("An author is required.");
        AuthoredAtUtc = authoredAtUtc;
    }

    public void Approve(Guid actorUserId, DateTime utcNow, bool enforceActorSeparation = true)
    {
        if (Status != LabProtocolStatus.Draft) throw new InvalidOperationException("Only a draft Lab step can be approved.");
        if (actorUserId == Guid.Empty) throw new ArgumentException("An approval actor is required.");
        if (enforceActorSeparation && actorUserId == AuthoredByUserId)
            throw new InvalidOperationException("A Lab step author cannot approve the same Lab step version.");
        LabProtocolDefinition.Parse(DefinitionJson);
        Status = LabProtocolStatus.Approved;
        ApprovedByUserId = actorUserId;
        ApprovedAtUtc = utcNow;
    }

    public void UpdateDraft(string definitionJson, Guid actorUserId)
    {
        if (Status != LabProtocolStatus.Draft) throw new InvalidOperationException("Only a draft Lab step can be edited.");
        if (actorUserId == Guid.Empty) throw new ArgumentException("A draft author is required.");
        DefinitionJson = RequiredDefinition(definitionJson);
        AuthoredByUserId = actorUserId;
    }

    public void Discard()
    {
        if (Status != LabProtocolStatus.Draft) throw new InvalidOperationException("Only a draft Lab step can be discarded.");
        Status = LabProtocolStatus.Discarded;
    }

    public void ApproveWithOverride(Guid actorUserId, DateTime utcNow, string reason)
    {
        var validatedReason = LabAuditedEntity.Required(reason, nameof(reason), 2000);
        if (actorUserId != AuthoredByUserId)
            throw new InvalidOperationException("Use independent approval when the approver is not the author.");
        Approve(actorUserId, utcNow, enforceActorSeparation: false);
        ApprovalOverrideReason = validatedReason;
    }

    public void RequireReleaseApproval()
    {
        if (ApprovedByUserId is null || ApprovedByUserId == Guid.Empty
            || ApprovedAtUtc is null
            || ApprovedByUserId == AuthoredByUserId && string.IsNullOrWhiteSpace(ApprovalOverrideReason))
            throw new InvalidOperationException("The Lab step requires independent approval or a recorded administrator override before production use.");
    }

    public void Activate(Guid actorUserId)
    {
        if (Status != LabProtocolStatus.Approved) throw new InvalidOperationException("Only an approved Lab step can be activated.");
        if (actorUserId == Guid.Empty) throw new ArgumentException("An activation actor is required.");
        RequireReleaseApproval();
        LabProtocolDefinition.Parse(DefinitionJson);
        Status = LabProtocolStatus.Active;
    }

    public void Retire()
    {
        if (Status is not (LabProtocolStatus.Approved or LabProtocolStatus.Active))
            throw new InvalidOperationException("Only an approved or active Lab step can be retired.");
        Status = LabProtocolStatus.Retired;
    }

    private static string RequiredDefinition(string value)
    {
        var definition = LabProtocolDefinition.Parse(value);
        if (definition.Steps.Count != 1 || !definition.PreparationBatchEnabled)
            throw new ArgumentException("A Lab step version requires exactly one step with explicit capture scopes.");
        var step = definition.Steps[0];
        if (step.LabStepVersionId.HasValue || !step.Required || step.Condition is not null)
            throw new ArgumentException("Catalog content cannot reference another step or contain protocol placement conditions.");
        return definition.ToJson();
    }
}
