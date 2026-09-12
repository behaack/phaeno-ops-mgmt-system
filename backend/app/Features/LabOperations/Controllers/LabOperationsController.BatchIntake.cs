namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpPost("work-orders/{workOrderId:guid}/shipments/{shipmentId:guid}/tubes/accept-remaining")]
    public async Task<LabWorkOrderDetailDto> AcceptRemainingTubes(Guid workOrderId, Guid shipmentId,
        [FromBody] AcceptRemainingTubesRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty || !request.InspectionConfirmed || request.Tubes is null || request.Tubes.Count is < 1 or > 500)
            throw Invalid("tube_batch_confirmation_required", "Confirm inspection of between 1 and 500 identified tubes.");
        if (request.Tubes.Any(t => t is null)) throw Invalid("tube_batch_identity_invalid", "Identify every tube in this batch.");
        var barcodes = request.Tubes.Select(t => t.SupplierTubeBarcode?.Trim() ?? string.Empty).ToArray();
        if (barcodes.Any(string.IsNullOrWhiteSpace) || barcodes.Distinct(StringComparer.OrdinalIgnoreCase).Count() != barcodes.Length)
            throw Invalid("tube_batch_identity_invalid", "Identify each tube once in this batch.");
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await SampleShippingPackingData.BeginAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken) : null;
        if (transaction is null) await SampleShippingPackingData.LockAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { shipmentId, request }, JsonOptions))));
        var receipts = await dbContext.LabWorkEvents.AsNoTracking().Where(e => e.LabWorkOrderId == workOrderId && e.EventCode == "TubeBatchAccepted")
            .Select(e => e.DetailsJson).ToListAsync(cancellationToken);
        foreach (var value in receipts)
        {
            var receipt = JsonSerializer.Deserialize<TubeBatchReceipt>(value, JsonOptions)!;
            if (receipt.RequestId != request.RequestId) continue;
            if (receipt.ActorId != actor.User.Id || receipt.Hash != hash)
                throw Conflict("tube_batch_request_reused", "This request identifier belongs to a different intake decision.");
            return await WorkOrder(workOrderId, cancellationToken);
        }
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        EnsureVersion(work.Version, request.WorkOrderVersion);
        if (work.Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease)
            throw Conflict("tube_intake_work_closed", "Closed work cannot receive intake decisions.");
        if (!SampleShippingBarcode.TryNormalize(request.PacketBarcode, out var packetBarcode))
            throw Invalid("shipping_insert_barcode_required", "Scan the current PH-P- shipping insert.");
        var packet = await SampleShippingPackingData.ResolvePacketAsync(dbContext, packetBarcode, cancellationToken);
        if (packet.SampleShipmentId != shipmentId || packet.IsVoided)
            throw Conflict("sample_shipping_packet_invalid", "Review the current shipping insert before accepting tubes.");
        var shipment = await dbContext.SampleShipments.Include(s => s.Items).ThenInclude(i => i.TubeSlots)
            .SingleOrDefaultAsync(s => s.Id == shipmentId && s.LabWorkOrderId == work.Id, cancellationToken) ?? throw Missing();
        if (shipment.Status is SampleShipmentStatus.Cancelled or SampleShipmentStatus.Preparing || (shipment.DeliveredAt ?? shipment.ReceivedAt) is null)
            throw Conflict("shipment_receipt_required", "Receive this container before inspecting and accepting its tubes.");
        dbContext.Entry(shipment).Property(s => s.UpdatedAt).IsModified = true;
        var expected = shipment.Items.SelectMany(SampleShippingPackingData.TubeIds).ToHashSet();
        // Validate the complete selection first. Any changed decision cancels the whole batch.
        foreach (var input in request.Tubes)
        {
            if (!SupplierTubeBarcode.TryNormalize(input.SupplierTubeBarcode, out var barcode))
                throw Invalid("supplier_tube_barcode_invalid", "Use the complete registered barcode for every tube.");
            var registered = await dbContext.RegisteredSampleTubes.AsNoTracking().SingleOrDefaultAsync(t => t.SupplierBarcode == barcode, cancellationToken);
            if (registered is null || !expected.Contains(registered.Id))
                throw Conflict("tube_batch_not_expected", "Every selected tube must match this shipment's frozen crosswalk.");
            var tube = await dbContext.LabContainers.SingleOrDefaultAsync(t => t.Barcode == barcode, cancellationToken);
            if (tube is not null)
            {
                if (tube.LabWorkOrderId != work.Id || tube.Kind != LabContainerKind.SubmittedSpecimen || tube.IntakeDisposition is not null || tube.Status != LabContainerStatus.Available)
                    throw Conflict("tube_batch_decision_changed", $"{barcode} already has a decision or is unavailable. Refresh the batch; exceptions cannot be overwritten.");
                var specimen = await RequireSpecimenAsync(work.Id, tube.LabSpecimenId ?? Guid.Empty, cancellationToken);
                await RequireUnusedTubeIntakeAsync(work, specimen, tube, cancellationToken);
                if (tube.Location != input.FreezerBoxBarcode?.Trim())
                    throw Conflict("tube_batch_location_changed", "This tube already has a storage location. Bulk acceptance cannot move it.");
            }
            else if (registered.Status != RegisteredSampleTubeStatus.Assigned)
                throw Conflict("tube_batch_unavailable", $"{barcode} is no longer available for accession.");
            if (string.IsNullOrWhiteSpace(input.FreezerBoxBarcode) || input.FreezerBoxBarcode.Length > 255 || input.FreezerBoxBarcode.Any(char.IsControl))
                throw Invalid("freezer_box_barcode_required", "Record the actual freezer box for every accepted tube.");
        }
        foreach (var input in request.Tubes)
        {
            SupplierTubeBarcode.TryNormalize(input.SupplierTubeBarcode, out var barcode);
            var tube = await dbContext.LabContainers.SingleOrDefaultAsync(t => t.Barcode == barcode, cancellationToken);
            if (tube is null)
                await AccessionShipmentTube(work.Id, shipmentId, new(packetBarcode, barcode, input.FreezerBoxBarcode), cancellationToken);
            else
            {
                Execute(() => tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor.User.Id, DateTime.UtcNow));
                var specimen = await RequireSpecimenAsync(work.Id, tube.LabSpecimenId!.Value, cancellationToken);
                await RefreshSpecimenTubeIntakeAsync(work, specimen, tube, actor.User.Id, cancellationToken);
            }
        }
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, null, "TubeBatchAccepted", DateTime.UtcNow, actor.User.Id,
            JsonSerializer.Serialize(new TubeBatchReceipt(request.RequestId, actor.User.Id, hash, barcodes), JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    private sealed record TubeBatchReceipt(Guid RequestId, Guid ActorId, string Hash, IReadOnlyList<string> Barcodes);
}
