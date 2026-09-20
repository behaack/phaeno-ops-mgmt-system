namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
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
    private const int ScientificChunkBytes = 4 * 1024 * 1024;
    public sealed record BeginScientificUpload(Guid Id, string FileName, long SizeBytes, string Sha256);
    private sealed record ScientificChunk(string Key, long SizeBytes, string Sha256);
    private static List<ScientificChunk> ReadChunks(LabScientificUpload upload) => JsonSerializer.Deserialize<List<ScientificChunk>>(upload.ChunksJson)!;
    private async Task<object> UploadState(LabScientificUpload upload, CancellationToken ct) => new
    {
        upload.Id, upload.FileName, upload.SizeBytes, upload.Sha256, upload.ExpiresAtUtc,
        chunkBytes = ScientificChunkBytes, receivedBytes = ReadChunks(upload).Sum(c => c.SizeBytes),
        file = upload.CompletedFileId is {} id
            ? LabScientificFiles.Public(await dbContext.LabScientificFiles.AsNoTracking().SingleAsync(f => f.Id == id, ct)) : null
    };

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/uploads")]
    public async Task<object> BeginScientificFileUpload(Guid workOrderId, Guid specimenId, BeginScientificUpload input,
        [FromServices] IOptions<FileScanningOptions> scanning, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        var work = await RequireWorkOrderAsync(workOrderId, ct);
        if (work.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled)
            throw Conflict("scientific_upload_unavailable", "Resolve the job hold or cancellation before uploading evidence.");
        var name = Path.GetFileName((input.FileName ?? "").Replace('\\', '/'));
        if (input.Id == Guid.Empty || name.Length is < 1 or > 255 || name.Any(char.IsControl)
            || input.SizeBytes <= 0 || input.SizeBytes > ScientificUploadLimit(scanning.Value)
            || input.Sha256 is null || input.Sha256.Length != 64 || !input.Sha256.All(Uri.IsHexDigit))
            throw Invalid("scientific_upload_invalid", "Choose a nonempty file within the displayed size limit.");
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "scientific-upload-actor:" + actor.User.Id, ct);
        await SampleShippingPackingData.LockAsync(dbContext, "scientific-upload:" + input.Id, ct);
        var upload = await dbContext.LabScientificUploads.SingleOrDefaultAsync(u => u.Id == input.Id, ct);
        if (upload is null)
        {
            if (await dbContext.LabScientificUploads.CountAsync(u => u.UserId == actor.User.Id && u.CompletedFileId == null && u.ExpiresAtUtc > DateTime.UtcNow, ct) >= 20)
                throw Conflict("scientific_upload_limit", "Finish existing uploads or wait for abandoned uploads to expire before starting another.");
            upload = new(input.Id, workOrderId, specimenId, actor.User.Id, name, input.SizeBytes, input.Sha256.ToUpperInvariant(), DateTime.UtcNow);
            dbContext.Add(upload); await dbContext.SaveChangesAsync(ct);
        }
        if (upload.UserId != actor.User.Id || upload.LabWorkOrderId != workOrderId || upload.LabSpecimenId != specimenId) throw Missing();
        if (upload.FileName != name || upload.SizeBytes != input.SizeBytes || !string.Equals(upload.Sha256, input.Sha256, StringComparison.OrdinalIgnoreCase))
            throw Conflict("scientific_upload_changed", "The selected file differs from the interrupted upload. Start a new upload.");
        if (upload.ExpiresAtUtc <= DateTime.UtcNow && upload.CompletedFileId is null)
            throw Conflict("scientific_upload_expired", "This interrupted upload expired. Start a new upload.");
        var result = await UploadState(upload, ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return result;
    }

    [HttpPut("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/uploads/{uploadId:guid}/chunks/{offset:long}")]
    [Consumes("application/octet-stream")]
    [RequestSizeLimit(ScientificChunkBytes)]
    public async Task<object> UploadScientificChunk(Guid workOrderId, Guid specimenId, Guid uploadId, long offset,
        [FromServices] IOperationalFileStorage storage, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "scientific-upload:" + uploadId, ct);
        var upload = await dbContext.LabScientificUploads.SingleOrDefaultAsync(u => u.Id == uploadId && u.UserId == actor.User.Id
            && u.LabWorkOrderId == workOrderId && u.LabSpecimenId == specimenId, ct) ?? throw Missing();
        if (upload.CompletedFileId is not null) return await UploadState(upload, ct);
        if (upload.ExpiresAtUtc <= DateTime.UtcNow) throw Conflict("scientific_upload_expired", "This upload expired. Start a new upload.");
        var chunks = ReadChunks(upload);
        var received = chunks.Sum(c => c.SizeBytes);
        if (offset < 0 || offset % ScientificChunkBytes != 0 || offset > received || offset >= upload.SizeBytes
            || Request.ContentLength != Math.Min(ScientificChunkBytes, upload.SizeBytes - offset))
            throw Conflict("scientific_upload_offset", "Resume from the last verified upload position.");
        var stored = await storage.SaveAsync(Request.Body, ".chunk", ScientificChunkBytes, ct);
        var saveAttempted = false;
        try
        {
            if (stored.SizeBytes != Request.ContentLength) throw Invalid("scientific_file_incomplete", "The upload chunk was interrupted.");
            if (offset < received)
            {
                var previous = chunks[(int)(offset / ScientificChunkBytes)];
                if (previous.Sha256 != stored.Sha256 || previous.SizeBytes != stored.SizeBytes)
                    throw Conflict("scientific_upload_changed", "The selected file does not match the uploaded portion.");
                await storage.DeleteIfExistsAsync(stored.StorageKey, ct);
            }
            else
            {
                chunks.Add(new(stored.StorageKey, stored.SizeBytes, stored.Sha256));
                upload.RecordChunks(JsonSerializer.Serialize(chunks));
                saveAttempted = true; await dbContext.SaveChangesAsync(ct);
            }
            var result = await UploadState(upload, ct);
            if (tx is not null) await tx.CommitAsync(ct);
            return result;
        }
        catch { if (!saveAttempted) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None); throw; }
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/uploads/{uploadId:guid}/complete")]
    public async Task<object> CompleteScientificFileUpload(Guid workOrderId, Guid specimenId, Guid uploadId,
        [FromServices] IOperationalFileStorage storage, [FromServices] IOperationalFileScanner scanner,
        [FromServices] IOptions<FileScanningOptions> scanning, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "scientific-upload:" + uploadId, ct);
        var upload = await dbContext.LabScientificUploads.SingleOrDefaultAsync(u => u.Id == uploadId && u.UserId == actor.User.Id
            && u.LabWorkOrderId == workOrderId && u.LabSpecimenId == specimenId, ct) ?? throw Missing();
        if (upload.CompletedFileId is not null) return await UploadState(upload, ct);
        var work = await RequireWorkOrderAsync(workOrderId, ct);
        if (work.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled)
            throw Conflict("scientific_upload_unavailable", "Resolve the job hold or cancellation before completing evidence uploads.");
        if (upload.ExpiresAtUtc <= DateTime.UtcNow || upload.SizeBytes > ScientificUploadLimit(scanning.Value))
            throw Conflict("scientific_upload_expired", "This upload expired or exceeds the current limit. Start a new upload.");
        var chunks = ReadChunks(upload);
        if (chunks.Sum(c => c.SizeBytes) != upload.SizeBytes) throw Conflict("scientific_file_incomplete", "Finish uploading before verifying this file.");
        var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.ReadWrite,
            Share = FileShare.None, Options = FileOptions.Asynchronous | FileOptions.DeleteOnClose };
        if (!OperatingSystem.IsWindows()) options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        await using var assembled = new FileStream(Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N") + ".scientific-upload"), options);
        foreach (var chunk in chunks)
        {
            await using var part = await LabScientificFiles.OpenVerifiedAsync(storage, chunk.Key, chunk.Sha256, chunk.SizeBytes, ct);
            await part.CopyToAsync(assembled, ct);
        }
        assembled.Position = 0;
        var hash = Convert.ToHexString(await SHA256.HashDataAsync(assembled, ct));
        if (hash != upload.Sha256) throw Conflict("scientific_upload_changed", "The complete file does not match the selected file's fingerprint.");
        assembled.Position = 0;
        var stored = await storage.SaveAsync(assembled, ".bin", upload.SizeBytes, ct);
        var saveAttempted = false;
        try
        {
            if (stored.SizeBytes != upload.SizeBytes || !string.Equals(stored.Sha256, hash, StringComparison.OrdinalIgnoreCase))
                throw Conflict("scientific_upload_changed", "The stored file does not match the verified upload.");
            if ((await scanner.ScanAsync(stored.StorageKey, ct)).Status != OperationalFileScanStatus.Clean)
                throw Conflict("scientific_file_scan_required", "The complete file could not pass scanning. Retry verification when scanning is available or choose another file.");
            await using (var verified = await LabScientificFiles.OpenVerifiedAsync(storage, stored.StorageKey, stored.Sha256, stored.SizeBytes, ct)) { }
            var file = new LabScientificFile(workOrderId, specimenId, upload.FileName, stored.StorageKey, stored.Sha256, stored.SizeBytes, actor.User.Id, DateTime.UtcNow);
            dbContext.Add(file); upload.Complete(file.Id);
            dbContext.LabWorkEvents.Add(new LabWorkEvent(workOrderId, specimenId, "ScientificFileUploaded", DateTime.UtcNow, actor.User.Id,
                JsonSerializer.Serialize(LabScientificFiles.Public(file), JsonOptions)));
            saveAttempted = true; await dbContext.SaveChangesAsync(ct);
            if (tx is not null) await tx.CommitAsync(ct);
            return await UploadState(upload, ct);
        }
        catch { if (!saveAttempted) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None); throw; }
    }
}
