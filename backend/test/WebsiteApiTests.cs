namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website;
using PhaenoPortal.App.Features.Website.Crawler.Support;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Features.Website.Search;

public sealed class WebsiteApiTests
{
    [Fact]
    public void SitemapParserReadsWebsiteUrls()
    {
        const string xml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url><loc>https://www.phaenobiotech.com/technology</loc></url>
              <url><loc>/contact</loc></url>
            </urlset>
            """;

        var result = SitemapParser.Parse(
            xml,
            new Uri("https://www.phaenobiotech.com"));

        Assert.Empty(result.ChildSitemaps);
        Assert.Equal(
            [
                new Uri("https://www.phaenobiotech.com/technology"),
                new Uri("https://www.phaenobiotech.com/contact")
            ],
            result.Urls);
    }

    [Theory]
    [InlineData("Phaéno", "Phaeno")]
    [InlineData("transcriptomics", "transcriptomics")]
    public void SearchNormalizationRemovesAccents(
        string input,
        string expected)
    {
        Assert.Equal(expected, WebsiteSearchService.RemoveAccents(input));
    }

    [Fact]
    public void SearchHighlightsHyphenatedTermsAndRejectsHiddenMetadataOnlyMatches()
    {
        var indexPath = Path.Combine(
            Path.GetTempPath(),
            $"phaeno-website-search-{Guid.NewGuid():N}");

        try
        {
            using var service = new WebsiteSearchService(
                null!,
                Options.Create(new WebsiteSearchOptions
                {
                    SearchIndexLocation = indexPath
                }));
            service.RebuildIndex(
            [
                new IndexedPage
                {
                    Id = "visible-read",
                    Url = "https://www.phaenobiotech.com/technology#reads",
                    PageTitle = "Technology",
                    PageDisplayTitle = "Technology",
                    Anchor = "reads",
                    AnchorTitle = "Short-read sequencing",
                    Text = "Short-read sequencing produces reads for analysis."
                },
                new IndexedPage
                {
                    Id = "page-title-only-read",
                    Url = "https://www.phaenobiotech.com#platform",
                    PageTitle = "Phaeno | Full-Length RNA Sequencing with Short-Read NGS",
                    PageDisplayTitle = "Home",
                    Anchor = "platform",
                    AnchorTitle = "PSeq platform overview",
                    Description = "PSeq exposes molecular phenotype by resolving isoforms.",
                    Text = "PSeq platform overview and molecular phenotype."
                },
                new IndexedPage
                {
                    Id = "keyword-only-read",
                    Url = "https://www.phaenobiotech.com/technology#analysis",
                    PageTitle = "Technology",
                    PageDisplayTitle = "Technology",
                    Anchor = "analysis",
                    AnchorTitle = "Analysis workflow",
                    Description = "Molecule-level processing for downstream models.",
                    SearchKeywords = "short-read sequencing",
                    Text = "Analysis workflow for downstream models."
                }
            ]);

            var result = Assert.Single(service.Search("read"));

            Assert.Equal("visible-read", result.Id);
            Assert.Equal(2, result.Count);
            Assert.Contains("Short-{{read}}", result.Snippet);
            Assert.Contains("{{reads}}", result.Snippet);
        }
        finally
        {
            if (Directory.Exists(indexPath))
            {
                Directory.Delete(indexPath, recursive: true);
            }
        }
    }

    [Fact]
    public void SearchReturnsLandingResultAndSnippetForPdfOnlyTerm()
    {
        var indexPath = Path.Combine(
            Path.GetTempPath(),
            $"phaeno-website-search-{Guid.NewGuid():N}");

        try
        {
            using var service = CreateSearchService(indexPath);
            service.RebuildIndex(
            [
                new IndexedPage
                {
                    Id = "publication",
                    Url = "https://www.phaenobiotech.com/media/white-papers/example",
                    PageTitle = "Example White Paper",
                    PageDisplayTitle = "White Paper - Example",
                    Description = "A visible overview of the publication.",
                    DocumentType = "White Paper",
                    Text = "Visible abstract and contents.",
                    SourceText = "The PDF contains chromatogram calibration evidence."
                }
            ]);

            var result = Assert.Single(service.Search("chromatogram"));

            Assert.Equal("publication", result.Id);
            Assert.DoesNotContain('#', result.Url);
            Assert.Contains("{{chromatogram}}", result.Snippet);
        }
        finally
        {
            DeleteIndex(indexPath);
        }
    }

    [Fact]
    public void SearchPrefersVisibleSnippetAndTitleRankingOverPdfSource()
    {
        var indexPath = Path.Combine(
            Path.GetTempPath(),
            $"phaeno-website-search-{Guid.NewGuid():N}");

        try
        {
            using var service = CreateSearchService(indexPath);
            service.RebuildIndex(
            [
                new IndexedPage
                {
                    Id = "visible-and-source",
                    Url = "https://www.phaenobiotech.com/media/white-papers/visible",
                    PageTitle = "Molecular Atlas White Paper",
                    PageDisplayTitle = "Molecular Atlas",
                    Description = "Visible molecular atlas overview.",
                    Text = "Visible molecular atlas evidence appears first.",
                    SourceText = "PDF molecular atlas evidence appears second."
                },
                new IndexedPage
                {
                    Id = "source-only",
                    Url = "https://www.phaenobiotech.com/media/white-papers/source",
                    PageTitle = "Another White Paper",
                    PageDisplayTitle = "Another White Paper",
                    Description = "A different topic.",
                    Text = "No matching visible term.",
                    SourceText = "Molecular atlas appears only in this PDF."
                }
            ]);

            var results = service.Search("molecular atlas");

            Assert.Equal("visible-and-source", results[0].Id);
            Assert.StartsWith("Visible", results[0].Snippet);
            Assert.Contains("{{molecular}}", results[0].Snippet);
        }
        finally
        {
            DeleteIndex(indexPath);
        }
    }

    [Fact]
    public void SearchResponseDoesNotSerializeInternalSourceText()
    {
        var json = JsonSerializer.Serialize(new IndexedPage
        {
            Text = "Visible internal index text.",
            SourceText = "Private index-only PDF text.",
            SearchKeywords = "internal keyword"
        });

        Assert.DoesNotContain("SourceText", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Private index-only PDF text", json);
        Assert.DoesNotContain("Visible internal index text", json);
        Assert.DoesNotContain("internal keyword", json);
    }

    [Fact]
    public void MailingListUnsubscribeCapturesActorAndTimeOnlyOnce()
    {
        var contact = new WebContact();
        var actorUserId = Guid.NewGuid();
        var occurredAtUtc = DateTimeOffset.Parse("2026-07-18T16:00:00Z");

        Assert.True(contact.Unsubscribe(actorUserId, occurredAtUtc));
        Assert.Equal(actorUserId, contact.UnsubscribedByUserId);
        Assert.Equal(occurredAtUtc, contact.UnsubscribedAtUtc);

        Assert.False(
            contact.Unsubscribe(
                Guid.NewGuid(),
                occurredAtUtc.AddMinutes(5)));
        Assert.Equal(actorUserId, contact.UnsubscribedByUserId);
        Assert.Equal(occurredAtUtc, contact.UnsubscribedAtUtc);
    }

    [Fact]
    public void DemoRequestCompletionCapturesActorAndTimeOnlyOnce()
    {
        var demoRequest = new WebOrder();
        var actorUserId = Guid.NewGuid();
        var occurredAtUtc = DateTimeOffset.Parse("2026-07-18T16:05:00Z");

        Assert.True(demoRequest.Complete(actorUserId, occurredAtUtc));
        Assert.Equal(actorUserId, demoRequest.CompletedByUserId);
        Assert.Equal(occurredAtUtc, demoRequest.CompletedAtUtc);

        Assert.False(
            demoRequest.Complete(
                Guid.NewGuid(),
                occurredAtUtc.AddMinutes(5)));
        Assert.Equal(actorUserId, demoRequest.CompletedByUserId);
        Assert.Equal(occurredAtUtc, demoRequest.CompletedAtUtc);
    }

    private static WebsiteSearchService CreateSearchService(string indexPath) =>
        new(
            null!,
            Options.Create(new WebsiteSearchOptions
            {
                SearchIndexLocation = indexPath
            }));

    private static void DeleteIndex(string indexPath)
    {
        if (Directory.Exists(indexPath))
        {
            Directory.Delete(indexPath, recursive: true);
        }
    }
}
