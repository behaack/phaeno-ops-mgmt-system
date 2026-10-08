namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Data;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/investigation")]
    public async Task<LabInvestigationDto> Investigation(Guid workOrderId, Guid specimenId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        return await new LabInvestigationService(dbContext).ReadAsync(workOrderId, specimenId, ct);
    }

    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/investigation/reports")]
    public async Task<object> InvestigationReports(Guid workOrderId, Guid specimenId, CancellationToken ct, [FromQuery] int page = 0)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        return await dbContext.LabInvestigationReports.AsNoTracking().Where(x => x.LabWorkOrderId == workOrderId && x.LabSpecimenId == specimenId)
            .OrderByDescending(x => x.GeneratedAtUtc).ThenBy(x => x.Id).Skip(Math.Clamp(page, 0, 10000) * 25).Take(26)
            .Select(x => new { x.Id, x.GeneratedAtUtc, x.GeneratedByUserId, x.FormatVersion, x.Sha256 }).ToListAsync(ct);
    }

    [HttpPost("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/investigation/reports")]
    public async Task<object> GenerateInvestigationReport(Guid workOrderId, Guid specimenId, GenerateLabInvestigationReportRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        if (request.RequestId == Guid.Empty) throw Conflict("report_identity_required", "A report request identity is required.");
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct) : null;
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        var report = await dbContext.LabInvestigationReports.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.RequestId, ct);
        if (report is not null && (report.LabWorkOrderId != workOrderId || report.LabSpecimenId != specimenId || report.GeneratedByUserId != actor.User.Id))
            throw Conflict("report_identity_conflict", "This request identity was already used for a different report.");
        if (report is null)
        {
            var snapshot = await new LabInvestigationService(dbContext).ReadAsync(workOrderId, specimenId, ct, 10000);
            if (snapshot.LimitedSections.Count > 0) throw Conflict("report_history_limit", "This sample exceeds the supported report size. Do not use a partial report as its complete history.");
            var now = LabEvidenceTime.UtcNow;
            var reportOptions = new JsonSerializerOptions(JsonOptions);
            reportOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
            var body = JsonSerializer.Serialize(new { formatVersion = 1, reportId = request.RequestId,
                generatedAtUtc = now, generatedByUserId = actor.User.Id,
                purpose = "Internal investigation evidence; not certification of scientific validity.", snapshot }, reportOptions);
            report = new LabInvestigationReport(request.RequestId, workOrderId, specimenId, actor.User.Id, now, body);
            dbContext.LabInvestigationReports.Add(report);
            dbContext.LabWorkEvents.Add(new LabWorkEvent(workOrderId, specimenId, "InvestigationReportGenerated", now, actor.User.Id,
                JsonSerializer.Serialize(new { reportId = report.Id, report.Sha256 }, JsonOptions)));
            try { await dbContext.SaveChangesAsync(ct); }
            catch (DbUpdateException e) when (e.InnerException is Npgsql.PostgresException { SqlState: "23505" or "40001" })
            { throw Conflict("report_concurrent_capture", "The report was recorded concurrently. Retry the same request to retrieve the saved report."); }
        }
        if (transaction is not null) await transaction.CommitAsync(ct);
        return new { report.Id, report.GeneratedAtUtc, report.GeneratedByUserId, report.FormatVersion, report.Sha256 };
    }

    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/investigation/reports/{reportId:guid}")]
    public async Task<IActionResult> DownloadInvestigationReport(Guid workOrderId, Guid specimenId, Guid reportId, CancellationToken ct, [FromQuery] string format = "json")
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        if (format is not ("json" or "html")) throw Conflict("report_format_invalid", "Choose a readable report or evidence manifest.");
        var report = await dbContext.LabInvestigationReports.AsNoTracking().SingleOrDefaultAsync(x => x.Id == reportId && x.LabWorkOrderId == workOrderId && x.LabSpecimenId == specimenId, ct) ?? throw Missing();
        if (!report.HasValidChecksum()) throw Conflict("report_integrity_failed", "The saved investigation report does not match its recorded checksum. Investigate the stored report before using it.");
        dbContext.LabWorkEvents.Add(new LabWorkEvent(workOrderId, specimenId, "InvestigationReportDownloaded", DateTime.UtcNow, actor.User.Id,
            JsonSerializer.Serialize(new { reportId, report.Sha256, format }, JsonOptions)));
        await dbContext.SaveChangesAsync(ct);
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Content-SHA256"] = report.Sha256;
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        if (format == "html") return File(Encoding.UTF8.GetBytes(LabInvestigationReportRenderer.Html(report)), "text/html", $"sample-investigation-{report.Id}.html");
        return File(Encoding.UTF8.GetBytes(report.BodyJson), "application/json", $"sample-investigation-{report.Id}.json");
    }

    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/investigation/events")]
    public async Task<object> InvestigationEvents(Guid workOrderId, Guid specimenId, CancellationToken ct,
        [FromQuery] DateTime? through = null, [FromQuery] DateTime? before = null, [FromQuery] Guid? beforeId = null)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        var boundary = through ?? LabEvidenceTime.UtcNow;
        if (boundary.Kind != DateTimeKind.Utc || before.HasValue && (before.Value.Kind != DateTimeKind.Utc || !beforeId.HasValue))
            throw Conflict("history_cursor_invalid", "Use the history cursor returned with the previous page.");
        var query = dbContext.LabWorkEvents.AsNoTracking().Where(x => x.LabWorkOrderId == workOrderId && x.LabSpecimenId == specimenId && x.OccurredAtUtc <= boundary);
        if (before.HasValue)
        {
            var cursorTime = before.Value; var cursorId = beforeId!.Value;
            query = query.Where(x => x.OccurredAtUtc < cursorTime || x.OccurredAtUtc == cursorTime && x.Id.CompareTo(cursorId) < 0);
        }
        var rows = await query.OrderByDescending(x => x.OccurredAtUtc).ThenByDescending(x => x.Id).Take(51).ToListAsync(ct);
        var more = rows.Count > 50;
        if (more) rows.RemoveAt(50);
        return new { through = boundary, rows, next = more ? new { before = rows[^1].OccurredAtUtc, beforeId = rows[^1].Id } : null };
    }

    [HttpGet("work-orders/{workOrderId:guid}/investigation/related-samples")]
    public async Task<object> RelatedInvestigationSamples(Guid workOrderId, [FromQuery] string kind, [FromQuery] string reference, CancellationToken ct, [FromQuery] int page = 0)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var work = await RequireWorkOrderAsync(workOrderId, ct);
        if (string.IsNullOrWhiteSpace(reference) || reference.Trim().Length > 255) throw Conflict("reference_required", "Enter an exact reference of at most 255 characters.");
        reference = reference.Trim();
        // Explicit organization boundary applies before projection, paging or names. Authorization above requires active internal Lab staff.
        var permittedWorkIds = dbContext.LabWorkOrders.Where(x => x.SubmittingOrganizationId == work.SubmittingOrganizationId).Select(x => x.Id);
        var permittedSpecimens = dbContext.LabSpecimens.Where(x => permittedWorkIds.Contains(x.LabWorkOrderId));
        IQueryable<Guid> specimens = kind switch
        {
            "tube" => dbContext.LabContainers.Where(x => permittedWorkIds.Contains(x.LabWorkOrderId) && x.Barcode == reference && x.LabSpecimenId.HasValue).Select(x => x.LabSpecimenId!.Value),
            "lot" => from use in dbContext.LabMaterialConsumptions join lot in dbContext.LabMaterialLots on use.LabMaterialLotId equals lot.Id
                join execution in dbContext.LabProtocolExecutions on use.LabProtocolExecutionId equals execution.Id where permittedWorkIds.Contains(execution.LabWorkOrderId) && lot.LotNumber == reference && execution.LabSpecimenId.HasValue select execution.LabSpecimenId!.Value,
            "equipment" => from use in dbContext.LabEquipmentUsages join asset in dbContext.LabEquipment on use.LabEquipmentId equals asset.Id
                join execution in dbContext.LabProtocolExecutions on use.LabProtocolExecutionId equals execution.Id where permittedWorkIds.Contains(execution.LabWorkOrderId) && asset.AssetCode == reference && execution.LabSpecimenId.HasValue select execution.LabSpecimenId!.Value,
            "sequencing-run" => dbContext.LabSequencingOutputs.Where(x => permittedWorkIds.Contains(x.LabWorkOrderId) && x.ProviderRunReference == reference).Select(x => x.LabSpecimenId),
            "library" => dbContext.LabLibraries.Where(x => permittedWorkIds.Contains(x.LabWorkOrderId) && x.LibraryKey == reference).Select(x => x.LabSpecimenId),
            "preparation-batch" => from member in dbContext.LabPreparationMembers join batch in dbContext.LabPreparationBatches on member.LabPreparationBatchId equals batch.Id
                join attempt in dbContext.LabSpecimenAttempts on member.LabSpecimenAttemptId equals attempt.Id
                where permittedWorkIds.Contains(attempt.LabWorkOrderId) && batch.TrayBarcode == reference select attempt.LabSpecimenId,
            _ => throw Conflict("reference_kind_invalid", "Choose a tube, lot, equipment, sequencing run, library or preparation tray.")
        };
        return await permittedSpecimens.AsNoTracking().Where(x => specimens.Contains(x.Id)).OrderBy(x => x.Id)
            .Skip(Math.Clamp(page, 0, 10000) * 25).Take(26).Select(x => new { x.Id, x.LabWorkOrderId, x.AccessionNumber }).ToListAsync(ct);
    }
}
