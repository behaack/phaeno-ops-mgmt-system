using System.Xml.Linq;

namespace PhaenoPortal.App.Features.Website.Crawler.Support;

public static class SitemapParser
{
    public sealed record SitemapParseResult(
        List<Uri> Urls,
        List<Uri> ChildSitemaps);

    public static SitemapParseResult Parse(string xml, Uri root)
    {
        var document = XDocument.Parse(xml, LoadOptions.None);
        XNamespace namespaceName =
            document.Root?.Name.Namespace
            ?? "http://www.sitemaps.org/schemas/sitemap/0.9";
        var urls = new List<Uri>();
        var childSitemaps = new List<Uri>();

        if (string.Equals(
            document.Root?.Name.LocalName,
            "sitemapindex",
            StringComparison.OrdinalIgnoreCase))
        {
            AddLocations(
                document.Descendants(namespaceName + "sitemap")
                    .Elements(namespaceName + "loc"),
                root,
                childSitemaps);
        }
        else if (string.Equals(
            document.Root?.Name.LocalName,
            "urlset",
            StringComparison.OrdinalIgnoreCase))
        {
            AddLocations(
                document.Descendants(namespaceName + "url")
                    .Elements(namespaceName + "loc"),
                root,
                urls);
        }

        return new SitemapParseResult(urls, childSitemaps);
    }

    private static void AddLocations(
        IEnumerable<XElement> locations,
        Uri root,
        ICollection<Uri> results)
    {
        foreach (var location in locations)
        {
            var value = location.Value.Trim();
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            if (Uri.TryCreate(value, UriKind.Absolute, out var absolute))
            {
                results.Add(absolute);
            }
            else if (Uri.TryCreate(root, value, out var relative))
            {
                results.Add(relative);
            }
        }
    }
}
