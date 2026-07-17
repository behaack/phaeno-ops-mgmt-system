namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.Website.Crawler.Support;
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
}
