namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[AllowAnonymous]
[Route("api/integrations/postmark/invitations")]
public sealed class PostmarkInvitationWebhookController(
    PSeqOperationsDbContext dbContext,
    IOptions<PostmarkOptions> options) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Receive(JsonElement payload, CancellationToken cancellationToken)
    {
        if (!IsAuthorized(Request, options.Value)) return Unauthorized();

        var eventType = ReadString(payload, "RecordType");
        var providerMessageId = ReadString(payload, "MessageID");
        if (string.IsNullOrWhiteSpace(eventType) || string.IsNullOrWhiteSpace(providerMessageId))
            return BadRequest();
        if (!string.Equals(eventType, "Delivery", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(eventType, "Bounce", StringComparison.OrdinalIgnoreCase))
            return Ok();

        var attempt = await dbContext.InvitationDeliveryAttempts
            .FirstOrDefaultAsync(
                value => value.ProviderMessageId == providerMessageId,
                cancellationToken);
        if (attempt == null) return Accepted();

        var providerEventId = BuildProviderEventId(payload, eventType, providerMessageId);
        if (await dbContext.InvitationDeliveryWebhookEvents
            .AnyAsync(value => value.ProviderEventId == providerEventId, cancellationToken))
            return Ok();

        var occurredAt = ReadTimestamp(payload, eventType == "Delivery" ? "DeliveredAt" : "BouncedAt")
            ?? DateTime.UtcNow;
        if (string.Equals(eventType, "Delivery", StringComparison.OrdinalIgnoreCase))
        {
            attempt.MarkDelivered(occurredAt);
        }
        else
        {
            var typeCode = ReadInteger(payload, "TypeCode");
            var bounceType = ReadString(payload, "Type");
            var inactive = ReadBoolean(payload, "Inactive");
            var hardBounce = inactive
                || typeCode == 1
                || string.Equals(bounceType, "HardBounce", StringComparison.OrdinalIgnoreCase)
                || string.Equals(bounceType, "SpamNotification", StringComparison.OrdinalIgnoreCase)
                || string.Equals(bounceType, "ManualDeactivation", StringComparison.OrdinalIgnoreCase);
            attempt.MarkBounced(occurredAt, hardBounce, ReadString(payload, "Description"));
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
            {
                throw;
            }

            // Concurrent webhook replay. The first committed event owns the transition.
        }

        return Ok();
    }

    private static bool IsAuthorized(HttpRequest request, PostmarkOptions configuration)
    {
        if (!configuration.HasWebhookCredentials) return false;

        if (!string.IsNullOrWhiteSpace(configuration.WebhookSecret)
            && request.Headers.TryGetValue(configuration.WebhookSecretHeaderName, out var suppliedSecret)
            && FixedTimeEquals(suppliedSecret.ToString(), configuration.WebhookSecret))
            return true;

        if (string.IsNullOrWhiteSpace(configuration.WebhookUsername)
            || string.IsNullOrWhiteSpace(configuration.WebhookPassword)
            || !request.Headers.TryGetValue("Authorization", out var authorization)
            || !authorization.ToString().StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            return false;

        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(authorization.ToString()[6..]));
            var separator = decoded.IndexOf(':');
            return separator >= 0
                && FixedTimeEquals(decoded[..separator], configuration.WebhookUsername)
                && FixedTimeEquals(decoded[(separator + 1)..], configuration.WebhookPassword);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool FixedTimeEquals(string supplied, string expected)
    {
        var suppliedHash = SHA256.HashData(Encoding.UTF8.GetBytes(supplied));
        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(suppliedHash, expectedHash);
    }

    private static string BuildProviderEventId(JsonElement payload, string eventType, string messageId)
    {
        var providerId = ReadString(payload, "ID");
        if (!string.IsNullOrWhiteSpace(providerId)) return $"{eventType}:{messageId}:{providerId}";
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload.GetRawText())));
        return $"{eventType}:{messageId}:{hash}";
    }

    private static string? ReadString(JsonElement payload, string name) =>
        payload.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static int? ReadInteger(JsonElement payload, string name) =>
        payload.TryGetProperty(name, out var value) && value.TryGetInt32(out var parsed)
            ? parsed
            : null;

    private static bool ReadBoolean(JsonElement payload, string name) =>
        payload.TryGetProperty(name, out var value)
        && value.ValueKind is JsonValueKind.True or JsonValueKind.False
        && value.GetBoolean();

    private static DateTime? ReadTimestamp(JsonElement payload, string name) =>
        DateTime.TryParse(
            ReadString(payload, name),
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsed)
            ? parsed
            : null;
}
