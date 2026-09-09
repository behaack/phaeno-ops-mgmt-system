namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class LabOperationsCommercialHandoffPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task QuoteExtensionExpiresOnReadWithoutChangingStoredQuoteAndBlocksAcceptance()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateExpiredQuoteForExtensionAsync();
        var before = await scope.QuoteExtensionSnapshotAsync(fixture.QuoteId);

        var response = await scope.ExtensionCustomerController().Get(fixture.OrderId, default);

        Assert.Equal("Expired", Assert.Single(response.Quotes).Status);
        Assert.True(response.CanManageQuotes);
        Assert.True(response.CanRequestQuoteExtension);
        Assert.False(response.CanAcceptQuote);
        Assert.Contains("expired", response.QuoteAcceptanceBlockedReason!, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(before, await scope.QuoteExtensionSnapshotAsync(fixture.QuoteId));
        var failure = await Assert.ThrowsAsync<OrderManagementException>(() => scope.AcceptQuoteAsync(fixture));
        Assert.Equal("quote_expired", failure.ErrorCode);
        Assert.Equal(before, await scope.QuoteExtensionSnapshotAsync(fixture.QuoteId));
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteExtensionRequestIsDurableDuplicateSafeAndDoesNotAlterOriginalTerms()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateExpiredQuoteForExtensionAsync();
        var before = await scope.QuoteExtensionSnapshotAsync(fixture.QuoteId);
        var key = Guid.NewGuid().ToString("N");
        var body = new QuoteExtensionRequestBody(fixture.OrderVersion, "Waiting for the purchase order.");
        var first = await scope.ExtensionCustomerController(key).RequestQuoteExtension(fixture.OrderId, fixture.QuoteId, body, default);
        var pending = Assert.Single(first.Quotes).ExtensionRequest;
        Assert.NotNull(pending);
        Assert.Equal("Pending", pending.Status);
        Assert.Equal(body.Reason, pending.Reason);
        Assert.False(first.CanRequestQuoteExtension);
        Assert.False(first.CanAcceptQuote);
        var eventCount = await scope.DbContext.OrderStatusEvents.CountAsync(value => value.WorkflowId == fixture.OrderId);

        var retry = await scope.ExtensionCustomerController(key).RequestQuoteExtension(fixture.OrderId, fixture.QuoteId, body, default);
        var secondTab = await scope.ExtensionCustomerController().RequestQuoteExtension(fixture.OrderId, fixture.QuoteId, body, default);

        Assert.Equal(pending.Id, Assert.Single(retry.Quotes).ExtensionRequest!.Id);
        Assert.Equal(pending.Id, Assert.Single(secondTab.Quotes).ExtensionRequest!.Id);
        Assert.Equal(1, await scope.DbContext.LabServiceQuoteExtensionRequests.CountAsync(value => value.QuoteId == fixture.QuoteId));
        Assert.Equal(eventCount, await scope.DbContext.OrderStatusEvents.CountAsync(value => value.WorkflowId == fixture.OrderId));
        Assert.Equal(before, await scope.QuoteExtensionSnapshotAsync(fixture.QuoteId));
        Assert.Empty(await scope.DbContext.OrderNotifications.Where(value => value.OrganizationId == scope.CustomerOrganization.Id).ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteExtensionReissueResolvesRequestAndPreservesOriginalRevision()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateExpiredQuoteForExtensionAsync();
        var oldQuote = await scope.DbContext.LabServiceQuotes.AsNoTracking().SingleAsync(value => value.Id == fixture.QuoteId);
        var requested = await scope.ExtensionCustomerController().RequestQuoteExtension(fixture.OrderId, fixture.QuoteId,
            new QuoteExtensionRequestBody(fixture.OrderVersion, "Approval is taking longer than expected."), default);
        var staff = scope.ExtensionPlatformController();
        var review = await staff.Get(fixture.OrderId, default);
        Assert.Equal("Pending", review.Quotes.Single(value => value.Id == fixture.QuoteId).ExtensionRequest!.Status);
        var queue = await staff.List(scope.CustomerOrganization.Id, null, null, null, quoteExtensionRequested: true);
        Assert.True(Assert.Single(queue.Items).HasPendingQuoteExtension);

        var item = await scope.DbContext.QboCatalogItems.AsNoTracking().FirstAsync(value => value.IsActive && value.ExternalItemId == OrderServiceKeys.PSeqLabService);
        var expiry = DateTime.UtcNow.AddDays(45);
        var issued = await scope.ExtensionPlatformController().IssueQuote(fixture.OrderId,
            new IssueQuoteRequest(requested.Version, [new QuoteLineRequest(item.Id, item.Name, 1, 100)], 0, "USD", expiry,
                SourceQuoteId: fixture.QuoteId), default);

        Assert.Equal(2, issued.Quotes.Count);
        var original = issued.Quotes.Single(value => value.Id == fixture.QuoteId);
        var replacement = issued.Quotes.Single(value => value.Revision == 2);
        Assert.Equal("Superseded", original.Status);
        Assert.Equal(oldQuote.ExpiresAt, original.ExpiresAt);
        Assert.Equal(oldQuote.LinesJson, original.LinesJson);
        Assert.Equal(oldQuote.Total, original.Total);
        Assert.Equal(oldQuote.PaymentTermsDaysSnapshot, original.PaymentTermsDaysSnapshot);
        Assert.Equal("Issued", replacement.Status);
        Assert.Equal(expiry, replacement.ExpiresAt);
        Assert.Equal("Resolved", original.ExtensionRequest!.Status);
        Assert.Equal(replacement.Id, original.ExtensionRequest.ReplacementQuoteId);
        Assert.NotNull(original.ExtensionRequest.ResolvedAt);
        Assert.Empty((await scope.ExtensionPlatformController().List(scope.CustomerOrganization.Id, null, null, null, quoteExtensionRequested: true)).Items);
        var customer = await scope.ExtensionCustomerController().Get(fixture.OrderId, default);
        Assert.True(customer.CanAcceptQuote);
        Assert.False(customer.CanRequestQuoteExtension);
        Assert.Single(await scope.DbContext.OrderNotifications.Where(value => value.OrganizationId == scope.CustomerOrganization.Id).ToListAsync());
        var staleSource = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionPlatformController().IssueQuote(fixture.OrderId,
            new IssueQuoteRequest(issued.Version, [new QuoteLineRequest(item.Id, item.Name, 1, 100)], 0, "USD", expiry.AddDays(1),
                SourceQuoteId: fixture.QuoteId), default));
        Assert.Equal("quote_not_current", staleSource.ErrorCode);
        Assert.Equal(2, await scope.DbContext.LabServiceQuotes.CountAsync(value => value.LabServiceOrderId == fixture.OrderId));
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteExtensionRequiresActiveScopedAdministratorAndAllowsDepartmentAdministrator()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateExpiredQuoteForExtensionAsync();
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(value => value.UserId == scope.CustomerUser.Id && value.OrganizationId == scope.CustomerOrganization.Id);
        membership.SetOrganizationAdmin(false);
        var department = scope.CustomerOrganization.Departments.Single(value => value.IsDefault);
        var access = new OrganizationDepartmentMembership(membership.Id, department.Id, false);
        scope.DbContext.Add(access);
        await scope.DbContext.SaveChangesAsync();
        var member = await scope.ExtensionCustomerController().Get(fixture.OrderId, default);
        Assert.False(member.CanManageQuotes);
        Assert.False(member.CanRequestQuoteExtension);
        var denied = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().RequestQuoteExtension(fixture.OrderId, fixture.QuoteId, new(fixture.OrderVersion), default));
        Assert.Equal(403, denied.StatusCode);

        scope.DbContext.ChangeTracker.Clear();
        access = await scope.DbContext.OrganizationDepartmentMemberships.SingleAsync(value => value.Id == access.Id);
        access.SetDepartmentAdmin(true);
        await scope.DbContext.SaveChangesAsync();
        var allowed = await scope.ExtensionCustomerController().RequestQuoteExtension(fixture.OrderId, fixture.QuoteId, new(fixture.OrderVersion), default);
        Assert.Equal("Pending", Assert.Single(allowed.Quotes).ExtensionRequest!.Status);

        scope.DbContext.ChangeTracker.Clear();
        membership = await scope.DbContext.OrganizationMemberships.SingleAsync(value => value.Id == membership.Id);
        membership.Deactivate();
        await scope.DbContext.SaveChangesAsync();
        var revoked = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().RequestQuoteExtension(fixture.OrderId, fixture.QuoteId, new(fixture.OrderVersion), default));
        Assert.Equal(404, revoked.StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteExtensionRejectsCurrentUnexpiredWrongQuoteWrongTenantAndStaleCommands()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var unexpired = await scope.CreateQuotedOrderAsync();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().RequestQuoteExtension(unexpired.OrderId, unexpired.QuoteId, new(unexpired.OrderVersion), default));
        var expired = await scope.CreateExpiredQuoteForExtensionAsync();
        var wrongQuote = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().RequestQuoteExtension(expired.OrderId, unexpired.QuoteId, new(expired.OrderVersion), default));
        Assert.Equal(404, wrongQuote.StatusCode);
        var otherDepartment = new OrganizationDepartment(scope.CustomerOrganization.Id, "EXTENSION-REVIEW", "Other department");
        scope.DbContext.Add(otherDepartment);
        await scope.DbContext.SaveChangesAsync();
        var wrongDepartment = scope.ExtensionCustomerController();
        wrongDepartment.HttpContext.Request.Headers["X-Department-Id"] = otherDepartment.Id.ToString();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => wrongDepartment.RequestQuoteExtension(expired.OrderId, expired.QuoteId, new(expired.OrderVersion), default))).StatusCode);
        var foreign = scope.ExtensionCustomerController();
        foreign.HttpContext.Request.Headers["X-Organization-Id"] = await scope.DbContext.OrganizationMemberships.Where(value => value.UserId == scope.PlatformUser.Id).Select(value => value.OrganizationId.ToString()).SingleAsync();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => foreign.RequestQuoteExtension(expired.OrderId, expired.QuoteId, new(expired.OrderVersion), default))).StatusCode);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.ExtensionCustomerController().RequestQuoteExtension(expired.OrderId, expired.QuoteId, new(expired.OrderVersion - 1), default));
        Assert.False(await scope.DbContext.LabServiceQuoteExtensionRequests.AnyAsync(value => value.LabServiceOrderId == expired.OrderId));
    }

    [PostgreSqlReferenceFact]
    public async Task QuoteExtensionNeverExpiresAcceptedQuoteAndRejectsPastDatedReissue()
    {
        await using var scope = await HandoffTestScope.CreateAsync();
        var fixture = await scope.CreateExpiredQuoteForExtensionAsync();
        var item = await scope.DbContext.QboCatalogItems.AsNoTracking().FirstAsync(value => value.IsActive && value.ExternalItemId == OrderServiceKeys.PSeqLabService);
        var expiredDate = DateTime.UtcNow.AddDays(-1);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionPlatformController().IssueQuote(fixture.OrderId,
            new IssueQuoteRequest(fixture.OrderVersion, [new QuoteLineRequest(item.Id, item.Name, 1, 100)], 0, "USD", expiredDate, SourceQuoteId: fixture.QuoteId), default));
        Assert.Equal(1, await scope.DbContext.LabServiceQuotes.CountAsync(value => value.LabServiceOrderId == fixture.OrderId));

        scope.DbContext.ChangeTracker.Clear();
        var quote = await scope.DbContext.LabServiceQuotes.SingleAsync(value => value.Id == fixture.QuoteId);
        scope.DbContext.Entry(quote).Property(value => value.Status).CurrentValue = QuoteStatus.Accepted;
        scope.DbContext.Entry(quote).Property(value => value.AcceptedAt).CurrentValue = expiredDate.AddDays(-1);
        var order = await scope.DbContext.LabServiceOrders.SingleAsync(value => value.Id == fixture.OrderId);
        scope.DbContext.Entry(order).Property(value => value.Status).CurrentValue = LabServiceOrderStatus.PlacedAwaitingSamples;
        await scope.DbContext.SaveChangesAsync();
        var accepted = await scope.ExtensionCustomerController().Get(fixture.OrderId, default);
        Assert.Equal("Accepted", Assert.Single(accepted.Quotes).Status);
        Assert.False(accepted.CanRequestQuoteExtension);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.ExtensionCustomerController().RequestQuoteExtension(fixture.OrderId, fixture.QuoteId, new(accepted.Version), default));
    }

    private sealed partial class HandoffTestScope
    {
        public LabServiceOrdersController ExtensionCustomerController(string? key = null)
        {
            DbContext.ChangeTracker.Clear();
            return CreateCustomerController(new InternalLabOperationsProvider(DbContext), key ?? Guid.NewGuid().ToString("N"));
        }

        public PlatformLabServiceOrdersController ExtensionPlatformController()
        {
            DbContext.ChangeTracker.Clear();
            return CreatePlatformController(new InternalLabOperationsProvider(DbContext), Guid.NewGuid().ToString("N"));
        }

        public async Task<QuotedOrderFixture> CreateExpiredQuoteForExtensionAsync()
        {
            var fixture = await CreateQuotedOrderAsync($"extension-{Guid.NewGuid():N}");
            var quote = await DbContext.LabServiceQuotes.SingleAsync(value => value.Id == fixture.QuoteId);
            DbContext.Entry(quote).Property(value => value.IssuedAt).CurrentValue = DateTime.UtcNow.AddDays(-31);
            DbContext.Entry(quote).Property(value => value.ExpiresAt).CurrentValue = DateTime.UtcNow.AddDays(-1);
            await DbContext.SaveChangesAsync();
            return fixture;
        }

        public async Task<string> QuoteExtensionSnapshotAsync(Guid quoteId)
        {
            var quote = await DbContext.LabServiceQuotes.AsNoTracking().SingleAsync(value => value.Id == quoteId);
            return JsonSerializer.Serialize(new { quote.Id, quote.Status, quote.Revision, quote.LinesJson,
                quote.Subtotal, quote.Tax, quote.Total, quote.Currency, quote.IssuedAt, quote.ExpiresAt,
                quote.PaymentTermsDaysSnapshot, quote.Version });
        }
    }
}
