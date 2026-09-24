namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;

public sealed record LabKitAssemblyStep(Guid LabStepVersionId, string Name, string Instructions);
public enum LabKitAssemblyRevisionStatus { Draft, Approved, Retired }
public enum LabKitAssemblyRunStatus { InProgress, Completed, Abandoned }

public sealed class LabKitAssemblyWorkflow : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid FinishedKitProductId { get; private set; }
    public int LatestRevision { get; private set; } = 1;
    private LabKitAssemblyWorkflow() { }
    public LabKitAssemblyWorkflow(Guid productId)
    {
        if (productId == Guid.Empty) throw new ArgumentException("Choose a finished transportation kit product.");
        FinishedKitProductId = productId;
    }
    public int NextRevision() => ++LatestRevision;
}

public sealed class LabKitAssemblyWorkflowRevision
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid WorkflowId { get; private set; }
    public int Revision { get; private set; }
    public string StepsJson { get; private set; } = null!;
    public LabKitAssemblyRevisionStatus Status { get; private set; } = LabKitAssemblyRevisionStatus.Draft;
    public Guid AuthoredByUserId { get; private set; }
    public DateTime AuthoredAtUtc { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public string? ApprovalOverrideReason { get; private set; }
    public ICollection<LabKitAssemblyComponent> Components { get; private set; } = [];
    private LabKitAssemblyWorkflowRevision() { }
    public LabKitAssemblyWorkflowRevision(Guid workflowId, int revision, IReadOnlyList<LabKitAssemblyStep> steps,
        Guid authorId, DateTime utcNow)
    {
        if (workflowId == Guid.Empty || revision < 1 || authorId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc)
            throw new ArgumentException("A workflow, revision, author, and UTC time are required.");
        if (steps.Count is < 1 or > 100 || steps.Any(step => step.LabStepVersionId == Guid.Empty
            || string.IsNullOrWhiteSpace(step.Name) || string.IsNullOrWhiteSpace(step.Instructions))
            || steps.Select(step => step.LabStepVersionId).Distinct().Count() != steps.Count)
            throw new ArgumentException("Choose 1 to 100 distinct approved Lab step versions.");
        WorkflowId = workflowId;
        Revision = revision;
        StepsJson = JsonSerializer.Serialize(steps);
        AuthoredByUserId = authorId;
        AuthoredAtUtc = utcNow;
    }
    public IReadOnlyList<LabKitAssemblyStep> Steps() => JsonSerializer.Deserialize<List<LabKitAssemblyStep>>(StepsJson) ?? [];
    public void UpdateDraft(IReadOnlyList<LabKitAssemblyStep> steps, Guid actorId, DateTime utcNow)
    {
        if (Status != LabKitAssemblyRevisionStatus.Draft || steps.Count is < 1 or > 100
            || steps.Any(step => step.LabStepVersionId == Guid.Empty || string.IsNullOrWhiteSpace(step.Name)
                || string.IsNullOrWhiteSpace(step.Instructions))
            || steps.Select(step => step.LabStepVersionId).Distinct().Count() != steps.Count)
            throw new InvalidOperationException("Only a draft can be changed with distinct approved Lab steps.");
        StepsJson = JsonSerializer.Serialize(steps);
        AuthoredByUserId = actorId;
        AuthoredAtUtc = utcNow;
    }
    public void Approve(Guid actorId, DateTime utcNow, string? overrideReason,
        bool administratorOverride = false)
    {
        if (Status != LabKitAssemblyRevisionStatus.Draft || actorId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc)
            throw new InvalidOperationException("Approve a draft kit workflow with a valid administrator.");
        if (actorId == AuthoredByUserId && (!administratorOverride || string.IsNullOrWhiteSpace(overrideReason)))
            throw new InvalidOperationException("A different administrator must approve this revision, or a platform administrator must record an override reason.");
        if (overrideReason?.Trim().Length > 2000)
            throw new ArgumentException("An approval reason cannot exceed 2,000 characters.");
        if (Components.Count == 0) throw new InvalidOperationException("Add the kit bill of materials before approval.");
        Status = LabKitAssemblyRevisionStatus.Approved;
        ApprovedByUserId = actorId;
        ApprovedAtUtc = utcNow;
        ApprovalOverrideReason = actorId == AuthoredByUserId ? overrideReason!.Trim() : null;
    }
    public void Retire()
    {
        if (Status != LabKitAssemblyRevisionStatus.Approved) throw new InvalidOperationException("Only an approved revision can be retired.");
        Status = LabKitAssemblyRevisionStatus.Retired;
    }
}

public sealed class LabKitAssemblyComponent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid WorkflowRevisionId { get; private set; }
    public Guid SupplierProductId { get; private set; }
    public int Quantity { get; private set; }
    public string Kind { get; private set; } = null!;
    public int Position { get; private set; }
    private LabKitAssemblyComponent() { }
    public LabKitAssemblyComponent(Guid revisionId, Guid productId, int quantity, string kind, int position)
    {
        if (revisionId == Guid.Empty || productId == Guid.Empty || quantity < 1 || position < 0
            || kind is not ("Tube" or "ShippingContainer" or "Other"))
            throw new ArgumentException("Choose a valid component, kind, and positive whole-number quantity.");
        WorkflowRevisionId = revisionId;
        SupplierProductId = productId;
        Quantity = quantity;
        Kind = kind;
        Position = position;
    }
    public void ValidateActualUse(decimal quantity, string unit)
    {
        if (quantity <= 0 || quantity > Quantity)
            throw new InvalidOperationException("Record a positive amount within the approved component quantity.");
        if (Kind is "Tube" or "ShippingContainer"
            && (quantity != decimal.Truncate(quantity)
                || !string.Equals(unit, "each", StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Count whole tubes and outer shippers in each.");
    }
}

public sealed class LabKitAssemblyRun : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid StockKitId { get; private set; }
    public Guid WorkflowRevisionId { get; private set; }
    public string StepsJson { get; private set; } = null!;
    public LabKitAssemblyRunStatus Status { get; private set; } = LabKitAssemblyRunStatus.InProgress;
    public int RecordedStepCount { get; private set; }
    public Guid StartedByUserId { get; private set; }
    public DateTime StartedAtUtc { get; private set; }
    public Guid? FinishedByUserId { get; private set; }
    public DateTime? FinishedAtUtc { get; private set; }
    public string? AbandonmentReason { get; private set; }
    private LabKitAssemblyRun() { }
    public LabKitAssemblyRun(Guid stockKitId, LabKitAssemblyWorkflowRevision revision, Guid actorId, DateTime utcNow)
    {
        if (stockKitId == Guid.Empty || actorId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc
            || revision.Status != LabKitAssemblyRevisionStatus.Approved)
            throw new ArgumentException("Start assembly from an approved workflow revision and a physical kit.");
        StockKitId = stockKitId;
        WorkflowRevisionId = revision.Id;
        StepsJson = revision.StepsJson;
        StartedByUserId = actorId;
        StartedAtUtc = utcNow;
    }
    public IReadOnlyList<LabKitAssemblyStep> Steps() => JsonSerializer.Deserialize<List<LabKitAssemblyStep>>(StepsJson) ?? [];
    public void EnsureSingleTubeSourceLot(Guid proposedLotId, IReadOnlyCollection<Guid?> priorTubeLotIds)
    {
        if (Status != LabKitAssemblyRunStatus.InProgress || proposedLotId == Guid.Empty
            || priorTubeLotIds.Any(item => item != proposedLotId))
            throw new InvalidOperationException("Use one source tube lot per physical kit.");
    }
    public void RecordStep(int sequence)
    {
        if (Status != LabKitAssemblyRunStatus.InProgress || sequence != RecordedStepCount || sequence >= Steps().Count)
            throw new InvalidOperationException("Record kit assembly steps in approved order.");
        RecordedStepCount++;
    }
    public void Complete(Guid actorId, DateTime utcNow)
    {
        if (Status != LabKitAssemblyRunStatus.InProgress || RecordedStepCount != Steps().Count)
            throw new InvalidOperationException("Record every approved assembly step before completion.");
        Status = LabKitAssemblyRunStatus.Completed;
        FinishedByUserId = actorId;
        FinishedAtUtc = utcNow;
    }
    public void Abandon(string reason, Guid actorId, DateTime utcNow)
    {
        if (Status != LabKitAssemblyRunStatus.InProgress || actorId == Guid.Empty)
            throw new InvalidOperationException("Only an active kit assembly can be stopped.");
        AbandonmentReason = Required(reason, nameof(reason), 2000);
        Status = LabKitAssemblyRunStatus.Abandoned;
        FinishedByUserId = actorId;
        FinishedAtUtc = utcNow;
    }
}

public sealed class LabKitAssemblyStepRecord
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RunId { get; private set; }
    public int Sequence { get; private set; }
    public Guid LabStepVersionId { get; private set; }
    public string Notes { get; private set; } = null!;
    public Guid PerformedByUserId { get; private set; }
    public DateTime PerformedAtUtc { get; private set; }
    private LabKitAssemblyStepRecord() { }
    public LabKitAssemblyStepRecord(Guid runId, int sequence, Guid stepVersionId, string notes, Guid actorId, DateTime utcNow)
    {
        if (runId == Guid.Empty || stepVersionId == Guid.Empty || actorId == Guid.Empty || sequence < 0)
            throw new ArgumentException("Record an approved step, run, and operator.");
        RunId = runId;
        Sequence = sequence;
        LabStepVersionId = stepVersionId;
        Notes = LabAuditedEntity.Required(notes, nameof(notes), 4000);
        PerformedByUserId = actorId;
        PerformedAtUtc = utcNow;
    }
}

public sealed class LabKitAssemblyUse
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RunId { get; private set; }
    public Guid SupplierProductId { get; private set; }
    public Guid? SourceMaterialLotId { get; private set; }
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private LabKitAssemblyUse() { }
    public LabKitAssemblyUse(Guid runId, Guid productId, Guid? sourceLotId, decimal quantity, string unit, Guid actorId, DateTime utcNow)
    {
        if (runId == Guid.Empty || productId == Guid.Empty || actorId == Guid.Empty || quantity <= 0)
            throw new ArgumentException("Record a product, positive quantity, run, and operator.");
        RunId = runId;
        SupplierProductId = productId;
        SourceMaterialLotId = sourceLotId;
        Quantity = quantity;
        QuantityUnit = LabAuditedEntity.Required(unit, nameof(unit), 50);
        RecordedByUserId = actorId;
        RecordedAtUtc = utcNow;
    }
}
