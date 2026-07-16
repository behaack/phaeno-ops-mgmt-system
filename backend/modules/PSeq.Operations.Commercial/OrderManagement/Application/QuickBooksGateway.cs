namespace PSeq.Operations.Commercial.OrderManagement.Application;

public sealed record QuickBooksCatalogItemResult(
    string ExternalItemId,
    string Name,
    string Description,
    string SalesUnit,
    decimal BasePrice,
    string Currency,
    bool IsActive);

public sealed record QuickBooksLineRequest(
    string ExternalItemId,
    string Description,
    decimal Quantity,
    decimal UnitPrice);

public sealed record QuickBooksDocumentRequest(
    string CustomerExternalId,
    string ReferenceNumber,
    string? PurchaseOrderNumber,
    string Currency,
    IReadOnlyList<QuickBooksLineRequest> Lines,
    string? LinkedEstimateExternalId = null);

public sealed record QuickBooksDocumentResult(
    string ExternalDocumentId,
    string DocumentNumber,
    string? DocumentUrl,
    decimal Total,
    decimal Balance,
    string Currency);

public interface IQuickBooksGateway
{
    Task<IReadOnlyList<QuickBooksCatalogItemResult>> FetchCatalogAsync(CancellationToken cancellationToken);
    Task<QuickBooksDocumentResult> CreateEstimateAsync(QuickBooksDocumentRequest request, CancellationToken cancellationToken);
    Task<QuickBooksDocumentResult> CreateInvoiceAsync(QuickBooksDocumentRequest request, CancellationToken cancellationToken);
    Task<QuickBooksDocumentResult> ReadInvoiceAsync(string externalDocumentId, string currency, CancellationToken cancellationToken);
}
