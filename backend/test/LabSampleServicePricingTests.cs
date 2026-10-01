namespace PhaenoPortal.Test;

using System.Text.Json;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class LabSampleServicePricingTests
{
    private static readonly Guid Item = Guid.NewGuid();

    [Fact]
    public void SingleScopePricesEachSampleOnceAndOnlyRemainingRunsSeparately()
    {
        QuoteLineRequest[] lines = [new(Item, "Standard service", 3, 100, PricingComponent: LabPhasePricing.StandardSample),
            new(Item, "Additional runs", 6, 20, PricingComponent: LabPhasePricing.AdditionalRun)];
        LabPhasePricing.ValidateSingle(lines, 3, 9);
        Assert.Equal(420, lines.Sum(line => line.Quantity * line.UnitPrice));
        Assert.Throws<OrderManagementException>(() => LabPhasePricing.ValidateSingle([lines[0] with { Quantity = 9 }], 3, 9));
        Assert.Throws<OrderManagementException>(() => LabPhasePricing.ValidateSingle([lines[0], lines[1] with { Quantity = 9 }], 3, 9));
        Assert.Throws<OrderManagementException>(() => LabPhasePricing.ValidateSingle([lines[0], lines[1]], 3, 3));
        LabPhasePricing.ValidateSingle([lines[0]], 3, 3);
    }

    [Fact]
    public void PhaseQuoteRetainsBothPricesAndTheirCorrectQuantities()
    {
        var order = new LabServiceOrder(Guid.NewGuid(), Guid.NewGuid(), "PRICING-1", "Study", null, 3,
            false, "Human PBMC", "Frozen", "No known hazards", "Instructions");
        var phase = Assert.Single(order.Phases);
        phase.SetScope(new([new("Human PBMC", 3)], 3, 9));
        phase.SetPriceProposal(100, "Discussed with Customer", Guid.NewGuid(), DateTime.UtcNow, 20);
        QuoteLineRequest[] lines = [new(Item, "Standard service", 3, 100, phase.Id, 14, LabPhasePricing.StandardSample),
            new(Item, "Additional runs", 6, 20, phase.Id, PricingComponent: LabPhasePricing.AdditionalRun)];
        var request = new IssueQuoteRequest(order.Version, lines, 0, "USD", null);
        LabPhasePricing.Validate(order, request, lines);
        var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial, JsonSerializer.Serialize(lines, CommercialDraftRules.Json),
            420, 0, "USD", DateTime.UtcNow, DateTime.UtcNow.AddDays(30));
        quote.SetDeliveryTarget(14);
        LabPhasePlans.FreezeQuote(order, quote);
        Assert.Equal(420, phase.AcceptedSubtotal);
        using var snapshot = JsonDocument.Parse(phase.PriceLinesJson);
        Assert.Collection(snapshot.RootElement.GetProperty("sourceLines").EnumerateArray(),
            standard => { Assert.Equal(3, standard.GetProperty("quantity").GetDecimal()); Assert.Equal(LabPhasePricing.StandardSample, standard.GetProperty("pricingComponent").GetString()); },
            additional => { Assert.Equal(6, additional.GetProperty("quantity").GetDecimal()); Assert.Equal(20, additional.GetProperty("unitPrice").GetDecimal()); });
        var changed = new[] { lines[0], lines[1] with { UnitPrice = 25 } };
        Assert.Throws<OrderManagementException>(() => LabPhasePricing.Validate(order, request with { Lines = changed }, changed));
        LabPhasePricing.Validate(order, request with { Lines = changed, PricingDecisionReason = "Extra-run rate reviewed" }, changed);
    }

    [Fact]
    public void IncompleteAdditionalRunProposalCanSaveButCannotSubmit()
    {
        var draft = new CommercialLabOrderDraft("Study", Guid.NewGuid(), null, "No known hazards", null, false,
            [new("Phase 1", [new("Human PBMC", 3)], 3, null, 100, null, true)]);
        CommercialDraftRules.Validate(draft, false);
        Assert.Throws<ArgumentException>(() => CommercialDraftRules.Validate(draft, true));
        CommercialDraftRules.Validate(draft with { Phases = [draft.Phases[0] with { ProposedAdditionalRunPrice = 20 }] }, true);
    }
}
