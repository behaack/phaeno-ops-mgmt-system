using System.Collections.Concurrent;
using AngleSharp;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website.Crawler.Support;
using PhaenoPortal.App.Features.Website.Search;

namespace PhaenoPortal.App.Features.Website.Crawler;

public sealed class WebsiteCrawler : IWebsiteCrawler
{
    private readonly HttpClient httpClient;
    private readonly IWebsiteSearchService searchService;
    private readonly WebsiteCrawlerOptions options;
    private readonly ILogger<WebsiteCrawler> logger;
    private readonly IBrowsingContext browsingContext;
    private readonly ConcurrentDictionary<string, byte> visitedPages = new();
    private readonly ConcurrentDictionary<string, byte> visitedSitemaps = new();
    private readonly RobotsTxtRules robots;

    public WebsiteCrawler(
        HttpClient httpClient,
        IWebsiteSearchService searchService,
        IOptions<WebsiteCrawlerOptions> options,
        ILogger<WebsiteCrawler> logger)
    {
        this.httpClient = httpClient;
        this.searchService = searchService;
        this.options = options.Value;
        this.logger = logger;
        browsingContext = BrowsingContext.New(
            AngleSharp.Configuration.Default.WithDefaultLoader());
        robots = new RobotsTxtRules(httpClient);
    }

    public async Task CrawlAsync(CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(options.Url, UriKind.Absolute, out var siteUrl))
        {
            throw new InvalidOperationException(
                "WebCrawlerSettings:Url must be an absolute URL.");
        }
        if (string.IsNullOrWhiteSpace(options.SiteMap))
        {
            throw new InvalidOperationException(
                "WebCrawlerSettings:SiteMap is required.");
        }

        visitedPages.Clear();
        visitedSitemaps.Clear();
        var pages = new List<IndexedPage>();
        await robots.LoadAsync(siteUrl, cancellationToken);
        var sitemapUrl =
            robots.Sitemaps.FirstOrDefault()
            ?? new Uri(siteUrl, options.SiteMap);
        await CrawlSitemapAsync(siteUrl, sitemapUrl, pages, cancellationToken);
        searchService.RebuildIndex(pages);
        logger.LogInformation(
            "Website search index rebuilt with {PageCount} records.",
            pages.Count);
    }

    private async Task CrawlSitemapAsync(
        Uri root,
        Uri sitemapUrl,
        ICollection<IndexedPage> pages,
        CancellationToken cancellationToken)
    {
        if (!robots.IsAllowed(sitemapUrl.AbsolutePath)
            || !visitedSitemaps.TryAdd(NormalizeUrl(sitemapUrl), 0))
        {
            return;
        }

        string xml;
        try
        {
            xml = await httpClient.GetStringAsync(sitemapUrl, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Failed to load Website sitemap {SitemapUrl}.",
                sitemapUrl);
            return;
        }

        SitemapParser.SitemapParseResult parsed;
        try
        {
            parsed = SitemapParser.Parse(xml, root);
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Failed to parse Website sitemap {SitemapUrl}.",
                sitemapUrl);
            return;
        }

        if (parsed.ChildSitemaps.Count > 0)
        {
            foreach (var child in parsed.ChildSitemaps.Distinct())
            {
                cancellationToken.ThrowIfCancellationRequested();
                await CrawlSitemapAsync(root, child, pages, cancellationToken);
            }
            return;
        }

        foreach (var url in parsed.Urls.Distinct())
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (string.Equals(
                url.Host,
                root.Host,
                StringComparison.OrdinalIgnoreCase))
            {
                await CrawlPageAsync(root, url, pages, cancellationToken);
            }
        }
    }

    private async Task CrawlPageAsync(
        Uri root,
        Uri url,
        ICollection<IndexedPage> pages,
        CancellationToken cancellationToken)
    {
        var normalizedUrl = NormalizeUrl(url);
        if (!robots.IsAllowed(url.AbsolutePath)
            || !visitedPages.TryAdd(normalizedUrl, 0))
        {
            return;
        }

        string html;
        try
        {
            html = await httpClient.GetStringAsync(url, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed to load Website page {PageUrl}.", url);
            return;
        }

        var document = await browsingContext.OpenAsync(
            request => request.Content(html),
            cancellationToken);
        var title =
            document.QuerySelector("title")?.TextContent?.Trim()
            ?? "(No Page Title)";
        var pageDisplayTitle =
            document.QuerySelector("meta[name='phaeno:search-title']")
                ?.GetAttribute("content")?.Trim()
            ?? title;
        var description =
            document.QuerySelector("meta[name='description']")
                ?.GetAttribute("content")?.Trim()
            ?? string.Empty;
        var documentType =
            document.QuerySelector("meta[name='phaeno:document-type']")
                ?.GetAttribute("content")?.Trim()
            ?? "page";
        var pageKeywords =
            document.QuerySelector("meta[name='phaeno:search-keywords']")
                ?.GetAttribute("content")?.Trim()
            ?? string.Empty;
        var main = document.QuerySelector("main") ?? document.Body;
        if (main is null)
        {
            return;
        }

        var headings = main.QuerySelectorAll(
            "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id], [id][data-phaeno-search]");
        if (headings.Length == 0)
        {
            pages.Add(new IndexedPage
            {
                Url = normalizedUrl,
                PageTitle = title,
                PageDisplayTitle = pageDisplayTitle,
                Description = description,
                DocumentType = documentType,
                SearchKeywords = pageKeywords,
                Text = HtmlTextExtractor.ExtractCleanText(main),
                IndexedAt = DateTime.UtcNow
            });
            return;
        }

        foreach (var heading in headings)
        {
            var id = heading.GetAttribute("id");
            var headingText = heading.TextContent?.Trim();
            if (string.IsNullOrWhiteSpace(id)
                || string.IsNullOrWhiteSpace(headingText))
            {
                continue;
            }

            var anchorTitle =
                heading.GetAttribute("data-phaeno-search")?.Trim()
                ?? headingText;
            pages.Add(new IndexedPage
            {
                Url = $"{normalizedUrl}#{id}",
                PageTitle = title,
                PageDisplayTitle = pageDisplayTitle,
                Anchor = id,
                AnchorTitle = anchorTitle,
                Description =
                    heading.GetAttribute("data-phaeno-search-summary")?.Trim()
                    ?? string.Empty,
                DocumentType = "section",
                SearchKeywords =
                    heading.GetAttribute("data-phaeno-search-keywords")?.Trim()
                    ?? string.Empty,
                Text = HtmlTextExtractor.ExtractSectionText(
                    heading,
                    anchorTitle),
                IndexedAt = DateTime.UtcNow
            });
        }
    }

    private static string NormalizeUrl(Uri uri) =>
        uri.GetLeftPart(UriPartial.Path)
            .TrimEnd('/')
            .ToLowerInvariant();
}
