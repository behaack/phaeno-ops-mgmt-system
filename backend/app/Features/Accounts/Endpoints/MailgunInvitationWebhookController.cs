namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[AllowAnonymous]
[Route("api/integrations/mailgun/invitations")]
public sealed class MailgunInvitationWebhookController(
    PSeqOperationsDbContext dbContext,
    MailgunWebhookSignatureVerifier signatureVerifier) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Receive(JsonElement payload, CancellationToken cancellationToken)
    {
        if (!payload.TryGetProperty("signature", out var signature)
            || !signatureVerifier.IsAuthentic(
                ReadString(signature, "timestamp"),
                ReadString(signature, "token"),
                ReadString(signature, "signature"),
                ReadString(signature, "parent-signature")))
            return Unauthorized();

        if (!payload.TryGetProperty("event-data", out var eventData)) return BadRequest();
        var eventType = ReadString(eventData, "event");
        var providerMessageId = eventData.TryGetProperty("message", out var message)
            && message.TryGetProperty("headers", out var headers)
            ? MailgunInvitationEmailSender.NormalizeMessageId(ReadString(headers, "message-id"))
            : null;
        if (string.IsNullOrWhiteSpace(eventType) || string.IsNullOrWhiteSpace(providerMessageId))
            return BadRequest();

        var delivered = string.Equals(eventType, "delivered", StringComparison.OrdinalIgnoreCase);
        var permanentlyFailed = string.Equals(eventType, "permanent_fail", StringComparison.OrdinalIgnoreCase)
            || string.Equals(eventType, "failed", StringComparison.OrdinalIgnoreCase)
                && string.Equals(ReadString(eventData, "severity"), "permanent", StringComparison.OrdinalIgnoreCase);
        if (!delivered && !permanentlyFailed) return Ok();

        var attempt = await dbContext.InvitationDeliveryAttempts
            .FirstOrDefaultAsync(
                value => value.ProviderMessageId == providerMessageId,
                cancellationToken);
        if (attempt == null) return Accepted();

        var providerEventId = BuildProviderEventId(payload, eventData, eventType, providerMessageId);
        if (await dbContext.InvitationDeliveryWebhookEvents
            .AnyAsync(value => value.ProviderEventId == providerEventId, cancellationToken))
            return Ok();

        var occurredAt = ReadTimestamp(eventData) ?? DateTime.UtcNow;
        if (delivered)
        {
            attempt.MarkDelivered(occurredAt);
        }
        else
        {
            var description = eventData.TryGetProperty("delivery-status", out var deliveryStatus)
                ? ReadString(deliveryStatus, "description")
                : null;
            attempt.MarkBounced(
                occurredAt,
                isHardBounce: true,
                description ?? ReadString(eventData, "reason"));
        }

        dbContext.InvitationDeliveryWebhookEvents.Add(new InvitationDeliveryWebhookEvent(
            providerEventId,
            attempt.Id,
            eventType,
            occurredAt,
            DateTime.UtcNow));
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            dbContext.ChangeTracker.Clear();
            if (!await dbContext.InvitationDeliveryWebhookEvents
                .AsNoTracking()
                .AnyAsync(value => value.ProviderEventId == providerEventId, cancellationToken))
                throw;

            // A concurrent replay committed first and owns the state transition.
        }

        return Ok();
    }

    private static string BuildProviderEventId(
        JsonElement payload,
        JsonElement eventData,
        string eventType,
        string messageId)
    {
        var providerId = ReadString(eventData, "id");
        if (!string.IsNullOrWhiteSpace(providerId)) return $"mailgun:{providerId}";
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload.GetRawText())));
        return $"mailgun:{eventType}:{messageId}:{hash}";
    }

    private static string? ReadString(JsonElement payload, string name) =>
        payload.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static DateTime? ReadTimestamp(JsonElement payload)
    {
        if (!payload.TryGetProperty("timestamp", out var value)
            || !value.TryGetDouble(out var seconds))
            return null;
        try
        {
            return DateTime.UnixEpoch.AddSeconds(seconds);
        }
        catch (ArgumentOutOfRangeException)
        {
            return null;
        }
    }
}
