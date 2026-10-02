namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task QuoteProposalIsAuditedDuplicateSafeAndPreservesOfferUntilReissue()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        var original = await scope.QuoteExtensionSnapshotAsync(fixture.QuoteId);
        var key = Guid.NewGuid().ToString("N");
        var body = new ReasonRequest(fixture.OrderVersion, "Please review the price and TAT.");
        var proposed = await scope.ExtensionCustomerController(key).ProposeQuoteChanges(fixture.OrderId, fixture.QuoteId, body, default);
        Assert.Equal("QuoteInPreparation", proposed.Status);
        Assert.False(proposed.CanAcceptQuote);
        Assert.False(proposed.CanProposeQuoteChanges);
        Assert.Null(proposed.PlacedAt);
        Assert.Equal(body.Reason, proposed.QuoteChangeProposal!.Reason);
        Assert.Equal(fixture.QuoteId, proposed.QuoteChangeProposal.QuoteId);
        Assert.Equal(original, await scope.QuoteExtensionSnapshotAsync(fixture.QuoteId));
        var staff = await scope.ExtensionPlatformController().Get(fixture.OrderId, default);
        Assert.Equal(proposed.QuoteChangeProposal, staff.QuoteChangeProposal);
        await scope.ExtensionCustomerController(key).ProposeQuoteChanges(fixture.OrderId, fixture.QuoteId, body, default);
        await scope.ExtensionCustomerController().ProposeQuoteChanges(fixture.OrderId, fixture.QuoteId, body, default);
        Assert.Single(await scope.DbContext.OrderStatusEvents.Where(item => item.WorkflowId == fixture.OrderId
            && item.ChildRecordId == fixture.QuoteId && item.ToStatus == "QuoteInPreparation").ToListAsync());
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.AcceptQuoteAsync(fixture with { OrderVersion = proposed.Version }));
        var item = await scope.DbContext.QboCatalogItems.AsNoTracking().FirstAsync(value => value.IsActive && value.ExternalItemId == OrderServiceKeys.PSeqLabService);
        var issued = await scope.ExtensionPlatformController().IssueQuote(fixture.OrderId, new IssueQuoteRequest(proposed.Version,
            [new QuoteLineRequest(item.Id, item.Name, 1, 100, PricingComponent: LabPhasePricing.StandardSample)], 0, "USD", DateTime.UtcNow.AddDays(45),
            SourceQuoteId: fixture.QuoteId, DeliveryTargetBusinessDays: 14), default);
        Assert.Null(issued.QuoteChangeProposal);
        Assert.Equal("Superseded", issued.Quotes.Single(quote => quote.Id == fixture.QuoteId).Status);
        Assert.True((await scope.ExtensionCustomerController().Get(fixture.OrderId, default)).CanAcceptQuote);
    }

    [PostgreSqlReferenceFact]
    public async Task InitialQuoteDeclineIsAvailableWithFrozenPhasesAndKeepsHistory()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        var order = await scope.DbContext.LabServiceOrders.Include(item => item.Phases).SingleAsync(item => item.Id == fixture.OrderId);
        var phase = Assert.Single(order.Phases);
        phase.SetScope(new([new("PBMC", 1)], 1, 1));
        await scope.DbContext.SaveChangesAsync();
        var before = await scope.ExtensionCustomerController().Get(fixture.OrderId, default);
        Assert.True(before.CanDeclineQuote);
        Assert.True(before.CanProposeQuoteChanges);
        var declined = await scope.ExtensionCustomerController().DeclineInitialQuote(fixture.OrderId, fixture.QuoteId,
            new(before.Version, "Cost is too high"), default);
        Assert.Equal("Cancelled", declined.Status);
        Assert.Equal("Declined", Assert.Single(declined.Quotes).Status);
        Assert.Single(declined.PhaseScopes!);
        Assert.False(declined.CanAcceptQuote);
        Assert.False(declined.CanDeclineQuote);
        Assert.Null(declined.PlacedAt);
        Assert.Contains(declined.Timeline, item => item.ChildRecordId == fixture.QuoteId && item.Reason == "Cost is too high");
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteDecisionsRejectStaleWrongQuoteAndMemberCommands()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateQuotedOrderAsync();
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.ExtensionCustomerController().ProposeQuoteChanges(fixture.OrderId,
            fixture.QuoteId, new(fixture.OrderVersion - 1, "Review price"), default));
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().DeclineInitialQuote(fixture.OrderId,
            Guid.NewGuid(), new(fixture.OrderVersion, "Cost"), default));
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(value => value.UserId == scope.CustomerUser.Id
            && value.OrganizationId == scope.CustomerOrganization.Id);
        membership.SetOrganizationAdmin(false);
        var department = scope.CustomerOrganization.Departments.Single(value => value.IsDefault);
        scope.DbContext.Add(new OrganizationDepartmentMembership(membership.Id, department.Id, false));
        await scope.DbContext.SaveChangesAsync();
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().ProposeQuoteChanges(
            fixture.OrderId, fixture.QuoteId, new(fixture.OrderVersion, "Review price"), default))).StatusCode);
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().DeclineInitialQuote(
            fixture.OrderId, fixture.QuoteId, new(fixture.OrderVersion, "Cost"), default))).StatusCode);
        Assert.False((await scope.ExtensionCustomerController().Get(fixture.OrderId, default)).CanProposeQuoteChanges);
    }
}
