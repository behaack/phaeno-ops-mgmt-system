using Microsoft.Extensions.Options;

namespace PhaenoPortal.App.Features.Website.Search;

public sealed class WebsitePreviewSearchService : IWebsiteSearchService, IDisposable
{
    private readonly WebsiteSearchService? inner;

    public WebsitePreviewSearchService(
        IWebHostEnvironment hostEnvironment,
        IOptions<WebsiteSearchOptions> productionOptions,
        IOptions<WebsitePreviewSearchOptions> previewOptions)
    {
        var preview = previewOptions.Value;
        if (!preview.Enabled)
        {
            return;
        }

        var productionPath = WebsiteSearchService.ResolveIndexPath(
            hostEnvironment,
            productionOptions.Value.SearchIndexLocation);
        var previewPath = WebsiteSearchService.ResolveIndexPath(
            hostEnvironment,
            preview.SearchIndexLocation,
            "WebsitePreviewSearch:SearchIndexLocation");
        if (string.Equals(
            productionPath,
            previewPath,
            OperatingSystem.IsWindows()
                ? StringComparison.OrdinalIgnoreCase
                : StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "WebsitePreviewSearch:SearchIndexLocation must be different from the production Website search index.");
        }

        inner = new WebsiteSearchService(previewPath);
    }

    public bool IsEnabled => inner is not null;

    public void RebuildIndex(IEnumerable<IndexedPage> pages) =>
        GetEnabledService().RebuildIndex(pages);

    public IReadOnlyList<IndexedPage> Search(string queryText) =>
        GetEnabledService().Search(queryText);

    public void Dispose() => inner?.Dispose();

    private WebsiteSearchService GetEnabledService() =>
        inner ?? throw new InvalidOperationException(
            "Website preview search is not enabled.");
}
