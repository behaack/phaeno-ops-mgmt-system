namespace PhaenoPortal.App.Features.Trials.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class TrialCrmProjection(PSeqOperationsDbContext db)
{
    public async Task<int> PublishAsync(Guid? trialId, CancellationToken token)
    {
        var pending = await (from item in db.TrialEvents.AsNoTracking()
            join trial in db.TrialProjects on item.TrialProjectId equals trial.Id
            where (!trialId.HasValue || trial.Id == trialId) && !db.CrmActivities.Any(activity => activity.Id == item.Id)
            orderby item.OccurredAtUtc, item.Id
            select new { item, trial.Number, trial.CompanyId, trial.OpportunityId }).Take(100).ToListAsync(token);
        foreach (var value in pending)
        {
            // The durable Trial event is the outbox record. Its identifier is the CRM
            // receipt key, so retries do not duplicate a relationship-safe milestone.
            var activity = new CrmActivity(CrmActivityType.PortalEvent, $"{value.Number}: {value.item.Kind}",
                $"{value.item.Summary} /trial-projects/{value.item.TrialProjectId}", value.item.OccurredAtUtc,
                CrmActivityVisibility.Internal, value.item.ActorUserId, companyId: value.CompanyId, opportunityId: value.OpportunityId);
            db.CrmActivities.Add(activity); db.Entry(activity).Property(item => item.Id).CurrentValue = value.item.Id;
        }
        if (pending.Count > 0) await db.SaveChangesAsync(token);
        return pending.Count;
    }
}
public sealed class TrialCrmProjectionWorker(IServiceScopeFactory scopes, ILogger<TrialCrmProjectionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<TrialCrmProjection>().PublishAsync(null, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error) { logger.LogWarning(error, "Trial CRM milestone publication will retry; Trial operations remain available."); }
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
