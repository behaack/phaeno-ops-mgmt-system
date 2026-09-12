namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpPost("work-orders/{workOrderId:guid}/milestone")]
    public async Task<LabWorkOrderDetailDto> SetMilestone(Guid workOrderId,
        [FromBody] WorkMilestoneRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        if (!Enum.TryParse<LabWorkOrderStatus>(request.Status, true, out var status)
            || status is LabWorkOrderStatus.ReadyForRelease or LabWorkOrderStatus.Cancelled)
            throw Invalid("lab_milestone_invalid", "The requested laboratory milestone is invalid for this action.");
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        EnsureVersion(work.Version, request.Version);
        if (status is not (LabWorkOrderStatus.AwaitingSpecimens or LabWorkOrderStatus.Received or LabWorkOrderStatus.OnHold))
            await RequireUsablePinnedWorkflowAsync(work, cancellationToken);
        if (work.TubeUsePolicyKey is not null && status is not (LabWorkOrderStatus.Received or LabWorkOrderStatus.OnHold))
            await RequireSpecimenReviewReadinessAsync(work, cancellationToken);
        Execute(() => work.RecordMilestone(status));
        await EmitProjectionAsync(work, actor.User.Id, "MilestoneChanged", cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/receipt")]
    public async Task<LabWorkOrderDetailDto> ReceiveSpecimen(Guid workOrderId, Guid specimenId,
        [FromBody] SpecimenReceiptRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await SampleShippingPackingData.BeginAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken)
            : null;
        if (transaction is null)
            await SampleShippingPackingData.LockAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        var specimen = await RequireSpecimenAsync(work.Id, specimenId, cancellationToken);
        EnsureVersion(specimen.Version, request.Version);
        var hasPacket = !string.IsNullOrWhiteSpace(request.SampleShippingPacketBarcode);
        var hasTube = !string.IsNullOrWhiteSpace(request.SupplierTubeBarcode);
        if (hasPacket != hasTube) throw Invalid("registered_tube_pair_required", "Scan both the shipment and physical tube barcode.");
        RegisteredSampleTube? receivedTube = null;
        SampleShipment? receivedShipment = null;
        if (hasPacket)
        {
            var packet = await SampleShippingPackingData.ResolvePacketAsync(dbContext, request.SampleShippingPacketBarcode, cancellationToken);
            if (packet.IsVoided) throw Conflict("sample_shipping_packet_voided", "This manifest has been replaced. Scan the current manifest.");
            receivedShipment = await dbContext.SampleShipments.Include(item => item.Items).ThenInclude(item => item.TubeSlots)
                .SingleOrDefaultAsync(item => item.Id == packet.SampleShipmentId && item.LabWorkOrderId == work.Id, cancellationToken)
                ?? throw Conflict("sample_shipping_work_mismatch", "This shipment does not belong to the selected laboratory work.");
            if (receivedShipment.Status is SampleShipmentStatus.Preparing or SampleShipmentStatus.Cancelled)
                throw Conflict("sample_shipping_state_invalid", "This shipment is not ready for receipt.");
            if (!SupplierTubeBarcode.TryNormalize(request.SupplierTubeBarcode, out var normalizedTube))
                throw Invalid("supplier_tube_barcode_invalid", "Scan the complete physical tube barcode.");
            receivedTube = await dbContext.RegisteredSampleTubes.SingleOrDefaultAsync(item => item.SupplierBarcode == normalizedTube, cancellationToken)
                ?? throw Conflict("supplier_tube_not_registered", "This tube is not registered.");
            var matchingItem = receivedShipment.Items.SingleOrDefault(item => item.SubmittedSpecimenId == specimen.SubmittedSpecimenId);
            if (matchingItem is null || !SampleShippingPackingData.TubeIds(matchingItem).Contains(receivedTube.Id))
                throw Conflict("supplier_tube_sample_mismatch", "The physical tube is not listed for this sample in this shipment.");
            Execute(() => receivedTube.RecordReceipt(request.ReceivedAtUtc));
            if (specimen.ReceivedAtUtc is null)
                Execute(() => specimen.RecordReceipt(request.ReceivedAtUtc, request.ReceiptCondition, request.CurrentLocation));
            dbContext.Entry(specimen).Property(item => item.Version).IsModified = true;
        }
        else
        {
            if (await dbContext.SampleShipmentItems.AnyAsync(item => item.SubmittedSpecimenId == specimen.SubmittedSpecimenId
                    && (item.RegisteredSampleTubeId.HasValue || item.TubeSlots.Any(slot => slot.RegisteredSampleTubeId.HasValue)), cancellationToken))
                throw Conflict("physical_tube_receipt_required", "Scan the shipment and physical tube to record receipt. Each tube is received separately.");
            Execute(() => specimen.RecordReceipt(request.ReceivedAtUtc, request.ReceiptCondition, request.CurrentLocation));
        }
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimen.Id, "SpecimenReceived",
            DateTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(new { request.ReceiptCondition, request.CurrentLocation,
                registeredSampleTubeId = receivedTube?.Id, shipmentId = receivedShipment?.Id }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (receivedShipment is not null)
            await SampleShippingPackingData.ReconcileReceiptAsync(dbContext, receivedShipment.Id, cancellationToken);
        await PublishIntakeProgressAsync(work, actor.User.Id, cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/accession")]
    public async Task<LabWorkOrderDetailDto> AccessionSpecimen(Guid workOrderId, Guid specimenId,
        [FromBody] SpecimenAccessionRequest request, CancellationToken cancellationToken)
        => await AccessionSpecimenCore(workOrderId, specimenId, request, cancellationToken);

    [HttpPost("work-orders/{workOrderId:guid}/shipments/{shipmentId:guid}/tubes/accession")]
    public async Task<LabWorkOrderDetailDto> AccessionShipmentTube(Guid workOrderId, Guid shipmentId,
        [FromBody] ShipmentTubeAccessionRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken, LabRole.Operator, LabRole.Supervisor);
        if (!SampleShippingBarcode.TryNormalize(request.PacketBarcode, out var packetBarcode))
            throw Invalid("shipping_insert_barcode_required", "Scan the complete PH-P- shipping insert barcode.");
        var box = request.FreezerBoxBarcode?.Trim();
        var rejected = string.Equals(request.IntakeDisposition, "Rejected", StringComparison.OrdinalIgnoreCase);
        if ((!rejected && string.IsNullOrWhiteSpace(box)) || box?.Length > 255 || box?.Any(char.IsControl) == true)
            throw Invalid("freezer_box_barcode_required", "Scan the freezer box barcode (up to 255 characters).");
        var packet = await SampleShippingPackingData.ResolvePacketAsync(dbContext, packetBarcode, cancellationToken);
        if (packet.SampleShipmentId != shipmentId || packet.IsVoided)
            throw Conflict("sample_shipping_packet_invalid", "Scan the current insert for this container.");
        var shipment = await dbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .SingleOrDefaultAsync(item => item.Id == shipmentId && item.LabWorkOrderId == workOrderId, cancellationToken)
            ?? throw Conflict("sample_shipping_work_mismatch", "The container does not belong to this laboratory work.");
        if (!SupplierTubeBarcode.TryNormalize(request.SupplierTubeBarcode, out var tubeBarcode))
            throw Invalid("supplier_tube_barcode_invalid", "Scan the complete tube barcode.");
        var tube = await dbContext.RegisteredSampleTubes.AsNoTracking().SingleOrDefaultAsync(item => item.SupplierBarcode == tubeBarcode, cancellationToken)
            ?? throw Conflict("supplier_tube_not_registered", "This tube is not registered.");
        var item = shipment.Items.SingleOrDefault(item => SampleShippingPackingData.TubeIds(item).Contains(tube.Id))
            ?? throw Conflict("supplier_tube_sample_mismatch", "This tube is not expected in this container.");
        var specimenId = await dbContext.LabSpecimens.AsNoTracking()
            .Where(specimen => specimen.LabWorkOrderId == workOrderId && specimen.SubmittedSpecimenId == item.SubmittedSpecimenId)
            .Select(specimen => specimen.Id).SingleAsync(cancellationToken);
        return await AccessionSpecimenCore(workOrderId, specimenId,
            new SpecimenAccessionRequest("", tubeBarcode, box, null, null, null, 0, packetBarcode, tubeBarcode,
                request.IntakeDisposition, request.IntakeReasonCode, request.IntakeNotes),
            cancellationToken, automaticAccession: true);
    }

    private async Task<LabWorkOrderDetailDto> AccessionSpecimenCore(Guid workOrderId, Guid specimenId,
        SpecimenAccessionRequest request, CancellationToken cancellationToken, bool automaticAccession = false)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        // Trial guards own the surrounding transaction; retain their rollback authority.
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await SampleShippingPackingData.BeginAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken)
            : null;
        if (transaction is null)
            await SampleShippingPackingData.LockAsync(dbContext, $"lab-tube-receipt:{workOrderId}", cancellationToken);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        var specimen = await RequireSpecimenAsync(work.Id, specimenId, cancellationToken);
        if (work.Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.ReadyForRelease || specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Cancelled)
            throw Conflict("tube_intake_work_closed", "Closed work cannot receive tube intake decisions.");
        if (!Enum.TryParse<LabSpecimenIntakeDisposition>(request.IntakeDisposition, true, out var intake))
            throw Invalid("tube_intake_invalid", "Choose Accepted, On hold or Rejected.");
        if (automaticAccession)
            request = request with { AccessionNumber = specimen.AccessionNumber ?? $"ACC-{specimen.Id:N}" };
        else EnsureVersion(specimen.Version, request.Version);
        if (!string.IsNullOrWhiteSpace(specimen.AccessionNumber) && !string.Equals(specimen.AccessionNumber, request.AccessionNumber?.Trim(), StringComparison.Ordinal))
            throw Conflict("specimen_accession_mismatch", "Additional tubes for this specimen must use its existing accession number.");
        var hasPacketBarcode = !string.IsNullOrWhiteSpace(request.SampleShippingPacketBarcode);
        var hasSupplierTubeBarcode = !string.IsNullOrWhiteSpace(request.SupplierTubeBarcode);
        if (hasPacketBarcode != hasSupplierTubeBarcode)
            throw Invalid("registered_tube_pair_required", "Scan both the shipment packet and supplier tube barcode, or leave both blank for the legacy Phaeno-label workflow.");

        string barcode;
        var barcodeSource = LabContainerBarcodeSource.PhaenoGenerated;
        Guid? externalBarcodeReferenceId = null;
        RegisteredSampleTube? registeredTube = null;
        Guid? accessionShipmentId = null;
        if (hasPacketBarcode)
        {
            if (!SupplierTubeBarcode.TryNormalize(request.SupplierTubeBarcode, out var supplierBarcode))
                throw Invalid("supplier_tube_barcode_invalid", "Scan or enter a complete supplier tube barcode.");
            var packet = await SampleShippingPackingData.ResolvePacketAsync(dbContext, request.SampleShippingPacketBarcode, cancellationToken);
            if (packet.IsVoided)
                throw Conflict("sample_shipping_packet_voided", "This shipment packet was voided and cannot be used for accession.");
            var shipment = await dbContext.SampleShipments.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == packet.SampleShipmentId
                    && item.LabWorkOrderId == work.Id, cancellationToken)
                ?? throw Conflict("sample_shipping_work_mismatch", "The shipment packet does not belong to this Lab work order.");
            if (shipment.Status is SampleShipmentStatus.Cancelled or SampleShipmentStatus.Preparing)
                throw Conflict("sample_shipping_state_invalid", "The shipment packet is not ready for accession.");
            accessionShipmentId = shipment.Id;
            if (automaticAccession && shipment.DeliveredAt is null && shipment.ReceivedAt is null)
                throw Conflict("shipment_receipt_required", "Receive this container before accessioning its tubes.");
            var shipmentItem = await dbContext.SampleShipmentItems.AsNoTracking()
                .SingleOrDefaultAsync(item => item.SampleShipmentId == shipment.Id
                    && item.SubmittedSpecimenId == specimen.SubmittedSpecimenId, cancellationToken)
                ?? throw Conflict("sample_shipping_specimen_mismatch", "The submitted specimen is not listed on this shipment packet.");
            registeredTube = await dbContext.RegisteredSampleTubes
                .SingleOrDefaultAsync(item => item.SupplierBarcode == supplierBarcode, cancellationToken)
                ?? throw Conflict("supplier_tube_not_registered", "The supplier tube barcode is not registered in POMS.");
            var slotMatches = await dbContext.SampleShipmentTubeSlots.AsNoTracking()
                .AnyAsync(slot => slot.SampleShipmentItemId == shipmentItem.Id
                    && slot.RegisteredSampleTubeId == registeredTube.Id, cancellationToken);
            if (shipmentItem.RegisteredSampleTubeId != registeredTube.Id && !slotMatches)
                throw Conflict("supplier_tube_sample_mismatch", "The scanned tube is not matched to this Customer sample on the frozen crosswalk.");
            var existingContainer = await dbContext.LabContainers
                .SingleOrDefaultAsync(item => item.Barcode == supplierBarcode, cancellationToken);
            if (automaticAccession && existingContainer is not null)
            {
                if (existingContainer.LabWorkOrderId != work.Id || existingContainer.LabSpecimenId != specimen.Id
                    || existingContainer.Location != (string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim()))
                    throw Conflict("supplier_tube_already_accessioned", "This tube was already accessioned. Its recorded storage cannot be changed during intake.");
                if (existingContainer.IntakeDisposition is null)
                {
                    await RequireUnusedTubeIntakeAsync(work, specimen, existingContainer, cancellationToken);
                    Execute(() => existingContainer.ReviewIntake(intake, request.IntakeReasonCode, request.IntakeNotes, actor.User.Id, DateTime.UtcNow));
                    await RefreshSpecimenTubeIntakeAsync(work, specimen, existingContainer, actor.User.Id, cancellationToken);
                    await dbContext.SaveChangesAsync(cancellationToken);
                    if (transaction is not null) await transaction.CommitAsync(cancellationToken);
                }
                else if (existingContainer.IntakeDisposition != intake
                    || existingContainer.IntakeReasonCode != (string.IsNullOrWhiteSpace(request.IntakeReasonCode) ? null : request.IntakeReasonCode.Trim())
                    || existingContainer.IntakeNotes != (string.IsNullOrWhiteSpace(request.IntakeNotes) ? null : request.IntakeNotes.Trim()))
                    throw Conflict("supplier_tube_intake_recorded", "An intake decision is already recorded. A supervisor can correct it from the tube's details.");
                return await WorkOrder(work.Id, cancellationToken);
            }
            if (registeredTube.Status != RegisteredSampleTubeStatus.Assigned)
                throw Conflict("supplier_tube_state_invalid", "The registered supplier tube is not available for accession.");
            if (await dbContext.LabContainers.AsNoTracking().AnyAsync(item => item.Barcode == supplierBarcode, cancellationToken))
                throw Conflict("supplier_tube_already_accessioned", "A laboratory container already uses this supplier tube barcode.");
            barcode = supplierBarcode;
            barcodeSource = LabContainerBarcodeSource.RegisteredSupplier;
            externalBarcodeReferenceId = registeredTube.Id;
            // Container arrival is acknowledged separately. A validated physical
            // tube can now record its individual intake during accession.
            if (specimen.ReceivedAtUtc is null && (shipment.DeliveredAt ?? shipment.ReceivedAt) is DateTime arrivedAt)
                Execute(() => specimen.RecordReceipt(arrivedAt, null, request.Location));
        }
        else
        {
            if (await dbContext.SampleShipmentItems.AnyAsync(item => item.SubmittedSpecimenId == specimen.SubmittedSpecimenId
                    && (item.RegisteredSampleTubeId.HasValue || item.TubeSlots.Any(slot => slot.RegisteredSampleTubeId.HasValue)), cancellationToken))
                throw Conflict("registered_tube_pair_required", "Scan the shipment and registered physical tube for this sample.");
            barcode = await LabBarcodeService.AllocateAsync(
                dbContext, LabContainerKind.SubmittedSpecimen, cancellationToken);
        }
        if (string.IsNullOrWhiteSpace(specimen.AccessionNumber))
            Execute(() => specimen.AssignAccession(request.AccessionNumber ?? string.Empty));
        var container = new LabContainer(work.Id, specimen.Id, null,
            LabContainerKind.SubmittedSpecimen, barcode, request.Label,
            request.Location,
            intake == LabSpecimenIntakeDisposition.Rejected && string.IsNullOrWhiteSpace(request.Location) ? null : request.Quantity,
            intake == LabSpecimenIntakeDisposition.Rejected && string.IsNullOrWhiteSpace(request.Location) ? null : request.QuantityUnit,
            request.RetainUntilUtc,
            barcodeSource, externalBarcodeReferenceId, rejectedAtIntake: intake == LabSpecimenIntakeDisposition.Rejected);
        if (registeredTube is not null)
        {
            Execute(() => registeredTube.RecordReceipt(DateTime.UtcNow));
            registeredTube.MarkAccessioned(DateTime.UtcNow);
        }
        Execute(() => container.ReviewIntake(intake, request.IntakeReasonCode, request.IntakeNotes, actor.User.Id, DateTime.UtcNow));
        dbContext.LabContainers.Add(container);
        await RefreshSpecimenTubeIntakeAsync(work, specimen, container, actor.User.Id, cancellationToken);
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimen.Id, "SpecimenAccessioned",
            DateTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(new
            {
                request.AccessionNumber,
                freezerBoxBarcode = automaticAccession ? request.Location : null,
                barcode,
                barcodeSource,
                registeredSampleTubeId = externalBarcodeReferenceId
            }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (accessionShipmentId.HasValue)
            await SampleShippingPackingData.ReconcileReceiptAsync(dbContext, accessionShipmentId.Value, cancellationToken);
        await PublishIntakeProgressAsync(work, actor.User.Id, cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await WorkOrder(work.Id, cancellationToken);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/disposition")]
    public async Task<LabWorkOrderDetailDto> SetSpecimenDisposition(Guid workOrderId, Guid specimenId,
        [FromBody] SpecimenDispositionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        await RequireWorkOrderAsync(workOrderId, cancellationToken);
        await RequireSpecimenAsync(workOrderId, specimenId, cancellationToken);
        throw Conflict("tube_review_required", "Record tube intake during accessioning. Specimen acceptance is derived from its tubes.");
    }

    [HttpPost("work-orders/{workOrderId:guid}/containers")]
    public async Task<LabContainerDto> CreateContainer(Guid workOrderId,
        [FromBody] CreateContainerRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        await RequireWorkOrderAsync(workOrderId, cancellationToken);
        if (!Enum.TryParse<LabContainerKind>(request.Kind, true, out var kind))
            throw Invalid("container_kind_invalid", "The container kind is invalid.");
        if (request.LabSpecimenId.HasValue)
            await RequireSpecimenAsync(workOrderId, request.LabSpecimenId.Value, cancellationToken);
        if (request.ParentContainerId.HasValue && !await dbContext.LabContainers
            .AnyAsync(item => item.Id == request.ParentContainerId && item.LabWorkOrderId == workOrderId, cancellationToken))
            throw Missing();
        var barcode = await LabBarcodeService.AllocateAsync(dbContext, kind, cancellationToken);
        var container = new LabContainer(workOrderId, request.LabSpecimenId,
            request.ParentContainerId, kind, barcode, request.Label,
            request.Location, request.Quantity, request.QuantityUnit, request.RetainUntilUtc);
        await AttachDerivedContainerAsync(container, cancellationToken);
        dbContext.LabContainers.Add(container);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapContainer(container);
    }

    [HttpGet("containers/scan")]
    public async Task<LabContainerScanDto> ScanContainer(
        [FromQuery] string barcode,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        if (!LabBarcodeService.TryNormalize(barcode, out var normalized)
            && !SupplierTubeBarcode.TryNormalize(barcode, out normalized))
            throw Invalid("barcode_invalid", "Scan or enter a complete Phaeno or registered supplier barcode.");
        var container = await dbContext.LabContainers.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Barcode == normalized, cancellationToken)
            ?? throw new OrderManagementException(
                "barcode_not_found",
                "No laboratory container matches this barcode.",
                StatusCodes.Status404NotFound);
        var context = await ReadContainerContextAsync(container, cancellationToken);
        return new LabContainerScanDto(
            container.LabWorkOrderId,
            context.CommercialOrderNumber,
            context.AccessionNumber,
            context.ParentBarcode,
            context.Library?.Id,
            context.Library?.Status.ToString(),
            MapContainer(container));
    }

    [HttpGet("containers/{containerId:guid}/label")]
    public async Task<LabContainerLabelDto> ContainerLabel(
        Guid containerId,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.ProtocolAdministrator,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var container = await dbContext.LabContainers.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == containerId, cancellationToken)
            ?? throw Missing();
        return await ReadContainerLabelAsync(container, cancellationToken);
    }

    [HttpPost("containers/{containerId:guid}/label-print")]
    public async Task<LabContainerLabelDto> PrintContainerLabel(
        Guid containerId,
        [FromBody] RecordLabelPrintRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        var container = await dbContext.LabContainers.SingleOrDefaultAsync(item => item.Id == containerId, cancellationToken)
            ?? throw Missing();
        if (container.BarcodeSource == LabContainerBarcodeSource.RegisteredSupplier)
            throw Conflict(
                "registered_supplier_label_not_allowed",
                "This submitted tube keeps its qualified permanent supplier barcode and must not receive a second POMS label.");
        var reason = request.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 500)
            throw Invalid("label_print_reason_required", "Enter a label-print reason of 500 characters or fewer.");
        var outcome = request.Outcome?.Trim().ToLowerInvariant() switch
        {
            "succeeded" => "Succeeded",
            "failed" => "Failed",
            _ => throw Invalid("label_print_outcome_invalid", "Record whether the label printed or failed.")
        };
        var failureDetails = string.IsNullOrWhiteSpace(request.FailureDetails)
            ? null
            : request.FailureDetails.Trim();
        if (outcome == "Failed" && failureDetails is null)
            throw Invalid("label_print_failure_details_required", "Describe why the label did not print.");
        if (failureDetails?.Length > 1000)
            throw Invalid("label_print_failure_details_invalid", "Print-failure details cannot exceed 1000 characters.");

        var occurredAtUtc = DateTime.UtcNow;
        if (outcome == "Succeeded")
        {
            container.RecordLabelPrint(actor.User.Id, occurredAtUtc);
            failureDetails = null;
        }

        var eventCode = outcome == "Succeeded"
            ? "ContainerLabelPrintSucceeded"
            : "ContainerLabelPrintFailed";
        dbContext.LabWorkEvents.Add(new LabWorkEvent(container.LabWorkOrderId, container.LabSpecimenId,
            eventCode, occurredAtUtc, actor.User.Id,
            JsonSerializer.Serialize(new
            {
                containerId = container.Id,
                container.Barcode,
                outcome,
                reason,
                failureDetails,
                printNumber = outcome == "Succeeded" ? container.LabelPrintCount : (int?)null
            }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await ReadContainerLabelAsync(container, cancellationToken);
    }

    [HttpPost("work-orders/{workOrderId:guid}/executions")]
    public async Task<LabExecutionDto> CreateExecution(Guid workOrderId,
        [FromBody] CreateExecutionRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        var work = await RequireWorkOrderAsync(workOrderId, cancellationToken);
        if (work.TubeUsePolicyKey is not null || request.LabSpecimenId.HasValue)
            throw Conflict("source_attempt_required", "Open the specimen and select its source tube; assign subsequent stages from the same attempt.");

        if (request.AssignedToUserId.HasValue)
        {
            var assignee = await dbContext.Users.Include(item => item.Memberships).ThenInclude(item => item.Organization)
                .SingleOrDefaultAsync(item => item.Id == request.AssignedToUserId.Value, cancellationToken);
            var eligibleRole = await dbContext.LabRoleAssignments.AsNoTracking().AnyAsync(item =>
                item.UserId == request.AssignedToUserId.Value && item.IsActive
                && (item.Role == LabRole.Operator || item.Role == LabRole.Supervisor || item.Role == LabRole.OperationsAdministrator), cancellationToken);
            if (assignee is null || !LabOperationsAuthorization.IsEligibleLabStaff(assignee) || !eligibleRole)
                throw Invalid("lab_assignee_not_eligible", "Choose an active laboratory operator, supervisor, or operations administrator.");
        }

        var workflowVersionId = work.LabServiceWorkflowVersionId;
        if (!workflowVersionId.HasValue)
        {
            workflowVersionId = await (
                from workflow in dbContext.LabServiceWorkflows.AsNoTracking()
                join version in dbContext.LabServiceWorkflowVersions.AsNoTracking()
                    on workflow.Id equals version.LabServiceWorkflowId
                where workflow.ServiceKey == work.ServiceKey.ToLower()
                    && version.Status == LabServiceWorkflowStatus.Production
                orderby version.WorkflowVersion descending
                select (Guid?)version.Id).FirstOrDefaultAsync(cancellationToken);
            if (!workflowVersionId.HasValue)
                throw Conflict("service_workflow_not_in_production",
                    "This service does not have a production laboratory workflow. Promote one before starting work.");
            Execute(() => work.PinServiceWorkflow(workflowVersionId.Value));
        }

        LabServiceWorkflowStage? stage;
        if (request.LabServiceWorkflowStageId.HasValue)
        {
            stage = await dbContext.LabServiceWorkflowStages.AsNoTracking().SingleOrDefaultAsync(item =>
                item.Id == request.LabServiceWorkflowStageId.Value
                && item.LabServiceWorkflowVersionId == workflowVersionId.Value,
                cancellationToken);
        }
        else
        {
            stage = await dbContext.LabServiceWorkflowStages.AsNoTracking().SingleOrDefaultAsync(item =>
                item.LabServiceWorkflowVersionId == workflowVersionId.Value
                && item.LabProtocolVersionId == request.LabProtocolVersionId,
                cancellationToken);
        }
        if (stage is null)
            throw Conflict("protocol_not_in_pinned_workflow",
                "Choose a protocol stage from this job's pinned laboratory workflow.");
        if (request.LabProtocolVersionId != stage.LabProtocolVersionId)
            throw Invalid("workflow_stage_protocol_mismatch",
                "The selected workflow stage and protocol version do not match.");
        var protocol = await dbContext.LabProtocolVersions.AsNoTracking()
            .SingleAsync(item => item.Id == stage.LabProtocolVersionId, cancellationToken);
        RequireProtocolDefinition(protocol.DefinitionJson);
        var priorRequiredStageIds = await dbContext.LabServiceWorkflowStages.AsNoTracking()
            .Where(item => item.LabServiceWorkflowVersionId == workflowVersionId.Value
                && item.Sequence < stage.Sequence
                && item.Requirement == LabServiceWorkflowStageRequirement.Required)
            .Select(item => item.Id).ToListAsync(cancellationToken);
        if (priorRequiredStageIds.Count > 0)
        {
            var completedStageIds = await dbContext.LabProtocolExecutions.AsNoTracking()
                .Where(item => item.LabWorkOrderId == workOrderId
                    && item.LabSpecimenId == request.LabSpecimenId
                    && item.Status == LabExecutionStatus.Completed
                    && item.LabServiceWorkflowStageId.HasValue
                    && priorRequiredStageIds.Contains(item.LabServiceWorkflowStageId.Value))
                .Select(item => item.LabServiceWorkflowStageId!.Value)
                .Distinct().ToListAsync(cancellationToken);
            if (completedStageIds.Count != priorRequiredStageIds.Count)
                throw Conflict("workflow_prior_required_stage_incomplete",
                    "Complete all earlier required workflow stages before assigning this stage.");
        }
        await RequireUsablePinnedWorkflowAsync(work, cancellationToken);
        await RequireCurrentProtocolsAsync([stage.LabProtocolVersionId], cancellationToken);
        var execution = new LabProtocolExecution(workOrderId, request.LabSpecimenId,
            stage.LabProtocolVersionId, request.AssignedToUserId, stage.Id);
        dbContext.LabProtocolExecutions.Add(execution);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapExecution(execution);
    }

    [HttpPost("executions/{executionId:guid}/transition")]
    public async Task<LabExecutionDto> TransitionExecution(Guid executionId,
        [FromBody] ExecutionTransitionRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor);
        var execution = await dbContext.LabProtocolExecutions
            .SingleOrDefaultAsync(item => item.Id == executionId, cancellationToken) ?? throw Missing();
        EnsureVersion(execution.Version, request.Version);
        var work = await RequireOpenExecutionWorkAsync(execution.LabWorkOrderId, cancellationToken,
            allowHold: string.Equals(request.Action, "abandon", StringComparison.OrdinalIgnoreCase));
        switch (request.Action.Trim().ToLowerInvariant())
        {
            case "start":
                var sourceAttempt = await RequireExecutionAttemptAsync(execution, cancellationToken);
                if (sourceAttempt is not null)
                {
                    var source = await RequireAttemptSourceAsync(sourceAttempt, cancellationToken);
                    var next = await NextAttemptStageAsync(sourceAttempt, cancellationToken);
                    if (next?.Id != execution.LabServiceWorkflowStageId)
                        throw Conflict("attempt_stage_not_next", "Complete earlier stages within this attempt before starting.");
                    if (source.Barcode != request.ConfirmedSourceBarcode?.Trim())
                        throw Invalid("attempt_barcode_mismatch", "Scan the selected source tube before starting.");
                    if (sourceAttempt.State == LabSpecimenAttemptState.Planned)
                        Execute(() => sourceAttempt.Start(source.Barcode, request.ConfirmedSourceBarcode!, DateTime.UtcNow));
                }
                if (execution.LabSpecimenId.HasValue)
                {
                    var intakeSpecimen = await RequireSpecimenAsync(work.Id, execution.LabSpecimenId.Value, cancellationToken);
                    if (!await HasAcceptedAvailableTubeAsync(intakeSpecimen, cancellationToken))
                        throw Conflict("accepted_tube_required", "Complete tube intake during accessioning. At least one available tube must be Accepted before processing starts.");
                    dbContext.Entry(work).Property(item => item.UpdatedAt).IsModified = true;
                }
                await RequireUsablePinnedWorkflowAsync(work, cancellationToken);
                await RequireCurrentProtocolsAsync([execution.LabProtocolVersionId], cancellationToken);
                var startedProtocol = await dbContext.LabProtocolVersions.AsNoTracking()
                    .SingleAsync(item => item.Id == execution.LabProtocolVersionId, cancellationToken);
                RequireProtocolDefinition(startedProtocol.DefinitionJson);
                Execute(() => execution.Start(DateTime.UtcNow));
                if (work.Status is LabWorkOrderStatus.AwaitingSpecimens or LabWorkOrderStatus.Received)
                {
                    work.RecordMilestone(LabWorkOrderStatus.Processing);
                    await EmitProjectionAsync(work, actor.User.Id, "WorkStarted", cancellationToken);
                }
                break;
            case "complete":
                await RequireExecutionAttemptAsync(execution, cancellationToken);
                if (!string.IsNullOrWhiteSpace(request.CapturedResultsJson) && request.CapturedResultsJson.Trim() != "{}")
                    throw Invalid("execution_results_read_only", "Record each step in the guided execution workspace before completing the procedure.");
                var completedProtocol = await dbContext.LabProtocolVersions.AsNoTracking()
                    .SingleAsync(item => item.Id == execution.LabProtocolVersionId, cancellationToken);
                Execute(() => execution.Complete(completedProtocol, request.DeviationNote, DateTime.UtcNow));
                break;
            case "abandon":
                if (execution.LabSpecimenAttemptId.HasValue)
                    throw Conflict("attempt_closure_required", "Cancel an unstarted attempt or explicitly fail the started attempt from the specimen workspace.");
                Execute(() => execution.Abandon(request.DeviationNote));
                break;
            default: throw Invalid("execution_transition_invalid", "The execution transition is invalid.");
        }
        if (execution.LabSpecimenAttemptId.HasValue)
        {
            var updatedAttempt = await dbContext.LabSpecimenAttempts.SingleAsync(a => a.Id == execution.LabSpecimenAttemptId, cancellationToken);
            var updatedSpecimen = await RequireSpecimenAsync(work.Id, updatedAttempt.LabSpecimenId, cancellationToken);
            await RefreshAttemptOutcomeAsync(work, updatedSpecimen, updatedAttempt, actor.User.Id, cancellationToken);
        }
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, execution.LabSpecimenId,
            $"Execution{request.Action.Trim()}", DateTime.UtcNow, actor.User.Id,
            JsonSerializer.Serialize(new { execution.Id, execution.LabProtocolVersionId }, JsonOptions)));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapExecution(execution);
    }

    private async Task<LabContainerLabelDto> ReadContainerLabelAsync(
        LabContainer container,
        CancellationToken cancellationToken)
    {
        var context = await ReadContainerContextAsync(container, cancellationToken);
        var events = await dbContext.LabWorkEvents.AsNoTracking()
            .Where(item => item.LabWorkOrderId == container.LabWorkOrderId
                && (item.EventCode == "ContainerLabelPrintSucceeded"
                    || item.EventCode == "ContainerLabelPrintFailed"))
            .OrderByDescending(item => item.OccurredAtUtc)
            .ToListAsync(cancellationToken);
        var history = new List<LabLabelPrintEventDto>();
        foreach (var item in events)
        {
            try
            {
                using var details = JsonDocument.Parse(item.DetailsJson);
                var root = details.RootElement;
                if (!root.TryGetProperty("containerId", out var containerId)
                    || containerId.GetGuid() != container.Id)
                {
                    continue;
                }

                history.Add(new LabLabelPrintEventDto(
                    item.Id,
                    container.Id,
                    root.GetProperty("outcome").GetString() ?? "Unknown",
                    root.GetProperty("reason").GetString() ?? "Not recorded",
                    root.TryGetProperty("failureDetails", out var failureDetails)
                        && failureDetails.ValueKind != JsonValueKind.Null
                            ? failureDetails.GetString()
                            : null,
                    root.TryGetProperty("printNumber", out var printNumber)
                        && printNumber.ValueKind != JsonValueKind.Null
                            ? printNumber.GetInt32()
                            : null,
                    item.ActorUserId,
                    item.OccurredAtUtc));
            }
            catch (JsonException)
            {
                // A malformed historical event remains auditable in the event
                // stream but must not prevent the current label from rendering.
            }
        }

        return new LabContainerLabelDto(
            container.LabWorkOrderId,
            context.CommercialOrderNumber,
            context.AccessionNumber,
            context.ParentBarcode,
            MapContainer(container),
            history);
    }

    private async Task<ContainerContext> ReadContainerContextAsync(
        LabContainer container,
        CancellationToken cancellationToken)
    {
        var work = await dbContext.LabWorkOrders.AsNoTracking()
            .SingleAsync(item => item.Id == container.LabWorkOrderId, cancellationToken);
        var authorization = await dbContext.CommercialLabAuthorizations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.AuthorizationId == work.AuthorizationId, cancellationToken);
        var commercialOrderNumber = authorization is null
            ? null
            : await dbContext.LabServiceOrders.AsNoTracking()
                .Where(item => item.Id == authorization.CommercialOrderId)
                .Select(item => item.OrderNumber)
                .SingleOrDefaultAsync(cancellationToken);
        var accessionNumber = container.LabSpecimenId.HasValue
            ? await dbContext.LabSpecimens.AsNoTracking()
                .Where(item => item.Id == container.LabSpecimenId.Value)
                .Select(item => item.AccessionNumber)
                .SingleOrDefaultAsync(cancellationToken)
            : null;
        var parentBarcode = container.ParentContainerId.HasValue
            ? await dbContext.LabContainers.AsNoTracking()
                .Where(item => item.Id == container.ParentContainerId.Value)
                .Select(item => item.Barcode)
                .SingleOrDefaultAsync(cancellationToken)
            : null;
        var library = await dbContext.LabLibraries.AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.LibraryContainerId == container.Id,
                cancellationToken);
        return new ContainerContext(
            commercialOrderNumber,
            accessionNumber,
            parentBarcode,
            library);
    }

    private sealed record ContainerContext(
        string? CommercialOrderNumber,
        string? AccessionNumber,
        string? ParentBarcode,
        LabLibrary? Library);
}
