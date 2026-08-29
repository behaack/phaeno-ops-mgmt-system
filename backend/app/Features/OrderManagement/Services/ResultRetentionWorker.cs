namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class ResultRetentionWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<PSeqOrderToCashOptions> options,
    ILogger<ResultRetentionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.GovernedPSeqResults) return;
        await ProcessAsync(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await ProcessAsync(stoppingToken);
    }

    private async Task ProcessAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
            var storage = scope.ServiceProvider.GetRequiredService<IOperationalFileStorage>();
            var now = DateTime.UtcNow;
            var schedules = await db.ResultRetentionSchedules
                .Where(item => item.State != ResultRetentionState.Deleted
                    && item.State != ResultRetentionState.Reissued
                    && (item.WarningAtUtc <= now || item.CutoffAtUtc <= now
                        || item.GraceEndsAtUtc <= now || item.DeleteAtUtc <= now))
                .OrderBy(item => item.DeleteAtUtc).Take(100).ToListAsync(cancellationToken);
            foreach (var schedule in schedules)
            {
                var evidenceKind = schedule.Advance(now);
                if (!evidenceKind.HasValue) continue;
                var package = await db.ResultOutputPackages.AsNoTracking()
                    .SingleAsync(item => item.Id == schedule.ResultOutputPackageId, cancellationToken);
                if (evidenceKind == ResultDeliveryEvidenceKind.Deleted)
                {
                    var artifacts = await db.ResultArtifacts
                        .Where(item => item.ResultOutputPackageId == package.Id && item.DeletedAtUtc == null)
                        .ToListAsync(cancellationToken);
                    foreach (var artifact in artifacts)
                    {
                        await storage.DeleteIfExistsAsync(artifact.ObjectStorageKey, cancellationToken);
                        artifact.MarkDeleted(now);
                    }
                }
                if (evidenceKind == ResultDeliveryEvidenceKind.RetentionWarning)
                {
                    db.OrderNotifications.Add(new OrderNotification(package.OrganizationId, null,
                        OrderWorkflowTypes.LabService, package.LabServiceOrderId,
                        "pseq-result-retention-warning", "PSeq result retention warning",
                        "A released PSeq result package is approaching its configured download cutoff."));
                }
                db.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(package.Id, null,
                    evidenceKind.Value, null, now,
                    JsonSerializer.Serialize(new { schedule.Id, schedule.State })));
            }
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "PSeq result retention processing failed.");
        }
    }
}
