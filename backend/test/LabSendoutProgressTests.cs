namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabSendoutProgressTests
{
    private static LabWorkOrder ProcessingJob()
    {
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
            Guid.NewGuid(), Guid.NewGuid(), "sendout-test", 1, "test", null);
        work.RecordMilestone(LabWorkOrderStatus.Received);
        work.RecordMilestone(LabWorkOrderStatus.Processing);
        return work;
    }

    [Fact]
    public void BatchProgressAdvancesJobAndVersionsEveryStage()
    {
        var work = ProcessingJob();
        foreach (var stage in new[] { LabNgsSendoutStatus.Shipped, LabNgsSendoutStatus.ReceivedByProvider,
            LabNgsSendoutStatus.Sequencing, LabNgsSendoutStatus.ResultsReceived })
        {
            var version = work.ProjectionVersion;
            work.RecordSendoutProgress(stage);
            Assert.Equal(version + 1, work.ProjectionVersion);
            Assert.Equal(stage == LabNgsSendoutStatus.ResultsReceived ? LabWorkOrderStatus.DataProcessing
                : LabWorkOrderStatus.AwaitingExternalSequencing, work.Status);
        }
    }

    [Theory]
    [InlineData(LabWorkOrderStatus.DataProcessing)]
    [InlineData(LabWorkOrderStatus.ScientificReview)]
    [InlineData(LabWorkOrderStatus.ReadyForRelease)]
    [InlineData(LabWorkOrderStatus.OnHold)]
    public void AnotherBatchCannotRegressTheJobOrClearItsHold(LabWorkOrderStatus stage)
    {
        var work = ProcessingJob();
        if (stage == LabWorkOrderStatus.OnHold) work.RecordMilestone(stage);
        else
        {
            work.RecordMilestone(LabWorkOrderStatus.DataProcessing);
            if (stage is LabWorkOrderStatus.ScientificReview or LabWorkOrderStatus.ReadyForRelease)
                work.RecordMilestone(LabWorkOrderStatus.ScientificReview);
            if (stage == LabWorkOrderStatus.ReadyForRelease) work.RecordMilestone(stage);
        }
        foreach (var sendoutStage in new[] { LabNgsSendoutStatus.Shipped, LabNgsSendoutStatus.ReceivedByProvider,
            LabNgsSendoutStatus.Sequencing, LabNgsSendoutStatus.ResultsReceived })
        {
            var version = work.ProjectionVersion;
            work.RecordSendoutProgress(sendoutStage);
            Assert.Equal(stage, work.Status);
            Assert.Equal(version + 1, work.ProjectionVersion);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void SendoutProgressDoesNotBypassEarlyMilestoneGuards(bool received)
    {
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder,
            Guid.NewGuid(), Guid.NewGuid(), "sendout-test", 1, "test", null);
        if (received) work.RecordMilestone(LabWorkOrderStatus.Received);
        var version = work.ProjectionVersion;
        Assert.Throws<InvalidOperationException>(() => work.RecordSendoutProgress(LabNgsSendoutStatus.Shipped));
        Assert.Equal(version, work.ProjectionVersion);
    }
}
