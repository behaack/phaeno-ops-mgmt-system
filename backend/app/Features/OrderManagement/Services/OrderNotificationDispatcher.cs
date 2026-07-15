namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public interface IOrderNotificationSender
{
    Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken cancellationToken);
}

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

public sealed class OrderNotificationDispatcher(IServiceScopeFactory scopeFactory, ILogger<OrderNotificationDispatcher> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var ids = await dbContext.OrderNotifications.AsNoTracking()
                    .Where(item => (item.Status == OrderNotificationStatus.Pending || item.Status == OrderNotificationStatus.Failed)
                        && item.AttemptCount < 5 && item.NextAttemptAt <= DateTime.UtcNow)
                    .OrderBy(item => item.CreatedAt).Select(item => item.Id).Take(20).ToListAsync(stoppingToken);
                foreach (var id in ids) await SendAsync(scopeFactory, id, logger, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception exception) { logger.LogError(exception, "Order notification polling failed."); }
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    private static async Task SendAsync(IServiceScopeFactory scopeFactory, Guid id, ILogger logger, CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IOrderNotificationSender>();
        var item = await dbContext.OrderNotifications.FirstOrDefaultAsync(value => value.Id == id, cancellationToken);
        if (item == null || item.Status == OrderNotificationStatus.Sent || item.AttemptCount >= 5) return;
        item.BeginAttempt(); await dbContext.SaveChangesAsync(cancellationToken);
        try
        {
            var recipients = item.RecipientUserId.HasValue
                ? await dbContext.Users.AsNoTracking().Where(user => user.Id == item.RecipientUserId && user.IsActive).Select(user => user.Email).ToListAsync(cancellationToken)
                : await (from membership in dbContext.OrganizationMemberships.AsNoTracking()
                    join user in dbContext.Users.AsNoTracking() on membership.UserId equals user.Id
                    where membership.OrganizationId == item.OrganizationId && membership.IsActive && membership.IsOrganizationAdmin && user.IsActive
                    select user.Email).Distinct().ToListAsync(cancellationToken);
            await sender.SendAsync(recipients, item.Subject, item.Body, cancellationToken);
            item.MarkSent(DateTime.UtcNow);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Order notification {NotificationId} failed.", id);
            item.MarkFailed("Notification delivery failed. Phaeno staff can review and retry it.", DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, item.AttemptCount))));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
