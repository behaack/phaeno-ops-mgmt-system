namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/investigation/attachments/{recordId:guid}/{role}")]
    public async Task<IActionResult> DownloadInvestigationAttachment(Guid workOrderId, Guid specimenId, Guid recordId,
        string role, [FromServices] IOperationalFileStorage storage, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct,
            LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        if (role is not ("preparationReport" or "qcReport")) throw Missing();
        // A shared batch membership alone is insufficient: this sample must have been covered by this exact record.
        var executions = await dbContext.LabProtocolExecutions.AsNoTracking()
            .Where(x => x.LabWorkOrderId == workOrderId && x.LabSpecimenId == specimenId)
            .Select(x => x.CapturedResultsJson).Take(10001).ToListAsync(ct);
        if (executions.Count > 10000) throw Conflict("attachment_history_limit", "This sample exceeds the supported attachment lookup size.");
        if (!executions.Any(json => LabProtocolEvidence.Read(json).Records.Any(x => x.PreparationRecordId == recordId))) throw Missing();
        var record = await dbContext.LabPreparationRecords.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == recordId && x.Action == "step", ct) ?? throw Missing();
        using var details = JsonDocument.Parse(record.DetailsJson);
        if (!details.RootElement.TryGetProperty(role, out var attachment)) throw Missing();
        var report = attachment.Deserialize<PreparationQcReport>(JsonOptions) ?? throw Missing();
        var bytes = await ReadVerifiedPreparationReportAsync(report, storage, ct);
        // Records authorization and verified download admission, not successful receipt by the browser.
        dbContext.LabWorkEvents.Add(new LabWorkEvent(workOrderId, specimenId, "InvestigationAttachmentDownloadRequested",
            LabEvidenceTime.UtcNow, actor.User.Id, JsonSerializer.Serialize(new { recordId, role, report.FileName, report.Sha256, report.SizeBytes }, JsonOptions)));
        await dbContext.SaveChangesAsync(ct);
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers["X-Content-SHA256"] = report.Sha256;
        return File(bytes, "application/pdf", report.FileName);
    }

    private static async Task<byte[]> ReadVerifiedPreparationReportAsync(PreparationQcReport report, IOperationalFileStorage storage, CancellationToken ct)
    {
        if (report.ScanStatus != "Clean") throw Conflict("qc_report_unavailable", "This report has not passed scanning and cannot be downloaded.");
        if (report.SizeBytes is < 5 or > MaximumQcReportBytes)
            throw Conflict("qc_report_integrity_failed", "The report metadata is invalid. Investigate the original attachment.");
        await using var content = await storage.OpenReadAsync(report.StorageKey, ct);
        // Read exactly the declared bounded size, then check for extra bytes. Never serve an unverified prefix.
        var bytes = new byte[(int)report.SizeBytes];
        try { await content.ReadExactlyAsync(bytes, ct); }
        catch (EndOfStreamException) { throw Conflict("qc_report_integrity_failed", "The stored report does not match its recorded size. Investigate the original attachment."); }
        if (await content.ReadAsync(new byte[1], ct) != 0 || !bytes.AsSpan(0, 5).SequenceEqual("%PDF-"u8)
            || !string.Equals(Convert.ToHexString(SHA256.HashData(bytes)), report.Sha256, StringComparison.OrdinalIgnoreCase))
            throw Conflict("qc_report_integrity_failed", "The stored report does not match its recorded checksum. Investigate the original attachment.");
        return bytes;
    }
}
