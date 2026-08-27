namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Buffers.Binary;
using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class OrderIdempotencyService(PSeqOperationsDbContext dbContext)
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

    private async Task AcquireTransactionLockAsync(
        string identity,
        CancellationToken cancellationToken)
    {
        if (dbContext.Database.CurrentTransaction is null)
            throw new InvalidOperationException("An active database transaction is required before acquiring an idempotency lock.");

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(identity));
        var lockKey = BinaryPrimitives.ReadInt64LittleEndian(hash);
        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock({lockKey})",
            cancellationToken);
    }

    public async Task<OrderIdempotencyExecution<T>> ExecuteAsync<T>(
        Guid actorUserId,
        string scope,
        string key,
        object payload,
        Func<CancellationToken, Task<T>> operation,
        int statusCode = StatusCodes.Status200OK,
        CancellationToken cancellationToken = default,
        string? concurrencyScope = null)
        where T : class
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.ReadCommitted,
            cancellationToken);

        await AcquireTransactionLockAsync(
            $"idempotency|{actorUserId:N}|{scope}|{key}",
            cancellationToken);
        if (!string.IsNullOrWhiteSpace(concurrencyScope))
        {
            await AcquireTransactionLockAsync(
                $"order-operation|{concurrencyScope}",
                cancellationToken);
        }
        var replay = await ReadReplayAsync<T>(actorUserId, scope, key, payload, cancellationToken);
        if (replay != null)
        {
            await transaction.CommitAsync(cancellationToken);
            return new OrderIdempotencyExecution<T>(replay.Response, replay.StatusCode, true);
        }

        var response = await operation(cancellationToken);
        Store(actorUserId, scope, key, payload, response, statusCode);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new OrderIdempotencyExecution<T>(response, statusCode, false);
    }

    private void Store<T>(Guid actorUserId, string scope, string key, object payload, T response, int statusCode = StatusCodes.Status200OK)
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

    private async Task<OrderIdempotencyReplay<T>?> ReadReplayAsync<T>(
        Guid actorUserId,
        string scope,
        string key,
        object payload,
        CancellationToken cancellationToken)
        where T : class
    {
        var hash = Hash(payload);
        var existing = await dbContext.OrderIdempotencyRecords.AsNoTracking()
            .FirstOrDefaultAsync(record => record.ActorUserId == actorUserId
                && record.Scope == scope
                && record.IdempotencyKey == key,
                cancellationToken);
        if (existing == null) return null;
        if (!string.Equals(existing.RequestHash, hash, StringComparison.Ordinal))
            throw new OrderManagementException("idempotency_key_reused", "This Idempotency-Key was already used with a different request.", StatusCodes.Status409Conflict);

        var response = JsonSerializer.Deserialize<T>(existing.ResponseJson, JsonOptions)
            ?? throw new InvalidOperationException("The stored idempotency response could not be deserialized.");
        return new OrderIdempotencyReplay<T>(response, existing.StatusCode);
    }

    private sealed record OrderIdempotencyReplay<T>(T Response, int StatusCode);
}

public sealed record OrderIdempotencyExecution<T>(T Response, int StatusCode, bool IsReplay);

public static class OrderNumberGenerator
{
    private const string JobNumberLetters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string JobNumberDigits = "23456789";
    private const string JobNumberCharacters = JobNumberLetters + JobNumberDigits;
    private static readonly string[] BlockedJobNumberFragments =
    [
        "ARSE", "ASS", "BASTARD", "BITCH", "BLOWJOB", "COCK", "CUNT", "DAMN", "DICK",
        "FAG", "FUCK", "HELL", "PISS", "PRICK", "PUSSY", "SHIT", "SLUT", "TITS", "WHORE"
    ];

    public static string Lab()
    {
        Span<char> value = stackalloc char[8];
        while (true)
        {
            for (var index = 0; index < value.Length; index++)
                value[index] = JobNumberCharacters[RandomNumberGenerator.GetInt32(JobNumberCharacters.Length)];

            var candidate = new string(value);
            if (candidate.Any(character => JobNumberLetters.Contains(character))
                && candidate.Any(character => JobNumberDigits.Contains(character))
                && IsAcceptableLabJobNumber(candidate))
                return candidate;
        }
    }

    public static bool IsAcceptableLabJobNumber(string candidate)
    {
        var screened = candidate.ToUpperInvariant()
            .Replace('2', 'Z').Replace('3', 'E').Replace('4', 'A')
            .Replace('5', 'S').Replace('6', 'G').Replace('7', 'T').Replace('8', 'B').Replace('9', 'G');
        return !BlockedJobNumberFragments.Any(screened.Contains);
    }

    public static string Reagent() => Generate("REAG");
    public static string Assembly() => Generate("ASM");
    public static string Shipment() => Generate("SHIP");
    public static string PackingSlip() => Generate("PACK");
    private static string Generate(string prefix) => $"{prefix}-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..(prefix.Length + 1 + 8 + 1 + 10)];
}
