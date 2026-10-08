namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public static class LabFastqValidation
{
    public sealed record Receipt(long ReadCount, string ReadIdentifiersSha256);
    public static async Task<Receipt> ValidateAsync(Stream bytes, bool gzip, int read, LabFastqOptions policy, CancellationToken ct)
    {
        var magic = new byte[2]; var got = await bytes.ReadAsync(magic, ct); bytes.Position = 0;
        if (gzip != (got == 2 && magic[0] == 0x1f && magic[1] == 0x8b)) throw Error("The compression does not match the FASTQ filename.");
        await using var expanded = gzip ? new GZipStream(bytes, CompressionMode.Decompress, true) : null;
        using var reader = new StreamReader(expanded ?? bytes, new UTF8Encoding(false, true), false, 8192, true);
        var lines = new BoundedLines(reader, policy.MaximumReadLength + 1024, policy.MaximumExpandedFileBytes);
        using var identifiers = IncrementalHash.CreateHash(HashAlgorithmName.SHA256); long count = 0;
        try {
            while (await lines.ReadAsync(ct) is { } header) {
                var sequence = await lines.ReadAsync(ct); var separator = await lines.ReadAsync(ct); var quality = await lines.ReadAsync(ct);
                if (!header.StartsWith('@') || header.Length < 2 || sequence is null || separator is null || quality is null
                    || !separator.StartsWith('+') || sequence.Length is < 1 || sequence.Length > policy.MaximumReadLength
                    || sequence.Length != quality.Length || sequence.Any(c => "ACGTNacgtn".IndexOf(c) < 0)
                    || quality.Any(c => c is < '!' or > '~')) throw Error("The file contains an invalid or incomplete FASTQ record.");
                var fields = header[1..].Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                var identity = fields[0];
                if (identity.EndsWith("/1") || identity.EndsWith("/2")) {
                    if (identity[^1] - '0' != read) throw Error("The read role conflicts with the FASTQ identifiers.");
                    identity = identity[..^2];
                }
                if (fields.Length > 1 && fields[1].Length > 1 && fields[1][1] == ':' && fields[1][0] is '1' or '2'
                    && fields[1][0] - '0' != read) throw Error("The read role conflicts with the FASTQ identifiers.");
                if (separator.Length > 1 && separator[1..] != header[1..]) throw Error("The FASTQ separator identity does not match its read.");
                identifiers.AppendData(Encoding.UTF8.GetBytes(identity + "\n")); count = checked(count + 1);
            }
        } catch (InvalidDataException) { throw Error("The gzip stream is corrupt or truncated."); }
          catch (DecoderFallbackException) { throw Error("The FASTQ text encoding is invalid."); }
        if (count == 0) throw Error("The FASTQ file contains no reads.");
        return new(count, Convert.ToHexString(identifiers.GetHashAndReset()));
    }

    public static void RequireComplete(LabFastqSet set, IReadOnlyList<LabFastqUpload> files, LabFastqOptions policy)
    {
        if (files.Count == 0 || files.Count > policy.MaximumFilesPerSet || files.Sum(f => f.SizeBytes) > policy.MaximumFileSetBytes
            || files.Any(f => !f.LabScientificFileId.HasValue || f.ReadCount is not > 0)) throw Error("Finish verifying every required FASTQ file for this library.");
        var groups = files.GroupBy(f => f.GroupNumber).OrderBy(g => g.Key).ToArray();
        if (!groups.Select(g => g.Key).SequenceEqual(Enumerable.Range(1, groups.Length))) throw Error("FASTQ groups must be consecutive from 1.");
        foreach (var group in groups) {
            if (group.Select(f => f.GroupDescription).Distinct().Count() != 1) throw Error("Use the same flowcell/lane description for a read group.");
            var parts = group.GroupBy(f => f.PartNumber).OrderBy(p => p.Key).ToArray();
            if (!parts.Select(p => p.Key).SequenceEqual(Enumerable.Range(1, parts.Length))) throw Error("FASTQ parts must be consecutive from 1 within each group.");
            foreach (var part in parts) {
                var pair = part.OrderBy(f => f.ReadNumber).ToArray();
                if (set.ReadLayout == "SingleEnd" ? pair.Length != 1 || pair[0].ReadNumber != 1
                    : pair.Length != 2 || pair[0].ReadNumber != 1 || pair[1].ReadNumber != 2)
                    throw Error("Upload the complete read set for every group and part in the selected layout.");
                if (pair.Length == 2 && (pair[0].ReadCount != pair[1].ReadCount || pair[0].ReadIdentifiersSha256 != pair[1].ReadIdentifiersSha256))
                    throw Error("The paired FASTQ files have different read counts or read identities/order.");
            }
        }
    }

    private sealed class BoundedLines(StreamReader reader, int lineLimit, long expandedLimit)
    {
        private readonly char[] buffer = new char[8192]; private int position, length; private long total;
        public async Task<string?> ReadAsync(CancellationToken ct)
        {
            var line = new StringBuilder();
            while (true) {
                if (position == length) { length = await reader.ReadAsync(buffer.AsMemory(), ct); position = 0;
                    if (length == 0) return line.Length == 0 ? null : line.ToString().TrimEnd('\r'); }
                var value = buffer[position++]; total++;
                if (total > expandedLimit || line.Length >= lineLimit) throw Error("FASTQ content exceeds the configured validation bounds.");
                if (value == '\n') return line.ToString().TrimEnd('\r');
                if (value > 127 || value < 32 && value != '\r') throw Error("FASTQ content must contain supported plain text.");
                line.Append(value);
            }
        }
    }
    private static OrderManagementException Error(string message) => new("fastq_invalid", message, 409);
}
