namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class LabOperationsController
{
    public sealed record QcMeasurement(string Name, decimal Value, string Unit);
    public sealed record AssemblyQcRequest(Guid Id, long JobVersion, Guid PackageId, long PackageVersion,
        int PreviousReviewVersion, string Decision, string Note, Guid ReportFileId,
        IReadOnlyList<QcMeasurement> Measurements, bool CoversSequencingInputs);

    [HttpGet("assembly-jobs/{jobId:guid}/qc")]
    public async Task<object> AssemblyQcWorkspace(Guid jobId, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var job = await dbContext.Set<LabAssemblyJob>().AsNoTracking().SingleOrDefaultAsync(j => j.Id == jobId, ct) ?? throw Missing();
        var packages = await dbContext.ResultOutputPackages.AsNoTracking().Where(p => job.LabAnalysisRunId.HasValue && p.LabAnalysisRunId == job.LabAnalysisRunId && p.LabWorkOrderId == job.LabWorkOrderId)
            .OrderByDescending(p => p.PackageVersion).ToListAsync(ct);
        var packageIds = packages.Select(p => p.Id).ToArray();
        var reports = await (from qc in dbContext.Set<LabAssemblyQc>().AsNoTracking() join user in dbContext.Users on qc.RecordedByUserId equals user.Id
            join file in dbContext.LabScientificFiles on qc.LabScientificFileId equals file.Id
            where qc.LabAssemblyJobId == jobId orderby qc.RecordedAtUtc descending
            select new { qc.Id, qc.ResultOutputPackageId, qc.ReviewVersion, qc.Decision, qc.Note, qc.MeasurementsJson, qc.InputCoverageJson,
                qc.RecordedAtUtc, author = user.FirstName + " " + user.LastName, reportFileId = file.Id, reportFileName = file.FileName }).Take(1000).ToListAsync(ct);
        var artifacts = await dbContext.ResultArtifacts.AsNoTracking().Where(a => packageIds.Contains(a.ResultOutputPackageId)).ToListAsync(ct);
        return new { jobId, job.LabWorkOrderId, job.LabSpecimenId, job.Version, job.State, job.LabAnalysisRunId,
            canRecord = actor.HasAny(LabRole.Operator, LabRole.Supervisor) && job.State == "Succeeded" && job.LabAnalysisRunId.HasValue && job.AttentionReason == null,
            packages = packages.Select(p => new { p.Id, p.PackageVersion, p.Version, state = p.State.ToString(),
                artifacts = artifacts.Where(a => a.ResultOutputPackageId == p.Id).Select(a => new { a.Id, a.FileName, a.LogicalRole, a.SizeBytes, a.Sha256, scanState = a.ScanState.ToString() }) }),
            inputs = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json)!.Inputs,
            reviews = reports };
    }

    [HttpPost("assembly-jobs/{jobId:guid}/qc")]
    public async Task<object> RecordAssemblyQc(Guid jobId, AssemblyQcRequest input, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (input.Id == Guid.Empty || input.Decision is not ("Pass" or "Fail" or "Hold") || string.IsNullOrWhiteSpace(input.Note)
            || input.Note.Length > 4000 || input.Measurements is null || input.Measurements.Count > 128
            || input.Measurements.Any(m => m is null || string.IsNullOrWhiteSpace(m.Name) || m.Name.Length > 100 || string.IsNullOrWhiteSpace(m.Unit) || m.Unit.Length > 100)
            || input.Measurements.Select(m => m.Name.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != input.Measurements.Count)
            throw Invalid("assembly_qc_invalid", "Record a decision, its note and QC report; name each optional measurement once.");
        await using var tx = await SampleShippingPackingData.BeginAsync(dbContext, "assembly-qc:" + input.PackageId, ct);
        var job = await dbContext.Set<LabAssemblyJob>().SingleOrDefaultAsync(j => j.Id == jobId, ct) ?? throw Missing();
        var package = await dbContext.ResultOutputPackages.SingleOrDefaultAsync(p => p.Id == input.PackageId && p.LabAnalysisRunId == job.LabAnalysisRunId
            && p.LabWorkOrderId == job.LabWorkOrderId, ct) ?? throw Missing();
        var prior = await dbContext.Set<LabAssemblyQc>().AsNoTracking().SingleOrDefaultAsync(q => q.Id == input.Id, ct);
        var coverage = input.CoversSequencingInputs ? JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json)!.Inputs.Select(i => i.SequencingOutputId).Order().ToArray() : [];
        var measurements = JsonSerializer.Serialize(input.Measurements.Select(m => new QcMeasurement(m.Name.Trim(), m.Value, m.Unit.Trim())), JsonOptions);
        if (prior is not null) {
            if (prior.LabAssemblyJobId != jobId || prior.ResultOutputPackageId != input.PackageId || prior.Decision != input.Decision || prior.Note != input.Note.Trim()
                || prior.LabScientificFileId != input.ReportFileId
                || !JsonElement.DeepEquals(JsonSerializer.Deserialize<JsonElement>(prior.MeasurementsJson), JsonSerializer.Deserialize<JsonElement>(measurements))
                || !JsonElement.DeepEquals(JsonSerializer.Deserialize<JsonElement>(prior.InputCoverageJson), JsonSerializer.SerializeToElement(coverage)))
                throw Conflict("assembly_qc_replay_conflict", "This QC identity has different evidence.");
            return await AssemblyQcWorkspace(jobId, ct);
        }
        EnsureVersion(job.Version, input.JobVersion); EnsureVersion(package.Version, input.PackageVersion);
        var current = await dbContext.Set<LabAssemblyQc>().Where(q => q.ResultOutputPackageId == package.Id).Select(q => (int?)q.ReviewVersion).MaxAsync(ct) ?? 0;
        if (current != input.PreviousReviewVersion) throw Conflict("assembly_qc_changed", "The QC decision changed. Refresh and review it before saving a new version.");
        var work = await RequireWorkOrderAsync(job.LabWorkOrderId, ct);
        if (work.Status is LabWorkOrderStatus.OnHold or LabWorkOrderStatus.Cancelled || job.State != "Succeeded" || job.AttentionReason != null
            || !job.LabAnalysisRunId.HasValue || package.State != ResultOutputPackageState.ReadyForReview)
            throw Conflict("assembly_qc_not_ready", "QC requires a reconciled successful assembly and complete, scanned output package awaiting review.");
        if (input.Decision == "Pass" && !input.CoversSequencingInputs) throw Invalid("assembly_qc_input_coverage", "Confirm the QC report covers all listed sequencing inputs before recording Pass.");
        var inputIds = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json)!.Inputs.Select(i => i.SequencingOutputId).ToArray();
        var sequencingInputs = await dbContext.LabSequencingOutputs.AsNoTracking().Where(o => inputIds.Contains(o.Id)).ToListAsync(ct);
        if (sequencingInputs.Count != inputIds.Length) throw Conflict("assembly_qc_inputs_missing", "Review the assembly's missing inputs before recording QC.");
        await new LabResultLineageService(dbContext).RequireCurrentFastqInputsAsync(sequencingInputs, ct);
        var report = await dbContext.LabScientificFiles.AsNoTracking().SingleOrDefaultAsync(f => f.Id == input.ReportFileId
            && f.LabWorkOrderId == job.LabWorkOrderId && f.LabSpecimenId == job.LabSpecimenId, ct) ?? throw Invalid("assembly_qc_report_required", "Upload the QC report for this exact sample.");
        dbContext.Add(new LabAssemblyQc(input.Id, job.Id, job.LabAnalysisRunId.Value, package.Id, current + 1, report.Id, input.Decision,
            input.Note.Trim(), measurements, JsonSerializer.Serialize(coverage), actor.User.Id, DateTime.UtcNow));
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, job.LabSpecimenId, "AssemblyQcRecorded", DateTime.UtcNow, actor.User.Id,
            JsonSerializer.Serialize(new { jobId, packageId = package.Id, reviewVersion = current + 1, input.Decision, input.Note, reportFileId = report.Id }, JsonOptions)));
        dbContext.Entry(work).Property(w => w.UpdatedAt).IsModified = true;
        dbContext.Entry(package).Property(p => p.UpdatedAt).IsModified = true;
        await dbContext.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
        return await AssemblyQcWorkspace(jobId, ct);
    }
}
