namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;

internal static class LabIdentifierService
{
    private const int ProtocolKeyMaxLength = 100;
    private const string SafeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const int BatchTokenLength = 8;

    public static string CreateProtocolKey(string name, IEnumerable<string> existingKeys)
    {
        var baseKey = Slugify(name);
        var usedKeys = new HashSet<string>(existingKeys, StringComparer.OrdinalIgnoreCase);
        if (!usedKeys.Contains(baseKey))
        {
            return baseKey;
        }

        for (var suffix = 2; suffix < 100_000; suffix++)
        {
            var candidate = WithSuffix(baseKey, suffix);
            if (!usedKeys.Contains(candidate))
            {
                return candidate;
            }
        }

        throw new InvalidOperationException("A unique protocol key could not be allocated.");
    }

    public static async Task<string> AllocateProtocolKeyAsync(
        PSeqOperationsDbContext dbContext,
        string name,
        CancellationToken cancellationToken)
    {
        var existingKeys = await dbContext.LabProtocols
            .AsNoTracking()
            .Select(item => item.Key)
            .ToListAsync(cancellationToken);
        return CreateProtocolKey(name, existingKeys);
    }

    public static string CreateBatchNumber(DateTime utcNow)
    {
        Span<char> token = stackalloc char[BatchTokenLength];
        for (var index = 0; index < token.Length; index++)
        {
            token[index] = SafeAlphabet[RandomNumberGenerator.GetInt32(SafeAlphabet.Length)];
        }

        var date = utcNow.ToUniversalTime().ToString("yyyyMMdd", CultureInfo.InvariantCulture);
        return $"PH-BAT-{date}-{token}";
    }

    public static async Task<string> AllocateBatchNumberAsync(
        PSeqOperationsDbContext dbContext,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var batchNumber = CreateBatchNumber(utcNow);
            if (!await dbContext.LabOperationalBatches
                .AsNoTracking()
                .AnyAsync(item => item.BatchNumber == batchNumber, cancellationToken))
            {
                return batchNumber;
            }
        }

        throw new InvalidOperationException("A unique batch number could not be allocated.");
    }

    private static string Slugify(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("A protocol name is required.", nameof(name));
        }

        var normalized = name.Trim().Normalize(NormalizationForm.FormD);
        var key = new StringBuilder(ProtocolKeyMaxLength);
        var separatorPending = false;

        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var lower = char.ToLowerInvariant(character);
            if (lower is >= 'a' and <= 'z' or >= '0' and <= '9')
            {
                if (separatorPending && key.Length > 0 && key.Length < ProtocolKeyMaxLength)
                {
                    key.Append('-');
                }

                if (key.Length < ProtocolKeyMaxLength)
                {
                    key.Append(lower);
                }

                separatorPending = false;
            }
            else if (key.Length > 0)
            {
                separatorPending = true;
            }
        }

        var result = key.ToString().TrimEnd('-');
        return result.Length == 0 ? "protocol" : result;
    }

    private static string WithSuffix(string baseKey, int suffix)
    {
        var suffixText = $"-{suffix.ToString(CultureInfo.InvariantCulture)}";
        var stemLength = Math.Min(baseKey.Length, ProtocolKeyMaxLength - suffixText.Length);
        return $"{baseKey[..stemLength].TrimEnd('-')}{suffixText}";
    }
}
