using System.Text.Json.Serialization;

namespace PhaenoPortal.App.Features.Website.Search;

public sealed class IndexedPage
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Url { get; set; } = string.Empty;

    public string PageTitle { get; set; } = string.Empty;

    public string PageDisplayTitle { get; set; } = string.Empty;

    public string Anchor { get; set; } = string.Empty;

    public string AnchorTitle { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string DocumentType { get; set; } = string.Empty;

    [JsonIgnore]
    public string SearchKeywords { get; set; } = string.Empty;

    public string Snippet { get; set; } = string.Empty;

    public float? Score { get; set; }

    public int? Count { get; set; }

    [JsonIgnore]
    public string Text { get; set; } = string.Empty;

    [JsonIgnore]
    public string SourceText { get; set; } = string.Empty;

    [JsonIgnore]
    public DateTime IndexedAt { get; set; } = DateTime.UtcNow;
}
