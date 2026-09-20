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
    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/files")]
    public async Task<object> ScientificFiles(Guid workOrderId, Guid specimenId,
        [FromServices] IOptions<FileScanningOptions> scanOptions, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        var files = await dbContext.LabScientificFiles.AsNoTracking()
            .Where(f => f.LabWorkOrderId == workOrderId && f.LabSpecimenId == specimenId)
            .OrderByDescending(f => f.RecordedAtUtc).ThenBy(f => f.Id).Take(1001).ToListAsync(ct);
        if (files.Count > 1000) throw Conflict("scientific_files_limit", "This sample has too many uploaded files for this workspace. Contact an administrator.");
        return new { maximumBytes = ScientificUploadLimit(scanOptions.Value), files = files.Select(LabScientificFiles.Public) };
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/files")]
    [Consumes("application/octet-stream")]
    [RequestSizeLimit(LabScientificFiles.MaximumBytes)]
    public async Task<object> UploadScientificFile(Guid workOrderId, Guid specimenId, [FromQuery] string fileName,
        [FromServices] IOperationalFileStorage storage, [FromServices] IOperationalFileScanner scanner,
        [FromServices] IOptions<FileScanningOptions> scanOptions, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var work = await RequireWorkOrderAsync(workOrderId, ct);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        if (work.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled)
            throw Conflict("scientific_upload_unavailable", "Resolve the job hold or cancellation before uploading scientific evidence.");
        var name = Path.GetFileName((fileName ?? "").Replace('\\', '/'));
        if (name.Length is < 1 or > 255 || name.Any(char.IsControl))
            throw Invalid("scientific_filename_invalid", "Choose a file with a valid name of at most 255 characters.");
        var limit = ScientificUploadLimit(scanOptions.Value);
        if (Request.ContentLength is <= 0 || Request.ContentLength > limit)
            throw Invalid("scientific_file_size_invalid", $"Choose a nonempty file no larger than {limit / 1024 / 1024} MiB.");
        var stored = await storage.SaveAsync(Request.Body, ".bin", limit, ct);
        var saveAttempted = false;
        try
        {
            if (stored.SizeBytes <= 0 || Request.ContentLength.HasValue && stored.SizeBytes != Request.ContentLength)
                throw Invalid("scientific_file_incomplete", "The file upload was incomplete. Choose the file again.");
            var scan = await scanner.ScanAsync(stored.StorageKey, ct);
            if (scan.Status != OperationalFileScanStatus.Clean)
                throw Conflict("scientific_file_scan_required", "The file could not pass scanning. Choose another file or retry when scanning is available.");
            await using (var verified = await LabScientificFiles.OpenVerifiedAsync(storage, stored.StorageKey, stored.Sha256, stored.SizeBytes, ct)) { }
            var file = new LabScientificFile(workOrderId, specimenId, name, stored.StorageKey, stored.Sha256, stored.SizeBytes, actor.User.Id, DateTime.UtcNow);
            dbContext.LabScientificFiles.Add(file);
            dbContext.LabWorkEvents.Add(new LabWorkEvent(workOrderId, specimenId, "ScientificFileUploaded", DateTime.UtcNow,
                actor.User.Id, JsonSerializer.Serialize(LabScientificFiles.Public(file), JsonOptions)));
            // An uncertain database acknowledgement must never erase possibly committed evidence.
            saveAttempted = true;
            await dbContext.SaveChangesAsync(ct);
            return LabScientificFiles.Public(file);
        }
        catch
        {
            if (!saveAttempted) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None);
            throw;
        }
    }

    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/files/{fileId:guid}")]
    public async Task<IActionResult> DownloadScientificFile(Guid workOrderId, Guid specimenId, Guid fileId,
        [FromServices] IOperationalFileStorage storage, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        var file = await dbContext.LabScientificFiles.AsNoTracking().SingleOrDefaultAsync(
            f => f.Id == fileId && f.LabWorkOrderId == workOrderId && f.LabSpecimenId == specimenId, ct) ?? throw Missing();
        var content = await LabScientificFiles.OpenVerifiedAsync(storage, file.StorageKey, file.Sha256, file.SizeBytes, ct);
        try
        {
            dbContext.LabWorkEvents.Add(new LabWorkEvent(workOrderId, specimenId, "ScientificFileDownloadRequested", DateTime.UtcNow,
                actor.User.Id, JsonSerializer.Serialize(new { file.Id, file.FileName, file.Sha256, file.SizeBytes }, JsonOptions)));
            await dbContext.SaveChangesAsync(ct);
            Response.Headers.CacheControl = "no-store";
            Response.Headers["X-Content-Type-Options"] = "nosniff";
            Response.Headers["X-Content-SHA256"] = file.Sha256;
            return File(content, "application/octet-stream", file.FileName);
        }
        catch { await content.DisposeAsync(); throw; }
    }

    private static long ScientificUploadLimit(FileScanningOptions options) =>
        Math.Clamp(options.MaximumStreamBytes, 1, LabScientificFiles.MaximumBytes);
}
