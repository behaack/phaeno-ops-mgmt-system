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
        var components = await (from component in db.LabPreparedReagentComponents.AsNoTracking()
            join source in db.LabMaterialLots.AsNoTracking() on component.ComponentMaterialLotId equals source.Id
            where component.PreparedMaterialLotId == lot.Id orderby component.Id
            select new { component.ComponentMaterialLotId, component.Quantity, component.QuantityUnit,
                source.LotNumber, source.MaterialDefinitionId, source.SupplierId, source.SupplierProductId,
                source.ExpirationOrRetestDate, source.QcDisposition, source.QcResultsJson, source.QcApprovedAtUtc }).ToListAsync(ct);
        return JsonSerializer.Serialize(new
        {
            schemaVersion = 1, capturedAtUtc = DateTime.UtcNow, lot.Id, lot.Kind, lot.LotNumber, lot.Version, definition, supplier, product,
            lot.ExpirationOrRetestDate, lot.StorageLocationId, lot.QuantityUnit, lot.QcDisposition,
            lot.QcResultsJson, lot.QcPerformedOn, lot.QcFailureReason, lot.QcApprovedByUserId, lot.QcApprovedAtUtc, components
        }, JsonOptions);
    }

    public static string Equipment(LabEquipment equipment) => JsonSerializer.Serialize(new
    {
        schemaVersion = 1, capturedAtUtc = DateTime.UtcNow, equipment.Id, equipment.AssetCode, equipment.Name, equipment.EquipmentType,
        equipment.Location, equipment.Status, equipment.LastCalibrationOn, equipment.CalibrationDueOn, equipment.Version
    }, JsonOptions);
}
