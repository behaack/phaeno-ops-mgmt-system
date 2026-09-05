namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Features.Accounts.Services;

public sealed class DataProvisioningNoticeDispatcher(
    IServiceScopeFactory scopeFactory,
    ILogger<DataProvisioningNoticeDispatcher> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                await DispatchBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Data-provisioning notice dispatch failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task DispatchBatchAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IDataProvisioningNoticeSender>();
        var now = DateTime.UtcNow;
        var notices = await dbContext.DataProvisioningNotices
            .Where(notice => notice.Status == DataProvisioningNoticeStatus.Pending
                || (notice.Status == DataProvisioningNoticeStatus.Failed
                    && notice.AttemptCount < 10
                    && notice.NextAttemptAt <= now))
            .OrderBy(notice => notice.CreatedAt)
            .Take(25)
            .ToListAsync(cancellationToken);

        foreach (var notice in notices)
            await DeliverAsync(dbContext, sender, notice, logger, cancellationToken);

        if (notices.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    internal static async Task DeliverAsync(PSeqOperationsDbContext dbContext,
        IDataProvisioningNoticeSender sender, DataProvisioningNotice notice, ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            Guid? departmentId = null;
            if (notice.OrganizationDatasetGrantId.HasValue)
            {
                // A revoked/superseded grant can still require a withdrawal notice.
                var grant = await dbContext.OrganizationDatasetGrants.AsNoTracking()
                    .Where(value => value.Id == notice.OrganizationDatasetGrantId.Value
                        && value.OrganizationId == notice.OrganizationId)
                    .Select(value => new { value.DepartmentId })
                    .SingleOrDefaultAsync(cancellationToken)
                    ?? throw new InvalidOperationException("The notice grant does not belong to its organization.");
                departmentId = grant.DepartmentId;
            }
            // Instructions about previously supplied copies must reach current org admins
            // even during suspension. This does not grant Portal or download access.
            var isGovernanceNotice = notice.IncidentId.HasValue
                && !notice.OrganizationDatasetGrantId.HasValue
                && notice.Kind is DataProvisioningNoticeKind.Quarantine
                    or DataProvisioningNoticeKind.QuarantineCleared
                    or DataProvisioningNoticeKind.Withdrawal
                    or DataProvisioningNoticeKind.AttestationReminder;
            if (isGovernanceNotice && !await dbContext.DataGovernanceAffectedOrganizations.AsNoTracking()
                .AnyAsync(value => value.IncidentId == notice.IncidentId
                    && value.OrganizationId == notice.OrganizationId, cancellationToken))
                throw new InvalidOperationException("The notice organization is not affected by its governance incident.");

            var recipients = await OrganizationNotificationRecipients.ReadAsync(dbContext,
                notice.OrganizationId, departmentId, recipientUserId: null,
                includeDepartmentRouting: false, cancellationToken,
                allowInactiveOrganization: isGovernanceNotice);
            if (recipients.Count == 0)
            {
                notice.Failed("No eligible recipients. Review current administrator assignments and the applicable organization or department status before retrying.",
                    DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, notice.AttemptCount + 1))));
                return;
            }
            foreach (var email in recipients)
                await sender.SendAsync(new DataProvisioningNoticeMessage(email, notice.Subject, notice.Body), cancellationToken);
            notice.Delivered(DateTime.UtcNow);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            notice.Failed("Notice delivery failed. Phaeno staff can review and retry it.",
                DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, notice.AttemptCount + 1))));
            logger.LogWarning(exception, "Notice {NoticeId} will be retried.", notice.Id);
        }
    }
}
