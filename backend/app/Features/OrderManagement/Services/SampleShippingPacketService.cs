namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class SampleShippingPacketService(PSeqOperationsDbContext dbContext)
{
    private static readonly JsonSerializerOptions SnapshotOptions = new(JsonSerializerDefaults.Web);

    public async Task<SampleShippingPacketRevision> IssueAsync(
        Guid shipmentId,
        long expectedShipmentVersion,
        DateTime issuedAt,
        string? replacementReason,
        CancellationToken cancellationToken)
    {
        if (issuedAt.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Packet issue time must be UTC.", nameof(issuedAt));

        var shipment = await dbContext.SampleShipments
            .Include(item => item.Items)
                .ThenInclude(item => item.TubeSlots)
            .Include(item => item.PacketRevisions)
            .Include(item => item.ReturnKit)
                .ThenInclude(item => item!.Tubes)
            .FirstOrDefaultAsync(item => item.Id == shipmentId, cancellationToken)
            ?? throw new OrderManagementException(
                "sample_shipment_not_found",
                "The sample shipment was not found.",
                StatusCodes.Status404NotFound);
        if (shipment.Version != expectedShipmentVersion)
            throw new OrderManagementException(
                "sample_shipping_version_conflict",
                "This shipment changed after it was loaded. Refresh and try again.",
                StatusCodes.Status409Conflict);
        var currentPacket = shipment.PacketRevisions
            .Where(item => !item.IsVoided)
            .OrderByDescending(item => item.Revision)
            .FirstOrDefault();
        if ((currentPacket is null && shipment.Status != SampleShipmentStatus.Preparing)
            || (currentPacket is not null
                && shipment.Status is not (SampleShipmentStatus.Preparing or SampleShipmentStatus.ReadyToShip)))
            throw new OrderManagementException(
                "sample_shipping_packet_issue_not_allowed",
                "A packet can be issued while a shipment is being prepared, or replaced before the shipment is recorded as shipped.",
                StatusCodes.Status409Conflict);
        if (shipment.Items.Count == 0)
            throw new OrderManagementException(
                "sample_shipping_manifest_empty",
                "Add at least one authorized sample before issuing a packet.");
        if (shipment.ReturnKit is not { Status: SampleReturnKitStatus.Fulfilled } returnKit)
            throw new OrderManagementException(
                "sample_return_kit_not_fulfilled",
                "The Phaeno return kit must be fulfilled before the shipping packet can be issued.",
                StatusCodes.Status409Conflict);
        if (shipment.Items.Any(item => item.TubeSlots.Count > 0
            ? item.TubeSlots.Any(slot => !slot.RegisteredSampleTubeId.HasValue)
            : !item.RegisteredSampleTubeId.HasValue))
            throw new OrderManagementException(
                "sample_tube_assignment_incomplete",
                "Match every expected tube slot to one Phaeno-supplied tube before issuing the packet.",
                StatusCodes.Status409Conflict);
        var assignedTubeIds = shipment.Items.SelectMany(item => item.TubeSlots.Count > 0
            ? item.TubeSlots.Select(slot => slot.RegisteredSampleTubeId!.Value)
            : [item.RegisteredSampleTubeId!.Value]).ToList();
        if (assignedTubeIds.Distinct().Count() != assignedTubeIds.Count)
            throw new OrderManagementException(
                "sample_tube_assignment_duplicate",
                "A Phaeno-supplied tube can be assigned to only one expected sample.",
                StatusCodes.Status409Conflict);
        var tubesById = returnKit.Tubes.ToDictionary(item => item.Id);
        if (assignedTubeIds.Any(id => !tubesById.TryGetValue(id, out var tube)
            || tube.Status != RegisteredSampleTubeStatus.Assigned))
            throw new OrderManagementException(
                "sample_tube_assignment_invalid",
                "Every assigned tube must belong to the fulfilled return kit and remain available for this shipment.",
                StatusCodes.Status409Conflict);

        var expectedAuthorizationSource = shipment.AuthorizationSource == SampleShipmentAuthorizationSource.ProspectTrialProject
            ? LabAuthorizationSource.TrialProject
            : LabAuthorizationSource.CommercialOrder;
        if (!await dbContext.LabWorkOrders.AsNoTracking().AnyAsync(
            item => item.Id == shipment.LabWorkOrderId
                && item.SubmittingOrganizationId == shipment.OrganizationId
                && item.AuthorizationSource == expectedAuthorizationSource
                && item.AuthorizationSourceId == shipment.AuthorizationSourceId,
            cancellationToken))
            throw new OrderManagementException(
                "sample_shipping_lab_work_mismatch",
                "The shipment does not match its provider-authorized Lab work reference.",
                StatusCodes.Status409Conflict);

        var submittedSpecimenIds = shipment.Items
            .Select(item => item.SubmittedSpecimenId)
            .Distinct()
            .ToList();
        if (submittedSpecimenIds.Count != shipment.Items.Count)
            throw new OrderManagementException(
                "sample_shipping_manifest_duplicate",
                "A submitted specimen can appear only once in a shipment manifest.",
                StatusCodes.Status409Conflict);
        var authorizedSpecimenCount = await dbContext.LabSpecimens.AsNoTracking()
            .CountAsync(item => item.LabWorkOrderId == shipment.LabWorkOrderId
                && submittedSpecimenIds.Contains(item.SubmittedSpecimenId), cancellationToken);
        if (authorizedSpecimenCount != submittedSpecimenIds.Count)
            throw new OrderManagementException(
                "sample_shipping_specimen_mismatch",
                "Every shipment sample must belong to the referenced authorized Lab work.",
                StatusCodes.Status409Conflict);

        var destination = await dbContext.SampleShippingDestinations.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == shipment.DestinationId, cancellationToken)
            ?? throw new OrderManagementException(
                "shipping_destination_not_found",
                "The shipment destination revision was not found.",
                StatusCodes.Status409Conflict);
        var sampleTypeIds = shipment.Items.Select(item => item.SampleTypeDefinitionId).Distinct().ToList();
        var sampleTypes = await dbContext.SampleTypeDefinitions.AsNoTracking()
            .Where(item => sampleTypeIds.Contains(item.Id))
            .ToListAsync(cancellationToken);
        if (sampleTypes.Count != sampleTypeIds.Count)
            throw new OrderManagementException(
                "sample_type_not_found",
                "One or more shipment sample-type revisions were not found.",
                StatusCodes.Status409Conflict);
        var sampleTypesById = sampleTypes.ToDictionary(item => item.Id);
        foreach (var shipmentItem in shipment.Items)
        {
            var sampleType = sampleTypesById[shipmentItem.SampleTypeDefinitionId];
            if (!string.Equals(shipmentItem.QuantityUnit, sampleType.QuantityUnit, StringComparison.OrdinalIgnoreCase)
                || (sampleType.MinimumQuantity.HasValue && shipmentItem.Quantity < sampleType.MinimumQuantity.Value)
                || (sampleType.MaximumQuantity.HasValue && shipmentItem.Quantity > sampleType.MaximumQuantity.Value))
                throw new OrderManagementException(
                    "sample_shipping_quantity_invalid",
                    $"Sample '{shipmentItem.CustomerSampleId}' does not meet the selected sample-type quantity requirements.",
                    StatusCodes.Status409Conflict);
        }
        var rules = await dbContext.SampleShippingInstructionRules.AsNoTracking()
            .Where(item => item.DestinationId == shipment.DestinationId
                && sampleTypeIds.Contains(item.SampleTypeDefinitionId))
            .ToListAsync(cancellationToken);

        SampleShippingResolution resolution;
        try
        {
            resolution = SampleShippingCompatibilityResolver.Resolve(
                destination,
                sampleTypes,
                rules,
                issuedAt);
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        {
            throw new OrderManagementException(
                "sample_shipping_incompatible",
                exception.Message,
                StatusCodes.Status409Conflict);
        }

        if (currentPacket != null && string.IsNullOrWhiteSpace(replacementReason))
            throw new OrderManagementException(
                "sample_shipping_reissue_reason_required",
                "Enter a reason before replacing an issued shipment packet.");

        var barcode = await AllocateBarcodeAsync(cancellationToken);
        var revision = shipment.PacketRevisions.Select(item => item.Revision).DefaultIfEmpty(0).Max() + 1;
        var packetNumber = $"SP-{issuedAt:yyyyMMdd}-{barcode.Split('-')[2]}";
        var packet = new SampleShippingPacketRevision(
            shipment.Id,
            revision,
            packetNumber,
            barcode,
            SerializeDestination(resolution.Destination),
            SerializeInstructions(resolution),
            SerializeManifest(shipment, tubesById, sampleTypesById),
            issuedAt);

        if (currentPacket != null)
        {
            currentPacket.Void(issuedAt, replacementReason!, packet.Id);
            dbContext.Entry(shipment).Property(item => item.Version).IsModified = true;
        }
        shipment.PacketRevisions.Add(packet);
        dbContext.SampleShippingPacketRevisions.Add(packet);
        if (shipment.Status == SampleShipmentStatus.Preparing)
            shipment.MarkReadyToShip();
        await dbContext.SaveChangesAsync(cancellationToken);
        return packet;
    }

    private async Task<string> AllocateBarcodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var barcode = SampleShippingBarcode.Create();
            if (!await dbContext.SampleShippingPacketRevisions.AsNoTracking()
                .AnyAsync(item => item.Barcode == barcode, cancellationToken))
                return barcode;
        }

        throw new InvalidOperationException("A unique shipment-packet barcode could not be allocated.");
    }

    private static string SerializeDestination(SampleShippingDestination item) =>
        JsonSerializer.Serialize(new
        {
            item.Id,
            item.DefinitionKey,
            item.Revision,
            item.Code,
            item.Name,
            item.RecipientName,
            item.OrganizationName,
            item.AddressLine1,
            item.AddressLine2,
            item.City,
            item.StateOrProvince,
            item.PostalCode,
            item.CountryCode,
            item.ReceivingPhone,
            item.ReceivingEmail,
            item.ReceivingHours,
            item.TimeZoneId,
            item.ClosureInstructions,
            item.DeliveryInstructions,
            item.CarrierRestrictions,
            item.InternationalShippingAllowed
        }, SnapshotOptions);

    private static string SerializeInstructions(SampleShippingResolution resolution) =>
        JsonSerializer.Serialize(new
        {
            resolution.CompatibilityGroup,
            resolution.RequiresSeparateShipment,
            destination = new
            {
                resolution.Destination.ReceivingHours,
                resolution.Destination.TimeZoneId,
                resolution.Destination.ClosureInstructions,
                resolution.Destination.DeliveryInstructions,
                resolution.Destination.CarrierRestrictions,
                resolution.Destination.InternationalShippingAllowed
            },
            samples = resolution.Rules.Select(item => new
            {
                sampleType = new
                {
                    item.SampleType.Id,
                    item.SampleType.DefinitionKey,
                    item.SampleType.Revision,
                    item.SampleType.Code,
                    item.SampleType.Name,
                    item.SampleType.MaterialClass,
                    item.SampleType.MinimumQuantity,
                    item.SampleType.MaximumQuantity,
                    item.SampleType.QuantityUnit,
                    item.SampleType.PrimaryContainerRequirements,
                    item.SampleType.TemperatureRequirements,
                    item.SampleType.StabilizerRequirements,
                    item.SampleType.PackagingInstructions,
                    item.SampleType.LabelingInstructions,
                    item.SampleType.ProhibitedIdentifiers,
                    item.SampleType.SafetyRequirements,
                    item.SampleType.CarrierRestrictions,
                    item.SampleType.MaximumTransitHours
                },
                instructionRule = new
                {
                    item.Rule.Id,
                    item.Rule.DefinitionKey,
                    item.Rule.Revision,
                    item.Rule.CompatibilityGroup,
                    item.Rule.PackingInstructions,
                    item.Rule.TemperatureInstructions,
                    item.Rule.CarrierInstructions,
                    item.Rule.DispatchInstructions,
                    item.Rule.DeliveryInstructions,
                    item.Rule.RequiredDocuments,
                    item.Rule.ExceptionInstructions,
                    item.Rule.InternationalCustomsInstructions,
                    item.Rule.RequiresSeparateShipment
                }
            })
        }, SnapshotOptions);

    private static string SerializeManifest(
        SampleShipment shipment,
        IReadOnlyDictionary<Guid, RegisteredSampleTube> tubesById,
        IReadOnlyDictionary<Guid, SampleTypeDefinition> sampleTypesById) =>
        JsonSerializer.Serialize(new
        {
            shipment.Id,
            shipment.ShipmentNumber,
            shipment.OrganizationId,
            authorizationSource = shipment.AuthorizationSource.ToString(),
            shipment.AuthorizationSourceId,
            shipment.AuthorizationReference,
            shipment.AuthorizationName,
            shipment.LabWorkOrderId,
            samples = shipment.Items
                .OrderBy(item => item.CustomerSampleId)
                .SelectMany(item => item.TubeSlots.Count > 0
                    ? item.TubeSlots.OrderBy(slot => slot.Ordinal).Select(slot => new
                    {
                        item.SubmittedSpecimenId,
                        item.SampleTypeDefinitionId,
                        sampleTypeName = sampleTypesById[item.SampleTypeDefinitionId].Name,
                        item.CustomerSampleId,
                        item.SampleName,
                        item.Quantity,
                        item.QuantityUnit,
                        tubeSlotId = (Guid?)slot.Id,
                        tubeOrdinal = slot.Ordinal,
                        tubeCount = item.TubeSlots.Count,
                        registeredSampleTubeId = slot.RegisteredSampleTubeId,
                        supplierTubeBarcode = slot.RegisteredSampleTubeId.HasValue
                            ? tubesById[slot.RegisteredSampleTubeId.Value].SupplierBarcode
                            : null
                    })
                    : new[] { new
                {
                    item.SubmittedSpecimenId,
                    item.SampleTypeDefinitionId,
                    sampleTypeName = sampleTypesById[item.SampleTypeDefinitionId].Name,
                    item.CustomerSampleId,
                    item.SampleName,
                    item.Quantity,
                    item.QuantityUnit,
                    tubeSlotId = (Guid?)null,
                    tubeOrdinal = 1,
                    tubeCount = 1,
                    registeredSampleTubeId = item.RegisteredSampleTubeId,
                    supplierTubeBarcode = item.RegisteredSampleTubeId.HasValue
                        ? tubesById[item.RegisteredSampleTubeId.Value].SupplierBarcode
                        : null
                } })
        }, SnapshotOptions);
}
