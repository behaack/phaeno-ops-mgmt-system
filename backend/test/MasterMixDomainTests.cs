namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public sealed class MasterMixDomainTests
{
    private static readonly LabReagentStep[] Steps =
    [
        new("combine", "Combine", "Combine released source lots"),
        new("inspect", "Inspect", "Check the prepared mix")
    ];
    private static readonly LabMasterMixRecipeIngredient[] Ingredients =
        [new(Guid.Parse("11111111-1111-1111-1111-111111111111"), "Buffer", 10m, "µL")];
    private static readonly DateTime Now = new(2026, 9, 24, 17, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void WorkflowRequiresIndependentApprovalAndPinsPreparationRevision()
    {
        var author = Guid.NewGuid();
        var workflow = new LabMasterMixWorkflow("Library master mix", "µL", Steps, Ingredients, author);
        Assert.Throws<InvalidOperationException>(() => workflow.Approve(author, Now));
        workflow.Approve(Guid.NewGuid(), Now);
        var preparation = new LabMasterMixPreparation(workflow, Guid.NewGuid(), Now, Guid.NewGuid());

        workflow.Revise("Library master mix", "µL", [new("mix", "Mix", "Revised instructions")], Ingredients, author);
        var priorRevisionPreparation = new LabMasterMixPreparation(workflow, 1, Guid.NewGuid(), Now, Guid.NewGuid());

        Assert.Equal(1, preparation.WorkflowRevision);
        Assert.Equal(Steps, preparation.Steps());
        Assert.Equal(Steps, priorRevisionPreparation.Steps());
        Assert.Equal(Ingredients, priorRevisionPreparation.Ingredients());
        Assert.Equal("Approved", workflow.Revisions().Single(revision => revision.Revision == 1).Status);
        workflow.Retire();
        Assert.Throws<InvalidOperationException>(() => new LabMasterMixPreparation(workflow, 1, Guid.NewGuid(), Now, Guid.NewGuid()));
    }

    [Fact]
    public void SharedUseCannotExceedMadeQuantityAndDiscardStopsFurtherUse()
    {
        var workflow = new LabMasterMixWorkflow("Library master mix", "µL", Steps, Ingredients, Guid.NewGuid());
        workflow.Approve(Guid.NewGuid(), Now);
        var actor = Guid.NewGuid();
        var preparation = new LabMasterMixPreparation(workflow, actor, Now, Guid.NewGuid());
        Assert.Throws<InvalidOperationException>(() => preparation.RecordStep(1, Now));
        preparation.RecordStep(0, Now);
        preparation.RecordStep(1, Now);
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
