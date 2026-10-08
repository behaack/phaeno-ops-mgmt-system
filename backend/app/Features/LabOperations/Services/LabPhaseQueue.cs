namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabPhaseQueue(PSeqOperationsDbContext db)
{
    public async Task<List<LabJobQueueItem>> ExpandAsync(IReadOnlyList<LabJobQueueItem> jobs, bool holistic, DateTime now, CancellationToken ct)
    {
        var orderIds = jobs.Where(j => j.Job.CommercialOrderId.HasValue).Select(j => j.Job.CommercialOrderId!.Value).Distinct().ToArray();
        var plans = await new LabPhaseFacts(db).ReadManyAsync(orderIds, ct);
        var workIds = jobs.Select(j => j.Job.Id).ToArray();
        var specimens = await db.LabSpecimens.AsNoTracking().Where(s => workIds.Contains(s.LabWorkOrderId))
            .Select(s => new { s.Id, s.SubmittedSpecimenId }).ToListAsync(ct);
        var locations = await db.LabContainers.AsNoTracking().Where(c => workIds.Contains(c.LabWorkOrderId)
            && c.Kind == LabContainerKind.SubmittedSpecimen && c.Status != LabContainerStatus.Disposed && c.Location != null)
            .Select(c => new { c.LabSpecimenId, c.Location }).ToListAsync(ct);
        var calendars = await db.Set<LabBusinessCalendar>().Include(c => c.Holidays).ToDictionaryAsync(c => c.Id, ct);
        var policies = await db.Set<LabTimingPolicy>().ToDictionaryAsync(p => p.Id, ct);
        var result = new List<LabJobQueueItem>();
        foreach (var parent in jobs)
        {
            if (!parent.Job.CommercialOrderId.HasValue) { result.Add(parent); continue; }
            var plan = plans[parent.Job.CommercialOrderId.Value];
            var rows = new List<LabJobQueueItem>();
            DateTime? predecessorExpected = now;
            foreach (var phase in plan.Phases)
            {
                var memberIds = phase.SampleIds.ToHashSet();
                var specimenIds = specimens.Where(s => memberIds.Contains(s.SubmittedSpecimenId)).Select(s => s.Id).ToHashSet();
                var samples = parent.Forecast?.Samples.Where(s => specimenIds.Contains(s.SampleId)).ToArray() ?? [];
                var outstanding = samples.Where(s => s.Status is not ("Delivered" or "Cancelled")).ToArray();
                var expected = phase.Lifecycle == "ResultsDelivered" ? phase.FirstDeliveredAtUtc
                    : outstanding.Length > 0 && samples.Length == phase.SampleCount && outstanding.All(s => s.ExpectedAtUtc.HasValue)
                        ? outstanding.Max(s => s.ExpectedAtUtc) : null;
                var reason = "Calculated from this phase's sample progress.";
                if (phase.Lifecycle == "Planned" && predecessorExpected != now)
                {
                    if (predecessorExpected.HasValue && samples.Length == phase.SampleCount && outstanding.Length > 0
                        && outstanding.All(s => s.PolicyId.HasValue && s.Steps.Count > 0))
                    {
                        try
                        {
                            expected = outstanding.Select(s =>
                            {
                                var cursor = predecessorExpected.Value > now ? predecessorExpected.Value : now;
                                var calendar = calendars[policies[s.PolicyId!.Value].LabBusinessCalendarId];
                                foreach (var step in s.Steps) cursor = LabForecastClock.AddDays(cursor, step.Days, Enum.Parse<LabDayBasis>(step.DayBasis), calendar);
                                return (DateTime?)cursor;
                            }).DefaultIfEmpty(null).Max();
                            reason = "Includes the wait for preceding phase delivery and this phase's remaining work.";
                        }
                        catch (LabForecastCalendarException) { expected = null; reason = "Calendar coverage is insufficient for the sequential forecast."; }
                    }
                    else { expected = null; reason = "Preceding phase delivery or this phase's remaining work cannot yet be estimated."; }
                }
                var complete = phase.Lifecycle == "ResultsDelivered";
                var cancelled = phase.Lifecycle == "Cancelled";
                var due = phase.DueAtUtc;
                var deadline = cancelled ? "Cancelled" : complete ? !phase.FirstDeliveredAtUtc.HasValue ? "CompleteUnverified"
                    : due == null ? "CompleteUndated" : phase.FirstDeliveredAtUtc > due ? "CompleteLate" : "CompleteOnTime"
                    : due < now ? "Overdue" : phase.CalendarPending || phase.HeldSamples > 0 || parent.Job.IsBlocked || expected > due ? "AtRisk"
                    : due == null ? "AwaitingReceipt" : due <= now.AddDays(3) ? "DueSoon" : "NoKnownRisk";
                var row = new LabJobQueueItem
                {
                    PhaseId = phase.Id, PhaseName = phase.Name, Lifecycle = phase.Lifecycle, StageCounts = phase.StageCounts,
                    HeldSamples = phase.HeldSamples, FailedSamples = phase.FailedSamples,
                    ContainerCount = phase.ContainerCount, SentContainers = phase.SentContainers, ArrivedContainers = phase.ArrivedContainers,
                    ExpectedTubes = phase.ExpectedTubes, ReceivedTubes = phase.ReceivedTubes, AccessionedTubes = phase.AccessionedTubes,
                    JobStatus = cancelled ? "Cancelled" : complete ? "Delivered" : phase.MixedProgress ? "Mixed" : phase.StageCounts.Keys.FirstOrDefault() ?? "AwaitingReceipt",
                    DeadlineStatus = deadline,
                    Reason = cancelled ? "Cancelled scope is not successful delivery." : complete ? "Every required output for this phase is available in the Portal."
                        : deadline == "Overdue" ? "This phase's delivery commitment has passed; results remain outstanding."
                        : phase.CancellationPending ? "Cancellation requested; resolve the request before starting work."
                        : due == null ? "TAT starts after physical receipt of every required tube for this phase." : reason,
                    Job = parent.Job with { SampleCount = phase.SampleCount, DeliveredSampleCount = phase.DeliveredSamples,
                        DueAtUtc = due, OriginalDueAtUtc = phase.OriginalDueAtUtc, IsComplete = complete,
                        FirstDeliveredAtUtc = phase.FirstDeliveredAtUtc, CompletedAtUtc = phase.FirstDeliveredAtUtc,
                        DueDateAdjusted = phase.DueAtUtc != phase.OriginalDueAtUtc, TurnaroundDays = phase.TurnaroundBusinessDays,
                        FreezerBoxBarcodes = locations.Where(l => l.LabSpecimenId.HasValue && specimenIds.Contains(l.LabSpecimenId.Value))
                            .Select(l => l.Location!.Trim()).Distinct().Order().ToArray() },
                    Forecast = parent.Forecast == null ? null : parent.Forecast with { ExpectedAtUtc = expected,
                        Samples = samples, OutstandingSamples = phase.SampleCount - phase.DeliveredSamples,
                        EstimatedSamples = expected.HasValue ? outstanding.Length : 0, Status = complete ? "Delivered" : cancelled ? "Cancelled" : expected.HasValue ? "Estimated" : "InsufficientInformation",
                        Reason = reason, RemainingDays = expected.HasValue ? (decimal)(expected.Value - now).TotalDays : null }
                };
                rows.Add(row);
                if (!cancelled && !complete) predecessorExpected = expected;
            }
            if (!holistic) { result.AddRange(rows); continue; }
            var active = rows.Where(r => r.Lifecycle is not ("ResultsDelivered" or "Cancelled")).ToArray();
            var driver = active.OrderBy(r => r.DeadlineStatus == "Overdue" ? 0 : r.DeadlineStatus == "AtRisk" ? 1 : r.DeadlineStatus == "DueSoon" ? 2 : 3).ThenBy(r => r.Job.DueAtUtc).FirstOrDefault();
            parent.StageCounts = rows.SelectMany(r => r.StageCounts).GroupBy(x => x.Key).ToDictionary(g => g.Key, g => g.Sum(x => x.Value));
            parent.Lifecycle = active.Length > 0 ? "Open" : rows.All(r => r.Lifecycle == "Cancelled") ? "Cancelled" : rows.Any(r => r.Lifecycle == "Cancelled") ? "CompletedWithCancelledScope" : "ResultsDelivered";
            parent.HeldSamples = rows.Sum(r => r.HeldSamples); parent.FailedSamples = rows.Sum(r => r.FailedSamples);
            parent.JobStatus = parent.Lifecycle == "Cancelled" ? "Cancelled" : active.Length == 0 ? "Delivered" : parent.StageCounts.Count > 1 ? "Mixed" : parent.StageCounts.Keys.FirstOrDefault() ?? "AwaitingReceipt";
            parent.DeadlineStatus = driver?.DeadlineStatus ?? (parent.Lifecycle == "Cancelled" ? "Cancelled"
                : rows.Any(r => r.DeadlineStatus == "CompleteLate") ? "CompleteLate"
                : rows.Any(r => r.DeadlineStatus == "CompleteUnverified") ? "CompleteUnverified"
                : rows.Any(r => r.DeadlineStatus == "CompleteUndated") ? "CompleteUndated" : "CompleteOnTime");
            parent.Job = parent.Job with { SampleCount = rows.Sum(r => r.Job.SampleCount), DeliveredSampleCount = rows.Sum(r => r.Job.DeliveredSampleCount),
                IsComplete = active.Length == 0, DueAtUtc = driver?.Job.DueAtUtc, OriginalDueAtUtc = driver?.Job.OriginalDueAtUtc,
                DueDateAdjusted = driver?.Job.DueDateAdjusted ?? rows.Any(r => r.Job.DueDateAdjusted), TurnaroundDays = driver?.Job.TurnaroundDays };
            parent.Reason = active.Length == 0 ? parent.Lifecycle == "CompletedWithCancelledScope" ? "All remaining phases delivered; approved cancelled scope remains recorded." : "All phases are closed."
                : driver?.Reason ?? "Review the phase progress.";
            if (parent.Forecast != null) parent.Forecast = parent.Forecast with { ExpectedAtUtc = rows.LastOrDefault(r => r.Lifecycle != "Cancelled")?.Forecast?.ExpectedAtUtc,
                Status = active.Length == 0 ? "Delivered" : active.All(r => r.Forecast?.ExpectedAtUtc != null) ? "Estimated" : "InsufficientInformation" };
            result.Add(parent);
        }
        return result;
    }
}
