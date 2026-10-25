namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

internal static class LabResourceSnapshot
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static async Task<string> MaterialAsync(PSeqOperationsDbContext db, LabMaterialLot lot, CancellationToken ct)
    {
        var definition = await db.LabMaterialDefinitions.AsNoTracking().Where(x => x.Id == lot.MaterialDefinitionId)
            .Select(x => new { x.Id, x.Name, x.Version }).SingleAsync(ct);
        var supplier = await db.LabSuppliers.AsNoTracking().Where(x => x.Id == lot.SupplierId)
            .Select(x => new { x.Id, x.Name, x.Version }).SingleOrDefaultAsync(ct);
        var product = await db.LabSupplierProducts.AsNoTracking().Where(x => x.Id == lot.SupplierProductId)
            .Select(x => new { x.Id, x.ProductNumber, x.Description, x.Version }).SingleOrDefaultAsync(ct);
        var storage = await db.LabStorageLocations.AsNoTracking().Where(x => x.Id == lot.StorageLocationId)
            .Select(x => new { x.Id, x.Name, x.Version }).SingleAsync(ct);
        var components = await db.LabPreparedReagentComponents.AsNoTracking().Where(c => c.PreparedMaterialLotId == lot.Id)
            .OrderBy(c => c.Id).Select(c => new { c.ComponentMaterialLotId, c.Quantity, c.QuantityUnit }).ToListAsync(ct);
        // Refer to the original withdrawals, never the component's mutable condition at later reagent use.
        var withdrawals = await (from run in db.LabReagentManufacturingRuns.AsNoTracking()
            join use in db.LabReagentMaterialUses.AsNoTracking() on run.Id equals use.RunId
            where run.MaterialLotId == lot.Id orderby use.RecordedAtUtc, use.Id
            select new { use.Id, use.SourceMaterialLotId }).ToListAsync(ct);
        return JsonSerializer.Serialize(new
        {
            schemaVersion = 2, capturedAtUtc = DateTime.UtcNow, lot.Id, kind = lot.Kind.ToString(), lot.LotNumber, lot.Version, definition, supplier, product, storage,
            lot.ExpirationOrRetestDate, lot.StorageLocationId, lot.QuantityUnit, lot.AvailableQuantity, qcDisposition = lot.QcDisposition.ToString(),
            lot.QcResultsJson, lot.QcPerformedOn, lot.QcFailureReason, lot.QcApprovedByUserId, lot.QcApprovedAtUtc,
            components = components.Select(c => new { c.ComponentMaterialLotId, c.Quantity, c.QuantityUnit,
                withdrawalIds = withdrawals.Where(u => u.SourceMaterialLotId == c.ComponentMaterialLotId).Select(u => u.Id).ToArray(),
                historicalCondition = "Use the frozen original withdrawal evidence; current component QC is not preparation evidence." })
        }, JsonOptions);
    }

    public static string Equipment(LabEquipment equipment) => JsonSerializer.Serialize(new
    {
        schemaVersion = 2, capturedAtUtc = DateTime.UtcNow, equipment.Id, equipment.AssetCode, equipment.Name, equipment.EquipmentType,
        equipment.Location, status = equipment.Status.ToString(), equipment.LastCalibrationOn, equipment.CalibrationDueOn, equipment.Version
    }, JsonOptions);
}
