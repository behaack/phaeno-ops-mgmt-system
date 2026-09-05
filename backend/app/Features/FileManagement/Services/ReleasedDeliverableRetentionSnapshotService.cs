namespace PhaenoPortal.App.Features.FileManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class ReleasedDeliverableRetentionSnapshotService(
    PSeqOperationsDbContext dbContext)
{
    public async Task<ReleasedDeliverableRetentionSnapshot> CaptureLabResultAsync(
        LabResultRelease release,
        DateTime releasedAtUtc,
        CancellationToken cancellationToken)
    {
        EnsureReleased(release.ReleaseStatus, release.ReleasedAt, releasedAtUtc);

        var existing = dbContext.ReleasedDeliverableRetentionSnapshots.Local
            .FirstOrDefault(item => item.LabResultReleaseId == release.Id)
            ?? await dbContext.ReleasedDeliverableRetentionSnapshots
                .FirstOrDefaultAsync(
                    item => item.LabResultReleaseId == release.Id,
                    cancellationToken);
        if (existing != null)
        {
            return existing;
        }

        var (globalPolicy, organizationOverride) = await ReadEffectivePolicyAsync(
            release.OrganizationId,
            cancellationToken);
        var snapshot = ReleasedDeliverableRetentionSnapshot.ForLabResult(
            release.OrganizationId,
            release.Id,
            globalPolicy,
            organizationOverride,
            releasedAtUtc);
        var sample = dbContext.LabSamples.Local.FirstOrDefault(value => value.Id == release.LabSampleId)
            ?? await dbContext.LabSamples.SingleOrDefaultAsync(value => value.Id == release.LabSampleId && value.LabServiceOrderId == release.LabServiceOrderId, cancellationToken);
        var tubeIds = await (from item in dbContext.SampleShipmentItems.AsNoTracking()
            join shipment in dbContext.SampleShipments on item.SampleShipmentId equals shipment.Id
            where item.SubmittedSpecimenId == release.LabSampleId && shipment.OrganizationId == release.OrganizationId
                && shipment.AuthorizationSourceId == release.LabServiceOrderId
            select item.RegisteredSampleTubeId).ToListAsync(cancellationToken);
        tubeIds.AddRange(await (from slot in dbContext.SampleShipmentTubeSlots.AsNoTracking()
            join item in dbContext.SampleShipmentItems on slot.SampleShipmentItemId equals item.Id
            join shipment in dbContext.SampleShipments on item.SampleShipmentId equals shipment.Id
            where item.SubmittedSpecimenId == release.LabSampleId && shipment.OrganizationId == release.OrganizationId
                && shipment.AuthorizationSourceId == release.LabServiceOrderId
            select slot.RegisteredSampleTubeId).ToListAsync(cancellationToken));
        var barcodes = await dbContext.RegisteredSampleTubes.AsNoTracking().Where(value => tubeIds.Contains(value.Id)).Select(value => value.SupplierBarcode).Distinct().OrderBy(value => value).ToListAsync(cancellationToken);
        snapshot.CaptureReceiptLineage(JsonSerializer.Serialize(new ReleasedReceiptLineage("Sample", sample is null ? [] : [sample.CustomerSampleId], barcodes, sample?.AccessionId)));
        dbContext.ReleasedDeliverableRetentionSnapshots.Add(snapshot);
        return snapshot;
    }

    public async Task<ReleasedDeliverableRetentionSnapshot> CaptureAssemblyOutputAsync(
        AssemblyOutputRelease release,
        DateTime releasedAtUtc,
        CancellationToken cancellationToken)
    {
        EnsureReleased(release.ReleaseStatus, release.ReleasedAt, releasedAtUtc);

        var existing = dbContext.ReleasedDeliverableRetentionSnapshots.Local
            .FirstOrDefault(item => item.AssemblyOutputReleaseId == release.Id)
            ?? await dbContext.ReleasedDeliverableRetentionSnapshots
                .FirstOrDefaultAsync(
                    item => item.AssemblyOutputReleaseId == release.Id,
                    cancellationToken);
        if (existing != null)
        {
            return existing;
        }

        var (globalPolicy, organizationOverride) = await ReadEffectivePolicyAsync(
            release.OrganizationId,
            cancellationToken);
        var snapshot = ReleasedDeliverableRetentionSnapshot.ForAssemblyOutput(
            release.OrganizationId,
            release.Id,
            globalPolicy,
            organizationOverride,
            releasedAtUtc);
        snapshot.CaptureReceiptLineage(JsonSerializer.Serialize(new ReleasedReceiptLineage("Project", [], [], null)));
        dbContext.ReleasedDeliverableRetentionSnapshots.Add(snapshot);
        return snapshot;
    }

    private async Task<(
        ReleasedDeliverablePolicyDefault GlobalPolicy,
        OrganizationReleasedDeliverablePolicyOverride? OrganizationOverride)>
        ReadEffectivePolicyAsync(
            Guid organizationId,
            CancellationToken cancellationToken)
    {
        var globalPolicy = await dbContext.ReleasedDeliverablePolicyDefaults
            .SingleOrDefaultAsync(item => item.IsActive, cancellationToken)
            ?? throw new InvalidOperationException(
                "An active global released-deliverable retention policy is required before a package can be released.");
        var organizationOverride = await dbContext.OrganizationReleasedDeliverablePolicyOverrides
            .SingleOrDefaultAsync(
                item => item.OrganizationId == organizationId && item.IsActive,
                cancellationToken);
        return (globalPolicy, organizationOverride);
    }

    private static void EnsureReleased(
        FileReleaseStatus status,
        DateTime? actualReleasedAtUtc,
        DateTime expectedReleasedAtUtc)
    {
        if (status != FileReleaseStatus.Released
            || actualReleasedAtUtc != expectedReleasedAtUtc
            || expectedReleasedAtUtc.Kind != DateTimeKind.Utc)
        {
            throw new InvalidOperationException(
                "The retention policy snapshot must use the package's first UTC release timestamp.");
        }
    }
}

public sealed record ReleasedReceiptLineage(string Scope, IReadOnlyList<string> CustomerSampleIds, IReadOnlyList<string> SupplierTubeBarcodes, string? AccessionId);
