namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/lab-service-orders")]
public sealed class PlatformLabServiceOrdersController(
    AppDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency,
    IOperationalFileStorage fileStorage,
    IOperationalFileScanner fileScanner,
    IOptions<OrderManagementOptions> options) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<PagedResult<OrderListItemDto>> List(
        [FromQuery] Guid? organizationId,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] Guid? assignedToUserId,
        [FromQuery] bool unassigned = false,
        [FromQuery] bool overdue = false,
        [FromQuery] bool holds = false,
        [FromQuery] DateTime? updatedFrom = null,
        [FromQuery] DateTime? updatedTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.LabServiceOrders.AsNoTracking().Where(order => !order.IsDiscarded);
        if (organizationId.HasValue) query = query.Where(order => order.OrganizationId == organizationId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<LabServiceOrderStatus>(status, true, out var parsed)) throw Invalid("invalid_status", "The lab status is invalid.");
            query = query.Where(order => order.Status == parsed);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(order => order.OrderNumber.Contains(term) || (order.CustomerReference != null && order.CustomerReference.Contains(term))
                || dbContext.LabSamples.Any(sample => sample.LabServiceOrderId == order.Id
                    && (sample.CustomerSampleId.Contains(term) || (sample.AccessionId != null && sample.AccessionId.Contains(term)))));
        }
        if (assignedToUserId.HasValue) query = query.Where(order => order.AssignedToUserId == assignedToUserId.Value);
        if (unassigned) query = query.Where(order => order.AssignedToUserId == null);
        if (holds) query = query.Where(order => order.Status == LabServiceOrderStatus.OnHold);
        if (overdue)
        {
            var now = DateTime.UtcNow;
            query = query.Where(order => order.DueAt != null && order.DueAt < now
                && order.Status != LabServiceOrderStatus.Completed && order.Status != LabServiceOrderStatus.Cancelled && order.Status != LabServiceOrderStatus.Declined);
        }
        if (updatedFrom.HasValue) query = query.Where(order => order.UpdatedAt >= updatedFrom.Value);
        if (updatedTo.HasValue) query = query.Where(order => order.UpdatedAt < updatedTo.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(order => order.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(order => new OrderListItemDto(order.Id, order.OrderNumber, order.Status.ToString(), order.CustomerReference,
                order.OrganizationId, order.CreatedAt, order.UpdatedAt, order.Version, order.TenantSafeReason,
                order.AssignedToUserId, order.DueAt, order.DueAt != null && order.DueAt < DateTime.UtcNow
                    && order.Status != LabServiceOrderStatus.Completed && order.Status != LabServiceOrderStatus.Cancelled && order.Status != LabServiceOrderStatus.Declined)).ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, page, pageSize, total);
    }

    [HttpGet("{orderId:guid}")]
    public async Task<LabServiceOrderDto> Get(Guid orderId, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await MapAsync(await ReadAsync(orderId, cancellationToken), cancellationToken);
    }

    [HttpPost("{orderId:guid}/begin-quote")]
    public async Task<LabServiceOrderDto> BeginQuote(Guid orderId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(order.BeginQuotePreparation);
        Event(order, before, order.Status.ToString(), actor.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/request-changes")]
    public async Task<LabServiceOrderDto> RequestChanges(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => order.RequestChanges(request.Reason, request.InternalNote));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason, request.InternalNote);
        Notice(order, "lab-changes-requested", "Changes requested for laboratory service", $"Phaeno requested changes to {order.OrderNumber}: {request.Reason}");
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/decline")]
    public async Task<LabServiceOrderDto> Decline(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => order.Decline(request.Reason, request.InternalNote));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason, request.InternalNote);
        Notice(order, "lab-request-declined", "Laboratory request declined", $"{order.OrderNumber} was declined: {request.Reason}");
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/quotes")]
    public async Task<LabServiceOrderDto> IssueQuote(Guid orderId, [FromBody] IssueQuoteRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"platform:lab-order:{orderId}:quote";
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        if (order.Status == LabServiceOrderStatus.SubmittedForQuote) Execute(order.BeginQuotePreparation);
        if (order.Status != LabServiceOrderStatus.QuoteInPreparation && order.Status != LabServiceOrderStatus.QuoteIssued)
            throw Conflict("quote_not_allowed", "A quote can be issued only while pricing this request.");
        if (request.Lines.Count == 0) throw Invalid("quote_lines_required", "At least one quote line is required.");
        if (request.Lines.Any(line => line.Quantity <= 0 || line.UnitPrice < 0)) throw Invalid("invalid_quote_line", "Quote quantities must be positive and prices cannot be negative.");
        var itemIds = request.Lines.Select(line => line.CatalogItemId).Distinct().ToList();
        var catalog = await dbContext.QboCatalogItems.AsNoTracking().Where(item => itemIds.Contains(item.Id) && item.IsActive)
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        if (catalog.Count != itemIds.Count) throw Invalid("catalog_item_unavailable", "One or more QuickBooks items are unavailable.");
        var commercial = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, cancellationToken);
        if (string.IsNullOrWhiteSpace(commercial?.QboCustomerId)) throw Conflict("qbo_customer_required", "Link this customer to QuickBooks before issuing a quote.");
        var now = DateTime.UtcNow;
        var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        var expiresAt = request.ExpiresAt ?? now.AddDays(config?.QuoteValidityDays ?? 30);
        if (!Enum.TryParse<QuotePurpose>(request.Purpose, true, out var purpose)) throw Invalid("quote_purpose_invalid", "The quote purpose is invalid.");
        var snapshots = request.Lines.Select(line => new QuoteLineSnapshot(line.CatalogItemId, catalog[line.CatalogItemId].ExternalItemId,
            line.Description.Trim(), line.Quantity, line.UnitPrice)).ToList();
        var subtotal = snapshots.Sum(line => decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero));
        var revision = order.Quotes.Count == 0 ? 1 : order.Quotes.Max(item => item.Revision) + 1;
        var quote = new LabServiceQuote(order.Id, revision, purpose, JsonSerializer.Serialize(snapshots, JsonOptions), subtotal,
            request.Tax, request.Currency, now, expiresAt);
        var previous = order.Quotes.Where(item => item.Status is QuoteStatus.Issued or QuoteStatus.SyncPending).OrderByDescending(item => item.Revision).FirstOrDefault();
        previous?.Supersede(quote.Id);
        order.Quotes.Add(quote);
        var document = new CommercialDocumentLink(OrderWorkflowTypes.LabService, order.Id, CommercialDocumentKind.Estimate, quote.Total, quote.Currency);
        dbContext.CommercialDocumentLinks.Add(document);
        var payload = new OrderDocumentOutboxPayload(document.Id, quote.Id, commercial.QboCustomerId!, order.OrderNumber, null,
            quote.Currency, snapshots.Select(line => new QuickBooksLineRequest(line.ExternalItemId, line.Description, line.Quantity, line.UnitPrice)).ToList());
        dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateEstimate, OrderWorkflowTypes.LabService,
            order.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
        Notice(order, "lab-quote-sync-pending", "Laboratory quote is being prepared", $"Pricing for {order.OrderNumber} is being synchronized.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, cancellationToken);
        idempotency.Store(actor.Id, scope, key, request, response, StatusCodes.Status202Accepted);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status202Accepted;
        return response;
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/receive")]
    public async Task<LabServiceOrderDto> Receive(Guid orderId, Guid sampleId, [FromBody] LabSampleReceiptRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        var before = sample.Status.ToString();
        Execute(() => sample.Receive(request.ReceivedAt, request.ReceiptCondition));
        Event(order, before, sample.Status.ToString(), actor.Id, childId: sample.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/accession")]
    public async Task<LabServiceOrderDto> Accession(Guid orderId, Guid sampleId, [FromBody] LabSampleAccessionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        var before = sample.Status.ToString();
        Execute(() => sample.Accession(request.AccessionId));
        Event(order, before, sample.Status.ToString(), actor.Id, childId: sample.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/transition")]
    public async Task<LabServiceOrderDto> TransitionSample(Guid orderId, Guid sampleId, [FromBody] LabSampleTransitionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        if (!Enum.TryParse<LabSampleStatus>(request.Status, true, out var target)) throw Invalid("sample_status_invalid", "The sample status is invalid.");
        var order = await ReadAsync(orderId, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        var before = sample.Status.ToString();
        Execute(() => sample.TransitionTo(target, request.Reason, request.InternalNote));
        if (target is LabSampleStatus.LabAnalysis or LabSampleStatus.DataProcessing) Execute(order.MarkWorkStarted);
        Event(order, before, sample.Status.ToString(), actor.Id, request.Reason, request.InternalNote, sample.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/results")]
    [RequestSizeLimit(104_857_600)]
    public async Task<OperationalFileDto> UploadResult(Guid orderId, Guid sampleId, [FromForm] IFormFile file,
        [FromForm] string analysisProfile, [FromForm] string pipelineVersion, [FromForm] string provenance,
        [FromForm] string qcStatus, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        if (sample.Status is not (LabSampleStatus.DataProcessing or LabSampleStatus.DataAvailable))
            throw Conflict("result_upload_not_allowed", "Results can be uploaded only during data processing or review.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!options.Value.AllowedFileKinds.ContainsKey(extension))
            throw Invalid("file_kind_not_allowed", "This result file type is not allowed.");
        StoredOperationalFile stored;
        await using (var stream = file.OpenReadStream())
            stored = await fileStorage.SaveAsync(stream, extension, options.Value.MaximumFileBytes, cancellationToken);
        try
        {
            var scan = await fileScanner.ScanAsync(stored.StorageKey, cancellationToken);
            var managed = new ManagedOperationalFile(order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, sample.Id,
                OperationalFilePurpose.LabResult, file.FileName, extension, file.ContentType ?? "application/octet-stream",
                stored.SizeBytes, stored.Sha256, stored.StorageKey);
            managed.RecordScan(scan.Status, scan.Message);
            var releaseVersion = await dbContext.LabResultReleases.CountAsync(item => item.LabSampleId == sample.Id, cancellationToken) + 1;
            var release = new LabResultRelease(order.OrganizationId, order.Id, sample.Id, releaseVersion, analysisProfile,
                pipelineVersion, provenance, qcStatus, JsonSerializer.Serialize(new { fileId = managed.Id }, JsonOptions), DateTime.UtcNow);
            dbContext.ManagedOperationalFiles.Add(managed);
            dbContext.LabResultReleases.Add(release);
            await dbContext.SaveChangesAsync(cancellationToken);
            return managed.ToDto();
        }
        catch
        {
            await fileStorage.DeleteIfExistsAsync(stored.StorageKey, cancellationToken);
            throw;
        }
    }

    [HttpPost("{orderId:guid}/samples/{sampleId:guid}/results/{releaseId:guid}/release")]
    public async Task<LabServiceOrderDto> ReleaseResult(Guid orderId, Guid sampleId, Guid releaseId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        var release = await dbContext.LabResultReleases.FirstOrDefaultAsync(item => item.Id == releaseId && item.LabServiceOrderId == orderId && item.LabSampleId == sampleId, cancellationToken) ?? throw Missing();
        var releaseFileIds = ResultFileIds(release.ManifestJson);
        var files = await dbContext.ManagedOperationalFiles.Where(item => releaseFileIds.Contains(item.Id) && item.WorkflowId == orderId && item.ParentRecordId == sampleId
            && item.Purpose == OperationalFilePurpose.LabResult && item.ReleaseStatus == FileReleaseStatus.Internal).ToListAsync(cancellationToken);
        if (releaseFileIds.Count == 0 || files.Count != releaseFileIds.Count || files.Any(item => item.ScanStatus != OperationalFileScanStatus.Clean))
            throw Conflict("result_files_not_clean", "Every result file must pass scanning before release.");
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, cancellationToken);
        var invoicePaid = await dbContext.CommercialDocumentLinks.AsNoTracking().AnyAsync(item => item.WorkflowType == OrderWorkflowTypes.LabService
            && item.WorkflowId == order.Id && item.Kind == CommercialDocumentKind.Invoice && item.SyncStatus == IntegrationStatus.Succeeded && item.Balance == 0, cancellationToken);
        var mayRelease = profile?.LabCreditApproved == true || invoicePaid;
        release.MarkReady(!mayRelease);
        foreach (var item in files)
        {
            if (mayRelease) item.Release(DateTime.UtcNow); else item.HoldForPayment();
        }
        if (mayRelease) release.Release(DateTime.UtcNow);
        Execute(order.MarkResultsAvailable);
        if (sample.Status == LabSampleStatus.DataProcessing) Execute(() => sample.TransitionTo(LabSampleStatus.DataAvailable, null, null));
        Event(order, "ResultReview", mayRelease ? "ResultReleased" : "PaymentHold", actor.Id, childId: sample.Id);
        Notice(order, mayRelease ? "lab-result-released" : "lab-result-payment-hold",
            mayRelease ? "Laboratory result available" : "Laboratory result awaiting payment",
            mayRelease ? $"A result is available for {order.OrderNumber}." : $"A result for {order.OrderNumber} is ready and will be released after payment.");
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/hold")]
    public async Task<LabServiceOrderDto> Hold(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => await MutateOrder(orderId, request, (order) => order.PutOnHold(request.Reason, request.InternalNote), "hold", cancellationToken);

    [HttpPost("{orderId:guid}/release-hold")]
    public async Task<LabServiceOrderDto> ReleaseHold(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => await MutateOrder(orderId, request, (order) => order.ReleaseHold(request.Reason, request.InternalNote), "release-hold", cancellationToken);

    [HttpPost("{orderId:guid}/cancellation-requests/{cancellationId:guid}/decision")]
    public async Task<LabServiceOrderDto> DecideCancellation(Guid orderId, Guid cancellationId, [FromBody] CancellationDecisionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var cancellation = await dbContext.OrderCancellationRequests.FirstOrDefaultAsync(item => item.Id == cancellationId
            && item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == orderId, cancellationToken) ?? throw Missing();
        if (!Enum.TryParse<CancellationRequestStatus>(request.Status, true, out var decision) || decision == CancellationRequestStatus.Pending)
            throw Invalid("cancellation_decision_invalid", "A final cancellation decision is required.");
        var before = order.Status.ToString();
        cancellation.Decide(decision, request.Reason, actor.Id, DateTime.UtcNow);
        Execute(() => order.ResolveCancellation(decision is CancellationRequestStatus.Approved, request.Reason, null));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    [HttpPost("{orderId:guid}/complete")]
    public async Task<LabServiceOrderDto> Complete(Guid orderId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"platform:lab-order:{orderId}:complete";
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => order.Complete(DateTime.UtcNow));
        var acceptedQuote = order.Quotes.SingleOrDefault(item => item.Id == order.AcceptedQuoteId) ?? throw Conflict("accepted_quote_missing", "The accepted quote snapshot is unavailable.");
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.OrganizationId == order.OrganizationId, cancellationToken);
        if (string.IsNullOrWhiteSpace(profile?.QboCustomerId)) throw Conflict("qbo_customer_required", "Link this customer to QuickBooks before completing the order.");
        var estimate = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService
            && item.WorkflowId == orderId && item.Kind == CommercialDocumentKind.Estimate && item.SyncStatus == IntegrationStatus.Succeeded)
            .OrderByDescending(item => item.SynchronizedAt).FirstOrDefaultAsync(cancellationToken);
        var lines = JsonSerializer.Deserialize<List<QuoteLineSnapshot>>(acceptedQuote.LinesJson, JsonOptions) ?? [];
        var invoice = new CommercialDocumentLink(OrderWorkflowTypes.LabService, order.Id, CommercialDocumentKind.Invoice, acceptedQuote.Total, acceptedQuote.Currency);
        dbContext.CommercialDocumentLinks.Add(invoice);
        var payload = new OrderDocumentOutboxPayload(invoice.Id, null, profile.QboCustomerId!, order.OrderNumber, null,
            acceptedQuote.Currency, lines.Select(line => new QuickBooksLineRequest(line.ExternalItemId, line.Description, line.Quantity, line.UnitPrice)).ToList(), estimate?.ExternalDocumentId);
        dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateInvoice, OrderWorkflowTypes.LabService,
            order.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
        Event(order, before, order.Status.ToString(), actor.Id);
        Notice(order, "lab-order-completed", "Laboratory service completed", $"Laboratory work for {order.OrderNumber} is complete.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, cancellationToken);
        idempotency.Store(actor.Id, scope, key, request, response, StatusCodes.Status202Accepted);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status202Accepted;
        return response;
    }

    private async Task<LabServiceOrderDto> MutateOrder(Guid orderId, ReasonRequest request, Action<LabServiceOrder> action, string eventName, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var order = await ReadAsync(orderId, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => action(order));
        Event(order, before, order.Status.ToString(), actor.Id, request.Reason, request.InternalNote);
        Notice(order, $"lab-{eventName}", "Laboratory order status changed", $"{order.OrderNumber}: {request.Reason}");
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, cancellationToken);
    }

    private async Task<LabServiceOrder> ReadAsync(Guid orderId, CancellationToken cancellationToken)
        => await dbContext.LabServiceOrders.Include(order => order.Samples).Include(order => order.Quotes).Include(order => order.Revisions)
            .FirstOrDefaultAsync(order => order.Id == orderId && !order.IsDiscarded, cancellationToken) ?? throw Missing();

    private async Task<LabServiceOrderDto> MapAsync(LabServiceOrder order, CancellationToken cancellationToken)
    {
        var files = await dbContext.ManagedOperationalFiles.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var releases = await dbContext.LabResultReleases.AsNoTracking().Where(item => item.LabServiceOrderId == order.Id).OrderBy(item => item.GeneratedAt).ToListAsync(cancellationToken);
        var docs = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var cancellations = await dbContext.OrderCancellationRequests.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id).OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var timeline = await dbContext.OrderStatusEvents.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id).OrderBy(item => item.OccurredAt).ToListAsync(cancellationToken);
        return new LabServiceOrderDto(order.Id, order.OrganizationId, order.OrderNumber, order.CustomerReference, order.SubmissionInstructionsSnapshot,
            order.Status.ToString(), order.RequestRevision, order.SubmittedAt, order.PlacedAt, order.CompletedAt, order.TenantSafeReason,
            order.InternalNote, order.CreatedAt, order.UpdatedAt, order.Version, false, false, false, false, false,
            order.Samples.OrderBy(item => item.CreatedAt).Select(item => item.ToDto(true)).ToList(), order.Quotes.OrderByDescending(item => item.Revision).Select(item => item.ToDto()).ToList(),
            releases.Select(item => item.ToDto()).ToList(), files.Select(item => item.ToDto()).ToList(), docs.Select(item => item.ToDto(true)).ToList(), cancellations.Select(item => item.ToDto()).ToList(), timeline.Select(item => item.ToDto(true)).ToList(),
            order.AssignedToUserId, order.DueAt,
            order.Revisions.OrderByDescending(item => item.Revision).Select(item => new LabRequestRevisionDto(item.Id,
                item.Revision, item.PreviousRevisionId, item.SnapshotJson, item.CorrectionReason, item.SubmittedByUserId, item.SubmittedAt)).ToList());
    }

    private void Event(LabServiceOrder order, string from, string to, Guid actorId, string? reason = null, string? internalNote = null, Guid? childId = null)
        => dbContext.OrderStatusEvents.Add(new OrderStatusEvent(order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, childId,
            from, to, reason, internalNote, actorId, DateTime.UtcNow));

    private void Notice(LabServiceOrder order, string eventType, string subject, string body)
        => dbContext.OrderNotifications.Add(new OrderNotification(order.OrganizationId, null, OrderWorkflowTypes.LabService, order.Id, eventType, subject, body));

    private static void EnsureVersion(long current, long supplied) { if (current != supplied) throw new DbUpdateConcurrencyException(); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("invalid_order_action", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("order_action_not_allowed", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("lab_order_not_found", "The requested laboratory record was not found.", StatusCodes.Status404NotFound);
    private static IReadOnlyList<Guid> ResultFileIds(string manifestJson)
    {
        try
        {
            using var document = JsonDocument.Parse(manifestJson);
            if (document.RootElement.TryGetProperty("fileId", out var fileId) && fileId.TryGetGuid(out var id)) return [id];
            if (document.RootElement.TryGetProperty("fileIds", out var fileIds) && fileIds.ValueKind == JsonValueKind.Array)
                return fileIds.EnumerateArray().Select(item => item.TryGetGuid(out var value) ? value : Guid.Empty).Where(value => value != Guid.Empty).Distinct().ToList();
        }
        catch (JsonException) { }
        throw Invalid("result_manifest_invalid", "The result manifest does not identify valid managed files.");
    }
    private sealed record QuoteLineSnapshot(Guid CatalogItemId, string ExternalItemId, string Description, decimal Quantity, decimal UnitPrice);
}
