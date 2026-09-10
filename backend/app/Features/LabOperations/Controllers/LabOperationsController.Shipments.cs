namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpGet("shipments/queue")]
    public async Task<IReadOnlyList<LabShipmentQueueItemDto>> ShipmentQueue(
        CancellationToken cancellationToken, [FromQuery] bool received = false)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        // Filter before materializing: this is the complete container queue, not
        // the dashboard's bounded list of recently updated work orders.
        var query = dbContext.SampleShipments.AsNoTracking().Where(item => !item.IsPackingPool
            && item.Status != SampleShipmentStatus.Cancelled
            && (item.ContainerDefinitionId != null || item.ReturnKit != null)
            && item.Items.Any());
        query = received
            ? query.Where(item => item.DeliveredAt != null || item.ReceivedAt != null)
            : query.Where(item => item.DeliveredAt == null && item.ReceivedAt == null);
        var shipments = await query.Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Include(item => item.PacketRevisions).OrderBy(item => item.ShippedAt ?? item.CreatedAt)
            .ToListAsync(cancellationToken);
        var orgIds = shipments.Select(item => item.OrganizationId).Distinct().ToArray();
        var destinationIds = shipments.Select(item => item.DestinationId).Distinct().ToArray();
        var organizations = await dbContext.Organizations.AsNoTracking().Where(item => orgIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
        var destinations = await dbContext.SampleShippingDestinations.AsNoTracking().Where(item => destinationIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
        var tubeIds = shipments.SelectMany(item => item.Items).SelectMany(SampleShippingPackingData.TubeIds).Distinct().ToArray();
        var accessioned = (await dbContext.RegisteredSampleTubes.AsNoTracking()
            .Where(item => tubeIds.Contains(item.Id) && item.AccessionedAt != null)
            .Select(item => item.Id).ToListAsync(cancellationToken)).ToHashSet();
        return shipments.Select(item =>
        {
            var packet = item.PacketRevisions.Where(value => !value.IsVoided).OrderByDescending(value => value.Revision).FirstOrDefault();
            return new LabShipmentQueueItemDto(item.Id, item.ShipmentNumber, organizations[item.OrganizationId],
                item.AuthorizationReference, item.LabWorkOrderId, destinations[item.DestinationId], item.Status.ToString(),
                item.Carrier, item.TrackingNumber, item.ShippedAt, item.DeliveredAt ?? item.ReceivedAt,
                packet?.Barcode, packet?.PacketNumber, SampleShippingPackingData.TubeCount(item),
                item.Items.SelectMany(SampleShippingPackingData.TubeIds).Distinct().Count(accessioned.Contains));
        }).Where(item => !received || item.AccessionedTubeCount < item.ExpectedTubeCount).ToArray();
    }

    [HttpPost("shipments/receipt")]
    public async Task<LabShipmentReceiptDto> ReceiveShipment(
        [FromBody] LabShipmentReceiptRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.Operator, LabRole.Supervisor);
        if (!SampleShippingBarcode.TryNormalize(request.Barcode, out var barcode))
            throw Invalid("shipping_insert_barcode_required", "Scan the PH-P- barcode at the top right of the shipping insert to receive this container.");
        var identity = await dbContext.SampleShippingPacketRevisions.AsNoTracking()
            .Where(item => item.Barcode == barcode).Select(item => new { item.SampleShipmentId })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw Invalid("sample_shipping_packet_not_found", "No shipping insert matches this barcode.");
        var source = await dbContext.SampleShipments.AsNoTracking().Where(item => item.Id == identity.SampleShipmentId)
            .Select(item => new { item.AuthorizationSourceId, item.LabWorkOrderId }).SingleAsync(cancellationToken);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"sample-shipping:{source.AuthorizationSourceId}", cancellationToken);
        await SampleShippingPackingData.LockAsync(dbContext, $"lab-tube-receipt:{source.LabWorkOrderId}", cancellationToken);
        var packet = await dbContext.SampleShippingPacketRevisions.AsNoTracking().SingleAsync(item => item.Barcode == barcode, cancellationToken);
        if (packet.IsVoided)
            throw Conflict("sample_shipping_packet_voided", "This insert was replaced or cancelled. Scan the current insert; receipt was not recorded.");
        var shipment = await dbContext.SampleShipments.SingleAsync(item => item.Id == identity.SampleShipmentId, cancellationToken);
        if (shipment.IsPackingPool || shipment.Status is SampleShipmentStatus.Preparing or SampleShipmentStatus.Cancelled)
            throw Conflict("sample_shipping_state_invalid", "This container has no confirmed shipment available for receipt.");
        var alreadyReceived = shipment.DeliveredAt.HasValue || shipment.ReceivedAt.HasValue;
        if (!alreadyReceived)
        {
            var now = DateTime.UtcNow;
            Execute(() => shipment.MarkDelivered(now));
            dbContext.LabWorkEvents.Add(new LabWorkEvent(shipment.LabWorkOrderId, null, "ShipmentReceived",
                now, actor.User.Id, JsonSerializer.Serialize(new { shipmentId = shipment.Id,
                    shipment.ShipmentNumber, packetRevisionId = packet.Id, packet.Barcode, packet.Revision }, JsonOptions)));
            await dbContext.SaveChangesAsync(cancellationToken);
            var work = await RequireWorkOrderAsync(shipment.LabWorkOrderId, cancellationToken);
            await PublishIntakeProgressAsync(work, actor.User.Id, cancellationToken);
        }
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return new(shipment.Id, shipment.ShipmentNumber, barcode,
            (shipment.DeliveredAt ?? shipment.ReceivedAt)!.Value, alreadyReceived);
    }
}
