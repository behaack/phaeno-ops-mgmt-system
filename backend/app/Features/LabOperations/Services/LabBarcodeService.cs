namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

internal static class LabBarcodeService
{
    private const string SafeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const int TokenLength = 10;

    public static string Create(LabContainerKind kind)
    {
        Span<char> token = stackalloc char[TokenLength];
        for (var index = 0; index < token.Length; index++)
        {
            token[index] = SafeAlphabet[RandomNumberGenerator.GetInt32(SafeAlphabet.Length)];
        }

        var payload = $"PH-{KindCode(kind)}-{token}";
        return $"{payload}-{Checksum(payload)}";
    }

    public static bool TryNormalize(string? value, out string barcode)
    {
        barcode = string.Empty;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var candidate = value.Trim().ToUpperInvariant();
        if (candidate.Length > 2 && candidate[0] == '*' && candidate[^1] == '*')
        {
            candidate = candidate[1..^1];
        }

        var parts = candidate.Split('-', StringSplitOptions.None);
        if (parts is not ["PH", string { Length: 1 } kind, string { Length: TokenLength } token, string { Length: 1 } check]
            || !"SARLO".Contains(kind, StringComparison.Ordinal)
            || token.Any(character => !SafeAlphabet.Contains(character))
            || !SafeAlphabet.Contains(check, StringComparison.Ordinal))
        {
            return false;
        }

        var payload = string.Join('-', parts[..3]);
        if (check[0] != Checksum(payload))
        {
            return false;
        }

        barcode = candidate;
        return true;
    }

    public static async Task<string> AllocateAsync(
        PSeqOperationsDbContext dbContext,
        LabContainerKind kind,
        CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var barcode = Create(kind);
            if (!await dbContext.LabContainers
                .AsNoTracking()
                .AnyAsync(item => item.Barcode == barcode, cancellationToken))
            {
                return barcode;
            }
        }

        throw new InvalidOperationException("A unique Phaeno barcode could not be allocated.");
    }

    private static char KindCode(LabContainerKind kind) => kind switch
    {
        LabContainerKind.SubmittedSpecimen => 'S',
        LabContainerKind.Aliquot => 'A',
        LabContainerKind.PreparedReagent => 'R',
        LabContainerKind.Library => 'L',
        LabContainerKind.Other => 'O',
        _ => throw new ArgumentOutOfRangeException(nameof(kind))
    };

    private static char Checksum(string payload)
    {
        var checksum = 0;
        foreach (var character in payload)
        {
            checksum = ((checksum * 33) + character) % SafeAlphabet.Length;
        }

        return SafeAlphabet[checksum];
    }
}
