namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabForecastWorker(IServiceScopeFactory scopes, ILogger<LabForecastWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken token)
    {
        // Reads calculate immediately; the hourly worker retains internal monitoring snapshots.
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(token))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
                var ids = await db.Set<LabJobTimingPolicy>().AsNoTracking().Select(p => p.LabWorkOrderId).Distinct().ToListAsync(token);
                foreach (var batch in ids.Chunk(100))
                {
                    var now = DateTime.UtcNow;
                    var forecasts = await new LabCompletionForecastService(db).CalculateAsync(batch, now, token);
                    foreach (var forecast in forecasts.Values.Where(f => f.Status is not ("Delivered" or "Cancelled")))
                        db.Add(new LabForecastSnapshot(forecast.JobId, now, JsonSerializer.Serialize(forecast)));
                    await db.SaveChangesAsync(token); db.ChangeTracker.Clear();
                }
            }
            catch (OperationCanceledException) when (token.IsCancellationRequested) { return; }
            catch (Exception error) { logger.LogError(error, "Internal completion forecast refresh failed; Jobs still calculates forecasts on read."); }
        }
    }
}
