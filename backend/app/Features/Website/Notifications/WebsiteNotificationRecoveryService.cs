using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Infrastructure.Persistence;

namespace PhaenoPortal.App.Features.Website.Notifications;

public sealed class WebsiteNotificationRecoveryService(PSeqOperationsDbContext dbContext)
{
    public async Task QueueRecoveryAsync(Guid id, Guid version, Guid actorUserId, CancellationToken cancellationToken)
    {
        var delivery = await dbContext.Set<WebNotificationDelivery>().AsNoTracking().SingleOrDefaultAsync(item => item.Id == id, cancellationToken)
            ?? throw new WebsiteOperationsRecordNotFoundException("notification");
        var now = DateTimeOffset.UtcNow;
        if (delivery.Version != version)
            throw new WebsiteNotificationConflictException("This notification changed. Refresh email delivery and review its current status.");
        if (delivery.State is not (WebNotificationState.Accepted or WebNotificationState.Failed)
            || delivery.LastAttemptAtUtc > now.AddMinutes(-5) || delivery.LastRecoveryAtUtc > now.AddMinutes(-5))
            throw new WebsiteNotificationConflictException("Only failed or previously accepted messages can be resent. Wait five minutes after the previous attempt, then refresh.");
        await RequireActiveTargetAsync(delivery, cancellationToken);
        await using var transaction = dbContext.Database.CurrentTransaction is null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        var updated = await dbContext.Set<WebNotificationDelivery>()
            .Where(item => item.Id == id && item.Version == version)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.State, WebNotificationState.Pending)
                .SetProperty(item => item.NextAttemptAtUtc, now)
                .SetProperty(item => item.AttemptsSinceRecovery, 0)
                .SetProperty(item => item.LastRecoveryByUserId, actorUserId)
                .SetProperty(item => item.LastRecoveryAtUtc, now)
                .SetProperty(item => item.LastError, (string?)null)
                .SetProperty(item => item.Version, Guid.NewGuid()), cancellationToken);
        if (updated == 0)
            throw new WebsiteNotificationConflictException("This notification changed. Refresh email delivery and review its current status.");
        RecordRecovery(delivery, actorUserId, now, "ResendQueued");
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
    }

    public async Task QueueLegacyBriefAsync(Guid contactId, Guid actorUserId, CancellationToken cancellationToken)
    {
        var delivery = new WebNotificationDelivery
        {
            WebContactId = contactId,
            Kind = WebNotificationKind.TechnicalBrief,
            LastRecoveryByUserId = actorUserId,
            LastRecoveryAtUtc = DateTimeOffset.UtcNow
        };
        await RequireActiveTargetAsync(delivery, cancellationToken);
        if (await dbContext.Set<WebNotificationDelivery>().AnyAsync(item => item.WebContactId == contactId && item.Kind == delivery.Kind, cancellationToken))
            throw new WebsiteNotificationConflictException("This technical brief already has a delivery record. Review its status in Email delivery before resending.");
        dbContext.Add(delivery);
        RecordRecovery(delivery, actorUserId, delivery.LastRecoveryAtUtc!.Value, "LegacyBriefQueued");
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (exception.InnerException is Npgsql.PostgresException { SqlState: Npgsql.PostgresErrorCodes.UniqueViolation })
        {
            throw new WebsiteNotificationConflictException("This technical brief was already queued. Refresh Email delivery to review it.");
        }
    }

    private void RecordRecovery(WebNotificationDelivery delivery, Guid actorUserId, DateTimeOffset occurredAt, string operation) =>
        dbContext.AuditEvents.Add(new AuditEvent(
            entityName: nameof(WebNotificationDelivery), entityId: delivery.Id.ToString(), operation: operation,
            organizationId: null, actorUserId: actorUserId, requestId: null, occurredAt: occurredAt.UtcDateTime,
            changesJson: JsonSerializer.Serialize(new { delivery.Kind, delivery.WebContactId, delivery.WebOrderId, PreviousState = delivery.State, RequestedState = WebNotificationState.Pending })));

    private async Task RequireActiveTargetAsync(WebNotificationDelivery delivery, CancellationToken cancellationToken)
    {
        if (delivery.WebContactId.HasValue)
        {
            var contact = await dbContext.WebContacts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == delivery.WebContactId, cancellationToken)
                ?? throw new WebsiteOperationsRecordNotFoundException("mailing-list signup");
            if (contact.UnsubscribedAtUtc.HasValue || (delivery.Kind == WebNotificationKind.TechnicalBrief && contact.SendBrochure != true))
                throw new WebsiteNotificationConflictException("This signup is unsubscribed or did not request a technical brief. Email was not queued.");
        }
        else if (!await dbContext.WebOrders.AnyAsync(item => item.Id == delivery.WebOrderId && item.CompletedAtUtc == null, cancellationToken))
            throw new WebsiteNotificationConflictException("This demo request is no longer active. Email was not queued.");
    }
}
