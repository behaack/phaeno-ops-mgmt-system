namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class LabJobRow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? CustomerReference { get; set; }
    public string OrganizationName { get; set; } = "";
    public LabWorkOrderStatus OperationalStatus { get; set; }
    public int SampleCount { get; set; }
    public int DeliveredSampleCount { get; set; }
    public DateTime? DueAtUtc { get; set; }
    public DateTime? OriginalDueAtUtc { get; set; }
    public DateTime? ExpectedCompletionAtUtc { get; set; }
    public bool ForecastAdjusted { get; set; }
    public bool DueDateAdjusted { get; set; }
    public DateTime? NextSampleDueAtUtc { get; set; }
    public DateTime? FirstDeliveredAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public bool IsComplete { get; set; }
    public bool HasAcceptedSamples { get; set; }
    public bool IsBlocked { get; set; }
    public DateTime? CompletionDeadlineAtUtc { get; set; }
    public int? TurnaroundDays { get; set; }
    public string TurnaroundPolicyKey { get; set; } = "";
    public int ServiceVersion { get; set; }
    public long Version { get; set; }
    public DateTime OrderCreatedAtUtc { get; set; }
    public int OutstandingStage { get; set; }
    public bool HasAttributedProgress { get; set; }
    public bool OutstandingSamplesSucceeded { get; set; }
}

public sealed record LabJobRelease(Guid SampleId, DateTime? ReleasedAtUtc)
{
    public LabJobRelease() : this(Guid.Empty, null) { }
}
public sealed class LabJobQueueItem
{
    public JobCompletionForecast? Forecast { get; set; }
    public LabJobRow Job { get; set; } = null!;
    public string DeadlineStatus { get; set; } = "";
    public string Reason { get; set; } = "";
    public string JobStatus { get; set; } = "";
}
public sealed record LabJobQueue(IReadOnlyList<LabJobQueueItem> Items, int TotalCount, int Page, int PageSize,
    IReadOnlyDictionary<string, int> Counts, DateTime EvaluatedAtUtc);

public sealed class LabJobQuery(PSeqOperationsDbContext db)
{
    // Release gates establish availability. Expiration of the agreed download period does
    // not undo delivery, but an explicit withdrawal removes that release's coverage.
    public IQueryable<LabJobRelease> Releases() =>
        db.LabResultReleases.AsNoTracking()
            .Where(r => r.ReleaseStatus == FileReleaseStatus.Released && r.ReleasedAt != null)
            .Select(r => new LabJobRelease { SampleId = r.LabSampleId, ReleasedAtUtc = r.ReleasedAt })
        .Concat(db.ResultOutputPackages.AsNoTracking()
            .Where(p => p.TrialSampleId != null && p.State == ResultOutputPackageState.Released
                && p.ReleasedAtUtc != null
                && db.TrialResultFiles.Any(f => f.ResultOutputPackageId == p.Id)
                && !db.TrialResultFiles.Any(f => f.ResultOutputPackageId == p.Id
                    && db.ManagedOperationalFiles.Any(m => m.Id == f.ManagedOperationalFileId
                        && m.ReleaseStatus != FileReleaseStatus.Released)))
            .Select(p => new LabJobRelease { SampleId = p.TrialSampleId!.Value, ReleasedAtUtc = p.ReleasedAtUtc }));

    // Queue eligibility does not restrict direct job details or delivery recording.
    public IQueryable<LabJobRow> QueueRows() => Rows().Where(j =>
        db.SampleShipments.Any(s => s.LabWorkOrderId == j.Id && !s.IsPackingPool
            && (s.Status == SampleShipmentStatus.Shipped || s.Status == SampleShipmentStatus.Delivered
                || s.Status == SampleShipmentStatus.Received) && s.Items.Any())
        || db.LabSpecimens.Any(s => s.LabWorkOrderId == j.Id && s.ReceivedAtUtc != null
            && s.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled));

    public IQueryable<LabJobRow> Rows()
    {
        var releases = Releases();
        var samples = db.LabSpecimens.AsNoTracking()
            .Where(s => s.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled)
            .Select(s => new { s.LabWorkOrderId, s.AcceptedAtUtc, s.OriginalTargetAtUtc, s.ProcessingState,
                ReleasedAt = releases.Where(r => r.SampleId == s.SubmittedSpecimenId).Min(r => r.ReleasedAtUtc),
                Stage = releases.Any(r => r.SampleId == s.SubmittedSpecimenId) ? 8
                    : db.ResultOutputPackages.Any(p => p.LabWorkOrderId == s.LabWorkOrderId && (p.LabSampleId == s.SubmittedSpecimenId || p.TrialSampleId == s.SubmittedSpecimenId)
                        && (p.State == ResultOutputPackageState.ScientificallyApproved || p.State == ResultOutputPackageState.ReadyForRelease)) ? 7
                    : db.ResultOutputPackages.Any(p => p.LabWorkOrderId == s.LabWorkOrderId && (p.LabSampleId == s.SubmittedSpecimenId || p.TrialSampleId == s.SubmittedSpecimenId)
                        && p.State == ResultOutputPackageState.ReadyForReview) ? 6
                    : db.ResultOutputPackages.Any(p => p.LabWorkOrderId == s.LabWorkOrderId && (p.LabSampleId == s.SubmittedSpecimenId || p.TrialSampleId == s.SubmittedSpecimenId)
                        && (p.State == ResultOutputPackageState.Uploading || p.State == ResultOutputPackageState.Scanning || p.State == ResultOutputPackageState.Failed || p.State == ResultOutputPackageState.Withdrawn))
                        || db.LabLibraries.Any(l => l.LabSpecimenId == s.Id && l.Status == LabLibraryStatus.Complete) ? 5
                    : db.LabLibraries.Any(l => l.LabSpecimenId == s.Id && (l.Status == LabLibraryStatus.Batched || l.Status == LabLibraryStatus.SentForSequencing)) ? 4
                    : db.LabLibraries.Any(l => l.LabSpecimenId == s.Id)
                        || db.LabSpecimenAttempts.Any(a => a.LabSpecimenId == s.Id && a.StartedAtUtc != null && a.State != LabSpecimenAttemptState.Cancelled)
                        || db.LabProtocolExecutions.Any(e => e.LabSpecimenId == s.Id && e.StartedAtUtc != null && e.Status != LabExecutionStatus.Abandoned) ? 3
                    : s.AcceptedAtUtc != null ? 2 : s.ReceivedAtUtc != null ? 1 : 0 });
        return db.LabWorkOrders.AsNoTracking().Select(w => new LabJobRow
        {
            Id = w.Id,
            Name = db.LabServiceOrders.Where(o => w.AuthorizationSource == LabAuthorizationSource.CommercialOrder
                && o.Id == w.AuthorizationSourceId && o.OrganizationId == w.SubmittingOrganizationId)
                .Select(o => o.OrderNumber).FirstOrDefault() ?? w.OpaqueSubmitterReference ?? "Job",
            CustomerReference = db.LabServiceOrders.Where(o => w.AuthorizationSource == LabAuthorizationSource.CommercialOrder
                && o.Id == w.AuthorizationSourceId && o.OrganizationId == w.SubmittingOrganizationId)
                .Select(o => o.CustomerReference).FirstOrDefault(),
            OrganizationName = db.Organizations.Where(o => o.Id == w.SubmittingOrganizationId).Select(o => o.Name).FirstOrDefault() ?? "",
            OperationalStatus = w.Status, Version = w.Version,
            OrderCreatedAtUtc = db.LabServiceOrders.Where(o => w.AuthorizationSource == LabAuthorizationSource.CommercialOrder
                && o.Id == w.AuthorizationSourceId && o.OrganizationId == w.SubmittingOrganizationId).Select(o => (DateTime?)o.CreatedAt).FirstOrDefault()
                ?? db.TrialProjects.Where(p => w.AuthorizationSource == LabAuthorizationSource.TrialProject && p.Id == w.AuthorizationSourceId)
                    .Select(p => (DateTime?)p.CreatedAt).FirstOrDefault() ?? w.CreatedAt,
            OutstandingStage = samples.Where(s => s.LabWorkOrderId == w.Id && s.ReleasedAt == null).Select(s => (int?)s.Stage).Min() ?? 0,
            HasAttributedProgress = samples.Any(s => s.LabWorkOrderId == w.Id && s.Stage >= 3),
            OutstandingSamplesSucceeded = samples.Any(s => s.LabWorkOrderId == w.Id && s.ReleasedAt == null)
                && !samples.Any(s => s.LabWorkOrderId == w.Id && s.ReleasedAt == null && s.ProcessingState != LabSpecimenProcessingState.Succeeded),
            DueAtUtc = w.AdjustedDeliveryDueAtUtc ?? w.OriginalDeliveryDueAtUtc,
            OriginalDueAtUtc = w.OriginalDeliveryDueAtUtc,
            DueDateAdjusted = w.AdjustedDeliveryDueAtUtc != null,
            ExpectedCompletionAtUtc = w.ExpectedCompletionAtUtc, ForecastAdjusted = w.HasTimingOverride,
            FirstDeliveredAtUtc = w.FirstDeliveredAtUtc,
            CompletionDeadlineAtUtc = w.FirstDeliveredAtUtc != null ? w.DeliveryDueAtFirstDeliveryUtc
                : w.AdjustedDeliveryDueAtUtc ?? w.OriginalDeliveryDueAtUtc,
            TurnaroundDays = w.MaximumTurnaroundDays, TurnaroundPolicyKey = w.TurnaroundPolicyKey, ServiceVersion = w.ServiceVersion,
            SampleCount = samples.Count(s => s.LabWorkOrderId == w.Id),
            DeliveredSampleCount = samples.Count(s => s.LabWorkOrderId == w.Id && s.ReleasedAt != null),
            IsComplete = samples.Any(s => s.LabWorkOrderId == w.Id)
                && !samples.Any(s => s.LabWorkOrderId == w.Id && s.ReleasedAt == null),
            CompletedAtUtc = samples.Any(s => s.LabWorkOrderId == w.Id)
                && !samples.Any(s => s.LabWorkOrderId == w.Id && s.ReleasedAt == null)
                ? w.FirstDeliveredAtUtc ?? samples.Where(s => s.LabWorkOrderId == w.Id).Max(s => s.ReleasedAt) : null,
            NextSampleDueAtUtc = samples.Where(s => s.LabWorkOrderId == w.Id && s.ReleasedAt == null).Min(s => s.OriginalTargetAtUtc),
            HasAcceptedSamples = samples.Any(s => s.LabWorkOrderId == w.Id && s.AcceptedAtUtc != null),
            IsBlocked = w.Status == LabWorkOrderStatus.OnHold || db.LabExceptions.Any(e => e.LabWorkOrderId == w.Id
                && e.Status == LabExceptionStatus.Open && e.IsBlocking)
        });
    }

    public static IQueryable<LabJobQueueItem> Classify(IQueryable<LabJobRow> rows, DateTime now)
    {
        var soon = now.AddDays(3);
        return rows.Select(j => new LabJobQueueItem { Job = j, JobStatus =
            j.OperationalStatus == LabWorkOrderStatus.Cancelled ? "Cancelled" : j.IsComplete ? "Delivered"
            : j.OperationalStatus == LabWorkOrderStatus.OnHold ? "OnHold"
            : j.OutstandingStage == 7 ? "AwaitingDelivery" : j.OutstandingStage == 6 ? "QualityReview"
            : j.OutstandingStage == 5 ? "DataProcessing" : j.OutstandingStage == 4 ? "Sequencing"
            : j.OutstandingStage == 3 ? "LibraryPreparation"
            : j.OutstandingStage == 0 ? "AwaitingReceipt" : j.OutstandingStage == 1 ? "AwaitingAcceptance"
            : !j.HasAttributedProgress && j.OperationalStatus == LabWorkOrderStatus.ReadyForRelease && j.OutstandingSamplesSucceeded ? "AwaitingDelivery"
            : !j.HasAttributedProgress && j.OperationalStatus == LabWorkOrderStatus.ScientificReview ? "QualityReview"
            : !j.HasAttributedProgress && j.OperationalStatus == LabWorkOrderStatus.DataProcessing ? "DataProcessing"
            : !j.HasAttributedProgress && j.OperationalStatus == LabWorkOrderStatus.AwaitingExternalSequencing ? "Sequencing"
            : !j.HasAttributedProgress && j.OperationalStatus == LabWorkOrderStatus.Processing ? "LibraryPreparation" : "ReadyForPreparation",
            DeadlineStatus =
            j.OperationalStatus == LabWorkOrderStatus.Cancelled ? "Cancelled"
            : j.IsComplete ? j.FirstDeliveredAtUtc == null ? "CompleteUnverified" : j.CompletionDeadlineAtUtc == null ? "CompleteUndated"
                : j.CompletedAtUtc > j.CompletionDeadlineAtUtc ? "CompleteLate" : "CompleteOnTime"
            : j.DueAtUtc == null ? j.HasAcceptedSamples ? "AtRisk" : "AwaitingAcceptance"
            : j.DueAtUtc < now ? "Overdue"
            : j.IsBlocked || j.ExpectedCompletionAtUtc > j.DueAtUtc || j.NextSampleDueAtUtc < now ? "AtRisk"
            : j.DueAtUtc <= soon || j.NextSampleDueAtUtc <= soon ? "DueSoon" : "NoKnownRisk", Reason =
            j.OperationalStatus == LabWorkOrderStatus.Cancelled ? "Cancelled; not counted as successful delivery."
            : j.IsComplete ? "Results for every sample have been published to the Portal."
            : j.DueAtUtc == null ? j.HasAcceptedSamples ? "A required delivery due date is missing. Set it from the job's Actions menu." : "The acceptance-based turnaround clock has not started."
            : j.DueAtUtc < now ? "The delivery deadline has passed; results remain outstanding."
            : j.IsBlocked ? "An open blocking exception or hold needs attention."
            : j.ExpectedCompletionAtUtc > j.DueAtUtc ? "Expected completion is later than the delivery due date."
            : j.NextSampleDueAtUtc < now ? "An unfinished sample has passed its original turnaround target."
            : j.DueAtUtc <= soon || j.NextSampleDueAtUtc <= soon ? "A delivery or sample target falls within three calendar days."
            : "No deadline risk is recorded; the baseline is not a progress forecast." });
    }
}
