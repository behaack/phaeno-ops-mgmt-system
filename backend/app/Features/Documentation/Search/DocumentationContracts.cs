namespace PhaenoPortal.App.Features.Documentation.Search;

using PhaenoPortal.App.Common.Exceptions;

public sealed class DocumentationSearchOptions
{
    public bool Enabled { get; init; } = true;
    public string IndexPath { get; init; } = "__DOCUMENTATION_INDEX";
    public string ManifestPath { get; init; } = "Documentation/corpus.json";
}

public sealed record DocumentationSection(string Heading, string Anchor, string Text);
public sealed record DocumentationGuide(
    string Id, string Audience, string? Locale, string Slug, string Title, string Summary,
    string Route, string ContentType, string[] TopicIds, string[] WorkflowIds,
    string[] TaskKeywords, string[] Aliases, string[] RelatedGuideIds,
    string ReviewedAt, string PublicationStatus, string ContentHash, DocumentationSection[] Sections);
public sealed record DocumentationCorpus(
    int SchemaVersion, string CorpusHash,
    Dictionary<string, Dictionary<string, Dictionary<string, string>>> Taxonomy,
    DocumentationGuide[] Guides);
public sealed record DocumentationSearchRequest(
    string? Q = null, string Locale = "en-US", int Page = 1, int PageSize = 10,
    string? Topic = null, string? Workflow = null, string? ContentType = null, string? CorpusVersion = null);
public sealed record DocumentationMatch(string Text, bool Match);
public sealed record DocumentationFacet(string Id, string Label, int Count);
public sealed record DocumentationResult(
    string Id, string Slug, string Route, string Title, string Heading, string Anchor,
    DocumentationMatch[] Excerpt, string ContentType, string[] Topics, string[] Workflows,
    string ReviewedAt);
public sealed record DocumentationSearchMetadata(
    string CorpusHash, int Total, int Page, int PageSize,
    DocumentationFacet[] Topics, DocumentationFacet[] Workflows, DocumentationFacet[] ContentTypes);
public sealed record DocumentationSearchResponse(DocumentationResult[] Items, DocumentationSearchMetadata Metadata);
public sealed record DocumentationIndexStatus(
    bool Ready, bool Rebuilding, string? CorpusHash, string? Generation,
    DateTimeOffset? LastSuccessfulBuild, int GuideCount, int SectionCount, string? Failure,
    double? LastBuildDurationMs = null);

public interface IDocumentationSearchService
{
    DocumentationSearchResponse Search(string audience, DocumentationSearchRequest request);
    DocumentationIndexStatus Status { get; }
    Task RebuildAsync(CancellationToken cancellationToken, bool force = true);
}

public sealed class DocumentationSearchException(string code, string message, int status = 400) : DomainException(message)
{
    public override string ErrorCode => code;
    public override int StatusCode => status;
}
