namespace PhaenoPortal.App.Features.OrderToCash;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;

public sealed class InvitationDeliveryEnqueuer(
    IDataProtectionProvider protectionProvider,
    IOptions<OrderToCashOptions> options)
{
    private const string Purpose = "PhaenoPortal.InvitationDelivery.v1";
    private readonly IDataProtector protector = protectionProvider.CreateProtector(Purpose);
    private readonly OrderToCashOptions options = options.Value;

    public InvitationDeliveryAttempt Enqueue(
        PSeqOperationsDbContext dbContext,
        OrganizationInvitation invitation,
        string organizationName,
        string inviteUrl,
        Guid actorUserId,
        DateTime utcNow)
    {
        var payload = JsonSerializer.Serialize(new InvitationDeliveryPayload(
            invitation.Email,
            organizationName,
            inviteUrl));
        var attempt = new InvitationDeliveryAttempt(
            invitation.Id,
            invitation.OrganizationId,
            invitation.Email,
            protector.Protect(payload),
            options.InvitationDelivery.MaximumAttempts,
            utcNow);
        attempt.MarkCreated(utcNow, actorUserId);
        dbContext.InvitationDeliveryAttempts.Add(attempt);
        return attempt;
    }

    internal InvitationDeliveryPayload ReadPayload(InvitationDeliveryAttempt attempt) =>
        JsonSerializer.Deserialize<InvitationDeliveryPayload>(protector.Unprotect(attempt.ProtectedPayload))
        ?? throw new InvalidOperationException("Invitation delivery payload is invalid.");
}

internal sealed record InvitationDeliveryPayload(string Email, string OrganizationName, string InviteUrl);

public sealed class InvitationDeliveryDispatcher(
    IServiceScopeFactory scopeFactory,
    IOptions<OrderToCashOptions> options,
    ILogger<InvitationDeliveryDispatcher> logger) : BackgroundService
{
    private readonly OrderToCashOptions settings = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!settings.Features.InvitationDelivery) return;

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await DispatchAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception exception) { logger.LogError(exception, "Invitation delivery dispatcher failed."); }
            await Task.Delay(TimeSpan.FromSeconds(settings.InvitationDelivery.PollSeconds), stoppingToken);
        }
    }

    private async Task DispatchAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PSeqOperationsDbContext>();
        var sender = scope.ServiceProvider.GetRequiredService<IInvitationEmailSender>();
        var enqueuer = scope.ServiceProvider.GetRequiredService<InvitationDeliveryEnqueuer>();
        var utcNow = DateTime.UtcNow;
        var candidates = await dbContext.InvitationDeliveryAttempts
            .Where(value =>
                ((value.State == InvitationDeliveryState.Queued || value.State == InvitationDeliveryState.Failed)
                    && value.NextAttemptAtUtc <= utcNow)
                || (value.State == InvitationDeliveryState.Sending && value.LeaseExpiresAtUtc <= utcNow))
            .OrderBy(value => value.NextAttemptAtUtc)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var attempt in candidates)
        {
            try
            {
                attempt.Claim(utcNow, TimeSpan.FromSeconds(settings.InvitationDelivery.LeaseSeconds));
                await dbContext.SaveChangesAsync(cancellationToken);
                var payload = enqueuer.ReadPayload(attempt);
                var result = await sender.SendInvitationAsync(
                    new InvitationEmailMessage(attempt.OrganizationInvitationId, payload.Email,
                        payload.OrganizationName, payload.InviteUrl), cancellationToken);
                attempt.RecordProviderAccepted(result.ProviderMessageId, DateTime.UtcNow);
                var invitation = await dbContext.OrganizationInvitations
                    .SingleAsync(value => value.Id == attempt.OrganizationInvitationId, cancellationToken);
                invitation.RecordSend(DateTime.UtcNow, attempt.CreatedByUserId, result.ProviderMessageId);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Invitation delivery {DeliveryAttemptId} failed.", attempt.Id);
                var exponent = Math.Min(attempt.AttemptCount, 6);
                attempt.RecordFailure(exception.Message, DateTime.UtcNow,
                    TimeSpan.FromMinutes(Math.Pow(2, exponent)));
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }
    }
}

public static class InvitationWebhookAuthentication
{
    public static bool IsAuthorized(HttpRequest request, InvitationDeliveryOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.WebhookBasicUsername)
            && !string.IsNullOrWhiteSpace(options.WebhookBasicPassword)
            && request.Headers.Authorization.Count > 0)
        {
            var value = request.Headers.Authorization.ToString();
            if (value.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(value[6..].Trim()));
                    var expected = $"{options.WebhookBasicUsername}:{options.WebhookBasicPassword}";
                    if (FixedEquals(decoded, expected)) return true;
                }
                catch (FormatException) { }
            }
        }

        return !string.IsNullOrWhiteSpace(options.WebhookHeaderName)
            && !string.IsNullOrWhiteSpace(options.WebhookHeaderValue)
            && request.Headers.TryGetValue(options.WebhookHeaderName, out var values)
            && FixedEquals(values.ToString(), options.WebhookHeaderValue);
    }

    private static bool FixedEquals(string actual, string expected)
    {
        var actualBytes = Encoding.UTF8.GetBytes(actual);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return actualBytes.Length == expectedBytes.Length
            && CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes);
    }
}
