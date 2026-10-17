namespace PhaenoPortal.App.Features.Research;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Laboratory.Research;

public sealed partial class ResearchController
{
    private const long AttachmentMaximum = 100 * 1024 * 1024;
    [HttpGet("attachments/options")]
    public async Task<object> AttachmentOptions([FromServices] IOptions<FileScanningOptions> options, CancellationToken ct)
    { await Actor(ct); return new { maximumBytes = Math.Clamp(options.Value.MaximumStreamBytes, 1, AttachmentMaximum) }; }

    [HttpPost("experiments/{id:guid}/entries/{entryId:guid}/attachments")]
    [Consumes("application/octet-stream"), RequestSizeLimit(AttachmentMaximum)]
    public async Task<object> Upload(Guid id, Guid entryId, [FromQuery] string fileName,
        [FromServices] IOperationalFileStorage storage, [FromServices] IOperationalFileScanner scanner,
        [FromServices] IOptions<FileScanningOptions> options, CancellationToken ct)
    {
        var actor = await Actor(ct); var experiment = await Experiment(id, actor.OrganizationId, ct); Apply(experiment.RequireActive);
        await Entry(entryId, id, actor.OrganizationId, ct);
        var maximum = Math.Clamp(options.Value.MaximumStreamBytes, 1, AttachmentMaximum);
        var name = Path.GetFileName((fileName ?? "").Replace('\\', '/'));
        if (name.Length is < 1 or > 255 || name.Any(char.IsControl) || Request.ContentLength is <= 0 || Request.ContentLength > maximum)
            throw new OrderManagementException("research_file_invalid", "Choose a nonempty file within the displayed upload limit.", 400);
        var stored = await storage.SaveScopedAsync(Request.Body, ".bin", maximum, $"research/{actor.OrganizationId:N}/{id:N}/{entryId:N}", ct);
        var saving = false;
        try
        {
            if (stored.SizeBytes == 0 || Request.ContentLength.HasValue && Request.ContentLength != stored.SizeBytes)
                throw new OrderManagementException("research_upload_incomplete", "The upload was incomplete. Keep your notes and retry the file.", 400);
            var scan = await scanner.ScanAsync(stored.StorageKey, ct);
            if (scan.Status != OperationalFileScanStatus.Clean)
                throw new OrderManagementException("research_scan_required", "The file must pass scanning before it can be attached. " + scan.Message, 409);
            var contentType = "application/octet-stream";
            if (stored.SizeBytes <= 10 * 1024 * 1024)
            {
                await using var verified = await LabScientificFiles.OpenVerifiedAsync(storage, stored.StorageKey, stored.Sha256, stored.SizeBytes, ct, maximum);
                using var bytes = new MemoryStream(); await verified.CopyToAsync(bytes, ct);
                try { contentType = LabOperationsController.IllustrationContentType(bytes.ToArray()); }
                catch (OrderManagementException) { /* Other file formats remain authenticated downloads. */ }
            }
            // Recheck after a long upload/scan; no experiment write is implied by a receipt.
            await db.Entry(experiment).ReloadAsync(ct); Apply(experiment.RequireActive);
            var receipt = new ResearchAttachment(actor.OrganizationId, id, entryId, name, contentType,
                stored.StorageKey, stored.Sha256, stored.SizeBytes, actor.UserId);
            db.Add(receipt); saving = true; await Save(ct); return AttachmentData(receipt);
        }
        catch { if (!saving) await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None); throw; }
    }
    private static object AttachmentData(ResearchAttachment f) => new { f.Id, f.ResearchEntryId, f.FileName, f.ContentType, f.SizeBytes, f.Sha256, f.RecordedAtUtc };
    [HttpGet("experiments/{id:guid}/entries/{entryId:guid}/attachments")]
    public async Task<object> Attachments(Guid id, Guid entryId, CancellationToken ct)
    {
        var actor = await Actor(ct); await Entry(entryId, id, actor.OrganizationId, ct);
        var files = await db.Set<ResearchAttachment>().AsNoTracking().Where(f => f.OrganizationId == actor.OrganizationId && f.ResearchExperimentId == id && f.ResearchEntryId == entryId)
            .OrderBy(f => f.RecordedAtUtc).ThenBy(f => f.Id).ToListAsync(ct);
        return files.Select(AttachmentData);
    }
    [HttpGet("attachments/{id:guid}")]
    public async Task<IActionResult> Download(Guid id, [FromQuery] bool preview, [FromServices] IOperationalFileStorage storage, CancellationToken ct)
    {
        var actor = await Actor(ct);
        var file = await db.Set<ResearchAttachment>().AsNoTracking().SingleOrDefaultAsync(f => f.Id == id && f.OrganizationId == actor.OrganizationId, ct) ?? throw Missing();
        var stream = await LabScientificFiles.OpenVerifiedAsync(storage, file.StorageKey, file.Sha256, file.SizeBytes, ct, AttachmentMaximum);
        Response.Headers.CacheControl = "no-store"; Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers["Content-Security-Policy"] = "default-src 'none'; sandbox";
        return preview && file.ContentType is "image/png" or "image/jpeg" or "image/webp"
            ? File(stream, file.ContentType) : File(stream, "application/octet-stream", file.FileName);
    }
}
