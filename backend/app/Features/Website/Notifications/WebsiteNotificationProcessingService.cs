using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

namespace PhaenoPortal.App.Features.Website.Notifications;

public sealed class WebsiteNotificationProcessingService(PSeqOperationsDbContext dbContext)
{
    public async Task<WebOpsNotificationSummaryDto> ReadSummaryAsync(CancellationToken cancellationToken = default)
    {
        var control = await dbContext.Set<WebNotificationProcessingControl>().AsNoTracking()
            .SingleAsync(item => item.Id == WebNotificationProcessingControl.SingletonId, cancellationToken);
        var actorName = control.UpdatedByUserId.HasValue
            ? await dbContext.Users.AsNoTracking().Where(item => item.Id == control.UpdatedByUserId)
                .Select(item => item.FirstName + " " + item.LastName).SingleOrDefaultAsync(cancellationToken)
            : null;
        var now = DateTimeOffset.UtcNow;
        var counts = await dbContext.Set<WebNotificationDelivery>().AsNoTracking().GroupBy(_ => 1)
            .Select(group => new
            {
                Pending = group.Count(item => item.State == WebNotificationState.Pending),
                Processing = group.Count(item => item.State == WebNotificationState.Processing),
                Failed = group.Count(item => item.State == WebNotificationState.Failed),
                Expired = group.Count(item => item.State == WebNotificationState.Processing && item.LeaseExpiresAtUtc <= now),
                OldestPending = group.Where(item => item.State == WebNotificationState.Pending).Min(item => (DateTimeOffset?)item.CreatedAtUtc)
            }).SingleOrDefaultAsync(cancellationToken);
        return new(control.IsPaused, control.Version, control.UpdatedAtUtc, actorName?.Trim(), control.Reason,
            counts?.Pending ?? 0, counts?.Processing ?? 0, counts?.Failed ?? 0, counts?.OldestPending, counts?.Expired ?? 0);
    }

    public async Task ChangeAsync(WebOpsNotificationProcessingRequest request, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var reason = request.Reason?.Trim();
        if (string.IsNullOrEmpty(reason) || reason.Length > 500) throw new WebsiteNotificationProcessingValidationException();
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        var control = await LockAsync(dbContext, cancellationToken);
        if (control.Version != request.Version)
            throw new WebsiteNotificationConflictException("Website email processing changed. Refresh its current status before trying again.");
        if (control.IsPaused == request.IsPaused) return;
        var now = DateTimeOffset.UtcNow;
        await dbContext.Set<WebNotificationProcessingControl>().Where(item => item.Id == control.Id)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsPaused, request.IsPaused)
                .SetProperty(item => item.Version, Guid.NewGuid()).SetProperty(item => item.UpdatedAtUtc, now)
                .SetProperty(item => item.UpdatedByUserId, actorUserId).SetProperty(item => item.Reason, reason), cancellationToken);
        dbContext.AuditEvents.Add(new AuditEvent(nameof(WebNotificationProcessingControl), control.Id.ToString(),
            request.IsPaused ? "ProcessingPaused" : "ProcessingResumed", null, actorUserId, null, now.UtcDateTime,
            JsonSerializer.Serialize(new { PreviousIsPaused = control.IsPaused, RequestedIsPaused = request.IsPaused, Reason = reason })));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
    }

    internal static Task<WebNotificationProcessingControl> LockAsync(PSeqOperationsDbContext dbContext, CancellationToken cancellationToken)
    {
        if (dbContext.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Website email processing admission requires a transaction.");
        var entity = dbContext.Model.FindEntityType(typeof(WebNotificationProcessingControl))!;
        // Identifiers come exclusively from the configured EF model, never request input.
        var schema = entity.GetSchema()!.Replace("\"", "\"\"");
        var table = entity.GetTableName()!.Replace("\"", "\"\"");
        var sql = $"SELECT * FROM \"{schema}\".\"{table}\" WHERE id = {{0}} FOR UPDATE";
        return dbContext.Set<WebNotificationProcessingControl>()
            .FromSqlRaw(sql, WebNotificationProcessingControl.SingletonId)
            .AsNoTracking().SingleAsync(cancellationToken);
    }
}
