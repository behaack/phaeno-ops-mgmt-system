namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class LabServiceOrdersController
{
    [HttpPost("{orderId:guid}/quotes/{quoteId:guid}/propose-changes")]
    public Task<LabServiceOrderDto> ProposeQuoteChanges(Guid orderId, Guid quoteId,
        [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => DecideInitialQuoteAsync(orderId, quoteId, request, false, cancellationToken);

    [HttpPost("{orderId:guid}/quotes/{quoteId:guid}/decline")]
    public Task<LabServiceOrderDto> DeclineInitialQuote(Guid orderId, Guid quoteId,
        [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => DecideInitialQuoteAsync(orderId, quoteId, request, true, cancellationToken);

    private async Task<LabServiceOrderDto> DecideInitialQuoteAsync(Guid orderId, Guid quoteId,
        ReasonRequest request, bool decline, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        await ReadOrderAsync(orderId, tenant, cancellationToken);
        string reason = null!;
        Execute(() => reason = OrderText.Required(request.Reason, decline ? "Reason" : "Proposed changes", 2000));
        var execution = await idempotency.ExecuteAsync(tenant.Actor.Id,
            $"lab-order:{orderId}:quote:{quoteId}:{(decline ? "decline" : "propose-changes")}", key, request,
            async token =>
            {
                var order = await ReadLockedRosterAsync(orderId, tenant, token);
                var quote = order.Quotes.SingleOrDefault(item => item.Id == quoteId) ?? throw Missing();
                if (!decline)
                {
                    var events = await dbContext.OrderStatusEvents.AsNoTracking()
                        .Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == orderId)
                        .ToListAsync(token);
                    var pending = LabQuoteChangeProposals.PendingEvent(order, events);
                    if (pending?.ChildRecordId == quoteId && pending.TenantSafeReason == reason)
                        return await MapAsync(order, true, false, token);
                }
                EnsureVersion(order.Version, request.Version);
                var before = order.Status.ToString();
                Execute(() =>
                {
                    if (decline) order.DeclineInitialQuote(quote.Id, reason);
                    else order.ProposeQuoteChanges(quote.Id, reason);
                });
                dbContext.OrderStatusEvents.Add(new OrderStatusEvent(order.OrganizationId,
                    OrderWorkflowTypes.LabService, order.Id, quote.Id, before, order.Status.ToString(),
                    reason, null, tenant.Actor.Id, DateTime.UtcNow));
                await dbContext.SaveChangesAsync(token);
                return await MapAsync(order, true, false, token);
            }, cancellationToken: cancellationToken, concurrencyScope: $"lab-order:{orderId}");
        return execution.Response;
    }
}
