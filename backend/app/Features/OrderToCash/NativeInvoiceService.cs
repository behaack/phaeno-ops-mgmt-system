namespace PhaenoPortal.App.Features.OrderToCash;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;

public sealed class NativeInvoiceService(
    PSeqOperationsDbContext dbContext,
    IOperationalFileStorage fileStorage)
{
    public async Task<Invoice> IssueForCompletedOrderAsync(
        LabServiceOrder order,
        LabServiceQuote acceptedQuote,
        Guid actorUserId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var existing = await dbContext.Invoices
            .Include(value => value.Lines)
            .SingleOrDefaultAsync(value => value.LabServiceOrderId == order.Id, cancellationToken);
        if (existing is not null) return existing;
        if (order.Status != LabServiceOrderStatus.Completed)
            throw new OrderManagementException("invoice_order_not_completed", "Only a completed PSeq Job can be invoiced.", StatusCodes.Status409Conflict);
        if (acceptedQuote.Status != QuoteStatus.Accepted || order.AcceptedQuoteId != acceptedQuote.Id)
            throw new OrderManagementException("invoice_quote_not_accepted", "An accepted quote snapshot is required.", StatusCodes.Status409Conflict);
        if (acceptedQuote.Currency != "USD")
            throw new OrderManagementException("invoice_currency_not_supported", "PSeq invoices support USD only.");
        if (string.IsNullOrWhiteSpace(acceptedQuote.BillingSnapshotJson)
            || !acceptedQuote.PaymentTermsDaysSnapshot.HasValue
            || !acceptedQuote.BillingConfigurationVersionSnapshot.HasValue)
            throw new OrderManagementException("invoice_billing_snapshot_missing",
                "The accepted quote does not contain an approved billing snapshot.", StatusCodes.Status409Conflict);

        var invoiceNumber = $"PSEQ-{utcNow:yyyy}-{order.OrderNumber}";
        var dueAtUtc = utcNow.AddDays(acceptedQuote.PaymentTermsDaysSnapshot.Value);
        var invoice = new Invoice(order.OrganizationId, order.Id, acceptedQuote.Id,
            invoiceNumber, acceptedQuote.Subtotal, acceptedQuote.Tax, acceptedQuote.Currency,
            acceptedQuote.BillingSnapshotJson, utcNow, dueAtUtc);
        var lineSnapshots = ReadLines(acceptedQuote.LinesJson);
        var lineNumber = 0;
        foreach (var line in lineSnapshots)
        {
            var invoiceLine = new InvoiceLine(invoice.Id, ++lineNumber, line.Description,
                line.Quantity, line.UnitPrice, JsonSerializer.Serialize(line));
            invoice.Lines.Add(invoiceLine);
        }
        invoice.MarkCreated(utcNow, actorUserId);
        dbContext.Invoices.Add(invoice);

        var pdfBytes = SimpleInvoicePdf.Create(invoice, lineSnapshots);
        StoredOperationalFile stored;
        await using (var stream = new MemoryStream(pdfBytes, writable: false))
            stored = await fileStorage.SaveAsync(stream, ".pdf", 5_242_880, cancellationToken);
        try
        {
            dbContext.InvoiceDocuments.Add(new InvoiceDocument(invoice.Id, stored.StorageKey,
                stored.Sha256, stored.SizeBytes, utcNow));
            await dbContext.SaveChangesAsync(cancellationToken);
            return invoice;
        }
        catch
        {
            await fileStorage.DeleteIfExistsAsync(stored.StorageKey, cancellationToken);
            throw;
        }
    }

    private static IReadOnlyList<InvoiceLineSource> ReadLines(string json)
    {
        using var document = JsonDocument.Parse(json);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
            throw new InvalidOperationException("Quote lines are invalid.");
        return document.RootElement.EnumerateArray().Select(value => new InvoiceLineSource(
            value.TryGetProperty("description", out var description) ? description.GetString() ?? "PSeq service" : "PSeq service",
            value.TryGetProperty("quantity", out var quantity) ? quantity.GetDecimal() : 1,
            value.TryGetProperty("unitPrice", out var unitPrice) ? unitPrice.GetDecimal() : 0)).ToArray();
    }
}

public sealed record InvoiceLineSource(string Description, decimal Quantity, decimal UnitPrice);

internal static class SimpleInvoicePdf
{
    public static byte[] Create(Invoice invoice, IReadOnlyList<InvoiceLineSource> lines)
    {
        var textLines = new List<string>
        {
            "Phaeno Inc.",
            $"Invoice {invoice.InvoiceNumber}",
            $"Issued {invoice.IssuedAtUtc:yyyy-MM-dd}",
            $"Due {invoice.DueAtUtc:yyyy-MM-dd}",
            string.Empty
        };
        textLines.AddRange(lines.Select(value =>
            $"{value.Description}  {value.Quantity:0.######} x {value.UnitPrice:0.00} USD"));
        textLines.Add(string.Empty);
        textLines.Add($"Subtotal {invoice.Subtotal:0.00} USD");
        textLines.Add($"Tax {invoice.Tax:0.00} USD");
        textLines.Add($"Total {invoice.Total:0.00} USD");

        var content = new StringBuilder("BT /F1 11 Tf 54 740 Td 14 TL ");
        foreach (var line in textLines)
            content.Append('(').Append(Escape(line)).Append(") Tj T* ");
        content.Append("ET");
        var contentBytes = Encoding.ASCII.GetBytes(content.ToString());
        var objects = new[]
        {
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
            $"<< /Length {contentBytes.Length} >>\nstream\n{content}\nendstream",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
        };
        var output = new StringBuilder("%PDF-1.4\n");
        var offsets = new List<int> { 0 };
        for (var index = 0; index < objects.Length; index++)
        {
            offsets.Add(Encoding.ASCII.GetByteCount(output.ToString()));
            output.Append(index + 1).Append(" 0 obj\n").Append(objects[index]).Append("\nendobj\n");
        }
        var xrefOffset = Encoding.ASCII.GetByteCount(output.ToString());
        output.Append("xref\n0 ").Append(objects.Length + 1).Append("\n0000000000 65535 f \n");
        foreach (var offset in offsets.Skip(1)) output.Append(offset.ToString("0000000000")).Append(" 00000 n \n");
        output.Append("trailer << /Size ").Append(objects.Length + 1).Append(" /Root 1 0 R >>\nstartxref\n")
            .Append(xrefOffset).Append("\n%%EOF\n");
        return Encoding.ASCII.GetBytes(output.ToString());
    }

    private static string Escape(string value) => value.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
}
