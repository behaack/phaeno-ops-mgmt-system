using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Infrastructure.Persistence;

namespace PhaenoPortal.App.Features.Website.Notifications;

public sealed class WebsiteNotificationDispatcher(
    PSeqOperationsDbContext dbContext,
    IWebsiteNotificationSender sender,
    ILogger<WebsiteNotificationDispatcher> logger)
{
    public const int MaximumAttempts = 5;

    public async Task<bool> ProcessNextAsync(CancellationToken cancellationToken = default, Guid? deliveryId = null)
    {
        var now = DateTimeOffset.UtcNow;
        var delivery = await dbContext.Set<WebNotificationDelivery>().AsNoTracking()
            .Where(item => !deliveryId.HasValue || item.Id == deliveryId.Value)
            .Where(item => (item.State == WebNotificationState.Pending && item.NextAttemptAtUtc <= now)
                || (item.State == WebNotificationState.Processing && item.LeaseExpiresAtUtc <= now))
            .OrderBy(item => item.NextAttemptAtUtc).FirstOrDefaultAsync(cancellationToken);
        if (delivery is null) return false;

        if (delivery.State == WebNotificationState.Processing && delivery.AttemptsSinceRecovery >= MaximumAttempts)
        {
            await using var transaction = dbContext.Database.CurrentTransaction is null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
            if ((await WebsiteNotificationProcessingService.LockAsync(dbContext, cancellationToken)).IsPaused) return false;
            var targetIsActive = await LockTargetAndReadActivityAsync(delivery, cancellationToken);
            var changed = await dbContext.Set<WebNotificationDelivery>().Where(item => item.Id == delivery.Id && item.Version == delivery.Version)
                .ExecuteUpdateAsync(update => update.SetProperty(item => item.State, targetIsActive ? WebNotificationState.Failed : WebNotificationState.Cancelled)
                    .SetProperty(item => item.LeaseToken, (Guid?)null).SetProperty(item => item.LeaseExpiresAtUtc, (DateTimeOffset?)null)
                    .SetProperty(item => item.LastError, targetIsActive ? "The last attempt was interrupted. Provider acceptance is unconfirmed; review before resending." : null)
                    .SetProperty(item => item.Version, Guid.NewGuid()), cancellationToken);
            if (changed == 1)
                await dbContext.Set<WebNotificationAttempt>().Where(item => item.Id == delivery.LeaseToken && item.FinishedAtUtc == null)
                    .ExecuteUpdateAsync(update => update.SetProperty(item => item.FinishedAtUtc, now)
                        .SetProperty(item => item.Outcome, "Interrupted")
                        .SetProperty(item => item.Error, "Provider acceptance is unconfirmed; review before resending."), cancellationToken);
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
            return true;
        }

        var leaseToken = Guid.NewGuid();
        var attempt = new WebNotificationAttempt
        {
            Id = leaseToken,
            WebNotificationDeliveryId = delivery.Id,
            AttemptNumber = delivery.AttemptCount + 1,
            StartedAtUtc = now,
            RecoveryByUserId = delivery.AttemptsSinceRecovery == 0 ? delivery.LastRecoveryByUserId : null
        };
        await using (var transaction = dbContext.Database.CurrentTransaction is null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null)
        {
            // The pause acknowledgement and new claims serialize on this row. The lock
            // is released at claim commit, before any provider request begins.
            if ((await WebsiteNotificationProcessingService.LockAsync(dbContext, cancellationToken)).IsPaused) return false;
            var claimed = await dbContext.Set<WebNotificationDelivery>()
                .Where(item => item.Id == delivery.Id && item.Version == delivery.Version)
                .ExecuteUpdateAsync(update => update
                    .SetProperty(item => item.State, WebNotificationState.Processing)
                    .SetProperty(item => item.LeaseToken, leaseToken)
                    .SetProperty(item => item.LeaseExpiresAtUtc, now.AddMinutes(5))
                    .SetProperty(item => item.LastAttemptAtUtc, now)
                    .SetProperty(item => item.AttemptCount, item => item.AttemptCount + 1)
                    .SetProperty(item => item.AttemptsSinceRecovery, item => item.AttemptsSinceRecovery + 1)
                    .SetProperty(item => item.Version, leaseToken), cancellationToken);
            if (claimed == 0) return true;
            if (delivery.LeaseToken.HasValue)
                await dbContext.Set<WebNotificationAttempt>().Where(item => item.Id == delivery.LeaseToken && item.FinishedAtUtc == null)
                    .ExecuteUpdateAsync(update => update.SetProperty(item => item.FinishedAtUtc, now)
                        .SetProperty(item => item.Outcome, "Interrupted")
                        .SetProperty(item => item.Error, "The previous attempt did not record a provider response; email may have been accepted."), cancellationToken);
            dbContext.Add(attempt);
            await dbContext.SaveChangesAsync(cancellationToken);
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        }

        var state = WebNotificationState.Accepted;
        string? failure = null;
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(45));
            var contact = delivery.WebContactId.HasValue
                ? await dbContext.WebContacts.AsNoTracking().SingleOrDefaultAsync(item => item.Id == delivery.WebContactId, timeout.Token) : null;
            var order = delivery.WebOrderId.HasValue
                ? await dbContext.WebOrders.AsNoTracking().SingleOrDefaultAsync(item => item.Id == delivery.WebOrderId, timeout.Token) : null;
            if ((contact is null && order is null) || contact?.UnsubscribedAtUtc is not null || order?.CompletedAtUtc is not null)
                state = WebNotificationState.Cancelled;
            else if (sender is LoggingWebsiteNotificationSender)
                throw new InvalidOperationException("Website email delivery is not configured.");
            else
                await (delivery.Kind switch
                {
                    WebNotificationKind.MailingListAlert when contact is not null => sender.SendContactAsync(contact, timeout.Token),
                    WebNotificationKind.TechnicalBrief when contact?.SendBrochure == true => sender.SendTechnicalBriefAsync(contact, timeout.Token),
                    WebNotificationKind.DemoRequestAlert when order is not null => sender.SendOrderAsync(order, timeout.Token),
                    _ => throw new InvalidOperationException("The saved notification no longer matches its intake record.")
                });
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // The persisted lease makes interrupted work recoverable on the next process.
            throw;
        }
        catch (Exception exception)
        {
            failure = sender is LoggingWebsiteNotificationSender
                ? "Email delivery is not configured. Contact an administrator."
                : exception is OperationCanceledException
                    ? "The email provider timed out. Acceptance is unconfirmed."
                    : "The email provider did not confirm acceptance. Review email configuration or retry.";
            state = delivery.AttemptsSinceRecovery + 1 >= MaximumAttempts ? WebNotificationState.Failed : WebNotificationState.Pending;
            logger.LogWarning(exception, "Website notification {DeliveryId} attempt {AttemptNumber} failed.", delivery.Id, attempt.AttemptNumber);
        }

        now = DateTimeOffset.UtcNow;
        var nextAttempt = now.AddMinutes(Math.Pow(2, Math.Min(delivery.AttemptsSinceRecovery, 6)));
        await using (var transaction = dbContext.Database.CurrentTransaction is null ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null)
        {
            // Retiring intake and finalizing a failed in-flight send share the intake
            // row lock. Either order leaves retired work cancelled, never stranded Failed.
            if ((state is WebNotificationState.Pending or WebNotificationState.Failed)
                && !await LockTargetAndReadActivityAsync(delivery, cancellationToken))
                state = WebNotificationState.Cancelled;
            var updated = await dbContext.Set<WebNotificationDelivery>()
                .Where(item => item.Id == delivery.Id && item.LeaseToken == leaseToken)
                .ExecuteUpdateAsync(update => update
                    .SetProperty(item => item.State, state)
                    .SetProperty(item => item.LeaseToken, (Guid?)null)
                    .SetProperty(item => item.LeaseExpiresAtUtc, (DateTimeOffset?)null)
                    .SetProperty(item => item.AcceptedAtUtc, state == WebNotificationState.Accepted ? now : delivery.AcceptedAtUtc)
                    .SetProperty(item => item.LastError, state == WebNotificationState.Cancelled ? null : failure)
                    .SetProperty(item => item.NextAttemptAtUtc, nextAttempt)
                    .SetProperty(item => item.Version, Guid.NewGuid()), cancellationToken);
            if (updated == 1)
            {
                attempt.FinishedAtUtc = now;
                attempt.Outcome = failure is null ? state.ToString() : "Failed";
                attempt.Error = failure;
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        }
        return true;
    }

    private async Task<bool> LockTargetAndReadActivityAsync(WebNotificationDelivery delivery, CancellationToken cancellationToken)
    {
        var type = delivery.WebContactId.HasValue ? typeof(WebContact) : typeof(WebOrder);
        var entity = dbContext.Model.FindEntityType(type)!;
        var schema = entity.GetSchema()!.Replace("\"", "\"\"");
        var table = entity.GetTableName()!.Replace("\"", "\"\"");
        var sql = $"SELECT * FROM \"{schema}\".\"{table}\" WHERE id = {{0}} FOR UPDATE";
        if (delivery.WebContactId.HasValue)
        {
            var contact = await dbContext.WebContacts.FromSqlRaw(sql, delivery.WebContactId.Value).AsNoTracking().SingleOrDefaultAsync(cancellationToken);
            return contact is not null && contact.UnsubscribedAtUtc is null;
        }
        var order = await dbContext.WebOrders.FromSqlRaw(sql, delivery.WebOrderId!.Value).AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        return order is not null && order.CompletedAtUtc is null;
    }
}
