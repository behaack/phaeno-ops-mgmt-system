namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class LabOperationsProjectionDispatcher(
    IServiceScopeFactory scopeFactory,
    ILogger<LabOperationsProjectionDispatcher> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        do
        {
            try
            {
                await DispatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Laboratory projection dispatch failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task DispatchAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        await DispatchAsync(dbContext, logger, cancellationToken);
    }

    internal static async Task DispatchAsync(
        PSeqOperationsDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var events = await dbContext.LabOperationsOutboxEvents.AsNoTracking()
            .Where(message => message.PublishedAtUtc == null)
            .OrderBy(message => message.OccurredAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);

        foreach (var candidate in events)
        {
            await using var transaction = dbContext.Database.CurrentTransaction is null
                ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
            var parentTransaction = transaction is null ? dbContext.Database.CurrentTransaction : null;
            const string savepoint = "lab_projection_delivery";
            if (parentTransaction is not null) await parentTransaction.CreateSavepointAsync(savepoint, cancellationToken);
            try
            {
                await SampleShippingPackingData.LockAsync(dbContext, $"lab-projection:{candidate.AuthorizationId}", cancellationToken);
                var message = await dbContext.LabOperationsOutboxEvents.SingleAsync(item => item.Id == candidate.Id, cancellationToken);
                await dbContext.Entry(message).ReloadAsync(cancellationToken);
                if (!await dbContext.LabOperationsEventReceipts
                    .AnyAsync(receipt => receipt.EventId == message.Id, cancellationToken))
                {
                    var payload = JsonSerializer.Deserialize<LabProjectionMessage>(message.PayloadJson,
                        new JsonSerializerOptions(JsonSerializerDefaults.Web))
                        ?? throw new InvalidOperationException("The Lab projection payload is invalid.");
                    var projection = await dbContext.CommercialLabWorkProjections
                        .SingleOrDefaultAsync(item => item.AuthorizationId == message.AuthorizationId, cancellationToken);
                    if (projection is not null) await dbContext.Entry(projection).ReloadAsync(cancellationToken);
                    var applied = true;
                    if (projection is null)
                    {
                        projection = new CommercialLabWorkProjection(
                            message.AuthorizationId, message.LabWorkOrderId, payload.AuthorizationVersion,
                            payload.Milestone, payload.ScheduleHealth, payload.CurrentExpectedCompletionAtUtc,
                            payload.ActiveCustomerActionCount, payload.CustomerSafeSummary,
                            payload.PermittedQcProjectionJson, message.OccurredAtUtc, message.ProjectionVersion);
                        dbContext.CommercialLabWorkProjections.Add(projection);
                    }
                    else
                    {
                        applied = projection.Apply(payload.AuthorizationVersion, payload.Milestone, payload.ScheduleHealth,
                            payload.CurrentExpectedCompletionAtUtc, payload.ActiveCustomerActionCount,
                            payload.CustomerSafeSummary, payload.PermittedQcProjectionJson,
                            message.OccurredAtUtc, message.ProjectionVersion);
                    }

                    if (applied && payload.Intake is not null && payload.ActorUserId.HasValue)
                        await CommercialLabIntakeProgressService.ApplyAsync(dbContext, message.AuthorizationId,
                            message.LabWorkOrderId, payload.Intake, payload.ActorUserId.Value,
                            message.OccurredAtUtc, cancellationToken);

                    dbContext.LabOperationsEventReceipts.Add(new LabOperationsEventReceipt(
                        message.Id, message.AuthorizationId, message.ProjectionVersion, DateTime.UtcNow));
                }

                message.MarkPublished(DateTime.UtcNow);
                await dbContext.SaveChangesAsync(cancellationToken);
                if (transaction is not null) await transaction.CommitAsync(cancellationToken);
                if (parentTransaction is not null) await parentTransaction.ReleaseSavepointAsync(savepoint, cancellationToken);
            }
            catch (Exception exception)
            {
                if (transaction is not null)
                {
                    await transaction.RollbackAsync(CancellationToken.None);
                    await transaction.DisposeAsync();
                }
                if (parentTransaction is not null) await parentTransaction.RollbackToSavepointAsync(savepoint, CancellationToken.None);
                dbContext.ChangeTracker.Clear();
                var message = await dbContext.LabOperationsOutboxEvents.SingleAsync(item => item.Id == candidate.Id, cancellationToken);
                message.MarkFailed(exception.Message);
                await dbContext.SaveChangesAsync(cancellationToken);
                logger.LogWarning(exception, "Laboratory event {EventId} will be retried.", message.Id);
            }
        }
    }

    private sealed record LabProjectionMessage(
        int AuthorizationVersion,
        string Milestone,
        string ScheduleHealth,
        DateTime? CurrentExpectedCompletionAtUtc,
        int ActiveCustomerActionCount,
        string? CustomerSafeSummary,
        string? PermittedQcProjectionJson,
        Guid? ActorUserId = null,
        LabIntakeProgress? Intake = null);
}
