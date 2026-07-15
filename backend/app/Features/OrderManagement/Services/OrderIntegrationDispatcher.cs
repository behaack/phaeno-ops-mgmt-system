namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record OrderDocumentOutboxPayload(
    Guid CommercialDocumentLinkId,
    Guid? QuoteId,
    string CustomerExternalId,
    string ReferenceNumber,
    string? PurchaseOrderNumber,
    string Currency,
    IReadOnlyList<QuickBooksLineRequest> Lines,
    string? LinkedEstimateExternalId = null);

public sealed record PaymentRefreshOutboxPayload(
    Guid CommercialDocumentLinkId,
    string ExternalDocumentId,
    string Currency);

public sealed class OrderIntegrationDispatcher(
    IServiceScopeFactory scopeFactory,
    ILogger<OrderIntegrationDispatcher> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var messageIds = await ReadPendingIdsAsync(stoppingToken);
                foreach (var messageId in messageIds)
                    await ProcessAsync(messageId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception exception)
            {
                logger.LogError(exception, "Order integration dispatcher failed while polling.");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    private async Task<IReadOnlyList<Guid>> ReadPendingIdsAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;
        return await dbContext.OrderOutboxMessages.AsNoTracking()
            .Where(message => (message.Status == IntegrationStatus.Pending || message.Status == IntegrationStatus.Failed)
                && message.NextAttemptAt <= now)
            .OrderBy(message => message.CreatedAt)
            .Select(message => message.Id)
            .Take(20)
            .ToListAsync(cancellationToken);
    }

    private async Task ProcessAsync(Guid messageId, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var gateway = scope.ServiceProvider.GetRequiredService<IQuickBooksGateway>();
        var message = await dbContext.OrderOutboxMessages.FirstOrDefaultAsync(candidate => candidate.Id == messageId, cancellationToken);
        if (message == null || message.Status is IntegrationStatus.Succeeded or IntegrationStatus.NeedsAttention) return;

        message.BeginAttempt(DateTime.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            await DispatchAsync(dbContext, gateway, message, cancellationToken);
            message.Complete(DateTime.UtcNow);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Order integration message {MessageId} failed on attempt {AttemptCount}.", message.Id, message.AttemptCount);
            dbContext.ChangeTracker.Clear();
            message = await dbContext.OrderOutboxMessages.FirstAsync(candidate => candidate.Id == messageId, cancellationToken);
            var needsAttention = message.AttemptCount >= 5;
            var minutes = Math.Min(60, Math.Pow(2, Math.Max(0, message.AttemptCount - 1)));
            message.Fail("The external commercial synchronization failed. Review integration details and retry.", DateTime.UtcNow.AddMinutes(minutes), needsAttention);
            await MarkDocumentFailedAsync(dbContext, message, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private static async Task DispatchAsync(
        AppDbContext dbContext,
        IQuickBooksGateway gateway,
        OrderOutboxMessage message,
        CancellationToken cancellationToken)
    {
        switch (message.Operation)
        {
            case IntegrationOperation.SyncCatalog:
                await SyncCatalogAsync(dbContext, gateway, cancellationToken);
                break;
            case IntegrationOperation.CreateEstimate:
                await CreateDocumentAsync(dbContext, gateway, message, isEstimate: true, cancellationToken);
                break;
            case IntegrationOperation.CreateInvoice:
                await CreateDocumentAsync(dbContext, gateway, message, isEstimate: false, cancellationToken);
                break;
            case IntegrationOperation.RefreshPaymentStatus:
                await RefreshPaymentAsync(dbContext, gateway, message, cancellationToken);
                break;
            default:
                throw new InvalidOperationException($"Unsupported integration operation {message.Operation}.");
        }
    }

    private static async Task SyncCatalogAsync(AppDbContext dbContext, IQuickBooksGateway gateway, CancellationToken cancellationToken)
    {
        var syncedAt = DateTime.UtcNow;
        var items = await gateway.FetchCatalogAsync(cancellationToken);
        foreach (var item in items)
        {
            var existing = await dbContext.QboCatalogItems.FirstOrDefaultAsync(candidate => candidate.ExternalItemId == item.ExternalItemId, cancellationToken);
            if (existing == null)
            {
                dbContext.QboCatalogItems.Add(new QboCatalogItem(item.ExternalItemId, item.Name, item.Description, item.SalesUnit, item.BasePrice, item.Currency, item.IsActive, syncedAt));
            }
            else
            {
                existing.Sync(item.ExternalItemId, item.Name, item.Description, item.SalesUnit, item.BasePrice, item.Currency, item.IsActive, syncedAt);
            }
        }
    }

    private static async Task CreateDocumentAsync(
        AppDbContext dbContext,
        IQuickBooksGateway gateway,
        OrderOutboxMessage message,
        bool isEstimate,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<OrderDocumentOutboxPayload>(message.PayloadJson, JsonOptions)
            ?? throw new InvalidOperationException("The document outbox payload is invalid.");
        var link = await dbContext.CommercialDocumentLinks.FirstAsync(candidate => candidate.Id == payload.CommercialDocumentLinkId, cancellationToken);
        var request = new QuickBooksDocumentRequest(payload.CustomerExternalId, payload.ReferenceNumber, payload.PurchaseOrderNumber, payload.Currency, payload.Lines, payload.LinkedEstimateExternalId);
        var result = isEstimate
            ? await gateway.CreateEstimateAsync(request, cancellationToken)
            : await gateway.CreateInvoiceAsync(request, cancellationToken);
        link.MarkSynchronized(result.ExternalDocumentId, result.DocumentNumber, result.DocumentUrl, result.Total, result.Balance, result.Currency, DateTime.UtcNow);

        if (isEstimate)
        {
            if (message.WorkflowType == OrderWorkflowTypes.LabService && payload.QuoteId.HasValue)
            {
                var quote = await dbContext.LabServiceQuotes.FirstAsync(candidate => candidate.Id == payload.QuoteId.Value, cancellationToken);
                var order = await dbContext.LabServiceOrders.FirstAsync(candidate => candidate.Id == message.WorkflowId, cancellationToken);
                quote.MarkIssued();
                order.MarkQuoteIssued(quote.Id);
            }
            else if (message.WorkflowType == OrderWorkflowTypes.DataAssembly && payload.QuoteId.HasValue)
            {
                var quote = await dbContext.DataAssemblyQuotes.FirstAsync(candidate => candidate.Id == payload.QuoteId.Value, cancellationToken);
                var requestRecord = await dbContext.DataAssemblyRequests.FirstAsync(candidate => candidate.Id == message.WorkflowId, cancellationToken);
                quote.MarkIssued();
                requestRecord.MarkQuoteIssued(quote.Id);
            }
            else if (message.WorkflowType == OrderWorkflowTypes.Reagent)
            {
                var order = await dbContext.PartnerReagentOrders.FirstAsync(candidate => candidate.Id == message.WorkflowId, cancellationToken);
                order.MarkCommerciallySynchronized();
            }
        }
        else if (message.WorkflowType == OrderWorkflowTypes.DataAssembly)
        {
            await ApplyAssemblyReleaseGateAsync(dbContext, message.WorkflowId, link.Balance, cancellationToken);
        }
        else if (message.WorkflowType == OrderWorkflowTypes.LabService && link.Balance == 0)
        {
            await ReleaseLabPaymentHoldsAsync(dbContext, message.WorkflowId, cancellationToken);
        }
    }

    private static async Task RefreshPaymentAsync(AppDbContext dbContext, IQuickBooksGateway gateway, OrderOutboxMessage message, CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<PaymentRefreshOutboxPayload>(message.PayloadJson, JsonOptions)
            ?? throw new InvalidOperationException("The payment-refresh payload is invalid.");
        var result = await gateway.ReadInvoiceAsync(payload.ExternalDocumentId, payload.Currency, cancellationToken);
        var link = await dbContext.CommercialDocumentLinks.FirstAsync(candidate => candidate.Id == payload.CommercialDocumentLinkId, cancellationToken);
        link.MarkSynchronized(result.ExternalDocumentId, result.DocumentNumber, result.DocumentUrl, result.Total, result.Balance, result.Currency, DateTime.UtcNow);
        if (result.Balance == 0)
        {
            if (message.WorkflowType == OrderWorkflowTypes.LabService)
                await ReleaseLabPaymentHoldsAsync(dbContext, message.WorkflowId, cancellationToken);
            if (message.WorkflowType == OrderWorkflowTypes.DataAssembly)
                await ApplyAssemblyReleaseGateAsync(dbContext, message.WorkflowId, result.Balance, cancellationToken);
        }
    }

    private static async Task ApplyAssemblyReleaseGateAsync(AppDbContext dbContext, Guid requestId, decimal invoiceBalance, CancellationToken cancellationToken)
    {
        var request = await dbContext.DataAssemblyRequests.AsNoTracking().FirstAsync(candidate => candidate.Id == requestId, cancellationToken);
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking().FirstOrDefaultAsync(candidate => candidate.OrganizationId == request.OrganizationId, cancellationToken);
        var mayRelease = profile?.AssemblyCreditApproved == true || invoiceBalance == 0;
        var releases = await dbContext.AssemblyOutputReleases.Where(release => release.DataAssemblyRequestId == requestId && release.ReleaseStatus != FileReleaseStatus.Withdrawn).ToListAsync(cancellationToken);
        var files = await dbContext.ManagedOperationalFiles.Where(file => file.WorkflowId == requestId && file.Purpose == OperationalFilePurpose.AssemblyOutput && file.ReleaseStatus != FileReleaseStatus.Withdrawn).ToListAsync(cancellationToken);
        foreach (var release in releases)
        {
            if (mayRelease) release.Release(DateTime.UtcNow); else release.MarkReady(holdForPayment: true);
        }
        foreach (var file in files)
        {
            if (mayRelease) file.Release(DateTime.UtcNow); else file.HoldForPayment();
        }
    }

    private static async Task ReleaseLabPaymentHoldsAsync(AppDbContext dbContext, Guid orderId, CancellationToken cancellationToken)
    {
        var releases = await dbContext.LabResultReleases.Where(release => release.LabServiceOrderId == orderId && release.ReleaseStatus == FileReleaseStatus.PaymentHold).ToListAsync(cancellationToken);
        var files = await dbContext.ManagedOperationalFiles.Where(file => file.WorkflowId == orderId && file.Purpose == OperationalFilePurpose.LabResult && file.ReleaseStatus == FileReleaseStatus.PaymentHold).ToListAsync(cancellationToken);
        foreach (var release in releases) release.Release(DateTime.UtcNow);
        foreach (var file in files) file.Release(DateTime.UtcNow);
    }

    private static async Task MarkDocumentFailedAsync(AppDbContext dbContext, OrderOutboxMessage message, CancellationToken cancellationToken)
    {
        if (message.Operation is not (IntegrationOperation.CreateEstimate or IntegrationOperation.CreateInvoice)) return;
        var payload = JsonSerializer.Deserialize<OrderDocumentOutboxPayload>(message.PayloadJson, JsonOptions);
        if (payload == null) return;
        var link = await dbContext.CommercialDocumentLinks.FirstOrDefaultAsync(candidate => candidate.Id == payload.CommercialDocumentLinkId, cancellationToken);
        link?.MarkFailed("External commercial synchronization failed. Retry from Order integrations.");
    }
}
