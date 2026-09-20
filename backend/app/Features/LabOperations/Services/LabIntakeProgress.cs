namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

// Customer-safe intake and final outcome facts only; private evidence stays in Lab.
public sealed record LabSpecimenIntakeProgress(Guid SubmittedSpecimenId, DateTime ReceivedAtUtc, string? AccessionNumber);
public sealed record LabSpecimenTerminalProgress(Guid SubmittedSpecimenId, string Outcome);
public sealed record LabIntakeProgress(bool HasPhysicalReceipt, IReadOnlyList<LabSpecimenIntakeProgress> Specimens,
    IReadOnlyList<LabSpecimenTerminalProgress>? TerminalOutcomes = null)
{
    public static async Task<LabIntakeProgress> ReadAsync(PSeqOperationsDbContext db, LabWorkOrder work,
        CancellationToken cancellationToken)
    {
        var shipments = await db.SampleShipments.AsNoTracking()
            .Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Where(item => item.LabWorkOrderId == work.Id && item.OrganizationId == work.SubmittingOrganizationId
                && item.Status != SampleShipmentStatus.Cancelled).ToListAsync(cancellationToken);
        var itemsBySpecimen = shipments.SelectMany(item => item.Items).ToLookup(item => item.SubmittedSpecimenId);
        var tubeIds = shipments.SelectMany(item => item.Items).SelectMany(SampleShippingPackingData.TubeIds).Distinct().ToArray();
        var accessionedTubeIds = (await db.RegisteredSampleTubes.AsNoTracking()
            .Where(item => tubeIds.Contains(item.Id) && item.AccessionedAt.HasValue)
            .Select(item => item.Id).ToListAsync(cancellationToken)).ToHashSet();
        var containers = await db.LabContainers.AsNoTracking().Where(item => item.LabWorkOrderId == work.Id
            && item.Kind == LabContainerKind.SubmittedSpecimen).ToListAsync(cancellationToken);
        var specimens = work.Specimens.Where(item => item.ReceivedAtUtc.HasValue
            && item.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled).Select(specimen =>
        {
            var items = itemsBySpecimen[specimen.SubmittedSpecimenId].ToList();
            var expected = items.Sum(SampleShippingPackingData.TubeCount);
            var matched = items.SelectMany(SampleShippingPackingData.TubeIds).Distinct().ToArray();
            var allAccessioned = items.Count == 0 || matched.Length == 0
                ? containers.Any(item => item.LabSpecimenId == specimen.Id && item.BarcodeSource == LabContainerBarcodeSource.PhaenoGenerated)
                : matched.Length == expected && matched.All(id => accessionedTubeIds.Contains(id)
                    && containers.Any(item => item.LabSpecimenId == specimen.Id && item.ExternalBarcodeReferenceId == id));
            return new LabSpecimenIntakeProgress(specimen.SubmittedSpecimenId, specimen.ReceivedAtUtc!.Value,
                allAccessioned ? specimen.AccessionNumber : null);
        }).ToArray();
        var packages = await db.ResultOutputPackages.Where(value => value.LabWorkOrderId == work.Id
            && value.OrganizationId == work.SubmittingOrganizationId).ToListAsync(cancellationToken);
        foreach (var entry in db.ChangeTracker.Entries<ResultOutputPackage>())
            if (entry.Entity.LabWorkOrderId == work.Id && !packages.Any(value => value.Id == entry.Entity.Id)) packages.Add(entry.Entity);
        var runProgress = new LabSequencingRunProgress(db);
        var runCounts = await runProgress.AllocationsAsync(work.Id, cancellationToken);
        var analysisRuns = await runProgress.AnalysisRunsAsync(work.Id, cancellationToken);
        bool HasApprovedRuns(Guid submittedId)
        {
            var approved = packages.Where(p => (p.LabSampleId ?? p.TrialSampleId) == submittedId && p.ScientificApprovalId.HasValue
                && p.State is ResultOutputPackageState.ReadyForRelease or ResultOutputPackageState.Released).ToList();
            var required = runCounts.GetValueOrDefault(submittedId, 1);
            return required == 1 ? approved.Count > 0 : LabSequencingRunProgress.Count(approved.Select(p => p.LabAnalysisRunId), analysisRuns) >= required;
        }
        var outcomes = work.Specimens.Select(specimen => new LabSpecimenTerminalProgress(specimen.SubmittedSpecimenId,
            specimen.IntakeDisposition == LabSpecimenIntakeDisposition.OnHold || specimen.ProcessingState == LabSpecimenProcessingState.OnHold ? ""
            : specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Cancelled ? "Cancelled"
            : specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Rejected ? "Rejected"
            : specimen.ProcessingState == LabSpecimenProcessingState.Failed ? "Failed"
            : specimen.ProcessingState == LabSpecimenProcessingState.Succeeded && HasApprovedRuns(specimen.SubmittedSpecimenId) ? "Completed" : ""))
            .Where(value => value.Outcome.Length > 0).ToArray();
        return new(specimens.Length > 0 || shipments.Any(item => !item.IsPackingPool
            && (item.DeliveredAt.HasValue || item.ReceivedAt.HasValue)), specimens, outcomes);
    }
}
