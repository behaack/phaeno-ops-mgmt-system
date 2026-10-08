namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabWorkflowPromotionTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void AuthorOrReviewerCanPromoteAfterIndependentApproval(bool promoteAsAuthor)
    {
        var author = Guid.NewGuid();
        var reviewer = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var version = new LabServiceWorkflowVersion(Guid.NewGuid(), 1, author, now);
        Assert.Throws<InvalidOperationException>(() => version.Approve(author, now));
        version.Approve(reviewer, now);
        var actor = promoteAsAuthor ? author : reviewer;

        version.PromoteToProduction(actor, now.AddMinutes(1));

        Assert.Equal(LabServiceWorkflowStatus.Production, version.Status);
        Assert.Equal(actor, version.ProductionByUserId);
        Assert.Equal(now.AddMinutes(1), version.ProductionAtUtc);
        Assert.Equal(reviewer, version.ApprovedByUserId);
        Assert.Equal(now, version.ApprovedAtUtc);
    }

    [Fact]
    public void AuditOnlySelfApprovalCannotAuthorizePromotionByAnyActor()
    {
        var author = Guid.NewGuid();
        var version = new LabServiceWorkflowVersion(Guid.NewGuid(), 1, author, DateTime.UtcNow);
        version.Approve(author, DateTime.UtcNow, enforceActorSeparation: false);

        Assert.Throws<InvalidOperationException>(() => version.PromoteToProduction(Guid.NewGuid(), DateTime.UtcNow));
        Assert.Equal(LabServiceWorkflowStatus.Approved, version.Status);
        Assert.Null(version.ProductionByUserId);
        Assert.Null(version.ProductionAtUtc);
    }

    [Fact]
    public void DraftOrWithdrawnApprovalCannotEnterProduction()
    {
        var version = new LabServiceWorkflowVersion(Guid.NewGuid(), 1, Guid.NewGuid(), DateTime.UtcNow);
        var reviewer = Guid.NewGuid();
        Assert.Throws<InvalidOperationException>(() => version.PromoteToProduction(reviewer, DateTime.UtcNow));
        version.Approve(reviewer, DateTime.UtcNow);
        version.WithdrawApproval();
        Assert.Throws<InvalidOperationException>(() => version.PromoteToProduction(reviewer, DateTime.UtcNow));
    }
}
