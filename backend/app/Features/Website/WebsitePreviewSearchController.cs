using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website.Search;

namespace PhaenoPortal.App.Features.Website;

[ApiController]
[AllowAnonymous]
[Route("api/v1/web-ops/team-preview")]
public sealed class WebsitePreviewSearchController(
    WebsitePreviewSearchService searchService,
    IOptions<WebsitePreviewSearchOptions> options) : ControllerBase
{
    internal const string ProxyApiKeyHeaderName = "X-Phaeno-Preview-Search-Key";

    [HttpGet("search-pages")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult Search(
        [FromQuery, MinLength(3), MaxLength(200)] string search)
    {
        var previewOptions = options.Value;
        if (!previewOptions.Enabled || !searchService.IsEnabled)
        {
            return NotFound();
        }

        var providedKey = Request.Headers[ProxyApiKeyHeaderName].ToString();
        if (!IsValidProxyApiKey(previewOptions.ProxyApiKey, providedKey))
        {
            return Unauthorized();
        }

        return Ok(searchService.Search(search));
    }

    internal static bool IsValidProxyApiKey(string expected, string provided)
    {
        if (string.IsNullOrWhiteSpace(expected)
            || string.IsNullOrWhiteSpace(provided))
        {
            return false;
        }

        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        var providedHash = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
        return CryptographicOperations.FixedTimeEquals(
            expectedHash,
            providedHash);
    }
}
