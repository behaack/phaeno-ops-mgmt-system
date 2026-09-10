namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class SampleShippingPackingData
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public static int TubeCount(SampleShipmentItem item) => item.TubeSlots.Count > 0 ? item.TubeSlots.Count : 1;
    public static int TubeCount(SampleShipment shipment) => shipment.Items.Sum(TubeCount);
    public static IEnumerable<Guid> TubeIds(SampleShipmentItem item) => item.TubeSlots.Count > 0
        ? item.TubeSlots.Where(slot => slot.RegisteredSampleTubeId.HasValue).Select(slot => slot.RegisteredSampleTubeId!.Value)
        : item.RegisteredSampleTubeId.HasValue ? [item.RegisteredSampleTubeId.Value] : [];

    public static ShipmentContainerDto? Container(string? snapshot)
    {
        if (string.IsNullOrWhiteSpace(snapshot)) return null;
        var definition = JsonSerializer.Deserialize<SampleShippingContainerDefinitionDto>(snapshot, JsonOptions);
        return definition is null ? null : new(definition.Id, definition.Sku, definition.CommonName, definition.TubeCapacity);
    }

    public static async Task<IDbContextTransaction?> BeginAsync(PSeqOperationsDbContext db, string key, CancellationToken ct)
    {
        if (!db.Database.IsRelational()) return null;
        var transaction = await db.Database.BeginTransactionAsync(ct);
        try { await LockAsync(db, key, ct); return transaction; }
        catch { await transaction.DisposeAsync(); throw; }
    }

    public static async Task LockAsync(PSeqOperationsDbContext db, string key, CancellationToken ct)
    {
        if (db.Database.ProviderName?.Contains("Npgsql", StringComparison.Ordinal) == true)
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({key}, 0))", ct);
    }

    public static async Task<IReadOnlyList<SampleShipment>> FamilyAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
        => await db.SampleShipments.AsNoTracking().Include(value => value.Items).ThenInclude(value => value.TubeSlots)
            .Where(value => value.OrganizationId == shipment.OrganizationId && value.DepartmentId == shipment.DepartmentId
                && value.AuthorizationSource == shipment.AuthorizationSource && value.AuthorizationSourceId == shipment.AuthorizationSourceId
                && value.Status != SampleShipmentStatus.Cancelled).ToListAsync(ct);

    public static async Task ReconcileReceiptAsync(PSeqOperationsDbContext db, Guid shipmentId, CancellationToken ct)
    {
        var shipment = await db.SampleShipments.Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .SingleAsync(item => item.Id == shipmentId, ct);
        if (shipment.Status is not (SampleShipmentStatus.ReadyToShip or SampleShipmentStatus.Shipped or SampleShipmentStatus.Delivered)) return;
        var expected = TubeCount(shipment);
        var ids = shipment.Items.SelectMany(TubeIds).Distinct().ToArray();
        if (expected == 0 || ids.Length != expected) return;
        var arrivals = await db.RegisteredSampleTubes.AsNoTracking().Where(item => ids.Contains(item.Id)
                && (item.ReceivedAt.HasValue || item.AccessionedAt.HasValue))
            .Select(item => item.ReceivedAt ?? item.AccessionedAt!.Value).ToArrayAsync(ct);
        if (arrivals.Length != expected) return;
        // Physical receipt is authoritative even when Customer dispatch details were never entered.
        // Preserve the absence of carrier/tracking facts instead of fabricating an earlier shipping event.
        try { shipment.MarkReceived(arrivals.Max()); }
        catch (ArgumentException exception) { throw new OrderManagementException("sample_shipping_receipt_invalid", exception.Message); }
        catch (InvalidOperationException exception) { throw new OrderManagementException("sample_shipping_receipt_conflict", exception.Message, 409); }
        await db.SaveChangesAsync(ct);
    }

    public static async Task<SampleShippingPacketRevision> ResolvePacketAsync(PSeqOperationsDbContext db, string? barcode, CancellationToken ct)
    {
        var value = barcode?.Trim().Trim('*').ToUpperInvariant();
        if (SampleShippingBarcode.TryNormalize(value, out var normalized))
            return await db.SampleShippingPacketRevisions.AsNoTracking().SingleOrDefaultAsync(item => item.Barcode == normalized, ct)
                ?? throw new OrderManagementException("sample_shipping_packet_not_found", "No packet matches this barcode.", 404);
        if (value?.StartsWith("PH-S-", StringComparison.Ordinal) == true && Guid.TryParseExact(value[5..], "N", out var shipmentId))
            return await db.SampleShippingPacketRevisions.AsNoTracking().Where(item => item.SampleShipmentId == shipmentId && !item.VoidedAt.HasValue)
                .OrderByDescending(item => item.Revision).FirstOrDefaultAsync(ct)
                ?? throw new OrderManagementException("sample_shipping_packet_not_found", "This shipment has no current confirmed manifest.", 404);
        throw new OrderManagementException("sample_shipping_barcode_invalid", "Scan the shipment barcode or its confirmed packet barcode.");
    }

    public static async Task<IReadOnlyList<ContainerCompatibilityRequest>> ContextsAsync(PSeqOperationsDbContext db, SampleShipment shipment, CancellationToken ct)
    {
        var destination = await db.SampleShippingDestinations.AsNoTracking().SingleAsync(item => item.Id == shipment.DestinationId, ct);
        var typeIds = shipment.Items.Select(item => item.SampleTypeDefinitionId).Distinct().ToArray();
        var types = await db.SampleTypeDefinitions.AsNoTracking().Where(item => typeIds.Contains(item.Id)).ToListAsync(ct);
        var rules = await db.SampleShippingInstructionRules.AsNoTracking()
            .Where(item => item.DestinationId == shipment.DestinationId && typeIds.Contains(item.SampleTypeDefinitionId)).ToListAsync(ct);
        try
        {
            return SampleShippingCompatibilityResolver.Resolve(destination, types, rules, DateTime.UtcNow).Rules
                .Select(item => new ContainerCompatibilityRequest(item.SampleType.Id, item.Rule.Id)).ToArray();
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        { throw new OrderManagementException("sample_shipping_incompatible", exception.Message, 409); }
    }

    public static string? PackingBlock(SampleShipment shipment)
    {
        if (shipment.Status != SampleShipmentStatus.Preparing) return "This shipment has already been confirmed. Prepare the remaining unpacked tubes instead.";
        if (shipment.ReturnKit is not null) return "This shipment already has a registered physical kit. Keep its tube assignments with that kit.";
        if (shipment.PacketRevisions.Any(packet => !packet.IsVoided)) return "This shipment has a confirmed manifest.";
        if (shipment.Items.Any(item => item.RegisteredSampleTubeId.HasValue || item.TubeSlots.Any(slot => slot.RegisteredSampleTubeId.HasValue)))
            return "Correct the existing tube assignments before adjusting these containers.";
        if (shipment.Items.Count == 0) return "There are no unpacked tubes remaining here.";
        return null;
    }

    public static async Task<SampleReturnKit> BindStockAsync(PSeqOperationsDbContext db, SampleShipment shipment, string scannedBarcode, CancellationToken ct)
    {
        var stock = await db.SampleShippingStockKits.Include(item => item.Tubes)
            .SingleOrDefaultAsync(item => item.Tubes.Any(tube => tube.SupplierBarcode == scannedBarcode)
                && item.OrganizationId == shipment.OrganizationId && item.DepartmentId == shipment.DepartmentId
                && (item.ReservedSampleShipmentId == shipment.Id || (!item.ReservedSampleShipmentId.HasValue
                    && item.AuthorizationSource == shipment.AuthorizationSource && item.AuthorizationSourceId == shipment.AuthorizationSourceId)), ct)
            ?? throw new OrderManagementException("supplier_tube_not_dispatched", "This tube is not in a registered kit dispatched for this job.", 409);
        await LockAsync(db, $"stock-kit:{stock.Id}", ct);
        await db.Entry(stock).ReloadAsync(ct);
        if (stock.TransportationKitRequestLineId.HasValue && !stock.CustomerReceivedAt.HasValue)
            throw new OrderManagementException("transportation_kit_receipt_required", "Confirm receipt of the transportation kit before scanning its tubes for a sample shipment.", 409);
        await TransportationKitSupplyGuard.EnsureOrderedStockAsync(db, shipment, stock, ct);
        if (stock.BoundSampleShipmentId.HasValue || !stock.FulfilledAt.HasValue || stock.ContainerDefinitionId != shipment.ContainerDefinitionId)
            throw new OrderManagementException("stock_kit_not_available", "This kit is already in use or does not match the selected container size.", 409);
        if (TubeCount(shipment) > stock.TubeCapacity)
            throw new OrderManagementException("stock_kit_capacity_exceeded", "The selected kit cannot hold all tubes in this shipment.", 409);
        var barcodes = stock.Tubes.Select(item => item.SupplierBarcode).ToArray();
        foreach (var barcode in barcodes.Order(StringComparer.Ordinal)) await LockAsync(db, $"supplier-tube:{barcode}", ct);
        if (await db.RegisteredSampleTubes.AnyAsync(item => barcodes.Contains(item.SupplierBarcode), ct))
            throw new OrderManagementException("supplier_tube_already_registered", "This kit contains a tube already used by another return shipment.", 409);

        var kit = new SampleReturnKit(stock.KitNumber, shipment.Id, shipment.OrganizationId, shipment.AuthorizationSource,
            shipment.AuthorizationSourceId, stock.TubeSupplierName, stock.TubeProductNumber, stock.TubeLotNumber,
            stock.ShipperSupplierName, stock.ShipperProductNumber, stock.TubeCapacity);
        foreach (var barcode in barcodes) kit.Tubes.Add(new RegisteredSampleTube(kit.Id, barcode));
        // Use the complete original kit and its recorded outbound facts. No fulfillment invariant is bypassed.
        kit.Fulfill(stock.OutboundCarrier!, stock.OutboundTrackingNumber!, stock.FulfilledAt.Value);
        stock.Bind(shipment);
        db.SampleReturnKits.Add(kit);
        return kit;
    }
}
