namespace PhaenoPortal.App.Features.Website;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/web-ops")]
public sealed class WebsiteOperationsController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    private const int DashboardItemLimit = 5;
    private const int PageSize = 10;

    [HttpGet("dashboard")]
    public async Task<WebOpsDashboardDto> GetDashboard(
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdministratorAsync(cancellationToken);

        var mailingListCount = await dbContext.WebContacts
            .AsNoTracking()
            .Where(contact => contact.UnsubscribedAtUtc == null)
            .CountAsync(cancellationToken);
        var demoRequestCount = await dbContext.WebOrders
            .AsNoTracking()
            .Where(order => order.CompletedAtUtc == null)
            .CountAsync(cancellationToken);
        var mailingListContacts = await dbContext.WebContacts
            .AsNoTracking()
            .Where(contact => contact.UnsubscribedAtUtc == null)
            .OrderByDescending(contact => contact.CreatedAtUtc)
            .Take(DashboardItemLimit)
            .Select(contact => new WebOpsMailingListContactDto(
                contact.Id,
                contact.FirstName,
                contact.LastName,
                contact.OrganizationName,
                contact.Email,
                contact.SendBrochure == true,
                contact.CreatedAtUtc))
            .ToListAsync(cancellationToken);
        var demoRequests = await dbContext.WebOrders
            .AsNoTracking()
            .Where(order => order.CompletedAtUtc == null)
            .OrderBy(order => order.OrganizationName)
            .ThenBy(order => order.LastName)
            .ThenBy(order => order.FirstName)
            .Take(DashboardItemLimit)
            .Select(order => new WebOpsDemoRequestDto(
                order.Id,
                order.FirstName,
                order.LastName,
                order.OrganizationName,
                order.Email,
                order.Description))
            .ToListAsync(cancellationToken);

        return new WebOpsDashboardDto(
            mailingListCount,
            demoRequestCount,
            mailingListContacts,
            demoRequests);
    }

    [HttpGet("mailing-list")]
    public async Task<WebOpsPageDto<WebOpsMailingListContactDto>> GetMailingList(
        [FromQuery] int page = 1,
        CancellationToken cancellationToken = default)
    {
        await RequirePlatformAdministratorAsync(cancellationToken);

        var query = dbContext.WebContacts
            .AsNoTracking()
            .Where(contact => contact.UnsubscribedAtUtc == null);
        var totalCount = await query.CountAsync(cancellationToken);
        page = NormalizePage(page, totalCount);
        var items = await query
            .OrderByDescending(contact => contact.CreatedAtUtc)
            .ThenByDescending(contact => contact.Id)
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .Select(contact => new WebOpsMailingListContactDto(
                contact.Id,
                contact.FirstName,
                contact.LastName,
                contact.OrganizationName,
                contact.Email,
                contact.SendBrochure == true,
                contact.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new WebOpsPageDto<WebOpsMailingListContactDto>(
            items,
            page,
            PageSize,
            totalCount);
    }

    [HttpGet("demo-requests")]
    public async Task<WebOpsPageDto<WebOpsDemoRequestDto>> GetDemoRequests(
        [FromQuery] int page = 1,
        CancellationToken cancellationToken = default)
    {
        await RequirePlatformAdministratorAsync(cancellationToken);

        var query = dbContext.WebOrders
            .AsNoTracking()
            .Where(order => order.CompletedAtUtc == null);
        var totalCount = await query.CountAsync(cancellationToken);
        page = NormalizePage(page, totalCount);
        var items = await query
            .OrderBy(order => order.OrganizationName)
            .ThenBy(order => order.LastName)
            .ThenBy(order => order.FirstName)
            .ThenBy(order => order.Email)
            .ThenBy(order => order.Id)
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .Select(order => new WebOpsDemoRequestDto(
                order.Id,
                order.FirstName,
                order.LastName,
                order.OrganizationName,
                order.Email,
                order.Description))
            .ToListAsync(cancellationToken);

        return new WebOpsPageDto<WebOpsDemoRequestDto>(
            items,
            page,
            PageSize,
            totalCount);
    }

    [HttpPost("mailing-list/{id:guid}/unsubscribe")]
    public async Task<IActionResult> UnsubscribeMailingListContact(
        Guid id,
        CancellationToken cancellationToken)
    {
        var actorUserId = await RequirePlatformAdministratorAsync(
            cancellationToken);
        var contact = await dbContext.WebContacts
            .SingleOrDefaultAsync(contact => contact.Id == id, cancellationToken)
            ?? throw new WebsiteOperationsRecordNotFoundException(
                "mailing-list signup");

        if (contact.Unsubscribe(actorUserId, DateTimeOffset.UtcNow))
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return NoContent();
    }

    [HttpPost("demo-requests/{id:guid}/complete")]
    public async Task<IActionResult> CompleteDemoRequest(
        Guid id,
        CancellationToken cancellationToken)
    {
        var actorUserId = await RequirePlatformAdministratorAsync(
            cancellationToken);
        var demoRequest = await dbContext.WebOrders
            .SingleOrDefaultAsync(order => order.Id == id, cancellationToken)
            ?? throw new WebsiteOperationsRecordNotFoundException(
                "demo request");

        if (demoRequest.Complete(actorUserId, DateTimeOffset.UtcNow))
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return NoContent();
    }

    private static int NormalizePage(int page, int totalCount)
    {
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)PageSize));
        return Math.Clamp(page, 1, totalPages);
    }

    private async Task<Guid> RequirePlatformAdministratorAsync(
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            HttpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken)
            ?? throw new WebsiteOperationsAccessException(
                "An active POMS user is required.",
                StatusCodes.Status401Unauthorized,
                "active_actor_required");

        if (!AccountAuthorization.IsPlatformAdmin(actor))
        {
            throw new WebsiteOperationsAccessException(
                "Phaeno Web Operations access is required.",
                StatusCodes.Status403Forbidden,
                "web_ops_access_required");
        }

        return actor.Id;
    }
}
