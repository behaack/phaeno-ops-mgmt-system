namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text;
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
    public sealed record ResultsDraftRequest(Guid Id, long SendoutVersion, int? Version, JsonElement? Payload);
    public sealed record FastqSetRequest(Guid Id, Guid DraftId, Guid MemberId, int SequencingRunNumber, string LibraryPreparationChoice, string ReadLayout);
    public sealed record FastqUploadRequest(Guid Id, string FileName, long SizeBytes, string ChunkManifestSha256,
        int GroupNumber, int ReadNumber, int PartNumber, string GroupDescription);
    private static string ChunkFingerprint(IEnumerable<string> hashes) => Convert.ToHexString(SHA256.HashData(Encoding.ASCII.GetBytes(string.Join("", hashes.Select(h => h.ToUpperInvariant())))));
    private async Task<LabVendorResultsDraft> RequireResultsDraft(Guid id, Guid actor, CancellationToken ct)
    {
        var draft = await dbContext.Set<LabVendorResultsDraft>().SingleOrDefaultAsync(d => d.Id == id && d.UserId == actor, ct) ?? throw Missing();
        if (draft.SavedAtUtc.HasValue || draft.ExpiresAtUtc <= DateTime.UtcNow) throw Conflict("results_draft_expired", "This results draft is saved or expired. Start a new draft; verified evidence is retained.");
        using var metadata = JsonDocument.Parse(draft.PayloadJson);
        if (metadata.RootElement.TryGetProperty("restartedAsDraftId", out _)) throw Conflict("results_draft_restarted", "This draft was restarted. Reload and continue its replacement draft; evidence is retained.");
        var sendout = await dbContext.LabNgsSendouts.AsNoTracking().SingleAsync(s => s.Id == draft.LabNgsSendoutId, ct);
        EnsureVersion(sendout.Version, draft.SendoutVersion);
        return draft;
    }

    [HttpPost("sendouts/{sendoutId:guid}/results/drafts")]
    public async Task<object> SaveResultsDraft(Guid sendoutId, ResultsDraftRequest input, [FromServices] IOptions<LabFastqOptions> limits, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (input.Id == Guid.Empty || input.Payload is { ValueKind: not JsonValueKind.Object }
            || input.Payload?.GetRawText().Length > 1_048_576) throw Invalid("results_draft_invalid", "Review the results draft.");
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "lab-sendout:" + sendoutId, ct);
        var sendout = await dbContext.LabNgsSendouts.SingleOrDefaultAsync(s => s.Id == sendoutId, ct) ?? throw Missing();
        EnsureVersion(sendout.Version, input.SendoutVersion);
        if (sendout.Status is not (LabNgsSendoutStatus.ReceivedByProvider or LabNgsSendoutStatus.Complete)) throw Conflict("results_not_ready", "Record results after vendor receipt.");
        var draft = await dbContext.Set<LabVendorResultsDraft>().SingleOrDefaultAsync(d => d.Id == input.Id, ct);
        if (draft is null) { draft = new(input.Id, sendout.Id, actor.User.Id, sendout.Version, DateTime.UtcNow, limits.Value.DraftLifetimeHours); dbContext.Add(draft); }
        else {
            await RequireResultsDraft(draft.Id, actor.User.Id, ct);
            if (draft.LabNgsSendoutId != sendoutId) throw Missing();
            if (input.Version != draft.Version) throw Conflict("results_draft_changed", "This draft changed in another window. Reload and review before saving.");
        }
        if (input.Payload.HasValue) draft.Update(ResultsDraftPayload(input.Payload.Value.GetRawText(), draft.PayloadJson));
        await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
        return new { draft.Id, draft.Version, draft.ExpiresAtUtc, payload = JsonSerializer.Deserialize<JsonElement>(draft.PayloadJson) };
    }

    [HttpGet("sendouts/{sendoutId:guid}/results/intake")]
    public async Task<object> ResultsIntake(Guid sendoutId, [FromServices] IOptions<LabFastqOptions> limits,
        [FromServices] IOptions<FileScanningOptions> scanning, CancellationToken ct, [FromServices] ScientificS3Access? s3 = null)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var sendout = await dbContext.LabNgsSendouts.AsNoTracking().SingleOrDefaultAsync(s => s.Id == sendoutId, ct) ?? throw Missing();
        var draft = await dbContext.Set<LabVendorResultsDraft>().AsNoTracking().Where(d => d.LabNgsSendoutId == sendoutId && d.UserId == actor.User.Id
            && d.SavedAtUtc == null && !EF.Functions.JsonExists(d.PayloadJson, "restartedAsDraftId")).OrderByDescending(d => d.CreatedAtUtc).FirstOrDefaultAsync(ct);
        var latest = await dbContext.LabVendorResultsVersions.AsNoTracking().Where(v => v.LabNgsSendoutId == sendoutId).OrderByDescending(v => v.ResultVersion).FirstOrDefaultAsync(ct);
        var retained = latest is null ? [] : JsonSerializer.Deserialize<DTOs.VendorResultsSnapshot>(latest.SnapshotJson, JsonOptions)!.FastqSets;
        var ids = retained?.Select(s => s.SetId).ToArray() ?? [];
        var recovered = draft is null ? [] : ResultsDraftRecoveryIds(draft.PayloadJson);
        var sets = await dbContext.Set<LabFastqSet>().AsNoTracking().Where(s => ids.Contains(s.Id) || recovered.Contains(s.Id) || draft != null && s.LabVendorResultsDraftId == draft.Id).ToListAsync(ct);
        var setIds = sets.Select(s => s.Id).ToArray();
        var uploads = await dbContext.Set<LabFastqUpload>().AsNoTracking().Where(u => setIds.Contains(u.LabFastqSetId)).OrderBy(u => u.GroupNumber).ThenBy(u => u.PartNumber).ThenBy(u => u.ReadNumber).ToListAsync(ct);
        var members = await (from m in dbContext.LabBatchMembers.AsNoTracking() join l in dbContext.LabLibraries on m.LabLibraryId equals l.Id
            join specimen in dbContext.LabSpecimens on l.LabSpecimenId equals specimen.Id
            where m.LabOperationalBatchId == sendout.LabOperationalBatchId
            select new { m.Id, m.LabWorkOrderId, l.LabSpecimenId, l.LibraryKey, sampleName = specimen.AccessionNumber }).ToListAsync(ct);
        var workIds = members.Select(m => m.LabWorkOrderId).Distinct().ToArray();
        var allocations = new Dictionary<Guid, int>();
        foreach (var work in workIds) foreach (var row in await new LabSequencingRunProgress(dbContext).AllocationsAsync(work, ct)) allocations[row.Key] = row.Value;
        var specimenIds = members.Select(m => m.LabSpecimenId).ToArray();
        var submitted = await dbContext.LabSpecimens.AsNoTracking().Where(s => specimenIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.SubmittedSpecimenId, ct);
        var archives = draft is null ? [] : await dbContext.Set<LabFastqArchive>().AsNoTracking().Where(a => a.LabVendorResultsDraftId == draft.Id
            && a.UserId == actor.User.Id && a.ExpiresAtUtc > DateTime.UtcNow).OrderByDescending(a => a.ExpiresAtUtc).ToListAsync(ct);
        return new { draft = draft is null ? null : new { draft.Id, draft.Version, draft.ExpiresAtUtc, stale = draft.SendoutVersion != sendout.Version,
                expired = draft.ExpiresAtUtc <= DateTime.UtcNow,
                payload = JsonSerializer.Deserialize<JsonElement>(draft.PayloadJson) },
            sendoutVersion = sendout.Version,
            protectedPackages = await new LabVendorResultSafety(dbContext).ProtectedPackagesAsync(retained?.SelectMany(s => s.Files).Select(f => f.OutputId).ToArray() ?? [], ct),
            tentative = true, s3Available = s3?.Available == true, policy = limits.Value, effectiveMaximumFileBytes = Math.Min(limits.Value.MaximumFileBytes, scanning.Value.MaximumStreamBytes),
            effectiveMaximumArchiveBytes = Math.Min(limits.Value.MaximumBatchArchiveBytes, scanning.Value.MaximumStreamBytes),
            archives = archives.Select(ArchivePublic),
            members = members.Select(m => new { m.Id, m.LabWorkOrderId, m.LabSpecimenId, m.LibraryKey, m.sampleName,
                purchasedRuns = allocations.GetValueOrDefault(submitted[m.LabSpecimenId], 1) }),
            sets = sets.Select(s => new { s.Id, memberId = s.LabBatchMemberId, s.SequencingRunNumber, s.LibraryPreparationChoice, s.ReadLayout, s.SetVersion,
                sealedSet = s.LabVendorResultsVersionId.HasValue || recovered.Contains(s.Id), files = uploads.Where(u => u.LabFastqSetId == s.Id).Select(FastqUploadPublic) }) };
    }

    [HttpPost("sendouts/{sendoutId:guid}/results/fastq-sets")]
    public async Task<object> BeginFastqSet(Guid sendoutId, FastqSetRequest input, [FromServices] IOptions<LabFastqOptions> limits, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "lab-sendout:" + sendoutId, ct);
        var draft = await RequireResultsDraft(input.DraftId, actor.User.Id, ct);
        if (draft.LabNgsSendoutId != sendoutId || input.Id == Guid.Empty) throw Missing();
        var member = await dbContext.LabBatchMembers.SingleOrDefaultAsync(m => m.Id == input.MemberId, ct) ?? throw Missing();
        var sendout = await dbContext.LabNgsSendouts.SingleAsync(s => s.Id == sendoutId, ct);
        if (member.LabOperationalBatchId != sendout.LabOperationalBatchId || !limits.Value.AllowedReadLayouts.Contains(input.ReadLayout)
            || input.LibraryPreparationChoice is not ("NewPreparation" or "ExistingLibrary")) throw Invalid("fastq_scope_invalid", "Choose this submission's library and actual read layout/preparation.");
        var selectedLibrary = await dbContext.LabLibraries.AsNoTracking().SingleAsync(l => l.Id == member.LabLibraryId, ct);
        var specimen = await RequireSpecimenAsync(member.LabWorkOrderId, selectedLibrary.LabSpecimenId, ct);
        var work = await RequireWorkOrderAsync(member.LabWorkOrderId, ct);
        if (work.Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.OnHold) throw Conflict("fastq_work_unavailable", "Resolve the job hold or cancellation first.");
        var count = (await new LabSequencingRunProgress(dbContext).AllocationsAsync(work.Id, ct)).GetValueOrDefault(specimen.SubmittedSpecimenId, 1);
        if (input.SequencingRunNumber < 1 || input.SequencingRunNumber > count) throw Invalid("fastq_run_invalid", "Choose an authorized purchased run.");
        var existing = await dbContext.Set<LabFastqSet>().SingleOrDefaultAsync(s => s.Id == input.Id, ct);
        if (existing is not null) {
            if (existing.LabVendorResultsDraftId != draft.Id || existing.LabBatchMemberId != member.Id || existing.ReadLayout != input.ReadLayout
                || existing.SequencingRunNumber != input.SequencingRunNumber || existing.LibraryPreparationChoice != input.LibraryPreparationChoice)
                throw Conflict("fastq_set_changed", "This file-set identity belongs to another mapping.");
            return new { existing.Id, existing.SetVersion };
        }
        var number = (await dbContext.Set<LabFastqSet>().Where(s => s.LabBatchMemberId == member.Id).Select(s => (int?)s.SetVersion).MaxAsync(ct) ?? 0) + 1;
        var set = new LabFastqSet(input.Id, draft.Id, member.Id, work.Id, specimen.Id, member.LabLibraryId,
            input.SequencingRunNumber, input.LibraryPreparationChoice, input.ReadLayout, number, JsonSerializer.Serialize(limits.Value, JsonOptions), actor.User.Id, DateTime.UtcNow);
        dbContext.Add(set); await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
        return new { set.Id, set.SetVersion };
    }

    private static object FastqUploadPublic(LabFastqUpload u) => new { u.Id, u.OriginalFileName, u.FileName, u.GroupNumber, u.ReadNumber, u.PartNumber,
        u.GroupDescription, u.SizeBytes, u.ReadCount, fileId = u.LabScientificFileId, u.ExpiresAtUtc,
        archiveId = u.LabFastqArchiveId, u.ArchiveEntryIndex,
        chunkBytes = ScientificChunkBytes, receivedBytes = u.LabScientificFileId.HasValue ? u.SizeBytes : JsonSerializer.Deserialize<List<ScientificChunk>>(u.ChunksJson)!.Sum(c => c.SizeBytes) };

    private async Task<(LabFastqUpload Upload, LabFastqSet Set)> RequireFastqUpload(Guid id, Guid actor, CancellationToken ct)
    {
        var upload = await dbContext.Set<LabFastqUpload>().SingleOrDefaultAsync(u => u.Id == id && u.UserId == actor, ct) ?? throw Missing();
        var set = await dbContext.Set<LabFastqSet>().SingleAsync(s => s.Id == upload.LabFastqSetId, ct);
        if (!upload.LabScientificFileId.HasValue) {
            await RequireResultsDraft(set.LabVendorResultsDraftId, actor, ct);
            if (set.LabVendorResultsVersionId.HasValue || upload.ExpiresAtUtc <= DateTime.UtcNow) throw Conflict("fastq_upload_expired", "This upload is saved or expired.");
            var work = await RequireWorkOrderAsync(set.LabWorkOrderId, ct);
            if (work.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled) throw Conflict("fastq_work_unavailable", "Resolve the job hold or cancellation first.");
        }
        return (upload, set);
    }

    [HttpPost("fastq-sets/{setId:guid}/uploads")]
    public async Task<object> BeginFastqUpload(Guid setId, FastqUploadRequest input, [FromServices] IOptions<FileScanningOptions> scanning, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "fastq-set:" + setId, ct);
        var set = await dbContext.Set<LabFastqSet>().SingleOrDefaultAsync(s => s.Id == setId && s.RecordedByUserId == actor.User.Id, ct) ?? throw Missing();
        var draft = await RequireResultsDraft(set.LabVendorResultsDraftId, actor.User.Id, ct);
        if (set.LabVendorResultsVersionId.HasValue) throw Conflict("fastq_set_sealed", "Saved files cannot be replaced. Create a new file set.");
        var policy = JsonSerializer.Deserialize<LabFastqOptions>(set.PolicyJson, JsonOptions)!;
        var name = Path.GetFileName((input.FileName ?? "").Replace('\\', '/'));
        var gzip = name.EndsWith(".fastq.gz", StringComparison.OrdinalIgnoreCase) || name.EndsWith(".fq.gz", StringComparison.OrdinalIgnoreCase);
        var plain = name.EndsWith(".fastq", StringComparison.OrdinalIgnoreCase) || name.EndsWith(".fq", StringComparison.OrdinalIgnoreCase);
        if (input.Id == Guid.Empty || name.Length is < 1 or > 255 || name.Any(char.IsControl) || !(gzip || plain)
            || !policy.AllowedCompression.Contains(gzip ? "Gzip" : "None") || input.SizeBytes <= 0
            || input.SizeBytes > Math.Min(policy.MaximumFileBytes, scanning.Value.MaximumStreamBytes)
            || input.ChunkManifestSha256?.Length != 64 || !input.ChunkManifestSha256.All(Uri.IsHexDigit)
            || input.GroupNumber < 1 || input.PartNumber < 1 || input.ReadNumber is not (1 or 2)
            || set.ReadLayout == "SingleEnd" && input.ReadNumber != 1 || !policy.AllowMultipleGroups && input.GroupNumber != 1
            || !policy.AllowSplitParts && input.PartNumber != 1 || string.IsNullOrWhiteSpace(input.GroupDescription) || input.GroupDescription.Length > 255)
            throw Invalid("fastq_upload_invalid", "Review the FASTQ size, read/group/part mapping and configured format limits.");
        var existing = await dbContext.Set<LabFastqUpload>().SingleOrDefaultAsync(u => u.Id == input.Id, ct);
        if (existing is not null) {
            if (existing.LabFastqSetId != setId || existing.UserId != actor.User.Id || existing.OriginalFileName != name || existing.SizeBytes != input.SizeBytes
                || existing.ChunkManifestSha256 != input.ChunkManifestSha256.ToUpperInvariant() || existing.GroupNumber != input.GroupNumber
                || existing.ReadNumber != input.ReadNumber || existing.PartNumber != input.PartNumber || existing.GroupDescription != input.GroupDescription.Trim())
                throw Conflict("fastq_upload_changed", "This upload identity has different files or mapping. Create a new file set.");
            return FastqUploadPublic(existing);
        }
        var siblings = await dbContext.Set<LabFastqUpload>().Where(u => u.LabFastqSetId == setId).ToListAsync(ct);
        if (siblings.Count >= policy.MaximumFilesPerSet || siblings.Sum(u => u.SizeBytes) > policy.MaximumFileSetBytes - input.SizeBytes
            || siblings.Any(u => u.GroupNumber == input.GroupNumber && u.ReadNumber == input.ReadNumber && u.PartNumber == input.PartNumber))
            throw Conflict("fastq_set_limit", "This file set exceeds its limit or already contains that read/group/part.");
        var library = await dbContext.LabLibraries.AsNoTracking().SingleAsync(l => l.Id == set.LabLibraryId, ct);
        var canonical = $"{library.LibraryKey}__{set.Id:N}__F{set.SetVersion:000}__G{input.GroupNumber:000}__R{input.ReadNumber}__P{input.PartNumber:000}.fastq{(gzip ? ".gz" : "")}";
        var upload = new LabFastqUpload(input.Id, set.Id, name, canonical, input.GroupNumber, input.ReadNumber, input.PartNumber,
            input.GroupDescription.Trim(), input.SizeBytes, input.ChunkManifestSha256.ToUpperInvariant(), actor.User.Id, draft.ExpiresAtUtc);
        dbContext.Add(upload); await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
        return FastqUploadPublic(upload);
    }

    [HttpPut("fastq-uploads/{uploadId:guid}/chunks/{offset:long}")]
    [Consumes("application/octet-stream")]
    [RequestSizeLimit(ScientificChunkBytes)]
    public async Task<object> UploadFastqChunk(Guid uploadId, long offset, [FromServices] IOperationalFileStorage storage, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "fastq-upload:" + uploadId, ct);
        var (upload, set) = await RequireFastqUpload(uploadId, actor.User.Id, ct);
        if (upload.LabScientificFileId.HasValue) return FastqUploadPublic(upload);
        var chunks = JsonSerializer.Deserialize<List<ScientificChunk>>(upload.ChunksJson)!; var received = chunks.Sum(c => c.SizeBytes);
        if (offset < 0 || offset % ScientificChunkBytes != 0 || offset > received || offset >= upload.SizeBytes
            || Request.ContentLength != Math.Min(ScientificChunkBytes, upload.SizeBytes - offset)) throw Conflict("fastq_upload_offset", "Resume from the verified upload position.");
        var directory = await FastqRawDirectoryAsync(set, ct);
        var stored = await storage.SaveScopedAsync(Request.Body, ".chunk", ScientificChunkBytes, $"{directory}/staging/upload-{upload.Id:N}", ct); var attempted = false;
        try {
            if (stored.SizeBytes != Request.ContentLength) throw Conflict("fastq_chunk_incomplete", "The file portion was interrupted.");
            if (offset < received) {
                var old = chunks[(int)(offset / ScientificChunkBytes)];
                if (old.Sha256 != stored.Sha256 || old.SizeBytes != stored.SizeBytes) throw Conflict("fastq_upload_changed", "The file changed during upload.");
                await storage.DeleteIfExistsAsync(stored.StorageKey, ct);
            } else { chunks.Add(new(stored.StorageKey, stored.SizeBytes, stored.Sha256)); upload.RecordChunks(JsonSerializer.Serialize(chunks)); attempted = true; await dbContext.SaveChangesAsync(ct); }
            if (tx is not null) await tx.CommitAsync(ct); return FastqUploadPublic(upload);
        } catch { if (!attempted) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None); throw; }
    }

    [HttpPost("fastq-uploads/{uploadId:guid}/complete")]
    public async Task<object> CompleteFastqUpload(Guid uploadId, [FromServices] IOperationalFileStorage storage,
        [FromServices] IOperationalFileScanner scanner, [FromServices] IOptions<FileScanningOptions> scanning, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "fastq-upload:" + uploadId, ct);
        var (upload, set) = await RequireFastqUpload(uploadId, actor.User.Id, ct);
        if (upload.LabScientificFileId.HasValue) return FastqUploadPublic(upload);
        var policy = JsonSerializer.Deserialize<LabFastqOptions>(set.PolicyJson, JsonOptions)!;
        if (upload.SizeBytes > Math.Min(policy.MaximumFileBytes, scanning.Value.MaximumStreamBytes)) throw Conflict("fastq_limit_changed", "This file exceeds current scan admission limits.");
        var chunks = JsonSerializer.Deserialize<List<ScientificChunk>>(upload.ChunksJson)!;
        if (chunks.Sum(c => c.SizeBytes) != upload.SizeBytes || ChunkFingerprint(chunks.Select(c => c.Sha256)) != upload.ChunkManifestSha256)
            throw Conflict("fastq_incomplete", "Finish uploading the exact selected file before verification.");
        var tempPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N") + ".fastq-upload");
        var drive = new DriveInfo(Path.GetPathRoot(tempPath)!);
        if (drive.AvailableFreeSpace <= ScientificChunkBytes || upload.SizeBytes > (drive.AvailableFreeSpace - ScientificChunkBytes) / 2)
            throw Conflict("fastq_storage_capacity", "Temporary storage has insufficient free space. Contact Operations.");
        var opts = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.ReadWrite, Share = FileShare.None, Options = FileOptions.Asynchronous | FileOptions.DeleteOnClose };
        if (!OperatingSystem.IsWindows()) opts.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        await using var assembled = new FileStream(tempPath, opts);
        foreach (var chunk in chunks) { await using var bytes = await LabScientificFiles.OpenVerifiedAsync(storage, chunk.Key, chunk.Sha256, chunk.SizeBytes, ct); await bytes.CopyToAsync(assembled, ct); }
        assembled.Position = 0;
        var receipt = await LabFastqValidation.ValidateAsync(assembled, upload.FileName.EndsWith(".gz"), upload.ReadNumber, policy, ct);
        assembled.Position = 0;
        var directory = await FastqRawDirectoryAsync(set, ct);
        var stored = await storage.SaveScopedAsync(assembled, upload.FileName.EndsWith(".gz") ? ".fastq.gz" : ".fastq", upload.SizeBytes, directory, ct); var attempted = false;
        try {
            if (stored.SizeBytes != upload.SizeBytes || (await scanner.ScanAsync(stored.StorageKey, ct)).Status != OperationalFileScanStatus.Clean)
                throw Conflict("fastq_scan_required", "The complete FASTQ file could not pass scanning. Its upload portions are retained for retry.");
            await using (var verified = await LabScientificFiles.OpenVerifiedAsync(storage, stored.StorageKey, stored.Sha256, stored.SizeBytes, ct, policy.MaximumFileBytes)) { }
            var file = new LabScientificFile(set.LabWorkOrderId, set.LabSpecimenId, upload.FileName, stored.StorageKey, stored.Sha256, stored.SizeBytes, actor.User.Id, DateTime.UtcNow);
            dbContext.Add(file); upload.Complete(file.Id, receipt.ReadCount, receipt.ReadIdentifiersSha256);
            dbContext.LabWorkEvents.Add(new LabWorkEvent(set.LabWorkOrderId, set.LabSpecimenId, "FastqFileVerified", DateTime.UtcNow, actor.User.Id,
                JsonSerializer.Serialize(new { setId = set.Id, uploadId, fileId = file.Id, upload.OriginalFileName, file.FileName, file.SizeBytes, file.Sha256, receipt.ReadCount }, JsonOptions)));
            attempted = true; await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
            return FastqUploadPublic(upload);
        } catch { if (!attempted) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None); throw; }
    }
}
