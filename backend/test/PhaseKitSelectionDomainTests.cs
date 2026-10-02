namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed class PhaseKitSelectionDomainTests
{
    [Fact]
    public void APhysicalKitCannotMoveToAnotherPhase()
    {
        var phase = Guid.NewGuid();
        var selection = new LabSampleTubeKitSelection(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), phase);
        selection.AssignPhase(phase);
        Assert.Throws<InvalidOperationException>(() => selection.AssignPhase(Guid.NewGuid()));
        Assert.Equal(phase, selection.LabJobPhaseId);
    }

    [Fact]
    public void CompletingPreparationDoesNotStartTatOrAnotherPhase()
    {
        var order = Guid.NewGuid();
        var first = new LabJobPhase(order, 1, "First", 5, 14, 1000);
        var second = new LabJobPhase(order, 2, "Later", 5, 14, 1000);
        first.CompletePreparation(DateTime.UtcNow);
        Assert.NotNull(first.PreparationCompletedAtUtc);
        Assert.Null(first.CompleteReceiptAtUtc);
        Assert.Null(first.StartedAtUtc);
        Assert.Null(second.PreparationCompletedAtUtc);
        Assert.Throws<InvalidOperationException>(() => first.CompletePreparation(DateTime.UtcNow));
    }
}
