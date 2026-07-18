namespace PhaenoPortal.Test;

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
