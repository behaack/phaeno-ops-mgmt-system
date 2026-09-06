namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Services;

public class PSeqOrderToCashDomainTests
{
    private static readonly DateTime Now = new(2026, 8, 29, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void InvitationDeliveryTracksRetryProviderAcceptanceDeliveryAndHardBounce()
    {
        var attempt = new InvitationDeliveryAttempt(Guid.NewGuid(), "protected", Now);
        attempt.MarkSending(Now);
        attempt.MarkFailure("provider unavailable", Now, 3, TimeSpan.FromMinutes(5));

        Assert.Equal(InvitationDeliveryState.Failed, attempt.State);
        Assert.False(attempt.IsDispatchable(Now.AddMinutes(4)));
        attempt.MarkSending(Now.AddMinutes(5));
        attempt.MarkAccepted("provider-message", Now.AddMinutes(5));
        attempt.MarkDelivered(Now.AddMinutes(6));
        attempt.MarkBounced(Now.AddMinutes(7), true, "hard bounce");

        Assert.Equal(InvitationDeliveryState.Bounced, attempt.State);
        Assert.True(attempt.IsHardBounce);
        Assert.Equal(2, attempt.AttemptCount);
    }

    [Fact]
    public void InvitationDeliveryStopsAutomaticallyAfterMaximumAttempts()
    {
        var attempt = new InvitationDeliveryAttempt(Guid.NewGuid(), "protected", Now);
        for (var index = 0; index < 3; index++)
        {
            var time = Now.AddMinutes(index * 5);
            attempt.MarkSending(time);
            attempt.MarkFailure("failure", time, 3, TimeSpan.FromMinutes(5));
        }

        Assert.Equal(InvitationDeliveryState.NeedsAttention, attempt.State);
        Assert.Null(attempt.NextAttemptAtUtc);
    }

    [Fact]
    public void ReadinessSeparatesFullReadinessFromStagingAndHonorsManualBlock()
    {
        var incomplete = OperationalReadinessPolicy.Evaluate(Input(
            hasAdministrator: false, completeBilling: false));
        Assert.Equal(OperationalReadiness.NeedsSetup, incomplete.State);
        Assert.True(incomplete.CanStageOrder);
        Assert.False(incomplete.CanIssueQuote);

        var billingIncomplete = OperationalReadinessPolicy.Evaluate(Input(completeBilling: false));
        Assert.Equal(OperationalReadiness.NeedsSetup, billingIncomplete.State);
        Assert.True(billingIncomplete.CanIssueQuote);
        Assert.Empty(billingIncomplete.QuoteBlockers);

        var blocked = OperationalReadinessPolicy.Evaluate(Input(manualBlock: true));
        Assert.Equal(OperationalReadiness.Blocked, blocked.State);
        Assert.False(blocked.CanStageOrder);

        var ready = OperationalReadinessPolicy.Evaluate(Input());
        Assert.Equal(OperationalReadiness.Ready, ready.State);
        Assert.True(ready.CanIssueQuote);
    }

    [Fact]
    public void ProtocolAuthorCannotApproveOrActivateOwnVersion()
    {
        var author = Guid.NewGuid();
        var reviewer = Guid.NewGuid();
        var version = new LabProtocolVersion(Guid.NewGuid(), 1, LabProtocolTestData.Definition(), author, Now);

        Assert.Throws<InvalidOperationException>(() => version.Approve(author, Now));
        version.Approve(reviewer, Now);
        Assert.Throws<InvalidOperationException>(() => version.Activate(author));
        version.Activate(reviewer);

        Assert.Equal(LabProtocolStatus.Active, version.Status);
    }

    [Fact]
    public void ProtocolActorSeparationCanRunInAuditOnlyModeBeforeEnforcement()
    {
        var author = Guid.NewGuid();
        var version = new LabProtocolVersion(Guid.NewGuid(), 1, LabProtocolTestData.Definition(), author, Now);

        version.Approve(author, Now, enforceActorSeparation: false);
        version.Activate(author, enforceActorSeparation: false);

        Assert.Equal(LabProtocolStatus.Active, version.Status);
    }

    [Fact]
    public void ResultPackageRequiresCompleteCleanChecksummedManifestBeforeApprovalAndRelease()
    {
        var package = Package();
        package.BeginScanning();
        Assert.Throws<InvalidOperationException>(() => package.MarkReadyForReview(1, true, true));
        Assert.Throws<InvalidOperationException>(() => package.MarkReadyForReview(2, false, true));
        package.MarkReadyForReview(2, true, true);
        var approvalId = Guid.NewGuid();
        package.RecordScientificApproval(approvalId, Guid.NewGuid(), Now);
        package.MarkReadyForRelease(approvalId);
        package.Release(Guid.NewGuid(), Now);

        Assert.Equal(ResultOutputPackageState.Released, package.State);
        Assert.Throws<InvalidOperationException>(() => package.Fail("late", "cannot rewrite history"));
    }

    [Fact]
    public void ResultCorrectionAndWithdrawalPreserveVersionHistory()
    {
        var released = Package();
        released.BeginScanning();
        released.MarkReadyForReview(2, true, true);
        var approvalId = Guid.NewGuid();
        released.RecordScientificApproval(approvalId, Guid.NewGuid(), Now);
        released.MarkReadyForRelease(approvalId);
        released.Release(Guid.NewGuid(), Now);
        var correction = new ResultOutputPackage(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            released.LabSampleId, 2, released.Id, "pipeline", "submission-2", "idempotency-2",
            "{}", new string('B', 64), 1);
        released.Withdraw(Guid.NewGuid(), Now.AddMinutes(1), "Superseded by corrected result.");

        Assert.Equal(released.Id, correction.CorrectsPackageId);
        Assert.Equal(2, correction.PackageVersion);
        Assert.Equal(ResultOutputPackageState.Withdrawn, released.State);
    }

    [Fact]
    public void RetentionAdvancesThroughEveryStageAndRequiresDeletionBeforeReissue()
    {
        var schedule = new ResultRetentionSchedule(Guid.NewGuid(), Now.AddDays(1),
            Now.AddDays(2), Now.AddDays(3), Now.AddDays(4));

        Assert.Throws<InvalidOperationException>(schedule.Reissue);
        Assert.Equal(ResultDeliveryEvidenceKind.RetentionWarning,
            schedule.Advance(Now.AddDays(1)));
        Assert.Equal(ResultDeliveryEvidenceKind.Cutoff,
            schedule.Advance(Now.AddDays(2)));
        Assert.Equal(ResultDeliveryEvidenceKind.GraceStarted,
            schedule.Advance(Now.AddDays(3)));
        Assert.Equal(ResultDeliveryEvidenceKind.Deleted,
            schedule.Advance(Now.AddDays(4)));
        schedule.Reissue();

        Assert.Equal(ResultRetentionState.Reissued, schedule.State);
    }

    [Fact]
    public void InvoiceUsesDecimalMoneyAndSupportsPartialPaymentsAndAppendOnlyAdjustments()
    {
        var invoice = Invoice(total: 100.005m);
        Assert.Equal(100.01m, invoice.Total);
        invoice.ApplyPayment(40.004m);
        Assert.Equal(InvoiceStatus.PartiallyPaid, invoice.Status);
        Assert.Equal(60.01m, invoice.Balance);
        Assert.Throws<InvalidOperationException>(() => invoice.ApplyPayment(60.02m));
        invoice.ApplyAdjustment(InvoiceAdjustmentKind.Credit, 10m);
        Assert.Equal(50.01m, invoice.Balance);
        var adjustment = new InvoiceAdjustment(invoice.Id, InvoiceAdjustmentKind.Credit,
            10m, "Service credit", Guid.NewGuid(), Now);
        Assert.Equal(10m, adjustment.Amount);
        Assert.Equal("Service credit", adjustment.Reason);
    }

    [Fact]
    public void ReceiptSupportsPartialMultiInvoiceAllocationAndOverpaymentRemainsUnapplied()
    {
        var actor = Guid.NewGuid();
        var receipt = new PaymentReceipt(Guid.NewGuid(), "RCT-1", "ManualFinance", "EXT-1",
            "Payer", 150m, "USD", new DateOnly(2026, 8, 29), "ACH", "BANK-1",
            "evidence", null, actor, Now);
        var first = Invoice(100m);
        var second = Invoice(75m);
        receipt.Allocate(100m); first.ApplyPayment(100m);
        receipt.Allocate(25m); second.ApplyPayment(25m);

        Assert.Equal(PaymentReceiptStatus.PartiallyApplied, receipt.Status);
        Assert.Equal(25m, receipt.UnappliedAmount);
        Assert.Equal(InvoiceStatus.Paid, first.Status);
        Assert.Equal(50m, second.Balance);
        Assert.Throws<InvalidOperationException>(() => receipt.Allocate(25.01m));
    }

    [Fact]
    public void ReconciliationRequiresBalanceAndIndependentNonContributor()
    {
        var cashOperator = Guid.NewGuid();
        var reconciler = Guid.NewGuid();
        var batch = new ReconciliationBatch("REC-1", new DateOnly(2026, 8, 29), 100m, 100m, cashOperator);
        batch.Submit(cashOperator, Now);
        Assert.Throws<InvalidOperationException>(() => batch.Approve(cashOperator, [], "{}", Now));
        Assert.Throws<InvalidOperationException>(() => batch.Approve(reconciler, [reconciler], "{}", Now));
        batch.Approve(reconciler, [cashOperator], "{\"closed\":true}", Now);
        Assert.Equal(ReconciliationBatchStatus.Approved, batch.Status);

        var mismatch = new ReconciliationBatch("REC-2", new DateOnly(2026, 8, 29), 100m, 99m, cashOperator);
        mismatch.Submit(cashOperator, Now);
        Assert.Throws<InvalidOperationException>(() => mismatch.Approve(reconciler, [cashOperator], "{}", Now));
    }

    [Fact]
    public void ReconciliationActorSeparationCanRunInAuditOnlyModeBeforeEnforcement()
    {
        var cashOperator = Guid.NewGuid();
        var batch = new ReconciliationBatch("REC-AUDIT", new DateOnly(2026, 8, 29),
            100m, 100m, cashOperator);
        batch.Submit(cashOperator, Now);

        batch.Approve(cashOperator, [cashOperator], "{\"auditOnly\":true}", Now,
            enforceActorSeparation: false);

        Assert.Equal(ReconciliationBatchStatus.Approved, batch.Status);
    }

    [Fact]
    public void ProductionResultConfigurationRequiresPipelineSettingsWithoutObsoleteRetentionOffsets()
    {
        var invalid = new PSeqOrderToCashOptions { GovernedPSeqResults = true };
        Assert.NotEmpty(invalid.ValidateGovernedResults());
        var valid = new PSeqOrderToCashOptions
        {
            PipelineServiceSecret = new string('s', 24),
            PipelineProviderKey = "pseq-pipeline",
            ObjectStorageTransferBaseUrl = "https://object-storage.example/transfers"
        };
        Assert.Empty(valid.ValidateGovernedResults());
    }

    private static OperationalReadinessInput Input(bool hasAdministrator = true,
        bool completeBilling = true, bool manualBlock = false) => new(
            true, manualBlock, manualBlock ? "Compliance review" : null,
            hasAdministrator, true, true, true, true, true, true, true,
            completeBilling, completeBilling, completeBilling, completeBilling, completeBilling);

    private static ResultOutputPackage Package() => new(Guid.NewGuid(), Guid.NewGuid(),
        Guid.NewGuid(), Guid.NewGuid(), 1, null, "pipeline", "submission-1",
        Guid.NewGuid().ToString("N"), "{}", new string('A', 64), 2);

    private static Invoice Invoice(decimal total) => new(Guid.NewGuid(), Guid.NewGuid(),
        Guid.NewGuid(), $"INV-{Guid.NewGuid():N}", new DateOnly(2026, 8, 29), 30,
        "{\"name\":\"Billing\"}", "{\"line1\":\"1 Main\"}",
        "{\"decision\":\"NonTaxable\"}", total, 0, "invoice.pdf",
        new string('C', 64), Guid.NewGuid(), Now);
}
