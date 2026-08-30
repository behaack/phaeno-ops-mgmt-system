namespace PhaenoPortal.App.Features.OrderToCash;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;

/// <summary>
/// Projects durable notification and retention milestones. Final byte deletion
/// is intentionally routed to an owned attention item until a destructive
/// retention run receives separate operational authorization.
/// </summary>
public sealed class ResultPackageLifecycleDispatcher(
    IServiceScopeFactory scopeFactory,
    IOptions<OrderToCashOptions> options,
    ILogger<ResultPackageLifecycleDispatcher> logger) : BackgroundService
{
    private readonly OrderToCashOptions settings = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!settings.Features.GovernedPSeqResults) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ProcessAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception exception) { logger.LogError(exception, "Result-package lifecycle processing failed."); }
            await Task.Delay(TimeSpan.FromSeconds(settings.ResultDelivery.LifecyclePollSeconds), stoppingToken);
        }
    }

    internal async Task ProcessAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var packages = await dbContext.ResultOutputPackages
            .Where(value => value.Status == ResultOutputPackageStatus.Released)
            .OrderBy(value => value.ReleasedAtUtc)
            .Take(100)
            .ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var package in packages)
        {
            var kinds = await dbContext.ResultDeliveryEvidence.AsNoTracking()
                .Where(value => value.ResultOutputPackageId == package.Id)
                .Select(value => value.Kind)
                .ToListAsync(cancellationToken);
            var notification = await dbContext.OrderNotifications.AsNoTracking()
                .Where(value => value.WorkflowType == OrderWorkflowTypes.PSeqResultPackage
                    && value.WorkflowId == package.Id)
                .OrderByDescending(value => value.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            if (notification?.Status == OrderNotificationStatus.Sent
                && !kinds.Contains(ResultDeliveryEvidenceKind.NotificationDelivered))
                Add(package.Id, ResultDeliveryEvidenceKind.NotificationDelivered,
                    new { notification.Id, notification.SentAt });
            if (notification is { Status: OrderNotificationStatus.Failed, AttemptCount: >= 5 }
                && !kinds.Contains(ResultDeliveryEvidenceKind.NotificationFailed))
                Add(package.Id, ResultDeliveryEvidenceKind.NotificationFailed,
                    new { notification.Id, notification.LastError, notification.AttemptCount });

            if (!package.ReleasedAtUtc.HasValue) continue;
            var warningAt = package.ReleasedAtUtc.Value.AddDays(settings.ResultDelivery.RetentionWarningDays);
            var cutoffAt = package.ReleasedAtUtc.Value.AddDays(settings.ResultDelivery.RetentionCutoffDays);
            var deleteAt = cutoffAt.AddDays(settings.ResultDelivery.RetentionGraceDays);
            if (now >= warningAt && !kinds.Contains(ResultDeliveryEvidenceKind.RetentionWarning))
                Add(package.Id, ResultDeliveryEvidenceKind.RetentionWarning, new { warningAt, cutoffAt });
            if (now >= cutoffAt && !kinds.Contains(ResultDeliveryEvidenceKind.RetentionCutoff))
            {
                Add(package.Id, ResultDeliveryEvidenceKind.RetentionCutoff, new { cutoffAt, deleteAt });
                Add(package.Id, ResultDeliveryEvidenceKind.RetentionGraceStarted, new { cutoffAt, deleteAt });
            }
            if (now < deleteAt) continue;
            var existing = await dbContext.AttentionItems.SingleOrDefaultAsync(value =>
                value.Category == "result_retention_deletion_due"
                && value.SourceType == nameof(ResultOutputPackage)
                && value.SourceId == package.Id, cancellationToken);
            if (existing is null)
                dbContext.AttentionItems.Add(new AttentionItem(
                    "result_retention_deletion_due", nameof(ResultOutputPackage), package.Id,
                    package.OrganizationId, BusinessRole.ResultReleaseManager.ToString(),
                    "Obtain destructive-run authorization, delete retained bytes through the registered storage provider, and record immutable deletion evidence.",
                    null, now));
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        void Add(Guid packageId, ResultDeliveryEvidenceKind kind, object evidence) =>
            dbContext.ResultDeliveryEvidence.Add(new ResultDeliveryEvidence(
                packageId, kind, null,
                System.Text.Json.JsonSerializer.Serialize(evidence), now));
    }
}
