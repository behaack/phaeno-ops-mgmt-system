namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpPost("pseq-results/sequencing-outputs")]
    public async Task<LabSequencingOutput> RegisterSequencingOutput([FromBody] RegisterSequencingOutputRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        return await new LabResultLineageService(dbContext).RegisterOutputAsync(request, actor.User.Id, "lab-staff", ct);
    }

    [HttpPost("pseq-results/analysis-runs")]
    public async Task<LabAnalysisRun> RegisterAnalysisRun([FromBody] RegisterAnalysisRunRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        return await new LabResultLineageService(dbContext).RegisterAnalysisAsync(request, actor.User.Id, "lab-staff", ct, traceabilityOptions?.Value.RequireScientificEvidence ?? true);
    }

    [HttpGet("work-orders/{workOrderId:guid}/specimens/{specimenId:guid}/results/{resultId:guid}/lineage")]
    public async Task<LabResultLineageDto> ResultLineage(Guid workOrderId, Guid specimenId, Guid resultId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor,
            LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var work = await RequireWorkOrderAsync(workOrderId, ct);
        var specimen = await RequireSpecimenAsync(work.Id, specimenId, ct);
        var package = await dbContext.ResultOutputPackages.AsNoTracking().SingleOrDefaultAsync(x => x.Id == resultId
            && x.LabWorkOrderId == work.Id && x.OrganizationId == work.SubmittingOrganizationId
            && (x.LabSampleId == specimen.SubmittedSpecimenId || x.TrialSampleId == specimen.SubmittedSpecimenId), ct);
        Guid? runId;
        IReadOnlyList<object> artifacts;
        var artifactsComplete = false;
        var kind = "package";
        if (package is not null)
        {
            runId = package.LabAnalysisRunId;
            var files = await dbContext.ResultArtifacts.AsNoTracking().Where(x => x.ResultOutputPackageId == package.Id)
                .OrderBy(x => x.FileName).Select(x => new { x.Id, x.FileName, x.Sha256, x.SizeBytes, x.ResultLocator, x.DeletedAtUtc }).ToListAsync(ct);
            artifactsComplete = files.Count == package.ExpectedArtifactCount && files.All(x => !string.IsNullOrWhiteSpace(x.ResultLocator));
            artifacts = files.Cast<object>().ToArray();
        }
        else
        {
            var release = await dbContext.LabResultReleases.AsNoTracking().SingleOrDefaultAsync(x => x.Id == resultId
                && x.OrganizationId == work.SubmittingOrganizationId && x.LabSampleId == specimen.SubmittedSpecimenId, ct) ?? throw Missing();
            runId = release.LabAnalysisRunId; kind = "legacy-release";
            artifacts = [new { release.ManifestJson, release.ResultLocator }];
            artifactsComplete = !string.IsNullOrWhiteSpace(release.ResultLocator);
        }
        if (!runId.HasValue) return new(resultId, kind, "LegacyUnknown", null, specimen.Id, null, null, null, null, [], artifacts);
        var run = await dbContext.LabAnalysisRuns.AsNoTracking().SingleOrDefaultAsync(x => x.Id == runId
            && x.LabWorkOrderId == work.Id && x.LabSpecimenId == specimen.Id, ct) ?? throw Missing();
        var inputs = await (from input in dbContext.LabAnalysisInputs.AsNoTracking()
            join output in dbContext.LabSequencingOutputs.AsNoTracking() on input.LabSequencingOutputId equals output.Id
            where input.LabAnalysisRunId == run.Id
            orderby output.Id select output).ToListAsync(ct);
        var sourceIds = inputs.Select(x => x.SourceContainerId).Distinct().ToArray();
        if (inputs.Count == 0 || sourceIds.Length != 1 || inputs.Any(x => x.LabSpecimenAttemptId != run.LabSpecimenAttemptId
            || x.LabWorkOrderId != work.Id || x.LabSpecimenId != specimen.Id))
            throw Conflict("result_lineage_incomplete", "The saved lineage is incomplete or conflicting; it cannot be reported as complete.");
        using var snapshot = System.Text.Json.JsonDocument.Parse(inputs[0].LineageSnapshotJson);
        return new(resultId, kind, artifactsComplete ? "Captured" : "PendingArtifacts", run.Id, specimen.Id, run.LabSpecimenAttemptId, sourceIds[0],
            snapshot.RootElement.GetProperty("sourceBarcode").GetString(), run, inputs.Cast<object>().ToArray(), artifacts);
    }
}
