namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class KitBundleDomainTests
{
    private static readonly DateTime Shipped = new(2026, 1, 15, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void EachCaseRetainsItsOwnShipmentAndDeadline()
    {
        var first = Unit(); var second = Unit();
        var a = new KitAssemblyCase(first, Guid.NewGuid(), "{}"); var b = new KitAssemblyCase(second, Guid.NewGuid(), "{}");
        Assert.False(a.CanPrepareAt(Shipped));
        first.Ship(Guid.NewGuid(), Shipped, Shipped.AddMonths(2), "LOT-A", "Carrier", "TRACK-A");
        second.Ship(Guid.NewGuid(), Shipped.AddDays(8), null, "LOT-B", "Carrier", "TRACK-B");
        a.RecordShipment(first, null, Shipped); b.RecordShipment(second, null, Shipped.AddDays(8));
        Assert.Equal(Shipped.AddMonths(2).AddDays(90), a.SubmissionDeadlineAt);
        Assert.Equal(Shipped.AddDays(8).AddMonths(12), b.SubmissionDeadlineAt);
        Assert.NotEqual(a.BillingShipmentId, b.BillingShipmentId);
        Assert.False(a.CanPrepareAt(a.SubmissionDeadlineAt!.Value.AddTicks(1)));
        Assert.True(b.CanPrepareAt(a.SubmissionDeadlineAt.Value.AddTicks(1)));
    }

    [Fact]
    public void ExpiredDraftKeepsItsRequestAndCanResumeOnlyAfterAuditedExtension()
    {
        var (unit, included) = ShippedCase(); var actor = Guid.NewGuid(); var request = Guid.NewGuid();
        included.AttachRequest(request, actor, Shipped);
        var expiredAt = included.SubmissionDeadlineAt!.Value.AddDays(1);
        Assert.True(included.Expire(expiredAt)); Assert.False(included.Expire(expiredAt));
        Assert.Equal(request, included.AssemblyRequestId);
        Assert.Throws<InvalidOperationException>(() => included.Submit(request, actor, expiredAt));
        included.Extend(expiredAt.AddDays(5), "Shipment disruption; extra submission time approved.", actor, expiredAt);
        included.Submit(request, actor, expiredAt);
        Assert.Equal(KitAssemblyCaseStatus.InProgress, included.Status);
        Assert.Equal(1, included.History.Count(x => x.EventType == "ExpiredUnused"));
        Assert.Equal(unit.Id, included.OriginalKitUnitId);
    }

    [Fact]
    public void CorrectedInputReusesCaseAndCannotExpireAfterFirstSubmission()
    {
        var (_, included) = ShippedCase(); var actor = Guid.NewGuid(); var request = Guid.NewGuid();
        included.AttachRequest(request, actor, Shipped); included.Submit(request, actor, Shipped);
        included.Submit(request, actor, Shipped.AddYears(2));
        Assert.False(included.Expire(Shipped.AddYears(2)));
        Assert.Equal(Shipped, included.FirstSubmittedAt);
        Assert.Throws<InvalidOperationException>(() => included.AttachRequest(Guid.NewGuid(), actor, Shipped));
        Assert.Throws<InvalidOperationException>(() => included.Submit(Guid.NewGuid(), actor, Shipped));
    }

    [Fact]
    public void ReplacementPreservesPurchaseBillingAndInputProvenanceWithoutShorteningExtension()
    {
        var (unit, included) = ShippedCase(); var actor = Guid.NewGuid(); var request = Guid.NewGuid(); var invoice = Guid.NewGuid();
        included.RecordBillingSource(invoice);
        included.Extend(Shipped.AddYears(2), "Approved extension.", actor, Shipped);
        included.AttachRequest(request, actor, Shipped); included.Submit(request, actor, Shipped);
        var revision = new AssemblyInputRevision(request, 1, null, "{}", null, "{}", actor, Shipped, unit.Id);
        var replacement = new PartnerKitUnit(unit.PartnerReagentOrderId, unit.PartnerReagentOrderLineId, unit.OrganizationId, unit.DepartmentId, "REPLACEMENT", unit.Id);
        replacement.Ship(null, Shipped.AddDays(1), null, "NEW-LOT", "Carrier", "NEW-TRACK");
        unit.Replace(replacement.Id); included.Transfer(replacement, "Replacement for damaged Kit.", actor, Shipped.AddDays(1));
        Assert.Equal(unit.Id, included.OriginalKitUnitId); Assert.Equal(replacement.Id, included.CurrentKitUnitId);
        Assert.Equal(unit.Id, revision.KitUnitId); Assert.Equal(invoice, included.BillingDocumentId);
        Assert.Equal(unit.ReagentShipmentId, included.BillingShipmentId);
        Assert.Equal(Shipped.AddYears(2), included.SubmissionDeadlineAt);
        Assert.Equal(request, included.AssemblyRequestId);
        Assert.Throws<InvalidOperationException>(() => included.RecordBillingSource(Guid.NewGuid()));
        Assert.Throws<InvalidOperationException>(() => unit.Replace(Guid.NewGuid()));
    }

    [Fact]
    public void ReplacementCannotCrossTenantOrFollowReleasedResults()
    {
        var (unit, included) = ShippedCase(); var actor = Guid.NewGuid(); var request = Guid.NewGuid();
        var wrongTenant = new PartnerKitUnit(unit.PartnerReagentOrderId, unit.PartnerReagentOrderLineId, Guid.NewGuid(), unit.DepartmentId, "WRONG", unit.Id);
        wrongTenant.Ship(null, Shipped, null, "LOT", "Carrier", "TRACK");
        Assert.Throws<InvalidOperationException>(() => included.Transfer(wrongTenant, "Reason", actor, Shipped));
        included.AttachRequest(request, actor, Shipped); included.Submit(request, actor, Shipped); included.MarkResultsReleased(Shipped);
        Assert.True(included.IsTerminal);
        Assert.Throws<InvalidOperationException>(() => included.Cancel("Cancelled", actor, Shipped));
        Assert.Throws<InvalidOperationException>(() => included.Submit(request, actor, Shipped));
    }

    [Fact]
    public void IncludedAssemblySkipsSecondQuoteAndKeepsPurchasedOutputScope()
    {
        var request = new DataAssemblyRequest(Guid.NewGuid(), Guid.NewGuid(), "ASM-KIT", "Project", Guid.NewGuid(), 1, "Profile", "Instructions", "{}", "Purchased outputs", null, true);
        request.LinkIncludedCase(Guid.NewGuid(), "{}", "PO-KIT", Shipped);
        request.UpdateDraft("Project revised", "{}", "Unpurchased extra outputs", null, true);
        Assert.Equal("Purchased outputs", request.RequestedOutput);
        request.Submit(Guid.NewGuid(), Shipped); request.BeginIntakeValidation();
        Assert.Throws<InvalidOperationException>(() => request.BeginQuotePreparation());
        request.AcceptIncludedIntake();
        Assert.Equal(AssemblyRequestStatus.PlacedQueued, request.Status); Assert.Empty(request.Quotes);
        Assert.Null(request.AcceptedQuoteId); Assert.Equal("PO-KIT", request.PurchaseOrderNumber);
        Assert.Throws<InvalidOperationException>(() => request.AcceptQuote(Guid.NewGuid(), "OTHER", Shipped));
    }

    private static PartnerKitUnit Unit() => new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "KIT-" + Guid.NewGuid().ToString("N"));
    private static (PartnerKitUnit, KitAssemblyCase) ShippedCase()
    {
        var unit = Unit(); var included = new KitAssemblyCase(unit, Guid.NewGuid(), "{}");
        unit.Ship(Guid.NewGuid(), Shipped, null, "LOT", "Carrier", "TRACK"); included.RecordShipment(unit, null, Shipped);
        return (unit, included);
    }
}
