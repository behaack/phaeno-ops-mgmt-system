using System.Diagnostics.Metrics;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Infrastructure.Persistence;

namespace PhaenoPortal.App.Features.Website.Notifications;

public sealed class WebsiteNotificationQueueMonitor(ILogger<WebsiteNotificationQueueMonitor> logger) : IDisposable
{
    public const string MeterName = "PhaenoPortal.Website.Notifications";
    private readonly Meter meter = new(MeterName);
    private WebOpsNotificationSummaryDto? latest;
    private AttentionState? previous;
    private DateTimeOffset? lastWarningAtUtc;
    private bool instrumentsCreated;

    public void Observe(WebOpsNotificationSummaryDto summary, DateTimeOffset? latestAttentionAttemptAtUtc, DateTimeOffset now)
    {
        Volatile.Write(ref latest, summary);
        if (!instrumentsCreated)
        {
            meter.CreateObservableGauge("website.notifications.pending", () => Volatile.Read(ref latest)?.PendingCount ?? 0, "{message}");
            meter.CreateObservableGauge("website.notifications.processing", () => Volatile.Read(ref latest)?.ProcessingCount ?? 0, "{message}");
            meter.CreateObservableGauge("website.notifications.failed", () => Volatile.Read(ref latest)?.FailedCount ?? 0, "{message}");
            meter.CreateObservableGauge("website.notifications.expired_processing", () => Volatile.Read(ref latest)?.ExpiredProcessingCount ?? 0, "{message}");
            meter.CreateObservableGauge("website.notifications.paused", () => Volatile.Read(ref latest)?.IsPaused == true ? 1 : 0, "{state}");
            instrumentsCreated = true;
        }
        var state = new AttentionState(summary.IsPaused, summary.FailedCount, summary.ExpiredProcessingCount, latestAttentionAttemptAtUtc);
        var actionable = summary.FailedCount > 0 || summary.ExpiredProcessingCount > 0;
        if (actionable && (state != previous || lastWarningAtUtc is null || now - lastWarningAtUtc >= TimeSpan.FromMinutes(15)))
        {
            logger.LogWarning(new EventId(5410, "WebsiteNotificationAttentionRequired"),
                "Website email queue needs attention: {FailedCount} failed, {ExpiredProcessingCount} expired processing leases, {PendingCount} queued, {ProcessingCount} processing; paused: {IsPaused}. Review Web Operations Email delivery.",
                summary.FailedCount, summary.ExpiredProcessingCount, summary.PendingCount, summary.ProcessingCount, summary.IsPaused);
            lastWarningAtUtc = now;
        }
        else if (!actionable && previous is { } prior && (prior.FailedCount > 0 || prior.ExpiredProcessingCount > 0))
        {
            logger.LogInformation(new EventId(5411, "WebsiteNotificationAttentionCleared"), "Website email queue has no failed messages or expired processing leases; paused: {IsPaused}.", summary.IsPaused);
            lastWarningAtUtc = null;
        }
        previous = state;
    }

    public void Dispose() => meter.Dispose();
    private readonly record struct AttentionState(bool IsPaused, int FailedCount, int ExpiredProcessingCount, DateTimeOffset? LatestAttemptAtUtc);
}

// Monitoring has its own loop so paused processing and slow provider calls never
// suppress queue visibility. It emits counts only, without intake or email data.
public sealed class WebsiteNotificationMonitoringBackgroundService(
    IServiceScopeFactory scopeFactory,
    WebsiteNotificationQueueMonitor monitor,
    ILogger<WebsiteNotificationMonitoringBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var summary = await scope.ServiceProvider.GetRequiredService<WebsiteNotificationProcessingService>().ReadSummaryAsync(stoppingToken);
                var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                var now = DateTimeOffset.UtcNow;
                var latestAttentionAttemptAtUtc = await dbContext.Set<WebNotificationDelivery>().AsNoTracking()
                    .Where(item => item.State == WebNotificationState.Failed
                        || (item.State == WebNotificationState.Processing && item.LeaseExpiresAtUtc <= now))
                    .MaxAsync(item => item.LastAttemptAtUtc, stoppingToken);
                monitor.Observe(summary, latestAttentionAttemptAtUtc, now);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception)
            {
                logger.LogError(new EventId(5412, "WebsiteNotificationMonitoringFailed"), exception,
                    "Website email queue monitoring failed. Queue state is unknown; check database connectivity and migrations.");
            }
        }
    }
}
