namespace PhaenoPortal.App.Features.Website.Search;

public interface IWebsiteSearchService
{
    void RebuildIndex(IEnumerable<IndexedPage> pages);

    IReadOnlyList<IndexedPage> Search(string queryText);
}
