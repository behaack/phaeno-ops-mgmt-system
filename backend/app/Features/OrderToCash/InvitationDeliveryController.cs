namespace PhaenoPortal.App.Features.OrderToCash;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;

[ApiController]
[Route("api/invitation-delivery/postmark")]
public sealed class InvitationDeliveryController(
    PSeqOperationsDbContext dbContext,
    IOptions<OrderToCashOptions> options) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Receive([FromBody] JsonElement payload, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (!settings.Features.InvitationDelivery) return NotFound();
        if (!InvitationWebhookAuthentication.IsAuthorized(Request, settings.InvitationDelivery))
            return Unauthorized();

        var raw = payload.GetRawText();
        var payloadSha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
        var eventType = ReadString(payload, "RecordType") ?? "Unknown";
        var messageId = ReadString(payload, "MessageID");
        var providerId = ReadString(payload, "ID");
        var occurredAt = ReadDateTime(payload, "DeliveredAt")
            ?? ReadDateTime(payload, "BouncedAt")
            ?? ReadDateTime(payload, "ReceivedAt")
            ?? DateTime.UtcNow;
        var providerIdentity = providerId is not null
            ? $"postmark:{eventType}:{providerId}"
            : $"postmark:{eventType}:{messageId}:{occurredAt:O}";

        if (await dbContext.InvitationProviderEvents.AnyAsync(
                value => value.ProviderEventIdentity == providerIdentity, cancellationToken))
            return Ok(new { duplicate = true });

        dbContext.InvitationProviderEvents.Add(new InvitationProviderEvent(
            providerIdentity, eventType, messageId, payloadSha256, occurredAt, DateTime.UtcNow));
        if (!string.IsNullOrWhiteSpace(messageId))
        {
            var attempt = await dbContext.InvitationDeliveryAttempts
                .OrderByDescending(value => value.CreatedAt)
                .FirstOrDefaultAsync(value => value.ProviderMessageId == messageId, cancellationToken);
            if (attempt is not null)
            {
                if (string.Equals(eventType, "Delivery", StringComparison.OrdinalIgnoreCase))
                    attempt.RecordDelivered(occurredAt);
                else if (string.Equals(eventType, "Bounce", StringComparison.OrdinalIgnoreCase))
                {
                    var bounceType = ReadString(payload, "Type") ?? ReadString(payload, "Name");
                    var inactive = ReadBoolean(payload, "Inactive") == true;
                    var hard = inactive || bounceType?.Contains("Hard", StringComparison.OrdinalIgnoreCase) == true;
                    attempt.RecordBounce(occurredAt, bounceType, hard);
                }
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { duplicate = false });
    }

    private static string? ReadString(JsonElement payload, string name) =>
        payload.TryGetProperty(name, out var value) ? value.ToString() : null;
    private static bool? ReadBoolean(JsonElement payload, string name) =>
        payload.TryGetProperty(name, out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False
            ? value.GetBoolean() : null;
    private static DateTime? ReadDateTime(JsonElement payload, string name) =>
        DateTime.TryParse(ReadString(payload, name), out var value) ? value.ToUniversalTime() : null;
}
