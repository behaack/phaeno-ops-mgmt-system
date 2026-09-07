namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record InvoiceReceivableDto(
    Guid Id, Guid OrganizationId, Guid LabServiceOrderId, string InvoiceNumber,
    string Status, DateOnly IssuedOn, DateOnly DueOn, int DaysPastDue,
    decimal Subtotal, decimal TaxTotal, decimal AdjustmentTotal, decimal Total,
    decimal AppliedTotal, decimal Balance, string Currency, long Version);
public sealed record PaymentReceiptDto(
    Guid Id, Guid OrganizationId, string ReceiptNumber, string Source, string ExternalId,
    string Payer, decimal Amount, decimal AppliedAmount, decimal UnappliedAmount,
    string Currency, DateOnly ReceivedOn, string Method, string BankReference,
    string Status, long Version);
public sealed record PaymentAllocationDto(
    Guid Id, Guid PaymentReceiptId, Guid InvoiceId, decimal Amount,
    Guid AllocatedByUserId, DateTime AllocatedAtUtc, bool IsReversed, long Version,
    Guid? ReversedByUserId = null, DateTime? ReversedAtUtc = null, string? ReversalReason = null);
public sealed record PaymentAllocationHistoryDto(PaymentAllocationDto Allocation, InvoiceReceivableDto Invoice,
    PaymentReceiptDto Receipt, string AllocatedByName, string? ReversedByName);
public sealed record RecordPaymentReceiptRequest(
    Guid OrganizationId, string ExternalId, string Payer, decimal Amount,
    string Currency, DateOnly ReceivedOn, string Method, string BankReference,
    string EvidenceStorageKey, string? Memo);
public sealed record AllocatePaymentRequest(Guid InvoiceId, decimal Amount, long ReceiptVersion, long InvoiceVersion);
public sealed record ReverseAllocationRequest(string Reason, long AllocationVersion, long ReceiptVersion, long InvoiceVersion);
public sealed record ReverseReceiptRequest(string Reason, long Version);
public sealed record InvoiceAdjustmentRequest(string Kind, decimal Amount, string Reason, long InvoiceVersion);
public sealed record PreviewPaymentImportRequest(Guid OrganizationId, string Source, string CsvText);
public sealed record ConfirmPaymentImportRequest(long Version);
public sealed record PaymentImportBatchDto(
    Guid Id, string Source, string PayloadSha256, int RowCount, decimal TotalAmount,
    string Status, string PreviewJson, Guid PreviewedByUserId, DateTime PreviewedAtUtc,
    Guid? ConfirmedByUserId, DateTime? ConfirmedAtUtc, long Version);
public sealed record CreateReconciliationRequest(
    DateOnly PeriodEnd, decimal BankTotal, IReadOnlyList<Guid> PaymentReceiptIds,
    IReadOnlyList<Guid> PaymentAllocationIds, IReadOnlyList<Guid> InvoiceAdjustmentIds);
public sealed record ReconciliationMutationRequest(long Version);
public sealed record EditReconciliationDraftRequest(long Version, string Reason, DateOnly PeriodEnd, decimal BankTotal,
    IReadOnlyList<Guid> PaymentReceiptIds, IReadOnlyList<Guid> PaymentAllocationIds, IReadOnlyList<Guid> InvoiceAdjustmentIds);
public sealed record CancelReconciliationDraftRequest(long Version, string Reason);
public sealed record ReconciliationItemDto(string SourceType, Guid SourceId, string Reference, decimal Amount);
public sealed record ReconciliationChangeDto(ReconciliationDraftChange Change, string ActorName);
public sealed record ReconciliationDetailDto(ReconciliationBatchDto Batch, IReadOnlyList<ReconciliationItemDto> Items,
    IReadOnlyList<ReconciliationChangeDto> Changes, IReadOnlyList<PaymentReceiptDto> Receipts);
public sealed record ReconciliationBatchDto(
    Guid Id, string BatchNumber, DateOnly PeriodEnd, decimal LedgerReceiptTotal,
    decimal BankTotal, decimal Difference, string Status, Guid CreatedByUserId,
    Guid? SubmittedByUserId, Guid? ApprovedByUserId, string? CloseoutReportJson,
    long Version);
public sealed record AccountsReceivableCustomerDto(
    Guid OrganizationId, string OrganizationName,
    string? BillingContactName, string? BillingContactEmail, string? BillingAddressJson,
    int PaymentTermsDays, string? TaxDecision, decimal? ApprovedTaxRate,
    string? TaxExemptionEvidence, Guid? FinanceApprovedByUserId,
    DateTime? FinanceApprovedAtUtc, string? FinanceApprovalNotes,
    int ConfigurationVersion, long? ProfileVersion);

[ApiController]
[Authorize]
[Route("api/platform/accounts-receivable")]
public sealed class AccountsReceivableController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    IOptions<PSeqOrderToCashOptions> rolloutOptions,
    ILogger<AccountsReceivableController> logger) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private bool EnforceRoles => rolloutOptions.Value.BusinessRoles || rolloutOptions.Value.DualControlEnforced;

    [HttpGet("customers")]
    public async Task<IReadOnlyList<AccountsReceivableCustomerDto>> Customers(
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAnyBusinessRoleAsync(HttpContext,
            [BusinessRole.BillingOperator, BusinessRole.CashOperator, BusinessRole.CashReconciler],
            EnforceRoles, cancellationToken);
        var customers = await (from organization in dbContext.Organizations.AsNoTracking()
                where organization.IsActive && organization.Kind == OrganizationKind.Customer
                join profile in dbContext.OrganizationCommercialProfiles.AsNoTracking()
                    on organization.Id equals profile.OrganizationId into profiles
                from profile in profiles.DefaultIfEmpty()
                orderby organization.Name
                select new { Organization = organization, Profile = profile })
            .ToListAsync(cancellationToken);
        return customers.Select(item => new AccountsReceivableCustomerDto(
            item.Organization.Id, item.Organization.Name,
            item.Profile?.BillingContactName, item.Profile?.BillingContactEmail,
            item.Profile?.BillingAddressJson, item.Profile?.PaymentTermsDays ?? 30,
            item.Profile?.TaxDecision?.ToString(), item.Profile?.ApprovedTaxRate,
            item.Profile?.TaxExemptionEvidence, item.Profile?.FinanceApprovedByUserId,
            item.Profile?.FinanceApprovedAtUtc, item.Profile?.FinanceApprovalNotes,
            item.Profile?.ConfigurationVersion ?? 0, item.Profile?.Version)).ToList();
    }

    [HttpGet("invoices")]
    public async Task<IReadOnlyList<InvoiceReceivableDto>> Invoices(
        [FromQuery] Guid? organizationId, [FromQuery] bool openOnly = false,
        CancellationToken cancellationToken = default, [FromQuery] Guid? invoiceId = null)
    {
        await RequireAsync(BusinessRole.BillingOperator, cancellationToken);
        var query = dbContext.Invoices.AsNoTracking();
        if (invoiceId.HasValue) query = query.Where(item => item.Id == invoiceId);
        if (organizationId.HasValue) query = query.Where(item => item.OrganizationId == organizationId);
        if (openOnly) query = query.Where(item => item.Status == InvoiceStatus.Issued || item.Status == InvoiceStatus.PartiallyPaid);
        return await query.OrderBy(item => item.DueOn).ThenBy(item => item.InvoiceNumber)
            .Select(item => MapInvoice(item)).Take(1000).ToListAsync(cancellationToken);
    }

    [HttpGet("aging")]
    public async Task<object> Aging(CancellationToken cancellationToken)
    {
        await RequireAsync(BusinessRole.BillingOperator, cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var open = await dbContext.Invoices.AsNoTracking()
            .Where(item => item.Status == InvoiceStatus.Issued || item.Status == InvoiceStatus.PartiallyPaid)
            .Select(item => new { item.OrganizationId, item.Balance, item.DueOn }).ToListAsync(cancellationToken);
        return new
        {
            asOf = today,
            current = open.Where(item => item.DueOn >= today).Sum(item => item.Balance),
            days1To30 = open.Where(item => item.DueOn < today && item.DueOn >= today.AddDays(-30)).Sum(item => item.Balance),
            days31To60 = open.Where(item => item.DueOn < today.AddDays(-30) && item.DueOn >= today.AddDays(-60)).Sum(item => item.Balance),
            days61To90 = open.Where(item => item.DueOn < today.AddDays(-60) && item.DueOn >= today.AddDays(-90)).Sum(item => item.Balance),
            over90 = open.Where(item => item.DueOn < today.AddDays(-90)).Sum(item => item.Balance),
            organizations = open.GroupBy(item => item.OrganizationId).Select(group => new
            {
                organizationId = group.Key,
                balance = group.Sum(item => item.Balance),
                oldestDueOn = group.Min(item => item.DueOn)
            }).OrderByDescending(item => item.balance).ToList()
        };
    }

    [HttpGet("receipts")]
    public async Task<IReadOnlyList<PaymentReceiptDto>> Receipts(
        [FromQuery] Guid? organizationId, [FromQuery] bool unappliedOnly = false,
        CancellationToken cancellationToken = default, [FromQuery] Guid? receiptId = null)
    {
        await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        var query = dbContext.PaymentReceipts.AsNoTracking();
        if (receiptId.HasValue) query = query.Where(item => item.Id == receiptId);
        if (organizationId.HasValue) query = query.Where(item => item.OrganizationId == organizationId);
        if (unappliedOnly) query = query.Where(item => item.UnappliedAmount > 0 && item.Status != PaymentReceiptStatus.Reversed);
        return await query.OrderByDescending(item => item.ReceivedOn).ThenBy(item => item.ReceiptNumber)
            .Select(item => MapReceipt(item)).Take(1000).ToListAsync(cancellationToken);
    }

    [HttpPost("receipts")]
    public async Task<PaymentReceiptDto> RecordReceipt(
        [FromBody] RecordPaymentReceiptRequest request, CancellationToken cancellationToken)
    {
        await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        throw new OrderManagementException("receipt_evidence_upload_required", "Attach evidence using the Record receipt form.", StatusCodes.Status410Gone);
    }

    private async Task<PaymentReceiptDto> SaveReceiptWithEvidence(RecordPaymentReceiptRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        if (string.IsNullOrWhiteSpace(request.EvidenceStorageKey))
            throw Invalid("payment_evidence_required", "Manual receipt entry requires evidence.");
        if (!await dbContext.Organizations.AsNoTracking().AnyAsync(item =>
            item.Id == request.OrganizationId && item.IsActive && item.Kind == OrganizationKind.Customer,
            cancellationToken)) throw Missing("customer_not_found", "The Customer was not found.");
        var receipt = new PaymentReceipt(request.OrganizationId, ReceiptNumber(), "ManualFinance",
            request.ExternalId, request.Payer, request.Amount, request.Currency, request.ReceivedOn,
            request.Method, request.BankReference, request.EvidenceStorageKey, request.Memo,
            actor.Id, DateTime.UtcNow);
        dbContext.PaymentReceipts.Add(receipt);
        await SaveAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return MapReceipt(receipt);
    }

    [HttpPost("receipts/with-evidence")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<PaymentReceiptDto> RecordReceiptWithEvidence(
        [FromForm] string payload, [FromForm] IFormFile file,
        [FromServices] IOperationalFileStorage fileStorage,
        [FromServices] IOperationalFileScanner scanner,
        [FromServices] OrderIdempotencyService idempotency,
        CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        RecordPaymentReceiptRequest request;
        try { request = JsonSerializer.Deserialize<RecordPaymentReceiptRequest>(payload, JsonOptions)
            ?? throw Invalid("receipt_fields_required", "Complete the receipt details."); }
        catch (JsonException) { throw Invalid("receipt_fields_invalid", "Review the receipt details."); }
        request = request with { EvidenceStorageKey = string.Empty };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (file.Length is <= 0 or > 10 * 1024 * 1024 || !new[] { ".pdf", ".png", ".jpg", ".jpeg", ".txt" }.Contains(extension))
            throw Invalid("receipt_evidence_invalid", "Attach a PDF, PNG, JPEG or text file up to 10 MB.");
        await using var fingerprint = file.OpenReadStream();
        var checksum = Convert.ToHexString(await SHA256.HashDataAsync(fingerprint, cancellationToken));
        string? uploadedStorageKey = null;
        try
        {
            var execution = await idempotency.ExecuteAsync(actor.Id, "finance:receipt-with-evidence", idempotency.RequireKey(HttpContext),
                new { Request = request, Checksum = checksum }, async token =>
                {
                    await using var stream = file.OpenReadStream();
                    var stored = await fileStorage.SaveAsync(stream, extension, 10 * 1024 * 1024, token);
                    uploadedStorageKey = stored.StorageKey;
                    var scan = await scanner.ScanAsync(stored.StorageKey, token);
                    if (scan.Status != OperationalFileScanStatus.Clean)
                        throw Invalid("receipt_evidence_not_clean", "Evidence could not be cleared by the file scanner. Your receipt has not been recorded. Try again when scanning is available.");
                    return await SaveReceiptWithEvidence(request with { EvidenceStorageKey = "receipt-evidence:" + stored.StorageKey }, token);
                }, statusCode: StatusCodes.Status201Created, cancellationToken: cancellationToken);
            Response.StatusCode = execution.StatusCode;
            return execution.Response;
        }
        catch
        {
            if (uploadedStorageKey is not null)
            {
                try
                {
                    // ExecuteAsync has disposed its transaction. Preserve the evidence
                    // if a commit succeeded before the response was interrupted.
                    var evidenceKey = "receipt-evidence:" + uploadedStorageKey;
                    var committed = await dbContext.PaymentReceipts.AsNoTracking()
                        .AnyAsync(receipt => receipt.EvidenceStorageKey == evidenceKey, CancellationToken.None);
                    if (!committed) await fileStorage.DeleteIfExistsAsync(uploadedStorageKey, CancellationToken.None);
                }
                catch (Exception cleanupError)
                {
                    logger.LogWarning(cleanupError, "Receipt evidence was retained because the upload outcome or cleanup could not be verified.");
                }
            }
            throw;
        }
    }

    [HttpGet("receipts/{receiptId:guid}/evidence")]
    public async Task<IActionResult> DownloadReceiptEvidence(Guid receiptId,
        [FromServices] IOperationalFileStorage fileStorage, CancellationToken cancellationToken)
    {
        await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        var receipt = await dbContext.PaymentReceipts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == receiptId, cancellationToken)
            ?? throw Missing("receipt_not_found", "The receipt was not found.");
        if (string.IsNullOrWhiteSpace(receipt.EvidenceStorageKey)) throw Missing("receipt_evidence_missing", "No attached evidence is available for this receipt.");
        if (receipt.EvidenceStorageKey.StartsWith("payment-import:", StringComparison.Ordinal)
            && Guid.TryParse(receipt.EvidenceStorageKey[15..], out var importId))
        {
            var import = await dbContext.PaymentImportBatches.AsNoTracking().SingleOrDefaultAsync(item => item.Id == importId, cancellationToken)
                ?? throw Missing("receipt_evidence_missing", "The original import evidence is unavailable.");
            return File(Encoding.UTF8.GetBytes(import.PreviewJson), "application/json", $"{receipt.ReceiptNumber}-import.json");
        }
        if (!receipt.EvidenceStorageKey.StartsWith("receipt-evidence:", StringComparison.Ordinal))
            throw Missing("receipt_evidence_legacy", "This historical receipt references external evidence. Contact Finance for the original document.");
        var storageKey = receipt.EvidenceStorageKey[17..];
        var stream = await fileStorage.OpenReadAsync(storageKey, cancellationToken);
        return File(stream, "application/octet-stream", $"{receipt.ReceiptNumber}-evidence{Path.GetExtension(storageKey)}");
    }

    [HttpGet("receipts/{receiptId:guid}/matching-suggestions")]
    public async Task<IReadOnlyList<InvoiceReceivableDto>> MatchingSuggestions(
        Guid receiptId, CancellationToken cancellationToken, [FromQuery] string? search = null, [FromQuery] int page = 0, [FromQuery] Guid? invoiceId = null)
    {
        await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        var receipt = await dbContext.PaymentReceipts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == receiptId, cancellationToken)
            ?? throw Missing("receipt_not_found", "The receipt was not found.");
        var query = dbContext.Invoices.AsNoTracking().Where(item => item.OrganizationId == receipt.OrganizationId
                && (item.Status == InvoiceStatus.Issued || item.Status == InvoiceStatus.PartiallyPaid));
        if (invoiceId.HasValue) query = query.Where(item => item.Id == invoiceId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            if (term.Length > 100) throw Invalid("invoice_search_invalid", "Keep invoice searches within 100 characters.");
            query = query.Where(item => item.InvoiceNumber.ToUpper().Contains(term));
        }
        return await query
            .OrderByDescending(item => item.Balance == receipt.UnappliedAmount).ThenBy(item => item.DueOn)
            .ThenBy(item => item.InvoiceNumber).ThenBy(item => item.Id)
            .Skip(Math.Clamp(page, 0, 100000) * 25).Select(item => MapInvoice(item)).Take(25).ToListAsync(cancellationToken);
    }

    [HttpGet("receipts/{receiptId:guid}/allocations")]
    public async Task<IReadOnlyList<PaymentAllocationHistoryDto>> AllocationHistory(Guid receiptId, CancellationToken cancellationToken)
    {
        await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        var receipt = await dbContext.PaymentReceipts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == receiptId, cancellationToken)
            ?? throw Missing("receipt_not_found", "The receipt was not found.");
        var rows = await (from allocation in dbContext.PaymentAllocations.AsNoTracking()
            join invoice in dbContext.Invoices.AsNoTracking() on allocation.InvoiceId equals invoice.Id
            where allocation.PaymentReceiptId == receipt.Id && invoice.OrganizationId == receipt.OrganizationId
            orderby allocation.AllocatedAtUtc descending, allocation.Id
            select new { Allocation = allocation, Invoice = invoice }).ToListAsync(cancellationToken);
        var actors = rows.SelectMany(item => new[] { item.Allocation.AllocatedByUserId, item.Allocation.ReversedByUserId ?? Guid.Empty }).ToList();
        var names = await dbContext.Users.AsNoTracking().Where(item => actors.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.FirstName + " " + item.LastName, cancellationToken);
        return rows.Select(item => new PaymentAllocationHistoryDto(MapAllocation(item.Allocation), MapInvoice(item.Invoice), MapReceipt(receipt),
            names.GetValueOrDefault(item.Allocation.AllocatedByUserId, "Former operator"),
            item.Allocation.ReversedByUserId.HasValue ? names.GetValueOrDefault(item.Allocation.ReversedByUserId.Value, "Former operator") : null)).ToList();
    }

    [HttpPost("receipts/{receiptId:guid}/allocations")]
    public async Task<PaymentAllocationDto> Allocate(Guid receiptId,
        [FromBody] AllocatePaymentRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var receipt = await dbContext.PaymentReceipts.SingleOrDefaultAsync(item => item.Id == receiptId, cancellationToken)
            ?? throw Missing("receipt_not_found", "The receipt was not found.");
        var invoice = await dbContext.Invoices.SingleOrDefaultAsync(item => item.Id == request.InvoiceId, cancellationToken)
            ?? throw Missing("invoice_not_found", "The invoice was not found.");
        EnsureVersion(receipt.Version, request.ReceiptVersion);
        EnsureVersion(invoice.Version, request.InvoiceVersion);
        if (receipt.OrganizationId != invoice.OrganizationId || receipt.Currency != invoice.Currency)
            throw Invalid("allocation_scope_mismatch", "Receipt and invoice must belong to the same Customer and currency.");
        Execute(() => receipt.Allocate(request.Amount));
        Execute(() => invoice.ApplyPayment(request.Amount));
        var allocation = new PaymentAllocation(receipt.Id, invoice.Id, request.Amount, actor.Id, DateTime.UtcNow);
        dbContext.PaymentAllocations.Add(allocation);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return MapAllocation(allocation);
    }

    [HttpPost("allocations/{allocationId:guid}/reverse")]
    public async Task<PaymentAllocationDto> ReverseAllocation(Guid allocationId,
        [FromBody] ReverseAllocationRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var allocation = await dbContext.PaymentAllocations.SingleOrDefaultAsync(item => item.Id == allocationId, cancellationToken)
            ?? throw Missing("allocation_not_found", "The allocation was not found.");
        var receipt = await dbContext.PaymentReceipts.SingleAsync(item => item.Id == allocation.PaymentReceiptId, cancellationToken);
        var invoice = await dbContext.Invoices.SingleAsync(item => item.Id == allocation.InvoiceId, cancellationToken);
        EnsureVersion(allocation.Version, request.AllocationVersion);
        EnsureVersion(receipt.Version, request.ReceiptVersion);
        EnsureVersion(invoice.Version, request.InvoiceVersion);
        Execute(() => allocation.Reverse(actor.Id, DateTime.UtcNow, request.Reason));
        Execute(() => receipt.ReverseAllocation(allocation.Amount));
        Execute(() => invoice.ReversePayment(allocation.Amount));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return MapAllocation(allocation);
    }

    [HttpPost("receipts/{receiptId:guid}/reverse")]
    public async Task<PaymentReceiptDto> ReverseReceipt(Guid receiptId,
        [FromBody] ReverseReceiptRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        var receipt = await dbContext.PaymentReceipts.SingleOrDefaultAsync(item => item.Id == receiptId, cancellationToken)
            ?? throw Missing("receipt_not_found", "The receipt was not found.");
        EnsureVersion(receipt.Version, request.Version);
        Execute(() => receipt.Reverse(actor.Id, DateTime.UtcNow, request.Reason));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapReceipt(receipt);
    }

    [HttpPost("invoices/{invoiceId:guid}/adjustments")]
    public async Task<InvoiceReceivableDto> AdjustInvoice(Guid invoiceId,
        [FromBody] InvoiceAdjustmentRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.BillingOperator, cancellationToken);
        if (!Enum.TryParse<InvoiceAdjustmentKind>(request.Kind, true, out var kind))
            throw Invalid("invoice_adjustment_kind_invalid", "Use Credit, Debit, or WriteOff.");
        var invoice = await dbContext.Invoices.SingleOrDefaultAsync(item => item.Id == invoiceId, cancellationToken)
            ?? throw Missing("invoice_not_found", "The invoice was not found.");
        EnsureVersion(invoice.Version, request.InvoiceVersion);
        Execute(() => invoice.ApplyAdjustment(kind, request.Amount));
        dbContext.InvoiceAdjustments.Add(new InvoiceAdjustment(invoice.Id, kind, request.Amount,
            request.Reason, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapInvoice(invoice);
    }

    [HttpPost("imports/preview")]
    public async Task<PaymentImportBatchDto> PreviewImport(
        [FromBody] PreviewPaymentImportRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        var source = request.Source?.Trim() ?? string.Empty;
        if (source.Length is < 1 or > 100)
            throw Invalid("payment_import_source_invalid", "Enter a source of up to 100 characters.");
        if (!await dbContext.Organizations.AsNoTracking().AnyAsync(item =>
            item.Id == request.OrganizationId && item.IsActive && item.Kind == OrganizationKind.Customer,
            cancellationToken)) throw Missing("customer_not_found", "The Customer was not found.");
        var payloadHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.CsvText)));
        var existing = await dbContext.PaymentImportBatches.SingleOrDefaultAsync(item =>
            item.Source == source && item.PayloadSha256 == payloadHash, cancellationToken);
        if (existing is not null && existing.Status != PaymentImportBatchStatus.Preview)
            throw Conflict("payment_import_duplicate", "This payment file was already imported.");
        if (existing is not null && existing.PreviewedByUserId != actor.Id)
            throw Conflict("payment_import_preview_owned", "Another Cash Operator is reviewing this file. Ask them to complete that review.");
        var rows = ParseImport(request.OrganizationId, source, request.CsvText);
        var externalIds = rows.Select(item => item.ExternalId).ToList();
        if (await dbContext.PaymentReceipts.AsNoTracking().AnyAsync(item =>
            item.Source == source && externalIds.Contains(item.ExternalId), cancellationToken))
            throw Conflict("payment_import_duplicate_external_id", "One or more imported external IDs already exist.");
        var previewJson = JsonSerializer.Serialize(rows, JsonOptions);
        var batch = existing ?? new PaymentImportBatch(source, payloadHash, previewJson,
            rows.Count, rows.Sum(item => item.Amount), actor.Id, DateTime.UtcNow);
        if (existing is null) dbContext.PaymentImportBatches.Add(batch);
        else if (!(JsonSerializer.Deserialize<List<PaymentImportRow>>(existing.PreviewJson, JsonOptions) ?? []).SequenceEqual(rows))
            Execute(() => existing.RevisePreview(previewJson, rows.Count, rows.Sum(item => item.Amount), actor.Id, DateTime.UtcNow));
        await SaveAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return MapImport(batch);
    }

    [HttpPost("imports/{batchId:guid}/confirm")]
    public async Task<PaymentImportBatchDto> ConfirmImport(Guid batchId,
        [FromBody] ConfirmPaymentImportRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var batch = await dbContext.PaymentImportBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing("payment_import_not_found", "The payment import was not found.");
        if (batch.PreviewedByUserId != actor.Id)
            throw Conflict("payment_import_preview_owned", "Only the Cash Operator who reviewed this file may confirm it.");
        if (batch.Status == PaymentImportBatchStatus.Confirmed) return MapImport(batch);
        EnsureVersion(batch.Version, request.Version);
        var rows = JsonSerializer.Deserialize<List<PaymentImportRow>>(batch.PreviewJson, JsonOptions) ?? [];
        var organizationIds = rows.Select(item => item.OrganizationId).Distinct().ToList();
        if (rows.Count != batch.RowCount || rows.Sum(item => item.Amount) != batch.TotalAmount
            || await dbContext.Organizations.AsNoTracking().CountAsync(item => organizationIds.Contains(item.Id)
                && item.IsActive && item.Kind == OrganizationKind.Customer, cancellationToken) != organizationIds.Count)
            throw Conflict("payment_import_preview_stale", "The reviewed Customer or import totals changed. Preview the file again before confirming.");
        foreach (var row in rows)
        {
            if (await dbContext.PaymentReceipts.AnyAsync(item => item.Source == row.Source && item.ExternalId == row.ExternalId, cancellationToken))
                throw Conflict("payment_import_duplicate_external_id", "An imported external ID was recorded after preview. Refresh the preview.");
            dbContext.PaymentReceipts.Add(new PaymentReceipt(row.OrganizationId, ReceiptNumber(), row.Source,
                row.ExternalId, row.Payer, row.Amount, row.Currency, row.ReceivedOn, "CSV import",
                row.Reference, $"payment-import:{batch.Id}", row.Memo, actor.Id, DateTime.UtcNow));
        }
        Execute(() => batch.Confirm(actor.Id, DateTime.UtcNow));
        await SaveAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return MapImport(batch);
    }

    [HttpPost("reconciliations")]
    public async Task<ReconciliationBatchDto> CreateReconciliation(
        [FromBody] CreateReconciliationRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        var receipts = await dbContext.PaymentReceipts.AsNoTracking().Where(item =>
            request.PaymentReceiptIds.Contains(item.Id) && item.Status != PaymentReceiptStatus.Reversed).ToListAsync(cancellationToken);
        if (receipts.Count != request.PaymentReceiptIds.Distinct().Count())
            throw Invalid("reconciliation_receipts_invalid", "Every receipt must exist and remain unreversed.");
        var allocations = await dbContext.PaymentAllocations.AsNoTracking().Where(item =>
            request.PaymentAllocationIds.Contains(item.Id)).ToListAsync(cancellationToken);
        if (allocations.Count != request.PaymentAllocationIds.Distinct().Count())
            throw Invalid("reconciliation_allocations_invalid", "Every allocation must exist.");
        var adjustments = await dbContext.InvoiceAdjustments.AsNoTracking().Where(item =>
            request.InvoiceAdjustmentIds.Contains(item.Id)).ToListAsync(cancellationToken);
        if (adjustments.Count != request.InvoiceAdjustmentIds.Distinct().Count())
            throw Invalid("reconciliation_adjustments_invalid", "Every adjustment must exist.");
        var ledgerTotal = receipts.Sum(item => item.Amount);
        var batch = new ReconciliationBatch($"REC-{request.PeriodEnd:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant(),
            request.PeriodEnd, ledgerTotal, request.BankTotal, actor.Id);
        dbContext.ReconciliationBatches.Add(batch);
        foreach (var item in receipts)
            dbContext.ReconciliationBatchItems.Add(new ReconciliationBatchItem(batch.Id,
                "PaymentReceipt", item.Id, item.Amount, item.RecordedByUserId));
        foreach (var item in allocations)
        {
            dbContext.ReconciliationBatchItems.Add(new ReconciliationBatchItem(batch.Id,
                "PaymentAllocation", item.Id, 0, item.AllocatedByUserId));
            if (item.ReversedByUserId.HasValue)
                dbContext.ReconciliationBatchItems.Add(new ReconciliationBatchItem(batch.Id,
                    "PaymentAllocationReversal", item.Id, 0, item.ReversedByUserId.Value));
        }
        foreach (var item in adjustments)
            dbContext.ReconciliationBatchItems.Add(new ReconciliationBatchItem(batch.Id,
                "InvoiceAdjustment", item.Id, 0, item.RecordedByUserId));
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return MapReconciliation(batch);
    }

    [HttpGet("reconciliations/{batchId:guid}")]
    public async Task<ReconciliationDetailDto> ReconciliationDetail(Guid batchId, CancellationToken cancellationToken)
    {
        await requestContext.RequireAnyBusinessRoleAsync(HttpContext,
            [BusinessRole.CashOperator, BusinessRole.CashReconciler], EnforceRoles, cancellationToken);
        var batch = await dbContext.ReconciliationBatches.AsNoTracking().SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing("reconciliation_not_found", "The reconciliation was not found.");
        return await MapReconciliationDetail(batch, cancellationToken);
    }

    [HttpPost("reconciliations/{batchId:guid}/draft")]
    public async Task<ReconciliationDetailDto> EditReconciliationDraft(Guid batchId,
        [FromBody] EditReconciliationDraftRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var batch = await dbContext.ReconciliationBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing("reconciliation_not_found", "The reconciliation was not found.");
        EnsureVersion(batch.Version, request.Version);
        var items = await dbContext.ReconciliationBatchItems.Where(item => item.ReconciliationBatchId == batch.Id).ToListAsync(cancellationToken);
        var desired = await ReadReconciliationItems(batch.Id, request.PaymentReceiptIds, request.PaymentAllocationIds, request.InvoiceAdjustmentIds, cancellationToken);
        var before = DraftSnapshot(batch, items);
        var after = new ReconciliationDraftSnapshot(request.PeriodEnd, desired.Where(item => item.SourceType == "PaymentReceipt").Sum(item => item.Amount),
            request.BankTotal, request.PaymentReceiptIds.Distinct().ToList(), request.PaymentAllocationIds.Distinct().ToList(), request.InvoiceAdjustmentIds.Distinct().ToList());
        Execute(() => batch.ReviseDraft(before, after, actor.Id, request.Reason, DateTime.UtcNow));
        dbContext.ReconciliationBatchItems.RemoveRange(items.Where(item => !desired.Any(value => value.SourceType == item.SourceType && value.SourceId == item.SourceId)));
        dbContext.ReconciliationBatchItems.AddRange(desired.Where(item => !items.Any(value => value.SourceType == item.SourceType && value.SourceId == item.SourceId)));
        if (batch.Difference == 0) await ResolveReconciliationAttention(batch.Id, actor.Id, request.Reason, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken); await transaction.CommitAsync(cancellationToken);
        return await MapReconciliationDetail(batch, cancellationToken);
    }

    [HttpPost("reconciliations/{batchId:guid}/cancel")]
    public async Task<ReconciliationDetailDto> CancelReconciliationDraft(Guid batchId,
        [FromBody] CancelReconciliationDraftRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var batch = await dbContext.ReconciliationBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing("reconciliation_not_found", "The reconciliation was not found.");
        EnsureVersion(batch.Version, request.Version);
        var items = await dbContext.ReconciliationBatchItems.AsNoTracking().Where(item => item.ReconciliationBatchId == batch.Id).ToListAsync(cancellationToken);
        Execute(() => batch.CancelDraft(DraftSnapshot(batch, items), actor.Id, request.Reason, DateTime.UtcNow));
        await ResolveReconciliationAttention(batch.Id, actor.Id, request.Reason, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await MapReconciliationDetail(batch, cancellationToken);
    }

    [HttpPost("reconciliations/{batchId:guid}/submit")]
    public async Task<ReconciliationBatchDto> SubmitReconciliation(Guid batchId,
        [FromBody] ReconciliationMutationRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashOperator, cancellationToken);
        var batch = await dbContext.ReconciliationBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing("reconciliation_not_found", "The reconciliation was not found.");
        EnsureVersion(batch.Version, request.Version);
        Execute(() => batch.Submit(actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapReconciliation(batch);
    }

    [HttpPost("reconciliations/{batchId:guid}/approve")]
    public async Task<ReconciliationBatchDto> ApproveReconciliation(Guid batchId,
        [FromBody] ReconciliationMutationRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireAsync(BusinessRole.CashReconciler, cancellationToken);
        var batch = await dbContext.ReconciliationBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing("reconciliation_not_found", "The reconciliation was not found.");
        EnsureVersion(batch.Version, request.Version);
        var items = await dbContext.ReconciliationBatchItems.AsNoTracking()
            .Where(item => item.ReconciliationBatchId == batch.Id).OrderBy(item => item.SourceType).ToListAsync(cancellationToken);
        var report = JsonSerializer.Serialize(new
        {
            batch.BatchNumber,
            batch.PeriodEnd,
            batch.LedgerReceiptTotal,
            batch.BankTotal,
            batch.Difference,
            itemCount = items.Count,
            draftChanges = batch.ReadDraftChanges(),
            approvedByUserId = actor.Id,
            approvedAtUtc = DateTime.UtcNow
        }, JsonOptions);
        var contributingActors = items.Select(item => item.ContributingActorUserId)
            .Concat(batch.ReadDraftChanges().Select(change => change.ActorUserId)).Distinct().ToList();
        var actorConflict = actor.Id == batch.CreatedByUserIdValue
            || actor.Id == batch.SubmittedByUserId
            || contributingActors.Contains(actor.Id);
        if (actorConflict && rolloutOptions.Value.DualControlAuditOnly
            && !rolloutOptions.Value.DualControlEnforced)
            logger.LogWarning(
                "Dual-control audit: user {UserId} attempted reconciliation approval with contributed activity in batch {BatchId}.",
                actor.Id, batch.Id);
        Execute(() => batch.Approve(actor.Id, contributingActors,
            report, DateTime.UtcNow, rolloutOptions.Value.DualControlEnforced));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapReconciliation(batch);
    }

    [HttpGet("reconciliations")]
    public async Task<IReadOnlyList<ReconciliationBatchDto>> Reconciliations(CancellationToken cancellationToken, [FromQuery] Guid? batchId = null)
    {
        await requestContext.RequireAnyBusinessRoleAsync(HttpContext,
            [BusinessRole.CashOperator, BusinessRole.CashReconciler], EnforceRoles, cancellationToken);
        return await dbContext.ReconciliationBatches.AsNoTracking().Where(item => !batchId.HasValue || item.Id == batchId).OrderByDescending(item => item.PeriodEnd)
            .Select(item => MapReconciliation(item)).Take(500).ToListAsync(cancellationToken);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string report,
        CancellationToken cancellationToken)
    {
        var normalized = report.Trim().ToLowerInvariant();
        var csv = new StringBuilder();
        switch (normalized)
        {
            case "invoices":
            case "aging":
            {
                await RequireAsync(BusinessRole.BillingOperator, cancellationToken);
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var query = dbContext.Invoices.AsNoTracking();
                if (normalized == "aging")
                    query = query.Where(item => item.Status == InvoiceStatus.Issued
                        || item.Status == InvoiceStatus.PartiallyPaid);
                var rows = await query.OrderBy(item => item.DueOn)
                    .ThenBy(item => item.InvoiceNumber).ToListAsync(cancellationToken);
                csv.AppendLine("invoice_number,organization_id,status,issued_on,due_on,days_past_due,subtotal,tax,adjustments,total,applied,balance,currency");
                foreach (var item in rows)
                    CsvLine(csv, item.InvoiceNumber, item.OrganizationId, item.Status,
                        item.IssuedOn, item.DueOn,
                        Math.Max(0, today.DayNumber - item.DueOn.DayNumber), item.Subtotal,
                        item.TaxTotal, item.AdjustmentTotal, item.Total, item.AppliedTotal,
                        item.Balance, item.Currency);
                break;
            }
            case "receipts":
            case "unapplied-cash":
            {
                await RequireAsync(BusinessRole.CashOperator, cancellationToken);
                var query = dbContext.PaymentReceipts.AsNoTracking();
                if (normalized == "unapplied-cash")
                    query = query.Where(item => item.UnappliedAmount > 0
                        && item.Status != PaymentReceiptStatus.Reversed);
                var rows = await query.OrderByDescending(item => item.ReceivedOn)
                    .ThenBy(item => item.ReceiptNumber).ToListAsync(cancellationToken);
                csv.AppendLine("receipt_number,organization_id,source,external_id,payer,received_on,method,bank_reference,amount,applied,unapplied,currency,status");
                foreach (var item in rows)
                    CsvLine(csv, item.ReceiptNumber, item.OrganizationId, item.Source,
                        item.ExternalId, item.Payer, item.ReceivedOn, item.Method,
                        item.BankReference, item.Amount, item.AppliedAmount,
                        item.UnappliedAmount, item.Currency, item.Status);
                break;
            }
            case "reconciliations":
            {
                await requestContext.RequireAnyBusinessRoleAsync(HttpContext,
                    [BusinessRole.CashOperator, BusinessRole.CashReconciler],
                    EnforceRoles, cancellationToken);
                var rows = await dbContext.ReconciliationBatches.AsNoTracking()
                    .OrderByDescending(item => item.PeriodEnd).ToListAsync(cancellationToken);
                csv.AppendLine("batch_number,period_end,status,ledger_receipt_total,bank_total,difference,created_by,submitted_by,approved_by");
                foreach (var item in rows)
                    CsvLine(csv, item.BatchNumber, item.PeriodEnd, item.Status,
                        item.LedgerReceiptTotal, item.BankTotal, item.Difference,
                        item.CreatedByUserIdValue, item.SubmittedByUserId,
                        item.ApprovedByUserId);
                break;
            }
            default:
                throw Invalid("accounts_receivable_export_invalid",
                    "Use invoices, aging, receipts, unapplied-cash, or reconciliations.");
        }

        return File(Encoding.UTF8.GetBytes(csv.ToString()),
            "text/csv; charset=utf-8",
            $"pseq-ar-{normalized}-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    private Task<User> RequireAsync(BusinessRole role, CancellationToken cancellationToken) =>
        requestContext.RequireBusinessRoleAsync(HttpContext, role, EnforceRoles, cancellationToken);

    private async Task SaveAsync(CancellationToken cancellationToken)
    {
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (exception.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true)
        { throw Conflict("accounts_receivable_duplicate", "The receipt, invoice, import, or batch identifier already exists."); }
    }

    private static IReadOnlyList<PaymentImportRow> ParseImport(Guid organizationId, string expectedSource, string csv)
    {
        var lines = csv.Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length < 2) throw Invalid("payment_import_empty", "The import requires a header and at least one row.");
        var headers = ParseCsvLine(lines[0]).Select(item => item.Trim().ToLowerInvariant()).ToList();
        string[] required = ["source", "external_id", "date", "amount", "currency", "payer", "reference", "memo"];
        if (required.Any(item => !headers.Contains(item)) || headers.Distinct(StringComparer.Ordinal).Count() != headers.Count)
            throw Invalid("payment_import_columns_invalid", "The CSV requires source, external_id, date, amount, currency, payer, reference, and memo columns.");
        var rows = new List<PaymentImportRow>();
        for (var index = 1; index < lines.Length; index++)
        {
            var values = ParseCsvLine(lines[index]);
            if (values.Count != headers.Count) throw Invalid("payment_import_row_invalid", $"CSV row {index + 1} has the wrong number of columns.");
            var row = headers.Zip(values).ToDictionary(item => item.First, item => item.Second.Trim());
            if (!string.Equals(row["source"], expectedSource, StringComparison.Ordinal))
                throw Invalid("payment_import_source_mismatch", $"CSV row {index + 1} does not match the selected source.");
            if (!DateOnly.TryParseExact(row["date"], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
                || !decimal.TryParse(row["amount"], NumberStyles.Number, CultureInfo.InvariantCulture, out var amount)
                || decimal.Round(amount, 2, MidpointRounding.AwayFromZero) <= 0 || !string.Equals(row["currency"], "USD", StringComparison.OrdinalIgnoreCase)
                || string.IsNullOrWhiteSpace(row["external_id"]) || string.IsNullOrWhiteSpace(row["payer"])
                || string.IsNullOrWhiteSpace(row["reference"]))
                throw Invalid("payment_import_row_invalid", $"CSV row {index + 1} contains invalid required values or a non-USD currency.");
            rows.Add(new PaymentImportRow(organizationId, row["source"], row["external_id"], date,
                decimal.Round(amount, 2, MidpointRounding.AwayFromZero), "USD", row["payer"], row["reference"], row["memo"]));
        }
        if (rows.Select(item => item.ExternalId).Distinct(StringComparer.Ordinal).Count() != rows.Count)
            throw Invalid("payment_import_duplicate_external_id", "The CSV contains duplicate external IDs.");
        return rows;
    }

    private static List<string> ParseCsvLine(string line)
    {
        var values = new List<string>();
        var current = new StringBuilder();
        var quoted = false;
        for (var index = 0; index < line.Length; index++)
        {
            var character = line[index];
            if (character == '"')
            {
                if (quoted && index + 1 < line.Length && line[index + 1] == '"') { current.Append('"'); index++; }
                else quoted = !quoted;
            }
            else if (character == ',' && !quoted) { values.Add(current.ToString()); current.Clear(); }
            else current.Append(character);
        }
        if (quoted) throw Invalid("payment_import_csv_invalid", "The CSV contains an unterminated quoted field.");
        values.Add(current.ToString());
        return values;
    }

    private static void CsvLine(StringBuilder target, params object?[] values)
    {
        target.AppendLine(string.Join(',', values.Select(value =>
        {
            var text = value switch
            {
                null => string.Empty,
                IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
                _ => value.ToString() ?? string.Empty
            };
            return $"\"{text.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
        })));
    }

    private sealed record PaymentImportRow(Guid OrganizationId, string Source, string ExternalId,
        DateOnly ReceivedOn, decimal Amount, string Currency, string Payer, string Reference, string? Memo);
    private static string ReceiptNumber() => $"RCT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..21].ToUpperInvariant();
    private static InvoiceReceivableDto MapInvoice(Invoice item) => new(item.Id, item.OrganizationId,
        item.LabServiceOrderId, item.InvoiceNumber, item.Status.ToString(), item.IssuedOn, item.DueOn,
        Math.Max(0, DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - item.DueOn.DayNumber),
        item.Subtotal, item.TaxTotal, item.AdjustmentTotal, item.Total, item.AppliedTotal,
        item.Balance, item.Currency, item.Version);
    private static PaymentReceiptDto MapReceipt(PaymentReceipt item) => new(item.Id, item.OrganizationId,
        item.ReceiptNumber, item.Source, item.ExternalId, item.Payer, item.Amount, item.AppliedAmount,
        item.UnappliedAmount, item.Currency, item.ReceivedOn, item.Method, item.BankReference,
        item.Status.ToString(), item.Version);
    private async Task ResolveReconciliationAttention(Guid batchId, Guid actorId, string reason, CancellationToken token)
    {
        var attention = await dbContext.OperationalAttentionItems.Where(item => item.SourceType == "ReconciliationBatch"
            && item.SourceId == batchId && item.Category == OperationalAttentionCategory.ReconciliationDifference
            && item.Status != OperationalAttentionStatus.Resolved).ToListAsync(token);
        foreach (var item in attention) item.Resolve(actorId, DateTime.UtcNow, reason);
    }

    private static ReconciliationDraftSnapshot DraftSnapshot(ReconciliationBatch batch, IReadOnlyList<ReconciliationBatchItem> items) =>
        new(batch.PeriodEnd, batch.LedgerReceiptTotal, batch.BankTotal,
            items.Where(item => item.SourceType == "PaymentReceipt").Select(item => item.SourceId).ToList(),
            items.Where(item => item.SourceType == "PaymentAllocation").Select(item => item.SourceId).ToList(),
            items.Where(item => item.SourceType == "InvoiceAdjustment").Select(item => item.SourceId).ToList());

    private async Task<List<ReconciliationBatchItem>> ReadReconciliationItems(Guid batchId, IReadOnlyList<Guid> receiptIds,
        IReadOnlyList<Guid> allocationIds, IReadOnlyList<Guid> adjustmentIds, CancellationToken token)
    {
        if (receiptIds is null || allocationIds is null || adjustmentIds is null || receiptIds.Count > 1000 || allocationIds.Count > 1000 || adjustmentIds.Count > 1000)
            throw Invalid("reconciliation_sources_invalid", "Provide up to 1,000 entries of each source type.");
        var receipts = await dbContext.PaymentReceipts.AsNoTracking().Where(item => receiptIds.Contains(item.Id) && item.Status != PaymentReceiptStatus.Reversed).ToListAsync(token);
        var allocations = await dbContext.PaymentAllocations.AsNoTracking().Where(item => allocationIds.Contains(item.Id)).ToListAsync(token);
        var adjustments = await dbContext.InvoiceAdjustments.AsNoTracking().Where(item => adjustmentIds.Contains(item.Id)).ToListAsync(token);
        if (receipts.Count != receiptIds.Distinct().Count() || allocations.Count != allocationIds.Distinct().Count() || adjustments.Count != adjustmentIds.Distinct().Count())
            throw Invalid("reconciliation_sources_invalid", "Every selected source must exist and each receipt must remain unreversed.");
        var result = receipts.Select(item => new ReconciliationBatchItem(batchId, "PaymentReceipt", item.Id, item.Amount, item.RecordedByUserId)).ToList();
        foreach (var item in allocations)
        {
            result.Add(new(batchId, "PaymentAllocation", item.Id, 0, item.AllocatedByUserId));
            if (item.ReversedByUserId.HasValue) result.Add(new(batchId, "PaymentAllocationReversal", item.Id, 0, item.ReversedByUserId.Value));
        }
        result.AddRange(adjustments.Select(item => new ReconciliationBatchItem(batchId, "InvoiceAdjustment", item.Id, 0, item.RecordedByUserId)));
        return result;
    }

    private async Task<ReconciliationDetailDto> MapReconciliationDetail(ReconciliationBatch batch, CancellationToken token)
    {
        var items = await dbContext.ReconciliationBatchItems.AsNoTracking().Where(item => item.ReconciliationBatchId == batch.Id)
            .OrderBy(item => item.SourceType).ThenBy(item => item.Id).ToListAsync(token);
        var ids = items.Select(item => item.SourceId).ToList();
        var receipts = await dbContext.PaymentReceipts.AsNoTracking().Where(item => ids.Contains(item.Id)).ToListAsync(token);
        var references = receipts.ToDictionary(item => item.Id, item => item.ReceiptNumber);
        foreach (var item in await (from allocation in dbContext.PaymentAllocations.AsNoTracking()
            join invoice in dbContext.Invoices on allocation.InvoiceId equals invoice.Id
            where ids.Contains(allocation.Id) select new { allocation.Id, invoice.InvoiceNumber }).ToListAsync(token))
            references[item.Id] = item.InvoiceNumber;
        foreach (var item in await (from adjustment in dbContext.InvoiceAdjustments.AsNoTracking()
            join invoice in dbContext.Invoices on adjustment.InvoiceId equals invoice.Id
            where ids.Contains(adjustment.Id) select new { adjustment.Id, invoice.InvoiceNumber }).ToListAsync(token))
            references[item.Id] = item.InvoiceNumber;
        var changes = batch.ReadDraftChanges(); var actorIds = changes.Select(item => item.ActorUserId).ToList();
        var actors = await dbContext.Users.AsNoTracking().Where(item => actorIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.FirstName + " " + item.LastName, token);
        return new(MapReconciliation(batch), items.Select(item => new ReconciliationItemDto(item.SourceType, item.SourceId, references.GetValueOrDefault(item.SourceId, "Historical source"), item.Amount)).ToList(),
            changes.Select(item => new ReconciliationChangeDto(item, actors.GetValueOrDefault(item.ActorUserId, "Former operator"))).ToList(), receipts.Select(MapReceipt).ToList());
    }

    private static PaymentAllocationDto MapAllocation(PaymentAllocation item) => new(item.Id,
        item.PaymentReceiptId, item.InvoiceId, item.Amount, item.AllocatedByUserId,
        item.AllocatedAtUtc, item.IsReversed, item.Version, item.ReversedByUserId, item.ReversedAtUtc, item.ReversalReason);
    private static PaymentImportBatchDto MapImport(PaymentImportBatch item) => new(item.Id, item.Source,
        item.PayloadSha256, item.RowCount, item.TotalAmount, item.Status.ToString(), item.PreviewJson,
        item.PreviewedByUserId, item.PreviewedAtUtc, item.ConfirmedByUserId, item.ConfirmedAtUtc, item.Version);
    private static ReconciliationBatchDto MapReconciliation(ReconciliationBatch item) => new(item.Id,
        item.BatchNumber, item.PeriodEnd, item.LedgerReceiptTotal, item.BankTotal, item.Difference,
        item.Status.ToString(), item.CreatedByUserIdValue, item.SubmittedByUserId, item.ApprovedByUserId,
        item.CloseoutReportJson, item.Version);
    private static void EnsureVersion(long actual, long expected)
    { if (actual != expected) throw Conflict("concurrency_conflict", "This record changed. Refresh and try again."); }
    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("accounts_receivable_invalid", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("accounts_receivable_transition_invalid", exception.Message); }
    }
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing(string code, string message) => new(code, message, StatusCodes.Status404NotFound);
}

[ApiController]
[Authorize]
[Route("api/accounts-receivable/invoices")]
public sealed class CustomerInvoicesController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    IOperationalFileStorage fileStorage) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<InvoiceReceivableDto>> List(CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        return await dbContext.Invoices.AsNoTracking().Where(item => item.OrganizationId == tenant.Organization.Id
                && dbContext.LabServiceOrders.Any(order => order.Id == item.LabServiceOrderId
                    && order.OrganizationId == tenant.Organization.Id && order.DepartmentId == tenant.Department.Id))
            .OrderByDescending(item => item.IssuedOn).Select(item => new InvoiceReceivableDto(item.Id,
                item.OrganizationId, item.LabServiceOrderId, item.InvoiceNumber, item.Status.ToString(),
                item.IssuedOn, item.DueOn, Math.Max(0, DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - item.DueOn.DayNumber),
                item.Subtotal, item.TaxTotal, item.AdjustmentTotal, item.Total, item.AppliedTotal,
                item.Balance, item.Currency, item.Version)).ToListAsync(cancellationToken);
    }

    [HttpGet("{invoiceId:guid}/pdf")]
    public async Task<IActionResult> DownloadPdf(Guid invoiceId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        var invoice = await dbContext.Invoices.AsNoTracking().SingleOrDefaultAsync(item =>
            item.Id == invoiceId && item.OrganizationId == tenant.Organization.Id
                && dbContext.LabServiceOrders.Any(order => order.Id == item.LabServiceOrderId
                    && order.OrganizationId == tenant.Organization.Id && order.DepartmentId == tenant.Department.Id), cancellationToken)
            ?? throw new OrderManagementException("invoice_not_found", "The invoice was not found.", StatusCodes.Status404NotFound);
        var stream = await fileStorage.OpenReadAsync(invoice.PdfStorageKey, cancellationToken);
        return File(stream, "application/pdf", $"{invoice.InvoiceNumber}.pdf", enableRangeProcessing: true);
    }
}
