namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/data-assembly-requests")]
public sealed class DataAssemblyRequestsController(
    AppDbContext dbContext,
    OrderRequestContext requestContext,
    OrderIdempotencyService idempotency,
    IOperationalFileStorage fileStorage,
    IOperationalFileScanner fileScanner,
    IOptions<OrderManagementOptions> options) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    public async Task<PagedResult<OrderListItemDto>> List([FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] DateTime? createdFrom, [FromQuery] DateTime? createdTo, [FromQuery] Guid? submitterId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 25, CancellationToken cancellationToken = default)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.DataAssemblyRequests.AsNoTracking().Where(item => item.OrganizationId == tenant.Organization.Id && !item.IsDiscarded);
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
        if (createdFrom.HasValue) query = query.Where(item => item.CreatedAt >= createdFrom.Value);
        if (createdTo.HasValue) query = query.Where(item => item.CreatedAt < createdTo.Value);
        if (submitterId.HasValue) query = query.Where(item => item.CreatedByUserId == submitterId.Value);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(item => item.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(item => new OrderListItemDto(item.Id, item.RequestNumber, item.Status.ToString(), item.ProjectReference,
                item.OrganizationId, item.CreatedAt, item.UpdatedAt, item.Version, item.TenantSafeReason)).ToListAsync(cancellationToken);
        return new PagedResult<OrderListItemDto>(items, page, pageSize, total);
    }

    [HttpGet("export")]
    public async Task<FileContentResult> Export([FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] DateTime? createdFrom, [FromQuery] DateTime? createdTo, [FromQuery] Guid? submitterId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        var query = dbContext.DataAssemblyRequests.AsNoTracking().Where(item => item.OrganizationId == tenant.Organization.Id && !item.IsDiscarded);
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
        if (createdFrom.HasValue) query = query.Where(item => item.CreatedAt >= createdFrom.Value);
        if (createdTo.HasValue) query = query.Where(item => item.CreatedAt < createdTo.Value);
        if (submitterId.HasValue) query = query.Where(item => item.CreatedByUserId == submitterId.Value);
        var items = await query.OrderByDescending(item => item.UpdatedAt).Take(10_000)
            .Select(item => new OrderListItemDto(item.Id, item.RequestNumber, item.Status.ToString(), item.ProjectReference,
                item.OrganizationId, item.CreatedAt, item.UpdatedAt, item.Version, item.TenantSafeReason)).ToListAsync(cancellationToken);
        return File(OrderCsvExport.Create(items), "text/csv; charset=utf-8", $"data-assembly-requests-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpGet("{requestId:guid}")]
    public async Task<DataAssemblyRequestDto> Get(Guid requestId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        return await MapAsync(await ReadAsync(requestId, tenant.Organization.Id, cancellationToken), tenant.Membership.IsOrganizationAdmin, false, cancellationToken);
    }

    [HttpPost]
    public async Task<DataAssemblyRequestDto> Create([FromBody] AssemblyWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext);
        var replay = await idempotency.ReadAsync<DataAssemblyRequestDto>(tenant.Actor.Id, "assembly:create", key, request, cancellationToken);
        if (replay != null) return replay;
        var profile = await dbContext.AssemblyProfiles.AsNoTracking().FirstOrDefaultAsync(item => item.Id == request.AssemblyProfileId && item.IsActive && !item.IsSynthetic, cancellationToken)
            ?? throw Invalid("assembly_profile_unavailable", "Select an active data-assembly profile.");
        DataAssemblyRequest item;
        try
        {
            item = new DataAssemblyRequest(tenant.Organization.Id, OrderNumberGenerator.Assembly(), request.ProjectReference,
                profile.Id, profile.ProfileVersion, profile.Name, profile.Instructions, request.MetadataJson,
                request.RequestedOutput, request.ProcessingNotes, request.ProhibitedDataConfirmed);
        }
        catch (ArgumentException exception) { throw Invalid("assembly_request_invalid", exception.Message); }
        dbContext.DataAssemblyRequests.Add(item);
        Event(item, "Created", item.Status.ToString(), tenant.Actor.Id);
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(item, true, false, cancellationToken);
        idempotency.Store(tenant.Actor.Id, "assembly:create", key, request, response, StatusCodes.Status201Created);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return response;
    }

    [HttpPatch("{requestId:guid}")]
    public async Task<DataAssemblyRequestDto> Update(Guid requestId, [FromBody] AssemblyWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var item = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken); EnsureVersion(item.Version, request.Version);
        if (request.AssemblyProfileId != item.AssemblyProfileId)
            throw Conflict("assembly_profile_frozen", "Create a new request to use a different assembly profile.");
        Execute(() => item.UpdateDraft(request.ProjectReference, request.MetadataJson, request.RequestedOutput,
            request.ProcessingNotes, request.ProhibitedDataConfirmed));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await MapAsync(item, true, false, cancellationToken);
    }

    [HttpPost("{requestId:guid}/inputs")]
    [RequestSizeLimit(104_857_600)]
    public async Task<OperationalFileDto> UploadInput(Guid requestId, [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var item = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken);
        if (item.Status is not (AssemblyRequestStatus.Draft or AssemblyRequestStatus.ChangesRequested))
            throw Conflict("assembly_input_not_editable", "Inputs can be uploaded only while the request is editable.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!options.Value.AllowedFileKinds.ContainsKey(extension)) throw Invalid("file_kind_not_allowed", "This input file type is not allowed.");
        var profile = await dbContext.AssemblyProfiles.AsNoTracking().FirstOrDefaultAsync(value => value.Id == item.AssemblyProfileId, cancellationToken) ?? throw Invalid("assembly_profile_unavailable", "The request profile is unavailable.");
        var allowedKinds = AllowedFileKinds(profile.AllowedFileKindsJson);
        if (profile.IsSynthetic || (item.InputRevision == 0 && !profile.IsActive) || !allowedKinds.Contains(extension))
            throw Invalid("file_kind_not_allowed", "This file type is not allowed by the selected assembly profile.");
        if (file.Length > profile.MaximumFileSizeBytes) throw Invalid("file_too_large", "This file exceeds the selected assembly profile's per-file limit.");
        var existingBytes = await dbContext.ManagedOperationalFiles.AsNoTracking().Where(value => value.WorkflowId == requestId
            && value.Purpose == OperationalFilePurpose.AssemblyInput && value.ReleaseStatus != FileReleaseStatus.Withdrawn).SumAsync(value => (long?)value.SizeBytes, cancellationToken) ?? 0;
        if (existingBytes + file.Length > profile.MaximumTotalSizeBytes) throw Invalid("assembly_total_size_exceeded", "The active input files exceed the selected assembly profile's total-size limit.");
        StoredOperationalFile stored;
        await using (var stream = file.OpenReadStream()) stored = await fileStorage.SaveAsync(stream, extension, options.Value.MaximumFileBytes, cancellationToken);
        try
        {
            var scan = await fileScanner.ScanAsync(stored.StorageKey, cancellationToken);
            var managed = new ManagedOperationalFile(item.OrganizationId, OrderWorkflowTypes.DataAssembly, item.Id, null,
                OperationalFilePurpose.AssemblyInput, file.FileName, extension, file.ContentType ?? "application/octet-stream",
                stored.SizeBytes, stored.Sha256, stored.StorageKey);
            managed.RecordScan(scan.Status, scan.Message);
            dbContext.ManagedOperationalFiles.Add(managed);
            await dbContext.SaveChangesAsync(cancellationToken);
            return managed.ToDto();
        }
        catch
        {
            await fileStorage.DeleteIfExistsAsync(stored.StorageKey, cancellationToken);
            throw;
        }
    }

    [HttpDelete("{requestId:guid}/inputs/{inputId:guid}")]
    public async Task<OperationalFileDto> DeleteInput(Guid requestId, Guid inputId, [FromQuery] long version, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var item = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken);
        if (item.Status is not (AssemblyRequestStatus.Draft or AssemblyRequestStatus.ChangesRequested))
            throw Conflict("assembly_input_not_editable", "Inputs can be removed only while the request is editable.");
        var file = await dbContext.ManagedOperationalFiles.FirstOrDefaultAsync(value => value.Id == inputId && value.WorkflowId == requestId
            && value.OrganizationId == tenant.Organization.Id && value.Purpose == OperationalFilePurpose.AssemblyInput, cancellationToken) ?? throw Missing();
        if (file.Version != version) throw new DbUpdateConcurrencyException();
        file.Withdraw();
        await dbContext.SaveChangesAsync(cancellationToken);
        return file.ToDto();
    }

    [HttpPost("{requestId:guid}/submit")]
    public async Task<DataAssemblyRequestDto> Submit(Guid requestId, [FromBody] AssemblySubmitRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"assembly:{requestId}:submit";
        var replay = await idempotency.ReadAsync<DataAssemblyRequestDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var item = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken); EnsureVersion(item.Version, request.Version);
        var profile = await dbContext.AssemblyProfiles.AsNoTracking().FirstOrDefaultAsync(value => value.Id == item.AssemblyProfileId, cancellationToken)
            ?? throw Invalid("assembly_profile_unavailable", "The request profile is unavailable.");
        if (profile.IsSynthetic || (item.InputRevision == 0 && !profile.IsActive))
            throw Invalid("assembly_profile_unavailable", "The selected assembly profile is not active for Partner submissions.");
        ValidateMetadata(profile.MetadataSchemaJson, item.MetadataJson);
        var inputs = await dbContext.ManagedOperationalFiles.Where(file => file.WorkflowId == requestId
            && file.Purpose == OperationalFilePurpose.AssemblyInput && file.ReleaseStatus != FileReleaseStatus.Withdrawn).OrderBy(file => file.CreatedAt).ToListAsync(cancellationToken);
        if (inputs.Count == 0) throw Invalid("assembly_input_required", "Upload at least one assembly input file.");
        if (inputs.Any(file => file.ScanStatus != OperationalFileScanStatus.Clean))
            throw Conflict("assembly_input_not_clean", "Every input must pass scanning before submission.");
        var manifestIds = ManifestFileIds(request.ManifestJson);
        var inputIds = inputs.Select(file => file.Id).ToHashSet();
        if (manifestIds.Count == 0 || !manifestIds.SetEquals(inputIds))
            throw Invalid("assembly_manifest_invalid", "The input manifest must identify every active file in this request and no other files.");
        var allowedKinds = AllowedFileKinds(profile.AllowedFileKindsJson);
        if (inputs.Any(file => !allowedKinds.Contains(file.FileKind) || file.SizeBytes > profile.MaximumFileSizeBytes)
            || inputs.Sum(file => file.SizeBytes) > profile.MaximumTotalSizeBytes)
            throw Invalid("assembly_profile_file_rules_failed", "One or more inputs do not meet the selected assembly profile's file rules.");
        var revision = new AssemblyInputRevision(item.Id, item.InputRevision + 1, item.CurrentInputRevisionId,
            request.ManifestJson, item.Status == AssemblyRequestStatus.ChangesRequested ? item.TenantSafeReason : null,
            request.ValidationSummaryJson, tenant.Actor.Id, DateTime.UtcNow);
        foreach (var input in inputs.Where(file => !file.ParentRecordId.HasValue)) input.AttachToParent(revision.Id);
        item.InputRevisions.Add(revision);
        var before = item.Status.ToString(); Execute(() => item.Submit(revision.Id, DateTime.UtcNow));
        Event(item, before, item.Status.ToString(), tenant.Actor.Id);
        Notice(item, "assembly-submitted", "Data assembly request submitted", $"{item.RequestNumber} was submitted for intake validation.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(item, true, false, cancellationToken); idempotency.Store(tenant.Actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken); return response;
    }

    [HttpPost("{requestId:guid}/withdraw")]
    public async Task<DataAssemblyRequestDto> Withdraw(Guid requestId, [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var item = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken); EnsureVersion(item.Version, request.Version);
        var before = item.Status.ToString(); Execute(() => item.Withdraw(request.Reason)); Event(item, before, item.Status.ToString(), tenant.Actor.Id, request.Reason);
        await dbContext.SaveChangesAsync(cancellationToken); return await MapAsync(item, true, false, cancellationToken);
    }

    [HttpPost("{requestId:guid}/quotes/{quoteId:guid}/accept")]
    public async Task<DataAssemblyRequestDto> AcceptQuote(Guid requestId, Guid quoteId, [FromBody] AcceptQuoteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        if (request.QuoteId != quoteId || string.IsNullOrWhiteSpace(request.PurchaseOrderNumber)) throw Invalid("assembly_quote_acceptance_invalid", "A matching quote and purchase order number are required.");
        var key = idempotency.RequireKey(HttpContext); var scope = $"assembly:{requestId}:quote:{quoteId}:accept";
        var replay = await idempotency.ReadAsync<DataAssemblyRequestDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var item = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken); EnsureVersion(item.Version, request.Version);
        var quote = item.Quotes.SingleOrDefault(value => value.Id == quoteId) ?? throw Missing(); var before = item.Status.ToString();
        Execute(() => quote.Accept(tenant.Actor.Id, DateTime.UtcNow)); Execute(() => item.AcceptQuote(quoteId, request.PurchaseOrderNumber!, DateTime.UtcNow));
        Event(item, before, item.Status.ToString(), tenant.Actor.Id); Notice(item, "assembly-quote-accepted", "Data assembly quote accepted", $"{item.RequestNumber} is queued for processing.");
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(item, true, false, cancellationToken); idempotency.Store(tenant.Actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken); return response;
    }

    [HttpPost("{requestId:guid}/cancellation-requests")]
    public async Task<DataAssemblyRequestDto> RequestCancellation(Guid requestId, [FromBody] CancellationRequestBody request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"assembly:{requestId}:cancellation";
        var replay = await idempotency.ReadAsync<DataAssemblyRequestDto>(tenant.Actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var item = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken); EnsureVersion(item.Version, request.Version);
        var before = item.Status.ToString(); Execute(item.RequestCancellation);
        dbContext.OrderCancellationRequests.Add(new OrderCancellationRequest(item.OrganizationId, OrderWorkflowTypes.DataAssembly,
            item.Id, tenant.Actor.Id, request.Reason, request.ScopeJson));
        Event(item, before, item.Status.ToString(), tenant.Actor.Id, request.Reason);
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = await MapAsync(item, true, false, cancellationToken); idempotency.Store(tenant.Actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken); return response;
    }

    [HttpGet("{requestId:guid}/outputs/{releaseId:guid}")]
    public async Task<AssemblyOutputReleaseDto> GetOutput(Guid requestId, Guid releaseId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        var item = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken);
        var release = item.OutputReleases.SingleOrDefault(value => value.Id == releaseId && value.ReleaseStatus == FileReleaseStatus.Released) ?? throw Missing();
        var files = await dbContext.ManagedOperationalFiles.AsNoTracking().Where(file => file.WorkflowId == requestId
            && file.ParentRecordId == releaseId && file.Purpose == OperationalFilePurpose.AssemblyOutput
            && file.ReleaseStatus == FileReleaseStatus.Released && file.ScanStatus == OperationalFileScanStatus.Clean).ToListAsync(cancellationToken);
        return MapRelease(release, files);
    }

    [HttpGet("{requestId:guid}/outputs/{releaseId:guid}/files/{fileId:guid}/download")]
    [SkipApiEnvelope]
    public async Task<IActionResult> DownloadOutput(Guid requestId, Guid releaseId, Guid fileId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        _ = await ReadAsync(requestId, tenant.Organization.Id, cancellationToken);
        var file = await dbContext.ManagedOperationalFiles.FirstOrDefaultAsync(item => item.Id == fileId && item.WorkflowId == requestId
            && item.ParentRecordId == releaseId && item.OrganizationId == tenant.Organization.Id && item.Purpose == OperationalFilePurpose.AssemblyOutput
            && item.ReleaseStatus == FileReleaseStatus.Released && item.ScanStatus == OperationalFileScanStatus.Clean, cancellationToken) ?? throw Missing();
        var stream = await fileStorage.OpenReadAsync(file.StorageKey, cancellationToken);
        try
        {
            dbContext.OperationalFileDownloads.Add(new OperationalFileDownload(file.Id, tenant.Organization.Id, tenant.Actor.Id,
                DateTime.UtcNow, HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.ToString()));
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch { await stream.DisposeAsync(); throw; }
        return File(stream, file.ContentType, file.FileName, enableRangeProcessing: true);
    }

    private async Task<DataAssemblyRequest> ReadAsync(Guid id, Guid organizationId, CancellationToken cancellationToken)
        => await dbContext.DataAssemblyRequests.Include(item => item.InputRevisions).Include(item => item.Quotes)
            .Include(item => item.ProcessingRuns).Include(item => item.OutputReleases)
            .FirstOrDefaultAsync(item => item.Id == id && item.OrganizationId == organizationId && !item.IsDiscarded, cancellationToken) ?? throw Missing();

    private async Task<DataAssemblyRequestDto> MapAsync(DataAssemblyRequest item, bool canManage, bool platform, CancellationToken cancellationToken)
    {
        var files = await dbContext.ManagedOperationalFiles.AsNoTracking().Where(file => file.WorkflowType == OrderWorkflowTypes.DataAssembly && file.WorkflowId == item.Id).OrderBy(file => file.CreatedAt).ToListAsync(cancellationToken);
        var docs = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(value => value.WorkflowType == OrderWorkflowTypes.DataAssembly && value.WorkflowId == item.Id).OrderBy(value => value.CreatedAt).ToListAsync(cancellationToken);
        var cancellations = await dbContext.OrderCancellationRequests.AsNoTracking().Where(value => value.WorkflowType == OrderWorkflowTypes.DataAssembly && value.WorkflowId == item.Id).OrderBy(value => value.CreatedAt).ToListAsync(cancellationToken);
        var timeline = await dbContext.OrderStatusEvents.AsNoTracking().Where(value => value.WorkflowType == OrderWorkflowTypes.DataAssembly && value.WorkflowId == item.Id).OrderBy(value => value.OccurredAt).ToListAsync(cancellationToken);
        var editable = item.Status is AssemblyRequestStatus.Draft or AssemblyRequestStatus.ChangesRequested;
        return new DataAssemblyRequestDto(item.Id, item.OrganizationId, item.RequestNumber, item.ProjectReference, item.AssemblyProfileId,
            item.AssemblyProfileVersion, item.ProfileNameSnapshot, item.ProfileInstructionsSnapshot, item.MetadataJson, item.RequestedOutput,
            item.ProcessingNotes, item.ProhibitedDataConfirmed, item.Status.ToString(), item.InputRevision, item.PurchaseOrderNumber,
            item.SubmittedAt, item.PlacedAt, item.CompletedAt, item.TenantSafeReason, platform ? item.InternalNote : null, item.CreatedAt,
            item.UpdatedAt, item.Version, canManage && editable, canManage && editable, canManage && item.Status == AssemblyRequestStatus.QuoteIssued,
            canManage && item.Status is AssemblyRequestStatus.Draft or AssemblyRequestStatus.Submitted or AssemblyRequestStatus.IntakeValidation
                or AssemblyRequestStatus.ChangesRequested or AssemblyRequestStatus.QuoteInPreparation or AssemblyRequestStatus.QuoteIssued,
            canManage && item.Status is AssemblyRequestStatus.PlacedQueued or AssemblyRequestStatus.Processing or AssemblyRequestStatus.OutputReview or AssemblyRequestStatus.OutputAvailable or AssemblyRequestStatus.OnHold,
            item.InputRevisions.OrderByDescending(value => value.Revision).Select(value => new AssemblyInputRevisionDto(value.Id, value.Revision,
                value.PreviousRevisionId, value.ManifestJson, value.CorrectionReason, value.ValidationSummaryJson, value.SubmittedAt)).ToList(),
            item.Quotes.OrderByDescending(value => value.Revision).Select(value => value.ToDto()).ToList(),
            platform ? item.ProcessingRuns.OrderByDescending(value => value.RunNumber).Select(value => new AssemblyProcessingRunDto(value.Id,
                value.InputRevisionId, value.RunNumber, value.ProfileVersion, value.PipelineVersion, value.Provenance, value.QcStatus,
                value.StartedAt, value.CompletedAt, value.FailureReason, value.Version)).ToList() : [],
            item.OutputReleases.Where(value => platform || value.ReleaseStatus == FileReleaseStatus.Released).OrderByDescending(value => value.ReleaseVersion)
                .Select(value => MapRelease(value, files.Where(file => file.ParentRecordId == value.Id))).ToList(),
            files.Where(file => file.Purpose == OperationalFilePurpose.AssemblyInput && file.ReleaseStatus != FileReleaseStatus.Withdrawn).Select(file => file.ToDto()).ToList(),
            docs.Select(value => value.ToDto(platform)).ToList(), cancellations.Select(value => value.ToDto()).ToList(), timeline.Select(value => value.ToDto(platform)).ToList());
    }

    private static AssemblyOutputReleaseDto MapRelease(AssemblyOutputRelease release, IEnumerable<ManagedOperationalFile> files)
        => new(release.Id, release.InputRevisionId, release.ProcessingRunId, release.ReleaseVersion, release.ManifestJson,
            release.PipelineVersion, release.Provenance, release.QcStatus, release.ReleaseStatus.ToString(), release.GeneratedAt,
            release.ReleasedAt, files.Select(file => file.ToDto()).ToList(), release.Version);
    private void Event(DataAssemblyRequest item, string from, string to, Guid actorId, string? reason = null, string? internalNote = null)
        => dbContext.OrderStatusEvents.Add(new OrderStatusEvent(item.OrganizationId, OrderWorkflowTypes.DataAssembly, item.Id, null, from, to, reason, internalNote, actorId, DateTime.UtcNow));
    private void Notice(DataAssemblyRequest item, string eventType, string subject, string body)
        => dbContext.OrderNotifications.Add(new OrderNotification(item.OrganizationId, null, OrderWorkflowTypes.DataAssembly, item.Id, eventType, subject, body));
    private static HashSet<string> AllowedFileKinds(string value)
    {
        try
        {
            var kinds = JsonSerializer.Deserialize<List<string>>(value, JsonOptions) ?? [];
            return kinds.Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item.Trim().ToLowerInvariant()).Select(item => item.StartsWith('.') ? item : $".{item}")
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException) { throw Invalid("assembly_profile_invalid", "The selected assembly profile has invalid file-kind rules."); }
    }
    private static HashSet<Guid> ManifestFileIds(string value)
    {
        try
        {
            using var document = JsonDocument.Parse(value);
            if (!document.RootElement.TryGetProperty("files", out var files) || files.ValueKind != JsonValueKind.Array) return [];
            var result = new HashSet<Guid>();
            foreach (var file in files.EnumerateArray())
            {
                if (!file.TryGetProperty("id", out var id) || !id.TryGetGuid(out var parsed) || !result.Add(parsed)) return [];
            }
            return result;
        }
        catch (JsonException) { return []; }
    }
    private static void ValidateMetadata(string schemaJson, string metadataJson)
    {
        try
        {
            using var schema = JsonDocument.Parse(schemaJson);
            using var metadata = JsonDocument.Parse(metadataJson);
            if (metadata.RootElement.ValueKind != JsonValueKind.Object)
                throw Invalid("assembly_metadata_invalid", "Project metadata must be a JSON object.");
            if (schema.RootElement.TryGetProperty("required", out var required) && required.ValueKind == JsonValueKind.Array)
            {
                foreach (var nameValue in required.EnumerateArray())
                {
                    var name = nameValue.GetString();
                    if (string.IsNullOrWhiteSpace(name) || !metadata.RootElement.TryGetProperty(name, out var value)
                        || value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
                        || (value.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(value.GetString())))
                        throw Invalid("assembly_metadata_required", $"Project metadata is missing required field '{name}'.");
                }
            }
        }
        catch (JsonException) { throw Invalid("assembly_metadata_invalid", "The assembly profile or project metadata is not valid JSON."); }
    }
    private static void EnsureVersion(long current, long? supplied) { if (!supplied.HasValue || current != supplied.Value) throw new DbUpdateConcurrencyException(); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("invalid_assembly_action", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("assembly_action_not_allowed", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() => new("assembly_request_not_found", "The requested data-assembly record was not found.", StatusCodes.Status404NotFound);
}
