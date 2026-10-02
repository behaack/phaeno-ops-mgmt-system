namespace PhaenoPortal.Test;

using System.Text.Json;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class LabQuoteDecisionDomainTests
{
    private static (LabServiceOrder Order, LabServiceQuote Quote) Issued()
    {
        var now = DateTime.UtcNow;
        var order = new LabServiceOrder(Guid.NewGuid(), Guid.NewGuid(), "QUOTE-DECISION", "Study", null,
            2, false, "PBMC", "Frozen", "No known hazards", "Instructions");
        order.SourceGroups.Add(new(order.Id, "PBMC", 2));
        order.Phases.Clear();
        foreach (var position in new[] { 1, 2 })
        {
            var phase = new LabJobPhase(order.Id, position, $"Phase {position}", 1, 14, 100);
            phase.SetScope(new([new("PBMC", 1)], 1, 1));
            order.Phases.Add(phase);
        }
        order.Submit(Guid.NewGuid(), now);
        order.BeginQuotePreparation();
        var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial, "[]", 200, 0, "USD", now, now.AddDays(30));
        quote.MarkIssued(); order.Quotes.Add(quote); order.MarkQuoteIssued(quote.Id);
        return (order, quote);
    }

    [Fact]
    public void ProposalKeepsPhasesAndOriginalQuoteIntactAndPausesAcceptance()
    {
        var (order, quote) = Issued();
        var original = JsonSerializer.Serialize(quote);
        var phases = JsonSerializer.Serialize(order.Phases);
        order.ProposeQuoteChanges(quote.Id, "  Please shorten Phase 2 turnaround.  ");
        Assert.Equal(LabServiceOrderStatus.QuoteInPreparation, order.Status);
        Assert.Equal("Please shorten Phase 2 turnaround.", order.TenantSafeReason);
        Assert.False(order.CanRespondToInitialQuote);
        Assert.False(order.IsTerminal());
        Assert.Null(order.PlacedAt);
        Assert.Equal(original, JsonSerializer.Serialize(quote));
        Assert.Equal(phases, JsonSerializer.Serialize(order.Phases));
        Assert.Throws<InvalidOperationException>(() => order.AcceptQuote(quote.Id, DateTime.UtcNow));
    }

    [Theory]
    [InlineData("")]
    [InlineData("  \n  ")]
    public void BlankProposalCannotChangeOrder(string reason)
    {
        var (order, quote) = Issued();
        Assert.Throws<ArgumentException>(() => order.ProposeQuoteChanges(quote.Id, reason));
        Assert.Equal(LabServiceOrderStatus.QuoteIssued, order.Status);
        Assert.True(order.CanRespondToInitialQuote);
    }

    [Fact]
    public void DeclineClosesWholePhasedRequestButPreservesTermsAndScope()
    {
        var (order, quote) = Issued();
        var phases = JsonSerializer.Serialize(order.Phases);
        Assert.True(order.CanRespondToInitialQuote);
        order.DeclineInitialQuote(quote.Id, "Cost is too high");
        Assert.Equal(LabServiceOrderStatus.Cancelled, order.Status);
        Assert.Equal(QuoteStatus.Declined, quote.Status);
        Assert.Equal(200, quote.Total);
        Assert.Equal(phases, JsonSerializer.Serialize(order.Phases));
        Assert.Null(order.PlacedAt);
        Assert.Null(order.AcceptedQuoteId);
        Assert.False(order.CanRespondToInitialQuote);
    }

    [Fact]
    public void WrongOrAcceptedQuoteCannotBeProposedOrDeclined()
    {
        var (order, quote) = Issued();
        Assert.Throws<InvalidOperationException>(() => order.ProposeQuoteChanges(Guid.NewGuid(), "Review price"));
        Assert.Throws<InvalidOperationException>(() => order.DeclineInitialQuote(Guid.NewGuid(), "Cost"));
        quote.Accept(Guid.NewGuid(), DateTime.UtcNow);
        order.AcceptQuote(quote.Id, DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => order.ProposeQuoteChanges(quote.Id, "Review price"));
        Assert.Throws<InvalidOperationException>(() => order.DeclineInitialQuote(quote.Id, "Cost"));
        Assert.Equal(QuoteStatus.Accepted, quote.Status);
    }

    [Fact]
    public void ProposalProjectionFollowsExactQuoteAndEndsWhenRevisionChanges()
    {
        var (order, quote) = Issued();
        var actor = Guid.NewGuid();
        var proposal = new OrderStatusEvent(order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, quote.Id,
            "QuoteIssued", "QuoteInPreparation", "Review Phase 2 price", null, actor, DateTime.UtcNow);
        order.ProposeQuoteChanges(quote.Id, proposal.TenantSafeReason!);
        var projected = LabQuoteChangeProposals.Pending(order, [proposal]);
        Assert.Equal(quote.Id, projected!.QuoteId);
        Assert.Equal(1, projected.QuoteRevision);
        Assert.Equal(proposal.TenantSafeReason, projected.Reason);
        order.MarkQuoteIssued(Guid.NewGuid());
        Assert.Null(LabQuoteChangeProposals.Pending(order, [proposal]));
        Assert.Equal(quote.Id, proposal.ChildRecordId);
    }
}
