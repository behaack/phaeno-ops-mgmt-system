namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/sample-shipping/workflow")]
[Route("api/platform/lab-operations/sample-shipping/workflow")]
public sealed class SampleShippingWorkflowAdminController(
    PSeqOperationsDbContext dbContext,
    OrderRequestContext requestContext,
    SampleShippingWorkflowReader reader) : ControllerBase
{
    [HttpGet("shipments")]
    public async Task<IReadOnlyList<SampleShipmentWorkflowDto>> Shipments(CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await reader.ListAsync(null, cancellationToken);
    }

    [HttpGet("shipments/{shipmentId:guid}")]
    public async Task<SampleShipmentWorkflowDto> Shipment(Guid shipmentId, CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        return await reader.ReadAsync(shipmentId, null, cancellationToken);
    }

    [HttpPost("shipments/{shipmentId:guid}/return-kit")]
    public async Task<ActionResult<SampleShipmentWorkflowDto>> CreateReturnKit(
        Guid shipmentId,
        [FromBody] CreateSampleReturnKitRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var shipment = await dbContext.SampleShipments
            .Include(item => item.ReturnKit)
            .Include(item => item.Items)
                .ThenInclude(item => item.TubeSlots)
            .SingleOrDefaultAsync(item => item.Id == shipmentId, cancellationToken)
            ?? throw Missing("sample_shipment_not_found", "The sample shipment was not found.");
        if (shipment.Status != SampleShipmentStatus.Preparing)
            throw Conflict("sample_return_kit_not_allowed", "A return kit can be prepared only for a shipment still being prepared.");
        if (shipment.ReturnKit != null)
            throw Conflict("sample_return_kit_exists", "This shipment already has a return kit.");
        var requiredTubeCount = shipment.Items.Sum(item => item.TubeSlots.Count > 0 ? item.TubeSlots.Count : 1);
        if (request.RequiredTubeCount != requiredTubeCount)
            throw Conflict("sample_return_kit_tube_count_frozen",
                $"This finalized sample list requires exactly {requiredTubeCount} tubes.");
        var kit = Execute(() => new SampleReturnKit(
            ($"RK-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}")[..20].ToUpperInvariant(),
            shipment.Id,
            shipment.OrganizationId,
            shipment.AuthorizationSource,
            shipment.AuthorizationSourceId,
            request.TubeSupplierName,
            request.TubeProductNumber,
            request.TubeLotNumber,
            request.ShipperSupplierName,
            request.ShipperProductNumber,
            requiredTubeCount));
        dbContext.SampleReturnKits.Add(kit);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/sample-shipping/workflow/shipments/{shipment.Id}",
            await reader.ReadAsync(shipment.Id, null, cancellationToken));
    }

    [HttpPost("return-kits/{kitId:guid}/tubes")]
    public async Task<SampleShipmentWorkflowDto> RegisterTubes(
        Guid kitId,
        [FromBody] RegisterSampleTubesRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var kit = await dbContext.SampleReturnKits.Include(item => item.Tubes)
            .SingleOrDefaultAsync(item => item.Id == kitId, cancellationToken)
            ?? throw Missing("sample_return_kit_not_found", "The return kit was not found.");
        EnsureVersion(kit.Version, request.Version);
        if (kit.Status != SampleReturnKitStatus.Preparing)
            throw Conflict("sample_return_kit_locked", "Tubes can be registered only while the return kit is being prepared.");
        var normalized = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var value in request.SupplierBarcodes ?? [])
        {
            if (!SupplierTubeBarcode.TryNormalize(value, out var barcode))
                throw Invalid("supplier_tube_barcode_invalid", "Scan or enter each complete supplier tube barcode.");
            if (!seen.Add(barcode))
                throw Conflict("supplier_tube_barcode_duplicate", $"Tube barcode '{barcode}' was scanned more than once.");
            normalized.Add(barcode);
        }
        if (normalized.Count == 0)
            throw Invalid("supplier_tube_barcode_required", "Scan at least one supplier tube barcode.");
        if (kit.Tubes.Count + normalized.Count > kit.RequiredTubeCount)
            throw Conflict("sample_return_kit_tube_count_exceeded", $"This kit requires exactly {kit.RequiredTubeCount} tubes.");
        if (kit.Tubes.Any(item => normalized.Contains(item.SupplierBarcode))
            || await dbContext.RegisteredSampleTubes.AsNoTracking()
                .AnyAsync(item => normalized.Contains(item.SupplierBarcode), cancellationToken))
            throw Conflict("supplier_tube_barcode_duplicate", "A scanned tube barcode is already registered.");
        foreach (var barcode in normalized)
            dbContext.RegisteredSampleTubes.Add(new RegisteredSampleTube(kit.Id, barcode));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await reader.ReadAsync(kit.SampleShipmentId, null, cancellationToken);
    }

    [HttpPost("return-kits/{kitId:guid}/fulfill")]
    public async Task<SampleShipmentWorkflowDto> FulfillReturnKit(
        Guid kitId,
        [FromBody] FulfillSampleReturnKitRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        var kit = await dbContext.SampleReturnKits.Include(item => item.Tubes)
            .SingleOrDefaultAsync(item => item.Id == kitId, cancellationToken)
            ?? throw Missing("sample_return_kit_not_found", "The return kit was not found.");
        EnsureVersion(kit.Version, request.Version);
        var fulfilledAt = RequireUtc(request.FulfilledAt, "Return-kit fulfillment time");
        Execute(() => kit.Fulfill(request.OutboundCarrier, request.OutboundTrackingNumber, fulfilledAt));
        await dbContext.SaveChangesAsync(cancellationToken);
        return await reader.ReadAsync(kit.SampleShipmentId, null, cancellationToken);
    }

    [HttpGet("tubes/scan")]
    public async Task<RegisteredSampleTubeScanDto> ScanTube(
        [FromQuery] string packetBarcode,
        [FromQuery] string supplierTubeBarcode,
        CancellationToken cancellationToken)
    {
        await requestContext.RequirePlatformAdminAsync(HttpContext, cancellationToken);
        if (!SampleShippingBarcode.TryNormalize(packetBarcode, out var normalizedPacket))
            throw Invalid("sample_shipping_barcode_invalid", "Scan or enter a complete Phaeno shipment-packet barcode.");
        if (!SupplierTubeBarcode.TryNormalize(supplierTubeBarcode, out var normalizedTube))
            throw Invalid("supplier_tube_barcode_invalid", "Scan or enter a complete supplier tube barcode.");
        var packet = await dbContext.SampleShippingPacketRevisions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Barcode == normalizedPacket, cancellationToken)
            ?? throw Missing("sample_shipping_packet_not_found", "No shipment packet matches this barcode.");
        if (packet.IsVoided)
            return new RegisteredSampleTubeScanDto(normalizedPacket, normalizedTube, false, null, null, null, null, null, false, "PacketVoided");
        var tube = await dbContext.RegisteredSampleTubes.AsNoTracking()
            .SingleOrDefaultAsync(item => item.SupplierBarcode == normalizedTube, cancellationToken);
        if (tube is null)
            return new RegisteredSampleTubeScanDto(normalizedPacket, normalizedTube, false, null, null, null, null, null, false, "TubeNotRegistered");
        var slotItemId = await dbContext.SampleShipmentTubeSlots.AsNoTracking()
            .Where(slot => slot.RegisteredSampleTubeId == tube.Id)
            .Select(slot => (Guid?)slot.SampleShipmentItemId)
            .SingleOrDefaultAsync(cancellationToken);
        var item = await dbContext.SampleShipmentItems.AsNoTracking()
            .SingleOrDefaultAsync(value => value.SampleShipmentId == packet.SampleShipmentId
                && (value.RegisteredSampleTubeId == tube.Id || value.Id == slotItemId), cancellationToken);
        if (item is null)
            return new RegisteredSampleTubeScanDto(normalizedPacket, normalizedTube, false, null, null, null, null,
                tube.Status.ToString(), tube.Status == RegisteredSampleTubeStatus.Accessioned, "TubeNotExpectedForPacket");
        return new RegisteredSampleTubeScanDto(normalizedPacket, normalizedTube, true, item.Id,
            item.SubmittedSpecimenId, item.CustomerSampleId, item.SampleName, tube.Status.ToString(),
            tube.Status == RegisteredSampleTubeStatus.Accessioned,
            tube.Status == RegisteredSampleTubeStatus.Accessioned ? "AlreadyAccessioned" : "Expected");
    }

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

    private static T Execute<T>(Func<T> action)
    {
        try { return action(); }
        catch (ArgumentException exception) { throw Invalid("sample_shipping_invalid", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("sample_shipping_conflict", exception.Message); }
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
    private static OrderManagementException Missing(string code, string message) =>
        new(code, message, StatusCodes.Status404NotFound);
}
