namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpGet("assembly-jobs")]
    public async Task<object> AssemblyJobs([FromServices] LabAssemblyService service, Guid? workOrderId, Guid? specimenId, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        return new { availability = service.Availability, canOperate = actor.HasAny(LabRole.Operator, LabRole.Supervisor),
            jobs = await service.ListAsync(workOrderId, specimenId, ct) };
    }

    [HttpGet("assembly-jobs/inputs")]
    public async Task<object> AssemblyInputs(Guid? workOrderId, Guid? specimenId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var query = dbContext.LabSequencingOutputs.AsNoTracking();
        if (workOrderId.HasValue) query = query.Where(o => o.LabWorkOrderId == workOrderId);
        if (specimenId.HasValue) query = query.Where(o => o.LabSpecimenId == specimenId);
        // Corrections replace input choices, never remove their retained history.
        query = query.Where(o => !dbContext.LabSequencingOutputs.Any(c => c.CorrectsOutputId == o.Id));
        var candidates = await (from output in query join sample in dbContext.LabSpecimens on output.LabSpecimenId equals sample.Id
            join library in dbContext.LabLibraries on output.LabLibraryId equals library.Id
            orderby output.RecordedAtUtc descending
            select new { output.Id, output.LabWorkOrderId, output.LabSpecimenId, sampleName = sample.AccessionNumber,
                sequencingRunNumber = output.SequencingRunNumber ?? 1, output.LabSpecimenAttemptId, library.LibraryKey,
                output.ProviderRunReference, output.SampleMappingReference, output.SizeBytes, output.Sha256,
                output.ProviderKey, output.ExternalFileReference, output.LabNgsSendoutId }).Take(1000).ToListAsync(ct);
        var sendoutIds = candidates.Where(c => c.ProviderKey == "vendor-fastq").Select(c => c.LabNgsSendoutId).Distinct().ToArray();
        var current = await dbContext.LabVendorResultsVersions.AsNoTracking().Where(v => sendoutIds.Contains(v.LabNgsSendoutId)
            && !dbContext.LabVendorResultsVersions.Any(newer => newer.LabNgsSendoutId == v.LabNgsSendoutId && newer.ResultVersion > v.ResultVersion))
            .Select(v => v.SnapshotJson).ToListAsync(ct);
        var ids = current.SelectMany(json => JsonSerializer.Deserialize<DTOs.VendorResultsSnapshot>(json, JsonOptions)!.FastqSets ?? [])
            .SelectMany(set => set.Files).Select(file => file.OutputId).ToHashSet();
        var references = candidates.Select(c => c.ExternalFileReference).ToArray();
        var files = await dbContext.LabScientificFiles.AsNoTracking().Where(f => references.Contains(LabScientificFiles.Prefix + f.Id.ToString()))
            .Select(f => new { f.Id, f.FileName }).ToDictionaryAsync(f => LabScientificFiles.Prefix + f.Id, f => f.FileName, ct);
        return candidates.Where(c => c.ProviderKey != "vendor-fastq" || ids.Contains(c.Id)).Select(c => new { c.Id, c.LabWorkOrderId,
            c.LabSpecimenId, c.sampleName, c.sequencingRunNumber, c.LabSpecimenAttemptId, c.LibraryKey,
            c.ProviderRunReference, c.SampleMappingReference, c.SizeBytes, c.Sha256, fileName = files.GetValueOrDefault(c.ExternalFileReference) }).ToList();

    }

    [HttpGet("assembly-jobs/{jobId:guid}")]
    public async Task<object> AssemblyJob(Guid jobId, [FromServices] LabAssemblyService service, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var job = await service.RequireJobAsync(jobId, ct);
        var events = await dbContext.Set<LabAssemblyEvent>().AsNoTracking().Where(e => e.LabAssemblyJobId == jobId)
            .OrderBy(e => e.RecordedAtUtc).Select(e => new { e.Id, e.Kind, e.RecordedAtUtc, e.ActorUserId, e.EvidenceJson }).ToListAsync(ct);
        var delivery = await dbContext.Set<LabAssemblyCommand>().AsNoTracking().Where(c => c.LabAssemblyJobId == jobId)
            .OrderBy(c => c.RequestedAtUtc).Select(c => new { c.Kind, c.AttemptCount, c.LastAttemptAtUtc, c.NextAttemptAtUtc,
                c.ReceivedAtUtc, c.ConfirmedAtUtc, c.EscalatedAtUtc, c.Suppressed }).ToListAsync(ct);
        var analyses = await dbContext.LabAnalysisRuns.AsNoTracking().Where(a => a.LabWorkOrderId == job.LabWorkOrderId
            && a.LabSpecimenId == job.LabSpecimenId && a.ProviderKey == job.ProviderKey && a.RunReference == job.ProviderJobId)
            .Select(a => new { a.Id, a.RunReference, a.RecordedAtUtc }).ToListAsync(ct);
        return new { job = await service.ReadAsync(jobId, ct), events, analyses, delivery,
            inputs = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json)!.Inputs,
            recipe = JsonSerializer.Deserialize<AssemblyRecipe>(job.RecipeJson, LabAssemblyService.Json),
            availability = service.Availability, canOperate = actor.HasAny(LabRole.Operator, LabRole.Supervisor) };
    }

    [HttpPost("work-orders/{workOrderId:guid}/assembly-jobs")]
    public async Task<AssemblyJobDto> StartAssembly(Guid workOrderId, [FromBody] StartAssemblyRequest request,
        [FromServices] LabAssemblyService service, CancellationToken ct, [FromServices] LabAssemblyProcessor? processor = null)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var job = await service.StartAsync(workOrderId, request, actor.User.Id, ct);
        if (job.ProviderKey == DpsContract.Provider) {
            if (processor is null) throw DpsMqttClient.Unavailable();
            // Request and command are committed before any publish. A broker PUBACK alone is insufficient.
            if (job.State is "Queued" or "Dispatching") await processor.ProcessAsync(job.Id, ct, failInitialDispatch: true);
            job = await service.RequireJobAsync(job.Id, ct);
            await dbContext.Entry(job).ReloadAsync(ct);
            if (job.State is "Queued" or "Dispatching") throw new PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException(
                "assembly_dispatch_unconfirmed", $"DPS has not confirmed dispatch for saved attempt {job.Id:D}. Reconcile this attempt before starting another.",
                503, new { assemblyJobId = job.Id, dispatchConfirmed = false });
        }
        Response.StatusCode = StatusCodes.Status202Accepted;
        return await service.ReadAsync(job.Id, ct);
    }

    [HttpPost("work-orders/{workOrderId:guid}/assembly-jobs/{jobId:guid}/cancel")]
    public async Task<AssemblyJobDto> CancelAssembly(Guid workOrderId, Guid jobId, [FromBody] AssemblyReasonRequest request,
        [FromServices] LabAssemblyService service, CancellationToken ct, [FromServices] LabAssemblyProcessor? processor = null)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await service.CancelAsync(workOrderId, jobId, request, actor.User.Id, ct);
        var saved = await service.RequireJobAsync(jobId, ct);
        if (saved.ProviderKey == DpsContract.Provider && !saved.IsTerminal) {
            if (processor is null) throw DpsMqttClient.Unavailable();
            await processor.ProcessAsync(jobId, ct, failInitialDispatch: true, requiredCommandKind: "Cancel");
            saved = await service.RequireJobAsync(jobId, ct);
            await dbContext.Entry(saved).ReloadAsync(ct);
            if (!saved.IsTerminal && !await dbContext.Set<LabAssemblyCommand>().AnyAsync(c => c.LabAssemblyJobId == jobId && c.Kind == "Cancel" && c.ReceivedAtUtc != null, ct))
                throw new PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException("assembly_dispatch_unconfirmed",
                    $"DPS has not accepted cancellation for saved attempt {jobId:D}. Reconcile this attempt; cancellation has not been inferred.",
                    503, new { assemblyJobId = jobId, commandKind = "Cancel", dispatchConfirmed = false });
        }
        return await service.ReadAsync(jobId, ct);
    }

    [HttpPost("work-orders/{workOrderId:guid}/assembly-jobs/{jobId:guid}/analysis")]
    public async Task<AssemblyJobDto> LinkAssemblyAnalysis(Guid workOrderId, Guid jobId, [FromBody] AssemblyAnalysisRequest request,
        [FromServices] LabAssemblyService service, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await service.LinkAnalysisAsync(workOrderId, jobId, request, actor.User.Id, ct);
        return await service.ReadAsync(jobId, ct);
    }
}
