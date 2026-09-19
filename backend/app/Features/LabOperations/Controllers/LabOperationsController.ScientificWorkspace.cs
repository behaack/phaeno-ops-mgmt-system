namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence")]
    public async Task<object> ScientificEvidence(Guid workOrderId, Guid specimenId, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var work = await RequireWorkOrderAsync(workOrderId, ct);
        var specimen = await RequireSpecimenAsync(workOrderId, specimenId, ct);
        var libraries = await (from library in dbContext.LabLibraries.AsNoTracking()
            join container in dbContext.LabContainers on library.LibraryContainerId equals container.Id
            join execution in dbContext.LabProtocolExecutions on library.PreparationExecutionId equals execution.Id
            where library.LabWorkOrderId == workOrderId && library.LabSpecimenId == specimenId
            orderby library.LibraryKey, library.Id
            select new { library.Id, library.LibraryKey, container.Barcode, library.Status, execution.LabSpecimenAttemptId }).Take(1001).ToListAsync(ct);
        var outputs = await dbContext.LabSequencingOutputs.AsNoTracking().Where(o => o.LabWorkOrderId == workOrderId && o.LabSpecimenId == specimenId)
            .OrderBy(o => o.RecordedAtUtc).ThenBy(o => o.Id).Take(1001).ToListAsync(ct);
        var analyses = await dbContext.LabAnalysisRuns.AsNoTracking().Where(o => o.LabWorkOrderId == workOrderId && o.LabSpecimenId == specimenId)
            .OrderBy(o => o.RecordedAtUtc).ThenBy(o => o.Id).Take(1001).ToListAsync(ct);
        if (libraries.Count > 1000 || outputs.Count > 1000 || analyses.Count > 1000)
            throw Conflict("scientific_history_limit", "The sample exceeds the supported scientific workspace size. Contact an administrator before recording more evidence.");
        var ids = analyses.Select(a => a.Id).ToArray();
        var inputs = await dbContext.LabAnalysisInputs.AsNoTracking().Where(i => ids.Contains(i.LabAnalysisRunId))
            .Select(i => new { i.LabAnalysisRunId, i.LabSequencingOutputId }).ToListAsync(ct);
        var commercialSample = await dbContext.LabSamples.AsNoTracking().Where(s => s.Id == specimen.SubmittedSpecimenId && s.LabServiceOrderId == work.AuthorizationSourceId)
            .Select(s => new { s.Status }).SingleOrDefaultAsync(ct);
        return new { specimenId, workOrderId, specimen.AccessionNumber, libraries, outputs, analyses, inputs,
            canRecord = actor.HasAny(LabRole.Operator, LabRole.Supervisor) && work.Status is not (LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled),
            canManualUpload = actor.IsPlatformAdmin && traceabilityOptions?.Value.GovernedPSeqResults != true && commercialSample != null
                && commercialSample.Status is PhaenoPortal.App.Features.OrderManagement.Domain.LabSampleStatus.DataProcessing or PhaenoPortal.App.Features.OrderManagement.Domain.LabSampleStatus.DataAvailable,
            governedResults = traceabilityOptions?.Value.GovernedPSeqResults == true,
            orderId = work.AuthorizationSourceId, submittedSampleId = specimen.SubmittedSpecimenId };
    }

    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/scientific-evidence/sendouts")]
    public async Task<object> ScientificSendouts(Guid workOrderId, Guid specimenId, [FromQuery] Guid libraryId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, specimenId, ct);
        var library = await dbContext.LabLibraries.AsNoTracking().SingleOrDefaultAsync(l => l.Id == libraryId && l.LabWorkOrderId == workOrderId && l.LabSpecimenId == specimenId, ct)
            ?? throw Conflict("library_scope_invalid", "Choose a library belonging to this sample.");
        var barcode = await dbContext.LabContainers.Where(c => c.Id == library.LibraryContainerId).Select(c => c.Barcode).SingleAsync(ct);
        var needle = JsonSerializer.Serialize(new { members = new[] { new { libraryId } } });
        var rows = await dbContext.LabNgsSendouts.AsNoTracking().Where(s => EF.Functions.JsonContains(s.ManifestJson, needle)
                && s.Status != LabNgsSendoutStatus.Preparing && s.Status != LabNgsSendoutStatus.Exception)
            .OrderBy(s => s.CreatedAt).ThenBy(s => s.Id).Take(1001).ToListAsync(ct);
        if (rows.Count > 1000) throw Conflict("sendout_history_limit", "Too many matching sendouts to show safely.");
        return rows.Where(s => {
            using var json = JsonDocument.Parse(s.ManifestJson);
            var members = json.RootElement.GetProperty("members").EnumerateArray().Where(m => m.TryGetProperty("libraryId", out var id) && id.TryGetGuid(out var value) && value == libraryId).ToArray();
            return members.Length == 1 && members[0].TryGetProperty("libraryKey", out var key) && key.GetString() == library.LibraryKey
                && members[0].TryGetProperty("containerBarcode", out var tube) && tube.GetString() == barcode;
        }).Select(s => new { s.Id, s.ProviderName, s.ProviderReference, s.Status, s.ShippedAtUtc, s.ProviderReceivedAtUtc }).ToArray();
    }
}
