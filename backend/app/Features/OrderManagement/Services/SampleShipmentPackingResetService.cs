namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>Returns an unscanned Job's physical tube slots to compatible preparation pools.</summary>
public sealed class SampleShipmentPackingResetService(PSeqOperationsDbContext db)
{
    private sealed record Family(SampleShipment Current, IReadOnlyList<SampleShipment> Shipments, bool HasHistory);
    private sealed record PoolKey(Guid DestinationId, Guid LabWorkOrderId, string HandlingGroup);

    public async Task<ShipmentPackingResetContextDto> ReadAsync(Guid shipmentId, Guid organizationId,
        Guid departmentId, bool canManage, CancellationToken ct)
    {
        var family = await ReadFamilyAsync(shipmentId, organizationId, departmentId, ct);
        var active = family.Shipments.Where(item => item.Status != SampleShipmentStatus.Cancelled).ToArray();
        var reason = canManage ? BlockedReason(family)
            : "An organization or department administrator can change the containers for this job.";
        return new(reason is null, reason, active.Count(item => item.ContainerDefinitionId.HasValue),
            active.Sum(SampleShippingPackingData.TubeCount),
            active.OrderBy(item => item.Id).Select(item => new ShipmentPackingVersionDto(item.Id, item.Version)).ToArray());
    }

    public async Task<Guid> ResetAsync(Guid shipmentId, Guid organizationId, Guid departmentId,
        ShipmentPackingResetRequest request, CancellationToken ct)
    {
        var sourceId = await db.SampleShipments.AsNoTracking().Where(item => item.Id == shipmentId
                && item.OrganizationId == organizationId && item.DepartmentId == departmentId)
            .Select(item => (Guid?)item.AuthorizationSourceId).SingleOrDefaultAsync(ct) ?? throw Missing();
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"sample-shipping:{sourceId}", ct);
        // Read after the same family lock used by packing, tube assignment and packet/shipment confirmation.
        var family = await ReadFamilyAsync(shipmentId, organizationId, departmentId, ct);
        if (BlockedReason(family) is { } reason) throw Conflict(reason);
        var active = family.Shipments.Where(item => item.Status != SampleShipmentStatus.Cancelled).ToArray();
        if (request.Shipments is null || request.Shipments.Count == 0
            || request.Shipments.Any(item => item.ShipmentId == Guid.Empty || item.Version < 1)
            || request.Shipments.Select(item => item.ShipmentId).Distinct().Count() != request.Shipments.Count)
            throw new OrderManagementException("sample_packing_reset_invalid", "Review the current containers before changing them.");
        if (request.Shipments.Count != active.Length || active.Any(item => !request.Shipments.Any(reviewed =>
                reviewed.ShipmentId == item.Id && reviewed.Version == item.Version)))
            throw Conflict("The containers changed after you reviewed them. Refresh and review the current containers before continuing.");

        await TransportationKitInventory.ReleaseAsync(db, active.Select(item => item.Id).ToArray(), ct);

        var keys = await ReadPoolKeysAsync(active, ct);
        var invokingItem = family.Current.Items.OrderBy(item => item.CustomerSampleId, StringComparer.OrdinalIgnoreCase).First();
        var returnKey = keys[invokingItem.Id];
        var groups = active.SelectMany(shipment => shipment.Items.Select(item => (Shipment: shipment, Item: item)))
            .GroupBy(row => keys[row.Item.Id]).ToArray();

        AttachFreshFamily(active);
        foreach (var item in active.SelectMany(shipment => shipment.Items).Where(item => item.TubeSlots.Count == 0))
        {
            var slot = new SampleShipmentTubeSlot(item.Id, 1);
            item.TubeSlots.Add(slot);
            db.SampleShipmentTubeSlots.Add(slot);
        }
        var targets = new Dictionary<PoolKey, SampleShipment>();
        foreach (var group in groups)
        {
            // Never merge different destinations, Lab work, separate-shipment rules or incompatible handling groups.
            var pool = active.Where(item => !item.ContainerDefinitionId.HasValue && item.Items.Count > 0
                    && item.Items.All(row => keys[row.Id] == group.Key))
                .OrderByDescending(item => item.IsPackingPool).ThenBy(item => item.CreatedAt).ThenBy(item => item.Id).FirstOrDefault();
            if (pool is null)
            {
                var original = group.First().Shipment;
                pool = new SampleShipment($"SHP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..24].ToUpperInvariant(),
                    organizationId, departmentId, original.AuthorizationSource, original.AuthorizationSourceId,
                    original.AuthorizationReference, original.AuthorizationName, original.LabWorkOrderId, original.DestinationId);
                db.SampleShipments.Add(pool);
            }
            pool.MarkPackingPool();
            targets.Add(group.Key, pool);
            foreach (var (source, item) in group)
            {
                if (source.Id == pool.Id) continue;
                var target = pool.Items.SingleOrDefault(row => row.SubmittedSpecimenId == item.SubmittedSpecimenId
                    && row.SampleTypeDefinitionId == item.SampleTypeDefinitionId);
                if (target is null)
                {
                    target = new SampleShipmentItem(pool.Id, item.SubmittedSpecimenId, item.SampleTypeDefinitionId,
                        item.CustomerSampleId, item.SampleName, item.Quantity, item.QuantityUnit);
                    pool.Items.Add(target);
                    db.SampleShipmentItems.Add(target);
                }
                foreach (var slot in item.TubeSlots.ToArray())
                {
                    item.TubeSlots.Remove(slot);
                    slot.MoveTo(target.Id);
                    target.TubeSlots.Add(slot);
                }
                source.Items.Remove(item);
                db.SampleShipmentItems.Remove(item);
            }
            foreach (var item in pool.Items) item.SetTubeQuantity(item.TubeSlots.Count);
            if (db.Entry(pool).State != EntityState.Added) db.Entry(pool).Property(item => item.Version).IsModified = true;
        }
        foreach (var shipment in active.Where(item => !targets.Values.Any(pool => pool.Id == item.Id)))
        {
            if (shipment.Items.Count != 0) throw Conflict("Some tubes could not be returned to their preparation pool. Refresh and try again.");
            // Retain the retired physical shipment's identity, container snapshot and central audit history.
            shipment.Cancel();
        }
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return targets[returnKey].Id;
    }

    private async Task<Family> ReadFamilyAsync(Guid shipmentId, Guid organizationId, Guid departmentId, CancellationToken ct)
    {
        var current = await db.SampleShipments.AsNoTracking().SingleOrDefaultAsync(item => item.Id == shipmentId
            && item.OrganizationId == organizationId && item.DepartmentId == departmentId, ct) ?? throw Missing();
        // Cancelled relatives remain part of the history guard: clearing a match or retiring a shipment cannot unlock a reset.
        var shipments = await db.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Include(item => item.ReturnKit).Include(item => item.PacketRevisions)
            .Where(item => item.OrganizationId == organizationId && item.DepartmentId == departmentId
                && item.AuthorizationSource == current.AuthorizationSource && item.AuthorizationSourceId == current.AuthorizationSourceId)
            .ToArrayAsync(ct);
        var ids = shipments.Select(item => item.Id).ToArray();
        var history = await db.SampleTubeAssignmentEvents.AnyAsync(item => ids.Contains(item.SampleShipmentId), ct)
            || await db.SampleShippingStockKits.AnyAsync(item => item.BoundSampleShipmentId.HasValue && ids.Contains(item.BoundSampleShipmentId.Value), ct);
        return new(shipments.Single(item => item.Id == shipmentId), shipments, history);
    }

    private static string? BlockedReason(Family family)
    {
        // Progressed shipments remain current; their milestone history explains why container changes are locked.
        if (family.Current.Status == SampleShipmentStatus.Cancelled || !family.Current.ContainerDefinitionId.HasValue
            || family.Current.IsPackingPool || family.Current.Items.Count == 0)
            return "This container selection is no longer active. Open a current prepared container to change the containers for this job.";
        if (family.Shipments.Any(item => item.PacketRevisions.Count > 0))
            return "Containers cannot be changed because a shipping insert has already been issued for this job.";
        if (family.HasHistory || family.Shipments.Any(item => item.ReturnKit is not null
                || item.ShippedAt.HasValue || item.DeliveredAt.HasValue || item.ReceivedAt.HasValue
                || item.Carrier is not null || item.TrackingNumber is not null
                || item.Status is not (SampleShipmentStatus.Preparing or SampleShipmentStatus.Cancelled)
                || item.Items.Any(row => row.RegisteredSampleTubeId.HasValue || row.TubeAssignedAt.HasValue
                    || row.TubeSlots.Any(slot => slot.RegisteredSampleTubeId.HasValue || slot.TubeAssignedAt.HasValue))))
            return "Containers cannot be changed after tube scanning, kit registration or shipment preparation has started for this job.";
        return null;
    }

    private async Task<Dictionary<Guid, PoolKey>> ReadPoolKeysAsync(IReadOnlyList<SampleShipment> shipments, CancellationToken ct)
    {
        var destinationIds = shipments.Select(item => item.DestinationId).Distinct().ToArray();
        var typeIds = shipments.SelectMany(item => item.Items.Select(row => row.SampleTypeDefinitionId)).Distinct().ToArray();
        var rules = await db.SampleShippingInstructionRules.AsNoTracking().Where(item => destinationIds.Contains(item.DestinationId)
            && typeIds.Contains(item.SampleTypeDefinitionId)).ToArrayAsync(ct);
        var now = DateTime.UtcNow;
        return shipments.SelectMany(shipment => shipment.Items.Select(item =>
        {
            var matches = rules.Where(rule => rule.DestinationId == shipment.DestinationId
                && rule.SampleTypeDefinitionId == item.SampleTypeDefinitionId && rule.IsEffectiveAt(now)).ToArray();
            // Missing/changed configuration must not mix unknown handling requirements during an otherwise safe reset.
            var handling = matches.Length == 1 && !matches[0].RequiresSeparateShipment
                ? $"group:{matches[0].CompatibilityGroup.ToUpperInvariant()}" : $"type:{item.SampleTypeDefinitionId:N}";
            return (item.Id, Key: new PoolKey(shipment.DestinationId, shipment.LabWorkOrderId, handling));
        })).ToDictionary(item => item.Id, item => item.Key);
    }

    private void AttachFreshFamily(IReadOnlyList<SampleShipment> shipments)
    {
        var ids = shipments.Select(item => item.Id).ToHashSet();
        var itemIds = shipments.SelectMany(item => item.Items).Select(item => item.Id).ToHashSet();
        foreach (var entry in db.ChangeTracker.Entries().Where(entry => entry.Entity switch
        {
            SampleShipment shipment => ids.Contains(shipment.Id),
            SampleShipmentItem item => ids.Contains(item.SampleShipmentId),
            SampleShipmentTubeSlot slot => itemIds.Contains(slot.SampleShipmentItemId),
            _ => false,
        }).ToArray()) entry.State = EntityState.Detached;
        db.SampleShipments.AttachRange(shipments);
    }

    private static OrderManagementException Missing() => new("sample_shipment_not_found", "The sample shipment was not found.", 404);
    private static OrderManagementException Conflict(string message) => new("sample_packing_reset_conflict", message, 409);
}
