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
[Route("api/platform/data-assembly-requests")]
public sealed class PlatformDataAssemblyRequestsController(
    AppDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency,
    IOperationalFileStorage fileStorage,
    IOperationalFileScanner fileScanner,
    IOptions<OrderManagementOptions> options) : ControllerBase
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
        var query = dbContext.DataAssemblyRequests.AsNoTracking().Where(item => !item.IsDiscarded);
        if (organizationId.HasValue) query = query.Where(item => item.OrganizationId == organizationId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<AssemblyRequestStatus>(status, true, out var parsed)) throw Invalid("invalid_status", "The assembly status is invalid.");
            query = query.Where(item => item.Status == parsed);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(item => item.RequestNumber.Contains(term) || item.ProjectReference.Contains(term)
                || (item.PurchaseOrderNumber != null && item.PurchaseOrderNumber.Contains(term)) || item.ProfileNameSnapshot.Contains(term));
        }
        if (assignedToUserId.HasValue) query = query.Where(item => item.AssignedToUserId == assignedToUserId.Value);
        if (unassigned) query = query.Where(item => item.AssignedToUserId == null);
        if (holds) query = query.Where(item => item.Status == AssemblyRequestStatus.OnHold);
        if (overdue)
        {
            var now = DateTime.UtcNow;
            query = query.Where(item => item.DueAt != null && item.DueAt < now
                && item.Status != AssemblyRequestStatus.Completed && item.Status != AssemblyRequestStatus.Cancelled && item.Status != AssemblyRequestStatus.Rejected);
        }
        if (updatedFrom.HasValue) query = query.Where(item => item.UpdatedAt >= updatedFrom.Value);
        if (updatedTo.HasValue) query = query.Where(item => item.UpdatedAt < updatedTo.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(item => item.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(item => new OrderListItemDto(item.Id, item.RequestNumber, item.Status.ToString(), item.ProjectReference,
                item.OrganizationId, item.CreatedAt, item.UpdatedAt, item.Version, item.TenantSafeReason,
                item.AssignedToUserId, item.DueAt, item.DueAt != null && item.DueAt < DateTime.UtcNow
                    && item.Status != AssemblyRequestStatus.Completed && item.Status != AssemblyRequestStatus.Cancelled && item.Status != AssemblyRequestStatus.Rejected)).ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, page, pageSize, total);
    }

    [HttpGet("{requestId:guid}")]
    public async Task<DataAssemblyRequestDto> Get(Guid requestId, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await MapAsync(await ReadAsync(requestId, cancellationToken), cancellationToken);
    }

    [HttpPost("{requestId:guid}/begin-intake")]
    public Task<DataAssemblyRequestDto> BeginIntake(Guid requestId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
        => Mutate(requestId, request.Version, item => item.BeginIntakeValidation(), "intake-validation", null, null, cancellationToken);

    [HttpPost("{requestId:guid}/request-changes")]
    public Task<DataAssemblyRequestDto> RequestChanges(Guid requestId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => Mutate(requestId, request.Version, item => item.RequestChanges(request.Reason, request.InternalNote), "changes-requested", request.Reason, request.InternalNote, cancellationToken);

    [HttpPost("{requestId:guid}/accept-intake")]
    public Task<DataAssemblyRequestDto> AcceptIntake(Guid requestId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
        => Mutate(requestId, request.Version, item => item.BeginQuotePreparation(), "quote-preparation", null, null, cancellationToken);

    [HttpPost("{requestId:guid}/reject")]
    public Task<DataAssemblyRequestDto> Reject(Guid requestId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => Mutate(requestId, request.Version, item => item.Reject(request.Reason, request.InternalNote), "rejected", request.Reason, request.InternalNote, cancellationToken);

    [HttpPost("{requestId:guid}/quotes")]
    public async Task<DataAssemblyRequestDto> IssueQuote(Guid requestId, [FromBody] IssueQuoteRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"platform:assembly:{requestId}:quote";
        var replay = await idempotency.ReadAsync<DataAssemblyRequestDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var item = await ReadAsync(requestId, cancellationToken); EnsureVersion(item.Version, request.Version);
        if (item.Status == AssemblyRequestStatus.IntakeValidation) Execute(item.BeginQuotePreparation);
        if (item.Status is not (AssemblyRequestStatus.QuoteInPreparation or AssemblyRequestStatus.QuoteIssued))
            throw Conflict("assembly_quote_not_allowed", "A quote can be issued only after intake validation.");
        if (request.Lines.Count == 0 || request.Lines.Any(line => line.Quantity <= 0 || line.UnitPrice < 0))
            throw Invalid("assembly_quote_lines_invalid", "At least one valid quote line is required.");
        var ids = request.Lines.Select(line => line.CatalogItemId).Distinct().ToList();
        var catalog = await dbContext.QboCatalogItems.AsNoTracking().Where(value => ids.Contains(value.Id) && value.IsActive).ToDictionaryAsync(value => value.Id, cancellationToken);
        if (catalog.Count != ids.Count) throw Invalid("catalog_item_unavailable", "One or more QuickBooks items are unavailable.");
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(value => value.OrganizationId == item.OrganizationId, cancellationToken);
        if (string.IsNullOrWhiteSpace(profile?.QboCustomerId)) throw Conflict("qbo_customer_required", "Link this Partner to QuickBooks before issuing a quote.");
        var now = DateTime.UtcNow; var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(value => value.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        var snapshots = request.Lines.Select(line => new QuoteLineSnapshot(line.CatalogItemId, catalog[line.CatalogItemId].ExternalItemId,
            line.Description.Trim(), line.Quantity, line.UnitPrice)).ToList();
        var subtotal = snapshots.Sum(line => decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero));
        if (!Enum.TryParse<QuotePurpose>(request.Purpose, true, out var purpose)) throw Invalid("quote_purpose_invalid", "The quote purpose is invalid.");
        var quote = new DataAssemblyQuote(item.Id, item.Quotes.Count == 0 ? 1 : item.Quotes.Max(value => value.Revision) + 1,
            purpose, JsonSerializer.Serialize(snapshots, JsonOptions), subtotal, request.Tax, request.Currency, now,
            request.ExpiresAt ?? now.AddDays(config?.QuoteValidityDays ?? 30));
        item.Quotes.Where(value => value.Status is QuoteStatus.Issued or QuoteStatus.SyncPending).OrderByDescending(value => value.Revision).FirstOrDefault()?.Supersede(quote.Id);
        item.Quotes.Add(quote);
        var document = new CommercialDocumentLink(OrderWorkflowTypes.DataAssembly, item.Id, CommercialDocumentKind.Estimate, quote.Total, quote.Currency);
        dbContext.CommercialDocumentLinks.Add(document);
        var payload = new OrderDocumentOutboxPayload(document.Id, quote.Id, profile.QboCustomerId!, item.RequestNumber, null, quote.Currency,
            snapshots.Select(line => new QuickBooksLineRequest(line.ExternalItemId, line.Description, line.Quantity, line.UnitPrice)).ToList());
        dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateEstimate, OrderWorkflowTypes.DataAssembly, item.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(item, cancellationToken); idempotency.Store(actor.Id, scope, key, request, response, StatusCodes.Status202Accepted);
        await dbContext.SaveChangesAsync(cancellationToken); Response.StatusCode = StatusCodes.Status202Accepted; return response;
    }

    [HttpPost("{requestId:guid}/processing-runs")]
    public async Task<DataAssemblyRequestDto> StartProcessing(Guid requestId, [FromBody] AssemblyProcessingRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"platform:assembly:{requestId}:processing";
        var replay = await idempotency.ReadAsync<DataAssemblyRequestDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var item = await ReadAsync(requestId, cancellationToken); EnsureVersion(item.Version, request.Version);
        if (!item.CurrentInputRevisionId.HasValue) throw Conflict("assembly_input_revision_missing", "The accepted input revision is unavailable.");
        var before = item.Status.ToString(); Execute(item.StartProcessing);
        item.ProcessingRuns.Add(new AssemblyProcessingRun(item.Id, item.CurrentInputRevisionId.Value,
            item.ProcessingRuns.Count == 0 ? 1 : item.ProcessingRuns.Max(value => value.RunNumber) + 1,
            request.ProfileVersion, request.PipelineVersion, request.Provenance, DateTime.UtcNow));
        Event(item, before, item.Status.ToString(), actor.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(item, cancellationToken); idempotency.Store(actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken); return response;
    }

    [HttpPost("{requestId:guid}/processing-runs/{runId:guid}/decision")]
    public async Task<DataAssemblyRequestDto> DecideProcessing(Guid requestId, Guid runId, [FromBody] AssemblyProcessingDecisionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var item = await ReadAsync(requestId, cancellationToken); EnsureVersion(item.Version, request.Version);
        var run = item.ProcessingRuns.SingleOrDefault(value => value.Id == runId) ?? throw Missing();
        if (request.Succeeded)
        {
            Execute(() => run.Complete(request.QcStatusOrReason, DateTime.UtcNow)); Execute(item.BeginOutputReview);
            Event(item, "Processing", item.Status.ToString(), actor.Id);
        }
        else
        {
            Execute(() => run.Fail(request.QcStatusOrReason, DateTime.UtcNow));
            Event(item, "Processing", "ProcessingFailed", actor.Id, request.QcStatusOrReason);
        }
        await dbContext.SaveChangesAsync(cancellationToken); return await MapAsync(item, cancellationToken);
    }

    [HttpPost("{requestId:guid}/processing-runs/{runId:guid}/outputs")]
    [RequestSizeLimit(104_857_600)]
    public async Task<OperationalFileDto> UploadOutput(Guid requestId, Guid runId, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var item = await ReadAsync(requestId, cancellationToken);
        if (item.Status != AssemblyRequestStatus.OutputReview || item.ProcessingRuns.All(value => value.Id != runId || value.CompletedAt == null || value.FailureReason != null))
            throw Conflict("assembly_output_not_allowed", "Outputs can be uploaded only for a successful run under output review.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!options.Value.AllowedFileKinds.ContainsKey(extension)) throw Invalid("file_kind_not_allowed", "This output file type is not allowed.");
        StoredOperationalFile stored;
        await using (var stream = file.OpenReadStream()) stored = await fileStorage.SaveAsync(stream, extension, options.Value.MaximumFileBytes, cancellationToken);
        try
        {
            var scan = await fileScanner.ScanAsync(stored.StorageKey, cancellationToken);
            var managed = new ManagedOperationalFile(item.OrganizationId, OrderWorkflowTypes.DataAssembly, item.Id, runId,
                OperationalFilePurpose.AssemblyOutput, file.FileName, extension, file.ContentType ?? "application/octet-stream",
                stored.SizeBytes, stored.Sha256, stored.StorageKey);
            managed.RecordScan(scan.Status, scan.Message); dbContext.ManagedOperationalFiles.Add(managed);
            await dbContext.SaveChangesAsync(cancellationToken); return managed.ToDto();
        }
        catch { await fileStorage.DeleteIfExistsAsync(stored.StorageKey, cancellationToken); throw; }
    }

    [HttpPost("{requestId:guid}/outputs/release")]
    public async Task<DataAssemblyRequestDto> ReleaseOutput(Guid requestId, [FromBody] AssemblyOutputReviewRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"platform:assembly:{requestId}:output-release";
        var replay = await idempotency.ReadAsync<DataAssemblyRequestDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var item = await ReadAsync(requestId, cancellationToken); EnsureVersion(item.Version, request.Version);
        if (item.Status != AssemblyRequestStatus.OutputReview || !item.CurrentInputRevisionId.HasValue) throw Conflict("assembly_output_not_allowed", "The request is not ready for output approval.");
        var run = item.ProcessingRuns.SingleOrDefault(value => value.Id == request.RunId && value.CompletedAt.HasValue && value.FailureReason == null) ?? throw Missing();
        var files = await dbContext.ManagedOperationalFiles.Where(file => file.WorkflowId == item.Id && file.ParentRecordId == run.Id
            && file.Purpose == OperationalFilePurpose.AssemblyOutput && file.ReleaseStatus == FileReleaseStatus.Internal).ToListAsync(cancellationToken);
        if (files.Count == 0 || files.Any(file => file.ScanStatus != OperationalFileScanStatus.Clean)) throw Conflict("assembly_output_files_not_clean", "Every output file must pass scanning before approval.");
        var release = new AssemblyOutputRelease(item.OrganizationId, item.Id, item.CurrentInputRevisionId.Value, run.Id,
            item.OutputReleases.Count == 0 ? 1 : item.OutputReleases.Max(value => value.ReleaseVersion) + 1, request.ManifestJson,
            request.PipelineVersion, request.Provenance, request.QcStatus, DateTime.UtcNow);
        release.MarkReady(holdForPayment: true);
        foreach (var file in files) { file.AttachToParent(release.Id); file.HoldForPayment(); }
        item.OutputReleases.Add(release); Execute(item.MarkOutputAvailable);
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(value => value.OrganizationId == item.OrganizationId, cancellationToken);
        if (string.IsNullOrWhiteSpace(profile?.QboCustomerId)) throw Conflict("qbo_customer_required", "Link this Partner to QuickBooks before approving output.");
        var quote = item.Quotes.SingleOrDefault(value => value.Id == item.AcceptedQuoteId) ?? throw Conflict("accepted_quote_missing", "The accepted assembly quote is unavailable.");
        var estimate = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(value => value.WorkflowType == OrderWorkflowTypes.DataAssembly
            && value.WorkflowId == item.Id && value.Kind == CommercialDocumentKind.Estimate && value.SyncStatus == IntegrationStatus.Succeeded)
            .OrderByDescending(value => value.SynchronizedAt).FirstOrDefaultAsync(cancellationToken);
        var quoteLines = JsonSerializer.Deserialize<List<QuoteLineSnapshot>>(quote.LinesJson, JsonOptions) ?? [];
        var invoice = new CommercialDocumentLink(OrderWorkflowTypes.DataAssembly, item.Id, CommercialDocumentKind.Invoice, quote.Total, quote.Currency);
        dbContext.CommercialDocumentLinks.Add(invoice);
        var payload = new OrderDocumentOutboxPayload(invoice.Id, null, profile.QboCustomerId!, item.RequestNumber, item.PurchaseOrderNumber,
            quote.Currency, quoteLines.Select(line => new QuickBooksLineRequest(line.ExternalItemId, line.Description, line.Quantity, line.UnitPrice)).ToList(), estimate?.ExternalDocumentId);
        dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.CreateInvoice, OrderWorkflowTypes.DataAssembly, item.Id, key, JsonSerializer.Serialize(payload, JsonOptions)));
        Event(item, "OutputReview", item.Status.ToString(), actor.Id); Notice(item, "assembly-output-approved", "Data assembly output approved", $"Outputs for {item.RequestNumber} are approved and will be released after commercial synchronization.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(item, cancellationToken); idempotency.Store(actor.Id, scope, key, request, response, StatusCodes.Status202Accepted);
        await dbContext.SaveChangesAsync(cancellationToken); Response.StatusCode = StatusCodes.Status202Accepted; return response;
    }

    [HttpPost("{requestId:guid}/complete")]
    public async Task<DataAssemblyRequestDto> Complete(Guid requestId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"platform:assembly:{requestId}:complete";
        var replay = await idempotency.ReadAsync<DataAssemblyRequestDto>(actor.Id, scope, key, request, cancellationToken); if (replay != null) return replay;
        var item = await ReadAsync(requestId, cancellationToken); EnsureVersion(item.Version, request.Version);
        if (!item.OutputReleases.Any(value => value.ReleaseStatus == FileReleaseStatus.Released)) throw Conflict("assembly_output_not_released", "Release an eligible assembly output before closing the request.");
        var before = item.Status.ToString(); Execute(() => item.Complete(DateTime.UtcNow)); Event(item, before, item.Status.ToString(), actor.Id);
        await dbContext.SaveChangesAsync(cancellationToken); var response = await MapAsync(item, cancellationToken);
        idempotency.Store(actor.Id, scope, key, request, response); await dbContext.SaveChangesAsync(cancellationToken); return response;
    }

    [HttpPost("{requestId:guid}/hold")]
    public Task<DataAssemblyRequestDto> Hold(Guid requestId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => Mutate(requestId, request.Version, item => item.PutOnHold(request.Reason, request.InternalNote), "hold", request.Reason, request.InternalNote, cancellationToken);

    [HttpPost("{requestId:guid}/release-hold")]
    public Task<DataAssemblyRequestDto> ReleaseHold(Guid requestId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
        => Mutate(requestId, request.Version, item => item.ReleaseHold(request.Reason, request.InternalNote), "hold-released", request.Reason, request.InternalNote, cancellationToken);

    [HttpPost("{requestId:guid}/cancellation-requests/{cancellationId:guid}/decision")]
    public async Task<DataAssemblyRequestDto> DecideCancellation(Guid requestId, Guid cancellationId, [FromBody] CancellationDecisionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var item = await ReadAsync(requestId, cancellationToken); EnsureVersion(item.Version, request.Version);
        var cancellation = await dbContext.OrderCancellationRequests.FirstOrDefaultAsync(value => value.Id == cancellationId
            && value.WorkflowType == OrderWorkflowTypes.DataAssembly && value.WorkflowId == item.Id, cancellationToken) ?? throw Missing();
        if (!Enum.TryParse<CancellationRequestStatus>(request.Status, true, out var decision) || decision == CancellationRequestStatus.Pending)
            throw Invalid("cancellation_decision_invalid", "A final cancellation decision is required.");
        cancellation.Decide(decision, request.Reason, actor.Id, DateTime.UtcNow); var before = item.Status.ToString();
        Execute(() => item.ResolveCancellation(decision is CancellationRequestStatus.Approved or CancellationRequestStatus.PartiallyApproved,
            request.Reason, null)); Event(item, before, item.Status.ToString(), actor.Id, request.Reason);
        await dbContext.SaveChangesAsync(cancellationToken); return await MapAsync(item, cancellationToken);
    }

    private async Task<DataAssemblyRequestDto> Mutate(Guid id, long version, Action<DataAssemblyRequest> mutation,
        string eventName, string? reason, string? internalNote, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var item = await ReadAsync(id, cancellationToken); EnsureVersion(item.Version, version); var before = item.Status.ToString();
        Execute(() => mutation(item)); Event(item, before, item.Status.ToString(), actor.Id, reason, internalNote);
        Notice(item, $"assembly-{eventName}", "Data assembly status changed", reason ?? $"{item.RequestNumber} is now {item.Status}.");
        await dbContext.SaveChangesAsync(cancellationToken); return await MapAsync(item, cancellationToken);
    }

    private async Task<DataAssemblyRequest> ReadAsync(Guid id, CancellationToken cancellationToken)
        => await dbContext.DataAssemblyRequests.Include(item => item.InputRevisions).Include(item => item.Quotes)
            .Include(item => item.ProcessingRuns).Include(item => item.OutputReleases)
            .FirstOrDefaultAsync(item => item.Id == id && !item.IsDiscarded, cancellationToken) ?? throw Missing();

    private async Task<DataAssemblyRequestDto> MapAsync(DataAssemblyRequest item, CancellationToken cancellationToken)
    {
        var files = await dbContext.ManagedOperationalFiles.AsNoTracking().Where(file => file.WorkflowType == OrderWorkflowTypes.DataAssembly && file.WorkflowId == item.Id).OrderBy(file => file.CreatedAt).ToListAsync(cancellationToken);
        var docs = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(value => value.WorkflowType == OrderWorkflowTypes.DataAssembly && value.WorkflowId == item.Id).OrderBy(value => value.CreatedAt).ToListAsync(cancellationToken);
        var cancellations = await dbContext.OrderCancellationRequests.AsNoTracking().Where(value => value.WorkflowType == OrderWorkflowTypes.DataAssembly && value.WorkflowId == item.Id).OrderBy(value => value.CreatedAt).ToListAsync(cancellationToken);
        var timeline = await dbContext.OrderStatusEvents.AsNoTracking().Where(value => value.WorkflowType == OrderWorkflowTypes.DataAssembly && value.WorkflowId == item.Id).OrderBy(value => value.OccurredAt).ToListAsync(cancellationToken);
        return new DataAssemblyRequestDto(item.Id, item.OrganizationId, item.RequestNumber, item.ProjectReference, item.AssemblyProfileId,
            item.AssemblyProfileVersion, item.ProfileNameSnapshot, item.ProfileInstructionsSnapshot, item.MetadataJson, item.RequestedOutput,
            item.ProcessingNotes, item.ProhibitedDataConfirmed, item.Status.ToString(), item.InputRevision, item.PurchaseOrderNumber,
            item.SubmittedAt, item.PlacedAt, item.CompletedAt, item.TenantSafeReason, item.InternalNote, item.CreatedAt, item.UpdatedAt,
            item.Version, false, false, false, false, false, item.InputRevisions.OrderByDescending(value => value.Revision).Select(value => new AssemblyInputRevisionDto(value.Id,
                value.Revision, value.PreviousRevisionId, value.ManifestJson, value.CorrectionReason, value.ValidationSummaryJson, value.SubmittedAt)).ToList(),
            item.Quotes.OrderByDescending(value => value.Revision).Select(value => value.ToDto()).ToList(), item.ProcessingRuns.OrderByDescending(value => value.RunNumber)
                .Select(value => new AssemblyProcessingRunDto(value.Id, value.InputRevisionId, value.RunNumber, value.ProfileVersion, value.PipelineVersion,
                    value.Provenance, value.QcStatus, value.StartedAt, value.CompletedAt, value.FailureReason, value.Version)).ToList(),
            item.OutputReleases.OrderByDescending(value => value.ReleaseVersion).Select(value => new AssemblyOutputReleaseDto(value.Id, value.InputRevisionId,
                value.ProcessingRunId, value.ReleaseVersion, value.ManifestJson, value.PipelineVersion, value.Provenance, value.QcStatus, value.ReleaseStatus.ToString(),
                value.GeneratedAt, value.ReleasedAt, files.Where(file => file.ParentRecordId == value.Id).Select(file => file.ToDto()).ToList(), value.Version)).ToList(),
            files.Where(file => file.Purpose == OperationalFilePurpose.AssemblyInput && file.ReleaseStatus != FileReleaseStatus.Withdrawn).Select(file => file.ToDto()).ToList(),
            docs.Select(value => value.ToDto(true)).ToList(), cancellations.Select(value => value.ToDto()).ToList(), timeline.Select(value => value.ToDto(true)).ToList(),
            item.AssignedToUserId, item.DueAt);
    }

    private void Event(DataAssemblyRequest item, string from, string to, Guid actorId, string? reason = null, string? internalNote = null)
        => dbContext.OrderStatusEvents.Add(new OrderStatusEvent(item.OrganizationId, OrderWorkflowTypes.DataAssembly, item.Id, null, from, to, reason, internalNote, actorId, DateTime.UtcNow));
    private void Notice(DataAssemblyRequest item, string eventType, string subject, string body)
        => dbContext.OrderNotifications.Add(new OrderNotification(item.OrganizationId, null, OrderWorkflowTypes.DataAssembly, item.Id, eventType, subject, body));
    private static void EnsureVersion(long current, long supplied) { if (current != supplied) throw new DbUpdateConcurrencyException(); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("invalid_assembly_action", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("assembly_action_not_allowed", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("assembly_request_not_found", "The requested data-assembly record was not found.", StatusCodes.Status404NotFound);
    private sealed record QuoteLineSnapshot(Guid CatalogItemId, string ExternalItemId, string Description, decimal Quantity, decimal UnitPrice);
}
