namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class LabQuoteCatalog
{
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
        var selected = ids.Where(available.Contains).ToArray();
        if (selected.Length != 1) throw Unavailable();
        return selected[0];
    }

    private static OrderManagementException Unavailable() => new("quoted_lab_offering_unavailable",
        "The quote must identify one available PSeq Lab Service offering. Review the selected service before continuing.", 409);
}
