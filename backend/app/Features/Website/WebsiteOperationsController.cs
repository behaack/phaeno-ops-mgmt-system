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

    [HttpGet("dashboard")]
    public async Task<WebOpsDashboardDto> GetDashboard(
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

        var mailingListCount = await dbContext.WebContacts
            .AsNoTracking()
            .CountAsync(cancellationToken);
        var demoRequestCount = await dbContext.WebOrders
            .AsNoTracking()
            .CountAsync(cancellationToken);
        var mailingListContacts = await dbContext.WebContacts
            .AsNoTracking()
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
}
