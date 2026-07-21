namespace PhaenoPortal.Test;

using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website;
using PhaenoPortal.App.Features.Website.Crawler;
using PhaenoPortal.App.Features.Website.Crawler.Documents;
using PhaenoPortal.App.Features.Website.Search;

public sealed class WebsiteCrawlerTests
{
    private const string Origin = "https://www.phaenobiotech.com";

    [Fact]
    public async Task DocumentModeIndexesOneLandingRecordWithExtractedSource()
    {
        var search = new CapturingSearchService();
        var extractor = new StubDocumentTextExtractor(
            new WebsiteDocumentText(
                "PDF-only chromatogram evidence appears here.",
                2));
        var crawler = CreateCrawler(
            search,
            extractor,
            request => StandardResponse(request));

        await crawler.CrawlAsync();

        var page = Assert.Single(search.Pages);
        Assert.Equal($"{Origin}/media/white-papers/example", page.Url);
        Assert.DoesNotContain('#', page.Url);
        Assert.Equal("White Paper", page.DocumentType);
        Assert.Contains("Visible abstract term", page.Text);
        Assert.Contains("chromatogram evidence", page.SourceText);
        Assert.Equal(1, extractor.CallCount);
    }

    [Fact]
    public async Task ExternalDocumentSourceFallsBackWithoutFetchingIt()
    {
        var search = new CapturingSearchService();
        var extractor = new StubDocumentTextExtractor(
            new WebsiteDocumentText("Should not be used.", 1));
        var externalRequestObserved = false;
        var crawler = CreateCrawler(
            search,
            extractor,
            request =>
            {
                externalRequestObserved |= request.RequestUri?.Host == "files.example.com";
                return StandardResponse(
                    request,
                    sourceUrl: "https://files.example.com/example.pdf");
            });

        await crawler.CrawlAsync();

        var page = Assert.Single(search.Pages);
        Assert.Empty(page.SourceText);
        Assert.False(externalRequestObserved);
        Assert.Equal(0, extractor.CallCount);
    }

    [Theory]
    [InlineData("wrong-content-type")]
    [InlineData("oversize")]
    [InlineData("external-redirect")]
    [InlineData("extraction-failure")]
    [InlineData("encrypted")]
    [InlineData("image-only")]
    [InlineData("robots-blocked")]
    [InlineData("invalid-prefix")]
    [InlineData("source-unavailable")]
    [InlineData("excessive-text")]
    public async Task InvalidOrUnreadableSourcesFallBackToHtml(
        string failureMode)
    {
        var search = new CapturingSearchService();
        var extractor = failureMode switch
        {
            "extraction-failure" or "encrypted" => new StubDocumentTextExtractor(
                new WebsiteDocumentText(string.Empty, 0),
                new WebsiteDocumentTextExtractionException(
                    "pdf_extraction_failed",
                    "Malformed fixture.")),
            "image-only" => new StubDocumentTextExtractor(
                new WebsiteDocumentText(string.Empty, 1)),
            "excessive-text" => new StubDocumentTextExtractor(
                new WebsiteDocumentText(new string('x', 10_001), 1)),
            _ => new StubDocumentTextExtractor(
                new WebsiteDocumentText("Extracted text.", 1))
        };
        var crawler = CreateCrawler(
            search,
            extractor,
            request => FailureResponse(request, failureMode),
            maximumBytes: failureMode == "oversize" ? 4 : 1_024);

        await crawler.CrawlAsync();

        var page = Assert.Single(search.Pages);
        Assert.Contains("Visible abstract term", page.Text);
        Assert.Empty(page.SourceText);
    }

    [Fact]
    public async Task DocumentExtractionTimeoutFallsBackWithoutBlockingRebuild()
    {
        var search = new CapturingSearchService();
        var crawler = CreateCrawler(
            search,
            new NonCancellingDocumentTextExtractor(),
            request => StandardResponse(request),
            timeoutSeconds: 1);

        var crawl = crawler.CrawlAsync();
        var completed = await Task.WhenAny(crawl, Task.Delay(TimeSpan.FromSeconds(3)));

        Assert.Same(crawl, completed);
        await crawl;
        Assert.Empty(Assert.Single(search.Pages).SourceText);
    }

    [Fact]
    public async Task OrdinaryPagesKeepSectionIndexingBehavior()
    {
        var search = new CapturingSearchService();
        var extractor = new StubDocumentTextExtractor(
            new WebsiteDocumentText("Unused.", 1));
        var crawler = CreateCrawler(
            search,
            extractor,
            request =>
            {
                if (request.RequestUri?.AbsolutePath == "/robots.txt")
                {
                    return TextResponse("User-agent: *\nAllow: /", "text/plain");
                }
                if (request.RequestUri?.AbsolutePath == "/sitemap-index.xml")
                {
                    return TextResponse(
                        $"<urlset><url><loc>{Origin}/technology</loc></url></urlset>",
                        "application/xml");
                }

                return TextResponse(
                    """
                    <html><head><title>Technology</title></head><body><main>
                    <h1 id="overview">Technology overview</h1><p>Overview text.</p>
                    <h2 id="workflow">Workflow</h2><p>Workflow text.</p>
                    </main></body></html>
                    """,
                    "text/html");
            });

        await crawler.CrawlAsync();

        Assert.Equal(2, search.Pages.Count);
        Assert.Contains(search.Pages, page => page.Anchor == "overview");
        Assert.Contains(search.Pages, page => page.Anchor == "workflow");
        Assert.All(search.Pages, page => Assert.Empty(page.SourceText));
        Assert.Equal(0, extractor.CallCount);
    }

    [Fact]
    public async Task MixedValidAndInvalidPublicationsStillCompleteRebuild()
    {
        var search = new CapturingSearchService();
        var extractor = new SelectiveDocumentTextExtractor();
        var crawler = CreateCrawler(
            search,
            extractor,
            request =>
            {
                var path = request.RequestUri?.AbsolutePath;
                return path switch
                {
                    "/robots.txt" => TextResponse(
                        "User-agent: *\nAllow: /",
                        "text/plain"),
                    "/sitemap-index.xml" => TextResponse(
                        $"<urlset><url><loc>{Origin}/media/white-papers/valid</loc></url>"
                        + $"<url><loc>{Origin}/media/white-papers/invalid</loc></url></urlset>",
                        "application/xml"),
                    "/media/white-papers/valid" => TextResponse(
                        LandingHtml($"{Origin}/white-papers/valid.pdf"),
                        "text/html"),
                    "/media/white-papers/invalid" => TextResponse(
                        LandingHtml($"{Origin}/white-papers/invalid.pdf"),
                        "text/html"),
                    "/white-papers/valid.pdf" => PdfResponse([1]),
                    "/white-papers/invalid.pdf" => PdfResponse([2]),
                    _ => new HttpResponseMessage(HttpStatusCode.NotFound)
                };
            });

        await crawler.CrawlAsync();

        Assert.Equal(2, search.Pages.Count);
        Assert.Contains(search.Pages, page =>
            page.Url.EndsWith("/valid", StringComparison.Ordinal)
            && page.SourceText.Contains("valid source text", StringComparison.Ordinal));
        Assert.Contains(search.Pages, page =>
            page.Url.EndsWith("/invalid", StringComparison.Ordinal)
            && string.IsNullOrEmpty(page.SourceText));
    }

    private static WebsiteCrawler CreateCrawler(
        CapturingSearchService search,
        IWebsiteDocumentTextExtractor extractor,
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory,
        int maximumBytes = 1_024,
        int timeoutSeconds = 5)
    {
        var httpClient = new HttpClient(new StubHttpMessageHandler(responseFactory));
        return new WebsiteCrawler(
            httpClient,
            search,
            extractor,
            Options.Create(new WebsiteCrawlerOptions
            {
                Url = Origin,
                SiteMap = "sitemap-index.xml",
                DocumentSourcePathPrefix = "/white-papers/",
                MaxDocumentBytes = maximumBytes,
                MaxExtractedCharacters = 10_000,
                DocumentTimeoutSeconds = timeoutSeconds
            }),
            new TestWebHostEnvironment("Production"),
            NullLogger<WebsiteCrawler>.Instance);
    }

    private static HttpResponseMessage StandardResponse(
        HttpRequestMessage request,
        string sourceUrl = $"{Origin}/white-papers/example.pdf")
    {
        return request.RequestUri?.AbsolutePath switch
        {
            "/robots.txt" => TextResponse("User-agent: *\nAllow: /", "text/plain"),
            "/sitemap-index.xml" => TextResponse(
                $"<urlset><url><loc>{Origin}/media/white-papers/example</loc></url></urlset>",
                "application/xml"),
            "/media/white-papers/example" => TextResponse(
                LandingHtml(sourceUrl),
                "text/html"),
            "/white-papers/example.pdf" => PdfResponse([1, 2, 3]),
            _ => new HttpResponseMessage(HttpStatusCode.NotFound)
        };
    }

    private static HttpResponseMessage FailureResponse(
        HttpRequestMessage request,
        string failureMode)
    {
        if (request.RequestUri?.AbsolutePath == "/robots.txt")
        {
            var robots = failureMode == "robots-blocked"
                ? "User-agent: *\nDisallow: /white-papers/"
                : "User-agent: *\nAllow: /";
            return TextResponse(robots, "text/plain");
        }
        if (request.RequestUri?.AbsolutePath == "/sitemap-index.xml")
        {
            return TextResponse(
                $"<urlset><url><loc>{Origin}/media/white-papers/example</loc></url></urlset>",
                "application/xml");
        }
        if (request.RequestUri?.AbsolutePath == "/media/white-papers/example")
        {
            var sourceUrl = failureMode == "invalid-prefix"
                ? $"{Origin}/downloads/example.pdf"
                : $"{Origin}/white-papers/example.pdf";
            return TextResponse(
                LandingHtml(sourceUrl),
                "text/html");
        }
        if (request.RequestUri?.AbsolutePath == "/white-papers/example.pdf")
        {
            return failureMode switch
            {
                "wrong-content-type" => TextResponse("not a PDF", "text/html"),
                "oversize" => PdfResponse([1, 2, 3, 4, 5]),
                "external-redirect" => new HttpResponseMessage(HttpStatusCode.Redirect)
                {
                    Headers = { Location = new Uri("https://files.example.com/example.pdf") }
                },
                "source-unavailable" => new HttpResponseMessage(
                    HttpStatusCode.ServiceUnavailable),
                _ => PdfResponse([1, 2, 3])
            };
        }

        return new HttpResponseMessage(HttpStatusCode.NotFound);
    }

    private static string LandingHtml(string sourceUrl) =>
        $$"""
        <html><head>
        <title>Example White Paper</title>
        <meta name="description" content="Example abstract summary.">
        <meta name="phaeno:document-type" content="White Paper">
        <meta name="phaeno:search-title" content="White Paper - Example">
        <meta name="phaeno:search-keywords" content="RNA, isoforms">
        <meta name="phaeno:search-mode" content="document">
        <meta name="phaeno:search-source" content="{{sourceUrl}}">
        <meta name="phaeno:search-source-type" content="application/pdf">
        </head><body><main>
        <h1 id="paper">Example White Paper</h1>
        <h2 id="abstract">Abstract</h2><p>Visible abstract term.</p>
        <h2 id="contents">Contents</h2><p>Major sections.</p>
        </main></body></html>
        """;

    private static HttpResponseMessage TextResponse(string text, string mediaType) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(text)
            {
                Headers = { ContentType = new MediaTypeHeaderValue(mediaType) }
            }
        };

    private static HttpResponseMessage PdfResponse(byte[] bytes) =>
        new(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(bytes)
            {
                Headers = { ContentType = new MediaTypeHeaderValue("application/pdf") }
            }
        };

    private sealed class StubHttpMessageHandler(
        Func<HttpRequestMessage, HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var response = responseFactory(request);
            response.RequestMessage ??= request;
            return Task.FromResult(response);
        }
    }

    private sealed class StubDocumentTextExtractor(
        WebsiteDocumentText result,
        Exception? exception = null) : IWebsiteDocumentTextExtractor
    {
        public int CallCount { get; private set; }

        public Task<WebsiteDocumentText> ExtractAsync(
            Stream document,
            int maxCharacters,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            return exception is null
                ? Task.FromResult(result)
                : Task.FromException<WebsiteDocumentText>(exception);
        }
    }

    private sealed class NonCancellingDocumentTextExtractor
        : IWebsiteDocumentTextExtractor
    {
        public Task<WebsiteDocumentText> ExtractAsync(
            Stream document,
            int maxCharacters,
            CancellationToken cancellationToken = default) =>
            new TaskCompletionSource<WebsiteDocumentText>().Task;
    }

    private sealed class SelectiveDocumentTextExtractor
        : IWebsiteDocumentTextExtractor
    {
        public async Task<WebsiteDocumentText> ExtractAsync(
            Stream document,
            int maxCharacters,
            CancellationToken cancellationToken = default)
        {
            var marker = document.ReadByte();
            await Task.Yield();
            cancellationToken.ThrowIfCancellationRequested();
            return marker == 1
                ? new WebsiteDocumentText("valid source text", 1)
                : throw new WebsiteDocumentTextExtractionException(
                    "pdf_extraction_failed",
                    "Invalid fixture.");
        }
    }

    private sealed class CapturingSearchService : IWebsiteSearchService
    {
        public IReadOnlyList<IndexedPage> Pages { get; private set; } = [];

        public void RebuildIndex(IEnumerable<IndexedPage> pages)
        {
            Pages = pages.ToList();
        }

        public IReadOnlyList<IndexedPage> Search(string queryText) => [];
    }

    private sealed class TestWebHostEnvironment(string environmentName) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "PhaenoPortal.Test";

        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();

        public string WebRootPath { get; set; } = Path.GetTempPath();

        public string EnvironmentName { get; set; } = environmentName;

        public string ContentRootPath { get; set; } = Path.GetTempPath();

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
