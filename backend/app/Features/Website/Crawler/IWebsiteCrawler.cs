namespace PhaenoPortal.App.Features.Website.Crawler;

public interface IWebsiteCrawler
{
    Task CrawlAsync(CancellationToken cancellationToken = default);
}
