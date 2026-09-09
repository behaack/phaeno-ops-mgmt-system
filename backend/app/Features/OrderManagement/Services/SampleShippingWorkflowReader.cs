namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class SampleShippingWorkflowReader(PSeqOperationsDbContext dbContext)
{
    public async Task<IReadOnlyList<SampleShipmentWorkflowDto>> ListAsync(
        Guid? organizationId,
        CancellationToken cancellationToken) =>
        await ListAsync(organizationId, departmentId: null, cancellationToken);

    public async Task<IReadOnlyList<SampleShipmentWorkflowDto>> ListAsync(
        Guid? organizationId,
        Guid? departmentId,
        CancellationToken cancellationToken,
        Guid? sourceId = null)
    {
        var query = dbContext.SampleShipments.AsNoTracking();
        if (organizationId.HasValue)
            query = query.Where(item => item.OrganizationId == organizationId.Value);
        if (departmentId.HasValue)
            query = query.Where(item => item.DepartmentId == departmentId.Value);
        if (sourceId.HasValue)
            query = query.Where(item => item.AuthorizationSourceId == sourceId.Value);
        else
            query = query.OrderByDescending(item => item.CreatedAt).Take(250);

        var shipments = await query
            .Include(item => item.Items)
                .ThenInclude(item => item.TubeSlots)
            .Include(item => item.PacketRevisions)
            .Include(item => item.ReturnKit)
                .ThenInclude(item => item!.Tubes)
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
        return await MapAsync(shipments, cancellationToken);
    }

    public async Task<SampleShipmentWorkflowDto> ReadAsync(
        Guid shipmentId,
        Guid? organizationId,
        CancellationToken cancellationToken) =>
        await ReadAsync(shipmentId, organizationId, departmentId: null, cancellationToken);

    public async Task<SampleShipmentWorkflowDto> ReadAsync(
        Guid shipmentId,
        Guid? organizationId,
        Guid? departmentId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.SampleShipments.AsNoTracking()
            .Where(item => item.Id == shipmentId);
        if (organizationId.HasValue)
            query = query.Where(item => item.OrganizationId == organizationId.Value);
        if (departmentId.HasValue)
            query = query.Where(item => item.DepartmentId == departmentId.Value);
        var shipment = await query
            .Include(item => item.Items)
                .ThenInclude(item => item.TubeSlots)
            .Include(item => item.PacketRevisions)
            .Include(item => item.ReturnKit)
                .ThenInclude(item => item!.Tubes)
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new OrderManagementException(
                "sample_shipment_not_found",
                "The requested sample shipment was not found.",
                StatusCodes.Status404NotFound);
        return (await MapAsync([shipment], cancellationToken))[0];
    }

    public async Task<SampleShippingPacketDocumentDto> ReadPacketAsync(
        Guid shipmentId,
        Guid? organizationId,
        CancellationToken cancellationToken) =>
        await ReadPacketAsync(shipmentId, organizationId, departmentId: null, cancellationToken);

    public async Task<SampleShippingPacketDocumentDto> ReadPacketAsync(
        Guid shipmentId,
        Guid? organizationId,
        Guid? departmentId,
        CancellationToken cancellationToken)
    {
        var shipment = await ReadAsync(shipmentId, organizationId, departmentId, cancellationToken);
        if (shipment.CurrentPacket is null)
            throw new OrderManagementException(
                "sample_shipping_packet_not_issued",
                "The shipment packet has not been issued.",
                StatusCodes.Status409Conflict);
        var packet = await dbContext.SampleShippingPacketRevisions.AsNoTracking()
            .SingleAsync(item => item.Id == shipment.CurrentPacket.Id, cancellationToken);
        return new SampleShippingPacketDocumentDto(
            shipment,
            packet.DestinationSnapshotJson,
            packet.InstructionSnapshotJson,
            packet.ManifestSnapshotJson);
    }

    private async Task<IReadOnlyList<SampleShipmentWorkflowDto>> MapAsync(
        IReadOnlyList<SampleShipment> shipments,
        CancellationToken cancellationToken)
    {
        if (shipments.Count == 0) return [];
        var organizationIds = shipments.Select(item => item.OrganizationId).Distinct().ToList();
        var destinationIds = shipments.Select(item => item.DestinationId).Distinct().ToList();
        var sampleTypeIds = shipments.SelectMany(item => item.Items)
            .Select(item => item.SampleTypeDefinitionId).Distinct().ToList();
        var organizations = await dbContext.Organizations.AsNoTracking()
            .Where(item => organizationIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
        var destinations = await dbContext.SampleShippingDestinations.AsNoTracking()
            .Where(item => destinationIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
        var sampleTypes = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .Where(item => sampleTypeIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);

        var authorizationIds = shipments.Select(item => item.AuthorizationSourceId).Distinct().ToArray();
        var related = await dbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Include(item => item.ReturnKit)
            .Where(item => organizationIds.Contains(item.OrganizationId) && authorizationIds.Contains(item.AuthorizationSourceId)
                && item.Status != SampleShipmentStatus.Cancelled).ToListAsync(cancellationToken);
        var allTubeIds = related.SelectMany(item => item.Items).SelectMany(SampleShippingPackingData.TubeIds).Distinct().ToArray();
        var registeredTubes = await dbContext.RegisteredSampleTubes.AsNoTracking().Where(item => allTubeIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        bool Received(Guid id) => registeredTubes.TryGetValue(id, out var tube) && (tube.ReceivedAt.HasValue || tube.AccessionedAt.HasValue);
        bool Unallocated(SampleShipment value) => value.IsPackingPool
            || (value.ContainerDefinitionId is null && value.ReturnKit is null && value.Status == SampleShipmentStatus.Preparing);

        return shipments.Select(shipment =>
        {
            var tubes = registeredTubes;
            var family = related.Where(value => value.OrganizationId == shipment.OrganizationId && value.DepartmentId == shipment.DepartmentId
                && value.AuthorizationSource == shipment.AuthorizationSource && value.AuthorizationSourceId == shipment.AuthorizationSourceId).ToArray();
            int Total(Guid id) => family.SelectMany(value => value.Items).Where(value => value.SubmittedSpecimenId == id).Sum(SampleShippingPackingData.TubeCount);
            int SampleReceived(Guid id) => family.SelectMany(value => value.Items).Where(value => value.SubmittedSpecimenId == id)
                .SelectMany(SampleShippingPackingData.TubeIds).Distinct().Count(Received);
            int Pending(Guid id) => family.Where(Unallocated).SelectMany(value => value.Items)
                .Where(value => value.SubmittedSpecimenId == id).Sum(SampleShippingPackingData.TubeCount);
            IReadOnlyList<SampleOtherShipmentDto> Others(Guid id) => family.Where(value => value.Id != shipment.Id && !Unallocated(value))
                .Select(value => new SampleOtherShipmentDto(value.Id, value.ShipmentNumber,
                    value.Items.Where(item => item.SubmittedSpecimenId == id).Sum(SampleShippingPackingData.TubeCount)))
                .Where(value => value.TubeCount > 0).OrderBy(value => value.ShipmentNumber).ToArray();
            var crosswalk = shipment.Items
                .OrderBy(item => item.CustomerSampleId)
                .SelectMany(item =>
                {
                    var slots = item.TubeSlots.OrderBy(slot => slot.Ordinal).ToList();
                    if (slots.Count == 0)
                    {
                        RegisteredSampleTube? legacyTube = null;
                        var hasLegacyTube = item.RegisteredSampleTubeId.HasValue
                            && tubes.TryGetValue(item.RegisteredSampleTubeId.Value, out legacyTube);
                        return new[] { new SampleShippingCrosswalkItemDto(
                            item.Id, item.SubmittedSpecimenId, item.CustomerSampleId, item.SampleName,
                            sampleTypes.GetValueOrDefault(item.SampleTypeDefinitionId, "Unavailable sample type"),
                            item.Quantity, item.QuantityUnit, item.RegisteredSampleTubeId,
                            hasLegacyTube ? legacyTube!.SupplierBarcode : null,
                            hasLegacyTube ? legacyTube!.Status.ToString() : "Unassigned", item.Version,
                            null, 1, 1, SampleShippingIdentity.Sample(item.SubmittedSpecimenId), Total(item.SubmittedSpecimenId),
                            Others(item.SubmittedSpecimenId), SampleReceived(item.SubmittedSpecimenId), Pending(item.SubmittedSpecimenId),
                            item.RegisteredSampleTubeId.HasValue && Received(item.RegisteredSampleTubeId.Value)) };
                    }

                    return slots.Select(slot =>
                    {
                        RegisteredSampleTube? tube = null;
                        var hasTube = slot.RegisteredSampleTubeId.HasValue
                            && tubes.TryGetValue(slot.RegisteredSampleTubeId.Value, out tube);
                        return new SampleShippingCrosswalkItemDto(
                            item.Id, item.SubmittedSpecimenId, item.CustomerSampleId, item.SampleName,
                            sampleTypes.GetValueOrDefault(item.SampleTypeDefinitionId, "Unavailable sample type"),
                            item.Quantity, item.QuantityUnit, slot.RegisteredSampleTubeId,
                            hasTube ? tube!.SupplierBarcode : null,
                            hasTube ? tube!.Status.ToString() : "Unassigned", slot.Version,
                            slot.Id, slot.Ordinal, slots.Count, SampleShippingIdentity.Sample(item.SubmittedSpecimenId),
                            Total(item.SubmittedSpecimenId), Others(item.SubmittedSpecimenId), SampleReceived(item.SubmittedSpecimenId), Pending(item.SubmittedSpecimenId),
                            slot.RegisteredSampleTubeId.HasValue && Received(slot.RegisteredSampleTubeId.Value));
                    });
                }).ToList();
            var currentPacket = shipment.PacketRevisions
                .Where(item => !item.IsVoided)
                .OrderByDescending(item => item.Revision)
                .Select(item => new SampleShippingPacketSummaryDto(
                    item.Id, item.Revision, item.PacketNumber, item.Barcode, item.IssuedAt, item.IsVoided))
                .FirstOrDefault();
            var kit = shipment.ReturnKit is null ? null : new SampleReturnKitDto(
                shipment.ReturnKit.Id,
                shipment.ReturnKit.KitNumber,
                shipment.ReturnKit.SampleShipmentId,
                shipment.ReturnKit.OrganizationId,
                shipment.ReturnKit.AuthorizationSource.ToString(),
                shipment.ReturnKit.AuthorizationSourceId,
                shipment.ReturnKit.TubeSupplierName,
                shipment.ReturnKit.TubeProductNumber,
                shipment.ReturnKit.TubeLotNumber,
                shipment.ReturnKit.ShipperSupplierName,
                shipment.ReturnKit.ShipperProductNumber,
                shipment.ReturnKit.RequiredTubeCount,
                shipment.ReturnKit.Status.ToString(),
                shipment.ReturnKit.OutboundCarrier,
                shipment.ReturnKit.OutboundTrackingNumber,
                shipment.ReturnKit.FulfilledAt,
                shipment.ReturnKit.Version,
                shipment.ReturnKit.Tubes.OrderBy(item => item.SupplierBarcode)
                    .Select(item => new RegisteredSampleTubeDto(
                        item.Id,
                        item.SupplierBarcode,
                        item.Status.ToString(),
                        item.AssignedAt,
                        item.AccessionedAt,
                        item.Version)).ToList());
            return new SampleShipmentWorkflowDto(
                shipment.Id,
                shipment.ShipmentNumber,
                shipment.OrganizationId,
                organizations.GetValueOrDefault(shipment.OrganizationId, "Unavailable organization"),
                shipment.AuthorizationSource.ToString(),
                shipment.AuthorizationSourceId,
                shipment.AuthorizationReference,
                shipment.AuthorizationName,
                shipment.LabWorkOrderId,
                shipment.DestinationId,
                destinations.GetValueOrDefault(shipment.DestinationId, "Unavailable destination"),
                shipment.Status.ToString(),
                shipment.Carrier,
                shipment.TrackingNumber,
                shipment.ShippedAt,
                shipment.Version,
                kit,
                crosswalk,
                currentPacket,
                SampleShippingPackingData.Container(shipment.ContainerSnapshotJson),
                Unallocated(shipment),
                SampleShippingPackingData.TubeCount(shipment),
                shipment.Items.SelectMany(SampleShippingPackingData.TubeIds).Distinct().Count(Received),
                family.Sum(SampleShippingPackingData.TubeCount),
                family.SelectMany(value => value.Items).SelectMany(SampleShippingPackingData.TubeIds).Distinct().Count(Received));
        }).ToList();
    }
}
