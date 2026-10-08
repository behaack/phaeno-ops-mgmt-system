namespace PhaenoPortal.Test;

using System.Text.Json;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class CustomerStandardOrderTests
{
    private static readonly Guid Organization = Guid.NewGuid(), Department = Guid.NewGuid(), Catalog = Guid.NewGuid();
    private static readonly DateTime Now = new(2026, 9, 30, 12, 0, 0, DateTimeKind.Utc);
    private static LabServiceNegotiatedPrice Price(decimal price, Guid? department = null) => new(Organization, department, Catalog, price, Now.AddDays(-1), null, true);
    private static LabServicePriceProvenance Resolve(params LabServiceNegotiatedPrice[] prices) =>
        LabServicePriceRules.Resolve(Organization, Department, Catalog, 7, 1000, prices, Now);

    [Fact]
    public void NegotiatedScopeOverridesStandardAndLowerNegotiatedRateWins()
    {
        Assert.Equal(1000, Resolve().UnitPrice);
        Assert.Equal("Standard", Resolve().Source);
        Assert.Equal(900, Resolve(Price(900)).UnitPrice);
        Assert.Equal("Organization", Resolve(Price(900)).Source);
        var department = Price(850, Department);
        var selected = Resolve(Price(900), department);
        Assert.Equal(850, selected.UnitPrice); Assert.Equal(department.Id, selected.NegotiatedPriceId);
        Assert.Equal("Department", selected.Source); Assert.Equal(department.Version, selected.NegotiatedPriceVersion);
        Assert.Equal(900, Resolve(Price(900), Price(950, Department)).UnitPrice);
        Assert.Equal(1100, Resolve(Price(1100)).UnitPrice); // Negotiated pricing overrides, even above standard.
        Assert.Equal(950, Resolve(Price(950, Department)).UnitPrice);
    }

    [Fact]
    public void OtherDepartmentsCompaniesServicesAndUnavailableWindowsCannotAffectPrice()
    {
        var inactive = Price(100); inactive.Update(100, Now.AddDays(-1), null, false);
        var expired = Price(200); expired.Update(200, Now.AddDays(-1), Now, true);
        var future = Price(300); future.Update(300, Now.AddHours(1), null, true);
        var otherCompany = new LabServiceNegotiatedPrice(Guid.NewGuid(), null, Catalog, 1, Now.AddDays(-1), null, true);
        var otherService = new LabServiceNegotiatedPrice(Organization, null, Guid.NewGuid(), 1, Now.AddDays(-1), null, true);
        Assert.Equal(1000, Resolve(inactive, expired, future, Price(1, Guid.NewGuid()), otherCompany, otherService).UnitPrice);
        Assert.Throws<InvalidOperationException>(() => Resolve(Price(900), Price(800)));
    }

    [Fact]
    public void SampleLimitIsExplicitAndInclusive()
    {
        Assert.NotNull(CustomerStandardOrderRules.SampleLimitBlocker(1, null));
        Assert.Null(CustomerStandardOrderRules.SampleLimitBlocker(50, 50));
        Assert.Contains("contact your sales representative", CustomerStandardOrderRules.SampleLimitBlocker(51, 50));
        var catalog = new QboCatalogItem("PSEQ-ORDER", "PSeq", "", "specimen", 1000, "USD", true, Now, CatalogServiceFamily.PSeqLabService);
        Assert.Null(catalog.MaximumCustomerSamples);
        Assert.Throws<ArgumentException>(() => catalog.SetMaximumCustomerSamples(0));
        catalog.SetMaximumCustomerSamples(50); Assert.Equal(50, catalog.MaximumCustomerSamples);
    }

    [Fact]
    public void IncompleteCustomerDraftCanBeSavedButReviewRequiresCompleteScope()
    {
        var draft = new CustomerStandardOrderDraft("Study", null, null, [new("", 0)], null, "", "Notes");
        var order = LabServiceOrder.CreateCustomerDraft(Organization, Department, "CUST-1", draft, "Instructions");
        Assert.Equal(LabServiceOrderStatus.DraftRequest, order.Status);
        Assert.Equal(draft.JobName, order.ReadCustomerDraft()!.JobName);
        Assert.Null(order.AcceptedQuoteId); Assert.Empty(order.Phases); Assert.Empty(order.Quotes);
        Assert.Throws<ArgumentException>(() => order.PrepareCustomerReview(Guid.NewGuid(), "extracted_rna", "Frozen"));
        draft = draft with { OfferingId = Guid.NewGuid(), SampleTypeDefinitionId = Guid.NewGuid(), Sources = [new("Human PBMC", 3)], SafetyDeclaration = "No known hazards" };
        order.SaveCustomerDraft(draft); order.PrepareCustomerReview(draft.SampleTypeDefinitionId!.Value, "extracted_rna", "Frozen");
        Assert.Equal(3, order.RequestedSequencingRunCount); Assert.Equal("Frozen", order.StorageRequirements);
        Assert.Equal(3, Assert.Single(order.Phases).SampleCount);
        Assert.Single(order.SourceGroups); Assert.Null(order.PlacedAt); Assert.Empty(order.Quotes);
    }

    [Theory]
    [InlineData("usesPhases", "true")]
    [InlineData("sequencingRunCount", "10")]
    [InlineData("proposedUnitPrice", "1")]
    public void CustomerDraftContractRejectsPhaseRunAndPriceOverrides(string property, string value)
    {
        var json = "{\"jobName\":\"Study\",\"sources\":[],\"" + property + "\":" + value + "}";
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<CustomerStandardOrderDraft>(json, CommercialDraftRules.Json));
    }

    [Fact]
    public void SelectedPriceEvidenceRemainsImmutableWhenRateChanges()
    {
        var rate = Price(900); var frozen = Resolve(rate);
        rate.Update(800, Now.AddDays(-1), null, true); rate.IncrementVersion();
        Assert.Equal(900, frozen.UnitPrice); Assert.Equal(1, frozen.NegotiatedPriceVersion);
        Assert.Equal(800, Resolve(rate).UnitPrice); Assert.Equal(2, Resolve(rate).NegotiatedPriceVersion);
    }
}
