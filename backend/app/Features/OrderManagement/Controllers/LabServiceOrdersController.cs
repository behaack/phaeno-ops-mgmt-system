namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/lab-service-orders")]
public sealed class LabServiceOrdersController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency,
    IOperationalFileStorage fileStorage,
    ILabOperationsProvider labOperationsProvider) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<PagedResult<OrderListItemDto>> List(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] DateTime? createdFrom,
        [FromQuery] DateTime? createdTo,
        [FromQuery] Guid? submitterId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.LabServiceOrders.AsNoTracking()
            .Where(order => order.OrganizationId == tenant.Organization.Id && !order.IsDiscarded);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<LabServiceOrderStatus>(status, true, out var parsed))
                throw Invalid("invalid_status", "The requested lab-order status is not valid.");
            query = query.Where(order => order.Status == parsed);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(order => order.OrderNumber.Contains(term)
                || (order.CustomerReference != null && order.CustomerReference.Contains(term))
                || dbContext.LabSamples.Any(sample => sample.LabServiceOrderId == order.Id
                    && (sample.CustomerSampleId.Contains(term) || (sample.AccessionId != null && sample.AccessionId.Contains(term)))));
        }
        if (createdFrom.HasValue) query = query.Where(order => order.CreatedAt >= createdFrom.Value);
        if (createdTo.HasValue) query = query.Where(order => order.CreatedAt < createdTo.Value);
        if (submitterId.HasValue) query = query.Where(order => order.CreatedByUserId == submitterId.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(order => order.UpdatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(order => new OrderListItemDto(order.Id, order.OrderNumber, order.Status.ToString(),
                order.CustomerReference, order.OrganizationId, order.CreatedAt, order.UpdatedAt,
                order.Version, order.TenantSafeReason))
            .ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, page, pageSize, total);
    }

    [HttpGet("export")]
    public async Task<FileContentResult> Export([FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] DateTime? createdFrom, [FromQuery] DateTime? createdTo, [FromQuery] Guid? submitterId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        var query = dbContext.LabServiceOrders.AsNoTracking()
            .Where(order => order.OrganizationId == tenant.Organization.Id && !order.IsDiscarded);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<LabServiceOrderStatus>(status, true, out var parsed))
                throw Invalid("invalid_status", "The requested lab-order status is not valid.");
            query = query.Where(order => order.Status == parsed);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(order => order.OrderNumber.Contains(term)
                || (order.CustomerReference != null && order.CustomerReference.Contains(term))
                || dbContext.LabSamples.Any(sample => sample.LabServiceOrderId == order.Id
                    && (sample.CustomerSampleId.Contains(term) || (sample.AccessionId != null && sample.AccessionId.Contains(term)))));
        }
        if (createdFrom.HasValue) query = query.Where(order => order.CreatedAt >= createdFrom.Value);
        if (createdTo.HasValue) query = query.Where(order => order.CreatedAt < createdTo.Value);
        if (submitterId.HasValue) query = query.Where(order => order.CreatedByUserId == submitterId.Value);
        var items = await query.OrderByDescending(order => order.UpdatedAt).Take(10_000)
            .Select(order => new OrderListItemDto(order.Id, order.OrderNumber, order.Status.ToString(),
                order.CustomerReference, order.OrganizationId, order.CreatedAt, order.UpdatedAt, order.Version, order.TenantSafeReason))
            .ToListAsync(cancellationToken);
        return File(OrderCsvExport.Create(items), "text/csv; charset=utf-8", $"lab-service-orders-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpGet("{orderId:guid}")]
    public async Task<LabServiceOrderDto> Get(Guid orderId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        return await MapAsync(order, tenant.Membership.IsOrganizationAdmin, platform: false, cancellationToken);
    }

    [HttpPost]
    public async Task<LabServiceOrderDto> Create([FromBody] LabOrderWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(tenant.Actor.Id, "lab-order:create", key, request, cancellationToken);
        if (replay != null) return replay;
        await ValidateSamplesAsync(request.Samples, cancellationToken);
        var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        var order = new LabServiceOrder(tenant.Organization.Id, OrderNumberGenerator.Lab(), request.CustomerReference,
            config?.SampleSubmissionInstructions ?? string.Empty);
        AddSamples(order, request.Samples);
        dbContext.LabServiceOrders.Add(order);
        dbContext.OrderStatusEvents.Add(NewEvent(order, "Created", order.Status.ToString(), tenant.Actor.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, "lab-order:create", key, request, response, StatusCodes.Status201Created);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return response;
    }

    [HttpPatch("{orderId:guid}")]
    public async Task<LabServiceOrderDto> Update(Guid orderId, [FromBody] LabOrderWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        await ValidateSamplesAsync(request.Samples, cancellationToken);
        Execute(() => order.UpdateDraft(request.CustomerReference));
        var existingById = order.Samples.ToDictionary(item => item.Id);
        var requestIds = request.Samples.Where(item => item.Id.HasValue).Select(item => item.Id!.Value).ToHashSet();
        var removed = order.Samples.Where(item => !requestIds.Contains(item.Id)).ToList();
        foreach (var sample in removed)
        {
            if (sample.Status != LabSampleStatus.Expected)
                throw Conflict("sample_not_editable", "Only expected samples can be removed from a request.");
            dbContext.LabSamples.Remove(sample);
        }
        foreach (var item in request.Samples)
        {
            if (item.Id.HasValue)
            {
                if (!existingById.TryGetValue(item.Id.Value, out var sample))
                    throw Missing();
                Execute(() => sample.UpdateMetadata(item.CustomerSampleId, item.MaterialType, item.BiologicalSource,
                    item.Quantity, item.QuantityUnit, item.StorageRequirements, item.SafetyDeclaration,
                    item.CollectionDate, item.Concentration, item.Notes, JsonSerializer.Serialize(item.AnalysisDefinitionIds)));
            }
            else
            {
                order.Samples.Add(ToSample(order.Id, item));
            }
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpPost("{orderId:guid}/submit-for-quote")]
    public async Task<LabServiceOrderDto> Submit(Guid orderId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"lab-order:{orderId}:submit";
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        var correctionReason = order.Status == LabServiceOrderStatus.ChangesRequested ? order.TenantSafeReason : null;
        var snapshot = await BuildRequestSnapshotAsync(order, cancellationToken);
        var previousRevisionId = order.Revisions.OrderByDescending(item => item.Revision).Select(item => (Guid?)item.Id).FirstOrDefault();
        var submittedAt = DateTime.UtcNow;
        Execute(() => order.Submit(tenant.Actor.Id, submittedAt));
        order.Revisions.Add(new LabServiceRequestRevision(order.Id, order.RequestRevision, previousRevisionId, snapshot,
            correctionReason, tenant.Actor.Id, submittedAt));
        dbContext.OrderStatusEvents.Add(NewEvent(order, before, order.Status.ToString(), tenant.Actor.Id));
        QueueNotice(order, "lab-request-submitted", "Laboratory service request submitted", $"{order.OrderNumber} was submitted for pricing.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken);
        return response;
    }

    [HttpPost("{orderId:guid}/withdraw")]
    public async Task<LabServiceOrderDto> Withdraw(Guid orderId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(() => order.WithdrawOrCancel(request.Reason));
        dbContext.OrderStatusEvents.Add(NewEvent(order, before, order.Status.ToString(), tenant.Actor.Id, request.Reason));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpPost("{orderId:guid}/quotes/{quoteId:guid}/accept")]
    public async Task<LabServiceOrderDto> AcceptQuote(Guid orderId, Guid quoteId, [FromBody] AcceptQuoteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        if (request.QuoteId != quoteId) throw Invalid("quote_mismatch", "The quote identifier does not match the route.");
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"lab-order:{orderId}:quote:{quoteId}:accept";
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        var quote = order.Quotes.SingleOrDefault(item => item.Id == quoteId) ?? throw Missing();
        var before = order.Status.ToString();
        Execute(() => quote.Accept(tenant.Actor.Id, DateTime.UtcNow));
        Execute(() => order.AcceptQuote(quoteId, DateTime.UtcNow));
        var authorizationId = Guid.NewGuid();
        var commandId = Guid.NewGuid();
        var metadata = new LabOperationsCommandMetadata(
            commandId, authorizationId, DateTime.UtcNow);
        var command = new AuthorizeLabWorkCommand(
            metadata,
            authorizationId,
            1,
            LabWorkAuthorizationSource.CommercialOrder,
            order.Id,
            order.OrganizationId,
            "pseq-lab-service",
            1,
            "quoted-turnaround",
            order.OrderNumber,
            order.Samples.Select(sample => new AuthorizedSpecimen(
                sample.Id,
                sample.CustomerSampleId,
                sample.MaterialType,
                sample.BiologicalSource,
                sample.Quantity,
                sample.QuantityUnit,
                sample.StorageRequirements,
                sample.SafetyDeclaration,
                sample.CollectionDate,
                sample.Concentration,
                sample.Notes,
                JsonSerializer.Deserialize<List<Guid>>(sample.AnalysisDefinitionIdsJson, JsonSerializerOptions)
                    ?.Select(id => id.ToString()).ToList() ?? [])).ToList());
        var authorization = new CommercialLabAuthorization(
            authorizationId, order.Id, order.OrganizationId, 1, commandId,
            JsonSerializer.Serialize(command, JsonSerializerOptions));
        dbContext.CommercialLabAuthorizations.Add(authorization);
        var acknowledgment = await labOperationsProvider.AuthorizeWorkAsync(command, cancellationToken);
        authorization.RecordOutcome(
            acknowledgment.LabWorkOrderId,
            acknowledgment.Disposition.ToString(),
            acknowledgment.ReasonCode);
        if (acknowledgment.Disposition is not (LabCommandDisposition.Accepted or LabCommandDisposition.AlreadyApplied))
        {
            throw Conflict(
                "lab_authorization_failed",
                "The order could not be authorized for laboratory work. No quote acceptance was recorded.");
        }
        dbContext.OrderStatusEvents.Add(NewEvent(order, before, order.Status.ToString(), tenant.Actor.Id));
        QueueNotice(order, "lab-quote-accepted", "Laboratory quote accepted", $"{order.OrderNumber} is now placed and awaiting samples.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return response;
    }

    [HttpPost("{orderId:guid}/cancellation-requests")]
    public async Task<LabServiceOrderDto> RequestCancellation(Guid orderId, [FromBody] CancellationRequestBody request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var scope = $"lab-order:{orderId}:cancellation";
        var replay = await idempotency.ReadAsync<LabServiceOrderDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        var before = order.Status.ToString();
        Execute(order.RequestCancellation);
        dbContext.OrderCancellationRequests.Add(new OrderCancellationRequest(order.OrganizationId, OrderWorkflowTypes.LabService,
            order.Id, tenant.Actor.Id, request.Reason, request.ScopeJson));
        dbContext.OrderStatusEvents.Add(NewEvent(order, before, order.Status.ToString(), tenant.Actor.Id, request.Reason));
        QueueNotice(order, "lab-cancellation-requested", "Laboratory cancellation requested", $"A cancellation decision is required for {order.OrderNumber}.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken);
        return response;
    }

    [HttpPut("{orderId:guid}/samples/{sampleId:guid}/shipment")]
    public async Task<LabServiceOrderDto> RecordShipment(Guid orderId, Guid sampleId, [FromBody] SampleShipmentRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        Execute(() => sample.RecordCustomerShipment(request.Carrier, request.TrackingNumber, request.ShippedAt));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpGet("{orderId:guid}/samples/{sampleId:guid}/results")]
    public async Task<IReadOnlyList<OperationalFileDto>> ListResults(Guid orderId, Guid sampleId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        var exists = await dbContext.LabSamples.AsNoTracking().AnyAsync(sample => sample.Id == sampleId
            && sample.LabServiceOrderId == orderId
            && dbContext.LabServiceOrders.Any(order => order.Id == orderId && order.OrganizationId == tenant.Organization.Id), cancellationToken);
        if (!exists) throw Missing();
        return await dbContext.ManagedOperationalFiles.AsNoTracking()
            .Where(file => file.OrganizationId == tenant.Organization.Id && file.WorkflowId == orderId
                && file.ParentRecordId == sampleId && file.Purpose == OperationalFilePurpose.LabResult
                && file.ReleaseStatus == FileReleaseStatus.Released && file.ScanStatus == OperationalFileScanStatus.Clean)
            .OrderByDescending(file => file.ReleasedAt).Select(file => file.ToDto()).ToListAsync(cancellationToken);
    }

    [HttpGet("{orderId:guid}/results/{artifactId:guid}/download")]
    [SkipApiEnvelope]
    public async Task<IActionResult> Download(Guid orderId, Guid artifactId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        var file = await dbContext.ManagedOperationalFiles.FirstOrDefaultAsync(item => item.Id == artifactId
            && item.WorkflowId == orderId && item.OrganizationId == tenant.Organization.Id
            && item.Purpose == OperationalFilePurpose.LabResult && item.ReleaseStatus == FileReleaseStatus.Released
            && item.ScanStatus == OperationalFileScanStatus.Clean, cancellationToken) ?? throw Missing();
        var stream = await fileStorage.OpenReadAsync(file.StorageKey, cancellationToken);
        try
        {
            dbContext.OperationalFileDownloads.Add(new OperationalFileDownload(file.Id, tenant.Organization.Id,
                tenant.Actor.Id, DateTime.UtcNow, HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString()));
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await stream.DisposeAsync();
            throw;
        }
        return File(stream, file.ContentType, file.FileName, enableRangeProcessing: true);
    }

    private async Task<LabServiceOrder> ReadOrderAsync(Guid orderId, Guid organizationId, CancellationToken cancellationToken)
        => await dbContext.LabServiceOrders.Include(order => order.Samples).Include(order => order.Quotes).Include(order => order.Revisions)
            .FirstOrDefaultAsync(order => order.Id == orderId && order.OrganizationId == organizationId && !order.IsDiscarded, cancellationToken)
            ?? throw Missing();

    private async Task ValidateSamplesAsync(IReadOnlyList<LabSampleWriteRequest> samples, CancellationToken cancellationToken)
    {
        if (samples.Count == 0) throw Invalid("sample_required", "At least one sample is required.");
        if (samples.Count > 100) throw Invalid("sample_limit", "A laboratory request cannot contain more than 100 samples.");
        if (samples.Select(item => item.CustomerSampleId.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != samples.Count)
            throw Invalid("duplicate_customer_sample_id", "Customer sample identifiers must be unique within the request.");
        var ids = samples.SelectMany(item => item.AnalysisDefinitionIds).Distinct().ToList();
        if (ids.Count == 0) throw Invalid("analysis_required", "Select at least one analysis for every sample.");
        if (samples.Any(item => item.AnalysisDefinitionIds.Count == 0))
            throw Invalid("analysis_required", "Select at least one analysis for every sample.");
        var activeCount = await dbContext.AnalysisDefinitions.AsNoTracking().CountAsync(item => ids.Contains(item.Id) && item.IsActive && !item.IsSynthetic, cancellationToken);
        if (activeCount != ids.Count) throw Invalid("analysis_unavailable", "One or more selected analyses are no longer available.");
    }

    private static void AddSamples(LabServiceOrder order, IReadOnlyList<LabSampleWriteRequest> samples)
    {
        foreach (var item in samples) order.Samples.Add(ToSample(order.Id, item));
    }

    private static LabSample ToSample(Guid orderId, LabSampleWriteRequest item) => new(orderId, item.CustomerSampleId,
        item.MaterialType, item.BiologicalSource, item.Quantity, item.QuantityUnit, item.StorageRequirements,
        item.SafetyDeclaration, item.CollectionDate, item.Concentration, item.Notes,
        JsonSerializer.Serialize(item.AnalysisDefinitionIds), item.ReplacementForSampleId);

    private async Task<LabServiceOrderDto> MapAsync(LabServiceOrder order, bool canManage, bool platform, CancellationToken cancellationToken)
    {
        var files = await dbContext.ManagedOperationalFiles.AsNoTracking().Where(file => file.WorkflowId == order.Id
            && file.WorkflowType == OrderWorkflowTypes.LabService && (platform || file.ReleaseStatus == FileReleaseStatus.Released))
            .OrderBy(file => file.CreatedAt).ToListAsync(cancellationToken);
        var releases = await dbContext.LabResultReleases.AsNoTracking().Where(release => release.LabServiceOrderId == order.Id
            && (platform || release.ReleaseStatus != FileReleaseStatus.Internal))
            .OrderBy(release => release.GeneratedAt).ToListAsync(cancellationToken);
        var documents = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id)
            .OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var cancellationRequests = await dbContext.OrderCancellationRequests.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id)
            .OrderBy(item => item.CreatedAt).ToListAsync(cancellationToken);
        var timeline = await dbContext.OrderStatusEvents.AsNoTracking().Where(item => item.WorkflowType == OrderWorkflowTypes.LabService && item.WorkflowId == order.Id)
            .OrderBy(item => item.OccurredAt).ToListAsync(cancellationToken);
        var authorization = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.CommercialOrderId == order.Id, cancellationToken);
        var projection = authorization is null ? null : await dbContext.CommercialLabWorkProjections.AsNoTracking()
            .SingleOrDefaultAsync(item => item.AuthorizationId == authorization.AuthorizationId, cancellationToken);
        var editable = order.Status is LabServiceOrderStatus.DraftRequest or LabServiceOrderStatus.ChangesRequested;
        return new LabServiceOrderDto(order.Id, order.OrganizationId, order.OrderNumber, order.CustomerReference,
            order.SubmissionInstructionsSnapshot, order.Status.ToString(), order.RequestRevision, order.SubmittedAt,
            order.PlacedAt, order.CompletedAt, order.TenantSafeReason, platform ? order.InternalNote : null,
            order.CreatedAt, order.UpdatedAt, order.Version,
            canManage && editable, canManage && editable, canManage && order.Status == LabServiceOrderStatus.QuoteIssued,
            canManage && order.Status is LabServiceOrderStatus.DraftRequest or LabServiceOrderStatus.SubmittedForQuote
                or LabServiceOrderStatus.ChangesRequested or LabServiceOrderStatus.QuoteInPreparation or LabServiceOrderStatus.QuoteIssued,
            canManage && order.Status is LabServiceOrderStatus.PlacedAwaitingSamples or LabServiceOrderStatus.InProgress or LabServiceOrderStatus.ResultsAvailable,
            order.Samples.OrderBy(item => item.CreatedAt).Select(item => item.ToDto(platform)).ToList(),
            order.Quotes.OrderByDescending(item => item.Revision).Select(item => item.ToDto()).ToList(),
            releases.Select(item => item.ToDto()).ToList(), files.Select(item => item.ToDto()).ToList(), documents.Select(item => item.ToDto(platform)).ToList(),
            cancellationRequests.Select(item => item.ToDto()).ToList(), timeline.Select(item => item.ToDto(platform)).ToList(),
            RequestRevisions: order.Revisions.OrderByDescending(item => item.Revision).Select(item => new LabRequestRevisionDto(item.Id,
                item.Revision, item.PreviousRevisionId, item.SnapshotJson, item.CorrectionReason, item.SubmittedByUserId, item.SubmittedAt)).ToList(),
            LabMilestone: projection?.Milestone,
            LabScheduleHealth: projection?.ScheduleHealth,
            LabExpectedCompletionAtUtc: projection?.ExpectedCompletionAtUtc,
            LabCustomerActionCount: projection?.ActiveCustomerActionCount ?? 0,
            LabCustomerActionSummary: projection?.CustomerSafeSummary,
            LabPermittedQcProjectionJson: projection?.PermittedQcProjectionJson,
            LabReadyForRelease: projection?.Milestone == "ReadyForRelease");
    }

    private async Task<string> BuildRequestSnapshotAsync(LabServiceOrder order, CancellationToken cancellationToken)
    {
        var analysisIds = order.Samples.SelectMany(item => AnalysisIds(item.AnalysisDefinitionIdsJson)).Distinct().ToList();
        var analyses = await dbContext.AnalysisDefinitions.AsNoTracking().Where(item => analysisIds.Contains(item.Id))
            .Select(item => new { item.Id, item.Name, item.Description, item.SubmissionInstructions, item.RequiredIntakeFieldsJson,
                item.ResultContractJson, item.Version }).ToListAsync(cancellationToken);
        return JsonSerializer.Serialize(new
        {
            order.CustomerReference,
            submissionInstructions = order.SubmissionInstructionsSnapshot,
            samples = order.Samples.OrderBy(item => item.CreatedAt).Select(item => new
            {
                item.Id, item.CustomerSampleId, item.MaterialType, item.BiologicalSource, item.Quantity, item.QuantityUnit,
                item.StorageRequirements, item.SafetyDeclaration, item.CollectionDate, item.Concentration, item.Notes,
                analysisDefinitionIds = AnalysisIds(item.AnalysisDefinitionIdsJson), item.ReplacementForSampleId
            }),
            analyses
        }, JsonSerializerOptions);
    }

    private static IReadOnlyList<Guid> AnalysisIds(string value)
    {
        try { return JsonSerializer.Deserialize<List<Guid>>(value, JsonSerializerOptions) ?? []; }
        catch (JsonException) { return []; }
    }

    private void QueueNotice(LabServiceOrder order, string eventType, string subject, string body)
        => dbContext.OrderNotifications.Add(new OrderNotification(order.OrganizationId, null, OrderWorkflowTypes.LabService, order.Id, eventType, subject, body));

    private static OrderStatusEvent NewEvent(LabServiceOrder order, string from, string to, Guid actorId, string? reason = null, string? internalNote = null)
        => new(order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, null, from, to, reason, internalNote, actorId, DateTime.UtcNow);

    private static void EnsureVersion(long current, long? supplied)
    {
        if (!supplied.HasValue || current != supplied.Value) throw new DbUpdateConcurrencyException();
    }

    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("invalid_order_action", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("order_action_not_allowed", exception.Message); }
    }

    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("lab_order_not_found", "The requested laboratory order was not found.", StatusCodes.Status404NotFound);
}
