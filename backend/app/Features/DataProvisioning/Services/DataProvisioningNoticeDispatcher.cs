namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

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
            .Include(notice => notice.Organization)
                .ThenInclude(organization => organization.Memberships)
                .ThenInclude(membership => membership.User)
            .Where(notice => notice.Status == DataProvisioningNoticeStatus.Pending
                || (notice.Status == DataProvisioningNoticeStatus.Failed
                    && notice.AttemptCount < 10
                    && notice.NextAttemptAt <= now))
            .OrderBy(notice => notice.CreatedAt)
            .Take(25)
            .ToListAsync(cancellationToken);

        foreach (var notice in notices)
        {
            try
            {
                var recipients = notice.Organization.Memberships
                    .Where(membership => membership.IsActive
                        && membership.IsOrganizationAdmin
                        && membership.User is { IsActive: true })
                    .Select(membership => membership.User!.Email)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                foreach (var email in recipients)
                {
                    await sender.SendAsync(
                        new DataProvisioningNoticeMessage(
                            email,
                            notice.Subject,
                            notice.Body),
                        cancellationToken);
                }

                notice.Delivered(DateTime.UtcNow);
            }
            catch (Exception exception)
            {
                notice.Failed(
                    exception.Message,
                    DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, notice.AttemptCount + 1))));
                logger.LogWarning(
                    exception,
                    "Notice {NoticeId} will be retried.",
                    notice.Id);
            }
        }

        if (notices.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
