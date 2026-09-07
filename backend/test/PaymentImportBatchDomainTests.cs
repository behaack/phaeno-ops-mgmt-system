namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class PaymentImportBatchDomainTests
{
    private static readonly DateTime Now = new(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void RepreviewUpdatesReviewedFactsAndPreservesFileAndOperatorIdentity()
    {
        var actor = Guid.NewGuid();
        var batch = new PaymentImportBatch("Bank", new string('a', 64), "[{\"customer\":\"first\"}]", 1, 12m, actor, Now);
        var id = batch.Id;
        batch.RevisePreview("[{\"customer\":\"corrected\"}]", 1, 13.125m, actor, Now.AddMinutes(1));
        Assert.Equal(id, batch.Id);
        Assert.Equal("Bank", batch.Source);
        Assert.Equal(new string('A', 64), batch.PayloadSha256);
        Assert.Equal(actor, batch.PreviewedByUserId);
        Assert.Equal(Now.AddMinutes(1), batch.PreviewedAtUtc);
        Assert.Equal(13.13m, batch.TotalAmount);
        Assert.Contains("corrected", batch.PreviewJson);
        Assert.Equal(PaymentImportBatchStatus.Preview, batch.Status);
    }

    [Fact]
    public void AnotherOperatorCannotReviseOrConfirmAndConfirmedEvidenceIsImmutable()
    {
        var actor = Guid.NewGuid();
        var batch = new PaymentImportBatch("Bank", new string('a', 64), "[{}]", 1, 12m, actor, Now);
        Assert.Throws<InvalidOperationException>(() => batch.RevisePreview("[]", 2, 14m, Guid.NewGuid(), Now));
        Assert.Throws<InvalidOperationException>(() => batch.Confirm(Guid.NewGuid(), Now));
        Assert.Equal("[{}]", batch.PreviewJson);
        Assert.Equal(PaymentImportBatchStatus.Preview, batch.Status);
        batch.Confirm(actor, Now.AddMinutes(1));
        Assert.Throws<InvalidOperationException>(() => batch.RevisePreview("[]", 2, 14m, actor, Now));
        Assert.Throws<InvalidOperationException>(() => batch.Confirm(actor, Now));
        Assert.Equal(actor, batch.ConfirmedByUserId);
        Assert.Equal(Now.AddMinutes(1), batch.ConfirmedAtUtc);
    }

    [Fact]
    public void InvalidRepreviewDoesNotPartiallyReplacePreviouslyReviewedFacts()
    {
        var actor = Guid.NewGuid();
        var batch = new PaymentImportBatch("Bank", new string('a', 64), "[{}]", 1, 12m, actor, Now);
        Assert.Throws<ArgumentException>(() => batch.RevisePreview("not-json", 2, 24m, actor, Now.AddMinutes(1)));
        Assert.Throws<ArgumentOutOfRangeException>(() => batch.RevisePreview("[]", 1, 0.001m, actor, Now.AddMinutes(1)));
        Assert.Equal("[{}]", batch.PreviewJson);
        Assert.Equal(1, batch.RowCount);
        Assert.Equal(12m, batch.TotalAmount);
        Assert.Equal(Now, batch.PreviewedAtUtc);
    }

    [Fact]
    public void RoundedZeroCannotBecomeAReceiptOrImportTotal()
    {
        var actor = Guid.NewGuid();
        Assert.Throws<ArgumentOutOfRangeException>(() => new PaymentImportBatch("Bank", new string('a', 64), "[{}]", 1, 0.001m, actor, Now));
        Assert.Throws<ArgumentOutOfRangeException>(() => new PaymentReceipt(Guid.NewGuid(), "RCT", "Bank", "ext", "Payer", 0.001m,
            "USD", DateOnly.FromDateTime(Now), "Transfer", "Reference", "evidence", null, actor, Now));
    }
}
