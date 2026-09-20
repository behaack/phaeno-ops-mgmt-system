namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>Deletes expired untrusted chunks, never an admitted scientific file.</summary>
public sealed class LabScientificUploadCleanup(IServiceScopeFactory scopes, ILogger<LabScientificUploadCleanup> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = scopes.CreateScope();
                await CleanAsync(scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>(),
                    scope.ServiceProvider.GetRequiredService<IOperationalFileStorage>(), DateTime.UtcNow, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception) { logger.LogError(exception, "Scientific upload staging cleanup failed; retained chunks will be retried."); }
        }
    }
    public static async Task CleanAsync(PSeqOperationsDbContext db, IOperationalFileStorage storage, DateTime now, CancellationToken ct)
    {
        var ids = await db.LabScientificUploads.AsNoTracking().Where(u => u.ExpiresAtUtc <= now
            || u.CompletedFileId != null && u.ChunksJson != "[]").OrderBy(u => u.ExpiresAtUtc).Select(u => u.Id).Take(50).ToListAsync(ct);
        foreach (var id in ids)
        {
            await using var tx = await SampleShippingPackingData.BeginAsync(db, "scientific-upload:" + id, ct);
            var upload = await db.LabScientificUploads.SingleOrDefaultAsync(u => u.Id == id, ct);
            if (upload is null) continue;
            if (upload.ExpiresAtUtc > now && upload.CompletedFileId is null) continue;
            using var chunks = JsonDocument.Parse(upload.ChunksJson);
            foreach (var chunk in chunks.RootElement.EnumerateArray())
                await storage.DeleteIfExistsAsync(chunk.GetProperty("Key").GetString()!, ct);
            if (upload.ExpiresAtUtc <= now) db.Remove(upload);
            else upload.RecordChunks("[]");
            await db.SaveChangesAsync(ct);
            if (tx is not null) await tx.CommitAsync(ct);
        }
    }
}
