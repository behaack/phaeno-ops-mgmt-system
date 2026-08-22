namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/sample-shipping")]
public sealed class SampleShippingWorkflowController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    SampleShippingPacketService packetService,
    SampleShippingWorkflowReader reader) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<SampleShipmentWorkflowDto>> Shipments(CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireSampleShippingTenantAsync(HttpContext, false, cancellationToken);
        return await reader.ListAsync(tenant.Organization.Id, cancellationToken);
    }

    [HttpGet("{shipmentId:guid}")]
    public async Task<SampleShipmentWorkflowDto> Shipment(Guid shipmentId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireSampleShippingTenantAsync(HttpContext, false, cancellationToken);
        return await reader.ReadAsync(shipmentId, tenant.Organization.Id, cancellationToken);
    }

    [HttpPut("{shipmentId:guid}/items/{shipmentItemId:guid}/tube")]
    public async Task<SampleShipmentWorkflowDto> AssignTube(
        Guid shipmentId,
        Guid shipmentItemId,
        [FromBody] AssignSampleTubeRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireSampleShippingTenantAsync(HttpContext, true, cancellationToken);
        var shipment = await dbContext.SampleShipments
            .Include(item => item.Items)
                .ThenInclude(item => item.TubeSlots)
            .Include(item => item.PacketRevisions)
            .Include(item => item.ReturnKit)
                .ThenInclude(item => item!.Tubes)
            .SingleOrDefaultAsync(item => item.Id == shipmentId
                && item.OrganizationId == tenant.Organization.Id, cancellationToken)
            ?? throw Missing();
        var currentPacket = shipment.PacketRevisions
            .Where(value => !value.IsVoided)
            .OrderByDescending(value => value.Revision)
            .FirstOrDefault();
        if (shipment.Status is not (SampleShipmentStatus.Preparing or SampleShipmentStatus.ReadyToShip)
            || (shipment.Status == SampleShipmentStatus.ReadyToShip && currentPacket is null))
            throw Conflict(
                "sample_tube_assignment_locked",
                "Tube assignments can be corrected only before the return shipment is recorded as shipped.");
        if (shipment.ReturnKit is not { Status: SampleReturnKitStatus.Fulfilled } kit)
            throw Conflict("sample_return_kit_not_fulfilled", "Phaeno must fulfill the registered return kit before tubes can be matched.");
        var item = shipment.Items.SingleOrDefault(value => value.Id == shipmentItemId) ?? throw Missing();
        var slot = request.TubeSlotId.HasValue
            ? item.TubeSlots.SingleOrDefault(value => value.Id == request.TubeSlotId.Value) ?? throw Missing()
            : null;
        if (item.TubeSlots.Count > 0 && slot is null)
            throw Invalid("sample_tube_slot_required", "Select the specific tube slot to match.");
        EnsureVersion(slot?.Version ?? item.Version, request.Version);
        if (!SupplierTubeBarcode.TryNormalize(request.SupplierBarcode, out var normalized))
            throw Invalid("supplier_tube_barcode_invalid", "Scan or enter the complete barcode from a Phaeno-supplied tube.");
        var tube = kit.Tubes.SingleOrDefault(value => value.SupplierBarcode == normalized)
            ?? throw Missing("supplier_tube_not_in_kit", "That tube is not part of this Phaeno return kit.");
        var assignedElsewhere = shipment.Items.Any(value =>
            value.RegisteredSampleTubeId == tube.Id
            || value.TubeSlots.Any(valueSlot => valueSlot.RegisteredSampleTubeId == tube.Id
                && (slot is null || valueSlot.Id != slot.Id)));
        if (assignedElsewhere)
            throw Conflict("supplier_tube_already_assigned", "That tube is already matched to another tube slot in this shipment.");
        if ((slot?.RegisteredSampleTubeId ?? item.RegisteredSampleTubeId) == tube.Id)
            return await reader.ReadAsync(shipment.Id, tenant.Organization.Id, cancellationToken);

        var now = DateTime.UtcNow;
        var previousTubeId = slot?.RegisteredSampleTubeId ?? item.RegisteredSampleTubeId;
        if (currentPacket is not null && string.IsNullOrWhiteSpace(request.Reason))
            throw Invalid(
                "sample_tube_correction_reason_required",
                "Enter a reason for changing the frozen tube assignment and replacing the shipping packet.");
        if (previousTubeId.HasValue)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
                throw Invalid("sample_tube_correction_reason_required", "Enter a reason for changing the tube assignment.");
            var previousTube = kit.Tubes.Single(value => value.Id == previousTubeId.Value);
            if (slot is null) item.ClearTube(); else slot.ClearTube();
            previousTube.MarkAvailable();
            dbContext.SampleTubeAssignmentEvents.Add(new SampleTubeAssignmentEvent(
                shipment.Id, item.Id, slot?.Id, previousTube.Id, item.CustomerSampleId,
                previousTube.SupplierBarcode, SampleTubeAssignmentAction.Cleared,
                request.Reason, tenant.Actor.Id, now));
        }

        tube.MarkAssigned(now);
        if (slot is null) item.AssignTube(tube.Id, now); else slot.AssignTube(tube.Id, now);
        dbContext.SampleTubeAssignmentEvents.Add(new SampleTubeAssignmentEvent(
            shipment.Id, item.Id, slot?.Id, tube.Id, item.CustomerSampleId,
            tube.SupplierBarcode,
            previousTubeId.HasValue ? SampleTubeAssignmentAction.Reassigned : SampleTubeAssignmentAction.Assigned,
            request.Reason, tenant.Actor.Id, now));
        if (currentPacket is not null)
        {
            await packetService.IssueAsync(
                shipment.Id,
                shipment.Version,
                now,
                request.Reason,
                cancellationToken);
        }
        else
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        return await reader.ReadAsync(shipment.Id, tenant.Organization.Id, cancellationToken);
    }

    [HttpPost("{shipmentId:guid}/packet")]
    public async Task<SampleShipmentWorkflowDto> IssuePacket(
        Guid shipmentId,
        [FromBody] IssueSampleShippingPacketRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireSampleShippingTenantAsync(HttpContext, true, cancellationToken);
        var shipment = await dbContext.SampleShipments.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == shipmentId
                && item.OrganizationId == tenant.Organization.Id, cancellationToken)
            ?? throw Missing();
        EnsureVersion(shipment.Version, request.Version);
        await packetService.IssueAsync(
            shipment.Id,
            request.Version,
            DateTime.UtcNow,
            request.ReplacementReason,
            cancellationToken);
        return await reader.ReadAsync(shipment.Id, tenant.Organization.Id, cancellationToken);
    }

    [HttpPost("{shipmentId:guid}/shipped")]
    public async Task<SampleShipmentWorkflowDto> RecordShipment(
        Guid shipmentId,
        [FromBody] RecordSampleShipmentRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireSampleShippingTenantAsync(HttpContext, true, cancellationToken);
        var shipment = await dbContext.SampleShipments.SingleOrDefaultAsync(item => item.Id == shipmentId
            && item.OrganizationId == tenant.Organization.Id, cancellationToken) ?? throw Missing();
        EnsureVersion(shipment.Version, request.Version);
        var shippedAt = RequireUtc(request.ShippedAt, "Shipment time");
        Execute(() => shipment.RecordShipment(request.Carrier, request.TrackingNumber, shippedAt));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await reader.ReadAsync(shipment.Id, tenant.Organization.Id, cancellationToken);
    }

    [HttpGet("{shipmentId:guid}/packet")]
    public async Task<SampleShippingPacketDocumentDto> Packet(
        Guid shipmentId,
        CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireSampleShippingTenantAsync(HttpContext, false, cancellationToken);
        return await reader.ReadPacketAsync(shipmentId, tenant.Organization.Id, cancellationToken);
    }

    [HttpGet("{shipmentId:guid}/crosswalk.csv")]
    public async Task<IActionResult> CrosswalkCsv(Guid shipmentId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireSampleShippingTenantAsync(HttpContext, false, cancellationToken);
        var packet = await reader.ReadPacketAsync(shipmentId, tenant.Organization.Id, cancellationToken);
        var shipment = packet.Shipment;
        using var manifest = JsonDocument.Parse(packet.ManifestSnapshotJson);
        if (!manifest.RootElement.TryGetProperty("samples", out var samples)
            || samples.ValueKind != JsonValueKind.Array)
            throw Conflict("sample_shipping_crosswalk_unavailable", "The frozen packet crosswalk could not be read.");
        var builder = new StringBuilder();
        builder.AppendLine("Shipment number,Packet number,Customer sample ID,Tube ordinal,Tube count,Sample name,Sample type,Supplier tube barcode");
        foreach (var item in samples.EnumerateArray())
        {
            builder.Append(Csv(shipment.ShipmentNumber)).Append(',')
                .Append(Csv(shipment.CurrentPacket!.PacketNumber)).Append(',')
                .Append(Csv(SnapshotText(item, "customerSampleId"))).Append(',')
                .Append(SnapshotNumber(item, "tubeOrdinal", 1)).Append(',')
                .Append(SnapshotNumber(item, "tubeCount", 1)).Append(',')
                .Append(Csv(SnapshotText(item, "sampleName"))).Append(',')
                .Append(Csv(SnapshotText(item, "sampleTypeName"))).Append(',')
                .Append(Csv(SnapshotText(item, "supplierTubeBarcode"))).AppendLine();
        }
        return File(Encoding.UTF8.GetBytes(builder.ToString()), "text/csv; charset=utf-8",
            $"{shipment.ShipmentNumber}-tube-crosswalk.csv");
    }

    private static string Csv(string value) => $"\"{value.Replace("\"", "\"\"")}\"";

    private static string SnapshotText(JsonElement item, string propertyName) =>
        item.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? string.Empty
            : string.Empty;

    private static int SnapshotNumber(JsonElement item, string propertyName, int fallback) =>
        item.TryGetProperty(propertyName, out var value) && value.TryGetInt32(out var number)
            ? number
            : fallback;

    private static DateTime RequireUtc(DateTime value, string label)
    {
        if (value == default) throw Invalid("sample_shipping_time_required", $"{label} is required.");
        if (value.Kind == DateTimeKind.Unspecified)
            throw Invalid("sample_shipping_time_zone_required", $"{label} must include a time zone.");
        return value.ToUniversalTime();
    }

    private static void EnsureVersion(long current, long requested)
    {
        if (current != requested)
            throw Conflict("sample_shipping_version_conflict", "This record changed after it was loaded. Refresh and try again.");
    }

    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("sample_shipping_invalid", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("sample_shipping_conflict", exception.Message); }
    }

    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) =>
        new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing(
        string code = "sample_shipment_not_found",
        string message = "The requested sample-shipping resource was not found.") =>
        new(code, message, StatusCodes.Status404NotFound);
}
