namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class OrderIdempotencyService(AppDbContext dbContext)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public string RequireKey(HttpContext httpContext)
    {
        if (!httpContext.Request.Headers.TryGetValue("Idempotency-Key", out var values)
            || string.IsNullOrWhiteSpace(values.FirstOrDefault()))
            throw new OrderManagementException("idempotency_key_required", "An Idempotency-Key header is required.");
        var value = values.First()!.Trim();
        if (value.Length > 255) throw new OrderManagementException("idempotency_key_invalid", "The Idempotency-Key cannot exceed 255 characters.");
        return value;
    }

    public async Task<T?> ReadAsync<T>(Guid actorUserId, string scope, string key, object payload, CancellationToken cancellationToken)
    {
        var hash = Hash(payload);
        var existing = await dbContext.OrderIdempotencyRecords.AsNoTracking()
            .FirstOrDefaultAsync(record => record.ActorUserId == actorUserId && record.Scope == scope && record.IdempotencyKey == key, cancellationToken);
        if (existing == null) return default;
        if (!string.Equals(existing.RequestHash, hash, StringComparison.Ordinal))
            throw new OrderManagementException("idempotency_key_reused", "This Idempotency-Key was already used with a different request.", StatusCodes.Status409Conflict);
        return JsonSerializer.Deserialize<T>(existing.ResponseJson, JsonOptions);
    }

    public void Store<T>(Guid actorUserId, string scope, string key, object payload, T response, int statusCode = StatusCodes.Status200OK)
    {
        dbContext.OrderIdempotencyRecords.Add(new OrderIdempotencyRecord(
            actorUserId,
            scope,
            key,
            Hash(payload),
            statusCode,
            JsonSerializer.Serialize(response, JsonOptions)));
    }

    private static string Hash(object payload)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload, JsonOptions)))).ToLowerInvariant();
}

public static class OrderNumberGenerator
{
    public static string Lab() => Generate("LAB");
    public static string Reagent() => Generate("REAG");
    public static string Assembly() => Generate("ASM");
    public static string Shipment() => Generate("SHIP");
    public static string PackingSlip() => Generate("PACK");
    private static string Generate(string prefix) => $"{prefix}-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..(prefix.Length + 1 + 8 + 1 + 10)];
}
