namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Data;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Website;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class LoggingOrderNotificationSender(ILogger<LoggingOrderNotificationSender> logger) : IOrderNotificationSender
{
    public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        logger.LogInformation("Order notification '{Subject}' would be sent to {RecipientCount} recipient(s).", subject, recipients.Count);
        return Task.CompletedTask;
    }
}

public sealed class MailgunOrderNotificationSender(
    HttpClient httpClient,
    IOptions<WebsiteEmailOptions> options) : IOrderNotificationSender
{
    private readonly WebsiteEmailOptions configuration = options.Value;

    public async Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken cancellationToken)
    {
        if (recipients.Count == 0) return;
        if (!configuration.CanSendTransactional)
            throw new InvalidOperationException("Mailgun order sender is not configured.");

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{configuration.Url.TrimEnd('/')}/{configuration.Resource.TrimStart('/')}");
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.ASCII.GetBytes($"api:{configuration.ApiKey}")));
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["from"] = configuration.AccountFrom,
            ["to"] = string.Join(',', recipients),
            ["subject"] = subject,
            ["text"] = body,
            ["o:tracking"] = "false",
            ["o:tracking-clicks"] = "no",
            ["o:tracking-opens"] = "no",
            ["o:require-tls"] = "true",
            ["o:skip-verification"] = "false",
            ["o:dkim"] = "yes",
            ["o:tag"] = "portal-order-notification"
        });
        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}

public sealed class OrderNotificationDispatcher(
    IServiceScopeFactory scopeFactory,
    IOptions<PersistenceOptions> persistenceOptions,
    IOptions<PSeqOrderToCashOptions> retentionOptions,
    IOptions<OrderManagementOptions> generalRetentionOptions,
    ILogger<OrderNotificationDispatcher> logger) : BackgroundService
{
    private const int BatchSize = 20;
    private const int MaximumAttempts = 5;
    private static readonly TimeSpan ClaimLease = TimeSpan.FromMinutes(5);
    private readonly string commercialSchema = persistenceOptions.Value.Validate().CommercialSchema;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                for (var count = 0; count < BatchSize; count++)
                {
                    var claim = await ClaimNextAsync(stoppingToken);
                    if (claim is null) break;
                    if (claim.ShouldSend)
                        await SendClaimedAsync(scopeFactory, claim, logger, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception exception) { logger.LogError(exception, "Order notification polling failed."); }
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    internal async Task<NotificationClaim?> ClaimNextAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);
        var now = DateTime.UtcNow;
        var sql = $$"""
            SELECT *
            FROM "{{commercialSchema}}"."order_notifications"
            WHERE "next_attempt_at" <= {0}
              AND ("workflow_type" <> 'ReleasedDeliverableRetention' OR EXISTS (
                  SELECT 1 FROM "{{commercialSchema}}"."released_deliverable_retention_snapshots" snapshot
                  WHERE snapshot."id" = "order_notifications"."workflow_id"
                    AND snapshot."organization_id" = "order_notifications"."organization_id"
                    AND (({5} AND EXISTS (SELECT 1 FROM "{{commercialSchema}}"."result_retention_schedules" schedule WHERE schedule."retention_snapshot_id" = snapshot."id"))
                      OR ({6} AND NOT EXISTS (SELECT 1 FROM "{{commercialSchema}}"."result_retention_schedules" schedule WHERE schedule."retention_snapshot_id" = snapshot."id")))))
              AND (("status" IN ({1}, {2}) AND "attempt_count" < {3})
                   OR "status" = {4})
            ORDER BY "created_at"
            LIMIT 1
            FOR UPDATE SKIP LOCKED
            """;
        var candidates = await dbContext.OrderNotifications
            .FromSqlRaw(
                sql,
                now,
                OrderNotificationStatus.Pending.ToString(),
                OrderNotificationStatus.Failed.ToString(),
                MaximumAttempts,
                OrderNotificationStatus.Sending.ToString(),
                retentionOptions.Value.GovernedPSeqResults && retentionOptions.Value.GovernedRetentionProcessing,
                generalRetentionOptions.Value.CanProcessRetention(retentionOptions.Value.AttentionOperations))
            .AsTracking()
            .ToListAsync(cancellationToken);
        var item = candidates.SingleOrDefault();
        if (item is null)
        {
            await transaction.CommitAsync(cancellationToken);
            return null;
        }

        if (item.Status == OrderNotificationStatus.Sending
            && item.AttemptCount >= MaximumAttempts)
        {
            item.MarkFailed(
                "Notification delivery was interrupted during the final automatic attempt. Review delivery configuration, then retry it manually.",
                now);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogWarning(
                "Recovered expired notification claim {NotificationId} to manual-retry state.",
                item.Id);
            return new NotificationClaim(item.Id, item.Version, ShouldSend: false);
        }

        item.BeginAttempt(now.Add(ClaimLease));
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new NotificationClaim(item.Id, item.Version, ShouldSend: true);
    }

    private static async Task SendClaimedAsync(
        IServiceScopeFactory scopeFactory,
        NotificationClaim claim,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IOrderNotificationSender>();
        await DeliverAsync(dbContext, sender, claim.Id, claim.Version, logger, cancellationToken);
    }

    internal static async Task DeliverAsync(PSeqOperationsDbContext dbContext,
        IOrderNotificationSender sender, Guid notificationId, long version, ILogger logger,
        CancellationToken cancellationToken)
    {
        var item = await dbContext.OrderNotifications.FirstOrDefaultAsync(
            value => value.Id == notificationId
                && value.Version == version
                && value.Status == OrderNotificationStatus.Sending,
            cancellationToken);
        if (item is null) return;
        var isRetention = item.WorkflowType == GovernedRetentionCheckpointService.WorkflowType;
        await using var transaction = isRetention ? await RetentionTransaction.OpenAsync(dbContext, item.WorkflowId, cancellationToken) : null;
        if (isRetention)
        {
            await dbContext.Entry(item).ReloadAsync(cancellationToken);
            if (item.Status != OrderNotificationStatus.Sending || item.Version != version) return;
        }

        try
        {
            var recipients = await OrganizationNotificationRecipients.ReadAsync(dbContext,
                item.OrganizationId, isRetention ? null : item.DepartmentId, isRetention ? null : item.RecipientUserId,
                includeDepartmentRouting: !isRetention, cancellationToken);

            if (recipients.Count == 0)
            {
                item.MarkFailed("No eligible recipients. Review the active organization, department, administrator assignments, and notification routing before retrying.",
                    DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, item.AttemptCount))));
            }
            else
            {
                await sender.SendAsync(recipients, item.Subject, item.Body, cancellationToken);
                item.MarkSent(DateTime.UtcNow);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Order notification {NotificationId} failed.", notificationId);
            item.MarkFailed("Notification delivery failed. Phaeno staff can review and retry it.", DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, item.AttemptCount))));
        }

        try
        {
            if (isRetention && item.Status == OrderNotificationStatus.Failed)
                await GovernedRetentionCheckpointService.ReportFailureAsync(dbContext, item, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            logger.LogWarning(
                exception,
                "Notification claim {NotificationId} changed before its delivery result could be recorded.",
                notificationId);
        }
    }

    internal sealed record NotificationClaim(Guid Id, long Version, bool ShouldSend);
}
