namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Domain;

public class LabIntakeProgressTests
{
    [Fact]
    public void ReceiptAndAccessionAdvanceWithoutInventingReceiptConditionAndReplayIsUnchanged()
    {
        var sample = Sample();
        var receivedAt = DateTime.UtcNow.AddHours(-1);
        Assert.True(sample.ApplyLaboratoryIntake(receivedAt, null));
        Assert.Equal(LabSampleStatus.Received, sample.Status);
        Assert.Null(sample.ReceiptCondition);
        Assert.Null(sample.AccessionId);
        Assert.True(sample.ApplyLaboratoryIntake(receivedAt, "ACC-001"));
        Assert.Equal(LabSampleStatus.Accessioned, sample.Status);
        Assert.Equal(receivedAt, sample.ReceivedAt);
        Assert.False(sample.ApplyLaboratoryIntake(DateTime.UtcNow, "ACC-001"));
        Assert.Equal(receivedAt, sample.ReceivedAt);
        Assert.Throws<InvalidOperationException>(() => sample.ApplyLaboratoryIntake(receivedAt, "ACC-OTHER"));
    }

    [Fact]
    public void IntakeUpdatesHeldSamplesWithoutReleasingHoldOrLosingItsReason()
    {
        var sample = Sample();
        sample.TransitionTo(LabSampleStatus.OnHold, "Review required", "Internal reason");
        sample.ApplyLaboratoryIntake(DateTime.UtcNow, "ACC-001");
        Assert.Equal(LabSampleStatus.OnHold, sample.Status);
        Assert.Equal(LabSampleStatus.Accessioned, sample.ResumeStatus);
        Assert.Equal("Review required", sample.TenantSafeReason);
        Assert.Equal("Internal reason", sample.InternalNote);
    }

    [Fact]
    public void IntakeCannotRegressProcessingOrReopenRejectedSamples()
    {
        var sample = Sample();
        sample.ApplyLaboratoryIntake(DateTime.UtcNow, "ACC-001");
        sample.TransitionTo(LabSampleStatus.LabAnalysis, null, null);
        Assert.False(sample.ApplyLaboratoryIntake(DateTime.UtcNow, null));
        Assert.Equal(LabSampleStatus.LabAnalysis, sample.Status);
        sample.TransitionTo(LabSampleStatus.Rejected, "Not suitable", null);
        Assert.False(sample.ApplyLaboratoryIntake(DateTime.UtcNow, "ACC-001"));
        Assert.Equal(LabSampleStatus.Rejected, sample.Status);
    }

    private static LabSample Sample() => new(Guid.NewGuid(), "sample-1", "RNA", "source", 2,
        "tubes", "Frozen", "Declared", null, null, null, "[]");
}
