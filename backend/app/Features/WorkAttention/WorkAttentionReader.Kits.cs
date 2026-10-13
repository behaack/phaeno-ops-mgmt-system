namespace PhaenoPortal.App.Features.WorkAttention;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class WorkAttentionReader
{
    private void AddKitWork(List<IQueryable<WorkItem>> queries)
    {
        // Commercial Kit endpoints currently require platform administration.
        // A Commercial business role alone must not advertise unavailable actions.
        if (session.IsPlatformAdmin && Caps.CanManageOrderConfiguration)
            queries.Add(db.PartnerReagentOrders.AsNoTracking().Where(order => !order.IsDiscarded
                && (order.Status == ReagentOrderStatus.UnderReview || order.Status == ReagentOrderStatus.CancellationRequested
                    || order.Status == ReagentOrderStatus.OnHold && (order.ResumeStatus == null
                        || order.ResumeStatus == ReagentOrderStatus.Draft || order.ResumeStatus == ReagentOrderStatus.Placed
                        || order.ResumeStatus == ReagentOrderStatus.UnderReview)))
                .Select(order => new WorkItem { SourceId = order.Id, SourceType = "KitCommercial", Domain = "commercial",
                    MessageKey = order.Status == ReagentOrderStatus.UnderReview ? "kits.review" : "kits.decision",
                    RecordLabel = order.OrderNumber, Destination = "/order-operations/partner-services/pseq-kits/",
                    OwnerUserId = order.AssignedToUserId, DueAtUtc = order.DueAt, CreatedAtUtc = order.CreatedAt,
                    Priority = order.Status != ReagentOrderStatus.UnderReview ? 0 : order.DueAt < now ? 1 : 3,
                    Kind = "action", TargetId = null }));

        if (Caps.CanManageLabOperations && (session.IsPlatformAdmin || Caps.CanOperateLabWork || Caps.CanSuperviseLabWork))
            queries.Add(db.PartnerReagentOrders.AsNoTracking().Where(order => !order.IsDiscarded
                && (order.Status == ReagentOrderStatus.Accepted || order.Status == ReagentOrderStatus.Processing
                    || order.Status == ReagentOrderStatus.PartiallyShipped || order.Status == ReagentOrderStatus.Shipped
                    || order.Status == ReagentOrderStatus.OnHold && (order.ResumeStatus == ReagentOrderStatus.Accepted
                        || order.ResumeStatus == ReagentOrderStatus.Processing || order.ResumeStatus == ReagentOrderStatus.PartiallyShipped
                        || order.ResumeStatus == ReagentOrderStatus.Shipped)))
                .Select(order => new WorkItem { SourceId = order.Id, SourceType = "KitFulfillment", Domain = "fulfillment",
                    MessageKey = order.Status == ReagentOrderStatus.Accepted ? "kits.start"
                        : order.Status == ReagentOrderStatus.Shipped ? "kits.confirmFulfillment"
                        : order.Status == ReagentOrderStatus.OnHold ? "kits.fulfillmentHold" : "kits.prepareDispatch",
                    RecordLabel = order.OrderNumber, Destination = "/lab-operations/pseq-kit-orders/",
                    OwnerUserId = order.AssignedToUserId, DueAtUtc = order.DueAt, CreatedAtUtc = order.CreatedAt,
                    Priority = order.Status == ReagentOrderStatus.OnHold ? 0 : order.DueAt < now ? 1 : 3,
                    Kind = "action", TargetId = null }));
    }
}
