namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabApprovalOverrideTests
{
    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void InvalidReasonCannotPartiallyApprove(string? reason)
    {
        var actor = Guid.NewGuid();
        var protocol = new LabProtocolVersion(Guid.NewGuid(), 1, LabProtocolTestData.Definition(), actor, DateTime.UtcNow);
        var workflow = new LabServiceWorkflowVersion(Guid.NewGuid(), 1, actor, DateTime.UtcNow);
        Assert.ThrowsAny<ArgumentException>(() => protocol.ApproveWithOverride(actor, DateTime.UtcNow, reason!));
        Assert.ThrowsAny<ArgumentException>(() => workflow.ApproveWithOverride(actor, DateTime.UtcNow, reason!));
        Assert.Equal(LabProtocolStatus.Draft, protocol.Status);
        Assert.Equal(LabServiceWorkflowStatus.Draft, workflow.Status);
        Assert.Null(protocol.ApprovedByUserId);
        Assert.Null(workflow.ApprovalOverrideReason);
    }

    [Fact]
    public void RecordedOverridePermitsProductionAndRemainsInRetiredHistory()
    {
        var actor = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var protocol = new LabProtocolVersion(Guid.NewGuid(), 1, LabProtocolTestData.Definition(), actor, now);
        var workflow = new LabServiceWorkflowVersion(Guid.NewGuid(), 1, actor, now);
        Assert.Throws<InvalidOperationException>(() => protocol.Approve(actor, now));
        Assert.Throws<InvalidOperationException>(() => workflow.Approve(actor, now));
        Assert.Throws<ArgumentException>(() => protocol.ApproveWithOverride(actor, now, new string('x', 2001)));
        Assert.Throws<ArgumentException>(() => workflow.ApproveWithOverride(actor, now, new string('x', 2001)));
        protocol.ApproveWithOverride(actor, now, "  TEST ONLY controlled override  ");
        workflow.ApproveWithOverride(actor, now, "  TEST ONLY controlled override  ");
        protocol.Activate(actor);
        workflow.PromoteToProduction(actor, now);
        protocol.Retire();
        workflow.Retire();
        Assert.Equal("TEST ONLY controlled override", protocol.ApprovalOverrideReason);
        Assert.Equal(protocol.ApprovalOverrideReason, workflow.ApprovalOverrideReason);
        Assert.Equal(actor, protocol.ApprovedByUserId);
        Assert.Equal(actor, workflow.ApprovedByUserId);
        Assert.Equal(now, protocol.ApprovedAtUtc);
        Assert.Equal(now, workflow.ApprovedAtUtc);
        Assert.Throws<InvalidOperationException>(() => protocol.ApproveWithOverride(actor, now, "Rewrite"));
        Assert.Throws<InvalidOperationException>(() => workflow.ApproveWithOverride(actor, now, "Rewrite"));
    }

    [Fact]
    public void WithdrawalRemovesCurrentOverrideAndRequiresFreshApproval()
    {
        var actor = Guid.NewGuid();
        var workflow = new LabServiceWorkflowVersion(Guid.NewGuid(), 1, actor, DateTime.UtcNow);
        workflow.ApproveWithOverride(actor, DateTime.UtcNow, "TEST ONLY");
        workflow.WithdrawApproval();
        Assert.Null(workflow.ApprovalOverrideReason);
        Assert.Null(workflow.ApprovedByUserId);
        Assert.Throws<InvalidOperationException>(() => workflow.PromoteToProduction(actor, DateTime.UtcNow));
        Assert.Throws<InvalidOperationException>(() => workflow.Approve(actor, DateTime.UtcNow));
        workflow.Approve(Guid.NewGuid(), DateTime.UtcNow);
        workflow.PromoteToProduction(actor, DateTime.UtcNow);
        Assert.Null(workflow.ApprovalOverrideReason);
    }
}
