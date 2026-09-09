namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class LabServiceOrdersController
{
    [HttpGet("{orderId:guid}/quotes/{quoteId:guid}/pdf")]
    public async Task<FileContentResult> GetQuotePdf(
        Guid orderId, Guid quoteId, CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant, cancellationToken);
        var quote = order.Quotes.SingleOrDefault(item => item.Id == quoteId
            && item.Status is not (QuoteStatus.Draft or QuoteStatus.SyncPending))
            ?? throw new OrderManagementException("quote_not_found", "The requested quote was not found.", StatusCodes.Status404NotFound);

        try
        {
            var lines = JsonSerializer.Deserialize<List<QuotePdfLine>>(quote.LinesJson, JsonSerializerOptions);
            if (lines is not { Count: > 0 } || lines.Any(line => line is null
                || string.IsNullOrWhiteSpace(line.Description) || line.Quantity <= 0 || line.UnitPrice < 0))
                throw new JsonException("The saved quote lines are incomplete.");

            // Only frozen commercial fields are eligible for this document. Never
            // fill missing legacy terms from today's editable billing profile.
            var contact = ReadQuoteSnapshot<QuoteBillingContact>(quote.BillingContactSnapshotJson);
            var address = ReadQuoteSnapshot<QuoteBillingAddress>(quote.BillingAddressSnapshotJson);
            var addressLines = new List<string>();
            AddAddressLine(address?.Line1);
            AddAddressLine(address?.Line2);
            AddAddressLine(string.Join(", ", new[] { address?.City, address?.Region }
                .Where(value => !string.IsNullOrWhiteSpace(value))));
            AddAddressLine(address?.PostalCode);
            AddAddressLine(address?.CountryCode);

            var status = quote.EffectiveStatus(DateTime.UtcNow).ToString();
            var document = new QuotePdfDocument(order.OrderNumber, order.CustomerReference,
                tenant.Organization.Name, tenant.Department.Name, quote.Revision, status,
                quote.Purpose.ToString(), quote.IssuedAt, quote.ExpiresAt, quote.AcceptedAt,
                lines, quote.Subtotal, quote.Tax, quote.Total, quote.Currency,
                !string.IsNullOrWhiteSpace(quote.TaxDecisionSnapshotJson), contact?.Name,
                contact?.Email, addressLines, quote.PaymentTermsDaysSnapshot);
            var bytes = QuotePdfRenderer.Render(document);
            return File(bytes, "application/pdf", $"{order.OrderNumber}-quote-r{quote.Revision}.pdf");

            void AddAddressLine(string? value)
            {
                if (!string.IsNullOrWhiteSpace(value)) addressLines.Add(value.Trim());
            }
        }
        catch (Exception exception) when (exception is JsonException or ArgumentException or NotSupportedException or InvalidOperationException)
        {
            throw new OrderManagementException("quote_document_unavailable",
                "This quote could not be prepared as a PDF. Contact Phaeno with the Job number.",
                StatusCodes.Status409Conflict);
        }
    }

    private static T? ReadQuoteSnapshot<T>(string? json) where T : class
        => string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<T>(json, JsonSerializerOptions);

    private sealed record QuoteBillingContact(string? Name, string? Email);
    private sealed record QuoteBillingAddress(string? Line1, string? Line2, string? City,
        string? Region, string? PostalCode, string? CountryCode);
}
