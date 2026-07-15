namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/order-integrations")]
public sealed class OrderIntegrationsAdminController(AppDbContext dbContext, OrderRequestContext requestContext, OrderIdempotencyService idempotency) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<IntegrationMessageDto>> List([FromQuery] string? status, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken); page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.OrderOutboxMessages.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<IntegrationStatus>(status, true, out var parsed)) throw new OrderManagementException("integration_status_invalid", "The integration status is invalid.");
            query = query.Where(item => item.Status == parsed);
        }
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(item => new IntegrationMessageDto(item.Id, item.Operation.ToString(), item.WorkflowType, item.WorkflowId,
                item.Status.ToString(), item.AttemptCount, item.NextAttemptAt, item.LastError, item.CreatedAt, item.Version)).ToListAsync(cancellationToken);
        return new PagedResult<IntegrationMessageDto>(items, page, pageSize, total);
    }

    [HttpPost("{messageId:guid}/retry")]
    public async Task<IntegrationMessageDto> Retry(Guid messageId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken); var key = idempotency.RequireKey(HttpContext);
        var scope = $"integration:{messageId}:retry"; var replay = await idempotency.ReadAsync<IntegrationMessageDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var item = await dbContext.OrderOutboxMessages.FirstOrDefaultAsync(value => value.Id == messageId, cancellationToken)
            ?? throw new OrderManagementException("integration_message_not_found", "The integration message was not found.", StatusCodes.Status404NotFound);
        if (item.Version != request.Version) throw new DbUpdateConcurrencyException();
        try { item.Retry(DateTime.UtcNow); } catch (InvalidOperationException exception) { throw new OrderManagementException("integration_retry_not_allowed", exception.Message, StatusCodes.Status409Conflict); }
        await dbContext.SaveChangesAsync(cancellationToken); var response = ToDto(item); idempotency.Store(actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken); return response;
    }

    [HttpPost("reconcile-payments")]
    public async Task<IReadOnlyList<IntegrationMessageDto>> ReconcilePayments(CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken); var key = idempotency.RequireKey(HttpContext);
        var links = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.Kind == CommercialDocumentKind.Invoice
            && item.SyncStatus == IntegrationStatus.Succeeded && item.ExternalDocumentId != null && item.Balance > 0).ToListAsync(cancellationToken);
        var messages = links.Select(link => new OrderOutboxMessage(IntegrationOperation.RefreshPaymentStatus, link.WorkflowType,
            link.WorkflowId, $"{key}:{link.Id}", JsonSerializer.Serialize(new PaymentRefreshOutboxPayload(link.Id, link.ExternalDocumentId!, link.Currency)))).ToList();
        dbContext.OrderOutboxMessages.AddRange(messages); await dbContext.SaveChangesAsync(cancellationToken);
        return messages.Select(ToDto).ToList();
    }

    private static IntegrationMessageDto ToDto(OrderOutboxMessage item) => new(item.Id, item.Operation.ToString(), item.WorkflowType,
        item.WorkflowId, item.Status.ToString(), item.AttemptCount, item.NextAttemptAt, item.LastError, item.CreatedAt, item.Version);
}

[ApiController]
[Authorize]
[Route("api/platform/order-notifications")]
public sealed class OrderNotificationsAdminController(AppDbContext dbContext, OrderRequestContext requestContext, OrderIdempotencyService idempotency) : ControllerBase
{
    [HttpGet]
    public async Task<PagedResult<NotificationMessageDto>> List([FromQuery] string? status, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.OrderNotifications.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<OrderNotificationStatus>(status, true, out var parsed))
                throw new OrderManagementException("notification_status_invalid", "The notification status is invalid.");
            query = query.Where(item => item.Status == parsed);
        }
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(item => new NotificationMessageDto(item.Id, item.WorkflowType, item.WorkflowId, item.EventType,
                item.Subject, item.Status.ToString(), item.AttemptCount, item.NextAttemptAt, item.LastError, item.CreatedAt, item.Version))
            .ToListAsync(cancellationToken);
        return new PagedResult<NotificationMessageDto>(items, page, pageSize, total);
    }

    [HttpPost("{notificationId:guid}/retry")]
    public async Task<NotificationMessageDto> Retry(Guid notificationId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"notification:{notificationId}:retry";
        var replay = await idempotency.ReadAsync<NotificationMessageDto>(actor.Id, scope, key, request, cancellationToken);
        if (replay != null) return replay;
        var item = await dbContext.OrderNotifications.FirstOrDefaultAsync(value => value.Id == notificationId, cancellationToken)
            ?? throw new OrderManagementException("notification_not_found", "The notification was not found.", StatusCodes.Status404NotFound);
        if (item.Version != request.Version) throw new DbUpdateConcurrencyException();
        try { item.Retry(DateTime.UtcNow); }
        catch (InvalidOperationException exception) { throw new OrderManagementException("notification_retry_not_allowed", exception.Message, StatusCodes.Status409Conflict); }
        await dbContext.SaveChangesAsync(cancellationToken);
        var response = ToDto(item); idempotency.Store(actor.Id, scope, key, request, response);
        await dbContext.SaveChangesAsync(cancellationToken); return response;
    }

    private static NotificationMessageDto ToDto(OrderNotification item) => new(item.Id, item.WorkflowType, item.WorkflowId,
        item.EventType, item.Subject, item.Status.ToString(), item.AttemptCount, item.NextAttemptAt, item.LastError, item.CreatedAt, item.Version);
}

[ApiController]
[AllowAnonymous]
[Route("api/integrations/quickbooks/webhook")]
public sealed class QuickBooksWebhookController(AppDbContext dbContext, IOptions<QuickBooksOptions> options) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Receive(CancellationToken cancellationToken)
    {
        var configuration = options.Value;
        if (string.IsNullOrWhiteSpace(configuration.WebhookVerifierToken)) return StatusCode(StatusCodes.Status503ServiceUnavailable);
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync(cancellationToken);
        var supplied = Request.Headers["intuit-signature"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(supplied)) return Unauthorized();
        var expectedBytes = HMACSHA256.HashData(Encoding.UTF8.GetBytes(configuration.WebhookVerifierToken), Encoding.UTF8.GetBytes(body));
        byte[] suppliedBytes;
        try { suppliedBytes = Convert.FromBase64String(supplied); } catch (FormatException) { return Unauthorized(); }
        if (!CryptographicOperations.FixedTimeEquals(expectedBytes, suppliedBytes)) return Unauthorized();
        if (!string.IsNullOrWhiteSpace(configuration.RealmId) && !body.Contains($"\"realmId\":\"{configuration.RealmId}\"", StringComparison.OrdinalIgnoreCase))
            return Unauthorized();
        var eventKey = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var invoiceLinks = await dbContext.CommercialDocumentLinks.AsNoTracking().Where(item => item.Kind == CommercialDocumentKind.Invoice
            && item.SyncStatus == IntegrationStatus.Succeeded && item.ExternalDocumentId != null).ToListAsync(cancellationToken);
        foreach (var link in invoiceLinks)
        {
            var key = $"webhook:{eventKey}:{link.Id}";
            if (!await dbContext.OrderOutboxMessages.AsNoTracking().AnyAsync(item => item.WorkflowType == link.WorkflowType
                && item.WorkflowId == link.WorkflowId && item.Operation == IntegrationOperation.RefreshPaymentStatus && item.IdempotencyKey == key, cancellationToken))
                dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.RefreshPaymentStatus, link.WorkflowType, link.WorkflowId,
                    key, JsonSerializer.Serialize(new PaymentRefreshOutboxPayload(link.Id, link.ExternalDocumentId!, link.Currency))));
        }
        if (body.Contains("\"name\":\"Item\"", StringComparison.OrdinalIgnoreCase))
        {
            var key = $"webhook:{eventKey}:catalog";
            if (!await dbContext.OrderOutboxMessages.AsNoTracking().AnyAsync(item => item.WorkflowType == "Configuration" && item.IdempotencyKey == key, cancellationToken))
                dbContext.OrderOutboxMessages.Add(new OrderOutboxMessage(IntegrationOperation.SyncCatalog, "Configuration", Guid.Empty, key, "{}"));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok();
    }
}
