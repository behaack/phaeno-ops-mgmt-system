using System.Buffers;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using AngleSharp;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website.Crawler.Documents;
using PhaenoPortal.App.Features.Website.Crawler.Support;
using PhaenoPortal.App.Features.Website.Search;

namespace PhaenoPortal.App.Features.Website.Crawler;

public sealed class WebsiteCrawler : IWebsiteCrawler
{
    private const int MaximumRedirects = 3;
    private readonly HttpClient httpClient;
    private readonly IWebsiteSearchService searchService;
    private readonly IWebsiteDocumentTextExtractor documentTextExtractor;
    private readonly WebsiteCrawlerOptions options;
    private readonly IWebHostEnvironment environment;
    private readonly ILogger<WebsiteCrawler> logger;
    private readonly IBrowsingContext browsingContext;
    private readonly ConcurrentDictionary<string, byte> visitedPages = new();
    private readonly ConcurrentDictionary<string, byte> visitedSitemaps = new();
    private readonly RobotsTxtRules robots;

    public WebsiteCrawler(
        HttpClient httpClient,
        IWebsiteSearchService searchService,
        IWebsiteDocumentTextExtractor documentTextExtractor,
        IOptions<WebsiteCrawlerOptions> options,
        IWebHostEnvironment environment,
        ILogger<WebsiteCrawler> logger)
    {
        this.httpClient = httpClient;
        this.searchService = searchService;
        this.documentTextExtractor = documentTextExtractor;
        this.options = options.Value;
        this.environment = environment;
        this.logger = logger;
        browsingContext = BrowsingContext.New(
            AngleSharp.Configuration.Default.WithDefaultLoader());
        robots = new RobotsTxtRules(httpClient);
    }

    public async Task CrawlAsync(CancellationToken cancellationToken = default)
    {
        ValidateOptions();
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

        var stopwatch = Stopwatch.StartNew();
        var metrics = new CrawlMetrics();
        visitedPages.Clear();
        visitedSitemaps.Clear();
        var pages = new List<IndexedPage>();
        await robots.LoadAsync(siteUrl, cancellationToken);
        var sitemapUrl =
            robots.Sitemaps.FirstOrDefault()
            ?? new Uri(siteUrl, options.SiteMap);
        await CrawlSitemapAsync(
            siteUrl,
            sitemapUrl,
            pages,
            metrics,
            cancellationToken);
        searchService.RebuildIndex(pages);
        stopwatch.Stop();
        logger.LogInformation(
            "Website search index rebuilt with {PageCount} records in {ElapsedMilliseconds} ms. "
            + "Document pages: {DocumentPageCount}; sources extracted: {ExtractedSourceCount}; "
            + "HTML-only fallbacks: {FallbackCount}; rejected sources: {RejectedSourceCount}; "
            + "extracted characters: {ExtractedCharacterCount}.",
            pages.Count,
            stopwatch.ElapsedMilliseconds,
            metrics.DocumentPageCount,
            metrics.ExtractedSourceCount,
            metrics.FallbackCount,
            metrics.RejectedSourceCount,
            metrics.ExtractedCharacterCount);
    }

    private async Task CrawlSitemapAsync(
        Uri root,
        Uri sitemapUrl,
        ICollection<IndexedPage> pages,
        CrawlMetrics metrics,
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
                sitemapUrl.GetLeftPart(UriPartial.Path));
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
                sitemapUrl.GetLeftPart(UriPartial.Path));
            return;
        }

        if (parsed.ChildSitemaps.Count > 0)
        {
            foreach (var child in parsed.ChildSitemaps.Distinct())
            {
                cancellationToken.ThrowIfCancellationRequested();
                await CrawlSitemapAsync(
                    root,
                    child,
                    pages,
                    metrics,
                    cancellationToken);
            }
            return;
        }

        foreach (var url in parsed.Urls.Distinct())
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (IsSameOrigin(url, root))
            {
                await CrawlPageAsync(
                    root,
                    url,
                    pages,
                    metrics,
                    cancellationToken);
            }
        }
    }

    private async Task CrawlPageAsync(
        Uri root,
        Uri url,
        ICollection<IndexedPage> pages,
        CrawlMetrics metrics,
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
            logger.LogWarning(
                exception,
                "Failed to load Website page {PageUrl}.",
                url.GetLeftPart(UriPartial.Path));
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

        var searchMode =
            document.QuerySelector("meta[name='phaeno:search-mode']")
                ?.GetAttribute("content")?.Trim();
        if (string.Equals(searchMode, "document", StringComparison.OrdinalIgnoreCase))
        {
            metrics.DocumentPageCount++;
            var sourceText = await TryExtractDocumentSourceAsync(
                root,
                url,
                document.QuerySelector("meta[name='phaeno:search-source']")
                    ?.GetAttribute("content")?.Trim(),
                document.QuerySelector("meta[name='phaeno:search-source-type']")
                    ?.GetAttribute("content")?.Trim(),
                metrics,
                cancellationToken);
            pages.Add(new IndexedPage
            {
                Url = normalizedUrl,
                PageTitle = title,
                PageDisplayTitle = pageDisplayTitle,
                Description = description,
                DocumentType = documentType,
                SearchKeywords = pageKeywords,
                Text = HtmlTextExtractor.ExtractCleanText(main),
                SourceText = sourceText,
                IndexedAt = DateTime.UtcNow
            });
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

    private async Task<string> TryExtractDocumentSourceAsync(
        Uri root,
        Uri pageUrl,
        string? declaredSource,
        string? declaredSourceType,
        CrawlMetrics metrics,
        CancellationToken cancellationToken)
    {
        if (!TryResolveDocumentSource(
            root,
            pageUrl,
            declaredSource,
            declaredSourceType,
            out var source,
            out var rejectionReason))
        {
            metrics.RejectedSourceCount++;
            metrics.FallbackCount++;
            logger.LogWarning(
                "Rejected Website document source for {PageUrl}. Reason: {Reason}.",
                pageUrl.GetLeftPart(UriPartial.Path),
                rejectionReason);
            return string.Empty;
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(
            cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(options.DocumentTimeoutSeconds));
        try
        {
            var bytes = await DownloadDocumentAsync(root, source, timeout.Token);
            await using var stream = new MemoryStream(bytes, writable: false);
            var extraction = documentTextExtractor.ExtractAsync(
                stream,
                options.MaxExtractedCharacters,
                timeout.Token);
            var extracted = await extraction.WaitAsync(timeout.Token);
            if (extracted.Text.Length > options.MaxExtractedCharacters)
            {
                throw new DocumentSourceException("extracted_text_too_large");
            }
            if (string.IsNullOrWhiteSpace(extracted.Text))
            {
                throw new DocumentSourceException("no_extractable_text");
            }

            metrics.ExtractedSourceCount++;
            metrics.ExtractedCharacterCount += extracted.Text.Length;
            return extracted.Text;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            metrics.FallbackCount++;
            logger.LogWarning(
                "Website document source timed out for {PageUrl}. Reason: source_timeout.",
                pageUrl.GetLeftPart(UriPartial.Path));
            return string.Empty;
        }
        catch (WebsiteDocumentTextExtractionException exception)
        {
            metrics.FallbackCount++;
            logger.LogWarning(
                exception,
                "Website document extraction failed for {PageUrl}. Reason: {Reason}.",
                pageUrl.GetLeftPart(UriPartial.Path),
                exception.Reason);
            return string.Empty;
        }
        catch (DocumentSourceException exception)
        {
            metrics.FallbackCount++;
            if (exception.IsRejected)
            {
                metrics.RejectedSourceCount++;
            }
            logger.LogWarning(
                exception,
                "Website document source enrichment failed for {PageUrl}. Reason: {Reason}.",
                pageUrl.GetLeftPart(UriPartial.Path),
                exception.Reason);
            return string.Empty;
        }
        catch (Exception exception)
        {
            metrics.FallbackCount++;
            logger.LogWarning(
                exception,
                "Website document source enrichment failed for {PageUrl}. Reason: source_unavailable.",
                pageUrl.GetLeftPart(UriPartial.Path));
            return string.Empty;
        }
    }

    private async Task<byte[]> DownloadDocumentAsync(
        Uri root,
        Uri initialSource,
        CancellationToken cancellationToken)
    {
        var source = initialSource;
        for (var redirectCount = 0; ; redirectCount++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, source);
            using var response = await httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if (IsRedirect(response.StatusCode))
            {
                if (redirectCount >= MaximumRedirects
                    || response.Headers.Location is null)
                {
                    throw new DocumentSourceException(
                        "redirect_rejected",
                        isRejected: true);
                }

                var redirectedSource = response.Headers.Location.IsAbsoluteUri
                    ? response.Headers.Location
                    : new Uri(source, response.Headers.Location);
                if (!TryValidateResolvedSource(
                    root,
                    redirectedSource,
                    out var redirectRejection))
                {
                    throw new DocumentSourceException(
                        redirectRejection,
                        isRejected: true);
                }

                source = redirectedSource;
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                throw new DocumentSourceException("source_http_failure");
            }

            var finalSource = response.RequestMessage?.RequestUri ?? source;
            if (!TryValidateResolvedSource(root, finalSource, out var finalRejection))
            {
                throw new DocumentSourceException(
                    finalRejection,
                    isRejected: true);
            }

            var mediaType = response.Content.Headers.ContentType?.MediaType;
            if (!string.Equals(
                mediaType,
                "application/pdf",
                StringComparison.OrdinalIgnoreCase))
            {
                throw new DocumentSourceException(
                    "response_content_type_rejected",
                    isRejected: true);
            }

            if (response.Content.Headers.ContentLength is > 0
                && response.Content.Headers.ContentLength > options.MaxDocumentBytes)
            {
                throw new DocumentSourceException(
                    "document_too_large",
                    isRejected: true);
            }

            await using var content = await response.Content.ReadAsStreamAsync(
                cancellationToken);
            return await ReadBoundedAsync(
                content,
                options.MaxDocumentBytes,
                cancellationToken);
        }
    }

    private static async Task<byte[]> ReadBoundedAsync(
        Stream source,
        int maximumBytes,
        CancellationToken cancellationToken)
    {
        await using var destination = new MemoryStream();
        var buffer = ArrayPool<byte>.Shared.Rent(81_920);
        try
        {
            while (true)
            {
                var bytesRead = await source.ReadAsync(
                    buffer.AsMemory(0, buffer.Length),
                    cancellationToken);
                if (bytesRead == 0)
                {
                    return destination.ToArray();
                }
                if (destination.Length + bytesRead > maximumBytes)
                {
                    throw new DocumentSourceException(
                        "document_too_large",
                        isRejected: true);
                }

                await destination.WriteAsync(
                    buffer.AsMemory(0, bytesRead),
                    cancellationToken);
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    private bool TryResolveDocumentSource(
        Uri root,
        Uri pageUrl,
        string? declaredSource,
        string? declaredSourceType,
        out Uri source,
        out string rejectionReason)
    {
        if (string.IsNullOrWhiteSpace(declaredSource)
            || !Uri.TryCreate(pageUrl, declaredSource, out var resolvedSource)
            || resolvedSource is null)
        {
            source = null!;
            rejectionReason = "source_url_missing_or_invalid";
            return false;
        }
        source = resolvedSource;

        var declaredMediaType = declaredSourceType?
            .Split(';', 2)[0]
            .Trim();
        if (!string.Equals(
            declaredMediaType,
            "application/pdf",
            StringComparison.OrdinalIgnoreCase))
        {
            rejectionReason = "declared_content_type_rejected";
            return false;
        }

        return TryValidateResolvedSource(root, source, out rejectionReason);
    }

    private bool TryValidateResolvedSource(
        Uri root,
        Uri source,
        out string rejectionReason)
    {
        if (!IsSameOrigin(root, source))
        {
            rejectionReason = "source_origin_rejected";
            return false;
        }
        if (!environment.IsDevelopment()
            && !string.Equals(source.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            rejectionReason = "source_scheme_rejected";
            return false;
        }
        if (!string.IsNullOrEmpty(source.Query) || !string.IsNullOrEmpty(source.Fragment))
        {
            rejectionReason = "source_query_or_fragment_rejected";
            return false;
        }
        if (!source.AbsolutePath.StartsWith(
            options.DocumentSourcePathPrefix,
            StringComparison.OrdinalIgnoreCase))
        {
            rejectionReason = "source_path_rejected";
            return false;
        }
        if (!source.AbsolutePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            rejectionReason = "source_extension_rejected";
            return false;
        }
        if (!robots.IsAllowed(source.AbsolutePath))
        {
            rejectionReason = "source_robots_rejected";
            return false;
        }

        rejectionReason = string.Empty;
        return true;
    }

    private void ValidateOptions()
    {
        if (string.IsNullOrWhiteSpace(options.DocumentSourcePathPrefix)
            || !options.DocumentSourcePathPrefix.StartsWith('/')
            || !options.DocumentSourcePathPrefix.EndsWith('/'))
        {
            throw new InvalidOperationException(
                "WebCrawlerSettings:DocumentSourcePathPrefix must start and end with '/'.");
        }
        if (options.MaxDocumentBytes <= 0)
        {
            throw new InvalidOperationException(
                "WebCrawlerSettings:MaxDocumentBytes must be positive.");
        }
        if (options.MaxExtractedCharacters <= 0)
        {
            throw new InvalidOperationException(
                "WebCrawlerSettings:MaxExtractedCharacters must be positive.");
        }
        if (options.DocumentTimeoutSeconds <= 0)
        {
            throw new InvalidOperationException(
                "WebCrawlerSettings:DocumentTimeoutSeconds must be positive.");
        }
    }

    private static bool IsSameOrigin(Uri left, Uri right) =>
        string.Equals(left.Scheme, right.Scheme, StringComparison.OrdinalIgnoreCase)
        && string.Equals(left.Host, right.Host, StringComparison.OrdinalIgnoreCase)
        && left.Port == right.Port;

    private static bool IsRedirect(HttpStatusCode statusCode) =>
        (int)statusCode is >= 300 and < 400;

    private static string NormalizeUrl(Uri uri) =>
        uri.GetLeftPart(UriPartial.Path)
            .TrimEnd('/')
            .ToLowerInvariant();

    private sealed class CrawlMetrics
    {
        public int DocumentPageCount { get; set; }

        public int ExtractedSourceCount { get; set; }

        public int FallbackCount { get; set; }

        public int RejectedSourceCount { get; set; }

        public long ExtractedCharacterCount { get; set; }
    }

    private sealed class DocumentSourceException(
        string reason,
        bool isRejected = false) : Exception(reason)
    {
        public string Reason { get; } = reason;

        public bool IsRejected { get; } = isRejected;
    }
}
