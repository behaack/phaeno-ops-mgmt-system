namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class CommercialSaleSummaryService(PSeqOperationsDbContext db)
{
    public async Task StageAsync(string workflowType, Guid orderId, Guid organizationId, Guid? opportunityId,
        string productSummary, decimal quantity, decimal total, string currency, DateTime committedAt,
        Guid actorUserId, CancellationToken token)
    {
        if (db.Database.CurrentTransaction is null) throw new InvalidOperationException("Stage the sale inside its order commitment transaction.");
        var existing = await db.Set<CommercialSaleSummary>().SingleOrDefaultAsync(value => value.WorkflowType == workflowType && value.OrderId == orderId, token);
        if (existing is not null)
        {
            if (existing.OrganizationId != organizationId || existing.Total != total || existing.Quantity != quantity
                || existing.Currency != currency || existing.ProductSummary != productSummary || existing.OpportunityId != opportunityId)
                throw new InvalidOperationException("A committed commercial summary cannot be replaced with different sale facts.");
            return;
        }
        db.Add(new CommercialSaleSummary(workflowType, orderId, organizationId, opportunityId, productSummary,
            quantity, total, currency, committedAt, actorUserId));
    }

    public async Task<bool> ProjectAsync(Guid id, CancellationToken token)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        var summary = await db.Set<CommercialSaleSummary>().SingleAsync(value => value.Id == id, token);
        if (summary.ProjectedRevision == summary.Revision) { await transaction.CommitAsync(token); return true; }
        var company = await db.CrmCompanies.AsNoTracking().SingleOrDefaultAsync(value => value.AccessOrganizationId == summary.OrganizationId && value.IsActive, token);
        if (company is null)
        {
            summary.Failed("company_link_missing", DateTime.UtcNow);
            await db.SaveChangesAsync(token); await transaction.CommitAsync(token); return false;
        }
        var opportunityId = summary.OpportunityId;
        if (opportunityId.HasValue && !await db.CrmOpportunities.AsNoTracking().AnyAsync(value => value.Id == opportunityId && value.CompanyId == company.Id, token))
        {
            summary.Failed("opportunity_link_invalid", DateTime.UtcNow);
            await db.SaveChangesAsync(token); await transaction.CommitAsync(token); return false;
        }
        // Only this explicitly safe, commercial projection crosses into CRM.
        var body = JsonSerializer.Serialize(new { summary.WorkflowType, summary.OrderId, summary.ProductSummary,
            summary.Quantity, summary.Total, summary.Currency, summary.CommittedAtUtc,
            summary.ExpectedCompletionAtUtc, summary.ScheduleHealth }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var activity = new CrmActivity(CrmActivityType.PortalEvent, summary.ProjectedRevision == 0
                ? "Commercial order committed" : "Commercial order schedule updated", body, DateTime.UtcNow,
            CrmActivityVisibility.Internal, summary.CommitmentActorUserId, company.Id, opportunityId: opportunityId);
        db.CrmActivities.Add(activity); summary.Projected(activity.Id);
        await db.SaveChangesAsync(token); await transaction.CommitAsync(token); return true;
    }
}

public sealed class CommercialSaleSummaryWorker(IServiceScopeFactory scopeFactory, ILogger<CommercialSaleSummaryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        do
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                var now = DateTime.UtcNow;
                var overdue = await db.CommercialSaleSummaries.Where(value => value.ExpectedCompletionAtUtc < now
                    && value.ScheduleHealth != "Delayed" && value.ScheduleHealth != "Complete").Take(100).ToListAsync(stoppingToken);
                foreach (var value in overdue) value.SetSchedule(value.ExpectedCompletionAtUtc, "Delayed", now);
                if (overdue.Count > 0) await db.SaveChangesAsync(stoppingToken);
                var ids = await db.Set<CommercialSaleSummary>().AsNoTracking().Where(value => value.ProjectedRevision < value.Revision
                    && value.AttemptCount < 5 && value.NextAttemptAtUtc <= now).OrderBy(value => value.NextAttemptAtUtc)
                    .Select(value => value.Id).Take(20).ToListAsync(stoppingToken);
                foreach (var id in ids)
                {
                    using var itemScope = scopeFactory.CreateScope();
                    var itemDb = itemScope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                    try { await new CommercialSaleSummaryService(itemDb).ProjectAsync(id, stoppingToken); }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { throw; }
                    catch (Exception)
                    {
                        // A separate unit of work records retry state after the projection transaction rolls back.
                        using var failureScope = scopeFactory.CreateScope();
                        var failureDb = failureScope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                        var failed = await failureDb.Set<CommercialSaleSummary>().SingleAsync(value => value.Id == id, stoppingToken);
                        if (failed.ProjectedRevision < failed.Revision) { failed.Failed("projection_failed", DateTime.UtcNow); await failureDb.SaveChangesAsync(stoppingToken); }
                        logger.LogWarning("Commercial summary {SummaryId} awaits projection retry.", id);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception) { logger.LogError(exception, "Commercial summary polling failed."); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
