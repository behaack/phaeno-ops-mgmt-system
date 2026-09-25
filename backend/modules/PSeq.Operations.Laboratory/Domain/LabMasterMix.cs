namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;
using System.Text.RegularExpressions;

public enum LabMasterMixWorkflowStatus { Draft, Approved, Retired }
public sealed record LabMasterMixRecipeIngredient(Guid MaterialDefinitionId, string Name, decimal Quantity, string QuantityUnit,
    string? QuantityText = null);
public sealed record LabMasterMixWorkflowRevision(int Revision, string Name, string QuantityUnit,
    IReadOnlyList<LabReagentStep> Steps, IReadOnlyList<LabMasterMixRecipeIngredient> Ingredients,
    string Status, Guid AuthoredByUserId,
    Guid? ApprovedByUserId, DateTime? ApprovedAtUtc, string? ApprovalOverrideReason);

public sealed class LabMasterMixWorkflow : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public string QuantityUnit { get; private set; } = null!;
    public string StepsJson { get; private set; } = null!;
    public string IngredientsJson { get; private set; } = null!;
    public string RevisionHistoryJson { get; private set; } = "[]";
    public int Revision { get; private set; } = 1;
    public LabMasterMixWorkflowStatus Status { get; private set; } = LabMasterMixWorkflowStatus.Draft;
    public Guid AuthoredByUserId { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }
    public string? ApprovalOverrideReason { get; private set; }

    private LabMasterMixWorkflow() { }
    public LabMasterMixWorkflow(string name, string quantityUnit, IReadOnlyList<LabReagentStep> steps,
        IReadOnlyList<LabMasterMixRecipeIngredient> ingredients, Guid authorId)
    {
        if (authorId == Guid.Empty) throw new ArgumentException("An author is required.");
        SetDetails(name, quantityUnit, steps, ingredients);
        AuthoredByUserId = authorId;
    }

    public IReadOnlyList<LabReagentStep> Steps() => JsonSerializer.Deserialize<List<LabReagentStep>>(StepsJson) ?? [];
    public IReadOnlyList<LabMasterMixRecipeIngredient> Ingredients() =>
        JsonSerializer.Deserialize<List<LabMasterMixRecipeIngredient>>(IngredientsJson) ?? [];
    public IReadOnlyList<LabMasterMixWorkflowRevision> Revisions()
    {
        var history = JsonSerializer.Deserialize<List<LabMasterMixWorkflowRevision>>(RevisionHistoryJson) ?? [];
        history.Add(CurrentSnapshot());
        return history.OrderByDescending(item => item.Revision).ToArray();
    }
    private LabMasterMixWorkflowRevision CurrentSnapshot() => new(Revision, Name, QuantityUnit,
        Steps(), Ingredients(), Status.ToString(), AuthoredByUserId, ApprovedByUserId, ApprovedAtUtc, ApprovalOverrideReason);

    public void Revise(string name, string quantityUnit, IReadOnlyList<LabReagentStep> steps,
        IReadOnlyList<LabMasterMixRecipeIngredient> ingredients, Guid authorId)
    {
        if (Status == LabMasterMixWorkflowStatus.Retired) throw new InvalidOperationException("A retired workflow cannot be revised.");
        if (authorId == Guid.Empty) throw new ArgumentException("An author is required.");
        var history = JsonSerializer.Deserialize<List<LabMasterMixWorkflowRevision>>(RevisionHistoryJson) ?? [];
        history.Add(CurrentSnapshot());
        SetDetails(name, quantityUnit, steps, ingredients);
        RevisionHistoryJson = JsonSerializer.Serialize(history);
        Revision++;
        Status = LabMasterMixWorkflowStatus.Draft;
        AuthoredByUserId = authorId;
        ApprovedByUserId = null;
        ApprovedAtUtc = null;
        ApprovalOverrideReason = null;
    }

    public void Approve(Guid actorId, DateTime utcNow, bool administratorOverride = false, string? overrideReason = null)
    {
        if (Status != LabMasterMixWorkflowStatus.Draft) throw new InvalidOperationException("Only a draft workflow can be approved.");
        if (actorId == Guid.Empty) throw new ArgumentException("An approver is required.");
        if (actorId == AuthoredByUserId && !administratorOverride)
            throw new InvalidOperationException("A different administrator must approve this procedure, or a platform administrator must record an override reason.");
        if (administratorOverride && actorId == AuthoredByUserId)
            ApprovalOverrideReason = Required(overrideReason!, nameof(overrideReason), 2000);
        Status = LabMasterMixWorkflowStatus.Approved;
        ApprovedByUserId = actorId;
        ApprovedAtUtc = utcNow;
    }

    public void Retire()
    {
        if (Status == LabMasterMixWorkflowStatus.Retired || !Revisions().Any(item => item.Status == nameof(LabMasterMixWorkflowStatus.Approved)))
            throw new InvalidOperationException("Only a workflow with an approved revision can be retired.");
        Status = LabMasterMixWorkflowStatus.Retired;
    }

    private void SetDetails(string name, string quantityUnit, IReadOnlyList<LabReagentStep> steps,
        IReadOnlyList<LabMasterMixRecipeIngredient> ingredients)
    {
        Name = Required(name, nameof(name), 160);
        QuantityUnit = Required(quantityUnit, nameof(quantityUnit), 50);
        if (steps is null || steps.Count is < 1 or > 100) throw new ArgumentException("A master-mix workflow needs 1 to 100 steps.");
        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var step in steps)
        {
            if (step is null || string.IsNullOrWhiteSpace(step.Key)
                || !Regex.IsMatch(step.Key, "^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant)
                || step.Key.Length > 100 || !keys.Add(step.Key))
                throw new ArgumentException("Every workflow step needs a unique readable key.");
            Required(step.Name, nameof(step.Name), 160);
            Required(step.Instructions, nameof(step.Instructions), 4000);
        }
        StepsJson = JsonSerializer.Serialize(steps);
        if (ingredients is null || ingredients.Count is < 1 or > 100)
            throw new ArgumentException("A master-mix recipe needs 1 to 100 ingredients.");
        var definitions = new HashSet<Guid>();
        foreach (var ingredient in ingredients)
        {
            if (ingredient.MaterialDefinitionId == Guid.Empty || !definitions.Add(ingredient.MaterialDefinitionId)
                || !ValidQuantity(ingredient.Quantity))
                throw new ArgumentException("Recipe ingredients need unique material definitions and positive amounts with at most 12 decimal places.");
            Required(ingredient.Name, nameof(ingredient.Name), 255);
            Required(ingredient.QuantityUnit, nameof(ingredient.QuantityUnit), 50);
        }
        IngredientsJson = JsonSerializer.Serialize(ingredients);
    }
    private static bool ValidQuantity(decimal quantity) => quantity > 0 && quantity < 10000000000000000m
        && decimal.Round(quantity, 12) == quantity;
}

public enum LabMasterMixStatus { Preparing, Ready, Discarded }

public sealed class LabMasterMixPreparation : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid WorkflowId { get; private set; }
    public int WorkflowRevision { get; private set; }
    public string WorkflowName { get; private set; } = null!;
    public string StepsJson { get; private set; } = null!;
    public string IngredientsJson { get; private set; } = null!;
    public string QuantityUnit { get; private set; } = null!;
    public LabMasterMixStatus Status { get; private set; } = LabMasterMixStatus.Preparing;
    public int RecordedStepCount { get; private set; }
    public int IngredientUseCount { get; private set; }
    public decimal? PreparedQuantity { get; private set; }
    public decimal UsedQuantity { get; private set; }
    public Guid StartedByUserId { get; private set; }
    public DateTime StartedAtUtc { get; private set; }
    public DateTime UseByUtc { get; private set; }
    public Guid? PreparedByUserId { get; private set; }
    public DateTime? PreparedAtUtc { get; private set; }
    public Guid? DiscardedByUserId { get; private set; }
    public DateTime? DiscardedAtUtc { get; private set; }
    public decimal? MeasuredDiscardQuantity { get; private set; }
    public string? DiscardReason { get; private set; }
    public string? RecipeDeviationReason { get; private set; }
    public Guid? RecipeDeviationApprovedByUserId { get; private set; }
    public DateTime? RecipeDeviationApprovedAtUtc { get; private set; }
    public int? RecipeDeviationApprovedIngredientCount { get; private set; }

    public static string LabTimeZoneId => "America/Los_Angeles";
    public static DateTime EndOfLabDayUtc(DateTime utcNow)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(LabTimeZoneId);
        var localDate = TimeZoneInfo.ConvertTimeFromUtc(utcNow, zone).Date;
        return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate.AddDays(1), DateTimeKind.Unspecified), zone);
    }
    public static string BarcodeFor(Guid id) => $"PH-MX-{id:N}".ToUpperInvariant();
    public string Barcode => BarcodeFor(Id);
    private static bool ValidQuantity(decimal quantity) => quantity > 0 && quantity < 10000000000000000m
        && decimal.Round(quantity, 12) == quantity;

    private LabMasterMixPreparation() { }
    public LabMasterMixPreparation(LabMasterMixWorkflow workflow, Guid actorId, DateTime utcNow, Guid requestId)
        : this(workflow, workflow.Revision, actorId, utcNow, requestId) { }

    public LabMasterMixPreparation(LabMasterMixWorkflow workflow, int workflowRevision,
        Guid actorId, DateTime utcNow, Guid requestId)
    {
        var revision = workflow.Revisions().SingleOrDefault(item => item.Revision == workflowRevision
            && item.Status == nameof(LabMasterMixWorkflowStatus.Approved));
        if (workflow.Status == LabMasterMixWorkflowStatus.Retired || revision is null)
            throw new InvalidOperationException("Start from an approved master-mix workflow revision.");
        if (actorId == Guid.Empty || requestId == Guid.Empty) throw new ArgumentException("An operator and request identifier are required.");
        Id = requestId;
        WorkflowId = workflow.Id;
        WorkflowRevision = revision.Revision;
        WorkflowName = revision.Name;
        StepsJson = JsonSerializer.Serialize(revision.Steps);
        IngredientsJson = JsonSerializer.Serialize(revision.Ingredients);
        QuantityUnit = revision.QuantityUnit;
        StartedByUserId = actorId;
        StartedAtUtc = utcNow;
        UseByUtc = EndOfLabDayUtc(utcNow);
    }
    public IReadOnlyList<LabReagentStep> Steps() => JsonSerializer.Deserialize<List<LabReagentStep>>(StepsJson) ?? [];
    public IReadOnlyList<LabMasterMixRecipeIngredient> Ingredients() =>
        JsonSerializer.Deserialize<List<LabMasterMixRecipeIngredient>>(IngredientsJson) ?? [];
    public decimal? RemainingQuantity => PreparedQuantity - UsedQuantity;
    public void RecordStep(int sequence, DateTime utcNow)
    {
        RequireOpenDay(utcNow);
        if (Status != LabMasterMixStatus.Preparing || sequence != RecordedStepCount || sequence >= Steps().Count)
            throw new InvalidOperationException("Record the next step of the active master-mix preparation.");
        RecordedStepCount++;
    }
    public void RecordIngredientUse(DateTime utcNow)
    {
        RequireOpenDay(utcNow);
        if (Status != LabMasterMixStatus.Preparing) throw new InvalidOperationException("This mix is no longer being prepared.");
        IngredientUseCount++;
        RecipeDeviationApprovedIngredientCount = null;
    }
    public void ApproveRecipeDeviation(string reason, Guid actorId, DateTime utcNow)
    {
        RequireOpenDay(utcNow);
        if (Status != LabMasterMixStatus.Preparing || IngredientUseCount == 0 || actorId == Guid.Empty)
            throw new InvalidOperationException("Only an active preparation with ingredients can receive deviation approval.");
        RecipeDeviationReason = Required(reason, nameof(reason), 2000);
        RecipeDeviationApprovedByUserId = actorId;
        RecipeDeviationApprovedAtUtc = utcNow;
        RecipeDeviationApprovedIngredientCount = IngredientUseCount;
    }
    public void Complete(decimal quantity, bool recipeMatches, Guid actorId, DateTime utcNow)
    {
        RequireOpenDay(utcNow);
        if (Status != LabMasterMixStatus.Preparing || RecordedStepCount != Steps().Count || IngredientUseCount == 0)
            throw new InvalidOperationException("Record every procedure step and at least one ingredient use before completing the mix.");
        if (!recipeMatches && (RecipeDeviationApprovedIngredientCount != IngredientUseCount || !RecipeDeviationApprovedByUserId.HasValue))
            throw new InvalidOperationException("A supervisor must approve the recorded recipe deviation before completing the mix.");
        if (!ValidQuantity(quantity) || actorId == Guid.Empty) throw new ArgumentException("Record a positive, representable amount made and its operator.");
        PreparedQuantity = quantity;
        PreparedByUserId = actorId;
        PreparedAtUtc = utcNow;
        Status = LabMasterMixStatus.Ready;
    }
    public void Use(decimal quantity, DateTime utcNow)
    {
        RequireOpenDay(utcNow);
        if (Status != LabMasterMixStatus.Ready) throw new InvalidOperationException("Only a ready master mix can be used.");
        if (!ValidQuantity(quantity) || !PreparedQuantity.HasValue || quantity > PreparedQuantity.Value - UsedQuantity)
            throw new InvalidOperationException("The amount exceeds this mix's remaining quantity.");
        UsedQuantity += quantity;
    }
    public void ReverseUndispensedUse(decimal quantity)
    {
        if (quantity <= 0 || quantity > UsedQuantity) throw new InvalidOperationException("The recorded mix use cannot be reversed.");
        UsedQuantity -= quantity;
    }
    private void RequireOpenDay(DateTime utcNow)
    {
        if (utcNow >= UseByUtc) throw new InvalidOperationException("This master mix passed the end of its local work day. Discard it and prepare a new mix.");
    }
    public void Discard(string reason, decimal? measuredQuantity, Guid actorId, DateTime utcNow)
    {
        if (Status == LabMasterMixStatus.Discarded) throw new InvalidOperationException("This mix was already discarded.");
        if (actorId == Guid.Empty) throw new ArgumentException("An operator is required.");
        if (measuredQuantity is < 0 || measuredQuantity >= 10000000000000000m
            || measuredQuantity.HasValue && decimal.Round(measuredQuantity.Value, 12) != measuredQuantity.Value)
            throw new ArgumentException("Measured discarded amount cannot be negative.");
        DiscardReason = Required(reason, nameof(reason), 2000);
        MeasuredDiscardQuantity = measuredQuantity;
        DiscardedByUserId = actorId;
        DiscardedAtUtc = utcNow;
        Status = LabMasterMixStatus.Discarded;
    }
}

public sealed class LabMasterMixStepRecord
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PreparationId { get; private set; }
    public int Sequence { get; private set; }
    public string Notes { get; private set; } = null!;
    public Guid PerformedByUserId { get; private set; }
    public DateTime PerformedAtUtc { get; private set; }
    private LabMasterMixStepRecord() { }
    public LabMasterMixStepRecord(Guid id, Guid preparationId, int sequence, string notes, Guid actorId, DateTime utcNow)
    {
        if (id == Guid.Empty || preparationId == Guid.Empty || sequence < 0 || actorId == Guid.Empty) throw new ArgumentException("A preparation, step, operator and request identifier are required.");
        Id = id;
        PreparationId = preparationId;
        Sequence = sequence;
        Notes = LabAuditedEntity.Required(notes, nameof(notes), 4000);
        PerformedByUserId = actorId;
        PerformedAtUtc = utcNow;
    }
}

public sealed class LabMasterMixIngredientUse
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PreparationId { get; private set; }
    public Guid SourceMaterialLotId { get; private set; }
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public bool MaterialExhausted { get; private set; }
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    public DateTime? VoidedAtUtc { get; private set; }
    public Guid? VoidedByUserId { get; private set; }
    private LabMasterMixIngredientUse() { }
    public LabMasterMixIngredientUse(Guid id, Guid preparationId, Guid sourceLotId, decimal quantity,
        string unit, bool exhausted, Guid actorId, DateTime utcNow)
    {
        if (id == Guid.Empty || preparationId == Guid.Empty || sourceLotId == Guid.Empty || quantity <= 0
            || quantity >= 10000000000000000m || decimal.Round(quantity, 12) != quantity || actorId == Guid.Empty)
            throw new ArgumentException("A preparation, source lot, positive amount, operator and request identifier are required.");
        Id = id;
        PreparationId = preparationId;
        SourceMaterialLotId = sourceLotId;
        Quantity = quantity;
        QuantityUnit = LabAuditedEntity.Required(unit, nameof(unit), 50);
        MaterialExhausted = exhausted;
        RecordedByUserId = actorId;
        RecordedAtUtc = utcNow;
    }
    public void VoidUndispensed(Guid actorId, DateTime utcNow)
    {
        if (VoidedAtUtc.HasValue || actorId == Guid.Empty) throw new InvalidOperationException("This ingredient use cannot be voided again.");
        VoidedAtUtc = utcNow;
        VoidedByUserId = actorId;
    }
}

public sealed class LabMasterMixTrayUse
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PreparationId { get; private set; }
    public Guid LabPreparationBatchId { get; private set; }
    public Guid LabPreparationRecordId { get; private set; }
    public string FieldKey { get; private set; } = null!;
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    public DateTime? VoidedAtUtc { get; private set; }
    public Guid? VoidedByUserId { get; private set; }
    private LabMasterMixTrayUse() { }
    public LabMasterMixTrayUse(Guid preparationId, Guid batchId, Guid recordId, string fieldKey,
        decimal quantity, string unit, Guid actorId, DateTime utcNow)
    {
        if (preparationId == Guid.Empty || batchId == Guid.Empty || recordId == Guid.Empty || quantity <= 0
            || quantity >= 10000000000000000m || decimal.Round(quantity, 12) != quantity || actorId == Guid.Empty)
            throw new ArgumentException("A mix, tray, record, positive amount and operator are required.");
        PreparationId = preparationId;
        LabPreparationBatchId = batchId;
        LabPreparationRecordId = recordId;
        FieldKey = LabAuditedEntity.Required(fieldKey, nameof(fieldKey), 100);
        Quantity = quantity;
        QuantityUnit = LabAuditedEntity.Required(unit, nameof(unit), 50);
        RecordedByUserId = actorId;
        RecordedAtUtc = utcNow;
    }
    public void VoidUndispensed(Guid actorId, DateTime utcNow)
    {
        if (VoidedAtUtc.HasValue || actorId == Guid.Empty) throw new InvalidOperationException("This tray use cannot be voided again.");
        VoidedAtUtc = utcNow;
        VoidedByUserId = actorId;
    }
}

public sealed class LabMasterMixCorrection
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PreparationId { get; private set; }
    public Guid TargetEntryId { get; private set; }
    public string TargetKind { get; private set; } = null!;
    public string Action { get; private set; } = null!;
    public string Reason { get; private set; } = null!;
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private LabMasterMixCorrection() { }
    public LabMasterMixCorrection(Guid id, Guid preparationId, Guid targetEntryId, string targetKind,
        string action, string reason, Guid actorId, DateTime utcNow)
    {
        if (id == Guid.Empty || preparationId == Guid.Empty || targetEntryId == Guid.Empty || actorId == Guid.Empty
            || targetKind is not ("Ingredient" or "TrayUse") || action is not ("VerifiedVoid" or "Discrepancy"))
            throw new ArgumentException("Choose an ingredient or tray use and a valid correction action.");
        Id = id;
        PreparationId = preparationId;
        TargetEntryId = targetEntryId;
        TargetKind = targetKind;
        Action = action;
        Reason = LabAuditedEntity.Required(reason, nameof(reason), 2000);
        RecordedByUserId = actorId;
        RecordedAtUtc = utcNow;
    }
}
