namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public sealed class ReagentManufacturingDomainTests
{
    private static readonly Guid MaterialId = Guid.Parse("f64e9c01-3e92-4904-b11a-c0509d0a471c");
    private static readonly LabReagentStep[] Steps = [new("combine", "Combine", "Mix source lots"), new("inspect", "Inspect", "Record visual inspection")];

    [Fact]
    public void ApprovalNeedsIndependentReviewerOrRecordedAdministratorOverride()
    {
        var author = Guid.NewGuid();
        var workflow = new LabReagentWorkflow("Buffer preparation", MaterialId, Steps, author);
        Assert.Throws<InvalidOperationException>(() => workflow.Approve(author, DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => workflow.Approve(author, DateTime.UtcNow, true, " "));
        workflow.Approve(author, DateTime.UtcNow, true, "Only qualified administrator on shift");
        Assert.Equal(LabReagentWorkflowStatus.Approved, workflow.Status);
        Assert.Equal("Only qualified administrator on shift", workflow.ApprovalOverrideReason);
    }

    [Fact]
    public void StartedRunRetainsExactProcedureWhenWorkflowIsRevised()
    {
        var author = Guid.NewGuid();
        var workflow = new LabReagentWorkflow("Buffer preparation", MaterialId, Steps, author);
        workflow.Approve(Guid.NewGuid(), DateTime.UtcNow);
        var run = new LabReagentManufacturingRun(workflow, Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow);
        workflow.Revise("Buffer preparation v2", MaterialId, [new("heat", "Heat", "Warm mixture")], author);
        var revisions = workflow.Revisions();
        Assert.Equal(2, revisions.Count);
        Assert.Equal("Draft", revisions[0].Status);
        Assert.Equal("Approved", revisions[1].Status);
        Assert.Equal("Buffer preparation", revisions[1].Name);
        Assert.Equal(Steps, revisions[1].Steps);
        Assert.NotNull(revisions[1].ApprovedAtUtc);
        Assert.Equal(1, run.WorkflowRevision);
        Assert.Equal("Buffer preparation", run.WorkflowName);
        Assert.Equal(Steps, run.Steps());
        Assert.Equal(LabReagentWorkflowStatus.Draft, workflow.Status);
        Assert.Throws<InvalidOperationException>(() => workflow.Revise(
            "Wrong reagent", Guid.NewGuid(), Steps, author));
    }

    [Fact]
    public void ReagentAndPurchasedProductKeepTheirConfiguredUnits()
    {
        var reagent = new LabMaterialDefinition("test-reagent-unit", "TEST reagent", LabMaterialLotKind.PreparedReagent);
        reagent.SetPreparedReagentUnit("mL");
        reagent.SetPreparedReagentUnit("ml");
        Assert.Equal("mL", reagent.DefaultQuantityUnit);
        Assert.Throws<InvalidOperationException>(() => reagent.SetPreparedReagentUnit("uL"));

        var product = new LabSupplierProduct(Guid.NewGuid(), "TEST-PRODUCT", "TEST purchased supply", Guid.NewGuid());
        product.SetDefaultQuantityUnit("each");
        Assert.Equal("each", product.DefaultQuantityUnit);
    }

    [Fact]
    public void CompletionRequiresOrderedStepsAndSourceUse()
    {
        var workflow = new LabReagentWorkflow("Buffer preparation", MaterialId, Steps, Guid.NewGuid());
        workflow.Approve(Guid.NewGuid(), DateTime.UtcNow);
        var run = new LabReagentManufacturingRun(workflow, Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => run.RecordStep(1));
        run.RecordStep(0);
        Assert.Throws<InvalidOperationException>(() => run.Complete(Guid.NewGuid(), DateTime.UtcNow));
        run.RecordStep(1);
        Assert.Throws<InvalidOperationException>(() => run.Complete(Guid.NewGuid(), DateTime.UtcNow));
        run.RecordMaterialUse();
        run.Complete(Guid.NewGuid(), DateTime.UtcNow);
        Assert.Equal(LabReagentRunStatus.Completed, run.Status);
        Assert.Throws<InvalidOperationException>(() => run.RecordMaterialUse());
    }

    [Fact]
    public void AbandonmentRetainsRecordedUseCountAndRejectsFurtherActivity()
    {
        var workflow = new LabReagentWorkflow("Buffer preparation", MaterialId, Steps, Guid.NewGuid());
        workflow.Approve(Guid.NewGuid(), DateTime.UtcNow);
        var run = new LabReagentManufacturingRun(workflow, Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow);
        run.RecordMaterialUse();
        run.Abandon("Spill during preparation", Guid.NewGuid(), DateTime.UtcNow);
        Assert.Equal(1, run.MaterialUseCount);
        Assert.Equal("Spill during preparation", run.AbandonmentReason);
        Assert.Throws<InvalidOperationException>(() => run.RecordStep(0));
        Assert.Throws<InvalidOperationException>(() => run.Complete(Guid.NewGuid(), DateTime.UtcNow));
    }
}
