namespace PhaenoPortal.App.Features.LabOperations.Controllers;

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
    public sealed record OriginalS3FileRequest(string Key, string ETag);
    public sealed record OriginalS3FastqRequest(Guid Id, string Key, string ETag, int GroupNumber, int ReadNumber, int PartNumber, string GroupDescription);

    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/s3-files")]
    public async Task<object> ScientificS3Files(Guid workOrderId, Guid specimenId, [FromQuery] string? cursor,
        [FromServices] ScientificS3Access source, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var work = await RequireWorkOrderAsync(workOrderId, ct);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        return await source.ListAsync(ScientificStorageHierarchy.Sample(work.SubmittingOrganizationId, work.Id, specimenId), cursor, ct);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/s3-files")]
    public async Task<object> RegisterScientificS3File(Guid workOrderId, Guid specimenId, OriginalS3FileRequest input,
        [FromServices] ScientificS3Access source, [FromServices] IOperationalFileStorage storage,
        [FromServices] IOperationalFileScanner scanner, [FromServices] IOptions<FileScanningOptions> scanning, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "scientific-s3:" + specimenId, ct);
        var work = await RequireWorkOrderAsync(workOrderId, ct);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        if (work.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled)
            throw Conflict("scientific_upload_unavailable", "Resolve the job hold or cancellation before registering evidence.");
        var snapshot = await source.CaptureAsync(ScientificStorageHierarchy.Sample(work.SubmittingOrganizationId, work.Id, specimenId),
            input.Key, input.ETag, ScientificUploadLimit(scanning.Value), ct);
        var key = snapshot.Address.ToStorageKey();
        var existing = await dbContext.LabScientificFiles.AsNoTracking().SingleOrDefaultAsync(f => f.StorageKey == key, ct);
        if (existing is not null)
        {
            if (existing.LabWorkOrderId != work.Id || existing.LabSpecimenId != specimenId) throw Missing();
            return LabScientificFiles.Public(existing);
        }
        var verified = await ScientificS3Access.ReadAsync(snapshot, storage, ct);
        await using var content = verified.Content;
        if ((await scanner.ScanAsync(key, ct)).Status != OperationalFileScanStatus.Clean)
            throw Conflict("scientific_file_scan_required", "The original S3 file could not pass scanning. No file was admitted.");
        var file = new LabScientificFile(work.Id, specimenId, snapshot.FileName, key, verified.Sha256, snapshot.SizeBytes, actor.User.Id, DateTime.UtcNow);
        dbContext.Add(file);
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, specimenId, "ScientificS3FileRegistered", DateTime.UtcNow, actor.User.Id,
            JsonSerializer.Serialize(new { file.Id, file.FileName, file.Sha256, file.SizeBytes, source = snapshot.Address }, JsonOptions)));
        await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
        return LabScientificFiles.Public(file);
    }

    private async Task<(LabFastqSet Set, LabVendorResultsDraft Draft, string Directory)> S3FastqScopeAsync(Guid setId, Guid actor, CancellationToken ct)
    {
        var set = await dbContext.Set<LabFastqSet>().SingleOrDefaultAsync(s => s.Id == setId && s.RecordedByUserId == actor, ct) ?? throw Missing();
        var draft = await RequireResultsDraft(set.LabVendorResultsDraftId, actor, ct);
        if (set.LabVendorResultsVersionId.HasValue) throw Conflict("fastq_set_sealed", "Saved files cannot be replaced. Create a new file set.");
        var work = await RequireWorkOrderAsync(set.LabWorkOrderId, ct);
        if (work.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled)
            throw Conflict("fastq_work_unavailable", "Resolve the job hold or cancellation first.");
        var directory = ScientificStorageHierarchy.Sequencing(work.SubmittingOrganizationId, work.Id, set.LabSpecimenId,
            set.LabLibraryId, set.Id, set.SequencingRunNumber) + "/raw";
        return (set, draft, directory);
    }

    [HttpGet("fastq-sets/{setId:guid}/s3-files")]
    public async Task<object> FastqS3Files(Guid setId, [FromQuery] string? cursor, [FromServices] ScientificS3Access source, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var scope = await S3FastqScopeAsync(setId, actor.User.Id, ct);
        return await source.ListAsync(scope.Directory, cursor, ct);
    }

    [HttpPost("fastq-sets/{setId:guid}/s3-files")]
    public async Task<object> RegisterFastqS3File(Guid setId, OriginalS3FastqRequest input,
        [FromServices] ScientificS3Access source, [FromServices] IOperationalFileStorage storage,
        [FromServices] IOperationalFileScanner scanner, [FromServices] IOptions<FileScanningOptions> scanning, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "fastq-set:" + setId, ct);
        var scope = await S3FastqScopeAsync(setId, actor.User.Id, ct); var set = scope.Set;
        await SampleShippingPackingData.LockAsync(dbContext, "scientific-s3:" + set.LabSpecimenId, ct);
        var policy = JsonSerializer.Deserialize<LabFastqOptions>(set.PolicyJson, JsonOptions)!;
        if (input.Id == Guid.Empty || input.GroupNumber < 1 || input.PartNumber < 1 || input.ReadNumber is not (1 or 2)
            || set.ReadLayout == "SingleEnd" && input.ReadNumber != 1 || !policy.AllowMultipleGroups && input.GroupNumber != 1
            || !policy.AllowSplitParts && input.PartNumber != 1 || string.IsNullOrWhiteSpace(input.GroupDescription) || input.GroupDescription.Length > 255)
            throw Invalid("fastq_s3_mapping_invalid", "Review the original FASTQ's exact read/group/part mapping.");
        var prior = await dbContext.Set<LabFastqUpload>().SingleOrDefaultAsync(u => u.Id == input.Id, ct);
        if (prior is not null)
        {
            var priorFile = prior.LabScientificFileId.HasValue ? await dbContext.LabScientificFiles.AsNoTracking().SingleAsync(f => f.Id == prior.LabScientificFileId, ct) : null;
            var priorAddress = priorFile is not null && S3OriginalObject.IsOriginal(priorFile.StorageKey) ? S3OriginalObject.Parse(priorFile.StorageKey) : null;
            if (prior.LabFastqSetId != set.Id || prior.UserId != actor.User.Id || priorAddress is null || priorAddress.Key != input.Key || priorAddress.ETag != input.ETag
                || prior.GroupNumber != input.GroupNumber || prior.ReadNumber != input.ReadNumber || prior.PartNumber != input.PartNumber
                || prior.GroupDescription != input.GroupDescription.Trim())
                throw Conflict("fastq_s3_mapping_changed", "This registration identity has different original files or mapping.");
            return FastqUploadPublic(prior);
        }
        var snapshot = await source.CaptureAsync(scope.Directory, input.Key, input.ETag, Math.Min(policy.MaximumFileBytes, scanning.Value.MaximumStreamBytes), ct);
        var gzip = snapshot.FileName.EndsWith(".fastq.gz", StringComparison.OrdinalIgnoreCase) || snapshot.FileName.EndsWith(".fq.gz", StringComparison.OrdinalIgnoreCase);
        var plain = snapshot.FileName.EndsWith(".fastq", StringComparison.OrdinalIgnoreCase) || snapshot.FileName.EndsWith(".fq", StringComparison.OrdinalIgnoreCase);
        if (!(gzip || plain) || !policy.AllowedCompression.Contains(gzip ? "Gzip" : "None"))
            throw Invalid("fastq_s3_format_invalid", "Choose a FASTQ file in an allowed compression format.");
        var storageKey = snapshot.Address.ToStorageKey();
        var siblings = await dbContext.Set<LabFastqUpload>().Where(u => u.LabFastqSetId == set.Id).ToListAsync(ct);
        if (siblings.Count >= policy.MaximumFilesPerSet || siblings.Sum(u => u.SizeBytes) > policy.MaximumFileSetBytes - snapshot.SizeBytes
            || siblings.Any(u => u.GroupNumber == input.GroupNumber && u.ReadNumber == input.ReadNumber && u.PartNumber == input.PartNumber))
            throw Conflict("fastq_set_limit", "This file set exceeds its limit or already contains that read/group/part.");
        var verified = await ScientificS3Access.ReadAsync(snapshot, storage, ct);
        await using var bytes = verified.Content;
        var validation = await LabFastqValidation.ValidateAsync(bytes, gzip, input.ReadNumber, policy, ct);
        if ((await scanner.ScanAsync(storageKey, ct)).Status != OperationalFileScanStatus.Clean)
            throw Conflict("fastq_scan_required", "The original S3 FASTQ could not pass scanning. No input was admitted.");
        var file = await dbContext.LabScientificFiles.SingleOrDefaultAsync(f => f.StorageKey == storageKey, ct);
        if (file is not null && (file.LabWorkOrderId != set.LabWorkOrderId || file.LabSpecimenId != set.LabSpecimenId
            || !string.Equals(file.Sha256, verified.Sha256, StringComparison.OrdinalIgnoreCase) || file.SizeBytes != snapshot.SizeBytes)) throw Conflict("fastq_s3_identity_conflict", "The original file conflicts with its retained receipt.");
        if (file is null) { file = new LabScientificFile(set.LabWorkOrderId, set.LabSpecimenId, snapshot.FileName, storageKey, verified.Sha256, snapshot.SizeBytes, actor.User.Id, DateTime.UtcNow); dbContext.Add(file); }
        if (siblings.Any(u => u.LabScientificFileId == file.Id)) throw Conflict("fastq_s3_duplicate", "This original file is already mapped in the file set.");
        var library = await dbContext.LabLibraries.AsNoTracking().SingleAsync(l => l.Id == set.LabLibraryId, ct);
        var canonical = $"{library.LibraryKey}__{set.Id:N}__F{set.SetVersion:000}__G{input.GroupNumber:000}__R{input.ReadNumber}__P{input.PartNumber:000}.fastq{(gzip ? ".gz" : "")}";
        var upload = new LabFastqUpload(input.Id, set.Id, snapshot.FileName, canonical, input.GroupNumber, input.ReadNumber,
            input.PartNumber, input.GroupDescription.Trim(), snapshot.SizeBytes, ChunkFingerprint([verified.Sha256]), actor.User.Id, scope.Draft.ExpiresAtUtc);
        upload.Complete(file.Id, validation.ReadCount, validation.ReadIdentifiersSha256); dbContext.Add(upload);
        dbContext.LabWorkEvents.Add(new LabWorkEvent(set.LabWorkOrderId, set.LabSpecimenId, "FastqS3FileVerified", DateTime.UtcNow, actor.User.Id,
            JsonSerializer.Serialize(new { setId, uploadId = upload.Id, fileId = file.Id, file.FileName, file.Sha256, file.SizeBytes, validation.ReadCount, source = snapshot.Address }, JsonOptions)));
        await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
        return FastqUploadPublic(upload);
    }
}
