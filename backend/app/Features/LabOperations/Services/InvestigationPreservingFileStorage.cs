namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>Internal supporting reports outlive customer deliverable expiry.</summary>
public sealed class InvestigationPreservingFileStorage(IOperationalFileStorage storage, PSeqOperationsDbContext db) : IOperationalFileStorage
{
    public Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken ct) => storage.SaveAsync(content, extension, maximumBytes, ct);
    public Task<Stream> OpenReadAsync(string key, CancellationToken ct) => storage.OpenReadAsync(key, ct);
    public async Task DeleteIfExistsAsync(string key, CancellationToken ct)
    {
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, "investigation-file:" + key, ct);
        var qc = JsonSerializer.Serialize(new { qcReport = new { storageKey = key } });
        var preparation = JsonSerializer.Serialize(new { preparationReport = new { storageKey = key } });
        if (await db.LabPreparationRecords.AsNoTracking().AnyAsync(x => EF.Functions.JsonContains(x.DetailsJson, qc)
            || EF.Functions.JsonContains(x.DetailsJson, preparation), ct)
            || db.ChangeTracker.Entries<PSeq.Operations.Laboratory.Domain.LabPreparationRecord>().Any(x => HasReference(x.Entity.DetailsJson, key)))
            throw new OrderManagementException("investigation_file_preserved", "This file is retained indefinitely as internal investigation evidence and cannot be deleted by customer file retention.", 409);
        await storage.DeleteIfExistsAsync(key, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
    }
    private static bool HasReference(string json, string key)
    {
        using var document = JsonDocument.Parse(json);
        return new[] { "qcReport", "preparationReport" }.Any(role => document.RootElement.TryGetProperty(role, out var report)
            && report.TryGetProperty("storageKey", out var storage) && storage.GetString() == key);
    }
}
