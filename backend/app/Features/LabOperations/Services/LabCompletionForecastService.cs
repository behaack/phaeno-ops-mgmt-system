namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record ForecastStageOption(string Key, string Name, string Requirement);
public sealed record ForecastStep(string Key, string Name, DateTime? EnteredAtUtc, DateTime ExpectedExitAtUtc, decimal Days, string DayBasis, bool Overrun);
public sealed record SampleCompletionForecast(Guid SampleId, string Name, string Stage, DateTime? EnteredAtUtc,
    DateTime? ExpectedAtUtc, decimal? RemainingDays, string Status, string Reason, IReadOnlyList<ForecastStep> Steps, Guid? PolicyId = null, int? PolicyRevision = null, int? CalendarRevision = null);
public sealed record JobCompletionForecast(Guid JobId, Guid? PolicyId, int? PolicyRevision, int? CalendarRevision, DateTime EvaluatedAtUtc,
    DateTime? ExpectedAtUtc, decimal? RemainingDays, string Status, string Reason, int EstimatedSamples, int OutstandingSamples,
    IReadOnlyList<Guid> DrivingSampleIds, IReadOnlyList<SampleCompletionForecast> Samples);

public sealed class LabCompletionForecastService(PSeqOperationsDbContext db)
{
    public static List<ForecastStageOption> StageOptions(IEnumerable<LabServiceWorkflowStage> stages) => [
        new("acceptance", "Scientific acceptance", "Required"),
        .. stages.OrderBy(s => s.Sequence).Select(s => new ForecastStageOption(s.Id.ToString(), s.Name, s.Requirement.ToString())),
        new("library-qc", "Library QC", "When libraries are required"),
        new("sequencing", "Sequencing (including queue and send-out)", "When libraries are required"),
        new("assembly", "Data assembly", "Required"), new("qc", "Results QC / scientific review", "Required"),
        new("delivery", "Portal publication", "Required")];

    public async Task<Dictionary<Guid, JobCompletionForecast>> CalculateAsync(IReadOnlyCollection<Guid> jobIds, DateTime now,
        CancellationToken token, Guid? previewPolicyId = null)
    {
        if (jobIds.Count == 0) return [];
        if (db.Database.CurrentTransaction is not null) return await CalculateCoreAsync(jobIds, now, token, previewPolicyId);
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, token);
        var result = await CalculateCoreAsync(jobIds, now, token, previewPolicyId);
        await transaction.CommitAsync(token);
        return result;
    }

    private async Task<Dictionary<Guid, JobCompletionForecast>> CalculateCoreAsync(IReadOnlyCollection<Guid> jobIds, DateTime now,
        CancellationToken token, Guid? previewPolicyId)
    {
        var works = await db.LabWorkOrders.AsNoTracking().Where(w => jobIds.Contains(w.Id)).ToListAsync(token);
        var samples = await db.LabSpecimens.AsNoTracking().Where(s => jobIds.Contains(s.LabWorkOrderId)
            && s.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled).ToListAsync(token);
        var bindings = await db.Set<LabJobTimingPolicy>().AsNoTracking().Where(p => jobIds.Contains(p.LabWorkOrderId)).ToListAsync(token);
        var policyIds = bindings.Select(p => p.LabTimingPolicyId).Concat(previewPolicyId is { } id ? [id] : []).Distinct().ToArray();
        var policies = await db.Set<LabTimingPolicy>().AsNoTracking().Include(p => p.Durations).Where(p => policyIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, token);
        var calendarIds = policies.Values.Select(p => p.LabBusinessCalendarId).Distinct().ToArray();
        var calendars = await db.Set<LabBusinessCalendar>().AsNoTracking().Include(c => c.Holidays).Where(c => calendarIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, token);
        var attempts = await db.LabSpecimenAttempts.AsNoTracking().Where(a => jobIds.Contains(a.LabWorkOrderId) && a.State != LabSpecimenAttemptState.Cancelled).ToListAsync(token);
        var executions = await db.LabProtocolExecutions.AsNoTracking().Where(e => jobIds.Contains(e.LabWorkOrderId)).ToListAsync(token);
        var executionStageIds = executions.Where(e => e.LabServiceWorkflowStageId.HasValue).Select(e => e.LabServiceWorkflowStageId!.Value).ToArray();
        var workflowIds = works.Where(w => w.LabServiceWorkflowVersionId.HasValue).Select(w => w.LabServiceWorkflowVersionId!.Value).Concat(attempts.Select(a => a.LabServiceWorkflowVersionId)).Concat(policies.Values.Select(p => p.LabServiceWorkflowVersionId)).Distinct().ToArray();
        var stages = await db.LabServiceWorkflowStages.AsNoTracking().Where(s => workflowIds.Contains(s.LabServiceWorkflowVersionId) || executionStageIds.Contains(s.Id)).OrderBy(s => s.Sequence).ToListAsync(token);
        var libraries = await db.LabLibraries.AsNoTracking().Where(l => jobIds.Contains(l.LabWorkOrderId)).ToListAsync(token);
        var packages = await db.ResultOutputPackages.AsNoTracking().Where(p => jobIds.Contains(p.LabWorkOrderId)).ToListAsync(token);
        var transitions = await db.Set<LabForecastTransition>().AsNoTracking().Where(t => jobIds.Contains(t.LabWorkOrderId)).ToListAsync(token);
        var submittedIds = samples.Select(s => s.SubmittedSpecimenId).ToArray();
        var requestedRuns = await db.LabSamples.AsNoTracking().Where(s => submittedIds.Contains(s.Id) && s.SequencingRunCount > 1).ToDictionaryAsync(s => s.Id, s => s.SequencingRunCount, token);
        var releases = await new LabJobQuery(db).Releases().Where(r => submittedIds.Contains(r.SampleId)).ToListAsync(token);
        var blockedJobs = await db.LabExceptions.AsNoTracking().Where(e => jobIds.Contains(e.LabWorkOrderId) && e.IsBlocking && e.Status == LabExceptionStatus.Open)
            .Select(e => e.LabWorkOrderId).Distinct().ToListAsync(token);
        var batchMembers = await db.LabBatchMembers.AsNoTracking().Where(m => jobIds.Contains(m.LabWorkOrderId)).ToListAsync(token);
        var batchIds = batchMembers.Select(m => m.LabOperationalBatchId).Distinct().ToArray();
        var sendouts = await db.LabNgsSendouts.AsNoTracking().Where(s => batchIds.Contains(s.LabOperationalBatchId)).ToListAsync(token);
        DateTime? Entered(Guid source, string kind, string state) => transitions.Where(t => t.SourceId == source && t.SourceKind == kind && t.State == state)
            .Select(t => (DateTime?)t.EnteredAtUtc).Max();
        var result = new Dictionary<Guid, JobCompletionForecast>();
        foreach (var work in works)
        {
            var jobBindings = bindings.Where(b => b.LabWorkOrderId == work.Id).OrderByDescending(b => b.Revision).ToList();
            var defaultPolicyId = previewPolicyId ?? jobBindings.FirstOrDefault()?.LabTimingPolicyId;
            var defaultPolicy = defaultPolicyId is { } dp ? policies.GetValueOrDefault(dp) : null;
            var sampleResults = new List<SampleCompletionForecast>();
            foreach (var sample in samples.Where(s => s.LabWorkOrderId == work.Id))
            {
                var attempt = attempts.Where(a => a.LabSpecimenId == sample.Id).OrderByDescending(a => a.Sequence).FirstOrDefault();
                var legacyStageId = executions.Where(e => e.LabSpecimenId == sample.Id && e.LabSpecimenAttemptId == null && e.Status != LabExecutionStatus.Abandoned)
                    .OrderByDescending(e => e.StartedAtUtc ?? e.CreatedAt).Select(e => e.LabServiceWorkflowStageId).FirstOrDefault();
                var workflowId = attempt?.LabServiceWorkflowVersionId ?? stages.FirstOrDefault(s => s.Id == legacyStageId)?.LabServiceWorkflowVersionId
                    ?? work.LabServiceWorkflowVersionId ?? defaultPolicy?.LabServiceWorkflowVersionId;
                var sampleBinding = jobBindings.FirstOrDefault(b => policies.GetValueOrDefault(b.LabTimingPolicyId)?.LabServiceWorkflowVersionId == workflowId);
                var selectedPolicyId = previewPolicyId is { } preview && policies[preview].LabServiceWorkflowVersionId == workflowId ? previewPolicyId : sampleBinding?.LabTimingPolicyId;
                var policy = selectedPolicyId is { } pid ? policies.GetValueOrDefault(pid) : null;
                var calendar = policy is null ? null : calendars.GetValueOrDefault(policy.LabBusinessCalendarId);
                var ws = stages.Where(s => s.LabServiceWorkflowVersionId == workflowId).ToList();
                var options = StageOptions(ws).ToDictionary(s => s.Key);
                SampleCompletionForecast Unknown(string stage, string reason, string status = "InsufficientInformation", DateTime? entered = null) =>
                    new(sample.Id, sample.AccessionNumber ?? sample.SubmittedSpecimenId.ToString(), stage, entered, null, null, status, reason, [], policy?.Id, policy?.Revision, calendar?.Revision);
                var release = releases.Where(r => r.SampleId == sample.SubmittedSpecimenId).Select(r => r.ReleasedAtUtc).Min();
                if (release is not null) { sampleResults.Add(new(sample.Id, sample.AccessionNumber ?? sample.SubmittedSpecimenId.ToString(), "Delivered", release, release, 0, "Delivered", "Results available in the Portal.", [])); continue; }
                if (requestedRuns.TryGetValue(sample.SubmittedSpecimenId, out var runCount)
                    && runCount > 1
                    && work.Status != LabWorkOrderStatus.Cancelled)
                { sampleResults.Add(Unknown("Repeated sequencing", "The sample has outstanding purchased runs. Review run progress; a single-run forecast does not cover the full allocation.")); continue; }
                if (work.Status == LabWorkOrderStatus.Cancelled) { sampleResults.Add(Unknown("Cancelled", "The job is cancelled.", "Cancelled")); continue; }
                var sampleExecutions = executions.Where(e => e.LabSpecimenId == sample.Id && e.Status != LabExecutionStatus.Abandoned
                    && (attempt is null || e.LabSpecimenAttemptId == attempt.Id)).ToList();
                var package = packages.Where(p => (p.LabSampleId == sample.SubmittedSpecimenId || p.TrialSampleId == sample.SubmittedSpecimenId)
                        && (attempt == null || attempt.Sequence == 1 || p.CreatedAt >= attempt.CreatedAt))
                    .OrderByDescending(p => p.PackageVersion).FirstOrDefault();
                var activeExecutionIds = sampleExecutions.Select(e => e.Id).ToHashSet();
                var libs = libraries.Where(l => l.LabSpecimenId == sample.Id && (attempt is null || activeExecutionIds.Contains(l.PreparationExecutionId))).ToList();
                var observedLibrary = libs.Where(l => l.Status != LabLibraryStatus.Complete).OrderBy(l => l.Status).FirstOrDefault();
                var observedExecution = sampleExecutions.Where(e => e.Status != LabExecutionStatus.Completed).OrderBy(e => ws.FindIndex(s => s.Id == e.LabServiceWorkflowStageId)).FirstOrDefault();
                var observedStage = package?.State switch {
                    ResultOutputPackageState.ReadyForReview => "Results QC / scientific review",
                    ResultOutputPackageState.ScientificallyApproved or ResultOutputPackageState.ReadyForRelease => "Portal publication",
                    not null => "Data assembly",
                    _ => observedExecution is not null ? ws.FirstOrDefault(s => s.Id == observedExecution.LabServiceWorkflowStageId)?.Name ?? "Protocol execution"
                        : observedLibrary is not null ? observedLibrary.Status == LabLibraryStatus.Prepared ? "Library QC" : "Sequencing"
                        : libs.Count > 0 ? "Data assembly" : sample.AcceptedAtUtc is not null ? "Ready for preparation" : sample.ReceivedAtUtc is not null ? "Scientific acceptance" : "Awaiting receipt"
                };
                var observedEntry = package is not null ? package.State == ResultOutputPackageState.ReadyForReview
                    ? Entered(package.Id, nameof(ResultOutputPackage), nameof(ResultOutputPackageState.ReadyForReview))
                    : package.ScientificallyApprovedAtUtc ?? package.CreatedAt
                    : observedExecution is not null ? observedExecution.StartedAtUtc
                    : observedLibrary is not null ? observedLibrary.Status == LabLibraryStatus.Prepared ? observedLibrary.CreatedAt
                        : Entered(observedLibrary.Id, nameof(LabLibrary), nameof(LabLibraryStatus.QcPassed))
                    : libs.Count > 0 ? libs.Select(l => Entered(l.Id, nameof(LabLibrary), nameof(LabLibraryStatus.Complete))).Max()
                    : sample.AcceptedAtUtc ?? sample.ReceivedAtUtc;
                if (work.Status == LabWorkOrderStatus.OnHold || blockedJobs.Contains(work.Id) || sample.ProcessingState is LabSpecimenProcessingState.OnHold or LabSpecimenProcessingState.Failed
                    || sample.IntakeDisposition is LabSpecimenIntakeDisposition.OnHold or LabSpecimenIntakeDisposition.Rejected || attempt?.State is LabSpecimenAttemptState.OnHold or LabSpecimenAttemptState.Failed)
                { sampleResults.Add(Unknown(observedStage, "Resolve the hold, blocking exception or failed sample/attempt before forecasting completion.", "Blocked", observedEntry)); continue; }
                if (policy is null || calendar is null || policy.LabServiceWorkflowVersionId != workflowId)
                { sampleResults.Add(Unknown(observedStage, "Configure stage durations and apply a timing policy to this job.", entered: observedEntry)); continue; }
                if (sample.ReceivedAtUtc is null) { sampleResults.Add(Unknown("Awaiting receipt", "A reliable arrival date is not recorded.")); continue; }
                if (sampleExecutions.Any(e => e.Status == LabExecutionStatus.Blocked))
                { sampleResults.Add(Unknown(observedStage, "A required execution is blocked.", "Blocked", observedEntry)); continue; }
                if (package?.State is ResultOutputPackageState.Failed or ResultOutputPackageState.Withdrawn)
                { sampleResults.Add(Unknown("Data assembly", "The result package requires correction or rework.", "Blocked")); continue; }
                if (package is not null && (observedExecution is not null || policy.RequiresSequencing && libs.Any(l => l.Status != LabLibraryStatus.Complete)))
                { sampleResults.Add(Unknown(observedStage, "The result package overlaps unfinished preparation or library work; resolve its required delivery path before forecasting.", entered: observedEntry)); continue; }
                var keys = new List<string>(); DateTime? entry = null; string? unknown = null;
                var parallelPaths = new List<(List<string> Keys, DateTime? Entry, Guid? LibraryId)>();
                if (package is not null)
                {
                    if (package.State is ResultOutputPackageState.ScientificallyApproved or ResultOutputPackageState.ReadyForRelease)
                    { keys.Add("delivery"); entry = package.ScientificallyApprovedAtUtc; }
                    else if (package.State == ResultOutputPackageState.ReadyForReview)
                    { keys.AddRange(["qc", "delivery"]); entry = Entered(package.Id, nameof(ResultOutputPackage), nameof(ResultOutputPackageState.ReadyForReview)); }
                    else { keys.AddRange(["assembly", "qc", "delivery"]); entry = package.CreatedAt; }
                }
                else
                {
                    if (sample.AcceptedAtUtc is null) { keys.Add("acceptance"); entry = sample.ReceivedAtUtc; }
                    var skips = attempt?.ReadStageSkips().Select(s => s.StageId).ToHashSet() ?? [];
                    var previous = attempt is { Sequence: > 1 } ? attempt.CreatedAt : sample.AcceptedAtUtc;
                    foreach (var stage in ws)
                    {
                        if (skips.Contains(stage.Id)) continue;
                        var execution = sampleExecutions.Where(e => e.LabServiceWorkflowStageId == stage.Id).OrderByDescending(e => e.StartedAtUtc).FirstOrDefault();
                        if (execution?.Status == LabExecutionStatus.Completed) { previous = execution.CompletedAtUtc; continue; }
                        if (stage.Requirement != LabServiceWorkflowStageRequirement.Required && execution is null)
                            unknown = "Resolve the optional/conditional stage decision before forecasting the full path.";
                        if (keys.Count == 0) entry = previous;
                        keys.Add(stage.Id.ToString());
                    }
                    if (ws.Count == 0) unknown = "The job has no pinned workflow stages.";
                    if (libs.Any(l => l.Status == LabLibraryStatus.Failed)) unknown = "A required library failed; resolve its rework or disposition.";
                    if (policy.RequiresSequencing)
                    {
                        if (keys.Count == 0 && libs.Any(l => l.Status != LabLibraryStatus.Complete))
                        {
                            // Evaluate every unfinished library independently. Shared downstream stages start at
                            // the latest dependency exit, rather than adding parallel work or dropping a branch.
                            foreach (var library in libs.Where(l => l.Status != LabLibraryStatus.Complete))
                            {
                                var prepared = library.Status == LabLibraryStatus.Prepared;
                                parallelPaths.Add((prepared ? ["library-qc", "sequencing", "assembly", "qc", "delivery"]
                                    : ["sequencing", "assembly", "qc", "delivery"],
                                    prepared ? library.CreatedAt : Entered(library.Id, nameof(LabLibrary), nameof(LabLibraryStatus.QcPassed)), library.Id));
                            }
                            entry = parallelPaths[0].Entry;
                            keys.AddRange(parallelPaths[0].Keys.TakeWhile(k => k != "assembly"));
                        }
                        else if (libs.Count == 0 || keys.Count > 0)
                        { if (keys.Count == 0) entry = previous; keys.AddRange(["library-qc", "sequencing"]); }
                        else
                        {
                            var dates = libs.Select(l => Entered(l.Id, nameof(LabLibrary), nameof(LabLibraryStatus.Complete))).ToList();
                            entry = dates.Any(d => d is null) ? null : dates.Max();
                        }
                    }
                    if (keys.Count == 0 && entry is null && !policy.RequiresSequencing) entry = previous;
                    keys.AddRange(["assembly", "qc", "delivery"]);
                }
                var current = options.GetValueOrDefault(keys[0])?.Name ?? keys[0];
                if (unknown is not null || entry is null || parallelPaths.Any(p => p.Entry is null)) { sampleResults.Add(Unknown(current, unknown ?? "The current stage entry time is not recorded; no timestamp has been inferred.")); continue; }
                try
                {
                    if (parallelPaths.Count == 0) parallelPaths.Add((keys, entry, null));
                    var paths = new List<SampleCompletionForecast>();
                    foreach (var path in parallelPaths)
                    {
                        var steps = new List<ForecastStep>(); var cursor = now;
                        foreach (var key in path.Keys)
                        {
                            var duration = policy.Durations.SingleOrDefault(d => d.StageKey == key);
                            if (duration is null) throw new LabForecastCalendarException($"Configure the duration for {options.GetValueOrDefault(key)?.Name ?? key}.");
                            var overrun = false;
                            if (steps.Count == 0) (cursor, overrun) = LabForecastClock.StageExit(path.Entry!.Value, now, duration, calendar);
                            else cursor = LabForecastClock.AddDays(cursor, duration.Days, duration.DayBasis, calendar);
                            if (key == "sequencing")
                            {
                                var sampleLibraryIds = libraries.Where(l => l.LabSpecimenId == sample.Id && l.Status != LabLibraryStatus.Complete
                                    && (path.LibraryId == null || l.Id == path.LibraryId)).Select(l => l.Id).ToHashSet();
                                var sampleBatchIds = batchMembers.Where(m => sampleLibraryIds.Contains(m.LabLibraryId)).Select(m => m.LabOperationalBatchId).ToHashSet();
                                var known = sendouts.Where(s => sampleBatchIds.Contains(s.LabOperationalBatchId)).Select(s => s.ExpectedCompletionAtUtc).Max();
                                if (known > cursor) cursor = known.Value;
                            }
                            steps.Add(new(key, options[key].Name, steps.Count == 0 ? path.Entry : null, cursor, duration.Days, duration.DayBasis.ToString(), overrun));
                        }
                        paths.Add(new(sample.Id, sample.AccessionNumber ?? sample.SubmittedSpecimenId.ToString(), options[path.Keys[0]].Name, path.Entry, cursor,
                            decimal.Round((decimal)(cursor - now).TotalDays, 1), "Estimated", steps.Any(s => s.Overrun)
                                ? "Stage estimate exceeded — using one additional stage day." : "Calculated from recorded progress and configured durations.", steps, policy.Id, policy.Revision, calendar.Revision));
                    }
                    var drivingPath = paths.OrderByDescending(p => p.ExpectedAtUtc).First();
                    if (paths.Count > 1) drivingPath = drivingPath with { Reason = $"Latest of {paths.Count} outstanding library paths. " + drivingPath.Reason };
                    sampleResults.Add(drivingPath);
                }
                catch (LabForecastCalendarException e) { sampleResults.Add(Unknown(current, e.Message, entered: entry)); }
            }
            var outstanding = sampleResults.Where(s => s.Status is not ("Delivered" or "Cancelled")).ToList();
            var estimated = outstanding.Where(s => s.ExpectedAtUtc.HasValue).ToList();
            var complete = sampleResults.Count > 0 && sampleResults.All(s => s.Status == "Delivered");
            var expected = outstanding.Count > 0 && outstanding.Count == estimated.Count ? estimated.Max(s => s.ExpectedAtUtc) : null;
            var status = work.Status == LabWorkOrderStatus.Cancelled ? "Cancelled" : complete ? "Delivered" : expected is not null ? "Estimated"
                : outstanding.Any(s => s.Status == "Blocked") ? "Blocked" : "InsufficientInformation";
            var appliedPolicies = outstanding.Where(s => s.PolicyId.HasValue).Select(s => s.PolicyId!.Value).Distinct().ToArray();
            var jobPolicy = appliedPolicies.Length == 1 ? policies[appliedPolicies[0]] : null;
            result[work.Id] = new(work.Id, jobPolicy?.Id, jobPolicy?.Revision,
                jobPolicy is null ? null : calendars[jobPolicy.LabBusinessCalendarId].Revision, now, expected,
                expected is null ? null : decimal.Round((decimal)(expected.Value - now).TotalDays, 1), status,
                status == "Estimated" ? "Latest expected delivery across all outstanding samples."
                : status == "Delivered" ? "All sample results are available in the Portal."
                : status == "Cancelled" ? "The job is cancelled." : outstanding.FirstOrDefault(s => s.ExpectedAtUtc is null)?.Reason ?? "No samples are available to forecast.",
                estimated.Count, outstanding.Count, expected is null ? [] : estimated.Where(s => s.ExpectedAtUtc == expected).Select(s => s.SampleId).ToList(), sampleResults);
        }
        return result;
    }
}
