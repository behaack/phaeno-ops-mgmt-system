namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public static class CatalogItemDeletion
{
    public static string? HistoryBlocker(QboCatalogItem item, IReadOnlyList<AuditEvent> history)
    {
        if (item.IsActive) return "Active items cannot be deleted. Items that have been active must be retained.";
        const string unknown = "Deletion is unavailable because this item's complete activation history cannot be confirmed.";
        if (history.Count != item.Version || history.Count(value => value.Operation == "Created") != 1) return unknown;
        foreach (var entry in history)
        {
            if (entry.EntityName != nameof(QboCatalogItem) || entry.EntityId != item.Id.ToString()
                || entry.Operation is not ("Created" or "Updated")) return unknown;
            try
            {
                using var json = JsonDocument.Parse(entry.ChangesJson);
                if (json.RootElement.ValueKind != JsonValueKind.Object) return unknown;
                if (!json.RootElement.TryGetProperty(nameof(QboCatalogItem.IsActive), out var change))
                {
                    if (entry.Operation == "Created") return unknown;
                    continue;
                }
                if (change.ValueKind != JsonValueKind.Object
                    || !change.TryGetProperty("old", out var before) || !change.TryGetProperty("new", out var after)
                    || after.ValueKind is not (JsonValueKind.True or JsonValueKind.False)
                    || (entry.Operation == "Created" ? before.ValueKind != JsonValueKind.Null
                        : before.ValueKind is not (JsonValueKind.True or JsonValueKind.False))) return unknown;
                if (before.ValueKind == JsonValueKind.True || after.ValueKind == JsonValueKind.True)
                    return "This item has been active and must be retained. Leave it inactive to exclude it from new pricing.";
            }
            catch (JsonException) { return unknown; }
        }
        return null;
    }

    public static async Task<string?> BlockerAsync(PSeqOperationsDbContext db, QboCatalogItem item, CancellationToken ct)
    {
        var history = await db.AuditEvents.AsNoTracking().Where(value => value.EntityName == nameof(QboCatalogItem)
            && value.EntityId == item.Id.ToString()).ToListAsync(ct);
        var reason = HistoryBlocker(item, history);
        if (reason != null) return reason;
        return await HasReferencesAsync(db, item.Id, ct)
            ? "Saved work or configuration references this item. Retain it to preserve those records." : null;
    }

    public static async Task<bool> HasReferencesAsync(PSeqOperationsDbContext db, Guid id, CancellationToken ct)
    {
        if (await db.AnalysisDefinitions.AnyAsync(value => value.QboCatalogItemId == id, ct)
            || await db.PartnerReagentOfferings.AnyAsync(value => value.QboCatalogItemId == id, ct)
            || await db.AssemblyProfiles.AnyAsync(value => value.QboCatalogItemId == id, ct)
            || await db.PartnerReagentOrderLines.AnyAsync(value => value.QboCatalogItemId == id, ct)
            || await db.LabServiceOfferings.AnyAsync(value => value.CatalogItemId == id, ct)) return true;
        var camel = JsonSerializer.Serialize(new[] { new { catalogItemId = id } });
        var pascal = JsonSerializer.Serialize(new[] { new { CatalogItemId = id } });
        return await db.LabServiceQuotes.AnyAsync(value => EF.Functions.JsonContains(value.LinesJson, camel)
                || EF.Functions.JsonContains(value.LinesJson, pascal), ct)
            || await db.DataAssemblyQuotes.AnyAsync(value => EF.Functions.JsonContains(value.LinesJson, camel)
                || EF.Functions.JsonContains(value.LinesJson, pascal), ct);
    }
}
