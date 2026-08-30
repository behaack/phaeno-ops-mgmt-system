namespace PhaenoPortal.App.Features.OrderToCash;

using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;

[ApiController]
[Authorize]
[Route("api/order-to-cash/ar")]
public sealed class AccountsReceivableController(
    PSeqOperationsDbContext dbContext,
    OrderToCashAuthorization authorization,
    OperationalReadinessService readiness,
    NativeInvoiceService invoices,
    IOperationalFileStorage fileStorage,
    IExternalIdentityContext externalIdentityContext,
    IOptions<OrderToCashOptions> options) : ControllerBase
{
    [HttpPut("organizations/{organizationId:guid}/billing")]
    public async Task<ActionResult<OperationalReadinessResult>> ConfigureBilling(Guid organizationId,
        [FromBody] ConfigureBillingRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.BillingOperator, cancellationToken);
        var profile = await dbContext.OrganizationCommercialProfiles.SingleOrDefaultAsync(
            value => value.OrganizationId == organizationId, cancellationToken);
        if (profile is null)
        {
            profile = new OrganizationCommercialProfile(organizationId);
            dbContext.OrganizationCommercialProfiles.Add(profile);
        }
        else if (profile.Version != request.Version) throw new DbUpdateConcurrencyException();
        profile.ConfigurePSeqBilling(request.BillingContactName, request.BillingContactEmail,
            request.BillingAddressJson, request.PaymentTermsDays, request.TaxDecision,
            request.ApprovedTaxRate, request.TaxExemptionEvidenceReference, actor.Id,
            DateTime.UtcNow, request.FinanceApprovalNotes);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(await readiness.EvaluateAsync(organizationId, DateTime.UtcNow, cancellationToken));
    }

    [HttpPost("invoices/issue-for-order/{orderId:guid}")]
    public async Task<ActionResult<InvoiceDto>> IssueInvoice(Guid orderId, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.BillingOperator, cancellationToken);
        var order = await dbContext.LabServiceOrders.Include(value => value.Quotes)
            .SingleOrDefaultAsync(value => value.Id == orderId, cancellationToken)
            ?? throw Missing("invoice_order_missing", "The PSeq Job was not found.");
        var quote = order.Quotes.SingleOrDefault(value => value.Id == order.AcceptedQuoteId)
            ?? throw Conflict("invoice_quote_missing", "The accepted quote was not found.");
        var invoice = await invoices.IssueForCompletedOrderAsync(order, quote, actor.Id,
            order.CompletedAt ?? DateTime.UtcNow, cancellationToken);
        return Ok(ToDto(invoice));
    }

    [HttpGet("invoices")]
    public async Task<ActionResult<IReadOnlyList<InvoiceDto>>> ListInvoices(
        [FromQuery] Guid? organizationId, [FromQuery] bool openOnly,
        CancellationToken cancellationToken)
    {
        RequireFeature();
        var scope = await ReadScopeAsync(organizationId, cancellationToken);
        var query = dbContext.Invoices.AsNoTracking().AsQueryable();
        if (scope.HasValue) query = query.Where(value => value.OrganizationId == scope.Value);
        if (openOnly) query = query.Where(value => value.Status == InvoiceStatus.Issued || value.Status == InvoiceStatus.PartiallyPaid);
        var values = await query.OrderByDescending(value => value.IssuedAtUtc).ToListAsync(cancellationToken);
        return Ok(values.Select(ToDto).ToArray());
    }

    [HttpGet("invoices/{id:guid}/document")]
    public async Task<IActionResult> DownloadInvoice(Guid id, CancellationToken cancellationToken)
    {
        RequireFeature();
        var invoice = await dbContext.Invoices.AsNoTracking().SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw Missing("invoice_missing", "The invoice was not found.");
        var scope = await ReadScopeAsync(invoice.OrganizationId, cancellationToken);
        if (scope.HasValue && scope.Value != invoice.OrganizationId) throw Forbidden();
        var document = await dbContext.InvoiceDocuments.AsNoTracking().SingleOrDefaultAsync(value => value.InvoiceId == id, cancellationToken)
            ?? throw Conflict("invoice_document_missing", "The immutable invoice PDF is unavailable.");
        var stream = await fileStorage.OpenReadAsync(document.StorageObjectKey, cancellationToken);
        Response.Headers.ContentDisposition = $"attachment; filename=\"{invoice.InvoiceNumber}.pdf\"";
        return File(stream, "application/pdf");
    }

    [HttpPost("receipts")]
    public async Task<ActionResult<PaymentReceiptDto>> RecordReceipt(
        [FromBody] RecordReceiptRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        var duplicate = await dbContext.PaymentReceipts.AnyAsync(value => value.ExternalId == request.ExternalId, cancellationToken);
        if (duplicate) throw Conflict("receipt_external_id_duplicate", "The external receipt ID already exists.");
        var number = $"RCPT-{DateTime.UtcNow:yyyyMMdd}-{request.ExternalId.Trim()}";
        var receipt = new PaymentReceipt(request.OrganizationId, number, request.Payer,
            request.Amount, request.Currency, request.ReceivedAtUtc, request.Method,
            request.BankReference, request.EvidenceReference, request.ExternalId,
            request.Memo, actor.Id);
        dbContext.PaymentReceipts.Add(receipt);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(ListReceipts), new { organizationId = request.OrganizationId }, ToDto(receipt));
    }

    [HttpGet("receipts")]
    public async Task<ActionResult<IReadOnlyList<PaymentReceiptDto>>> ListReceipts(
        [FromQuery] Guid? organizationId, CancellationToken cancellationToken)
    {
        RequireFeature();
        var scope = await ReadScopeAsync(organizationId, cancellationToken);
        var query = dbContext.PaymentReceipts.AsNoTracking().AsQueryable();
        if (scope.HasValue) query = query.Where(value => value.OrganizationId == scope.Value);
        var values = await query.OrderByDescending(value => value.ReceivedAtUtc).ToListAsync(cancellationToken);
        return Ok(values.Select(ToDto).ToArray());
    }

    [HttpGet("receipts/{id:guid}/matching-suggestions")]
    public async Task<ActionResult<IReadOnlyList<PaymentMatchSuggestionDto>>> MatchingSuggestions(
        Guid id, CancellationToken cancellationToken)
    {
        RequireFeature();
        _ = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        var receipt = await dbContext.PaymentReceipts.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw Missing("receipt_missing", "The receipt was not found.");
        var invoices = await dbContext.Invoices.AsNoTracking()
            .Where(value => value.OrganizationId == receipt.OrganizationId
                && value.Currency == receipt.Currency
                && value.Balance > 0
                && (value.Status == InvoiceStatus.Issued || value.Status == InvoiceStatus.PartiallyPaid))
            .OrderBy(value => value.DueAtUtc)
            .ToListAsync(cancellationToken);
        return Ok(invoices.Select(value =>
        {
            var reasons = new List<string>();
            var score = 0;
            if (string.Equals(value.InvoiceNumber, receipt.BankReference,
                    StringComparison.OrdinalIgnoreCase))
            { score += 100; reasons.Add("Bank reference matches invoice number."); }
            if (value.Balance == receipt.UnappliedAmount)
            { score += 50; reasons.Add("Unapplied amount matches invoice balance."); }
            if (value.DueAtUtc <= receipt.ReceivedAtUtc)
            { score += 10; reasons.Add("Invoice was due when cash was received."); }
            return new PaymentMatchSuggestionDto(value.Id, value.InvoiceNumber,
                value.Balance, value.Currency, score, reasons);
        }).OrderByDescending(value => value.Score).ThenBy(value => value.InvoiceNumber).ToArray());
    }

    [HttpPost("allocations")]
    public async Task<ActionResult<PaymentAllocationDto>> Allocate(
        [FromBody] AllocatePaymentRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var receipt = await dbContext.PaymentReceipts.SingleOrDefaultAsync(value => value.Id == request.PaymentReceiptId, cancellationToken)
            ?? throw Missing("receipt_missing", "The receipt was not found.");
        var invoice = await dbContext.Invoices.SingleOrDefaultAsync(value => value.Id == request.InvoiceId, cancellationToken)
            ?? throw Missing("invoice_missing", "The invoice was not found.");
        if (receipt.OrganizationId != invoice.OrganizationId)
            throw Conflict("allocation_tenant_mismatch", "Receipt and invoice must belong to the same Customer.");
        receipt.Allocate(request.Amount); invoice.ApplyAllocation(request.Amount, DateTime.UtcNow);
        var allocation = new PaymentAllocation(receipt.Id, invoice.Id, request.Amount, actor.Id, DateTime.UtcNow);
        dbContext.PaymentAllocations.Add(allocation);
        await dbContext.SaveChangesAsync(cancellationToken); await transaction.CommitAsync(cancellationToken);
        return Ok(ToDto(allocation));
    }

    [HttpPost("allocations/{id:guid}/reverse")]
    public async Task<ActionResult<PaymentAllocationDto>> ReverseAllocation(Guid id,
        [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var allocation = await dbContext.PaymentAllocations.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw Missing("allocation_missing", "The allocation was not found.");
        var receipt = await dbContext.PaymentReceipts.SingleAsync(value => value.Id == allocation.PaymentReceiptId, cancellationToken);
        var invoice = await dbContext.Invoices.SingleAsync(value => value.Id == allocation.InvoiceId, cancellationToken);
        allocation.Reverse(actor.Id, DateTime.UtcNow, request.Reason);
        receipt.RestoreAllocation(allocation.Amount); invoice.ReverseAllocation(allocation.Amount);
        await dbContext.SaveChangesAsync(cancellationToken); await transaction.CommitAsync(cancellationToken);
        return Ok(ToDto(allocation));
    }

    [HttpPost("receipts/{id:guid}/reverse")]
    public async Task<ActionResult<PaymentReceiptDto>> ReverseReceipt(Guid id,
        [FromBody] ReasonRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        var receipt = await dbContext.PaymentReceipts.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw Missing("receipt_missing", "The receipt was not found.");
        receipt.Reverse(actor.Id, DateTime.UtcNow, request.Reason);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(receipt));
    }

    [HttpPost("invoices/{id:guid}/adjustments")]
    public async Task<ActionResult<InvoiceDto>> AdjustInvoice(Guid id,
        [FromBody] InvoiceAdjustmentRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.BillingOperator, cancellationToken);
        var invoice = await dbContext.Invoices.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw Missing("invoice_missing", "The invoice was not found.");
        invoice.ApplyAdjustment(request.Kind, request.Amount, DateTime.UtcNow);
        dbContext.InvoiceAdjustments.Add(new InvoiceAdjustment(id, request.Kind, request.Amount,
            request.Reason, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(invoice));
    }

    [HttpPost("imports/preview")]
    [RequestSizeLimit(5_242_880)]
    public async Task<ActionResult<PaymentImportPreviewDto>> PreviewImport(
        [FromForm] Guid organizationId, [FromForm] string source, [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        if (file.Length is 0 or > 5_242_880) throw Invalid("payment_import_file_invalid", "Select a non-empty CSV smaller than 5 MB.");
        string csv;
        await using (var stream = file.OpenReadStream())
        using (var reader = new StreamReader(stream, Encoding.UTF8, true, leaveOpen: false))
            csv = await reader.ReadToEndAsync(cancellationToken);
        var sha = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(csv))).ToLowerInvariant();
        if (await dbContext.PaymentImportBatches.AnyAsync(value => value.Source == source && value.FileSha256 == sha, cancellationToken))
            throw Conflict("payment_import_duplicate", "This source file has already been previewed.");
        var parsed = PaymentCsv.Parse(csv);
        var existingExternalIds = await dbContext.PaymentReceipts.AsNoTracking()
            .Where(value => parsed.Rows.Select(row => row.ExternalId).Contains(value.ExternalId))
            .Select(value => value.ExternalId).ToListAsync(cancellationToken);
        var errors = parsed.Errors.Concat(parsed.Rows.Where(value => existingExternalIds.Contains(value.ExternalId))
            .Select(value => $"External ID {value.ExternalId} already exists.")).ToArray();
        var batch = new PaymentImportBatch(source, sha, JsonSerializer.Serialize(parsed.Rows),
            JsonSerializer.Serialize(errors), parsed.Rows.Count, DateTime.UtcNow.AddHours(1), actor.Id);
        dbContext.PaymentImportBatches.Add(batch); await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new PaymentImportPreviewDto(batch.Id, organizationId, parsed.Rows.Count, errors, batch.ExpiresAtUtc));
    }

    [HttpPost("imports/{id:guid}/confirm")]
    public async Task<ActionResult<IReadOnlyList<PaymentReceiptDto>>> ConfirmImport(Guid id,
        [FromBody] ConfirmPaymentImportRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        var batch = await dbContext.PaymentImportBatches.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw Missing("payment_import_missing", "The payment import preview was not found.");
        var errors = JsonSerializer.Deserialize<string[]>(batch.ValidationErrorsJson) ?? [];
        if (errors.Length > 0) throw Conflict("payment_import_has_errors", "Correct all preview errors before confirmation.");
        var rows = JsonSerializer.Deserialize<PaymentCsvRow[]>(batch.PreviewRowsJson) ?? [];
        batch.Confirm(DateTime.UtcNow);
        var created = new List<PaymentReceipt>();
        foreach (var row in rows)
        {
            var receipt = new PaymentReceipt(request.OrganizationId,
                $"RCPT-{row.ReceivedAtUtc:yyyyMMdd}-{row.ExternalId}", row.Payer, row.Amount,
                row.Currency, row.ReceivedAtUtc, row.Method, row.Reference,
                request.EvidenceReference, row.ExternalId, row.Memo, actor.Id);
            dbContext.PaymentReceipts.Add(receipt); created.Add(receipt);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(created.Select(ToDto).ToArray());
    }

    [HttpPost("reconciliations")]
    public async Task<ActionResult<ReconciliationDto>> CreateReconciliation(
        [FromBody] CreateReconciliationRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        var receiptActors = await dbContext.PaymentReceipts.AsNoTracking()
            .Where(value => value.ReceivedAtUtc >= request.PeriodStartUtc && value.ReceivedAtUtc < request.PeriodEndUtc)
            .Select(value => value.RecordedByUserId).ToListAsync(cancellationToken);
        var allocationActors = await dbContext.PaymentAllocations.AsNoTracking()
            .Where(value => value.AllocatedAtUtc >= request.PeriodStartUtc && value.AllocatedAtUtc < request.PeriodEndUtc)
            .Select(value => value.AllocatedByUserId).ToListAsync(cancellationToken);
        var batch = new ReconciliationBatch(request.BatchNumber, request.PeriodStartUtc,
            request.PeriodEndUtc, request.ExpectedAmount, request.ReconciledAmount,
            receiptActors.Concat(allocationActors), actor.Id);
        dbContext.ReconciliationBatches.Add(batch); await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(batch));
    }

    [HttpPost("reconciliations/{id:guid}/approve")]
    public async Task<ActionResult<ReconciliationDto>> ApproveReconciliation(Guid id,
        [FromBody] ApproveReconciliationRequest request, CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.RequireAsync(HttpContext, BusinessRole.CashReconciler, cancellationToken);
        var batch = await dbContext.ReconciliationBatches.SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw Missing("reconciliation_missing", "The reconciliation batch was not found.");
        if (batch.Version != request.Version) throw new DbUpdateConcurrencyException();
        var report = JsonSerializer.Serialize(new { batch.BatchNumber, batch.PeriodStartUtc, batch.PeriodEndUtc,
            batch.ExpectedAmount, batch.ReconciledAmount, batch.Difference, approvedBy = actor.Id, approvedAtUtc = DateTime.UtcNow });
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(report))).ToLowerInvariant();
        batch.Approve(actor.Id, DateTime.UtcNow, request.Notes, report, hash);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToDto(batch));
    }

    [HttpGet("reports/aging")]
    public async Task<ActionResult<IReadOnlyList<AgingInvoiceDto>>> Aging(
        [FromQuery] DateTime? asOfUtc, CancellationToken cancellationToken)
    {
        RequireFeature();
        _ = await authorization.RequireAsync(HttpContext, BusinessRole.BillingOperator, cancellationToken);
        var asOf = asOfUtc ?? DateTime.UtcNow;
        var values = await dbContext.Invoices.AsNoTracking().Where(value =>
            (value.Status == InvoiceStatus.Issued || value.Status == InvoiceStatus.PartiallyPaid)
            && value.Balance > 0).OrderBy(value => value.DueAtUtc).ToListAsync(cancellationToken);
        return Ok(values.Select(value =>
        {
            var days = Math.Max(0, (asOf - value.DueAtUtc).Days);
            var bucket = days == 0 ? "Current" : days <= 30 ? "1-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";
            return new AgingInvoiceDto(value.Id, value.OrganizationId, value.InvoiceNumber,
                value.DueAtUtc, value.Balance, value.Currency, days, bucket);
        }).ToArray());
    }

    [HttpGet("reports/unapplied-cash")]
    public async Task<ActionResult<IReadOnlyList<PaymentReceiptDto>>> UnappliedCash(
        CancellationToken cancellationToken)
    {
        RequireFeature();
        _ = await authorization.RequireAsync(HttpContext, BusinessRole.CashOperator, cancellationToken);
        var values = await dbContext.PaymentReceipts.AsNoTracking()
            .Where(value => value.Status != PaymentReceiptStatus.Reversed && value.UnappliedAmount > 0)
            .OrderBy(value => value.ReceivedAtUtc).ToListAsync(cancellationToken);
        return Ok(values.Select(ToDto).ToArray());
    }

    [HttpGet("reports/reconciliations")]
    public async Task<ActionResult<IReadOnlyList<ReconciliationDto>>> ReconciliationReport(
        CancellationToken cancellationToken)
    {
        RequireFeature();
        var actor = await authorization.ReadActorAsync(HttpContext, cancellationToken)
            ?? throw new OrderManagementException("authentication_required", "An active user is required.", StatusCodes.Status401Unauthorized);
        if (options.Value.Features.BusinessRoles
            && !actor.Has(BusinessRole.CashOperator)
            && !actor.Has(BusinessRole.CashReconciler)) throw Forbidden();
        var values = await dbContext.ReconciliationBatches.AsNoTracking()
            .OrderByDescending(value => value.PeriodEndUtc).ToListAsync(cancellationToken);
        return Ok(values.Select(ToDto).ToArray());
    }

    [HttpGet("legacy-billing")]
    public async Task<ActionResult<object>> LegacyBilling(CancellationToken cancellationToken)
    {
        RequireFeature();
        _ = await authorization.RequireAsync(HttpContext, BusinessRole.BillingOperator, cancellationToken);
        var values = await dbContext.CommercialDocumentLinks.AsNoTracking()
            .Where(value => value.WorkflowType == OrderWorkflowTypes.LabService)
            .OrderByDescending(value => value.CreatedAt)
            .Select(value => new { value.Id, value.WorkflowId, value.Kind, value.DocumentNumber,
                value.Total, value.Balance, value.Currency, label = "Legacy billing source - Finance review required" })
            .ToListAsync(cancellationToken);
        return Ok(values);
    }

    private async Task<Guid?> ReadScopeAsync(Guid? requestedOrganizationId, CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, dbContext,
            externalIdentityContext, cancellationToken)
            ?? throw new OrderManagementException("authentication_required", "An active user is required.", StatusCodes.Status401Unauthorized);
        var isPhaeno = actor.Memberships.Any(value => value.IsActive && value.Organization?.IsPhaeno() == true);
        if (isPhaeno)
        {
            if (options.Value.Features.BusinessRoles)
            {
                var hasFinanceRole = await dbContext.BusinessRoleAssignments.AsNoTracking().AnyAsync(value =>
                    value.UserId == actor.Id && value.IsActive
                    && (value.Role == BusinessRole.BillingOperator || value.Role == BusinessRole.CashOperator
                        || value.Role == BusinessRole.CashReconciler), cancellationToken);
                if (!hasFinanceRole) throw Forbidden();
            }
            return requestedOrganizationId;
        }
        var allowed = actor.Memberships.Where(value => value.IsActive).Select(value => value.OrganizationId).ToArray();
        if (requestedOrganizationId.HasValue && !allowed.Contains(requestedOrganizationId.Value)) throw Forbidden();
        if (!requestedOrganizationId.HasValue && allowed.Length != 1) throw Forbidden();
        return requestedOrganizationId ?? allowed.Single();
    }

    private void RequireFeature()
    {
        if (!options.Value.Features.NativePSeqAccountsReceivable)
            throw Missing("feature_disabled", "Native PSeq accounts receivable is not enabled.");
    }
    private static InvoiceDto ToDto(Invoice value) => new(value.Id, value.OrganizationId, value.LabServiceOrderId,
        value.InvoiceNumber, value.Status, value.Subtotal, value.Tax, value.AdjustmentTotal,
        value.Total, value.Balance, value.Currency, value.IssuedAtUtc, value.DueAtUtc, value.ClosedAtUtc, value.Version);
    private static PaymentReceiptDto ToDto(PaymentReceipt value) => new(value.Id, value.OrganizationId,
        value.ReceiptNumber, value.Payer, value.Amount, value.UnappliedAmount, value.Currency,
        value.ReceivedAtUtc, value.Method, value.BankReference, value.ExternalId, value.Status, value.Version);
    private static PaymentAllocationDto ToDto(PaymentAllocation value) => new(value.Id, value.PaymentReceiptId,
        value.InvoiceId, value.Amount, value.AllocatedByUserId, value.AllocatedAtUtc,
        value.ReversedByUserId, value.ReversedAtUtc, value.ReversalReason);
    private static ReconciliationDto ToDto(ReconciliationBatch value) => new(value.Id, value.BatchNumber,
        value.PeriodStartUtc, value.PeriodEndUtc, value.ExpectedAmount, value.ReconciledAmount,
        value.Difference, value.Status, value.PreparedByUserId, value.ApprovedByUserId,
        value.ApprovedAtUtc, value.CloseoutReportSha256, value.Version);
    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) => new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing(string code, string message) => new(code, message, StatusCodes.Status404NotFound);
    private static OrderManagementException Forbidden() => new("accounts_receivable_forbidden", "Accounts-receivable data is unavailable.", StatusCodes.Status403Forbidden);
}

public sealed record ConfigureBillingRequest(string BillingContactName, string BillingContactEmail,
    string BillingAddressJson, int PaymentTermsDays, TaxDecision TaxDecision,
    decimal? ApprovedTaxRate, string? TaxExemptionEvidenceReference,
    string FinanceApprovalNotes, long? Version);
public sealed record RecordReceiptRequest(Guid OrganizationId, string Payer, decimal Amount,
    string Currency, DateTime ReceivedAtUtc, string Method, string BankReference,
    string? EvidenceReference, string ExternalId, string? Memo);
public sealed record AllocatePaymentRequest(Guid PaymentReceiptId, Guid InvoiceId, decimal Amount);
public sealed record ReasonRequest(string Reason);
public sealed record InvoiceAdjustmentRequest(InvoiceAdjustmentKind Kind, decimal Amount, string Reason);
public sealed record ConfirmPaymentImportRequest(Guid OrganizationId, string? EvidenceReference);
public sealed record CreateReconciliationRequest(string BatchNumber, DateTime PeriodStartUtc,
    DateTime PeriodEndUtc, decimal ExpectedAmount, decimal ReconciledAmount);
public sealed record ApproveReconciliationRequest(long Version, string Notes);
public sealed record InvoiceDto(Guid Id, Guid OrganizationId, Guid LabServiceOrderId, string InvoiceNumber,
    InvoiceStatus Status, decimal Subtotal, decimal Tax, decimal AdjustmentTotal, decimal Total,
    decimal Balance, string Currency, DateTime IssuedAtUtc, DateTime DueAtUtc, DateTime? ClosedAtUtc, long Version);
public sealed record PaymentReceiptDto(Guid Id, Guid OrganizationId, string ReceiptNumber, string Payer,
    decimal Amount, decimal UnappliedAmount, string Currency, DateTime ReceivedAtUtc, string Method,
    string BankReference, string ExternalId, PaymentReceiptStatus Status, long Version);
public sealed record PaymentAllocationDto(Guid Id, Guid PaymentReceiptId, Guid InvoiceId, decimal Amount,
    Guid AllocatedByUserId, DateTime AllocatedAtUtc, Guid? ReversedByUserId, DateTime? ReversedAtUtc, string? ReversalReason);
public sealed record PaymentImportPreviewDto(Guid Id, Guid OrganizationId, int ValidRowCount,
    IReadOnlyList<string> Errors, DateTime ExpiresAtUtc);
public sealed record ReconciliationDto(Guid Id, string BatchNumber, DateTime PeriodStartUtc,
    DateTime PeriodEndUtc, decimal ExpectedAmount, decimal ReconciledAmount, decimal Difference,
    ReconciliationStatus Status, Guid PreparedByUserId, Guid? ApprovedByUserId,
    DateTime? ApprovedAtUtc, string? CloseoutReportSha256, long Version);
public sealed record AgingInvoiceDto(Guid Id, Guid OrganizationId, string InvoiceNumber,
    DateTime DueAtUtc, decimal Balance, string Currency, int DaysPastDue, string Bucket);
public sealed record PaymentMatchSuggestionDto(Guid InvoiceId, string InvoiceNumber,
    decimal Balance, string Currency, int Score, IReadOnlyList<string> Reasons);

internal sealed record PaymentCsvRow(string ExternalId, DateTime ReceivedAtUtc, decimal Amount,
    string Currency, string Payer, string Method, string Reference, string? Memo);
internal sealed record PaymentCsvResult(IReadOnlyList<PaymentCsvRow> Rows, IReadOnlyList<string> Errors);

internal static class PaymentCsv
{
    private static readonly string[] RequiredHeaders =
        ["external_id", "date", "amount", "currency", "payer", "method", "reference", "memo"];

    public static PaymentCsvResult Parse(string csv)
    {
        var lines = csv.Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n');
        if (lines.Length == 0) return new([], ["The CSV is empty."]);
        var headers = ParseLine(lines[0]).Select(value => value.Trim().ToLowerInvariant()).ToArray();
        var errors = RequiredHeaders.Where(value => !headers.Contains(value))
            .Select(value => $"Required column '{value}' is missing.").ToList();
        if (errors.Count > 0) return new([], errors);
        var rows = new List<PaymentCsvRow>();
        for (var index = 1; index < lines.Length; index++)
        {
            if (string.IsNullOrWhiteSpace(lines[index])) continue;
            var values = ParseLine(lines[index]);
            string Read(string header) { var position = Array.IndexOf(headers, header); return position < values.Count ? values[position].Trim() : string.Empty; }
            var externalId = Read("external_id"); var currency = Read("currency").ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(externalId)) errors.Add($"Row {index + 1}: external_id is required.");
            if (!DateTime.TryParse(Read("date"), CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var date))
                errors.Add($"Row {index + 1}: date is invalid.");
            if (!decimal.TryParse(Read("amount"), NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) || amount <= 0)
                errors.Add($"Row {index + 1}: amount must be positive.");
            if (currency != "USD") errors.Add($"Row {index + 1}: only USD is supported.");
            var payer = Read("payer"); var method = Read("method"); var reference = Read("reference");
            if (string.IsNullOrWhiteSpace(payer) || string.IsNullOrWhiteSpace(method) || string.IsNullOrWhiteSpace(reference))
                errors.Add($"Row {index + 1}: payer, method, and reference are required.");
            if (errors.Any(value => value.StartsWith($"Row {index + 1}:", StringComparison.Ordinal))) continue;
            rows.Add(new PaymentCsvRow(externalId, date, amount, currency, payer, method, reference, Read("memo")));
        }
        if (rows.GroupBy(value => value.ExternalId, StringComparer.OrdinalIgnoreCase).Any(value => value.Count() > 1))
            errors.Add("The CSV contains duplicate external IDs.");
        return new(rows, errors);
    }

    private static IReadOnlyList<string> ParseLine(string line)
    {
        var values = new List<string>(); var current = new StringBuilder(); var quoted = false;
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
        values.Add(current.ToString()); return values;
    }
}
