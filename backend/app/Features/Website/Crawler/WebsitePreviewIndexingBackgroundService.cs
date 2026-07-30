using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website.Crawler.Documents;
using PhaenoPortal.App.Features.Website.Search;

namespace PhaenoPortal.App.Features.Website.Crawler;

public sealed class WebsitePreviewIndexingBackgroundService(
    IHttpClientFactory httpClientFactory,
    WebsitePreviewSearchService searchService,
    IWebsiteDocumentTextExtractor documentTextExtractor,
    IOptions<WebsitePreviewSearchOptions> options,
    IWebHostEnvironment environment,
    ILogger<WebsiteCrawler> crawlerLogger,
    ILogger<WebsitePreviewIndexingBackgroundService> logger) : BackgroundService
{
    private readonly WebsitePreviewSearchOptions options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Enabled)
        {
            return;
        }

        if (options.RunOnStartup)
        {
            await RebuildIndexAsync(stoppingToken);
        }

        using var timer = new PeriodicTimer(
            TimeSpan.FromHours(options.IntervalHours));
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
            using var httpClient = httpClientFactory.CreateClient(
                WebsiteServiceCollectionExtensions.PreviewCrawlerHttpClientName);
            var crawler = new WebsiteCrawler(
                httpClient,
                searchService,
                documentTextExtractor,
                Options.Create(options.ToCrawlerOptions()),
                environment,
                crawlerLogger);
            await crawler.CrawlAsync(cancellationToken);
            logger.LogInformation(
                "Website preview crawl completed in {ElapsedMilliseconds} ms.",
                (DateTimeOffset.UtcNow - startedAt).TotalMilliseconds);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Website preview crawl failed.");
        }
    }
}
