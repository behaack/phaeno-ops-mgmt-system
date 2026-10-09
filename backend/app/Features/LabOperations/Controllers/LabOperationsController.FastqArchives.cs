namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.IO.Compression;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    public sealed record FastqArchiveRequest(Guid Id, string FileName, long SizeBytes, string ChunkManifestSha256);
    public sealed record FastqArchiveImport(Guid UploadId, Guid SetId, int EntryIndex, int GroupNumber, int ReadNumber, int PartNumber, string GroupDescription);
    private static object ArchivePublic(LabFastqArchive a) => new { a.Id, a.FileName, a.SizeBytes, a.ExpiresAtUtc, chunkBytes = ScientificChunkBytes,
        receivedBytes = a.ManifestJson != null ? a.SizeBytes : JsonSerializer.Deserialize<List<ScientificChunk>>(a.ChunksJson)!.Sum(c => c.SizeBytes),
        inspected = a.ManifestJson != null, entries = a.ManifestJson is null ? null : JsonSerializer.Deserialize<List<FastqArchiveEntry>>(a.ManifestJson, JsonOptions) };
    private async Task<LabFastqArchive> RequireFastqArchive(Guid id, Guid actor, CancellationToken ct)
    {
        var archive = await dbContext.Set<LabFastqArchive>().SingleOrDefaultAsync(a => a.Id == id && a.UserId == actor, ct) ?? throw Missing();
        await RequireResultsDraft(archive.LabVendorResultsDraftId, actor, ct);
        if (archive.ExpiresAtUtc <= DateTime.UtcNow) throw Conflict("fastq_archive_expired", "This ZIP staging session expired. Upload it again; imported verified FASTQ files are retained.");
        return archive;
    }

    [HttpPost("results-drafts/{draftId:guid}/archives")]
    public async Task<object> BeginFastqArchive(Guid draftId, FastqArchiveRequest input, [FromServices] IOptions<LabFastqOptions> limits,
        [FromServices] IOptions<FileScanningOptions> scanning, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "fastq-archive:" + input.Id, ct);
        var draft = await RequireResultsDraft(draftId, actor.User.Id, ct);
        var name = Path.GetFileName((input.FileName ?? "").Replace('\\', '/'));
        if (input.Id == Guid.Empty || name.Length is < 1 or > 255 || name.Any(char.IsControl) || !name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)
            || input.SizeBytes <= 0 || input.SizeBytes > Math.Min(limits.Value.MaximumBatchArchiveBytes, scanning.Value.MaximumStreamBytes)
            || input.ChunkManifestSha256?.Length != 64 || !input.ChunkManifestSha256.All(Uri.IsHexDigit))
            throw Invalid("fastq_archive_invalid", "Choose a nonempty ZIP within the displayed effective archive limit.");
        var archive = await dbContext.Set<LabFastqArchive>().SingleOrDefaultAsync(a => a.Id == input.Id, ct);
        if (archive is not null) {
            if (archive.LabVendorResultsDraftId != draft.Id || archive.UserId != actor.User.Id || archive.FileName != name
                || archive.SizeBytes != input.SizeBytes || archive.ChunkManifestSha256 != input.ChunkManifestSha256.ToUpperInvariant())
                throw Conflict("fastq_archive_changed", "This ZIP identity has different content or scope. Start a new upload.");
        } else {
            if (await dbContext.Set<LabFastqArchive>().CountAsync(a => a.LabVendorResultsDraftId == draft.Id && a.ExpiresAtUtc > DateTime.UtcNow, ct) >= 5)
                throw Conflict("fastq_archive_limit", "This draft already has five ZIP staging sessions. Resume one or wait for expiry.");
            archive = new(input.Id, draft.Id, actor.User.Id, name, input.SizeBytes, input.ChunkManifestSha256.ToUpperInvariant(), draft.ExpiresAtUtc);
            dbContext.Add(archive); await dbContext.SaveChangesAsync(ct);
        }
        if (tx is not null) await tx.CommitAsync(ct); return ArchivePublic(archive);
    }

    [HttpPut("fastq-archives/{archiveId:guid}/chunks/{offset:long}")]
    [Consumes("application/octet-stream")]
    [RequestSizeLimit(ScientificChunkBytes)]
    public async Task<object> UploadFastqArchiveChunk(Guid archiveId, long offset, [FromServices] IOperationalFileStorage storage, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "fastq-archive:" + archiveId, ct);
        var archive = await RequireFastqArchive(archiveId, actor.User.Id, ct);
        if (archive.ManifestJson != null) return ArchivePublic(archive);
        var chunks = JsonSerializer.Deserialize<List<ScientificChunk>>(archive.ChunksJson)!; var received = chunks.Sum(c => c.SizeBytes);
        if (offset < 0 || offset % ScientificChunkBytes != 0 || offset > received || offset >= archive.SizeBytes
            || Request.ContentLength != Math.Min(ScientificChunkBytes, archive.SizeBytes - offset)) throw Conflict("fastq_archive_offset", "Resume from the ZIP's confirmed upload position.");
        var stored = await storage.SaveAsync(Request.Body, ".chunk", ScientificChunkBytes, ct); var attempted = false;
        try {
            if (stored.SizeBytes != Request.ContentLength) throw Conflict("fastq_archive_incomplete", "The ZIP portion was interrupted.");
            if (offset < received) {
                var old = chunks[(int)(offset / ScientificChunkBytes)];
                if (old.Sha256 != stored.Sha256 || old.SizeBytes != stored.SizeBytes) throw Conflict("fastq_archive_changed", "The ZIP changed during upload.");
                await storage.DeleteIfExistsAsync(stored.StorageKey, ct);
            } else { chunks.Add(new(stored.StorageKey, stored.SizeBytes, stored.Sha256)); archive.RecordChunks(JsonSerializer.Serialize(chunks)); attempted = true; await dbContext.SaveChangesAsync(ct); }
            if (tx is not null) await tx.CommitAsync(ct); return ArchivePublic(archive);
        } catch { if (!attempted) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None); throw; }
    }

    private static FileStream ArchiveTemporary(long bytes)
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N") + ".fastq-archive");
        var free = new DriveInfo(Path.GetPathRoot(path)!).AvailableFreeSpace;
        if (free <= ScientificChunkBytes || bytes > (free - ScientificChunkBytes) / 2) throw new OrderManagementException("fastq_storage_capacity", "Temporary storage has insufficient free space.", 409);
        var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.ReadWrite, Share = FileShare.None,
            Options = FileOptions.Asynchronous | FileOptions.DeleteOnClose };
        if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        return new(path, options);
    }

    [HttpPost("fastq-archives/{archiveId:guid}/complete")]
    public async Task<object> InspectFastqArchive(Guid archiveId, [FromServices] IOptions<LabFastqOptions> limits,
        [FromServices] IOptions<FileScanningOptions> scanning, [FromServices] IOperationalFileStorage storage, [FromServices] IOperationalFileScanner scanner, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "fastq-archive:" + archiveId, ct);
        var archive = await RequireFastqArchive(archiveId, actor.User.Id, ct);
        if (archive.ManifestJson != null) return ArchivePublic(archive);
        if (archive.SizeBytes > Math.Min(limits.Value.MaximumBatchArchiveBytes, scanning.Value.MaximumStreamBytes)) throw Conflict("fastq_archive_limit_changed", "The ZIP exceeds the current effective limit.");
        var chunks = JsonSerializer.Deserialize<List<ScientificChunk>>(archive.ChunksJson)!;
        if (chunks.Sum(c => c.SizeBytes) != archive.SizeBytes || ChunkFingerprint(chunks.Select(c => c.Sha256)) != archive.ChunkManifestSha256)
            throw Conflict("fastq_archive_incomplete", "Upload the exact complete ZIP before inspection.");
        await using var assembled = ArchiveTemporary(archive.SizeBytes);
        foreach (var part in chunks) { await using var content = await LabScientificFiles.OpenVerifiedAsync(storage, part.Key, part.Sha256, part.SizeBytes, ct); await content.CopyToAsync(assembled, ct); }
        assembled.Position = 0; var stored = await storage.SaveAsync(assembled, ".zip", archive.SizeBytes, ct); var attempted = false;
        try {
            if ((await scanner.ScanAsync(stored.StorageKey, ct)).Status != OperationalFileScanStatus.Clean) throw Conflict("fastq_archive_scan_required", "The ZIP could not pass scanning. Its transfer portions remain available for retry.");
            // Inspect/extract only the completed provider object, never a partially uploaded ZIP.
            await using var verified = await LabScientificFiles.OpenVerifiedAsync(storage, stored.StorageKey, stored.Sha256, stored.SizeBytes, ct, limits.Value.MaximumBatchArchiveBytes);
            IReadOnlyList<FastqArchiveEntry> entries;
            try { using var zip = new ZipArchive(verified, ZipArchiveMode.Read, true); entries = LabFastqArchiveInspection.Inspect(zip, limits.Value); }
            catch (InvalidDataException) { throw Conflict("fastq_archive_invalid", "The completed ZIP is corrupt, truncated or unsupported."); }
            archive.Inspect(stored.StorageKey, stored.Sha256, JsonSerializer.Serialize(entries, JsonOptions)); attempted = true;
            await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct); return ArchivePublic(archive);
        } catch { if (!attempted) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None); throw; }
    }

    [HttpPost("fastq-archives/{archiveId:guid}/import")]
    public async Task<object> ImportFastqArchiveEntry(Guid archiveId, FastqArchiveImport input,
        [FromServices] IOptions<LabFastqOptions> limits, [FromServices] IOptions<FileScanningOptions> scanning,
        [FromServices] IOperationalFileStorage storage, [FromServices] IOperationalFileScanner scanner, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "fastq-set:" + input.SetId, ct);
        await SampleShippingPackingData.LockAsync(dbContext, "fastq-archive:" + archiveId, ct);
        var archive = await RequireFastqArchive(archiveId, actor.User.Id, ct);
        var set = await dbContext.Set<LabFastqSet>().SingleOrDefaultAsync(s => s.Id == input.SetId && s.RecordedByUserId == actor.User.Id
            && s.LabVendorResultsDraftId == archive.LabVendorResultsDraftId, ct) ?? throw Missing();
        var policy = JsonSerializer.Deserialize<LabFastqOptions>(set.PolicyJson, JsonOptions)!;
        if (set.LabVendorResultsVersionId.HasValue || archive.ManifestJson is null || archive.StorageKey is null || input.UploadId == Guid.Empty)
            throw Conflict("fastq_archive_not_ready", "Inspect the ZIP and review its mapping into an unsaved file set first.");
        var entry = JsonSerializer.Deserialize<List<FastqArchiveEntry>>(archive.ManifestJson, JsonOptions)!.SingleOrDefault(e => e.Index == input.EntryIndex);
        if (entry?.IsFastq != true || input.GroupNumber < 1 || input.PartNumber < 1 || input.ReadNumber is not (1 or 2)
            || set.ReadLayout == "SingleEnd" && input.ReadNumber != 1 || !policy.AllowMultipleGroups && input.GroupNumber != 1
            || !policy.AllowSplitParts && input.PartNumber != 1 || string.IsNullOrWhiteSpace(input.GroupDescription) || input.GroupDescription.Length > 255)
            throw Invalid("fastq_archive_mapping_invalid", "Review each FASTQ entry's exact library/read/group/part mapping.");
        var gzip = entry.FileName.EndsWith(".gz", StringComparison.OrdinalIgnoreCase);
        if (!policy.AllowedCompression.Contains(gzip ? "Gzip" : "None") || entry.SizeBytes > Math.Min(policy.MaximumFileBytes, scanning.Value.MaximumStreamBytes))
            throw Conflict("fastq_archive_entry_limit", "This FASTQ entry exceeds current file or scanning admission limits.");
        var existing = await dbContext.Set<LabFastqUpload>().SingleOrDefaultAsync(u => u.Id == input.UploadId, ct);
        if (existing is not null) {
            if (existing.LabFastqSetId != set.Id || existing.LabFastqArchiveId != archiveId || existing.ArchiveEntryIndex != input.EntryIndex
                || existing.GroupNumber != input.GroupNumber || existing.ReadNumber != input.ReadNumber || existing.PartNumber != input.PartNumber
                || existing.GroupDescription != input.GroupDescription.Trim()) throw Conflict("fastq_archive_mapping_changed", "This imported-file identity has a different mapping. Use a new file set for a correction.");
            return FastqUploadPublic(existing);
        }
        var work = await RequireWorkOrderAsync(set.LabWorkOrderId, ct);
        if (work.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled) throw Conflict("fastq_work_unavailable", "Resolve the job hold or cancellation first.");
        var siblings = await dbContext.Set<LabFastqUpload>().Where(u => u.LabFastqSetId == set.Id).ToListAsync(ct);
        if (siblings.Count >= policy.MaximumFilesPerSet || siblings.Sum(u => u.SizeBytes) > policy.MaximumFileSetBytes - entry.SizeBytes
            || siblings.Any(u => u.GroupNumber == input.GroupNumber && u.ReadNumber == input.ReadNumber && u.PartNumber == input.PartNumber
                || u.LabFastqArchiveId == archiveId && u.ArchiveEntryIndex == input.EntryIndex))
            throw Conflict("fastq_archive_duplicate", "This file set already contains that ZIP entry/read mapping or exceeds its size limit.");
        await using var zipBytes = await LabScientificFiles.OpenVerifiedAsync(storage, archive.StorageKey, archive.Sha256!, archive.SizeBytes, ct, limits.Value.MaximumBatchArchiveBytes);
        using var zip = new ZipArchive(zipBytes, ZipArchiveMode.Read, true);
        var current = LabFastqArchiveInspection.Inspect(zip, limits.Value).SingleOrDefault(e => e.Index == entry.Index);
        if (current != entry) throw Conflict("fastq_archive_changed", "The retained ZIP does not match its inspected manifest.");
        await using var temp = ArchiveTemporary(entry.SizeBytes);
        try {
            await using var source = zip.Entries[entry.Index].Open(); var buffer = new byte[81920]; long total = 0; int read;
            while ((read = await source.ReadAsync(buffer, ct)) != 0) { if (total > entry.SizeBytes - read) throw Conflict("fastq_archive_entry_invalid", "The extracted file exceeds its declared size."); total += read; await temp.WriteAsync(buffer.AsMemory(0, read), ct); }
            if (total != entry.SizeBytes) throw Conflict("fastq_archive_entry_invalid", "The ZIP entry is truncated.");
        } catch (InvalidDataException) { throw Conflict("fastq_archive_entry_invalid", "The ZIP entry is corrupt or unsupported."); }
        temp.Position = 0; var validation = await LabFastqValidation.ValidateAsync(temp, gzip, input.ReadNumber, policy, ct); temp.Position = 0;
        var directory = await FastqRawDirectoryAsync(set, ct);
        var stored = await storage.SaveScopedAsync(temp, gzip ? ".fastq.gz" : ".fastq", entry.SizeBytes, directory, ct); var attempted = false;
        try {
            if ((await scanner.ScanAsync(stored.StorageKey, ct)).Status != OperationalFileScanStatus.Clean) throw Conflict("fastq_scan_required", "The imported FASTQ file could not pass scanning.");
            await using (var verified = await LabScientificFiles.OpenVerifiedAsync(storage, stored.StorageKey, stored.Sha256, stored.SizeBytes, ct, policy.MaximumFileBytes)) { }
            var library = await dbContext.LabLibraries.AsNoTracking().SingleAsync(l => l.Id == set.LabLibraryId, ct);
            var name = $"{library.LibraryKey}__{set.Id:N}__F{set.SetVersion:000}__G{input.GroupNumber:000}__R{input.ReadNumber}__P{input.PartNumber:000}.fastq{(gzip ? ".gz" : "")}";
            var file = new LabScientificFile(set.LabWorkOrderId, set.LabSpecimenId, name, stored.StorageKey, stored.Sha256, stored.SizeBytes, actor.User.Id, DateTime.UtcNow);
            var upload = new LabFastqUpload(input.UploadId, set.Id, entry.FileName, name, input.GroupNumber, input.ReadNumber, input.PartNumber,
                input.GroupDescription.Trim(), stored.SizeBytes, archive.ChunkManifestSha256, actor.User.Id, archive.ExpiresAtUtc, archiveId, entry.Index);
            upload.Complete(file.Id, validation.ReadCount, validation.ReadIdentifiersSha256); dbContext.AddRange(file, upload);
            dbContext.LabWorkEvents.Add(new LabWorkEvent(set.LabWorkOrderId, set.LabSpecimenId, "FastqZipEntryVerified", DateTime.UtcNow, actor.User.Id,
                JsonSerializer.Serialize(new { archiveId, entry.Index, entry.FullName, setId = set.Id, fileId = file.Id, file.Sha256, file.SizeBytes, validation.ReadCount }, JsonOptions)));
            attempted = true; await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct); return FastqUploadPublic(upload);
        } catch { if (!attempted) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None); throw; }
    }
}
