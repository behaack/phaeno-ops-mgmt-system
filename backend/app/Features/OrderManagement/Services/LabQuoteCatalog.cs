namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public static class LabQuoteCatalog
{
    public static async Task RequireDraftSelectionAsync(PSeqOperationsDbContext db, Guid? id, bool required, CancellationToken ct)
    {
        if (!id.HasValue && !required) return;
        if (!id.HasValue || id == Guid.Empty || !await db.QboCatalogItems.AsNoTracking().AnyAsync(item => item.Id == id.Value
            && item.IsActive && item.ServiceFamily == CatalogServiceFamily.PSeqLabService
            && item.SalesUnit.ToLower() == OrderSalesUnits.Specimen, ct))
            throw new OrderManagementException("draft_catalog_service_required", "Select an active PSeq laboratory catalog service before submitting for pricing.", 409);
    }

    // Descriptive catalog labels are read by recorded identity; quoted prices and snapshots stay untouched.
    public static async Task<Dictionary<Guid, string>> ReadNamesAsync(PSeqOperationsDbContext db, IEnumerable<string> quoteLines, Guid? requestedId, CancellationToken ct)
    {
        var ids = new HashSet<Guid>();
        if (requestedId.HasValue) ids.Add(requestedId.Value);
        foreach (var lines in quoteLines)
        {
            try
            {
                using var json = JsonDocument.Parse(lines);
                foreach (var line in json.RootElement.EnumerateArray())
                    if (line.TryGetProperty("catalogItemId", out var id) && id.TryGetGuid(out var parsed)) ids.Add(parsed);
            }
            catch (Exception exception) when (exception is JsonException or InvalidOperationException) { /* Keep the original quote description when no catalog identity can be read. */ }
        }
        return await db.QboCatalogItems.AsNoTracking().Where(item => ids.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.Name, ct);
    }

    public static async Task<Guid> ReadItemAsync(PSeqOperationsDbContext db, string linesJson, bool requireActive, CancellationToken ct)
    {
        Guid[] ids;
        try
        {
            using var json = JsonDocument.Parse(linesJson);
            ids = json.RootElement.EnumerateArray().Select(line =>
                (line.TryGetProperty("catalogItemId", out var id) ? id : line.GetProperty("CatalogItemId")).GetGuid()).ToArray();
        }
        catch (Exception exception) when (exception is JsonException or InvalidOperationException or KeyNotFoundException or FormatException)
        { throw Unavailable(); }
        var available = await db.QboCatalogItems.AsNoTracking().Where(item => ids.Contains(item.Id)
            && item.ServiceFamily == CatalogServiceFamily.PSeqLabService
            && item.SalesUnit.ToLower() == OrderSalesUnits.Specimen && (!requireActive || item.IsActive))
            .Select(item => item.Id).ToListAsync(ct);
        var selected = ids.Where(available.Contains).Distinct().ToArray();
        if (selected.Length != 1) throw Unavailable();
        return selected[0];
    }

    private static OrderManagementException Unavailable() => new("quoted_lab_offering_unavailable",
        "The quote must identify one available PSeq Lab Service offering. Review the selected service before continuing.", 409);
}
