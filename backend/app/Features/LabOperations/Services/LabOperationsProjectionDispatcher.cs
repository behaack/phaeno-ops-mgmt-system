namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Domain;
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
        var events = await dbContext.LabOperationsOutboxEvents
            .Where(message => message.PublishedAtUtc == null)
            .OrderBy(message => message.OccurredAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);

        foreach (var message in events)
        {
            try
            {
                if (!await dbContext.LabOperationsEventReceipts
                    .AnyAsync(receipt => receipt.EventId == message.Id, cancellationToken))
                {
                    var payload = JsonSerializer.Deserialize<LabProjectionMessage>(message.PayloadJson,
                        new JsonSerializerOptions(JsonSerializerDefaults.Web))
                        ?? throw new InvalidOperationException("The Lab projection payload is invalid.");
                    var projection = await dbContext.CommercialLabWorkProjections
                        .SingleOrDefaultAsync(item => item.AuthorizationId == message.AuthorizationId, cancellationToken);
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
                        projection.Apply(payload.AuthorizationVersion, payload.Milestone, payload.ScheduleHealth,
                            payload.CurrentExpectedCompletionAtUtc, payload.ActiveCustomerActionCount,
                            payload.CustomerSafeSummary, payload.PermittedQcProjectionJson,
                            message.OccurredAtUtc, message.ProjectionVersion);
                    }

                    dbContext.LabOperationsEventReceipts.Add(new LabOperationsEventReceipt(
                        message.Id, message.AuthorizationId, message.ProjectionVersion, DateTime.UtcNow));
                }

                message.MarkPublished(DateTime.UtcNow);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception exception)
            {
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
        string? PermittedQcProjectionJson);
}
