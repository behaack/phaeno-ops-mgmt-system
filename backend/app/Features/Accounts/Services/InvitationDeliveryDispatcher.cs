namespace PhaenoPortal.App.Features.Accounts.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class InvitationDeliveryDispatcher(
    IServiceScopeFactory scopeFactory,
    ILogger<InvitationDeliveryDispatcher> logger) : BackgroundService
{
    private const int MaximumAttempts = 5;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Invitation delivery dispatch failed.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    internal async Task DispatchBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var emailSender = scope.ServiceProvider.GetRequiredService<IInvitationEmailSender>();
        var payloadProtector = scope.ServiceProvider.GetRequiredService<IInvitationDeliveryPayloadProtector>();
        var utcNow = DateTime.UtcNow;
        var attemptIds = await dbContext.InvitationDeliveryAttempts
            .Where(attempt =>
                (attempt.State == InvitationDeliveryState.Queued
                    || attempt.State == InvitationDeliveryState.Failed)
                && (!attempt.NextAttemptAtUtc.HasValue || attempt.NextAttemptAtUtc <= utcNow))
            .OrderBy(attempt => attempt.QueuedAtUtc)
            .Select(attempt => attempt.Id)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var attemptId in attemptIds)
        {
            await DispatchOneAsync(
                dbContext,
                emailSender,
                payloadProtector,
                attemptId,
                cancellationToken);
        }
    }

    private static async Task DispatchOneAsync(
        PSeqOperationsDbContext dbContext,
        IInvitationEmailSender emailSender,
        IInvitationDeliveryPayloadProtector payloadProtector,
        Guid attemptId,
        CancellationToken cancellationToken)
    {
        var attempt = await dbContext.InvitationDeliveryAttempts
            .FirstOrDefaultAsync(value => value.Id == attemptId, cancellationToken);
        if (attempt == null || !attempt.IsDispatchable(DateTime.UtcNow)) return;

        var utcNow = DateTime.UtcNow;
        attempt.MarkSending(utcNow);
        await dbContext.SaveChangesAsync(cancellationToken);

        var invitation = await dbContext.OrganizationInvitations
            .FirstAsync(value => value.Id == attempt.OrganizationInvitationId, cancellationToken);
        try
        {
            var payload = payloadProtector.Unprotect(attempt.ProtectedPayload);
            var result = await emailSender.SendInvitationAsync(
                new InvitationEmailMessage(
                    payload.InvitationId,
                    payload.RecipientEmail,
                    payload.OrganizationName,
                    payload.InviteUrl),
                cancellationToken);
            var acceptedAt = DateTime.UtcNow;
            attempt.MarkAccepted(result.ProviderMessageId, acceptedAt);
            invitation.RecordSend(acceptedAt, invitation.UpdatedByUserId, result.ProviderMessageId);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            var failedAt = DateTime.UtcNow;
            var retryMinutes = Math.Min(60, Math.Pow(2, Math.Max(0, attempt.AttemptCount - 1)));
            attempt.MarkFailure(
                exception.Message,
                failedAt,
                MaximumAttempts,
                TimeSpan.FromMinutes(retryMinutes));
            invitation.RecordSend(failedAt, invitation.UpdatedByUserId, null, exception.Message);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
