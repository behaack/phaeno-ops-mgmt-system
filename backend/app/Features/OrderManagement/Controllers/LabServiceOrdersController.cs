namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
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
    ILabOperationsProvider labOperationsProvider,
    ReleasedDeliverableDownloadAttemptService downloadAttempts,
    ReleasedDeliverableDownloadProjectionService downloadProjections,
    ILogger<CompletionTrackedFileStreamResult> fileDownloadLogger,
    ILogger<CompletionTrackedArchiveResult> archiveDownloadLogger) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);
    private const string StandardLabServiceKey = "pseq-lab-service";
    private const string StandardMaterialType = "extracted_rna";
    private const string StandardQuantityUnit = "tube";

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
        var normalizedJobName = NormalizeJobName(request.CustomerReference);
        await EnsureUniqueJobNameAsync(tenant.Organization.Id, normalizedJobName, null, cancellationToken);
        if (request.Samples.Count != 0)
            throw Invalid("samples_before_pricing", "Samples cannot be entered until the Job price is accepted.");
        var sourceGroups = ValidatePricingProfile(request.RequestedSpecimenCount, request.SourceGroups);
        var config = await dbContext.OrderSystemConfigurations.AsNoTracking().OrderBy(item => item.CreatedAt).FirstOrDefaultAsync(cancellationToken);
        var order = new LabServiceOrder(tenant.Organization.Id, await GenerateUniqueJobNumberAsync(cancellationToken), request.CustomerReference,
            request.Description,
            request.RequestedSpecimenCount,
            sourceGroups.Count > 1,
            sourceGroups.Count == 1 ? sourceGroups[0].BiologicalSource : null,
            request.StorageRequirements,
            request.SafetyDeclaration,
            config?.SampleSubmissionInstructions ?? string.Empty);
        foreach (var group in sourceGroups)
            order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, group.BiologicalSource, group.SpecimenCount));
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
        var normalizedJobName = NormalizeJobName(request.CustomerReference);
        await EnsureUniqueJobNameAsync(tenant.Organization.Id, normalizedJobName, order.Id, cancellationToken);
        if (request.Samples.Count != 0)
            throw Invalid("samples_before_pricing", "Samples cannot be entered until the Job price is accepted.");
        var sourceGroups = ValidatePricingProfile(request.RequestedSpecimenCount, request.SourceGroups);
        Execute(() => order.UpdateDraft(
            request.CustomerReference,
            request.Description,
            request.RequestedSpecimenCount,
            sourceGroups.Count > 1,
            sourceGroups.Count == 1 ? sourceGroups[0].BiologicalSource : null,
            request.StorageRequirements,
            request.SafetyDeclaration));
        var existingSourceGroups = order.SourceGroups
            .ToDictionary(group => group.NormalizedBiologicalSource, StringComparer.Ordinal);
        foreach (var group in sourceGroups)
        {
            var normalizedSource = LabServiceSourceGroup.Normalize(group.BiologicalSource);
            if (existingSourceGroups.Remove(normalizedSource, out var existingSourceGroup))
            {
                existingSourceGroup.Update(group.BiologicalSource, group.SpecimenCount);
                continue;
            }

            var sourceGroup = new LabServiceSourceGroup(order.Id, group.BiologicalSource, group.SpecimenCount);
            dbContext.LabServiceSourceGroups.Add(sourceGroup);
            order.SourceGroups.Add(sourceGroup);
        }
        foreach (var removedSourceGroup in existingSourceGroups.Values)
        {
            dbContext.LabServiceSourceGroups.Remove(removedSourceGroup);
            order.SourceGroups.Remove(removedSourceGroup);
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
        var revision = new LabServiceRequestRevision(order.Id, order.RequestRevision, previousRevisionId, snapshot,
            correctionReason, tenant.Actor.Id, submittedAt);
        dbContext.LabServiceRequestRevisions.Add(revision);
        order.Revisions.Add(revision);
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
        var quote = order.Quotes.SingleOrDefault(item => item.Id == quoteId) ?? throw Missing();
        var before = order.Status.ToString();
        var acceptedAt = DateTime.UtcNow;
        var placementSnapshot = JsonSerializer.Serialize(new
        {
            order.RequestedSpecimenCount,
            sourceGroups = order.SourceGroups.OrderBy(group => group.BiologicalSource).Select(group => new
            {
                group.BiologicalSource,
                group.SpecimenCount
            }),
            order.StorageRequirements,
            order.SafetyDeclaration,
            serviceKey = StandardLabServiceKey,
            materialType = StandardMaterialType,
            quantityUnit = StandardQuantityUnit,
            quoteId = quote.Id,
            quote.Revision,
            quote.LinesJson,
            quote.Total,
            quote.Currency,
            acceptedAt
        }, JsonSerializerOptions);
        Execute(() => quote.Accept(tenant.Actor.Id, acceptedAt));
        Execute(() => order.AcceptQuote(quoteId, acceptedAt, placementSnapshot));
        dbContext.OrderStatusEvents.Add(NewEvent(order, before, order.Status.ToString(), tenant.Actor.Id));
        QueueNotice(order, "lab-quote-accepted", "Laboratory quote accepted", $"{order.OrderNumber} is now placed and awaiting samples.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(order, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken);
        return response;
    }

    [HttpGet("{orderId:guid}/samples/template.csv")]
    public async Task<FileContentResult> DownloadSampleTemplate(Guid orderId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        if (order.Status != LabServiceOrderStatus.PlacedAwaitingSamples)
            throw Conflict("sample_template_not_available", "The sample-list template is available after the Job price is accepted.");
        var builder = new StringBuilder("customer_sample_id,biological_source,tube_count\r\n");
        foreach (var group in order.SourceGroups.OrderBy(group => group.BiologicalSource))
            for (var index = 0; index < group.SpecimenCount; index++)
                builder.Append(',').Append(Csv(group.BiologicalSource)).Append(',').Append("\r\n");
        return File(new UTF8Encoding(true).GetBytes(builder.ToString()), "text/csv; charset=utf-8",
            $"{order.OrderNumber}-sample-list.csv");
    }

    [HttpPost("{orderId:guid}/samples")]
    public async Task<LabServiceOrderDto> AddSample(Guid orderId, [FromBody] LabSampleRosterWriteRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.OrderVersion);
        Execute(order.EnsureSampleRosterEditable);
        if (order.Samples.Count >= order.RequestedSpecimenCount)
            throw Conflict("sample_count_exceeded", $"This accepted Job allows exactly {order.RequestedSpecimenCount} samples.");
        EnsureUniqueSampleId(order, request.CustomerSampleId, null);
        var sample = ToRosterSample(order, request);
        dbContext.LabSamples.Add(sample);
        order.Samples.Add(sample);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpPatch("{orderId:guid}/samples/{sampleId:guid}")]
    public async Task<LabServiceOrderDto> UpdateSample(Guid orderId, Guid sampleId,
        [FromBody] LabSampleRosterWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        Execute(order.EnsureSampleRosterEditable);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        EnsureUniqueSampleId(order, request.CustomerSampleId, sample.Id);
        Execute(() => sample.UpdateMetadata(request.CustomerSampleId, StandardMaterialType,
            ResolveRosterSource(order, request.BiologicalSource), request.TubeCount, StandardQuantityUnit,
            order.StorageRequirements, order.SafetyDeclaration, request.CollectionDate, request.Concentration,
            request.Notes, sample.AnalysisDefinitionIdsJson));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpDelete("{orderId:guid}/samples/{sampleId:guid}")]
    public async Task<LabServiceOrderDto> DeleteSample(Guid orderId, Guid sampleId,
        [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        var isLegacyDraftCleanup = order.Status is LabServiceOrderStatus.DraftRequest
            or LabServiceOrderStatus.ChangesRequested;
        if (!isLegacyDraftCleanup) Execute(order.EnsureSampleRosterEditable);
        var sample = order.Samples.SingleOrDefault(item => item.Id == sampleId) ?? throw Missing();
        EnsureVersion(sample.Version, request.Version);
        dbContext.LabSamples.Remove(sample);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpPost("{orderId:guid}/samples/import-preview")]
    [RequestSizeLimit(2_000_000)]
    public async Task<LabSampleImportPreviewDto> PreviewSampleImport(Guid orderId, [FromForm] IFormFile file,
        [FromForm] long version, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, version);
        Execute(order.EnsureSampleRosterEditable);
        if (!string.Equals(Path.GetExtension(file.FileName), ".csv", StringComparison.OrdinalIgnoreCase))
            throw Invalid("sample_csv_required", "Upload a comma-delimited .csv file.");
        if (file.Length is < 1 or > 1_000_000)
            throw Invalid("sample_csv_size_invalid", "The sample CSV must be between 1 byte and 1 MB.");
        byte[] bytes;
        await using (var stream = new MemoryStream())
        {
            await file.CopyToAsync(stream, cancellationToken);
            bytes = stream.ToArray();
        }
        var result = LabSampleCsvParser.Parse(bytes, order);
        var expiresAt = DateTime.UtcNow.AddMinutes(30);
        var preview = new LabSampleImportPreview(order.Id, order.OrganizationId, tenant.Actor.Id,
            Convert.ToHexString(SHA256.HashData(bytes)),
            JsonSerializer.Serialize(result.Rows, JsonSerializerOptions),
            JsonSerializer.Serialize(result.Errors, JsonSerializerOptions),
            result.Rows.Count, result.BlankRowCount, expiresAt);
        dbContext.LabSampleImportPreviews.Add(preview);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new LabSampleImportPreviewDto(preview.Id, result.Rows.Count, result.BlankRowCount,
            result.Rows, result.Errors, result.SourceCounts, expiresAt);
    }

    [HttpPost("{orderId:guid}/samples/import-previews/{previewId:guid}/confirm")]
    public async Task<LabServiceOrderDto> ConfirmSampleImport(Guid orderId, Guid previewId,
        [FromBody] ConfirmLabSampleImportRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        Execute(order.EnsureSampleRosterEditable);
        var preview = await dbContext.LabSampleImportPreviews.SingleOrDefaultAsync(item => item.Id == previewId
            && item.LabServiceOrderId == order.Id && item.OrganizationId == order.OrganizationId
            && item.ActorUserId == tenant.Actor.Id, cancellationToken) ?? throw Missing();
        var errors = JsonSerializer.Deserialize<List<LabSampleImportErrorDto>>(preview.ErrorsJson, JsonSerializerOptions) ?? [];
        if (errors.Count != 0)
            throw Conflict("sample_import_has_errors", "Correct every preview error before replacing the sample list.");
        var rows = JsonSerializer.Deserialize<List<LabSampleImportRowDto>>(preview.RowsJson, JsonSerializerOptions) ?? [];
        Execute(() => preview.Confirm(DateTime.UtcNow));
        dbContext.LabSamples.RemoveRange(order.Samples);
        order.Samples.Clear();
        foreach (var row in rows)
        {
            var sample = ToRosterSample(order, new LabSampleRosterWriteRequest(
                row.CustomerSampleId, row.BiologicalSource, row.TubeCount));
            dbContext.LabSamples.Add(sample);
            order.Samples.Add(sample);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
    }

    [HttpPost("{orderId:guid}/samples/finalize")]
    public async Task<LabServiceOrderDto> FinalizeSampleRoster(Guid orderId, [FromBody] VersionRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, true, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        EnsureVersion(order.Version, request.Version);
        Execute(() => order.FinalizeSampleRoster(tenant.Actor.Id, DateTime.UtcNow));
        if (await dbContext.CommercialLabAuthorizations.AnyAsync(item => item.CommercialOrderId == order.Id, cancellationToken))
            throw Conflict("lab_authorization_exists", "Laboratory work has already been authorized for this Job.");

        var shipping = await ResolveShippingConfigurationAsync(cancellationToken);
        var authorizationId = Guid.NewGuid();
        var commandId = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var command = new AuthorizeLabWorkCommand(
            new LabOperationsCommandMetadata(commandId, authorizationId, now),
            authorizationId, 1, LabWorkAuthorizationSource.CommercialOrder, order.Id,
            order.OrganizationId, StandardLabServiceKey, 1, "quoted-turnaround", order.OrderNumber,
            order.Samples.Select(sample => new AuthorizedSpecimen(
                sample.Id, sample.CustomerSampleId, sample.MaterialType, sample.BiologicalSource,
                sample.Quantity, sample.QuantityUnit, sample.StorageRequirements, sample.SafetyDeclaration,
                sample.CollectionDate, sample.Concentration, sample.Notes, [StandardLabServiceKey])).ToList());
        var authorization = new CommercialLabAuthorization(authorizationId, order.Id, order.OrganizationId, 1,
            commandId, JsonSerializer.Serialize(command, JsonSerializerOptions));
        dbContext.CommercialLabAuthorizations.Add(authorization);
        var acknowledgment = await labOperationsProvider.AuthorizeWorkAsync(command, cancellationToken);
        authorization.RecordOutcome(acknowledgment.LabWorkOrderId, acknowledgment.Disposition.ToString(), acknowledgment.ReasonCode);
        if (acknowledgment.Disposition is not (LabCommandDisposition.Accepted or LabCommandDisposition.AlreadyApplied))
            throw Conflict("lab_authorization_failed", "The sample list could not be authorized for laboratory work. Nothing was finalized.");
        if (!acknowledgment.LabWorkOrderId.HasValue)
            throw Conflict("lab_authorization_failed", "Laboratory work authorization did not return a work-order reference. Nothing was finalized.");

        var shipment = new SampleShipment(
            ($"SHP-{now:yyyyMMdd}-{Guid.NewGuid():N}")[..24].ToUpperInvariant(), order.OrganizationId,
            SampleShipmentAuthorizationSource.CustomerLabServiceOrder, order.Id, order.OrderNumber,
            order.CustomerReference, acknowledgment.LabWorkOrderId.Value, shipping.Destination.Id);
        foreach (var sample in order.Samples.OrderBy(sample => sample.CreatedAt))
        {
            var item = new SampleShipmentItem(shipment.Id, sample.Id, shipping.SampleType.Id,
                sample.CustomerSampleId, sample.CustomerSampleId, sample.Quantity, sample.QuantityUnit);
            for (var ordinal = 1; ordinal <= decimal.ToInt32(sample.Quantity); ordinal++)
                item.TubeSlots.Add(new SampleShipmentTubeSlot(item.Id, ordinal));
            shipment.Items.Add(item);
        }
        dbContext.SampleShipments.Add(shipment);
        dbContext.OrderStatusEvents.Add(NewEvent(order, order.Status.ToString(), order.Status.ToString(), tenant.Actor.Id,
            "Sample list finalized"));
        QueueNotice(order, "lab-sample-roster-finalized", "Sample list finalized",
            $"{order.OrderNumber} is ready for Phaeno to prepare the return kit.");
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await MapAsync(order, true, false, cancellationToken);
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
        var release = (await dbContext.LabResultReleases.AsNoTracking()
                .Where(item => item.LabServiceOrderId == orderId
                    && item.OrganizationId == tenant.Organization.Id
                    && item.ReleaseStatus == FileReleaseStatus.Released)
                .OrderByDescending(item => item.ReleaseVersion)
                .ToListAsync(cancellationToken))
            .FirstOrDefault(item => ReleasedDeliverableManifest.ReadFileIds(item.ManifestJson).Contains(file.Id))
            ?? throw Missing();
        var utcNow = DateTime.UtcNow;
        var transfer = await downloadAttempts.StartAsync(
            [file],
            tenant.Organization.Id,
            tenant.Actor.Id,
            ReleasedDeliverablePackageType.LabResult,
            release.Id,
            OperationalFileDownloadScope.IndividualFile,
            utcNow,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString(),
            cancellationToken);
        Stream stream;
        try
        {
            stream = await fileStorage.OpenReadAsync(file.StorageKey, cancellationToken);
        }
        catch (OperationCanceledException) when (HttpContext.RequestAborted.IsCancellationRequested)
        {
            await downloadAttempts.CompleteAsync(
                transfer.AttemptIds,
                OperationalFileDownloadOutcome.Cancelled,
                DateTime.UtcNow,
                "request_cancelled_before_stream",
                false,
                CancellationToken.None);
            throw;
        }
        catch
        {
            await downloadAttempts.CompleteAsync(
                transfer.AttemptIds,
                OperationalFileDownloadOutcome.Failed,
                DateTime.UtcNow,
                "storage_open_failed",
                false,
                CancellationToken.None);
            throw;
        }
        return new CompletionTrackedFileStreamResult(
            stream,
            file.ContentType,
            file.FileName,
            Request.Headers.ContainsKey(HeaderNames.Range),
            transfer,
            downloadAttempts,
            fileDownloadLogger);
    }

    [HttpGet("{orderId:guid}/results/releases/{releaseId:guid}/download")]
    [SkipApiEnvelope]
    public async Task<IActionResult> DownloadRelease(
        Guid orderId,
        Guid releaseId,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(
            HttpContext,
            OrganizationKind.Customer,
            false,
            cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant.Organization.Id, cancellationToken);
        var release = await dbContext.LabResultReleases.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == releaseId
                && item.LabServiceOrderId == orderId
                && item.OrganizationId == tenant.Organization.Id
                && item.ReleaseStatus == FileReleaseStatus.Released, cancellationToken)
            ?? throw Missing();
        var fileIds = ReleasedDeliverableManifest.ReadFileIds(release.ManifestJson).ToList();
        var files = await dbContext.ManagedOperationalFiles
            .Where(file => fileIds.Contains(file.Id)
                && file.OrganizationId == tenant.Organization.Id
                && file.WorkflowId == orderId
                && file.Purpose == OperationalFilePurpose.LabResult
                && file.ReleaseStatus == FileReleaseStatus.Released
                && file.ScanStatus == OperationalFileScanStatus.Clean)
            .ToListAsync(cancellationToken);
        if (fileIds.Count == 0 || files.Count != fileIds.Count) throw Missing();

        var utcNow = DateTime.UtcNow;
        var transfer = await downloadAttempts.StartAsync(
            files,
            tenant.Organization.Id,
            tenant.Actor.Id,
            ReleasedDeliverablePackageType.LabResult,
            release.Id,
            OperationalFileDownloadScope.PackageArchive,
            utcNow,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString(),
            cancellationToken);
        return new CompletionTrackedArchiveResult(
            files.Select(file => new ReleasedDeliverableArchiveFile(
                file.Id,
                file.StorageKey,
                file.FileName,
                file.ReleasedAt)).ToList(),
            $"{order.OrderNumber}-results-r{release.ReleaseVersion}.zip",
            transfer,
            fileStorage,
            downloadAttempts,
            archiveDownloadLogger);
    }

    private async Task<LabServiceOrder> ReadOrderAsync(Guid orderId, Guid organizationId, CancellationToken cancellationToken)
        => await dbContext.LabServiceOrders.Include(order => order.Samples).Include(order => order.SourceGroups)
            .Include(order => order.Quotes).Include(order => order.Revisions)
            .FirstOrDefaultAsync(order => order.Id == orderId && order.OrganizationId == organizationId && !order.IsDiscarded, cancellationToken)
            ?? throw Missing();

    private static IReadOnlyList<LabServiceSourceGroupWriteRequest> ValidatePricingProfile(
        int requestedSpecimenCount,
        IReadOnlyList<LabServiceSourceGroupWriteRequest>? requestedGroups)
    {
        if (requestedSpecimenCount is < 1 or > 100)
            throw Invalid("requested_specimen_count_invalid", "Requested specimen count must be between 1 and 100.");
        var groups = requestedGroups?.ToList() ?? [];
        if (groups.Count == 0)
            throw Invalid("biological_source_required", "Add at least one biological-source group.");
        if (groups.Any(group => group.SpecimenCount < 1 || string.IsNullOrWhiteSpace(group.BiologicalSource)))
            throw Invalid("biological_source_invalid", "Every biological-source group needs a source and a positive sample count.");
        if (groups.Sum(group => group.SpecimenCount) != requestedSpecimenCount)
            throw Invalid("biological_source_count_mismatch", "Biological-source counts must equal the requested specimen count.");
        if (groups.Select(group => LabServiceSourceGroup.Normalize(group.BiologicalSource))
            .Distinct(StringComparer.Ordinal).Count() != groups.Count)
            throw Invalid("biological_source_duplicate", "Duplicate biological sources are not permitted.");
        return groups;
    }

    private static LabSample ToRosterSample(LabServiceOrder order, LabSampleRosterWriteRequest request)
        => new(order.Id, request.CustomerSampleId, StandardMaterialType,
            ResolveRosterSource(order, request.BiologicalSource), request.TubeCount, StandardQuantityUnit,
            order.StorageRequirements, order.SafetyDeclaration, request.CollectionDate, request.Concentration,
            request.Notes, "[]");

    private static string ResolveRosterSource(LabServiceOrder order, string? requestedSource)
    {
        if (string.IsNullOrWhiteSpace(requestedSource) && order.SourceGroups.Count == 1)
            return order.SourceGroups.Single().BiologicalSource;
        if (string.IsNullOrWhiteSpace(requestedSource))
            throw Invalid("biological_source_required", "Select one of the biological sources accepted with this Job.");
        var normalized = LabServiceSourceGroup.Normalize(requestedSource);
        return order.SourceGroups.SingleOrDefault(group => group.NormalizedBiologicalSource == normalized)?.BiologicalSource
            ?? throw Invalid("biological_source_not_accepted", "This biological source is not part of the accepted Job.");
    }

    private static void EnsureUniqueSampleId(LabServiceOrder order, string customerSampleId, Guid? excludedSampleId)
    {
        var normalized = customerSampleId?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
            throw Invalid("customer_sample_id_required", "Customer sample ID is required.");
        if (order.Samples.Any(sample => sample.Id != excludedSampleId
            && string.Equals(sample.CustomerSampleId, normalized, StringComparison.OrdinalIgnoreCase)))
            throw Conflict("duplicate_customer_sample_id", "Customer sample IDs must be unique within the Job.");
    }

    private sealed record ResolvedShippingConfiguration(
        SampleShippingDestination Destination,
        SampleTypeDefinition SampleType,
        SampleShippingInstructionRule Rule);

    private async Task<ResolvedShippingConfiguration> ResolveShippingConfigurationAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var sampleTypes = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .Where(item => item.IsActive && item.MaterialClass == StandardMaterialType
                && item.QuantityUnit == StandardQuantityUnit && item.EffectiveFrom <= now
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
            .ToListAsync(cancellationToken);
        if (sampleTypes.Count != 1)
            throw Conflict("sample_shipping_configuration_required",
                "Phaeno must activate exactly one extracted-RNA tube sample type before this sample list can be finalized.");
        var sampleType = sampleTypes[0];
        var destinations = await dbContext.SampleShippingDestinations.AsNoTracking()
            .Where(item => item.IsActive && item.EffectiveFrom <= now
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
            .ToListAsync(cancellationToken);
        var destinationIds = destinations.Select(item => item.Id).ToList();
        var rules = await dbContext.SampleShippingInstructionRules.AsNoTracking()
            .Where(item => item.IsActive && item.SampleTypeDefinitionId == sampleType.Id
                && destinationIds.Contains(item.DestinationId) && item.EffectiveFrom <= now
                && (!item.EffectiveTo.HasValue || item.EffectiveTo > now))
            .ToListAsync(cancellationToken);
        var candidates = rules.Join(destinations, rule => rule.DestinationId, destination => destination.Id,
            (rule, destination) => new ResolvedShippingConfiguration(destination, sampleType, rule)).ToList();
        if (candidates.Count != 1)
            throw Conflict("sample_shipping_configuration_required",
                "Phaeno must configure exactly one active shipping destination and instruction rule for extracted-RNA tubes before this sample list can be finalized.");
        return candidates[0];
    }

    private static string Csv(string value)
        => value.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? $"\"{value.Replace("\"", "\"\"")}\"" : value;

    private static void ValidateSamples(
        IReadOnlyList<LabSampleWriteRequest> samples,
        bool requireAtLeastOne = true)
    {
        if (samples.Count == 0)
        {
            if (requireAtLeastOne)
                throw Invalid("sample_required", "At least one sample is required.");
            return;
        }
        if (samples.Count > 100) throw Invalid("sample_limit", "A laboratory request cannot contain more than 100 samples.");
        if (samples.Select(item => item.CustomerSampleId.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != samples.Count)
            throw Invalid("duplicate_customer_sample_id", "Customer sample identifiers must be unique within the request.");
    }

    private static void AddSamples(LabServiceOrder order, IReadOnlyList<LabSampleWriteRequest> samples)
    {
        foreach (var item in samples) order.Samples.Add(ToSample(order, item));
    }

    private static LabSample ToSample(LabServiceOrder order, LabSampleWriteRequest item) => new(order.Id, item.CustomerSampleId,
        StandardMaterialType, BiologicalSource(order, item), item.Quantity, StandardQuantityUnit, order.StorageRequirements,
        order.SafetyDeclaration, item.CollectionDate, item.Concentration, item.Notes,
        "[]", item.ReplacementForSampleId);

    private static string BiologicalSource(LabServiceOrder order, LabSampleWriteRequest item)
        => order.HasMixedBiologicalSources
            ? item.BiologicalSource
            : order.SharedBiologicalSource!;

    private async Task<LabServiceOrderDto> MapAsync(LabServiceOrder order, bool canManage, bool platform, CancellationToken cancellationToken)
    {
        var files = await dbContext.ManagedOperationalFiles.AsNoTracking().Where(file => file.WorkflowId == order.Id
            && file.WorkflowType == OrderWorkflowTypes.LabService && (platform || file.ReleaseStatus == FileReleaseStatus.Released))
            .OrderBy(file => file.CreatedAt).ToListAsync(cancellationToken);
        var releases = await dbContext.LabResultReleases.AsNoTracking().Where(release => release.LabServiceOrderId == order.Id
            && (platform || release.ReleaseStatus != FileReleaseStatus.Internal))
            .OrderBy(release => release.GeneratedAt).ToListAsync(cancellationToken);
        var releaseIds = releases.Select(release => release.Id).ToList();
        var fileIdsByReleaseId = releases.ToDictionary(
            release => release.Id,
            release => (IReadOnlyCollection<Guid>)ReleasedDeliverableManifest.ReadFileIds(release.ManifestJson));
        var downloadByReleaseId = await downloadProjections.ReadAsync(
            order.OrganizationId,
            ReleasedDeliverablePackageType.LabResult,
            fileIdsByReleaseId,
            DateTime.UtcNow,
            cancellationToken);
        var downloadByFileId = downloadByReleaseId.Values
            .SelectMany(item => item.Files)
            .GroupBy(item => item.Key)
            .ToDictionary(group => group.Key, group => group.First().Value);
        var retentionByReleaseId = await dbContext.ReleasedDeliverableRetentionSnapshots
            .AsNoTracking()
            .Where(item => item.OrganizationId == order.OrganizationId
                && item.LabResultReleaseId.HasValue
                && releaseIds.Contains(item.LabResultReleaseId.Value))
            .ToDictionaryAsync(item => item.LabResultReleaseId!.Value, cancellationToken);
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
        return new LabServiceOrderDto(order.Id, order.OrganizationId, order.OrderNumber, order.CustomerReference, order.Description,
            order.HasMixedBiologicalSources, order.SharedBiologicalSource,
            order.StorageRequirements, order.SafetyDeclaration,
            order.SubmissionInstructionsSnapshot, order.Status.ToString(), order.RequestRevision, order.SubmittedAt,
            order.PlacedAt, order.CompletedAt, order.TenantSafeReason, platform ? order.InternalNote : null,
            order.CreatedAt, order.UpdatedAt, order.Version,
            canManage && editable, canManage && editable, canManage && order.Status == LabServiceOrderStatus.QuoteIssued,
            canManage && order.Status is LabServiceOrderStatus.DraftRequest or LabServiceOrderStatus.SubmittedForQuote
                or LabServiceOrderStatus.ChangesRequested or LabServiceOrderStatus.QuoteInPreparation or LabServiceOrderStatus.QuoteIssued,
            canManage && order.Status is LabServiceOrderStatus.PlacedAwaitingSamples or LabServiceOrderStatus.InProgress or LabServiceOrderStatus.ResultsAvailable,
            order.Samples.OrderBy(item => item.CreatedAt).Select(item => item.ToDto(platform)).ToList(),
            order.Quotes.OrderByDescending(item => item.Revision).Select(item => item.ToDto()).ToList(),
            releases.Select(item => item.ToDto(
                retentionByReleaseId.GetValueOrDefault(item.Id),
                downloadByReleaseId.GetValueOrDefault(item.Id))).ToList(),
            files.Select(item => item.ToDto(downloadByFileId.GetValueOrDefault(item.Id))).ToList(), documents.Select(item => item.ToDto(platform)).ToList(),
            cancellationRequests.Select(item => item.ToDto()).ToList(), timeline.Select(item => item.ToDto(platform)).ToList(),
            RequestRevisions: order.Revisions.OrderByDescending(item => item.Revision).Select(item => new LabRequestRevisionDto(item.Id,
                item.Revision, item.PreviousRevisionId, item.SnapshotJson, item.CorrectionReason, item.SubmittedByUserId, item.SubmittedAt)).ToList(),
            LabMilestone: projection?.Milestone,
            LabScheduleHealth: projection?.ScheduleHealth,
            LabExpectedCompletionAtUtc: projection?.ExpectedCompletionAtUtc,
            LabCustomerActionCount: projection?.ActiveCustomerActionCount ?? 0,
            LabCustomerActionSummary: projection?.CustomerSafeSummary,
            LabPermittedQcProjectionJson: projection?.PermittedQcProjectionJson,
            LabReadyForRelease: projection?.Milestone == "ReadyForRelease",
            RequestedSpecimenCount: order.RequestedSpecimenCount,
            SourceGroups: order.SourceGroups.OrderBy(group => group.BiologicalSource)
                .Select(group => new LabServiceSourceGroupDto(group.Id, group.BiologicalSource, group.SpecimenCount, group.Version)).ToList(),
            SampleRosterFinalizedAt: order.SampleRosterFinalizedAt,
            CanEditSamples: canManage && order.CanEditSampleRoster,
            CanFinalizeSamples: canManage && order.CanEditSampleRoster && order.Samples.Count == order.RequestedSpecimenCount);
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
            jobNotes = order.Description,
            order.HasMixedBiologicalSources,
            order.SharedBiologicalSource,
            order.RequestedSpecimenCount,
            sourceGroups = order.SourceGroups.OrderBy(group => group.BiologicalSource).Select(group => new
            {
                group.BiologicalSource,
                group.SpecimenCount
            }),
            order.StorageRequirements,
            order.SafetyDeclaration,
            serviceKey = StandardLabServiceKey,
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

    private async Task EnsureUniqueJobNameAsync(
        Guid organizationId,
        string normalizedJobName,
        Guid? excludedOrderId,
        CancellationToken cancellationToken)
    {
        var exists = await dbContext.LabServiceOrders.AsNoTracking().AnyAsync(order =>
            order.OrganizationId == organizationId
            && order.NormalizedJobName == normalizedJobName
            && (!excludedOrderId.HasValue || order.Id != excludedOrderId.Value), cancellationToken);
        if (exists)
            throw Conflict("duplicate_job_name", "A job with this name already exists for your organization.");
    }

    private async Task<string> GenerateUniqueJobNumberAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var candidate = OrderNumberGenerator.Lab();
            if (!await dbContext.LabServiceOrders.AsNoTracking().AnyAsync(order => order.OrderNumber == candidate, cancellationToken))
                return candidate;
        }

        throw Conflict("job_number_unavailable", "A unique Job number could not be generated. Try creating the job again.");
    }

    private static string NormalizeJobName(string? jobName)
    {
        try { return LabServiceOrder.NormalizeJobName(jobName); }
        catch (ArgumentException exception) { throw Invalid("invalid_job_name", exception.Message); }
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
