namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public static class LabPhaseShippingSequence
{
    public static Guid? CurrentPhaseId(LabServiceOrder order, IReadOnlyCollection<SampleShipment> shipments)
        => order.Phases.Where(p => p.CancelledAtUtc == null && p.SupersededAtUtc == null)
            .OrderBy(p => p.Position).FirstOrDefault(p =>
            {
                var members = order.Samples.Where(s => s.LabJobPhaseId == p.Id).ToArray();
                var memberIds = members.Select(s => s.Id).ToHashSet();
                var related = shipments.Where(s => !s.IsPackingPool && s.Status != SampleShipmentStatus.Cancelled
                    && s.Items.Any(i => memberIds.Contains(i.SubmittedSpecimenId))).ToArray();
                var sent = related.Where(s => s.ShippedAt.HasValue).SelectMany(s => s.Items)
                    .Select(i => i.SubmittedSpecimenId).ToHashSet();
                return !p.PreparationCompletedAtUtc.HasValue || p.SampleCount <= 0 || members.Length != p.SampleCount
                    || related.Length == 0 || related.Any(s => !s.ShippedAt.HasValue
                        || s.Items.Any(i => !memberIds.Contains(i.SubmittedSpecimenId)))
                    || members.Any(s => !sent.Contains(s.Id));
            })?.Id;

    public static async Task<Guid?> CurrentPhaseIdAsync(PSeqOperationsDbContext db, LabServiceOrder order, CancellationToken ct)
    {
        var shipments = await db.SampleShipments.AsNoTracking().Include(s => s.Items)
            .Where(s => s.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder
                && s.AuthorizationSourceId == order.Id && s.OrganizationId == order.OrganizationId
                && s.DepartmentId == order.DepartmentId && s.Status != SampleShipmentStatus.Cancelled
                && !s.IsPackingPool).ToArrayAsync(ct);
        return CurrentPhaseId(order, shipments);
    }

    public static async Task RequireCurrentAsync(PSeqOperationsDbContext db, LabServiceOrder order, LabJobPhase phase, CancellationToken ct)
    {
        if (phase.Id != await CurrentPhaseIdAsync(db, order, ct))
            throw LabPhaseOperations.Error("phase_shipping_out_of_sequence",
                "Record every required shipment from the preceding phases before requesting kits or preparing this phase.");
        if (await db.Set<LabPhaseCancellationRequest>().AnyAsync(r => r.LabJobPhaseId == phase.Id && r.Status == "Pending", ct))
            throw LabPhaseOperations.Error("phase_cancellation_pending", "Resolve this phase's cancellation request before continuing its shipping steps.");
    }

    public static async Task RequireShipmentAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
    {
        if (shipment.AuthorizationSource != SampleShipmentAuthorizationSource.CustomerLabServiceOrder) return;
        await new LabPhasePlans(db).LockAsync(shipment.AuthorizationSourceId, ct);
        var order = await db.LabServiceOrders.AsNoTracking().Include(o => o.Phases).Include(o => o.Samples)
            .SingleAsync(o => o.Id == shipment.AuthorizationSourceId && o.OrganizationId == shipment.OrganizationId
                && o.DepartmentId == shipment.DepartmentId, ct);
        if (!order.UsesPairedPreparation) return;
        var sampleIds = await db.SampleShipmentItems.Where(i => i.SampleShipmentId == shipment.Id)
            .Select(i => i.SubmittedSpecimenId).ToArrayAsync(ct);
        var phases = order.Samples.Where(s => sampleIds.Contains(s.Id)).Select(s => s.LabJobPhaseId).Distinct().ToArray();
        if (sampleIds.Length == 0 || phases.Length != 1 || !phases[0].HasValue)
            throw LabPhaseOperations.Error("shipment_phase_invalid", "Prepare samples from exactly one phase in this shipment.");
        await RequireCurrentAsync(db, order, order.Phases.Single(p => p.Id == phases[0]), ct);
    }
}
