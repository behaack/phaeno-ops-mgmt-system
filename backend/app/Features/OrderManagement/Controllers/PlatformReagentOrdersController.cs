namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/reagent-orders")]
public sealed class PlatformReagentOrdersController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<PagedResult<OrderListItemDto>> List([FromQuery] Guid? organizationId, [FromQuery] string? status,
        [FromQuery] string? search, [FromQuery] Guid? assignedToUserId, [FromQuery] bool unassigned = false,
        [FromQuery] bool overdue = false, [FromQuery] bool holds = false, [FromQuery] DateTime? updatedFrom = null,
        [FromQuery] DateTime? updatedTo = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.PartnerReagentOrders.AsNoTracking().Where(order => !order.IsDiscarded);
        if (organizationId.HasValue) query = query.Where(order => order.OrganizationId == organizationId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ReagentOrderStatus>(status, true, out var parsed)) throw Invalid("invalid_status", "The reagent status is invalid.");
            query = query.Where(order => order.Status == parsed);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(order => order.OrderNumber.Contains(term) || (order.PurchaseOrderNumber != null && order.PurchaseOrderNumber.Contains(term))
                || dbContext.PartnerReagentOrderLines.Any(line => line.PartnerReagentOrderId == order.Id && (line.Description.Contains(term) || line.ExternalItemId.Contains(term)))
                || dbContext.ReagentShipments.Any(shipment => shipment.PartnerReagentOrderId == order.Id && shipment.TrackingNumber.Contains(term)));
        }
        if (assignedToUserId.HasValue) query = query.Where(order => order.AssignedToUserId == assignedToUserId.Value);
        if (unassigned) query = query.Where(order => order.AssignedToUserId == null);
        if (holds) query = query.Where(order => order.Status == ReagentOrderStatus.OnHold);
        if (overdue)
        {
            var now = DateTime.UtcNow;
            query = query.Where(order => order.DueAt != null && order.DueAt < now
                && order.Status != ReagentOrderStatus.Fulfilled && order.Status != ReagentOrderStatus.Cancelled && order.Status != ReagentOrderStatus.Rejected);
        }
        if (updatedFrom.HasValue) query = query.Where(order => order.UpdatedAt >= updatedFrom.Value);
        if (updatedTo.HasValue) query = query.Where(order => order.UpdatedAt < updatedTo.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(order => order.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(order => new OrderListItemDto(order.Id, order.OrderNumber, order.Status.ToString(), order.PurchaseOrderNumber,
                order.OrganizationId, order.CreatedAt, order.UpdatedAt, order.Version, order.TenantSafeReason,
                order.AssignedToUserId, order.DueAt, order.DueAt != null && order.DueAt < DateTime.UtcNow
                    && order.Status != ReagentOrderStatus.Fulfilled && order.Status != ReagentOrderStatus.Cancelled && order.Status != ReagentOrderStatus.Rejected)).ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, page, pageSize, total);
    }

    [HttpGet("{orderId:guid}")]
    public async Task<PartnerReagentOrderDto> Get(Guid orderId, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await MapAsync(await ReadAsync(orderId, cancellationToken), cancellationToken);
    }

    [HttpPost("{orderId:guid}/accept")]
    public async Task<PartnerReagentOrderDto> Accept(Guid orderId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
        => await Mutate(orderId, request.Version, order => order.Accept(DateTime.UtcNow), "accepted", null, null, cancellationToken);

    [HttpPost("{orderId:guid}/start-processing")]
    public async Task<PartnerReagentOrderDto> StartProcessing(Guid orderId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
        => await Mutate(orderId, request.Version, order => order.StartProcessing(), "processing-started", null, null, cancellationToken);

    [HttpPost("{orderId:guid}/reject")]
    public async Task<PartnerReagentOrderDto> Reject(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => await Mutate(orderId, request.Version, order => order.Reject(request.Reason, request.InternalNote), "rejected", request.Reason, request.InternalNote, cancellationToken);

    [HttpPost("{orderId:guid}/hold")]
    public async Task<PartnerReagentOrderDto> Hold(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => await Mutate(orderId, request.Version, order => order.PutOnHold(request.Reason, request.InternalNote), "hold", request.Reason, request.InternalNote, cancellationToken);

    [HttpPost("{orderId:guid}/release-hold")]
    public async Task<PartnerReagentOrderDto> ReleaseHold(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => await Mutate(orderId, request.Version, order => order.ReleaseHold(request.Reason, request.InternalNote), "hold-released", request.Reason, request.InternalNote, cancellationToken);

    [HttpPost("{orderId:guid}/adjustments")]
    public async Task<PartnerReagentOrderDto> ProposeAdjustment(Guid orderId, [FromBody] ProposeReagentAdjustmentRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        if (order.Status is not (ReagentOrderStatus.Processing or ReagentOrderStatus.PartiallyShipped or ReagentOrderStatus.OnHold))
            throw Conflict("adjustment_not_allowed", "Reagent adjustments can be proposed only during fulfillment.");
        var line = order.Lines.SingleOrDefault(item => item.Id == request.OriginalLineId) ?? throw Missing();
        if (line.ShippedQuantity > 0 || line.CancelledQuantity > 0 || request.Quantity != line.RemainingQuantity)
            throw Invalid("adjustment_quantity_invalid", "The initial release supports substitution of a complete unfulfilled line only.");
        var offering = await (from value in dbContext.PartnerReagentOfferings.AsNoTracking()
            join item in dbContext.QboCatalogItems.AsNoTracking() on value.QboCatalogItemId equals item.Id
            where value.Id == request.ProposedOfferingId && value.PartnerOrganizationId == order.OrganizationId && value.IsActive && item.IsActive
            select new { Offering = value, Item = item }).FirstOrDefaultAsync(cancellationToken)
            ?? throw Invalid("reagent_offering_unavailable", "The proposed reagent offering is unavailable.");
        if (!offering.Offering.IsEffectiveAt(DateTime.UtcNow) || !offering.Offering.IsQuantityAllowed(request.Quantity))
            throw Invalid("reagent_adjustment_invalid", "The proposed reagent quantity or price is not currently valid.");
        var before = JsonSerializer.Serialize(new { line.Id, line.OfferingId, line.Description, quantity = line.RemainingQuantity, line.UnitPrice, line.LineTotal }, JsonOptions);
        var afterTotal = decimal.Round(request.Quantity * offering.Offering.NegotiatedUnitPrice, 2, MidpointRounding.AwayFromZero);
        var beforeTotal = decimal.Round(request.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero);
        var after = JsonSerializer.Serialize(new { offeringId = offering.Offering.Id, offering.Item.Name, quantity = request.Quantity,
            unitPrice = offering.Offering.NegotiatedUnitPrice, total = afterTotal, offering.Offering.Currency }, JsonOptions);
        dbContext.ReagentOrderAdjustments.Add(new ReagentOrderAdjustment(order.Id, line.Id, offering.Offering.Id, before, after,
            request.Reason, afterTotal - beforeTotal));
        Event(order, "Fulfillment", "AdjustmentProposed", actor.Id, request.Reason);
        Notice(order, "reagent-adjustment-proposed", "Reagent substitution approval required",
            $"Phaeno proposed a reagent substitution for {order.OrderNumber}. Review the product and price effect before deciding.");
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/shipments")]
    public async Task<PartnerReagentOrderDto> CreateShipment(Guid orderId, [FromBody] CreateShipmentRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"platform:reagent-order:{orderId}:shipment";
        var replay = await idempotency.ReadAsync<PartnerReagentOrderDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        if (order.Status == ReagentOrderStatus.Accepted) Execute(order.StartProcessing);
        if (order.Status is not (ReagentOrderStatus.Processing or ReagentOrderStatus.PartiallyShipped))
            throw Conflict("shipment_not_allowed", "A shipment can be recorded only during reagent fulfillment.");
        if (request.Lines.Count == 0) throw Invalid("shipment_line_required", "A shipment must contain at least one allocation.");
        if (request.Lines.Select(item => item.OrderLineId).Distinct().Count() != request.Lines.Count)
            throw Invalid("duplicate_shipment_line", "Each order line may appear only once in a shipment.");
        var shipment = new ReagentShipment(order.Id, OrderNumberGenerator.Shipment(), OrderNumberGenerator.PackingSlip(),
            request.Carrier, request.Service, request.TrackingNumber, request.ShippedAt);
        decimal invoiceTotal = 0;
        var qboLines = new List<QuickBooksLineRequest>();
        foreach (var allocation in request.Lines)
        {
            var line = order.Lines.SingleOrDefault(item => item.Id == allocation.OrderLineId) ?? throw Invalid("shipment_line_invalid", "A shipment line does not belong to this order.");
            Execute(() => line.AllocateShipment(allocation.Quantity));
            shipment.Lines.Add(new ReagentShipmentLine(shipment.Id, line.Id, allocation.Quantity, allocation.LotBatchNumber, allocation.ExpiresAt));
            invoiceTotal += decimal.Round(allocation.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero);
            qboLines.Add(new QuickBooksLineRequest(line.ExternalItemId, line.Description, allocation.Quantity, line.UnitPrice));
        }
        order.Shipments.Add(shipment);
        Execute(order.RecordShipmentProgress);
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, cancellationToken);
        if (string.IsNullOrWhiteSpace(profile?.QboCustomerId)) throw Conflict("qbo_customer_required", "Link this Partner to QuickBooks before shipping.");
        var currency = order.Lines.Select(item => item.Currency).Distinct(StringComparer.OrdinalIgnoreCase).Single();
        var invoice = new CommercialDocumentLink(OrderWorkflowTypes.Reagent, order.Id, CommercialDocumentKind.Invoice, invoiceTotal, currency);
        dbContext.CommercialDocumentLinks.Add(invoice);
        var payload = new OrderDocumentOutboxPayload(invoice.Id, null, profile.QboCustomerId!, shipment.ShipmentNumber,
            order.PurchaseOrderNumber, currency, qboLines);
        dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateInvoice, OrderWorkflowTypes.Reagent,
            order.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
        Event(order, "Processing", order.Status.ToString(), actor.Id);
        Notice(order, "reagent-shipped", "Reagent shipment recorded", $"Shipment {shipment.ShipmentNumber} for {order.OrderNumber} is on the way. Tracking: {shipment.TrackingNumber}.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, cancellationToken);
        idempotency.Store(actor.Id, scope, key, request, response, StatusCodes.Status202Accepted);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status202Accepted;
        return response;
    }

    [HttpPost("{orderId:guid}/fulfill")]
    public async Task<PartnerReagentOrderDto> Fulfill(Guid orderId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"platform:reagent-order:{orderId}:fulfill";
        var replay = await idempotency.ReadAsync<PartnerReagentOrderDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version); var before = order.Status.ToString();
        Execute(() => order.Fulfill(DateTime.UtcNow));
        Event(order, before, order.Status.ToString(), actor.Id);
        Notice(order, "reagent-order-fulfilled", "Reagent order fulfilled", $"All active quantities for {order.OrderNumber} have been fulfilled.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, cancellationToken); idempotency.Store(actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken); return response;
    }

    [HttpPost("{orderId:guid}/cancellation-requests/{cancellationId:guid}/decision")]
    public async Task<PartnerReagentOrderDto> DecideCancellation(Guid orderId, Guid cancellationId, [FromBody] CancellationDecisionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken); EnsureVersion(order.Version, request.Version);
        var cancellation = await dbContext.OrderCancellationRequests.FirstOrDefaultAsync(item => item.Id == cancellationId
            && item.WorkflowType == OrderWorkflowTypes.Reagent && item.WorkflowId == orderId, cancellationToken) ?? throw Missing();
        if (!Enum.TryParse<CancellationRequestStatus>(request.Status, true, out var decision) || decision == CancellationRequestStatus.Pending)
            throw Invalid("cancellation_decision_invalid", "A final cancellation decision is required.");
        cancellation.Decide(decision, request.Reason, actor.Id, DateTime.UtcNow);
        if (decision == CancellationRequestStatus.Approved)
        {
            foreach (var line in order.Lines.Where(item => item.RemainingQuantity > 0)) line.CancelRemainder(line.RemainingQuantity);
        }
        else if (decision == CancellationRequestStatus.PartiallyApproved)
        {
            var lines = request.Lines ?? [];
            if (lines.Count == 0 || lines.Select(item => item.OrderLineId).Distinct().Count() != lines.Count)
                throw Invalid("cancellation_scope_required", "A partial approval requires unique line quantities.");
            foreach (var allocation in lines)
            {
                var line = order.Lines.SingleOrDefault(item => item.Id == allocation.OrderLineId)
                    ?? throw Invalid("cancellation_scope_invalid", "A cancellation line does not belong to this order.");
                Execute(() => line.CancelRemainder(allocation.Quantity));
            }
        }
        var before = order.Status.ToString();
        Execute(() => order.ResolveCancellation(decision, request.Reason, null));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason);
        await dbContext.SaveChangesAsync(cancellationToken); return await MapAsync(order, cancellationToken);
    }

    private async Task<PartnerReagentOrderDto> Mutate(Guid id, long version, Action<PartnerReagentOrder> mutation,
        string eventName, string? reason, string? internalNote, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(id, cancellationToken); EnsureVersion(order.Version, version); var before = order.Status.ToString();
        Execute(() => mutation(order)); Event(order, before, order.Status.ToString(), actor.Id, reason, internalNote);
        Notice(order, $"reagent-{eventName}", "Reagent order status changed", reason ?? $"{order.OrderNumber} is now {order.Status}.");
        await dbContext.SaveChangesAsync(cancellationToken); return await MapAsync(order, cancellationToken);
    }

    private async Task<PartnerReagentOrder> ReadAsync(Guid id, CancellationToken cancellationToken)
        => await dbContext.PartnerReagentOrders.Include(order => order.Lines).Include(order => order.Shipments).ThenInclude(shipment => shipment.Lines)
            .FirstOrDefaultAsync(order => order.Id == id && !order.IsDiscarded, cancellationToken) ?? throw Missing();

    private async Task<PartnerReagentOrderDto> MapAsync(PartnerReagentOrder order, CancellationToken cancellationToken)
    {
        var adjustments = await dbContext.ReagentOrderAdjustments.AsNoTracking().Where(item => item.PartnerReagentOrderId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var docs = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.Reagent && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var cancellations = await dbContext.OrderCancellationRequests.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.Reagent && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var timeline = await dbContext.OrderStatusEvents.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.Reagent && item.WorkflowId == order.Id).OrderBy(item => item.OccurredAt).ToListAsync(cancellationToken);
        return new PartnerReagentOrderDto(order.Id, order.OrganizationId, order.OrderNumber, order.Status.ToString(), order.PurchaseOrderNumber,
            order.ShippingAddressId, order.ShippingAddressSnapshotJson, order.RequestedDeliveryDate, order.ShippingInstructions,
            order.PlacedAt, order.AcceptedAt, order.FulfilledAt, order.TenantSafeReason, order.InternalNote, order.CreatedAt, order.UpdatedAt,
            order.Version, false, false, false, false, order.Lines.OrderBy(item => item.CreatedAt).Select(item => item.ToDto()).ToList(),
            order.Shipments.OrderBy(item => item.ShippedAt).Select(item => item.ToDto()).ToList(), adjustments.Select(item => new ReagentAdjustmentDto(item.Id,
                item.OriginalLineId, item.ProposedOfferingId, item.BeforeJson, item.AfterJson, item.Reason, item.TotalDifference, item.Status.ToString(), item.DecidedAt, item.Version)).ToList(),
            docs.Select(item => item.ToDto(true)).ToList(), cancellations.Select(item => item.ToDto()).ToList(), timeline.Select(item => item.ToDto(true)).ToList(),
            order.AssignedToUserId, order.DueAt);
    }

    private void Event(PartnerReagentOrder order, string from, string to, Guid actorId, string? reason = null, string? internalNote = null)
        => dbContext.OrderStatusEvents.Add(new OrderStatusEvent(order.OrganizationId, OrderWorkflowTypes.Reagent, order.Id, null, from, to, reason, internalNote, actorId, DateTime.UtcNow));
    private void Notice(PartnerReagentOrder order, string eventType, string subject, string body)
        => dbContext.OrderNotifications.Add(new OrderNotification(order.OrganizationId, null, OrderWorkflowTypes.Reagent, order.Id, eventType, subject, body));
    private static void EnsureVersion(long current, long supplied) { if (current != supplied) throw new DbUpdateConcurrencyException(); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("invalid_reagent_action", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("reagent_action_not_allowed", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("reagent_order_not_found", "The requested reagent record was not found.", StatusCodes.Status404NotFound);
}
