namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.IO.Compression;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record FastqArchiveEntry(int Index, string FullName, string FileName, long SizeBytes, bool IsFastq);
public static class LabFastqArchiveInspection
{
    public static IReadOnlyList<FastqArchiveEntry> Inspect(ZipArchive archive, LabFastqOptions policy)
    {
        if (archive.Entries.Count == 0 || archive.Entries.Count > policy.MaximumArchiveEntries) throw Invalid("The ZIP is empty or exceeds the configured entry limit.");
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase); var files = new List<FastqArchiveEntry>(); long total = 0;
        for (var index = 0; index < archive.Entries.Count; index++) {
            var entry = archive.Entries[index]; var path = entry.FullName.Replace('\\', '/');
            if (path.Length > 1000 || path.StartsWith('/') || path.Any(char.IsControl) || path.Contains(':')
                || path.Split('/').Any(p => p is ".." or ".") || !names.Add(path) || entry.IsEncrypted
                || ((entry.ExternalAttributes >> 16) & 0xf000) == 0xa000)
                throw Invalid("Use a ZIP with unique relative paths, regular files and no encryption or symbolic links.");
            if (path.EndsWith('/')) { if (entry.Length != 0) throw Invalid("A ZIP directory contains unexpected data."); continue; }
            var name = path.Split('/')[^1];
            var fastq = name.EndsWith(".fastq", StringComparison.OrdinalIgnoreCase) || name.EndsWith(".fq", StringComparison.OrdinalIgnoreCase)
                || name.EndsWith(".fastq.gz", StringComparison.OrdinalIgnoreCase) || name.EndsWith(".fq.gz", StringComparison.OrdinalIgnoreCase);
            if (name.Length is < 1 or > 255 || entry.Length <= 0 || entry.Length > policy.MaximumFileBytes
                || total > policy.MaximumArchiveExpandedBytes - entry.Length)
                throw Invalid("A ZIP entry is empty or the declared expanded content exceeds configured limits.");
            total += entry.Length;
            if (!fastq && Path.GetExtension(name).ToLowerInvariant() is not (".txt" or ".csv" or ".tsv" or ".json" or ".pdf" or ".html" or ".md"))
                throw Invalid("The ZIP contains an unsupported file. Include FASTQ files and ordinary accompanying reports/manifests only.");
            files.Add(new(index, path, name, entry.Length, fastq));
        }
        if (!files.Any(f => f.IsFastq)) throw Invalid("The ZIP contains no supported FASTQ files.");
        return files;
    }
    private static OrderManagementException Invalid(string message) => new("fastq_archive_invalid", message, 409);
}
