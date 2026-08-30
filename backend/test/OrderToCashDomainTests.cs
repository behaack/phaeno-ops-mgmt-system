namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;

public sealed class OrderToCashDomainTests
{
    private static readonly DateTime UtcNow = new(2026, 8, 29, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void InvitationDeliveryRetriesThenSurfacesTerminalAttention()
    {
        var attempt = new InvitationDeliveryAttempt(Guid.NewGuid(), Guid.NewGuid(),
            "customer@example.com", "protected-payload", 2, UtcNow);

        attempt.Claim(UtcNow, TimeSpan.FromMinutes(1));
        attempt.RecordFailure("provider unavailable", UtcNow, TimeSpan.FromMinutes(2));
        Assert.Equal(InvitationDeliveryState.Failed, attempt.State);
        Assert.False(attempt.CanBeClaimed(UtcNow.AddMinutes(1)));

        attempt.Claim(UtcNow.AddMinutes(2), TimeSpan.FromMinutes(1));
        attempt.RecordFailure("provider unavailable", UtcNow.AddMinutes(2), TimeSpan.FromMinutes(4));

        Assert.Equal(InvitationDeliveryState.NeedsAttention, attempt.State);
        Assert.Equal(2, attempt.AttemptCount);
        Assert.Empty(attempt.ProtectedPayload);
    }

    [Fact]
    public void HardBounceRequiresAttentionAndCannotBeReclaimed()
    {
        var attempt = new InvitationDeliveryAttempt(Guid.NewGuid(), Guid.NewGuid(),
            "incorrect@example.com", "protected-payload", 5, UtcNow);
        attempt.Claim(UtcNow, TimeSpan.FromMinutes(1));
        attempt.RecordProviderAccepted("postmark-message", UtcNow);

        attempt.RecordBounce(UtcNow.AddMinutes(1), "HardBounce", hardBounce: true);

        Assert.Equal(InvitationDeliveryState.NeedsAttention, attempt.State);
        Assert.Contains("Revoke", attempt.LastError, StringComparison.Ordinal);
        Assert.False(attempt.CanBeClaimed(UtcNow.AddDays(1)));
    }

    [Fact]
    public void DeliveredStateIsPreservedWhenAccessIsAccepted()
    {
        var attempt = new InvitationDeliveryAttempt(Guid.NewGuid(), Guid.NewGuid(),
            "customer@example.com", "protected-payload", 5, UtcNow);
        attempt.Claim(UtcNow, TimeSpan.FromMinutes(1));
        attempt.RecordProviderAccepted("postmark-message", UtcNow);
        attempt.RecordDelivered(UtcNow.AddMinutes(1));

        attempt.RecordAccepted(UtcNow.AddMinutes(2));

        Assert.Equal(InvitationDeliveryState.Delivered, attempt.State);
        Assert.Equal(UtcNow.AddMinutes(2), attempt.AcceptedAtUtc);
    }

    [Fact]
    public void ResultPackageRequiresEveryArtifactToBeCleanBeforeReview()
    {
        var package = Package();
        var artifact = new ResultArtifact(package.Id, "summary", "summary.pdf",
            "application/pdf", 123, new string('a', 64), "results/summary.pdf", UtcNow);
        package.Artifacts.Add(artifact);
        package.BeginScanning();

        Assert.Throws<InvalidOperationException>(package.MarkReadyForReview);
        artifact.RecordScan(ResultArtifactScanStatus.Clean, "scanner clean", UtcNow);
        package.MarkReadyForReview();

        Assert.Equal(ResultOutputPackageStatus.ReadyForReview, package.Status);
    }

    [Fact]
    public void ResultReleasePinsApprovalAndIsIdempotent()
    {
        var package = Package();
        var artifact = new ResultArtifact(package.Id, "summary", "summary.pdf",
            "application/pdf", 123, new string('b', 64), "results/summary.pdf", UtcNow);
        package.Artifacts.Add(artifact);
        package.BeginScanning();
        artifact.RecordScan(ResultArtifactScanStatus.Clean, null, UtcNow);
        package.MarkReadyForReview();
        var approvalId = Guid.NewGuid();
        package.ScientificallyApprove(approvalId, Guid.NewGuid(), UtcNow);
        package.MarkReadyForRelease(approvalId);

        Assert.True(package.Release(Guid.NewGuid(), UtcNow));
        Assert.False(package.Release(Guid.NewGuid(), UtcNow.AddMinutes(1)));
        Assert.Equal(ResultOutputPackageStatus.Released, package.Status);
    }

    [Fact]
    public void BillingConfigurationRequiresApprovedTaxEvidence()
    {
        var profile = new OrganizationCommercialProfile(Guid.NewGuid());

        Assert.Throws<ArgumentException>(() => profile.ConfigurePSeqBilling(
            "Finance", "finance@example.com", "{\"country\":\"US\"}", 30,
            TaxDecision.Exempt, null, null, Guid.NewGuid(), UtcNow, "Reviewed"));

        profile.ConfigurePSeqBilling(
            "Finance", "finance@example.com", "{\"country\":\"US\"}", 30,
            TaxDecision.Exempt, null, "certificate-123", Guid.NewGuid(), UtcNow,
            "Reviewed and approved.");

        Assert.True(profile.HasApprovedPSeqBillingConfiguration);
        Assert.Equal(1, profile.PSeqBillingConfigurationVersion);
    }

    [Fact]
    public void InvoiceAndReceiptSupportPartialAndManyToManyAllocationMath()
    {
        var invoiceOne = Invoice(100m, "PSEQ-2026-0001");
        var invoiceTwo = Invoice(80m, "PSEQ-2026-0002");
        var operatorId = Guid.NewGuid();
        var receiptOne = Receipt(120m, operatorId, "cash-1");
        var receiptTwo = Receipt(60m, operatorId, "cash-2");

        receiptOne.Allocate(100m); invoiceOne.ApplyAllocation(100m, UtcNow);
        receiptOne.Allocate(20m); invoiceTwo.ApplyAllocation(20m, UtcNow);
        receiptTwo.Allocate(60m); invoiceTwo.ApplyAllocation(60m, UtcNow);

        Assert.Equal(InvoiceStatus.Paid, invoiceOne.Status);
        Assert.Equal(InvoiceStatus.Paid, invoiceTwo.Status);
        Assert.Equal(PaymentReceiptStatus.Applied, receiptOne.Status);
        Assert.Equal(PaymentReceiptStatus.Applied, receiptTwo.Status);
    }

    [Fact]
    public void AccountsReceivableRejectsNonUsdAndOverAllocation()
    {
        Assert.Throws<ArgumentException>(() => new PaymentReceipt(Guid.NewGuid(),
            "RCPT-1", "Payer", 100m, "EUR", UtcNow, "Wire", "reference",
            null, "external-1", null, Guid.NewGuid()));
        var invoice = Invoice(25m, "PSEQ-2026-0003");
        Assert.Throws<InvalidOperationException>(() => invoice.ApplyAllocation(25.01m, UtcNow));
    }

    [Fact]
    public void ReconciliationRequiresIndependentActorAndBalancedAmounts()
    {
        var cashOperator = Guid.NewGuid();
        var reconciler = Guid.NewGuid();
        var batch = new ReconciliationBatch("RECON-2026-08", UtcNow.AddDays(-1),
            UtcNow, 180m, 180m, [cashOperator], cashOperator);
        var report = "{\"balanced\":true}";
        var sha = new string('c', 64);

        Assert.Throws<InvalidOperationException>(() => batch.Approve(
            cashOperator, UtcNow, "Approved", report, sha));
        batch.Approve(reconciler, UtcNow, "Approved independently", report, sha);

        Assert.Equal(ReconciliationStatus.Approved, batch.Status);
        Assert.Equal(reconciler, batch.ApprovedByUserId);
    }

    private static ResultOutputPackage Package() => new(
        Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, null,
        "pipeline", "1.0", Guid.NewGuid().ToString("N"), new string('0', 64),
        "{\"artifacts\":[]}", "operational-files", "results/package");

    private static Invoice Invoice(decimal subtotal, string number) => new(
        Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), number, subtotal, 0m,
        "USD", "{\"paymentTermsDays\":30}", UtcNow, UtcNow.AddDays(30));

    private static PaymentReceipt Receipt(decimal amount, Guid actorId, string externalId) =>
        new(Guid.NewGuid(), $"RCPT-{externalId}", "Payer", amount, "USD", UtcNow,
            "Wire", "reference", null, externalId, null, actorId);
}
