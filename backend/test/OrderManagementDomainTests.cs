namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public class OrderManagementDomainTests
{
    private static readonly DateTime Now = new(2026, 7, 14, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void LabRequestRequiresSamplesAndFreezesAcceptedQuote()
    {
        var actor = Guid.NewGuid();
        var order = new LabServiceOrder(Guid.NewGuid(), OrderNumberGenerator.Lab(), "customer-job", "Ship cold");
        Assert.Throws<InvalidOperationException>(() => order.Submit(actor, Now));
        order.Samples.Add(Sample(order.Id, "S-1"));
        order.Submit(actor, Now);
        order.BeginQuotePreparation();
        var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial, "[]", 100, 5, "USD", Now, Now.AddDays(30));
        quote.MarkIssued();
        order.Quotes.Add(quote);
        order.MarkQuoteIssued(quote.Id);
        quote.Accept(actor, Now.AddMinutes(1));
        order.AcceptQuote(quote.Id, Now.AddMinutes(1));

        Assert.Equal(LabServiceOrderStatus.PlacedAwaitingSamples, order.Status);
        Assert.Equal(QuoteStatus.Accepted, quote.Status);
        Assert.Throws<InvalidOperationException>(() => order.UpdateDraft("changed"));
    }

    [Fact]
    public void ExpiredLabQuoteCannotBeAccepted()
    {
        var quote = new LabServiceQuote(Guid.NewGuid(), 1, QuotePurpose.Initial, "[]", 25, 0, "USD", Now, Now.AddDays(1));
        quote.MarkIssued();

        Assert.Throws<InvalidOperationException>(() => quote.Accept(Guid.NewGuid(), Now.AddDays(2)));
        Assert.Equal(QuoteStatus.Expired, quote.Status);
    }

    [Fact]
    public void LabSamplesMoveIndependentlyAndHoldsRequireSafeReason()
    {
        var sample = Sample(Guid.NewGuid(), "S-1");
        sample.Receive(Now, "Intact and cold");
        sample.Accession("ACC-0001");
        sample.TransitionTo(LabSampleStatus.LabAnalysis, null, null);

        Assert.Throws<ArgumentException>(() => sample.TransitionTo(LabSampleStatus.OnHold, null, "Internal details"));

        var held = Sample(Guid.NewGuid(), "S-2");
        held.Receive(Now, "Intact");
        held.Accession("ACC-0002");
        held.TransitionTo(LabSampleStatus.OnHold, "Insufficient material", "Internal details");
        held.TransitionTo(LabSampleStatus.Accessioned, "Replacement aliquot received", null);

        Assert.Equal(LabSampleStatus.Accessioned, held.Status);
    }

    [Fact]
    public void ReagentOrderSnapshotsNegotiatedPriceAndTracksPartialShipment()
    {
        var order = new PartnerReagentOrder(Guid.NewGuid(), OrderNumberGenerator.Reagent());
        var line = new PartnerReagentOrderLine(order.Id, Guid.NewGuid(), 10, null);
        line.Snapshot(Guid.NewGuid(), "QBO-1", "Synthetic reagent", "vial", 12.50m, "USD");
        order.Lines.Add(line);
        order.Place("PO-42", Guid.NewGuid(), "{}", null, null, Now);
        order.MarkCommerciallySynchronized();
        order.Accept(Now);
        order.StartProcessing();
        line.AllocateShipment(4);
        order.RecordShipmentProgress();

        Assert.Equal(125m, line.LineTotal);
        Assert.Equal(6m, line.RemainingQuantity);
        Assert.Equal(ReagentOrderStatus.PartiallyShipped, order.Status);
    }

    [Fact]
    public void ReagentQuantityRulesHonorIncrementAndEffectiveWindow()
    {
        var offering = new PartnerReagentOffering(Guid.NewGuid(), Guid.NewGuid(), 5, "USD", "kit", 2, 2, 10,
            "{}", Now.AddDays(-1), Now.AddDays(1), true);

        Assert.True(offering.IsEffectiveAt(Now));
        Assert.True(offering.IsQuantityAllowed(4));
        Assert.False(offering.IsQuantityAllowed(3));
        Assert.False(offering.IsQuantityAllowed(12));
    }

    [Fact]
    public void ReagentShippingRulesEnforceAllowedAndBlockedDestinations()
    {
        var rules = ReagentShippingRules.Parse("""{"allowedCountryCodes":["US","CA"],"blockedRegions":["US-AK","HI"]}""");

        Assert.True(rules.Allows("US", "CA"));
        Assert.False(rules.Allows("US", "AK"));
        Assert.False(rules.Allows("US", "HI"));
        Assert.False(rules.Allows("GB", "ENG"));
        Assert.Throws<ArgumentException>(() => ReagentShippingRules.Parse("[]"));
    }

    [Fact]
    public void ReagentPlacementSnapshotIsImmutable()
    {
        var order = new PartnerReagentOrder(Guid.NewGuid(), OrderNumberGenerator.Reagent());
        var line = new PartnerReagentOrderLine(order.Id, Guid.NewGuid(), 1, null);
        line.Snapshot(Guid.NewGuid(), "QBO-1", "Synthetic reagent", "vial", 12, "USD");
        order.Lines.Add(line);
        order.Place("PO-1", Guid.NewGuid(), "{}", null, null, Now);
        order.RecordPlacementSnapshot("{\"purchaseOrderNumber\":\"PO-1\"}");

        Assert.Contains("PO-1", order.PlacementSnapshotJson);
        Assert.Throws<InvalidOperationException>(() => order.RecordPlacementSnapshot("{}"));
    }

    [Fact]
    public void ApprovedReagentSubstitutionChangesOnlyAnUnfulfilledSnapshot()
    {
        var line = new PartnerReagentOrderLine(Guid.NewGuid(), Guid.NewGuid(), 4, null);
        line.Snapshot(Guid.NewGuid(), "QBO-OLD", "Original reagent", "kit", 10, "USD");

        var replacementOfferingId = Guid.NewGuid();
        line.ApplyApprovedSubstitution(replacementOfferingId, Guid.NewGuid(), "QBO-NEW", "Replacement reagent", "kit", 12, "USD");

        Assert.Equal(replacementOfferingId, line.OfferingId);
        Assert.Equal("Replacement reagent", line.Description);
        Assert.Equal(48, line.LineTotal);
        line.AllocateShipment(1);
        Assert.Throws<InvalidOperationException>(() => line.ApplyApprovedSubstitution(Guid.NewGuid(), Guid.NewGuid(), "QBO-3", "Late change", "kit", 9, "USD"));
    }

    [Fact]
    public void PartialReagentCancellationResumesFulfillmentWithRemainingQuantity()
    {
        var order = new PartnerReagentOrder(Guid.NewGuid(), OrderNumberGenerator.Reagent());
        var line = new PartnerReagentOrderLine(order.Id, Guid.NewGuid(), 10, null);
        line.Snapshot(Guid.NewGuid(), "QBO-1", "Synthetic reagent", "vial", 12, "USD");
        order.Lines.Add(line);
        order.Place("PO-42", Guid.NewGuid(), "{}", null, null, Now);
        order.MarkCommerciallySynchronized();
        order.Accept(Now);
        order.StartProcessing();
        order.RequestCancellation();
        line.CancelRemainder(3);

        order.ResolveCancellation(CancellationRequestStatus.PartiallyApproved, "Three units cancelled", null);

        Assert.Equal(ReagentOrderStatus.Processing, order.Status);
        Assert.Equal(7, line.RemainingQuantity);
    }

    [Fact]
    public void AssemblyRequestPreservesInputRevisionThroughQuoteAndProcessing()
    {
        var actor = Guid.NewGuid();
        var request = new DataAssemblyRequest(Guid.NewGuid(), OrderNumberGenerator.Assembly(), "Project X", Guid.NewGuid(), 3,
            "Synthetic assembly", "Upload fixtures", "{}", "FASTA and manifest", null, true);
        var revision = new AssemblyInputRevision(request.Id, 1, null, "{\"files\":[]}", null, "{}", actor, Now);
        request.InputRevisions.Add(revision);
        request.Submit(revision.Id, Now);
        request.BeginIntakeValidation();
        request.BeginQuotePreparation();
        var quote = new DataAssemblyQuote(request.Id, 1, QuotePurpose.Initial, "[]", 500, 0, "USD", Now, Now.AddDays(30));
        quote.MarkIssued();
        request.Quotes.Add(quote);
        request.MarkQuoteIssued(quote.Id);
        quote.Accept(actor, Now.AddMinutes(1));
        request.AcceptQuote(quote.Id, "PO-ASM", Now.AddMinutes(1));
        request.StartProcessing();

        Assert.Equal(revision.Id, request.CurrentInputRevisionId);
        Assert.Equal(AssemblyRequestStatus.Processing, request.Status);
        Assert.Equal("PO-ASM", request.PurchaseOrderNumber);
    }

    [Fact]
    public void LabRequestRevisionLinksToPriorImmutableSubmission()
    {
        var first = new LabServiceRequestRevision(Guid.NewGuid(), 1, null, "{\"sample\":\"S-1\"}", null, Guid.NewGuid(), Now);
        var second = new LabServiceRequestRevision(first.LabServiceOrderId, 2, first.Id, "{\"sample\":\"S-2\"}", "Corrected sample", Guid.NewGuid(), Now.AddMinutes(1));

        Assert.Equal(first.Id, second.PreviousRevisionId);
        Assert.Equal(2, second.Revision);
        Assert.Contains("S-1", first.SnapshotJson);
        Assert.Contains("S-2", second.SnapshotJson);
    }

    [Fact]
    public void OperationalFilesReleaseOnlyAfterCleanScan()
    {
        var file = new ManagedOperationalFile(Guid.NewGuid(), OrderWorkflowTypes.DataAssembly, Guid.NewGuid(), null,
            OperationalFilePurpose.AssemblyOutput, "output.zip", ".zip", "application/zip", 123, new string('a', 64), "safe/key.zip");

        Assert.Throws<InvalidOperationException>(() => file.Release(Now));
        file.RecordScan(OperationalFileScanStatus.Clean, null);
        file.Release(Now);

        Assert.Equal(FileReleaseStatus.Released, file.ReleaseStatus);
        Assert.Equal(Now, file.ReleasedAt);
    }

    [Fact]
    public void CustomerAndAssemblyCreditDecisionsRemainSeparate()
    {
        var actor = Guid.NewGuid();
        var profile = new OrganizationCommercialProfile(Guid.NewGuid());
        profile.Update("QBO-CUSTOMER", labCreditApproved: true, assemblyCreditApproved: false, actor, Now);

        Assert.True(profile.LabCreditApproved);
        Assert.False(profile.AssemblyCreditApproved);
        Assert.Equal("QBO-CUSTOMER", profile.QboCustomerId);
    }

    [Fact]
    public void SystemConfigurationValidatesQuoteValidityWindow()
    {
        var configuration = new OrderSystemConfiguration(30, "Ship overnight", "{}");
        configuration.Update(45, "Ship overnight", "{}");

        Assert.Equal(45, configuration.QuoteValidityDays);
        Assert.Throws<ArgumentOutOfRangeException>(() => configuration.Update(0, "", "{}"));
    }

    [Fact]
    public void FailedNotificationCanBeManuallyRequeued()
    {
        var notification = new OrderNotification(Guid.NewGuid(), null, OrderWorkflowTypes.LabService, Guid.NewGuid(),
            "lab-quote-issued", "Quote ready", "A quote is ready.");
        notification.BeginAttempt();
        notification.MarkFailed("Delivery failed.", Now.AddMinutes(5));

        notification.Retry(Now);

        Assert.Equal(OrderNotificationStatus.Pending, notification.Status);
        Assert.Equal(0, notification.AttemptCount);
        Assert.Null(notification.LastError);
        Assert.Throws<InvalidOperationException>(() => notification.Retry(Now));
    }

    private static LabSample Sample(Guid orderId, string id) => new(orderId, id, "RNA", "Synthetic control", 1,
        "tube", "Frozen", "No PHI; non-hazardous synthetic material", Now.AddDays(-1), 10, null, "[]");
}
