namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Application;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed class UnconfiguredQuickBooksGatewayTests
{
    [Fact]
    public async Task UnconfiguredConnectorNeverReportsCatalogDocumentsOrPaymentSuccess()
    {
        var gateway = new UnconfiguredQuickBooksGateway();
        var request = new QuickBooksDocumentRequest("fixture", "fixture", null, "USD", [new("item", "Fixture", 1m, 25m)]);
        Func<Task>[] operations = [
            async () => { await gateway.FetchCatalogAsync(default); },
            async () => { await gateway.CreateEstimateAsync(request, default); },
            async () => { await gateway.CreateInvoiceAsync(request, default); },
            async () => { await gateway.ReadInvoiceAsync("historical-reference", "USD", default); }
        ];
        foreach (var operation in operations)
        {
            var failure = await Assert.ThrowsAsync<OrderManagementException>(operation);
            Assert.Equal("quickbooks_not_configured", failure.ErrorCode);
            Assert.Equal(503, failure.StatusCode);
        }
    }

    [Fact]
    public async Task CanceledConnectorRequestRetainsCancellationSemantics()
    {
        var gateway = new UnconfiguredQuickBooksGateway();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => gateway.FetchCatalogAsync(cancellation.Token));
    }
}
