namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class ReconciliationApprovalEligibilityTests
{
    [Fact]
    public void AssessmentAndApprovalRetainDraftEditorsAndIncludedSourceContributors()
    {
        var now = DateTime.UtcNow;
        var creator = Guid.NewGuid(); var editor = Guid.NewGuid(); var submitter = Guid.NewGuid(); var contributor = Guid.NewGuid(); var reviewer = Guid.NewGuid();
        var batch = new ReconciliationBatch("REVIEW-RULE", DateOnly.FromDateTime(now), 100, 100, creator);
        var snapshot = new ReconciliationDraftSnapshot(batch.PeriodEnd, 100, 100, [], [], []);
        batch.ReviseDraft(snapshot, snapshot, editor, "Corrected synthetic draft", now);
        batch.Submit(submitter, now);
        foreach (var actor in new[] { creator, editor, submitter, contributor })
        {
            Assert.True(batch.HasApprovalConflict(actor, [contributor]));
            Assert.Throws<InvalidOperationException>(() => batch.Approve(actor, [contributor], "{}", now));
        }
        Assert.False(batch.HasApprovalConflict(reviewer, [contributor]));
        batch.Approve(reviewer, [contributor], "{}", now);
        Assert.Equal(ReconciliationBatchStatus.Approved, batch.Status);
    }
}
