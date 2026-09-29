namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class SampleShippingStockTubeRegistration
{
    // The caller owns the stock-kit lock, transaction, version check and save.
    public static async Task AddAsync(PSeqOperationsDbContext db, SampleShippingStockKit kit,
        IReadOnlyList<string>? supplierBarcodes, CancellationToken ct)
    {
        if (kit.FulfilledAt.HasValue || kit.TubesVerifiedAt.HasValue || kit.WithdrawnAt.HasValue)
            throw Conflict("A verified, withdrawn or dispatched tube roster cannot be extended.");
        var codes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var value in supplierBarcodes ?? [])
        {
            if (!SupplierTubeBarcode.TryNormalize(value, out var code))
                throw new OrderManagementException("stock_kit_invalid", "Scan a complete barcode for each tube.");
            if (!codes.Add(code)) throw Conflict("A tube barcode was scanned more than once.");
        }
        if (codes.Count == 0) throw new OrderManagementException("stock_kit_invalid", "Scan at least one tube.");
        if (kit.Tubes.Count + codes.Count > kit.TubeCapacity) throw Conflict($"This standard kit holds {kit.TubeCapacity} tubes.");
        foreach (var code in codes.Order(StringComparer.Ordinal))
            await SampleShippingPackingData.LockAsync(db, $"supplier-tube:{code}", ct);
        var barcodeNamespace = kit.TubeBarcodeNamespace;
        if (kit.Tubes.Any(item => codes.Contains(item.SupplierBarcode))
            || await db.SampleShippingStockTubes.AnyAsync(item => codes.Contains(item.SupplierBarcode)
                && item.BarcodeNamespace == barcodeNamespace, ct)
            || await db.RegisteredSampleTubes.AnyAsync(item => codes.Contains(item.SupplierBarcode)
                && item.BarcodeNamespace == barcodeNamespace, ct)
            || await db.LabContainers.AnyAsync(item => codes.Contains(item.Barcode.ToUpper())
                && item.BarcodeNamespace == barcodeNamespace, ct)
            || await db.LabPreparationBatches.AnyAsync(item => (item.TrayBarcode != null && codes.Contains(item.TrayBarcode.ToUpper()))
                || codes.Contains(item.Name.ToUpper()), ct))
            throw Conflict("A scanned tube barcode is already registered. No tubes were added.");
        foreach (var code in codes)
        {
            var tube = new SampleShippingStockTube(kit.Id, code, barcodeNamespace, kit.TubeSupplierProductId);
            kit.Tubes.Add(tube);
            db.SampleShippingStockTubes.Add(tube);
        }
        db.Entry(kit).Property(item => item.Version).IsModified = true;
    }

    private static OrderManagementException Conflict(string message) => new("stock_kit_conflict", message, 409);
}
