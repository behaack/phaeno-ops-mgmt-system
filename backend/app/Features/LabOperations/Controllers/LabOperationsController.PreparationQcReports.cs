namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    private const long MaximumQcReportBytes = 10 * 1024 * 1024;
    private sealed record PreparationQcReport(string FileName, string ContentType, long SizeBytes, string Sha256, string StorageKey, string ScanStatus);

    [HttpPost("preparation/batches/{preparationBatchId:guid}/commands/with-report")]
    [HttpPost("preparation/batches/{preparationBatchId:guid}/commands/with-qc-report")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<object> ApplyPreparationWithQcReport(Guid preparationBatchId, [FromForm] string payload, [FromForm] IFormFile file,
        [FromServices] IOperationalFileStorage storage, [FromServices] IOperationalFileScanner scanner, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        LabPreparationCommand request;
        try { request = JsonSerializer.Deserialize<LabPreparationCommand>(payload, JsonOptions) ?? throw new JsonException(); }
        catch (JsonException) { throw Invalid("preparation_details_invalid", "Enter valid step evidence."); }
        if (request.Action != "step" || request.Step?.Outcome != "recorded")
            throw Invalid("qc_report_step_required", "Attach a report to a performed QC or preparation step.");
        var name = Path.GetFileName(file.FileName.Replace('\\', '/'));
        if (name.Length is < 1 or > 255 || name.Any(char.IsControl) || !string.Equals(Path.GetExtension(name), ".pdf", StringComparison.OrdinalIgnoreCase))
            throw Invalid("qc_report_type_invalid", "Choose a PDF report.");
        if (file.Length < 5 || file.Length > MaximumQcReportBytes)
            throw Invalid("qc_report_size_invalid", "Choose a nonempty PDF no larger than 10 MB.");
        await using var content = file.OpenReadStream();
        var header = new byte[5];
        await content.ReadExactlyAsync(header, ct);
        if (!header.AsSpan().SequenceEqual("%PDF-"u8)) throw Invalid("qc_report_type_invalid", "The selected file is not a PDF report.");
        content.Position = 0;
        var sha256 = Convert.ToHexString(await SHA256.HashDataAsync(content, ct)).ToLowerInvariant();
        var fingerprint = PreparationHash(new { name, file.Length, sha256 });
        return await ApplyPreparationCore(preparationBatchId, request, ct, fingerprint, async token =>
        {
            await using var bytes = file.OpenReadStream();
            var stored = await storage.SaveAsync(bytes, ".pdf", MaximumQcReportBytes, token);
            try
            {
                if (!string.Equals(stored.Sha256, sha256, StringComparison.OrdinalIgnoreCase) || stored.SizeBytes != file.Length)
                    throw Invalid("qc_report_changed", "The selected report changed. Select it again.");
                var scan = await scanner.ScanAsync(stored.StorageKey, token);
                if (scan.Status != OperationalFileScanStatus.Clean)
                    throw Conflict("qc_report_scan_required", "The report could not pass file scanning. Choose another report or try again when scanning is available.");
                return new PreparationQcReport(name, "application/pdf", stored.SizeBytes, stored.Sha256, stored.StorageKey, "Clean");
            }
            catch
            {
                await storage.DeleteIfExistsAsync(stored.StorageKey, CancellationToken.None);
                throw;
            }
        });
    }

    [HttpGet("preparation/batches/{preparationBatchId:guid}/records/{recordId:guid}/report")]
    [HttpGet("preparation/batches/{preparationBatchId:guid}/records/{recordId:guid}/qc-report")]
    public async Task<IActionResult> DownloadPreparationQcReport(Guid preparationBatchId, Guid recordId,
        [FromServices] IOperationalFileStorage storage, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        var record = await dbContext.LabPreparationRecords.AsNoTracking()
            .SingleOrDefaultAsync(r => r.Id == recordId && r.LabPreparationBatchId == preparationBatchId && r.Action == "step", ct) ?? throw Missing();
        using var details = JsonDocument.Parse(record.DetailsJson);
        if (!details.RootElement.TryGetProperty("qcReport", out var attachment)
            && !details.RootElement.TryGetProperty("preparationReport", out attachment)) throw Missing();
        var report = attachment.Deserialize<PreparationQcReport>(JsonOptions) ?? throw Missing();
        if (report.ScanStatus != "Clean") throw Conflict("qc_report_unavailable", "This report is unavailable for download.");
        var content = await storage.OpenReadAsync(report.StorageKey, ct);
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(content, "application/pdf", report.FileName);
    }

    private static JsonElement PublicPreparationDetails(string json)
    {
        var details = JsonNode.Parse(json)!.AsObject();
        if (details["qcReport"] is JsonObject report) report.Remove("storageKey");
        if (details["preparationReport"] is JsonObject preparationReport) preparationReport.Remove("storageKey");
        return JsonSerializer.SerializeToElement(details, JsonOptions);
    }
}
