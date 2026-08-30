namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class SampleShippingWorkflowReader(PSeqOperationsDbContext dbContext)
{
    public async Task<IReadOnlyList<SampleShipmentWorkflowDto>> ListAsync(
        Guid? organizationId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.SampleShipments.AsNoTracking();
        if (organizationId.HasValue)
            query = query.Where(item => item.OrganizationId == organizationId.Value);

        var shipments = await query
            .Include(item => item.Items)
                .ThenInclude(item => item.TubeSlots)
            .Include(item => item.PacketRevisions)
            .Include(item => item.ReturnKit)
                .ThenInclude(item => item!.Tubes)
            .OrderByDescending(item => item.CreatedAt)
            .Take(250)
            .ToListAsync(cancellationToken);
        return await MapAsync(shipments, cancellationToken);
    }

    public async Task<SampleShipmentWorkflowDto> ReadAsync(
        Guid shipmentId,
        Guid? organizationId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.SampleShipments.AsNoTracking()
            .Where(item => item.Id == shipmentId);
        if (organizationId.HasValue)
            query = query.Where(item => item.OrganizationId == organizationId.Value);
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
        CancellationToken cancellationToken)
    {
        var shipment = await ReadAsync(shipmentId, organizationId, cancellationToken);
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

        return shipments.Select(shipment =>
        {
            var tubes = shipment.ReturnKit?.Tubes.ToDictionary(item => item.Id)
                ?? new Dictionary<Guid, RegisteredSampleTube>();
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
                            hasLegacyTube ? legacyTube!.Status.ToString() : "Unassigned", item.Version) };
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
                            slot.Id, slot.Ordinal, slots.Count);
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
                currentPacket);
        }).ToList();
    }
}
