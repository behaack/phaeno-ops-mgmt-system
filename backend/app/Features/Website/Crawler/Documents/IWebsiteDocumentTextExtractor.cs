namespace PhaenoPortal.App.Features.Website.Crawler.Documents;

public interface IWebsiteDocumentTextExtractor
{
    Task<WebsiteDocumentText> ExtractAsync(
        Stream document,
        int maxCharacters,
        CancellationToken cancellationToken = default);
}

public sealed record WebsiteDocumentText(string Text, int PageCount);

public sealed class WebsiteDocumentTextExtractionException(
    string reason,
    string message,
    Exception? innerException = null) : Exception(message, innerException)
{
    public string Reason { get; } = reason;
}
