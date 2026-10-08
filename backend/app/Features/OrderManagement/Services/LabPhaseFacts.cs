namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed record LabPhaseSampleDto(Guid Id, Guid? PhaseId, string Name, string Stage,
    bool CanRephase, bool Held, bool Failed);
public sealed record LabPhaseDto(Guid Id, int Position, string Name, int SampleCount,
    int? TurnaroundBusinessDays, decimal AcceptedSubtotal, decimal CarriedInvoicedSubtotal,
    decimal InvoicedSubtotal, string Lifecycle, bool MixedProgress,
    IReadOnlyDictionary<string, int> StageCounts, int HeldSamples, int FailedSamples,
    int ContainerCount, int SentContainers, int ArrivedContainers,
    int ExpectedTubes, int ReceivedTubes, int AccessionedTubes, int DeliveredSamples,
    DateTime? FirstReceiptAtUtc, DateTime? CompleteReceiptAtUtc, DateTime? OriginalDueAtUtc,
    DateTime? DueAtUtc, DateTime? StartedAtUtc, DateTime? FirstDeliveredAtUtc,
    bool CalendarPending, bool CancellationEligible, bool CancellationPending,
    IReadOnlyList<Guid> SampleIds, string PriceLinesJson, LabPhaseScope? Scope = null,
    decimal? ProposedUnitPrice = null, string? PriceProposalNote = null, decimal? ProposedAdditionalRunPrice = null);
public sealed record LabPhaseProposalDto(Guid Id, string BeforeJson, string AfterJson,
    string Reason, string Status, DateTime ProposedAtUtc, DateTime? DecidedAtUtc,
    string? DecisionReason, long Version);
public sealed record LabPhaseCancellationDto(Guid Id, Guid PhaseId, string Reason,
    string Status, string? DecisionReason, DateTime RequestedAtUtc, long Version);
public sealed record LabPhasePlanDto(Guid OrderId, int Revision, int SampleCount,
    decimal AcceptedSubtotal, string Currency, IReadOnlyList<LabPhaseDto> Phases,
    IReadOnlyList<LabPhaseSampleDto> Samples, IReadOnlyList<LabPhaseProposalDto> Proposals,
    IReadOnlyList<LabPhaseCancellationDto> Cancellations);

// Callers establish organization/Department or internal business-role authority first.
// Shipping, physical tubes, executions and released outputs remain authoritative.
public sealed class LabPhaseFacts(PSeqOperationsDbContext db)
{
    public async Task<LabPhasePlanDto> ReadAsync(Guid orderId, CancellationToken ct)
        => (await ReadManyAsync([orderId], ct))[orderId];

    public async Task<IReadOnlyDictionary<Guid, LabPhasePlanDto>> ReadManyAsync(IReadOnlyCollection<Guid> orderIds, CancellationToken ct)
    {
        var orders = await db.LabServiceOrders.AsNoTracking().Include(x => x.Quotes)
            .Where(x => orderIds.Contains(x.Id)).ToListAsync(ct);
        var phases = await db.Set<LabJobPhase>().AsNoTracking().Where(x => orderIds.Contains(x.LabServiceOrderId)
            && x.SupersededAtUtc == null).OrderBy(x => x.Position).ToListAsync(ct);
        var samples = await db.LabSamples.AsNoTracking().Where(x => orderIds.Contains(x.LabServiceOrderId))
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id).ToListAsync(ct);
        var ids = samples.Select(x => x.Id).ToArray();
        var specimens = await db.LabSpecimens.AsNoTracking().Where(x => ids.Contains(x.SubmittedSpecimenId)).ToListAsync(ct);
        var specimenIds = specimens.Select(x => x.Id).ToArray();
        var attempts = await db.LabSpecimenAttempts.AsNoTracking().Where(x => specimenIds.Contains(x.LabSpecimenId)
            && x.StartedAtUtc != null).ToListAsync(ct);
        var executions = await db.LabProtocolExecutions.AsNoTracking().Where(x => x.LabSpecimenId != null
            && specimenIds.Contains(x.LabSpecimenId.Value) && x.StartedAtUtc != null).ToListAsync(ct);
        var customerHolds = await db.LabCustomerHolds.AsNoTracking().Where(h => specimenIds.Contains(h.LabSpecimenId) && h.State != "Released").Select(h => h.LabSpecimenId).ToListAsync(ct);
        var analysisRuns = await db.LabAnalysisRuns.AsNoTracking().Where(a => specimenIds.Contains(a.LabSpecimenId)).Select(a => a.LabSpecimenId).ToListAsync(ct);
        var assemblies = await db.Set<LabAssemblyJob>().AsNoTracking().Where(a => specimenIds.Contains(a.LabSpecimenId)).Select(a => a.LabSpecimenId).ToListAsync(ct);
        var libraries = await db.LabLibraries.AsNoTracking().Where(x => specimenIds.Contains(x.LabSpecimenId)).ToListAsync(ct);
        var packages = await db.ResultOutputPackages.AsNoTracking().Where(x => x.LabServiceOrderId.HasValue && orderIds.Contains(x.LabServiceOrderId.Value)).ToListAsync(ct);
        var releases = await new LabJobQuery(db).Releases().Where(x => ids.Contains(x.SampleId)).ToListAsync(ct);
        var delivered = releases.Select(x => x.SampleId).ToHashSet();
        var shipments = await db.SampleShipments.AsNoTracking().Include(x => x.Items).ThenInclude(x => x.TubeSlots)
            .Where(x => x.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder
                && orderIds.Contains(x.AuthorizationSourceId) && !x.IsPackingPool).ToListAsync(ct);
        var tubeIds = shipments.SelectMany(x => x.Items).SelectMany(x => x.TubeSlots)
            .Where(x => x.RegisteredSampleTubeId.HasValue).Select(x => x.RegisteredSampleTubeId!.Value).Distinct().ToArray();
        var tubes = await db.RegisteredSampleTubes.AsNoTracking().Where(x => tubeIds.Contains(x.Id)).ToListAsync(ct);
        var phaseIds = phases.Select(x => x.Id).ToArray();
        var cancellation = await db.Set<LabPhaseCancellationRequest>().AsNoTracking()
            .Where(x => phaseIds.Contains(x.LabJobPhaseId)).ToListAsync(ct);
        var billed = await (from assignment in db.Set<LabPhaseBillingAssignment>().AsNoTracking()
            join allocation in db.Set<LabPhaseInvoiceAllocation>().AsNoTracking() on assignment.LabPhaseInvoiceAllocationId equals allocation.Id
            join invoice in db.Invoices.AsNoTracking() on allocation.InvoiceId equals invoice.Id
            where phaseIds.Contains(assignment.LabJobPhaseId) && assignment.SupersededAtUtc == null && invoice.Status != InvoiceStatus.Voided
            select new { assignment.LabJobPhaseId, OriginalPhaseId = allocation.LabJobPhaseId, assignment.Subtotal }).ToListAsync(ct);
        var sampleFacts = samples.Select(sample =>
        {
            var specimen = specimens.SingleOrDefault(x => x.SubmittedSpecimenId == sample.Id);
            var sampleLibraries = libraries.Where(x => x.LabSpecimenId == specimen?.Id).ToArray();
            var samplePackages = packages.Where(x => x.LabSampleId == sample.Id).Select(x => x.State).ToArray();
            var started = specimen != null && (attempts.Any(x => x.LabSpecimenId == specimen.Id)
                || executions.Any(x => x.LabSpecimenId == specimen.Id) || analysisRuns.Contains(specimen.Id) || assemblies.Contains(specimen.Id) || sampleLibraries.Length > 0);
            var itemShipments = shipments.Where(x => x.Items.Any(i => i.SubmittedSpecimenId == sample.Id)).ToArray();
            var sampleTubeIds = itemShipments.SelectMany(x => x.Items).Where(x => x.SubmittedSpecimenId == sample.Id)
                .SelectMany(x => x.TubeSlots).Select(x => x.RegisteredSampleTubeId).ToArray();
            var received = sample.ReceivedAt.HasValue || specimen?.ReceivedAtUtc != null
                || tubes.Any(x => sampleTubeIds.Contains(x.Id) && (x.ReceivedAt != null || x.AccessionedAt != null));
            var sent = sample.CustomerShippedAt.HasValue || itemShipments.Any(x => x.ShippedAt.HasValue
                || x.Status is SampleShipmentStatus.Shipped or SampleShipmentStatus.Delivered or SampleShipmentStatus.Received);
            var stage = sample.Status == LabSampleStatus.Cancelled ? "Cancelled" : delivered.Contains(sample.Id) ? "Delivered"
                : samplePackages.Any(x => x is ResultOutputPackageState.ScientificallyApproved or ResultOutputPackageState.ReadyForRelease) ? "AwaitingDelivery"
                : samplePackages.Contains(ResultOutputPackageState.ReadyForReview) ? "QualityReview"
                : samplePackages.Any(x => x is ResultOutputPackageState.Uploading or ResultOutputPackageState.Scanning)
                    || sampleLibraries.Any(x => x.Status == LabLibraryStatus.Complete) ? "DataProcessing"
                : sampleLibraries.Any(x => x.Status is LabLibraryStatus.Batched or LabLibraryStatus.SentForSequencing) ? "Sequencing"
                : started ? "LibraryPreparation"
                : specimen?.AcceptedAtUtc != null ? "ReadyForPreparation"
                : received ? "AwaitingAcceptance" : "AwaitingReceipt";
            var held = sample.Status == LabSampleStatus.OnHold || specimen?.IntakeDisposition == LabSpecimenIntakeDisposition.OnHold || specimen != null && customerHolds.Contains(specimen.Id);
            var failed = sample.Status is LabSampleStatus.Failed or LabSampleStatus.Rejected
                || specimen?.IntakeDisposition == LabSpecimenIntakeDisposition.Rejected || specimen?.ProcessingState == LabSpecimenProcessingState.Failed;
            return new LabPhaseSampleDto(sample.Id, sample.LabJobPhaseId, sample.CustomerSampleId, stage,
                !sent && !received && !started && !delivered.Contains(sample.Id) && sample.Status == LabSampleStatus.Expected, held, failed);
        }).ToArray();
        var allProposals = await db.Set<LabPhasePlanProposal>().AsNoTracking().Where(x => orderIds.Contains(x.LabServiceOrderId))
            .OrderByDescending(x => x.ProposedAtUtc).ToListAsync(ct);
        var result = new Dictionary<Guid, LabPhasePlanDto>();
        foreach (var order in orders)
        {
        var rows = phases.Where(p => p.LabServiceOrderId == order.Id).Select(phase =>
        {
            var members = sampleFacts.Where(x => x.PhaseId == phase.Id).ToArray();
            var memberIds = members.Select(x => x.Id).ToHashSet();
            var related = shipments.Where(x => x.Status != SampleShipmentStatus.Cancelled && x.Items.Any(i => memberIds.Contains(i.SubmittedSpecimenId))).ToArray();
            var slots = related.SelectMany(x => x.Items).Where(x => memberIds.Contains(x.SubmittedSpecimenId))
                .SelectMany(x => x.TubeSlots).ToArray();
            var registered = slots.Where(x => x.RegisteredSampleTubeId.HasValue).Select(x => x.RegisteredSampleTubeId!.Value).Distinct().ToHashSet();
            var physical = tubes.Where(x => registered.Contains(x.Id)).ToArray();
            var received = physical.Count(x => x.ReceivedAt.HasValue);
            var phaseDelivered = members.Count(x => x.Stage == "Delivered");
            var pending = cancellation.Any(x => x.LabJobPhaseId == phase.Id && x.Status == "Pending");
            var lifecycle = phase.CancelledAtUtc.HasValue ? "Cancelled"
                : members.Length == phase.SampleCount && phaseDelivered == phase.SampleCount ? "ResultsDelivered"
                : phase.StartedAtUtc.HasValue || members.Any(x => x.Stage is "LibraryPreparation" or "Sequencing" or "DataProcessing" or "QualityReview" or "AwaitingDelivery" or "Delivered") ? "InProgress" : "Planned";
            var counts = members.GroupBy(x => x.Stage).ToDictionary(x => x.Key, x => x.Count());
            if (members.Length < phase.SampleCount)
            {
                var missingStage = phase.CancelledAtUtc.HasValue ? "Cancelled" : "AwaitingReceipt";
                counts[missingStage] = counts.GetValueOrDefault(missingStage) + phase.SampleCount - members.Length;
            }
            return new LabPhaseDto(phase.Id, phase.Position, phase.Name, phase.SampleCount,
                phase.TurnaroundBusinessDays, phase.AcceptedSubtotal, billed.Where(x => x.LabJobPhaseId == phase.Id && x.OriginalPhaseId != phase.Id).Sum(x => x.Subtotal),
                billed.Where(x => x.LabJobPhaseId == phase.Id).Sum(x => x.Subtotal),
                lifecycle, counts.Count > 1, counts, members.Count(x => x.Held), members.Count(x => x.Failed),
                related.Length, related.Count(x => x.ShippedAt.HasValue || x.Status is SampleShipmentStatus.Shipped or SampleShipmentStatus.Delivered or SampleShipmentStatus.Received), related.Count(x => x.DeliveredAt.HasValue || x.ReceivedAt.HasValue),
                samples.Where(s => memberIds.Contains(s.Id)).Sum(s => (int)s.Quantity), received, physical.Count(x => x.AccessionedAt.HasValue), phaseDelivered,
                phase.FirstReceiptAtUtc, phase.CompleteReceiptAtUtc, phase.OriginalDueAtUtc,
                phase.AdjustedDueAtUtc ?? phase.OriginalDueAtUtc, phase.StartedAtUtc, phase.FirstDeliveredAtUtc,
                phase.CompleteReceiptAtUtc.HasValue && phase.OriginalDueAtUtc == null,
                phase.CancelledAtUtc == null && phase.StartedAtUtc == null && phase.FirstDeliveredAtUtc == null
                    && phase.FirstReceiptAtUtc == null && !members.Any(x => x.Stage != "AwaitingReceipt") && !physical.Any(x => x.ReceivedAt != null || x.AccessionedAt != null)
                    && !samples.Any(x => memberIds.Contains(x.Id) && x.ReceivedAt != null)
                    && !specimens.Any(x => memberIds.Contains(x.SubmittedSpecimenId) && x.ReceivedAtUtc != null),
                pending, members.Select(x => x.Id).ToArray(), phase.PriceLinesJson, phase.ReadScope(), phase.ProposedUnitPrice, phase.PriceProposalNote, phase.ProposedAdditionalRunPrice);
        }).ToArray();
        var proposals = allProposals.Where(x => x.LabServiceOrderId == order.Id).Select(x => new LabPhaseProposalDto(x.Id, x.BeforeJson, x.AfterJson,
                x.Reason, x.Status, x.ProposedAtUtc, x.DecidedAtUtc, x.DecisionReason, x.Version)).ToArray();
        var accepted = order.Quotes.Where(x => x.Id == order.AcceptedQuoteId || x.Purpose == QuotePurpose.Change && x.Status == QuoteStatus.Accepted).ToArray();
        result[order.Id] = new(order.Id, order.PhasePlanRevision, order.RequestedSpecimenCount,
            accepted.Sum(x => x.Subtotal), accepted.FirstOrDefault()?.Currency ?? "USD", rows, sampleFacts.Where(x => samples.Any(s => s.Id == x.Id && s.LabServiceOrderId == order.Id)).ToArray(), proposals,
            cancellation.Where(x => rows.Any(p => p.Id == x.LabJobPhaseId)).Select(x => new LabPhaseCancellationDto(x.Id, x.LabJobPhaseId, x.Reason, x.Status,
                x.DecisionReason, x.RequestedAtUtc, x.Version)).ToArray());
        }
        return result;
    }
}
