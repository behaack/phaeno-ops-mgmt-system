namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Data;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
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

public sealed class PostmarkOrderNotificationSender(HttpClient httpClient, IOptions<PostmarkOptions> options) : IOrderNotificationSender
{
    private readonly PostmarkOptions configuration = options.Value;

    public async Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken cancellationToken)
    {
        if (recipients.Count == 0) return;
        using var request = new HttpRequestMessage(HttpMethod.Post, "email");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Add("X-Postmark-Server-Token", configuration.ServerToken);
        request.Content = new StringContent(JsonSerializer.Serialize(new
        {
            From = string.IsNullOrWhiteSpace(configuration.FromName) ? configuration.FromEmail : $"{configuration.FromName} <{configuration.FromEmail}>",
            To = string.Join(',', recipients),
            Subject = subject,
            TextBody = body,
            MessageStream = configuration.MessageStream
        }), Encoding.UTF8, "application/json");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}

public sealed class OrderNotificationDispatcher(
    IServiceScopeFactory scopeFactory,
    IOptions<PersistenceOptions> persistenceOptions,
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

    private async Task<NotificationClaim?> ClaimNextAsync(CancellationToken cancellationToken)
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
                OrderNotificationStatus.Sending.ToString())
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
        var item = await dbContext.OrderNotifications.FirstOrDefaultAsync(
            value => value.Id == claim.Id
                && value.Version == claim.Version
                && value.Status == OrderNotificationStatus.Sending,
            cancellationToken);
        if (item is null) return;

        try
        {
            var recipients = item.RecipientUserId.HasValue
                ? await (from membership in dbContext.OrganizationMemberships.AsNoTracking()
                    join user in dbContext.Users.AsNoTracking() on membership.UserId equals user.Id
                    where membership.OrganizationId == item.OrganizationId
                        && membership.UserId == item.RecipientUserId.Value
                        && membership.IsActive
                        && membership.IsOrganizationAdmin
                        && user.IsActive
                        && user.Status == PSeq.Operations.Commercial.Accounts.Domain.UserAccountStatus.Active
                    select user.Email).Distinct().ToListAsync(cancellationToken)
                : await (from membership in dbContext.OrganizationMemberships.AsNoTracking()
                    join user in dbContext.Users.AsNoTracking() on membership.UserId equals user.Id
                    where membership.OrganizationId == item.OrganizationId
                        && membership.IsActive
                        && membership.IsOrganizationAdmin
                        && user.IsActive
                        && user.Status == PSeq.Operations.Commercial.Accounts.Domain.UserAccountStatus.Active
                    select user.Email).Distinct().ToListAsync(cancellationToken);
            if (recipients.Count == 0)
            {
                throw new InvalidOperationException(
                    "The notification has no active Customer administrator recipient.");
            }
            await sender.SendAsync(recipients, item.Subject, item.Body, cancellationToken);
            item.MarkSent(DateTime.UtcNow);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Order notification {NotificationId} failed.", claim.Id);
            item.MarkFailed("Notification delivery failed. Phaeno staff can review and retry it.", DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, item.AttemptCount))));
        }

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            logger.LogWarning(
                exception,
                "Notification claim {NotificationId} changed before its delivery result could be recorded.",
                claim.Id);
        }
    }

    private sealed record NotificationClaim(Guid Id, long Version, bool ShouldSend);
}
