namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabWorkflowInvalidationTests
{
    [Fact]
    public void InvalidatedApprovedVersionRetainsApprovalAndCannotBeReused()
    {
        var author = Guid.NewGuid();
        var reviewer = Guid.NewGuid();
        var version = new LabServiceWorkflowVersion(Guid.NewGuid(), 1, author, DateTime.UtcNow);
        version.Approve(reviewer, DateTime.UtcNow);
        version.PromoteToProduction(reviewer, DateTime.UtcNow);
        var approvedAt = version.ApprovedAtUtc;
        version.Invalidate("Protocol retired", DateTime.UtcNow);
        Assert.Equal(LabServiceWorkflowStatus.Invalidated, version.Status);
        Assert.Equal(reviewer, version.ApprovedByUserId);
        Assert.Equal(approvedAt, version.ApprovedAtUtc);
        Assert.Equal(reviewer, version.ProductionByUserId);
        Assert.Throws<InvalidOperationException>(() => version.Approve(reviewer, DateTime.UtcNow));
        Assert.Throws<InvalidOperationException>(() => version.PromoteToProduction(reviewer, DateTime.UtcNow));
        Assert.Throws<InvalidOperationException>(() => version.WithdrawApproval());
        Assert.Throws<InvalidOperationException>(() => version.Invalidate("Edit history", DateTime.UtcNow, editable: true));
    }

    [Fact]
    public void InvalidRecoveryRequiresIndependentApprovalBeforePromotion()
    {
        var author = Guid.NewGuid();
        var reviewer = Guid.NewGuid();
        var candidate = new LabServiceWorkflowVersion(Guid.NewGuid(), 2, author, DateTime.UtcNow);
        candidate.Invalidate("Retired stage removed", DateTime.UtcNow, editable: true);
        Assert.Equal(LabServiceWorkflowStatus.Invalid, candidate.Status);
        Assert.Throws<InvalidOperationException>(() => candidate.PromoteToProduction(reviewer, DateTime.UtcNow));
        Assert.Throws<InvalidOperationException>(() => candidate.Approve(author, DateTime.UtcNow));
        candidate.Approve(reviewer, DateTime.UtcNow);
        Assert.Equal(LabServiceWorkflowStatus.Approved, candidate.Status);
        candidate.PromoteToProduction(reviewer, DateTime.UtcNow);
        Assert.Equal(LabServiceWorkflowStatus.Production, candidate.Status);
    }
}
