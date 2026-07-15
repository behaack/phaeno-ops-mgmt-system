namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

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

public sealed class LoggingQuickBooksGateway(ILogger<LoggingQuickBooksGateway> logger) : IQuickBooksGateway
{
    public Task<IReadOnlyList<QuickBooksCatalogItemResult>> FetchCatalogAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        logger.LogInformation("QuickBooks is not configured; catalog sync completed with no external items.");
        return Task.FromResult<IReadOnlyList<QuickBooksCatalogItemResult>>([]);
    }

    public Task<QuickBooksDocumentResult> CreateEstimateAsync(QuickBooksDocumentRequest request, CancellationToken cancellationToken)
        => CreateLocalAsync("EST", request, cancellationToken);

    public Task<QuickBooksDocumentResult> CreateInvoiceAsync(QuickBooksDocumentRequest request, CancellationToken cancellationToken)
        => CreateLocalAsync("INV", request, cancellationToken);

    public Task<QuickBooksDocumentResult> ReadInvoiceAsync(string externalDocumentId, string currency, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(new QuickBooksDocumentResult(externalDocumentId, externalDocumentId, null, 0, 0, currency));
    }

    private Task<QuickBooksDocumentResult> CreateLocalAsync(string prefix, QuickBooksDocumentRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var total = request.Lines.Sum(line => decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero));
        var id = $"local-{prefix.ToLowerInvariant()}-{Guid.NewGuid():N}";
        var number = $"{prefix}-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..(prefix.Length + 1 + 8 + 1 + 8)];
        logger.LogInformation("Created local QuickBooks {DocumentType} {DocumentNumber} for {ReferenceNumber}.", prefix, number, request.ReferenceNumber);
        return Task.FromResult(new QuickBooksDocumentResult(id, number, null, total, total, request.Currency));
    }
}

public sealed class QuickBooksAccessTokenProvider(
    HttpClient httpClient,
    IOptions<QuickBooksOptions> options)
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private string? accessToken;
    private DateTime expiresAt;
    private string refreshToken = options.Value.RefreshToken;

    public async Task<string> GetAsync(CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(accessToken) && expiresAt > DateTime.UtcNow.AddMinutes(2)) return accessToken;
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (!string.IsNullOrWhiteSpace(accessToken) && expiresAt > DateTime.UtcNow.AddMinutes(2)) return accessToken;
            var value = options.Value;
            using var request = new HttpRequestMessage(HttpMethod.Post, value.OAuthTokenUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{value.ClientId}:{value.ClientSecret}")));
            request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken
            });
            using var response = await httpClient.SendAsync(request, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
                throw new OrderManagementException("quickbooks_oauth_failed", $"QuickBooks OAuth failed with status {(int)response.StatusCode}.", StatusCodes.Status502BadGateway);
            using var document = JsonDocument.Parse(json);
            accessToken = document.RootElement.GetProperty("access_token").GetString()
                ?? throw new OrderManagementException("quickbooks_oauth_invalid", "QuickBooks returned no access token.", StatusCodes.Status502BadGateway);
            if (document.RootElement.TryGetProperty("refresh_token", out var rotated) && !string.IsNullOrWhiteSpace(rotated.GetString()))
                refreshToken = rotated.GetString()!;
            var expiresIn = document.RootElement.TryGetProperty("expires_in", out var expiry) ? expiry.GetInt32() : 3600;
            expiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
            return accessToken;
        }
        finally
        {
            gate.Release();
        }
    }
}

public sealed class HttpQuickBooksGateway(
    HttpClient httpClient,
    QuickBooksAccessTokenProvider tokenProvider,
    IOptions<QuickBooksOptions> options) : IQuickBooksGateway
{
    private const string MinorVersion = "75";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<QuickBooksCatalogItemResult>> FetchCatalogAsync(CancellationToken cancellationToken)
    {
        var root = await SendAsync(HttpMethod.Get, $"query?query={Uri.EscapeDataString("select * from Item maxresults 1000")}&minorversion={MinorVersion}", null, cancellationToken);
        if (!root.TryGetProperty("QueryResponse", out var query)
            || !query.TryGetProperty("Item", out var items)) return [];
        var currency = "USD";
        var result = new List<QuickBooksCatalogItemResult>();
        foreach (var item in items.EnumerateArray())
        {
            var id = item.GetProperty("Id").GetString()!;
            var name = item.TryGetProperty("Name", out var nameValue) ? nameValue.GetString() ?? id : id;
            var description = item.TryGetProperty("Description", out var descriptionValue) ? descriptionValue.GetString() ?? string.Empty : string.Empty;
            var price = item.TryGetProperty("UnitPrice", out var priceValue) ? priceValue.GetDecimal() : 0;
            var active = !item.TryGetProperty("Active", out var activeValue) || activeValue.GetBoolean();
            result.Add(new QuickBooksCatalogItemResult(id, name, description, "unit", price, currency, active));
        }
        return result;
    }

    public async Task<QuickBooksDocumentResult> CreateEstimateAsync(QuickBooksDocumentRequest request, CancellationToken cancellationToken)
        => await CreateDocumentAsync("estimate", "Estimate", request, cancellationToken);

    public async Task<QuickBooksDocumentResult> CreateInvoiceAsync(QuickBooksDocumentRequest request, CancellationToken cancellationToken)
        => await CreateDocumentAsync("invoice", "Invoice", request, cancellationToken);

    public async Task<QuickBooksDocumentResult> ReadInvoiceAsync(string externalDocumentId, string currency, CancellationToken cancellationToken)
    {
        var root = await SendAsync(HttpMethod.Get, $"invoice/{Uri.EscapeDataString(externalDocumentId)}?minorversion={MinorVersion}", null, cancellationToken);
        return ReadDocument(root.GetProperty("Invoice"), currency);
    }

    private async Task<QuickBooksDocumentResult> CreateDocumentAsync(string path, string responseProperty, QuickBooksDocumentRequest request, CancellationToken cancellationToken)
    {
        var lines = request.Lines.Select(line => new
        {
            Amount = decimal.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero),
            DetailType = "SalesItemLineDetail",
            Description = line.Description,
            SalesItemLineDetail = new
            {
                ItemRef = new { value = line.ExternalItemId },
                Qty = line.Quantity,
                UnitPrice = line.UnitPrice
            }
        }).ToArray();

        var payload = new Dictionary<string, object?>
        {
            ["CustomerRef"] = new { value = request.CustomerExternalId },
            ["TxnDate"] = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            ["PrivateNote"] = BuildMemo(request),
            ["CustomerMemo"] = new { value = request.ReferenceNumber },
            ["Line"] = lines
        };
        if (!string.IsNullOrWhiteSpace(request.LinkedEstimateExternalId))
            payload["LinkedTxn"] = new[] { new { TxnId = request.LinkedEstimateExternalId, TxnType = "Estimate" } };

        var root = await SendAsync(HttpMethod.Post, $"{path}?minorversion={MinorVersion}", payload, cancellationToken);
        return ReadDocument(root.GetProperty(responseProperty), request.Currency);
    }

    private async Task<JsonElement> SendAsync(HttpMethod method, string relativePath, object? payload, CancellationToken cancellationToken)
    {
        var value = options.Value;
        var uri = $"{value.ApiBaseUrl.TrimEnd('/')}/v3/company/{Uri.EscapeDataString(value.RealmId)}/{relativePath}";
        using var request = new HttpRequestMessage(method, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await tokenProvider.GetAsync(cancellationToken));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (payload != null) request.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new OrderManagementException("quickbooks_request_failed", $"QuickBooks request failed with status {(int)response.StatusCode}.", StatusCodes.Status502BadGateway);
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    private static string BuildMemo(QuickBooksDocumentRequest request)
        => string.IsNullOrWhiteSpace(request.PurchaseOrderNumber)
            ? request.ReferenceNumber
            : $"{request.ReferenceNumber}; PO {request.PurchaseOrderNumber}";

    private static QuickBooksDocumentResult ReadDocument(JsonElement value, string currency)
    {
        var id = value.GetProperty("Id").GetString()!;
        var number = value.TryGetProperty("DocNumber", out var numberValue) ? numberValue.GetString() ?? id : id;
        var total = value.TryGetProperty("TotalAmt", out var totalValue) ? totalValue.GetDecimal() : 0;
        var balance = value.TryGetProperty("Balance", out var balanceValue) ? balanceValue.GetDecimal() : total;
        var link = value.TryGetProperty("InvoiceLink", out var linkValue) ? linkValue.GetString() : null;
        return new QuickBooksDocumentResult(id, number, link, total, balance, currency);
    }
}
