namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/reagent-orders")]
public sealed class ReagentOrdersController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<PagedResult<OrderListItemDto>> List([FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] DateTime? createdFrom, [FromQuery] DateTime? createdTo, [FromQuery] Guid? submitterId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken cancellationToken = default)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.PartnerReagentOrders.AsNoTracking().Where(order => order.OrganizationId == tenant.Organization.Id && !order.IsDiscarded);
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
        if (createdFrom.HasValue) query = query.Where(order => order.CreatedAt >= createdFrom.Value);
        if (createdTo.HasValue) query = query.Where(order => order.CreatedAt < createdTo.Value);
        if (submitterId.HasValue) query = query.Where(order => order.CreatedByUserId == submitterId.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(order => order.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(order => new OrderListItemDto(order.Id, order.OrderNumber, order.Status.ToString(), order.PurchaseOrderNumber,
                order.OrganizationId, order.CreatedAt, order.UpdatedAt, order.Version, order.TenantSafeReason)).ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, page, pageSize, total);
    }

    [HttpGet("export")]
    public async Task<FileContentResult> Export([FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] DateTime? createdFrom, [FromQuery] DateTime? createdTo, [FromQuery] Guid? submitterId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        var query = dbContext.PartnerReagentOrders.AsNoTracking().Where(order => order.OrganizationId == tenant.Organization.Id && !order.IsDiscarded);
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
        if (createdFrom.HasValue) query = query.Where(order => order.CreatedAt >= createdFrom.Value);
        if (createdTo.HasValue) query = query.Where(order => order.CreatedAt < createdTo.Value);
        if (submitterId.HasValue) query = query.Where(order => order.CreatedByUserId == submitterId.Value);
        var items = await query.OrderByDescending(order => order.UpdatedAt).Take(10_000)
            .Select(order => new OrderListItemDto(order.Id, order.OrderNumber, order.Status.ToString(), order.PurchaseOrderNumber,
                order.OrganizationId, order.CreatedAt, order.UpdatedAt, order.Version, order.TenantSafeReason)).ToListAsync(cancellationToken);
        return File(OrderCsvExport.Create(items), "text/csv; charset=utf-8", $"reagent-orders-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpGet("{orderId:guid}")]
    public async Task<PartnerReagentOrderDto> Get(Guid orderId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        return await MapAsync(await ReadAsync(orderId, tenant.Organization.Id, cancellationToken), tenant.Membership.IsOrganizationAdmin, false, cancellationToken);
    }

    [HttpPost]
    public async Task<PartnerReagentOrderDto> Create([FromBody] ReagentOrderWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var replay = await idempotency.ReadAsync<PartnerReagentOrderDto>(tenant.Actor.Id, "reagent-order:create", key, request, cancellationToken);
        if (replay != null) return replay;
        var offerings = await ValidateLinesAsync(tenant.Organization.Id, request.Lines, DateTime.UtcNow, cancellationToken);
        var order = new PartnerReagentOrder(tenant.Organization.Id, OrderNumberGenerator.Reagent());
        AddLines(order, request.Lines, offerings);
        dbContext.PartnerReagentOrders.Add(order);
        Event(order, "Created", order.Status.ToString(), tenant.Actor.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, "reagent-order:create", key, request, response, StatusCodes.Status201Created);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return response;
    }

    [HttpPost("{orderId:guid}/create-draft")]
    public async Task<PartnerReagentOrderDto> CreateDraftFromPrior(Guid orderId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"reagent-order:{orderId}:create-draft";
        var request = new { SourceOrderId = orderId };
        var replay = await idempotency.ReadAsync<PartnerReagentOrderDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;

        var source = await ReadAsync(orderId, tenant.Organization.Id, cancellationToken);
        var offeringIds = source.Lines.Select(line => line.OfferingId).Distinct().ToList();
        var now = DateTime.UtcNow;
        var offerings = await dbContext.PartnerReagentOfferings.AsNoTracking()
            .Where(item => offeringIds.Contains(item.Id) && item.PartnerOrganizationId == tenant.Organization.Id && item.IsActive)
            .ToListAsync(cancellationToken);
        var catalogIds = offerings.Select(offering => offering.QboCatalogItemId).Distinct().ToList();
        var activeCatalogIds = await dbContext.QboCatalogItems.AsNoTracking()
            .Where(item => item.IsActive && catalogIds.Contains(item.Id))
            .Select(item => item.Id).ToListAsync(cancellationToken);
        var eligible = offerings.Where(item => activeCatalogIds.Contains(item.QboCatalogItemId) && item.IsEffectiveAt(now))
            .ToDictionary(item => item.Id);
        var writes = source.Lines.Where(line => eligible.TryGetValue(line.OfferingId, out var offering) && offering.IsQuantityAllowed(line.Quantity))
            .Select(line => new ReagentLineWriteRequest(line.OfferingId, line.Quantity, line.Note)).ToList();
        if (writes.Count == 0)
            throw Invalid("reagent_prior_order_has_no_eligible_lines", "No lines from the prior order are currently eligible for a new draft.");

        var snapshots = await ValidateLinesAsync(tenant.Organization.Id, writes, now, cancellationToken);
        var draft = new PartnerReagentOrder(tenant.Organization.Id, OrderNumberGenerator.Reagent());
        AddLines(draft, writes, snapshots);
        dbContext.PartnerReagentOrders.Add(draft);
        Event(draft, "CreatedFromPrior", draft.Status.ToString(), tenant.Actor.Id, $"Created from {source.OrderNumber}.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(draft, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, scope, key, request, response, StatusCodes.Status201Created);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return response;
    }

    [HttpPatch("{orderId:guid}")]
    public async Task<PartnerReagentOrderDto> Update(Guid orderId, [FromBody] ReagentOrderWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var order = await ReadAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        if (order.Status != ReagentOrderStatus.Draft) throw Conflict("reagent_order_not_editable", "Only draft reagent orders can be edited.");
        var offerings = await ValidateLinesAsync(tenant.Organization.Id, request.Lines, DateTime.UtcNow, cancellationToken);
        dbContext.PartnerReagentOrderLines.RemoveRange(order.Lines);
        AddLines(order, request.Lines, offerings);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpPost("{orderId:guid}/place")]
    public async Task<PartnerReagentOrderDto> Place(Guid orderId, [FromBody] PlaceReagentOrderRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"reagent-order:{orderId}:place";
        var replay = await idempotency.ReadAsync<PartnerReagentOrderDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var address = await dbContext.PartnerShippingAddresses.AsNoTracking().FirstOrDefaultAsync(item => item.Id == request.ShippingAddressId
            && item.OrganizationId == tenant.Organization.Id && item.IsActive, cancellationToken)
            ?? throw Invalid("shipping_address_unavailable", "Select an active Partner shipping address.");
        var writes = order.Lines.Select(line => new ReagentLineWriteRequest(line.OfferingId, line.Quantity, line.Note)).ToList();
        var offerings = await ValidateLinesAsync(tenant.Organization.Id, writes, DateTime.UtcNow, cancellationToken);
        foreach (var line in order.Lines)
        {
            var offering = offerings[line.OfferingId];
            if (!SnapshotMatches(line, offering))
                throw Conflict("reagent_price_changed", $"The negotiated price or item details for {line.Description} changed. Review the refreshed draft before placing it.");
            if (!ReagentShippingRules.Parse(offering.ShippingRestrictionsJson).Allows(address.CountryCode, address.Region))
                throw Invalid("reagent_destination_restricted", $"{line.Description} cannot be shipped to the selected destination.");
        }
        var before = order.Status.ToString();
        Execute(() => order.Place(request.PurchaseOrderNumber, address.Id, JsonSerializer.Serialize(address.ToDto(), JsonOptions),
            request.RequestedDeliveryDate, request.ShippingInstructions, DateTime.UtcNow));
        Execute(() => order.RecordPlacementSnapshot(JsonSerializer.Serialize(new
        {
            order.OrderNumber,
            order.PurchaseOrderNumber,
            shippingAddress = address.ToDto(),
            order.RequestedDeliveryDate,
            order.ShippingInstructions,
            placedAt = order.PlacedAt,
            lines = order.Lines.OrderBy(line => line.CreatedAt).Select(line => new
            {
                line.Id, line.OfferingId, line.QboCatalogItemId, line.ExternalItemId, line.Description,
                line.Quantity, line.Unit, line.UnitPrice, line.Currency, line.LineTotal, line.Note
            })
        }, JsonOptions)));
        var commercial = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, cancellationToken);
        if (string.IsNullOrWhiteSpace(commercial?.QboCustomerId)) throw Conflict("qbo_customer_required", "Link this Partner to QuickBooks before placing an order.");
        var total = order.Lines.Sum(line => line.LineTotal);
        var currency = RequireSingleCurrency(order.Lines.Select(line => line.Currency));
        var document = new CommercialDocumentLink(OrderWorkflowTypes.Reagent, order.Id, CommercialDocumentKind.Estimate, total, currency);
        dbContext.CommercialDocumentLinks.Add(document);
        var payload = new OrderDocumentOutboxPayload(document.Id, null, commercial.QboCustomerId!, order.OrderNumber,
            order.PurchaseOrderNumber, currency, order.Lines.Select(line => new QuickBooksLineRequest(line.ExternalItemId,
                line.Description, line.Quantity, line.UnitPrice)).ToList());
        dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateEstimate, OrderWorkflowTypes.Reagent,
            order.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
        Event(order, before, order.Status.ToString(), tenant.Actor.Id);
        Notice(order, "reagent-order-placed", "Reagent order placed", $"{order.OrderNumber} was placed and is being synchronized for Phaeno review.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, scope, key, request, response, StatusCodes.Status202Accepted);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status202Accepted;
        return response;
    }

    [HttpPost("{orderId:guid}/cancel")]
    public async Task<PartnerReagentOrderDto> Cancel(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var order = await ReadAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => order.CancelBeforeAcceptance(request.Reason));
        Event(order, before, order.Status.ToString(), tenant.Actor.Id, request.Reason);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpPost("{orderId:guid}/cancellation-requests")]
    public async Task<PartnerReagentOrderDto> RequestCancellation(Guid orderId, [FromBody] CancellationRequestBody request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"reagent-order:{orderId}:cancellation";
        var replay = await idempotency.ReadAsync<PartnerReagentOrderDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString(); Execute(order.RequestCancellation);
        dbContext.OrderCancellationRequests.Add(new OrderCancellationRequest(order.OrganizationId, OrderWorkflowTypes.Reagent,
            order.Id, tenant.Actor.Id, request.Reason, request.ScopeJson));
        Event(order, before, order.Status.ToString(), tenant.Actor.Id, request.Reason);
        Notice(order, "reagent-cancellation-requested", "Reagent cancellation requested", $"A cancellation decision is required for {order.OrderNumber}.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken);
        return response;
    }

    [HttpPost("{orderId:guid}/adjustments/{adjustmentId:guid}/decision")]
    public async Task<PartnerReagentOrderDto> DecideAdjustment(Guid orderId, Guid adjustmentId,
        [FromBody] ReagentAdjustmentDecisionRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var order = await ReadAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var adjustment = await dbContext.ReagentOrderAdjustments.FirstOrDefaultAsync(item => item.Id == adjustmentId
            && item.PartnerReagentOrderId == orderId, cancellationToken) ?? throw Missing();
        if (request.Approved)
        {
            var line = order.Lines.SingleOrDefault(item => item.Id == adjustment.OriginalLineId) ?? throw Missing();
            var proposed = await (from offering in dbContext.PartnerReagentOfferings.AsNoTracking()
                join item in dbContext.QboCatalogItems.AsNoTracking() on offering.QboCatalogItemId equals item.Id
                where offering.Id == adjustment.ProposedOfferingId && offering.PartnerOrganizationId == tenant.Organization.Id
                    && offering.IsActive && item.IsActive
                select new { Offering = offering, Item = item }).FirstOrDefaultAsync(cancellationToken)
                ?? throw Invalid("reagent_offering_unavailable", "The proposed reagent offering is no longer available.");
            if (!proposed.Offering.IsEffectiveAt(DateTime.UtcNow) || !proposed.Offering.IsQuantityAllowed(line.RemainingQuantity))
                throw Invalid("reagent_adjustment_invalid", "The proposed reagent price or quantity is no longer valid.");
            Execute(() => line.ApplyApprovedSubstitution(proposed.Offering.Id, proposed.Item.Id, proposed.Item.ExternalItemId,
                proposed.Item.Name, proposed.Offering.SellingUnit, proposed.Offering.NegotiatedUnitPrice, proposed.Offering.Currency));
        }
        Execute(() => adjustment.Decide(request.Approved, tenant.Actor.Id, DateTime.UtcNow));
        Event(order, "AdjustmentProposed", request.Approved ? "AdjustmentApproved" : "AdjustmentDeclined", tenant.Actor.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpGet("{orderId:guid}/shipments")]
    public async Task<IReadOnlyList<ReagentShipmentDto>> Shipments(Guid orderId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        var order = await ReadAsync(orderId, tenant.Organization.Id, cancellationToken);
        return order.Shipments.OrderByDescending(item => item.ShippedAt).Select(item => item.ToDto()).ToList();
    }

    private async Task<PartnerReagentOrder> ReadAsync(Guid id, Guid organizationId, CancellationToken cancellationToken)
        => await dbContext.PartnerReagentOrders.Include(order => order.Lines).Include(order => order.Shipments).ThenInclude(shipment => shipment.Lines)
            .FirstOrDefaultAsync(order => order.Id == id && order.OrganizationId == organizationId && !order.IsDiscarded, cancellationToken) ?? throw Missing();

    private async Task<Dictionary<Guid, OfferingSnapshot>> ValidateLinesAsync(Guid organizationId, IReadOnlyList<ReagentLineWriteRequest> lines,
        DateTime now, CancellationToken cancellationToken)
    {
        if (lines.Count == 0) throw Invalid("reagent_line_required", "At least one reagent line is required.");
        if (lines.Count > 100) throw Invalid("reagent_line_limit", "An order cannot contain more than 100 reagent lines.");
        if (lines.Select(line => line.OfferingId).Distinct().Count() != lines.Count) throw Invalid("duplicate_reagent_line", "Each reagent offering may appear only once.");
        var ids = lines.Select(line => line.OfferingId).ToList();
        var values = await (from offering in dbContext.PartnerReagentOfferings.AsNoTracking()
            join item in dbContext.QboCatalogItems.AsNoTracking() on offering.QboCatalogItemId equals item.Id
            where ids.Contains(offering.Id) && offering.PartnerOrganizationId == organizationId && offering.IsActive && item.IsActive
            select new OfferingSnapshot(offering.Id, offering.QboCatalogItemId, item.ExternalItemId, item.Name,
                offering.NegotiatedUnitPrice, offering.Currency, offering.SellingUnit, offering.OrderIncrement,
                offering.MinimumQuantity ?? offering.OrderIncrement, offering.MaximumQuantity, offering.EffectiveFrom,
                offering.EffectiveTo, offering.ShippingRestrictionsJson)).ToListAsync(cancellationToken);
        if (values.Count != ids.Count) throw Invalid("reagent_offering_unavailable", "One or more reagent offerings are unavailable.");
        var map = values.ToDictionary(item => item.Id);
        foreach (var line in lines)
        {
            var offering = map[line.OfferingId];
            if (now < offering.EffectiveFrom || (offering.EffectiveUntil.HasValue && now >= offering.EffectiveUntil.Value))
                throw Invalid("reagent_price_not_effective", "A selected reagent price is not currently effective.");
            if (line.Quantity < offering.MinimumQuantity || (offering.MaximumQuantity.HasValue && line.Quantity > offering.MaximumQuantity.Value)
                || line.Quantity % offering.OrderIncrement != 0)
                throw Invalid("reagent_quantity_invalid", $"The quantity for {offering.Name} does not meet its configured increment or limits.");
        }
        return map;
    }

    private static void AddLines(PartnerReagentOrder order, IReadOnlyList<ReagentLineWriteRequest> lines, IReadOnlyDictionary<Guid, OfferingSnapshot> offerings)
    {
        foreach (var item in lines)
        {
            var line = new PartnerReagentOrderLine(order.Id, item.OfferingId, item.Quantity, item.Note);
            Snapshot(line, offerings[item.OfferingId]);
            order.Lines.Add(line);
        }
    }

    private static void Snapshot(PartnerReagentOrderLine line, OfferingSnapshot offering)
        => line.Snapshot(offering.QboCatalogItemId, offering.ExternalItemId, offering.Name, offering.SellingUnit,
            offering.UnitPrice, offering.Currency);

    private static bool SnapshotMatches(PartnerReagentOrderLine line, OfferingSnapshot offering)
        => line.QboCatalogItemId == offering.QboCatalogItemId
            && string.Equals(line.ExternalItemId, offering.ExternalItemId, StringComparison.Ordinal)
            && string.Equals(line.Description, offering.Name, StringComparison.Ordinal)
            && string.Equals(line.Unit, offering.SellingUnit, StringComparison.Ordinal)
            && line.UnitPrice == offering.UnitPrice
            && string.Equals(line.Currency, offering.Currency, StringComparison.OrdinalIgnoreCase);

    private async Task<PartnerReagentOrderDto> MapAsync(PartnerReagentOrder order, bool canManage, bool platform, CancellationToken cancellationToken)
    {
        var adjustments = await dbContext.ReagentOrderAdjustments.AsNoTracking().Where(item => item.PartnerReagentOrderId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var docs = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.Reagent && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var cancellations = await dbContext.OrderCancellationRequests.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.Reagent && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var timeline = await dbContext.OrderStatusEvents.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.Reagent && item.WorkflowId == order.Id).OrderBy(item => item.OccurredAt).ToListAsync(cancellationToken);
        return new PartnerReagentOrderDto(order.Id, order.OrganizationId, order.OrderNumber, order.Status.ToString(), order.PurchaseOrderNumber,
            order.ShippingAddressId, order.ShippingAddressSnapshotJson, order.RequestedDeliveryDate, order.ShippingInstructions,
            order.PlacedAt, order.AcceptedAt, order.FulfilledAt, order.TenantSafeReason, platform ? order.InternalNote : null,
            order.CreatedAt, order.UpdatedAt, order.Version, canManage && order.Status == ReagentOrderStatus.Draft,
            canManage && order.Status == ReagentOrderStatus.Draft, canManage && order.Status is ReagentOrderStatus.Draft or ReagentOrderStatus.Placed or ReagentOrderStatus.UnderReview,
            canManage && order.Status is ReagentOrderStatus.Accepted or ReagentOrderStatus.Processing or ReagentOrderStatus.PartiallyShipped or ReagentOrderStatus.OnHold,
            order.Lines.OrderBy(item => item.CreatedAt).Select(item => item.ToDto()).ToList(), order.Shipments.OrderBy(item => item.ShippedAt).Select(item => item.ToDto()).ToList(),
            adjustments.Select(item => new ReagentAdjustmentDto(item.Id, item.OriginalLineId, item.ProposedOfferingId, item.BeforeJson,
                item.AfterJson, item.Reason, item.TotalDifference, item.Status.ToString(), item.DecidedAt, item.Version)).ToList(),
            docs.Select(item => item.ToDto(platform)).ToList(), cancellations.Select(item => item.ToDto()).ToList(), timeline.Select(item => item.ToDto(platform)).ToList(),
            PlacementSnapshotJson: order.PlacementSnapshotJson);
    }

    private void Event(PartnerReagentOrder order, string from, string to, Guid actorId, string? reason = null, string? internalNote = null)
        => dbContext.OrderStatusEvents.Add(new OrderStatusEvent(order.OrganizationId, OrderWorkflowTypes.Reagent, order.Id, null, from, to, reason, internalNote, actorId, DateTime.UtcNow));
    private void Notice(PartnerReagentOrder order, string eventType, string subject, string body)
        => dbContext.OrderNotifications.Add(new OrderNotification(order.OrganizationId, null, OrderWorkflowTypes.Reagent, order.Id, eventType, subject, body));
    private static string RequireSingleCurrency(IEnumerable<string> values)
    {
        var currencies = values.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (currencies.Count != 1) throw Invalid("mixed_currency_not_allowed", "All reagent lines must use the same currency.");
        return currencies[0];
    }
    private static void EnsureVersion(long current, long? supplied) { if (!supplied.HasValue || supplied.Value != current) throw new DbUpdateConcurrencyException(); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("invalid_reagent_action", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("reagent_action_not_allowed", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("reagent_order_not_found", "The requested reagent record was not found.", StatusCodes.Status404NotFound);
    private sealed record OfferingSnapshot(Guid Id, Guid QboCatalogItemId, string ExternalItemId, string Name, decimal UnitPrice,
        string Currency, string SellingUnit, decimal OrderIncrement, decimal MinimumQuantity, decimal? MaximumQuantity,
        DateTime EffectiveFrom, DateTime? EffectiveUntil, string ShippingRestrictionsJson);
}
