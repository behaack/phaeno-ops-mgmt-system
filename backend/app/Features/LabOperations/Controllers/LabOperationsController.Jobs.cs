namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed record AdjustJobDeadlineRequest(long Version, DateTime DueAtUtc, string Reason);
public sealed record JobDeadlineChangeDto(Guid Id, DateTime? PreviousDueAtUtc, DateTime DueAtUtc,
    string Reason, Guid ActorUserId, string ActorName, DateTime OccurredAtUtc);
public sealed record LabJobDeadlineDetail(LabJobQueueItem Summary, IReadOnlyList<JobDeadlineChangeDto> Changes);

public sealed partial class LabOperationsController
{
    private Task<LabOperationsActor> RequireJobsReaderAsync(CancellationToken token) =>
        requestContext.RequireAsync(HttpContext, token, LabRole.Operator, LabRole.Supervisor,
            LabRole.ProtocolAdministrator, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);

    [HttpGet("jobs")]
    public async Task<LabJobQueue> Jobs(CancellationToken cancellationToken, string? search = null,
        string? deadlineStatus = null, int page = 1, int pageSize = 25, string view = "Active",
        string? jobStatus = null, string? outcome = null, DateTime? fromUtc = null, DateTime? toExclusiveUtc = null)
    {
        await RequireJobsReaderAsync(cancellationToken);
        if (view is not ("Active" or "Closed")) throw Invalid("job_view_invalid", "Choose Active or Closed jobs.");
        if (fromUtc.HasValue && fromUtc.Value.Kind != DateTimeKind.Utc || toExclusiveUtc.HasValue && toExclusiveUtc.Value.Kind != DateTimeKind.Utc
            || fromUtc.HasValue && toExclusiveUtc.HasValue && fromUtc.Value >= toExclusiveUtc.Value)
            throw Invalid("job_date_range_invalid", "Choose a valid date range with From on or before To.");
        if (!string.IsNullOrEmpty(deadlineStatus) && (view != "Active" || !new[] { "Overdue", "AtRisk", "DueSoon" }.Contains(deadlineStatus)))
            throw Invalid("job_filter_invalid", "Choose All deadlines, Overdue, At risk or Due soon for Active jobs.");
        if (!string.IsNullOrEmpty(jobStatus) && (view != "Active" || !new[] { "AwaitingReceipt", "AwaitingAcceptance", "ReadyForPreparation", "LibraryPreparation", "Sequencing", "DataProcessing", "QualityReview", "AwaitingDelivery", "OnHold" }.Contains(jobStatus)))
            throw Invalid("job_status_invalid", "Choose a valid Active job status.");
        if (!string.IsNullOrEmpty(outcome) && (view != "Closed" || outcome is not ("Delivered" or "Cancelled")))
            throw Invalid("job_outcome_invalid", "Choose All outcomes, Delivered or Cancelled for Closed jobs.");
        var now = DateTime.UtcNow;
        var query = new LabJobQuery(dbContext);
        var rows = view == "Closed" ? query.Rows().Where(j => j.IsComplete || j.OperationalStatus == LabWorkOrderStatus.Cancelled)
            : query.QueueRows().Where(j => !j.IsComplete && j.OperationalStatus != LabWorkOrderStatus.Cancelled);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            if (term.Length > 255) throw Invalid("job_search_invalid", "Search must be 255 characters or fewer.");
            rows = rows.Where(j => j.Name.ToLower().Contains(term) || j.OrganizationName.ToLower().Contains(term)
                || j.CustomerReference != null && j.CustomerReference.ToLower().Contains(term));
        }
        if (fromUtc.HasValue) rows = view == "Closed" ? rows.Where(j => j.OrderCreatedAtUtc >= fromUtc.Value) : rows.Where(j => j.DueAtUtc >= fromUtc.Value);
        if (toExclusiveUtc.HasValue) rows = view == "Closed" ? rows.Where(j => j.OrderCreatedAtUtc < toExclusiveUtc.Value) : rows.Where(j => j.DueAtUtc < toExclusiveUtc.Value);
        var classified = LabJobQuery.Classify(rows, now);
        if (!string.IsNullOrEmpty(jobStatus)) classified = classified.Where(j => j.JobStatus == jobStatus);
        if (!string.IsNullOrEmpty(outcome)) classified = classified.Where(j => j.JobStatus == outcome);
        // Materialize candidates in one query, then forecast in bounded batches before risk filtering/paging.
        var candidates = await classified.ToListAsync(cancellationToken);
        foreach (var batch in candidates.Chunk(200))
        {
            var forecasts = await new LabCompletionForecastService(dbContext).CalculateAsync(batch.Select(j => j.Job.Id).ToArray(), now, cancellationToken);
            foreach (var item in batch) ApplyCompletionForecast(item, forecasts[item.Job.Id], now);
        }
        var counts = view == "Active" ? candidates.GroupBy(j => j.DeadlineStatus).ToDictionary(g => g.Key, g => g.Count()) : new Dictionary<string, int>();
        var filtered = string.IsNullOrEmpty(deadlineStatus) ? candidates : candidates.Where(j => j.DeadlineStatus == deadlineStatus).ToList();
        var total = filtered.Count;
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Clamp(page, 1, Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)));
        var ordered = view == "Closed" ? filtered.OrderByDescending(j => j.Job.OrderCreatedAtUtc).ThenBy(j => j.Job.Id)
            : filtered.OrderBy(j => j.DeadlineStatus == "Overdue" ? 0 : j.DeadlineStatus == "AtRisk" ? 1
                : j.DeadlineStatus == "DueSoon" ? 2 : j.DeadlineStatus == "AwaitingAcceptance" ? 4 : 3)
                .ThenBy(j => j.Job.DueAtUtc).ThenBy(j => j.Job.Id);
        var items = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new(items, total, page, pageSize, counts, now);
    }

    private static void ApplyCompletionForecast(LabJobQueueItem item, JobCompletionForecast forecast, DateTime now)
    {
        item.Forecast = forecast;
        var job = item.Job;
        if (job.IsComplete || job.OperationalStatus == LabWorkOrderStatus.Cancelled || job.DueAtUtc is null || job.DueAtUtc < now) return;
        if (job.IsBlocked || forecast.Status == "Blocked" || job.NextSampleDueAtUtc < now
            || forecast.ExpectedAtUtc > job.DueAtUtc || job.ForecastAdjusted && job.ExpectedCompletionAtUtc > job.DueAtUtc)
        {
            item.DeadlineStatus = "AtRisk";
            item.Reason = job.IsBlocked || forecast.Status == "Blocked" ? "An open blocking exception or hold needs attention."
                : forecast.ExpectedAtUtc > job.DueAtUtc ? "Calculated completion is later than the delivery due date."
                : job.ForecastAdjusted && job.ExpectedCompletionAtUtc > job.DueAtUtc ? "The staff estimate is later than the delivery due date."
                : "An unfinished sample has passed its original turnaround target.";
        }
        else
        {
            var soon = job.DueAtUtc <= now.AddDays(3) || job.NextSampleDueAtUtc <= now.AddDays(3);
            item.DeadlineStatus = soon ? "DueSoon" : "NoKnownRisk";
            item.Reason = soon ? "A delivery or sample target falls within three calendar days."
                : forecast.ExpectedAtUtc is null ? "No deadline risk is recorded; the calculated forecast is incomplete." : "Calculated completion is within the delivery commitment.";
        }
    }

    [HttpGet("work-orders/{workOrderId:guid}/deadline")]
    public async Task<LabJobDeadlineDetail> JobDeadline(Guid workOrderId, CancellationToken cancellationToken)
    {
        await RequireJobsReaderAsync(cancellationToken);
        var summary = await LabJobQuery.Classify(new LabJobQuery(dbContext).Rows().Where(j => j.Id == workOrderId), DateTime.UtcNow)
            .SingleOrDefaultAsync(cancellationToken) ?? throw Missing();
        var changes = await dbContext.Set<LabJobDeadlineChange>().AsNoTracking().Where(c => c.LabWorkOrderId == workOrderId)
            .OrderByDescending(c => c.OccurredAtUtc).Select(c => new JobDeadlineChangeDto(c.Id, c.PreviousDueAtUtc, c.DueAtUtc,
                c.Reason, c.ActorUserId, dbContext.Users.Where(u => u.Id == c.ActorUserId).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault() ?? "Phaeno employee", c.OccurredAtUtc))
            .ToListAsync(cancellationToken);
        var forecasts = await new LabCompletionForecastService(dbContext).CalculateAsync([workOrderId], DateTime.UtcNow, cancellationToken);
        ApplyCompletionForecast(summary, forecasts[workOrderId], DateTime.UtcNow);
        return new(summary, changes);
    }

    [HttpPost("work-orders/{workOrderId:guid}/deadline")]
    public async Task<LabJobDeadlineDetail> AdjustJobDeadline(Guid workOrderId, AdjustJobDeadlineRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.Operator, LabRole.Supervisor);
        await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        EnsureVersion(work.Version, request.Version);
        var summary = await new LabJobQuery(dbContext).Rows().SingleAsync(j => j.Id == workOrderId, cancellationToken);
        if (summary.IsComplete || work.FirstDeliveredAtUtc != null)
            throw Conflict("job_already_delivered", "A delivered job's deadline history cannot be rewritten.");
        var previous = work.AdjustedDeliveryDueAtUtc ?? work.OriginalDeliveryDueAtUtc;
        var now = DateTime.UtcNow;
        Execute(() =>
        {
            var change = new LabJobDeadlineChange(work.Id, previous, request.DueAtUtc, request.Reason, actor.User.Id, now);
            work.AdjustDeliveryDueDate(request.DueAtUtc);
            dbContext.Add(change);
        });
        if (work.AuthorizationSource == LabAuthorizationSource.CommercialOrder)
        {
            var order = await dbContext.LabServiceOrders.AsNoTracking().SingleAsync(o => o.Id == work.AuthorizationSourceId
                && o.OrganizationId == work.SubmittingOrganizationId, cancellationToken);
            dbContext.OrderNotifications.Add(new OrderNotification(order.OrganizationId, order.CreatedByUserId,
                OrderWorkflowTypes.LabService, order.Id, "lab-deadline-changed", "Laboratory delivery due date changed",
                $"The delivery due date for {order.OrderNumber} is now {request.DueAtUtc:yyyy-MM-dd HH:mm} UTC. {request.Reason.Trim()}", order.DepartmentId));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await JobDeadline(workOrderId, cancellationToken);
    }
}
