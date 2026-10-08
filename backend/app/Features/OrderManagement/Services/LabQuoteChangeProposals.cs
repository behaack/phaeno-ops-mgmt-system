namespace PhaenoPortal.App.Features.OrderManagement.Services;

using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class LabQuoteChangeProposals
{
    public static OrderStatusEvent? PendingEvent(LabServiceOrder order, IEnumerable<OrderStatusEvent> events)
    {
        if (order.PlacedAt.HasValue || order.AcceptedQuoteId.HasValue || order.IsTerminal()) return null;
        return events.Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id
                && item.ChildRecordId == order.CurrentQuoteId && item.ChildRecordId.HasValue
                && item.FromStatus == nameof(LabServiceOrderStatus.QuoteIssued)
                && item.ToStatus == nameof(LabServiceOrderStatus.QuoteInPreparation))
            .OrderByDescending(item => item.OccurredAt).FirstOrDefault();
    }

    public static QuoteChangeProposalDto? Pending(LabServiceOrder order, IEnumerable<OrderStatusEvent> events)
    {
        var proposal = PendingEvent(order, events);
        var quote = order.Quotes.SingleOrDefault(item => item.Id == proposal?.ChildRecordId);
        return proposal is null || quote is null ? null
            : new(quote.Id, quote.Revision, proposal.TenantSafeReason!, proposal.OccurredAt);
    }
}
