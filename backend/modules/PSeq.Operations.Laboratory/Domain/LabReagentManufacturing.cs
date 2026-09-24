namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;
using System.Text.RegularExpressions;

public sealed record LabReagentStep(string Key, string Name, string Instructions);

public enum LabReagentWorkflowStatus { Draft, Approved, Retired }

public sealed class LabReagentWorkflow : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public Guid MaterialDefinitionId { get; private set; }
    public string StepsJson { get; private set; } = null!;
    public int Revision { get; private set; } = 1;
    public LabReagentWorkflowStatus Status { get; private set; } = LabReagentWorkflowStatus.Draft;
    public Guid AuthoredByUserId { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public string? ApprovalOverrideReason { get; private set; }

    private LabReagentWorkflow() { }

    public LabReagentWorkflow(string name, Guid materialDefinitionId,
        IReadOnlyList<LabReagentStep> steps, Guid authorId)
    {
        if (materialDefinitionId == Guid.Empty || authorId == Guid.Empty)
            throw new ArgumentException("A prepared reagent and author are required.");
        Name = LabAuditedEntity.Required(name, nameof(name), 160);
        MaterialDefinitionId = materialDefinitionId;
        StepsJson = SerializeSteps(steps);
        AuthoredByUserId = authorId;
    }

    public IReadOnlyList<LabReagentStep> Steps() =>
        JsonSerializer.Deserialize<List<LabReagentStep>>(StepsJson) ?? [];

    public void Revise(string name, Guid materialDefinitionId,
        IReadOnlyList<LabReagentStep> steps, Guid authorId)
    {
        if (Status == LabReagentWorkflowStatus.Retired)
            throw new InvalidOperationException("Create a new workflow for a retired procedure.");
        if (materialDefinitionId == Guid.Empty || authorId == Guid.Empty)
            throw new ArgumentException("A prepared reagent and author are required.");
        if (materialDefinitionId != MaterialDefinitionId)
            throw new InvalidOperationException("A reagent workflow cannot be reassigned to a different reagent. Create its own workflow instead.");
        Name = LabAuditedEntity.Required(name, nameof(name), 160);
        StepsJson = SerializeSteps(steps);
        Revision++;
        Status = LabReagentWorkflowStatus.Draft;
        AuthoredByUserId = authorId;
        ApprovedByUserId = null;
        ApprovedAtUtc = null;
        ApprovalOverrideReason = null;
    }

    public void Approve(Guid actorId, DateTime utcNow, bool administratorOverride = false,
        string? overrideReason = null)
    {
        if (Status != LabReagentWorkflowStatus.Draft)
            throw new InvalidOperationException("Only a draft reagent workflow can be approved.");
        if (actorId == Guid.Empty) throw new ArgumentException("An approver is required.");
        if (actorId == AuthoredByUserId && !administratorOverride)
            throw new InvalidOperationException("A different administrator must approve this procedure, or a platform administrator must record an override reason.");
        if (administratorOverride && actorId == AuthoredByUserId)
            ApprovalOverrideReason = LabAuditedEntity.Required(overrideReason!, nameof(overrideReason), 2000);
        Status = LabReagentWorkflowStatus.Approved;
        ApprovedByUserId = actorId;
        ApprovedAtUtc = utcNow;
    }

    public void Retire()
    {
        if (Status != LabReagentWorkflowStatus.Approved)
            throw new InvalidOperationException("Only an approved reagent workflow can be retired.");
        Status = LabReagentWorkflowStatus.Retired;
    }

    private static string SerializeSteps(IReadOnlyList<LabReagentStep> steps)
    {
        if (steps is null || steps.Count is < 1 or > 100)
            throw new ArgumentException("A reagent workflow needs 1 to 100 steps.");
        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var step in steps)
        {
            if (step is null || string.IsNullOrWhiteSpace(step.Key)
                || !Regex.IsMatch(step.Key, "^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant)
                || step.Key.Length > 100 || !keys.Add(step.Key))
                throw new ArgumentException("Every reagent step needs a unique readable key.");
            LabAuditedEntity.Required(step.Name, nameof(step.Name), 160);
            LabAuditedEntity.Required(step.Instructions, nameof(step.Instructions), 4000);
        }
        return JsonSerializer.Serialize(steps);
    }
}

public enum LabReagentRunStatus { InProgress, Completed, Abandoned }

public sealed class LabReagentManufacturingRun : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid WorkflowId { get; private set; }
    public int WorkflowRevision { get; private set; }
    public string WorkflowName { get; private set; } = null!;
    public string StepsJson { get; private set; } = null!;
    public Guid MaterialLotId { get; private set; }
    public LabReagentRunStatus Status { get; private set; } = LabReagentRunStatus.InProgress;
    public int RecordedStepCount { get; private set; }
    public int MaterialUseCount { get; private set; }
    public Guid StartedByUserId { get; private set; }
    public DateTime StartedAtUtc { get; private set; }
    public Guid? FinishedByUserId { get; private set; }
    public DateTime? FinishedAtUtc { get; private set; }
    public string? AbandonmentReason { get; private set; }

    private LabReagentManufacturingRun() { }

    public LabReagentManufacturingRun(LabReagentWorkflow workflow, Guid materialLotId,
        Guid actorId, DateTime utcNow)
    {
        if (workflow.Status != LabReagentWorkflowStatus.Approved)
            throw new InvalidOperationException("Start from an approved reagent workflow.");
        if (materialLotId == Guid.Empty || actorId == Guid.Empty)
            throw new ArgumentException("A material lot and operator are required.");
        WorkflowId = workflow.Id;
        WorkflowRevision = workflow.Revision;
        WorkflowName = workflow.Name;
        StepsJson = workflow.StepsJson;
        MaterialLotId = materialLotId;
        StartedByUserId = actorId;
        StartedAtUtc = utcNow;
    }

    public IReadOnlyList<LabReagentStep> Steps() =>
        JsonSerializer.Deserialize<List<LabReagentStep>>(StepsJson) ?? [];

    public void RecordStep(int index)
    {
        if (Status != LabReagentRunStatus.InProgress)
            throw new InvalidOperationException("Only an active run can record steps.");
        if (index != RecordedStepCount || index >= Steps().Count)
            throw new InvalidOperationException("Record reagent steps in their approved order.");
        RecordedStepCount++;
    }

    public void RecordMaterialUse()
    {
        if (Status != LabReagentRunStatus.InProgress)
            throw new InvalidOperationException("Only an active run can use material.");
        MaterialUseCount++;
    }

    public void Complete(Guid actorId, DateTime utcNow)
    {
        if (Status != LabReagentRunStatus.InProgress || RecordedStepCount != Steps().Count
            || MaterialUseCount == 0)
            throw new InvalidOperationException("Record every step and at least one source-lot use before completing the reagent.");
        Status = LabReagentRunStatus.Completed;
        FinishedByUserId = actorId;
        FinishedAtUtc = utcNow;
    }

    public void Abandon(string reason, Guid actorId, DateTime utcNow)
    {
        if (Status != LabReagentRunStatus.InProgress)
            throw new InvalidOperationException("Only an active run can be abandoned.");
        AbandonmentReason = LabAuditedEntity.Required(reason, nameof(reason), 2000);
        Status = LabReagentRunStatus.Abandoned;
        FinishedByUserId = actorId;
        FinishedAtUtc = utcNow;
    }
}

public sealed class LabReagentRunStep
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RunId { get; private set; }
    public int Sequence { get; private set; }
    public string StepKey { get; private set; } = null!;
    public string Notes { get; private set; } = null!;
    public Guid PerformedByUserId { get; private set; }
    public DateTime PerformedAtUtc { get; private set; }

    private LabReagentRunStep() { }

    public LabReagentRunStep(Guid runId, int sequence, string stepKey, string notes,
        Guid actorId, DateTime utcNow)
    {
        if (runId == Guid.Empty || actorId == Guid.Empty || sequence < 0)
            throw new ArgumentException("A run, step and performer are required.");
        RunId = runId;
        Sequence = sequence;
        StepKey = LabAuditedEntity.Required(stepKey, nameof(stepKey), 100);
        Notes = LabAuditedEntity.Required(notes, nameof(notes), 4000);
        PerformedByUserId = actorId;
        PerformedAtUtc = utcNow;
    }
}

public sealed class LabReagentMaterialUse
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RunId { get; private set; }
    public Guid SourceMaterialLotId { get; private set; }
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public bool MaterialExhausted { get; private set; }
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }

    private LabReagentMaterialUse() { }

    public LabReagentMaterialUse(Guid runId, Guid sourceMaterialLotId,
        decimal quantity, string unit, bool exhausted, Guid actorId, DateTime utcNow)
    {
        if (runId == Guid.Empty || sourceMaterialLotId == Guid.Empty || actorId == Guid.Empty || quantity <= 0)
            throw new ArgumentException("A run, source lot, operator and positive amount are required.");
        RunId = runId;
        SourceMaterialLotId = sourceMaterialLotId;
        Quantity = quantity;
        QuantityUnit = LabAuditedEntity.Required(unit, nameof(unit), 50);
        MaterialExhausted = exhausted;
        RecordedByUserId = actorId;
        RecordedAtUtc = utcNow;
    }
}
