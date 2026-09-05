namespace PhaenoPortal.App.Features.Documentation.Search;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/documentation/search")]
public sealed class DocumentationSearchController(IDocumentationAccess access, IDocumentationSearchService search) : ControllerBase
{
    [HttpGet]
    public async Task<DocumentationSearchResponse> Search([FromQuery] DocumentationSearchRequest request, CancellationToken cancellationToken)
    {
        var audience = await access.RequireAudienceAsync(HttpContext, cancellationToken);
        if (Request.Query.Keys.Any(key => !new[] { "q", "locale", "page", "pageSize", "topic", "workflow", "contentType", "corpusVersion" }.Contains(key, StringComparer.OrdinalIgnoreCase)))
            throw new DocumentationSearchException("documentation_query_invalid", "The documentation search request contains an unsupported field.");
        return search.Search(audience, request);
    }
}

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/platform/documentation-search")]
public sealed class DocumentationSearchOperationsController(IDocumentationAccess access, IDocumentationSearchService search,
    ILogger<DocumentationSearchOperationsController> logger) : ControllerBase
{
    [HttpGet("status")]
    public async Task<DocumentationIndexStatus> Status(CancellationToken cancellationToken)
    {
        await access.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return search.Status;
    }

    [HttpPost("rebuild")]
    public async Task<DocumentationIndexStatus> Rebuild(CancellationToken cancellationToken)
    {
        var actorId = await access.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        logger.LogInformation("Documentation index rebuild requested by internal user {ActorId}. Request {RequestId}.", actorId, HttpContext.TraceIdentifier);
        await search.RebuildAsync(cancellationToken);
        logger.LogInformation("Documentation index rebuild completed for internal user {ActorId}. Corpus {CorpusHash}.", actorId, search.Status.CorpusHash);
        return search.Status;
    }
}
