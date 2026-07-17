using Microsoft.Extensions.Options;

namespace PhaenoPortal.App.Features.Website.Crawler;

public sealed class WebsiteIndexingBackgroundService(
    IServiceScopeFactory scopeFactory,
    IOptions<WebsiteIndexingOptions> options,
    ILogger<WebsiteIndexingBackgroundService> logger) : BackgroundService
{
    private readonly WebsiteIndexingOptions options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (options.RunOnStartup)
        {
            await RebuildIndexAsync(stoppingToken);
        }

        using var timer = new PeriodicTimer(
            TimeSpan.FromHours(Math.Max(1, options.IntervalHours)));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RebuildIndexAsync(stoppingToken);
        }
    }

    private async Task RebuildIndexAsync(CancellationToken cancellationToken)
    {
        var startedAt = DateTimeOffset.UtcNow;
        try
        {
            using var scope = scopeFactory.CreateScope();
            await scope.ServiceProvider
                .GetRequiredService<IWebsiteCrawler>()
                .CrawlAsync(cancellationToken);
            logger.LogInformation(
                "Website crawl completed in {ElapsedMilliseconds} ms.",
                (DateTimeOffset.UtcNow - startedAt).TotalMilliseconds);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Website crawl failed.");
        }
    }
}
