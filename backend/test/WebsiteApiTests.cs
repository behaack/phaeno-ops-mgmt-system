namespace PhaenoPortal.Test;

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
}
