namespace PhaenoPortal.App.Features.Website.Notifications;

public sealed class WebsiteNotificationBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<WebsiteNotificationBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Delay until application startup/migrations complete; never send in the public request.
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                for (var count = 0; count < 20 && !stoppingToken.IsCancellationRequested; count++)
                {
                    await using var scope = scopeFactory.CreateAsyncScope();
                    if (!await scope.ServiceProvider.GetRequiredService<WebsiteNotificationDispatcher>().ProcessNextAsync(stoppingToken)) break;
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception)
            {
                logger.LogError(exception, "Website notification processing failed; persisted messages remain available for retry.");
            }
        }
    }
}
