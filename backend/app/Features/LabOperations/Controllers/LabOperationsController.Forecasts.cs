namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;

public sealed record ForecastHolidayInput(DateOnly Date, string Name);
public sealed record ForecastCalendarInput(Guid? PreviousId, DateOnly CoverageFrom, DateOnly CoverageTo, string Reason, List<ForecastHolidayInput> Holidays);
public sealed record ForecastDurationInput(string StageKey, decimal Days, LabDayBasis DayBasis);
public sealed record ForecastPolicyInput(Guid? PreviousId, Guid CalendarId, bool RequiresSequencing, string Reason, List<ForecastDurationInput> Durations);
public sealed record ForecastApplyJob(Guid JobId, long Version, Guid? PreviousPolicyId);
public sealed record ForecastApplyInput(Guid PolicyId, string Reason, List<ForecastApplyJob> Jobs);

public sealed partial class LabOperationsController
{
    [HttpGet("forecast-configuration")]
    public async Task<object> ForecastConfiguration(CancellationToken token)
    {
        var actor = await RequireJobsReaderAsync(token);
        var workflows = await dbContext.LabServiceWorkflows.AsNoTracking().OrderBy(w => w.Name).ToListAsync(token);
        var versions = await dbContext.LabServiceWorkflowVersions.AsNoTracking().Where(v => v.Status != LabServiceWorkflowStatus.Discarded).ToListAsync(token);
        var stages = await dbContext.LabServiceWorkflowStages.AsNoTracking().ToListAsync(token);
        var policies = await dbContext.Set<LabTimingPolicy>().AsNoTracking().Include(p => p.Durations).OrderByDescending(p => p.Revision).ToListAsync(token);
        var calendars = await dbContext.Set<LabBusinessCalendar>().AsNoTracking().Include(c => c.Holidays).OrderByDescending(c => c.Revision).ToListAsync(token);
        return new {
            CanConfigure = actor.HasAny(LabRole.ProtocolAdministrator, LabRole.Supervisor),
            Workflows = versions.OrderBy(v => workflows.Single(w => w.Id == v.LabServiceWorkflowId).Name).ThenByDescending(v => v.WorkflowVersion).Select(v => new {
                v.Id, Name = workflows.Single(w => w.Id == v.LabServiceWorkflowId).Name, v.WorkflowVersion, Status = v.Status.ToString(),
                Stages = LabCompletionForecastService.StageOptions(stages.Where(s => s.LabServiceWorkflowVersionId == v.Id)),
                Policies = policies.Where(p => p.LabServiceWorkflowVersionId == v.Id)
            }), Calendars = calendars
        };
    }

    [HttpPost("forecast-calendars")]
    public async Task<LabBusinessCalendar> SaveForecastCalendar(ForecastCalendarInput input, CancellationToken token)
    {
        await requestContext.RequireAsync(HttpContext, token, LabRole.ProtocolAdministrator, LabRole.Supervisor);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        var latest = await dbContext.Set<LabBusinessCalendar>().OrderByDescending(c => c.Revision).FirstOrDefaultAsync(token);
        if (latest?.Id != input.PreviousId) throw Conflict("forecast_calendar_changed", "The holiday calendar changed. Reload before saving.");
        if (input.Holidays is null || input.Holidays.Count > 1000) throw Invalid("forecast_holidays_invalid", "Provide at most 1,000 holiday dates.");
        LabBusinessCalendar calendar = null!;
        Execute(() => {
            calendar = new((latest?.Revision ?? 0) + 1, "America/Los_Angeles", input.CoverageFrom, input.CoverageTo, input.Reason);
            foreach (var h in input.Holidays) calendar.AddHoliday(h.Date, h.Name);
        });
        dbContext.Add(calendar); await dbContext.SaveChangesAsync(token); await tx.CommitAsync(token); return calendar;
    }

    [HttpPost("forecast-policies/{workflowId:guid}")]
    public async Task<LabTimingPolicy> SaveForecastPolicy(Guid workflowId, ForecastPolicyInput input, CancellationToken token)
    {
        await requestContext.RequireAsync(HttpContext, token, LabRole.ProtocolAdministrator, LabRole.Supervisor);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        if (!await dbContext.LabServiceWorkflowVersions.AnyAsync(w => w.Id == workflowId && w.Status != LabServiceWorkflowStatus.Discarded, token)) throw Missing();
        if (!await dbContext.Set<LabBusinessCalendar>().AnyAsync(c => c.Id == input.CalendarId, token)) throw Invalid("forecast_calendar_missing", "Choose a configured holiday calendar.");
        var latest = await dbContext.Set<LabTimingPolicy>().Where(p => p.LabServiceWorkflowVersionId == workflowId).OrderByDescending(p => p.Revision).FirstOrDefaultAsync(token);
        if (latest?.Id != input.PreviousId) throw Conflict("forecast_policy_changed", "Stage durations changed. Reload before saving.");
        var stages = await dbContext.LabServiceWorkflowStages.Where(s => s.LabServiceWorkflowVersionId == workflowId).ToListAsync(token);
        var allowed = LabCompletionForecastService.StageOptions(stages).Select(s => s.Key).ToHashSet();
        if (input.Durations is null || input.Durations.Count > allowed.Count || input.Durations.Any(d => !allowed.Contains(d.StageKey)))
            throw Invalid("forecast_stage_invalid", "Choose stages belonging to this workflow.");
        LabTimingPolicy policy = null!;
        Execute(() => {
            policy = new(workflowId, input.CalendarId, (latest?.Revision ?? 0) + 1, input.Reason, input.RequiresSequencing);
            foreach (var d in input.Durations) policy.AddDuration(d.StageKey, d.Days, d.DayBasis);
        });
        dbContext.Add(policy); await dbContext.SaveChangesAsync(token); await tx.CommitAsync(token); return policy;
    }

    [HttpGet("forecast-policies/{policyId:guid}/preview")]
    public async Task<object> PreviewForecastPolicy(Guid policyId, CancellationToken token, int page = 1)
    {
        await requestContext.RequireAsync(HttpContext, token, LabRole.ProtocolAdministrator, LabRole.Supervisor);
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, token);
        var policy = await dbContext.Set<LabTimingPolicy>().AsNoTracking().SingleOrDefaultAsync(p => p.Id == policyId, token) ?? throw Missing();
        var eligible = new LabJobQuery(dbContext).Rows().Where(j => !j.IsComplete && j.OperationalStatus != LabWorkOrderStatus.Cancelled);
        var serviceKey = await (from v in dbContext.LabServiceWorkflowVersions join w in dbContext.LabServiceWorkflows on v.LabServiceWorkflowId equals w.Id
            where v.Id == policy.LabServiceWorkflowVersionId select w.ServiceKey).SingleAsync(token);
        var matching = from j in eligible join w in dbContext.LabWorkOrders on j.Id equals w.Id
                       where w.ServiceKey == serviceKey && (w.AuthorizationSource != LabAuthorizationSource.TrialProject
                           || w.LabServiceWorkflowVersionId == null || w.LabServiceWorkflowVersionId == policy.LabServiceWorkflowVersionId) select j;
        var total = await matching.CountAsync(token); page = Math.Clamp(page, 1, Math.Max(1, (int)Math.Ceiling(total / 25d)));
        var jobs = await matching.OrderBy(j => j.Name).ThenBy(j => j.Id).Skip((page - 1) * 25).Take(25).ToListAsync(token);
        var service = new LabCompletionForecastService(dbContext); var now = DateTime.UtcNow;
        var ids = jobs.Select(j => j.Id).ToArray();
        var current = await service.CalculateAsync(ids, now, token); var proposed = await service.CalculateAsync(ids, now, token, policyId);
        var assignments = await (from b in dbContext.Set<LabJobTimingPolicy>().AsNoTracking()
            join p in dbContext.Set<LabTimingPolicy>().AsNoTracking() on b.LabTimingPolicyId equals p.Id
            where ids.Contains(b.LabWorkOrderId) && p.LabServiceWorkflowVersionId == policy.LabServiceWorkflowVersionId select b).ToListAsync(token);
        var result = new { Page = page, Total = total, Jobs = jobs.Select(j => new { j.Id, j.Name, j.Version,
            CurrentPolicyId = assignments.Where(b => b.LabWorkOrderId == j.Id).OrderByDescending(b => b.Revision).FirstOrDefault()?.LabTimingPolicyId,
            Current = current[j.Id], Proposed = proposed[j.Id] }) };
        await tx.CommitAsync(token);
        return result;
    }

    [HttpPost("forecast-policies/apply")]
    public async Task<object> ApplyForecastPolicy(ForecastApplyInput input, CancellationToken token)
    {
        var actor = await requestContext.RequireAsync(HttpContext, token, LabRole.ProtocolAdministrator, LabRole.Supervisor);
        if (input.Jobs is null || input.Jobs.Count is < 1 or > 25 || input.Jobs.Select(j => j.JobId).Distinct().Count() != input.Jobs.Count)
            throw Invalid("forecast_jobs_invalid", "Select between one and 25 distinct jobs from the preview.");
        await using var tx = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        var policy = await dbContext.Set<LabTimingPolicy>().AsNoTracking().SingleOrDefaultAsync(p => p.Id == input.PolicyId, token) ?? throw Missing();
        var serviceKey = await (from v in dbContext.LabServiceWorkflowVersions join w in dbContext.LabServiceWorkflows on v.LabServiceWorkflowId equals w.Id
            where v.Id == policy.LabServiceWorkflowVersionId select w.ServiceKey).SingleAsync(token);
        foreach (var item in input.Jobs)
        {
            var work = await RequireWorkOrderAsync(item.JobId, token); EnsureVersion(work.Version, item.Version);
            var summary = await new LabJobQuery(dbContext).Rows().SingleAsync(j => j.Id == work.Id, token);
            if (summary.IsComplete || work.Status == LabWorkOrderStatus.Cancelled || work.ServiceKey != serviceKey
                || work.AuthorizationSource == LabAuthorizationSource.TrialProject && work.LabServiceWorkflowVersionId.HasValue && work.LabServiceWorkflowVersionId != policy.LabServiceWorkflowVersionId)
                throw Conflict("forecast_job_changed", "Only unfinished jobs with this workflow may use the policy. Reload the preview.");
            var previous = await (from b in dbContext.Set<LabJobTimingPolicy>() join p in dbContext.Set<LabTimingPolicy>() on b.LabTimingPolicyId equals p.Id
                where b.LabWorkOrderId == work.Id && p.LabServiceWorkflowVersionId == policy.LabServiceWorkflowVersionId
                orderby b.Revision descending select b).FirstOrDefaultAsync(token);
            var revision = (await dbContext.Set<LabJobTimingPolicy>().Where(b => b.LabWorkOrderId == work.Id).MaxAsync(b => (int?)b.Revision, token) ?? 0) + 1;
            if (previous?.LabTimingPolicyId != item.PreviousPolicyId) throw Conflict("forecast_binding_changed", "The job's timing policy changed. Reload the preview.");
            Execute(() => dbContext.Add(new LabJobTimingPolicy(work.Id, policy.Id, revision, input.Reason)));
            work.AdvanceProjectionVersion();
            dbContext.LabWorkEvents.Add(new(work.Id, null, "ForecastPolicyApplied", DateTime.UtcNow, actor.User.Id,
                System.Text.Json.JsonSerializer.Serialize(new { policyId = policy.Id, previousPolicyId = previous?.LabTimingPolicyId, reason = input.Reason })));
        }
        await dbContext.SaveChangesAsync(token); await tx.CommitAsync(token);
        return new { Applied = input.Jobs.Count };
    }

    [HttpGet("work-orders/{workOrderId:guid}/forecast")]
    public async Task<JobCompletionForecast> JobForecast(Guid workOrderId, CancellationToken token)
    {
        await RequireJobsReaderAsync(token);
        var results = await new LabCompletionForecastService(dbContext).CalculateAsync([workOrderId], DateTime.UtcNow, token);
        return results.GetValueOrDefault(workOrderId) ?? throw Missing();
    }
}
