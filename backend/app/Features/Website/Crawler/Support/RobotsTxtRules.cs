namespace PhaenoPortal.App.Features.Website.Crawler.Support;

public sealed class RobotsTxtRules(
    HttpClient httpClient,
    string userAgent = "phaeno-crawler")
{
    private readonly HashSet<string> disallowedPaths =
        new(StringComparer.OrdinalIgnoreCase);
    private readonly List<Uri> sitemaps = [];

    public IReadOnlyList<Uri> Sitemaps => sitemaps;

    public async Task LoadAsync(
        Uri root,
        CancellationToken cancellationToken = default)
    {
        disallowedPaths.Clear();
        sitemaps.Clear();

        try
        {
            var content = await httpClient.GetStringAsync(
                new Uri(root, "/robots.txt"),
                cancellationToken);
            using var reader = new StringReader(content);
            var groupApplies = false;
            string? line;
            while ((line = reader.ReadLine()) is not null)
            {
                line = StripComments(line).Trim();
                if (line.Length == 0)
                {
                    continue;
                }

                var separator = line.IndexOf(':');
                if (separator <= 0)
                {
                    continue;
                }

                var key = line[..separator].Trim();
                var value = line[(separator + 1)..].Trim();
                if (key.Equals("Sitemap", StringComparison.OrdinalIgnoreCase))
                {
                    if (Uri.TryCreate(value, UriKind.Absolute, out var sitemap)
                        || Uri.TryCreate(root, value, out sitemap))
                    {
                        sitemaps.Add(sitemap);
                    }
                    continue;
                }

                if (key.Equals("User-agent", StringComparison.OrdinalIgnoreCase))
                {
                    groupApplies =
                        value == "*"
                        || userAgent.Contains(value, StringComparison.OrdinalIgnoreCase);
                    continue;
                }

                if (groupApplies
                    && key.Equals("Disallow", StringComparison.OrdinalIgnoreCase)
                    && !string.IsNullOrWhiteSpace(value))
                {
                    disallowedPaths.Add(
                        value.StartsWith('/') ? value : $"/{value}");
                }
            }
        }
        catch (HttpRequestException)
        {
            // robots.txt is optional. An unavailable file means allow all.
        }
    }

    public bool IsAllowed(string absolutePath)
    {
        if (string.IsNullOrWhiteSpace(absolutePath))
        {
            return true;
        }

        if (!absolutePath.StartsWith('/'))
        {
            absolutePath = $"/{absolutePath}";
        }

        return disallowedPaths.All(disallowed =>
            !absolutePath.StartsWith(disallowed, StringComparison.OrdinalIgnoreCase));
    }

    private static string StripComments(string line)
    {
        var commentIndex = line.IndexOf('#');
        return commentIndex >= 0 ? line[..commentIndex] : line;
    }
}
