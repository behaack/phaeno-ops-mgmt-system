using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Features.Website.Search;
using PhaenoPortal.App.Features.Website.Services;

namespace PhaenoPortal.App.Features.Website;

[ApiController]
[AllowAnonymous]
[EnableCors(WebsiteServiceCollectionExtensions.CorsPolicyName)]
[Route("api/v1/web-ops")]
public sealed class WebsiteController(
    WebsiteService websiteService,
    IWebsiteSearchService websiteSearchService) : ControllerBase
{
    [HttpGet("database-ping")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DatabasePing(CancellationToken cancellationToken)
    {
        await websiteService.PingDatabaseAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("search-pages")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult Search(
        [FromQuery, MinLength(3), MaxLength(200)] string search) =>
        Ok(websiteSearchService.Search(search));

    [HttpPost("contact")]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Contact(
        [FromBody] WebContactRequest request,
        CancellationToken cancellationToken)
    {
        await websiteService.CreateContactAsync(request, cancellationToken);
        return NoContent();
    }

    [HttpPost("order")]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Order(
        [FromBody] WebOrderRequest request,
        CancellationToken cancellationToken)
    {
        await websiteService.CreateOrderAsync(request, cancellationToken);
        return NoContent();
    }
}
