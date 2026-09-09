namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class LabServiceOrdersController
{
    [HttpPost("{orderId:guid}/quotes/{quoteId:guid}/extension-request")]
    public async Task<LabServiceOrderDto> RequestQuoteExtension(Guid orderId, Guid quoteId,
        [FromBody] QuoteExtensionRequestBody request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var order = await ReadOrderAsync(orderId, tenant, cancellationToken);
        if (request.Reason?.Trim().Length > 2000)
            throw Invalid("extension_reason_too_long", "The extension request reason must be 2,000 characters or fewer.");
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id,
            $"lab-order:{orderId}:quote:{quoteId}:extension-request", key, request,
            async token =>
            {
                await dbContext.Entry(order).ReloadAsync(token);
                foreach (var item in order.Quotes) await dbContext.Entry(item).ReloadAsync(token);
                await dbContext.LabServiceQuotes.Where(item => item.LabServiceOrderId == orderId).LoadAsync(token);
                if (order.IsDiscarded || order.OrganizationId != tenant.Organization.Id || order.DepartmentId != tenant.Department.Id)
                    throw Missing();
                var quote = order.Quotes.SingleOrDefault(item => item.Id == quoteId) ?? throw Missing();
                var existing = await dbContext.LabServiceQuoteExtensionRequests.AsNoTracking()
                    .SingleOrDefaultAsync(item => item.QuoteId == quoteId && item.LabServiceOrderId == orderId, token);
                if (existing is not null) return await MapAsync(order, true, false, token);
                EnsureVersion(order.Version, request.Version);
                if (order.Status != LabServiceOrderStatus.QuoteIssued || order.CurrentQuoteId != quoteId
                    || quote.EffectiveStatus(DateTime.UtcNow) != QuoteStatus.Expired || quote.AcceptedAt is not null)
                    throw Conflict("quote_extension_not_allowed", "An extension can be requested only for the current expired quote.");
                dbContext.LabServiceQuoteExtensionRequests.Add(new LabServiceQuoteExtensionRequest(
                    order.Id, quote.Id, tenant.Actor.Id, request.Reason, DateTime.UtcNow));
                order.MarkUpdated(DateTime.UtcNow, tenant.Actor.Id);
                dbContext.OrderStatusEvents.Add(NewEvent(order, order.Status.ToString(), order.Status.ToString(),
                    tenant.Actor.Id, $"An extension was requested for quote revision {quote.Revision}."));
                await dbContext.SaveChangesAsync(token);
                return await MapAsync(order, true, false, token);
            }, cancellationToken: cancellationToken, concurrencyScope: $"lab-order:{orderId}");
        return execution.Response;
    }
}
