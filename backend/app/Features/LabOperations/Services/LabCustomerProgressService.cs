namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record LabCustomerSampleStage(Guid SampleId, string Stage);
public sealed record LabCustomerStageCount(string Stage, int Count);
public sealed record LabCustomerProgress(string CurrentStage, string? JobStage,
    bool HasContainerReceipt, IReadOnlyList<LabCustomerStageCount> Counts,
    IReadOnlyList<LabCustomerSampleStage> Samples);

// This boundary returns only customer-safe stage facts for orders already scoped by the caller.
public sealed class LabCustomerProgressService(PSeqOperationsDbContext db)
{
    public static readonly string[] Stages = ["Received", "LibraryPrep", "Sequencing", "DataAssembly", "QualityReview", "ResultsAvailable"];

    public async Task<Dictionary<Guid, LabCustomerProgress>> ReadAsync(Guid organizationId,
        IReadOnlyCollection<Guid> authorizedOrderIds, CancellationToken cancellationToken)
    {
        if (authorizedOrderIds.Count == 0) return [];
        var works = await (from authorization in db.CommercialLabAuthorizations.AsNoTracking()
            join work in db.LabWorkOrders.AsNoTracking() on authorization.LabWorkOrderId equals work.Id
            where authorization.OrganizationId == organizationId && work.SubmittingOrganizationId == organizationId
                && authorizedOrderIds.Contains(authorization.CommercialOrderId)
                && work.AuthorizationId == authorization.AuthorizationId
                && work.AuthorizationSource == LabAuthorizationSource.CommercialOrder
                && work.AuthorizationSourceId == authorization.CommercialOrderId
            select new { OrderId = authorization.CommercialOrderId, work.Id, work.Status }).ToListAsync(cancellationToken);
        var workIds = works.Select(work => work.Id).ToArray();
        var orderIds = works.Select(work => work.OrderId).ToArray();
        var samples = await db.LabSamples.AsNoTracking().Where(sample => orderIds.Contains(sample.LabServiceOrderId))
            .Select(sample => new { sample.Id, sample.LabServiceOrderId, sample.Status, sample.ReceivedAt }).ToListAsync(cancellationToken);
        var specimens = await db.LabSpecimens.AsNoTracking().Where(specimen => workIds.Contains(specimen.LabWorkOrderId))
            .Select(specimen => new { specimen.Id, specimen.LabWorkOrderId, specimen.SubmittedSpecimenId,
                specimen.ReceivedAtUtc, specimen.IntakeDisposition }).ToListAsync(cancellationToken);
        var executions = await db.LabProtocolExecutions.AsNoTracking()
            .Where(execution => workIds.Contains(execution.LabWorkOrderId) && execution.StartedAtUtc.HasValue
                && execution.Status != LabExecutionStatus.Abandoned)
            .Select(execution => new { execution.LabWorkOrderId, execution.LabSpecimenId }).ToListAsync(cancellationToken);
        var libraries = await db.LabLibraries.AsNoTracking().Where(library => workIds.Contains(library.LabWorkOrderId))
            .Select(library => new { library.Id, library.LabWorkOrderId, library.LabSpecimenId, library.Status }).ToListAsync(cancellationToken);
        var sequencing = await (from member in db.LabBatchMembers.AsNoTracking()
            join sendout in db.LabNgsSendouts.AsNoTracking() on member.LabOperationalBatchId equals sendout.LabOperationalBatchId
            where workIds.Contains(member.LabWorkOrderId)
                && (sendout.Status == LabNgsSendoutStatus.Sequencing || sendout.Status == LabNgsSendoutStatus.Complete)
            select member.LabLibraryId).Distinct().ToListAsync(cancellationToken);
        var packages = await db.ResultOutputPackages.AsNoTracking()
            .Where(package => package.OrganizationId == organizationId && package.LabServiceOrderId.HasValue
                && orderIds.Contains(package.LabServiceOrderId.Value) && workIds.Contains(package.LabWorkOrderId))
            .Select(package => new { package.LabServiceOrderId, package.LabWorkOrderId, package.LabSampleId, package.State }).ToListAsync(cancellationToken);
        var released = await db.LabResultReleases.AsNoTracking()
            .Where(release => orderIds.Contains(release.LabServiceOrderId) && release.ReleaseStatus == FileReleaseStatus.Released
                && release.ReleasedAt.HasValue)
            .Select(release => release.LabSampleId).Distinct().ToListAsync(cancellationToken);
        var arrivals = await db.SampleShipments.AsNoTracking()
            .Where(shipment => shipment.OrganizationId == organizationId
                && workIds.Contains(shipment.LabWorkOrderId) && !shipment.IsPackingPool
                && shipment.Status != SampleShipmentStatus.Cancelled && (shipment.DeliveredAt.HasValue || shipment.ReceivedAt.HasValue))
            .Select(shipment => shipment.LabWorkOrderId).Distinct().ToListAsync(cancellationToken);

        return works.ToDictionary(work => work.OrderId, work =>
        {
            var sampleStages = samples.Where(sample => sample.LabServiceOrderId == work.OrderId).Select(sample =>
            {
                var specimen = specimens.SingleOrDefault(item => item.LabWorkOrderId == work.Id && item.SubmittedSpecimenId == sample.Id);
                var sampleLibraries = libraries.Where(item => item.LabWorkOrderId == work.Id && item.LabSpecimenId == specimen?.Id).ToArray();
                var samplePackages = packages.Where(item => item.LabServiceOrderId == work.OrderId
                    && item.LabWorkOrderId == work.Id && item.LabSampleId == sample.Id).Select(item => item.State).ToArray();
                var stage = ResolveSampleStage(sample.Status.ToString(), specimen?.IntakeDisposition.ToString(),
                    sample.ReceivedAt.HasValue || specimen?.ReceivedAtUtc is not null,
                    sampleLibraries.Length > 0 || executions.Any(item => item.LabWorkOrderId == work.Id
                        && item.LabSpecimenId.HasValue && item.LabSpecimenId == specimen?.Id),
                    sampleLibraries.Length > 0 && sampleLibraries.All(item => sequencing.Contains(item.Id)), samplePackages.Select(item => item.ToString()).ToArray(),
                    released.Contains(sample.Id));
                return new LabCustomerSampleStage(sample.Id, stage);
            }).ToArray();
            var jobStage = work.Status switch
            {
                LabWorkOrderStatus.Received => "Received",
                LabWorkOrderStatus.Processing => "LibraryPrep",
                LabWorkOrderStatus.DataProcessing => "DataAssembly",
                LabWorkOrderStatus.ScientificReview or LabWorkOrderStatus.ReadyForRelease => "QualityReview",
                LabWorkOrderStatus.OnHold => "OnHold",
                _ => null
            };
            return Summarize(sampleStages, jobStage, arrivals.Contains(work.Id));
        });
    }

    public static string ResolveSampleStage(string status, string? disposition, bool received,
        bool preparationStarted, bool sequencingStarted, IReadOnlyCollection<string> packages, bool legacyReleased)
    {
        if (status == "OnHold" || disposition == "OnHold") return "OnHold";
        if (status == "Rejected" || disposition == "Rejected") return "NeedsAttention";
        if (disposition == "Cancelled") return "Cancelled";
        if (legacyReleased || packages.Contains("Released")) return "ResultsAvailable";
        if (packages.Any(state => state is "ReadyForReview" or "ScientificallyApproved" or "ReadyForRelease")) return "QualityReview";
        if (status == "DataProcessing" || packages.Any(state => state is "Uploading" or "Scanning")) return "DataAssembly";
        if (sequencingStarted) return "Sequencing";
        if (preparationStarted || status == "LabAnalysis") return "LibraryPrep";
        return received ? "Received" : "AwaitingReceipt";
    }

    public static LabCustomerProgress Summarize(IReadOnlyList<LabCustomerSampleStage> samples, string? jobStage, bool arrived)
    {
        var counts = samples.GroupBy(sample => sample.Stage).Select(group => new LabCustomerStageCount(group.Key, group.Count())).ToArray();
        var active = samples.Where(sample => sample.Stage != "Cancelled").ToArray();
        var indices = active.Select(sample => Array.IndexOf(Stages, sample.Stage)).Where(index => index >= 0).ToArray();
        var current = jobStage == "OnHold" ? "OnHold"
            : active.Length > 0 && active.All(sample => sample.Stage == "ResultsAvailable") ? "ResultsAvailable"
            : active.Any(sample => sample.Stage is "OnHold" or "NeedsAttention") ? "NeedsAttention"
            : active.Any(sample => sample.Stage == "AwaitingReceipt") && (arrived || indices.Length > 0) ? "Received"
            : indices.Length > 0 ? Stages[indices.Min()]
            : arrived ? "Received" : jobStage ?? "AwaitingReceipt";
        // Work-wide records are a fallback when all attributed samples share one earlier stage.
        // Preserve the attributed counts instead of claiming every sample reached the Job milestone.
        if (indices.Length > 0 && indices.Distinct().Count() == 1 && active.All(sample => Stages.Contains(sample.Stage))
            && Array.IndexOf(Stages, jobStage) > indices[0] && jobStage is "LibraryPrep" or "DataAssembly" or "QualityReview") current = jobStage;
        return new(current, jobStage, arrived, counts, samples);
    }
}
