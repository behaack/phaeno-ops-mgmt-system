namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/order-accounting")]
public sealed class OrderAccountingController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext) : ControllerBase
{
    private const int MaximumReportDays = 366;
    private const int MaximumRows = 10_000;

    [HttpGet("journal-entries")]
    public async Task<IReadOnlyList<ManualJournalEntryRowDto>> List(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var range = ResolveRange(from, to);
        return await ReadRowsAsync(range.FromUtc, range.ToExclusiveUtc, cancellationToken);
    }

    [HttpGet("journal-entries.csv")]
    public async Task<FileContentResult> Export(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var range = ResolveRange(from, to);
        var rows = await ReadRowsAsync(range.FromUtc, range.ToExclusiveUtc, cancellationToken);
        var csv = new StringBuilder();
        csv.AppendLine("entry_id,accounting_date_utc,organization,workflow,workflow_number,customer_or_project_reference,purchase_order_number,source_document_number,currency,gross_amount,outstanding_balance,payment_status,payment_reference,payment_recorded_at_utc,memo");
        foreach (var row in rows)
        {
            csv.Append(Csv(row.EntryId)).Append(',')
                .Append(Csv(row.AccountingDateUtc.ToString("O", CultureInfo.InvariantCulture))).Append(',')
                .Append(Csv(row.OrganizationName)).Append(',')
                .Append(Csv(row.WorkflowType)).Append(',')
                .Append(Csv(row.WorkflowNumber)).Append(',')
                .Append(Csv(row.CustomerOrProjectReference)).Append(',')
                .Append(Csv(row.PurchaseOrderNumber)).Append(',')
                .Append(Csv(row.SourceDocumentNumber)).Append(',')
                .Append(Csv(row.Currency)).Append(',')
                .Append(row.GrossAmount.ToString("0.00", CultureInfo.InvariantCulture)).Append(',')
                .Append(row.OutstandingBalance.ToString("0.00", CultureInfo.InvariantCulture)).Append(',')
                .Append(Csv(row.PaymentStatus)).Append(',')
                .Append(Csv(row.PaymentReference)).Append(',')
                .Append(Csv(row.PaymentRecordedAtUtc?.ToString("O", CultureInfo.InvariantCulture))).Append(',')
                .Append(Csv(row.Memo)).AppendLine();
        }

        return File(
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: true).GetBytes(csv.ToString()),
            "text/csv; charset=utf-8",
            $"journal-entry-source-{range.From:yyyyMMdd}-{range.To:yyyyMMdd}.csv");
    }

    private async Task<IReadOnlyList<ManualJournalEntryRowDto>> ReadRowsAsync(
        DateTime fromUtc,
        DateTime toExclusiveUtc,
        CancellationToken cancellationToken)
    {
        var documents = await dbContext.CommercialDocumentLinks.AsNoTracking()
            .Where(item => item.Kind == CommercialDocumentKind.Invoice
                && item.SyncStatus == IntegrationStatus.Succeeded
                && item.ExternalDocumentId != null
                && item.ExternalDocumentId.StartsWith("manual:")
                && item.CreatedAt >= fromUtc
                && item.CreatedAt < toExclusiveUtc)
            .OrderBy(item => item.CreatedAt)
            .ThenBy(item => item.Id)
            .Take(MaximumRows + 1)
            .ToListAsync(cancellationToken);
        if (documents.Count > MaximumRows)
            throw Invalid("journal_entry_report_too_large", "Narrow the accounting date range before generating the report.");

        var sources = await ReadSourcesAsync(documents, cancellationToken);
        if (documents.Any(document => !sources.ContainsKey((document.WorkflowType, document.WorkflowId))))
            throw Conflict(
                "journal_entry_source_missing",
                "One or more accounting records no longer have an available source workflow. Correct the source data before using this report.");
        var organizationIds = sources.Values.Select(item => item.OrganizationId).Distinct().ToList();
        var organizations = await dbContext.Organizations.AsNoTracking()
            .Where(item => organizationIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
        if (organizations.Count != organizationIds.Count)
            throw Conflict(
                "journal_entry_organization_missing",
                "One or more accounting records no longer have an available organization. Correct the source data before using this report.");

        return documents.Select(document =>
        {
            var source = sources[(document.WorkflowType, document.WorkflowId)];
            var organizationName = organizations[source.OrganizationId];
            var paymentReference = ReadPaymentReference(document.ExternalDocumentId);
            var paid = document.Balance == 0;
            return new ManualJournalEntryRowDto(
                document.Id,
                $"JE-{document.Id:N}".ToUpperInvariant(),
                document.CreatedAt,
                source.OrganizationId,
                organizationName,
                document.WorkflowType,
                document.WorkflowId,
                source.WorkflowNumber,
                source.CustomerOrProjectReference,
                source.PurchaseOrderNumber,
                document.DocumentNumber ?? source.WorkflowNumber,
                document.Currency,
                document.Total,
                document.Balance,
                paid ? "PaidRecorded" : "Outstanding",
                paymentReference,
                paid && paymentReference != null ? document.SynchronizedAt : null,
                $"{document.WorkflowType} {source.WorkflowNumber} for {organizationName}",
                document.Version);
        }).ToList();
    }

    private async Task<Dictionary<(string WorkflowType, Guid WorkflowId), SourceRecord>> ReadSourcesAsync(
        IReadOnlyCollection<CommercialDocumentLink> documents,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<(string WorkflowType, Guid WorkflowId), SourceRecord>();
        var labIds = documents.Where(item => item.WorkflowType == OrderWorkflowTypes.LabService).Select(item => item.WorkflowId).Distinct().ToList();
        var lab = await dbContext.LabServiceOrders.AsNoTracking().Where(item => labIds.Contains(item.Id))
            .Select(item => new { item.Id, item.OrganizationId, item.OrderNumber, item.CustomerReference }).ToListAsync(cancellationToken);
        foreach (var item in lab)
            result[(OrderWorkflowTypes.LabService, item.Id)] = new SourceRecord(item.OrganizationId, item.OrderNumber, item.CustomerReference, null);

        var reagentIds = documents.Where(item => item.WorkflowType == OrderWorkflowTypes.Reagent).Select(item => item.WorkflowId).Distinct().ToList();
        var reagent = await dbContext.PartnerReagentOrders.AsNoTracking().Where(item => reagentIds.Contains(item.Id))
            .Select(item => new { item.Id, item.OrganizationId, item.OrderNumber, item.PurchaseOrderNumber }).ToListAsync(cancellationToken);
        foreach (var item in reagent)
            result[(OrderWorkflowTypes.Reagent, item.Id)] = new SourceRecord(item.OrganizationId, item.OrderNumber, null, item.PurchaseOrderNumber);

        var assemblyIds = documents.Where(item => item.WorkflowType == OrderWorkflowTypes.DataAssembly).Select(item => item.WorkflowId).Distinct().ToList();
        var assembly = await dbContext.DataAssemblyRequests.AsNoTracking().Where(item => assemblyIds.Contains(item.Id))
            .Select(item => new { item.Id, item.OrganizationId, item.RequestNumber, item.ProjectReference, item.PurchaseOrderNumber }).ToListAsync(cancellationToken);
        foreach (var item in assembly)
            result[(OrderWorkflowTypes.DataAssembly, item.Id)] = new SourceRecord(item.OrganizationId, item.RequestNumber, item.ProjectReference, item.PurchaseOrderNumber);
        return result;
    }

    private static (DateOnly From, DateOnly To, DateTime FromUtc, DateTime ToExclusiveUtc) ResolveRange(DateOnly? from, DateOnly? to)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var resolvedFrom = from ?? new DateOnly(today.Year, today.Month, 1);
        var resolvedTo = to ?? today;
        if (resolvedTo < resolvedFrom)
            throw Invalid("journal_entry_range_invalid", "The end date must be on or after the start date.");
        if (resolvedTo.DayNumber - resolvedFrom.DayNumber + 1 > MaximumReportDays)
            throw Invalid("journal_entry_range_too_large", $"The report range cannot exceed {MaximumReportDays} days.");
        return (
            resolvedFrom,
            resolvedTo,
            resolvedFrom.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            resolvedTo.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
    }

    private static string? ReadPaymentReference(string? value)
        => value?.StartsWith("payment:", StringComparison.Ordinal) == true ? value[8..] : null;

    private static string Csv(string? value)
    {
        var safe = value ?? string.Empty;
        var firstNonWhitespace = safe.FirstOrDefault(character => !char.IsWhiteSpace(character));
        if (firstNonWhitespace is '=' or '+' or '-' or '@')
            safe = $"'{safe}";
        return $"\"{safe.Replace("\"", "\"\"")}\"";
    }

    private static OrderManagementException Invalid(string code, string message)
        => new(code, message, StatusCodes.Status400BadRequest);

    private static OrderManagementException Conflict(string code, string message)
        => new(code, message, StatusCodes.Status409Conflict);

    private sealed record SourceRecord(
        Guid OrganizationId,
        string WorkflowNumber,
        string? CustomerOrProjectReference,
        string? PurchaseOrderNumber);
}
