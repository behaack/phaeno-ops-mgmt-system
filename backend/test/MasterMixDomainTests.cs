using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

namespace PhaenoPortal.Test;

public sealed class MasterMixDomainTests
{
    private static readonly Guid BufferId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTime Now = new(2026, 9, 24, 17, 0, 0, DateTimeKind.Utc);
    private static readonly IReadOnlySet<LabRole> OperatorRoles = new HashSet<LabRole> { LabRole.Operator };
    private static LabProtocolStepDefinition Combine(string key = "combine", string amount = "10") => new()
    {
        Key = key, Name = "Combine", Instructions = "Combine released reagent lots", ProcessType = "masterMix",
        LabStepVersionId = Guid.Parse("22222222-2222-2222-2222-222222222222"), Required = true,
        Repeatable = true, OperatorConfirmation = true, InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [],
        Captures = [new() { Key = "buffer", Label = "Buffer", Type = "material", Scope = "batch", Required = true,
            IncludeTracking = true, QuantityBasis = "total", Unit = "µL", PlannedQuantityText = amount,
            Material = new("Buffer", MaterialDefinitionId: BufferId) }]
    };
    private static LabProtocolStepDefinition Inspect() => Combine("inspect") with
    {
        Name = "Inspect", Instructions = "Check the prepared mix", Captures = [],
        LabStepVersionId = Guid.Parse("33333333-3333-3333-3333-333333333333")
    };
    private static LabProtocolStepInput Entry(string key, string action = "record", string? qc = null) => new(key, action, "recorded",
        key == "combine" ? new Dictionary<string, JsonElement> { ["buffer"] = JsonSerializer.SerializeToElement("LOT-1: 10 µL") } : new Dictionary<string, JsonElement>(),
        true, true, qc, "Recorded preparation evidence");
    private static LabMasterMixWorkflow Workflow(params LabProtocolStepDefinition[] steps)
    {
        var workflow = new LabMasterMixWorkflow("Library master mix", "µL", steps, Guid.NewGuid());
        workflow.Approve(Guid.NewGuid(), Now);
        return workflow;
    }

    [Fact]
    public void WorkflowRequiresIndependentApprovalAndPinsPreparationRevision()
    {
        var author = Guid.NewGuid();
        var workflow = new LabMasterMixWorkflow("Library master mix", "µL", [Combine(), Inspect()], author);
        Assert.Throws<InvalidOperationException>(() => workflow.Approve(author, Now));
        workflow.Approve(Guid.NewGuid(), Now);
        var preparation = new LabMasterMixPreparation(workflow, Guid.NewGuid(), Now, Guid.NewGuid());
        var originalSteps = preparation.StepsJson;
        var originalRecipe = preparation.IngredientsJson;
        workflow.Revise("Library master mix", "µL", [Combine() with { Instructions = "Revised instructions" }], author);
        var prior = new LabMasterMixPreparation(workflow, 1, Guid.NewGuid(), Now, Guid.NewGuid());
        Assert.Equal(1, preparation.WorkflowRevision);
        Assert.Equal(originalSteps, prior.StepsJson);
        Assert.Equal(originalRecipe, prior.IngredientsJson);
        Assert.Equal("Approved", workflow.Revisions().Single(revision => revision.Revision == 1).Status);
        workflow.Retire();
        Assert.Throws<InvalidOperationException>(() => new LabMasterMixPreparation(workflow, 1, Guid.NewGuid(), Now, Guid.NewGuid()));
    }

    [Fact]
    public void RecipeAggregatesEveryPinnedOccurrenceWithoutDecimalRounding()
    {
        var workflow = Workflow(Combine(amount: "0.100000000001"), Combine("combine-again", "0.200000000002"));
        var ingredient = Assert.Single(workflow.Ingredients());
        Assert.Equal(0.300000000003m, ingredient.Quantity);
        Assert.Equal("0.300000000003", ingredient.QuantityText);
        Assert.Equal(BufferId, ingredient.MaterialDefinitionId);
        Assert.Null(ingredient.ProductId);
        Assert.Equal(2, workflow.Steps().Count);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("0.0000000000001")]
    [InlineData("1.0000000000000")]
    [InlineData("10000000000000000")]
    [InlineData("1e2")]
    public void PlannedQuantityMustBePositiveAndExactlyRepresentable(string amount) =>
        Assert.Throws<ArgumentException>(() => Workflow(Combine(amount: amount)));

    [Fact]
    public void WorkflowRejectsUnpinnedStepsAndOptionalOrUntrackedReagents()
    {
        var step = Combine();
        Assert.Throws<ArgumentException>(() => Workflow(step with { LabStepVersionId = null }));
        Assert.Throws<ArgumentException>(() => Workflow(step with { Captures = [step.Captures[0] with { IncludeTracking = false }] }));
        Assert.Throws<ArgumentException>(() => Workflow(step with { Captures = [step.Captures[0] with { Required = false }] }));
        Assert.Throws<ArgumentException>(() => Workflow(step with { ProcessType = null }));
    }

    [Fact]
    public void MissingRequiredEvidenceOrHeldQcCannotAdvancePreparation()
    {
        var step = Combine() with { QcGate = new() { Scope = "batch", Criteria = "Visually homogeneous", Outcomes = ["pass", "fail", "hold"] } };
        var preparation = new LabMasterMixPreparation(Workflow(step, Inspect()), Guid.NewGuid(), Now, Guid.NewGuid());
        Assert.Throws<ArgumentException>(() => preparation.RecordStep(0, Entry("combine", qc: "pass") with { Captures = new Dictionary<string, JsonElement>() }, Guid.NewGuid(), OperatorRoles, Now));
        preparation.RecordStep(0, Entry("combine", qc: "hold"), Guid.NewGuid(), OperatorRoles, Now);
        Assert.Equal(0, preparation.RecordedStepCount);
        Assert.Throws<InvalidOperationException>(() => preparation.RecordStep(1, Entry("inspect"), Guid.NewGuid(), OperatorRoles, Now));
        preparation.RecordStep(0, Entry("combine", "repeat", "pass"), Guid.NewGuid(), OperatorRoles, Now.AddMinutes(1));
        Assert.Equal(1, preparation.RecordedStepCount);
        Assert.Equal(2, LabProtocolEvidence.Read(preparation.EvidenceJson).Records.Count);
    }

    [Fact]
    public void SupervisorCorrectionRetainsEvidenceAndRequiresReviewOfLaterSteps()
    {
        var preparation = new LabMasterMixPreparation(Workflow(Combine(), Inspect()), Guid.NewGuid(), Now, Guid.NewGuid());
        preparation.RecordStep(0, Entry("combine"), Guid.NewGuid(), OperatorRoles, Now);
        preparation.RecordStep(1, Entry("inspect"), Guid.NewGuid(), OperatorRoles, Now.AddMinutes(1));
        var original = LabProtocolEvidence.Read(preparation.EvidenceJson).Records[0];
        Assert.Throws<InvalidOperationException>(() => preparation.RecordStep(0, Entry("combine", "correct"), Guid.NewGuid(), OperatorRoles, Now.AddMinutes(2)));
        Assert.Equal(2, preparation.RecordedStepCount);
        preparation.RecordStep(0, Entry("combine", "correct"), Guid.NewGuid(), new HashSet<LabRole> { LabRole.Supervisor }, Now.AddMinutes(2));
        Assert.Equal(1, preparation.RecordedStepCount);
        var records = LabProtocolEvidence.Read(preparation.EvidenceJson).Records;
        Assert.Equal(3, records.Count);
        Assert.Equal(original.Id, records[2].CorrectsRecordId);
        Assert.Equal(original.Id, records[0].Id);
        Assert.Equal(original.Captures["buffer"].GetString(), records[0].Captures["buffer"].GetString());
    }

    [Fact]
    public void SharedUseCannotExceedMadeQuantityAndDiscardStopsFurtherUse()
    {
        var preparation = new LabMasterMixPreparation(Workflow(Combine(), Inspect()), Guid.NewGuid(), Now, Guid.NewGuid());
        var actor = preparation.StartedByUserId;
        Assert.Throws<InvalidOperationException>(() => preparation.RecordStep(1, Entry("inspect"), actor, OperatorRoles, Now));
        preparation.RecordStep(0, Entry("combine"), actor, OperatorRoles, Now);
        preparation.RecordStep(1, Entry("inspect"), actor, OperatorRoles, Now);
        Assert.Throws<InvalidOperationException>(() => preparation.Complete(100, true, actor, Now));
        preparation.RecordIngredientUse(Now);
        Assert.Throws<InvalidOperationException>(() => preparation.Complete(100, false, actor, Now));
        preparation.ApproveRecipeDeviation("Measured recipe adjustment", Guid.NewGuid(), Now);
        preparation.Complete(100, false, actor, Now);
        preparation.Use(35, Now);
        preparation.Use(55, Now);
        Assert.Equal(90, preparation.UsedQuantity);
        Assert.Equal(10, preparation.RemainingQuantity);
        Assert.Throws<InvalidOperationException>(() => preparation.Use(11, Now));
        Assert.Throws<InvalidOperationException>(() => preparation.Use(1, preparation.UseByUtc));
        preparation.Discard("Session complete", 12, actor, Now);
        Assert.Equal(LabMasterMixStatus.Discarded, preparation.Status);
        Assert.Equal(12, preparation.MeasuredDiscardQuantity);
        Assert.Equal(10, preparation.RemainingQuantity);
        Assert.Throws<InvalidOperationException>(() => preparation.Use(1, Now));
    }
}
