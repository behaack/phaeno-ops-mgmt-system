namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/order-integrations")]
public sealed class OrderIntegrationsAdminController(PSeqOperationsDbContext dbContext, OrderRequestContext requestContext) : ControllerBase
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
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        throw Deferred();
    }

    [HttpPost("reconcile-payments")]
    public async Task<IReadOnlyList<IntegrationMessageDto>> ReconcilePayments(CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        throw Deferred();
    }

    private static OrderManagementException Deferred()
        => new("quickbooks_deferred", "QuickBooks integration is deferred. Use the manual journal-entry source report instead.", StatusCodes.Status404NotFound);
}

[ApiController]
[Authorize]
[Route("api/platform/order-notifications")]
public sealed class OrderNotificationsAdminController(PSeqOperationsDbContext dbContext, OrderRequestContext requestContext, OrderIdempotencyService idempotency) : ControllerBase
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
        var now = DateTime.UtcNow;
        var items = await query.OrderByDescending(item => item.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(item => new NotificationMessageDto(item.Id, item.WorkflowType, item.WorkflowId, item.EventType,
                item.Subject, item.Status.ToString(), item.AttemptCount, item.NextAttemptAt, item.LastError, item.CreatedAt,
                item.Status == OrderNotificationStatus.Failed
                    || (item.Status == OrderNotificationStatus.Sending && item.NextAttemptAt <= now),
                item.Version))
            .ToListAsync(cancellationToken);
        return new PagedResult<NotificationMessageDto>(items, page, pageSize, total);
    }

    [HttpPost("{notificationId:guid}/retry")]
    public async Task<NotificationMessageDto> Retry(Guid notificationId, [FromBody] VersionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var key = idempotency.RequireKey(HttpContext); var scope = $"notification:{notificationId}:retry";
        var execution = await idempotency.ExecuteAsync(
            actor.Id,
            scope,
            key,
            request,
            async operationCancellationToken =>
            {
                var item = await dbContext.OrderNotifications.FirstOrDefaultAsync(value => value.Id == notificationId, operationCancellationToken)
                    ?? throw new OrderManagementException("notification_not_found", "The notification was not found.", StatusCodes.Status404NotFound);
                if (item.Version != request.Version) throw new DbUpdateConcurrencyException();
                try { item.Retry(DateTime.UtcNow); }
                catch (InvalidOperationException exception) { throw new OrderManagementException("notification_retry_not_allowed", exception.Message, StatusCodes.Status409Conflict); }
                await dbContext.SaveChangesAsync(operationCancellationToken);
                return ToDto(item);
            },
            cancellationToken: cancellationToken);
        return execution.Response;
    }

    private static NotificationMessageDto ToDto(OrderNotification item) => new(item.Id, item.WorkflowType, item.WorkflowId,
        item.EventType, item.Subject, item.Status.ToString(), item.AttemptCount, item.NextAttemptAt, item.LastError, item.CreatedAt,
        item.CanRetry(DateTime.UtcNow), item.Version);
}
