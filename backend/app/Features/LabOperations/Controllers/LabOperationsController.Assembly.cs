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
        return await (from output in query join sample in dbContext.LabSpecimens on output.LabSpecimenId equals sample.Id
            orderby output.RecordedAtUtc descending
            select new { output.Id, output.LabWorkOrderId, output.LabSpecimenId, sampleName = sample.AccessionNumber,
                sequencingRunNumber = output.SequencingRunNumber ?? 1, output.LabSpecimenAttemptId,
                output.ProviderRunReference, output.SampleMappingReference, output.SizeBytes, output.Sha256 }).Take(1000).ToListAsync(ct);
    }

    [HttpGet("assembly-jobs/{jobId:guid}")]
    public async Task<object> AssemblyJob(Guid jobId, [FromServices] LabAssemblyService service, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator);
        var job = await service.RequireJobAsync(jobId, ct);
        var events = await dbContext.Set<LabAssemblyEvent>().AsNoTracking().Where(e => e.LabAssemblyJobId == jobId)
            .OrderBy(e => e.RecordedAtUtc).Select(e => new { e.Id, e.Kind, e.RecordedAtUtc, e.ActorUserId, e.EvidenceJson }).ToListAsync(ct);
        var analyses = await dbContext.LabAnalysisRuns.AsNoTracking().Where(a => a.LabWorkOrderId == job.LabWorkOrderId
            && a.LabSpecimenId == job.LabSpecimenId && a.ProviderKey == job.ProviderKey && a.RunReference == job.ProviderJobId)
            .Select(a => new { a.Id, a.RunReference, a.RecordedAtUtc }).ToListAsync(ct);
        return new { job = await service.ReadAsync(jobId, ct), events, analyses,
            inputs = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json)!.Inputs,
            recipe = JsonSerializer.Deserialize<AssemblyRecipe>(job.RecipeJson, LabAssemblyService.Json),
            availability = service.Availability, canOperate = actor.HasAny(LabRole.Operator, LabRole.Supervisor) };
    }

    [HttpPost("work-orders/{workOrderId:guid}/assembly-jobs")]
    public async Task<AssemblyJobDto> StartAssembly(Guid workOrderId, [FromBody] StartAssemblyRequest request,
        [FromServices] LabAssemblyService service, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var job = await service.StartAsync(workOrderId, request, actor.User.Id, ct);
        Response.StatusCode = StatusCodes.Status202Accepted;
        return await service.ReadAsync(job.Id, ct);
    }

    [HttpPost("work-orders/{workOrderId:guid}/assembly-jobs/{jobId:guid}/cancel")]
    public async Task<AssemblyJobDto> CancelAssembly(Guid workOrderId, Guid jobId, [FromBody] AssemblyReasonRequest request,
        [FromServices] LabAssemblyService service, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        await service.CancelAsync(workOrderId, jobId, request, actor.User.Id, ct);
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
