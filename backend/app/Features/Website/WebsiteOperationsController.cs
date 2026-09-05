namespace PhaenoPortal.App.Features.Website;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Features.Website.Notifications;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/web-ops")]
public sealed class WebsiteOperationsController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext,
    WebsiteNotificationRecoveryService notificationRecovery,
    WebsiteNotificationProcessingService notificationProcessing) : ControllerBase
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
                contact.CreatedAtUtc, dbContext.Set<WebNotificationDelivery>().Any(delivery => delivery.WebContactId == contact.Id && delivery.Kind == WebNotificationKind.TechnicalBrief)))
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
                contact.CreatedAtUtc, dbContext.Set<WebNotificationDelivery>().Any(delivery => delivery.WebContactId == contact.Id && delivery.Kind == WebNotificationKind.TechnicalBrief)))
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
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        var contact = await dbContext.WebContacts
            .SingleOrDefaultAsync(contact => contact.Id == id, cancellationToken)
            ?? throw new WebsiteOperationsRecordNotFoundException(
                "mailing-list signup");

        if (contact.Unsubscribe(actorUserId, DateTimeOffset.UtcNow))
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await dbContext.Set<WebNotificationDelivery>()
            .Where(item => item.WebContactId == id && (item.State == WebNotificationState.Pending || item.State == WebNotificationState.Failed))
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.State, WebNotificationState.Cancelled)
                .SetProperty(item => item.LastError, (string?)null).SetProperty(item => item.Version, Guid.NewGuid()), cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("demo-requests/{id:guid}/complete")]
    public async Task<IActionResult> CompleteDemoRequest(
        Guid id,
        CancellationToken cancellationToken)
    {
        var actorUserId = await RequirePlatformAdministratorAsync(
            cancellationToken);
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        var demoRequest = await dbContext.WebOrders
            .SingleOrDefaultAsync(order => order.Id == id, cancellationToken)
            ?? throw new WebsiteOperationsRecordNotFoundException(
                "demo request");

        if (demoRequest.Complete(actorUserId, DateTimeOffset.UtcNow))
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await dbContext.Set<WebNotificationDelivery>()
            .Where(item => item.WebOrderId == id && (item.State == WebNotificationState.Pending || item.State == WebNotificationState.Failed))
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.State, WebNotificationState.Cancelled)
                .SetProperty(item => item.LastError, (string?)null).SetProperty(item => item.Version, Guid.NewGuid()), cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("notifications")]
    public async Task<WebOpsPageDto<WebOpsNotificationDto>> GetNotifications(
        [FromQuery] int page = 1, CancellationToken cancellationToken = default, [FromQuery] bool attentionOnly = false)
    {
        await RequirePlatformAdministratorAsync(cancellationToken);
        var query = dbContext.Set<WebNotificationDelivery>().AsNoTracking();
        var now = DateTimeOffset.UtcNow;
        if (attentionOnly) query = query.Where(item => item.State == WebNotificationState.Failed
            || (item.State == WebNotificationState.Processing && item.LeaseExpiresAtUtc <= now));
        var count = await query.CountAsync(cancellationToken);
        page = NormalizePage(page, count);
        var rows = await query.OrderBy(item => item.State == WebNotificationState.Failed ? 0 : item.State == WebNotificationState.Pending ? 1 : item.State == WebNotificationState.Processing ? 2 : 3)
            .ThenByDescending(item => item.CreatedAtUtc).ThenBy(item => item.Id)
            .Skip((page - 1) * PageSize).Take(PageSize).ToListAsync(cancellationToken);
        var contactIds = rows.Where(item => item.WebContactId.HasValue).Select(item => item.WebContactId!.Value).ToArray();
        var orderIds = rows.Where(item => item.WebOrderId.HasValue).Select(item => item.WebOrderId!.Value).ToArray();
        var contacts = await dbContext.WebContacts.AsNoTracking().Where(item => contactIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, cancellationToken);
        var orders = await dbContext.WebOrders.AsNoTracking().Where(item => orderIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, cancellationToken);
        var items = rows.Select(item =>
        {
            var contact = item.WebContactId.HasValue ? contacts.GetValueOrDefault(item.WebContactId.Value) : null;
            var order = item.WebOrderId.HasValue ? orders.GetValueOrDefault(item.WebOrderId.Value) : null;
            var active = contact is not null ? contact.UnsubscribedAtUtc is null && (item.Kind != WebNotificationKind.TechnicalBrief || contact.SendBrochure == true) : order is not null && order.CompletedAtUtc is null;
            return new WebOpsNotificationDto(item.Id, item.Kind.ToString(), item.State.ToString(), contact?.OrganizationName ?? order?.OrganizationName ?? "Retired intake",
                contact?.Id ?? order!.Id, $"{contact?.FirstName ?? order?.FirstName} {contact?.LastName ?? order?.LastName}".Trim(), item.Kind == WebNotificationKind.TechnicalBrief ? contact?.Email : null,
                item.AttemptCount, item.CreatedAtUtc, item.LastAttemptAtUtc, item.AcceptedAtUtc,
                item.State == WebNotificationState.Pending ? item.NextAttemptAtUtc : null, item.LastError, item.Version,
                active && (item.State is WebNotificationState.Accepted or WebNotificationState.Failed) && item.LastAttemptAtUtc <= now.AddMinutes(-5)
                    && (item.LastRecoveryAtUtc is null || item.LastRecoveryAtUtc <= now.AddMinutes(-5)),
                item.State == WebNotificationState.Processing && item.LeaseExpiresAtUtc <= now);
        }).ToArray();
        return new(items, page, PageSize, count);
    }

    [HttpGet("notifications/summary")]
    public async Task<WebOpsNotificationSummaryDto> GetNotificationSummary(CancellationToken cancellationToken = default)
    {
        await RequirePlatformAdministratorAsync(cancellationToken);
        return await notificationProcessing.ReadSummaryAsync(cancellationToken);
    }

    [HttpPost("notifications/processing")]
    public async Task<IActionResult> ChangeNotificationProcessing(WebOpsNotificationProcessingRequest request, CancellationToken cancellationToken = default)
    {
        var actor = await RequirePlatformAdministratorAsync(cancellationToken);
        await notificationProcessing.ChangeAsync(request, actor, cancellationToken);
        return NoContent();
    }

    [HttpGet("notifications/{id:guid}/attempts")]
    public async Task<IReadOnlyList<WebOpsNotificationAttemptDto>> GetNotificationAttempts(Guid id, CancellationToken cancellationToken)
    {
        await RequirePlatformAdministratorAsync(cancellationToken);
        if (!await dbContext.Set<WebNotificationDelivery>().AnyAsync(item => item.Id == id, cancellationToken))
            throw new WebsiteOperationsRecordNotFoundException("notification");
        return await dbContext.Set<WebNotificationAttempt>().AsNoTracking().Where(item => item.WebNotificationDeliveryId == id)
            .OrderByDescending(item => item.AttemptNumber).Take(50)
            .Select(item => new WebOpsNotificationAttemptDto(item.AttemptNumber, item.StartedAtUtc, item.FinishedAtUtc, item.Outcome, item.Error, item.RecoveryByUserId.HasValue))
            .ToListAsync(cancellationToken);
    }

    [HttpPost("notifications/{id:guid}/resend")]
    public async Task<IActionResult> ResendNotification(Guid id, WebOpsNotificationRecoveryRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdministratorAsync(cancellationToken);
        await notificationRecovery.QueueRecoveryAsync(id, request.Version, actor, cancellationToken);
        return NoContent();
    }

    [HttpPost("mailing-list/{id:guid}/technical-brief")]
    public async Task<IActionResult> RecoverLegacyTechnicalBrief(Guid id, CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdministratorAsync(cancellationToken);
        await notificationRecovery.QueueLegacyBriefAsync(id, actor, cancellationToken);
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
