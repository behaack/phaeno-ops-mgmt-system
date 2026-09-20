namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public static class LabScientificFiles
{
    public const string Prefix = "poms-file:";
    public const long MaximumBytes = 1_073_741_824;
    public static object Public(LabScientificFile file) => new
    {
        file.Id, file.FileName, file.Sha256, file.SizeBytes, file.RecordedAtUtc,
        externalFileReference = Prefix + file.Id.ToString("D")
    };

    public static async Task ValidateAsync(PSeqOperationsDbContext db, Guid work, Guid specimen,
        string reference, string sha256, long size, CancellationToken ct)
    {
        // Historical/provider-owned references remain declarations, never managed-file claims.
        if (!reference.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase)) return;
        if (!Guid.TryParseExact(reference[Prefix.Length..], "D", out var id)) throw Invalid();
        var file = await db.LabScientificFiles.AsNoTracking().SingleOrDefaultAsync(
            f => f.Id == id && f.LabWorkOrderId == work && f.LabSpecimenId == specimen, ct);
        if (file is null || size != file.SizeBytes || !string.Equals(sha256, file.Sha256, StringComparison.OrdinalIgnoreCase))
            throw Invalid();
    }

    public static async Task ValidateDocumentsAsync(PSeqOperationsDbContext db, Guid work, Guid specimen,
        LabScientificEvidence? evidence, CancellationToken ct)
    {
        foreach (var doc in evidence?.Documents ?? [])
        {
            await ValidateAsync(db, work, specimen, doc.ExternalFileReference, doc.Sha256, doc.SizeBytes, ct);
            if (doc.Role == "parameters" && evidence?.ParametersSha256 is not null
                && doc.ExternalFileReference.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase)
                && !string.Equals(doc.Sha256, evidence.ParametersSha256, StringComparison.OrdinalIgnoreCase))
                throw new OrderManagementException("scientific_settings_file_mismatch",
                    "The analysis settings fingerprint must match its uploaded settings file.", 409);
        }
    }

    private static OrderManagementException Invalid() => new("scientific_file_invalid",
        "Choose a verified file uploaded for this sample. Its identity and checksum cannot be changed.", 409);

    // Verify all bytes before returning a stream; never serve an unverified prefix.
    public static async Task<FileStream> OpenVerifiedAsync(IOperationalFileStorage storage,
        string key, string sha256, long size, CancellationToken ct)
    {
        if (size is <= 0 or > MaximumBytes) throw Invalid();
        var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.ReadWrite, Share = FileShare.None,
            Options = FileOptions.Asynchronous | FileOptions.SequentialScan | FileOptions.DeleteOnClose };
        if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        var temp = new FileStream(Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N") + ".scientific"), options);
        try
        {
            await using var source = await storage.OpenReadAsync(key, ct);
            using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
            var buffer = new byte[81920]; long total = 0;
            int count;
            while ((count = await source.ReadAsync(buffer, ct)) != 0)
            {
                total += count;
                if (total > size) throw Integrity();
                hash.AppendData(buffer, 0, count);
                await temp.WriteAsync(buffer.AsMemory(0, count), ct);
            }
            if (total != size || !string.Equals(Convert.ToHexString(hash.GetHashAndReset()), sha256, StringComparison.OrdinalIgnoreCase))
                throw Integrity();
            temp.Position = 0;
            return temp;
        }
        catch { await temp.DisposeAsync(); throw; }
    }

    private static OrderManagementException Integrity() => new("scientific_file_integrity_failed",
        "The stored file does not match its recorded fingerprint or size. Investigate the original upload.", 409);
}
