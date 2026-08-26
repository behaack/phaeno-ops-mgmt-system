namespace PhaenoPortal.App.Features.Crm.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using static PhaenoPortal.App.Features.Crm.Services.CrmAccess;

[ApiController]
[Authorize]
[Route("api/platform/crm/pipelines")]
public sealed class CrmPipelinesController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<CrmPipelineDto>> List([FromQuery] bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        await RequireActor(cancellationToken);
        var query = dbContext.CrmPipelines.AsNoTracking().Include(value => value.Stages).AsQueryable();
        if (!includeInactive) query = query.Where(value => value.IsActive);
        return (await query.OrderByDescending(value => value.IsDefault).ThenBy(value => value.Name).ToListAsync(cancellationToken)).Select(ToDto).ToList();
    }

    [HttpPost]
    public async Task<ActionResult<CrmPipelineDto>> Create([FromBody] UpsertCrmPipelineRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        await EnsureUniqueName(request.Name, null, cancellationToken);
        if (request.IsDefault) await ClearDefault(null, cancellationToken);
        var value = Execute(() => new CrmPipeline(request.Name, request.Description, request.IsDefault));
        dbContext.CrmPipelines.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/pipelines/{value.Id}", ToDto(value));
    }

    [HttpPut("{pipelineId:guid}")]
    public async Task<CrmPipelineDto> Update(Guid pipelineId, [FromBody] UpsertCrmPipelineRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await Require(pipelineId, cancellationToken);
        EnsureVersion(value.Version, request.Version ?? 0);
        await EnsureUniqueName(request.Name, pipelineId, cancellationToken);
        if (request.IsDefault && !value.IsActive)
        {
            throw Conflict("crm_default_pipeline_inactive", "Reactivate the pipeline before making it the default.");
        }

        if (request.IsDefault) await ClearDefault(pipelineId, cancellationToken);
        Execute(() => value.Update(request.Name, request.Description));
        value.SetDefault(request.IsDefault);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("{pipelineId:guid}/{lifecycleAction:regex(^(deactivate|reactivate)$)}")]
    public async Task<CrmPipelineDto> ChangeActive(Guid pipelineId, string lifecycleAction, [FromBody] ChangeCrmCompanyActiveRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await Require(pipelineId, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        if (lifecycleAction == "deactivate")
        {
            if (value.IsDefault) throw Conflict("crm_default_pipeline_active", "Choose another default pipeline before deactivating this one.");
            if (await dbContext.CrmOpportunities.AnyAsync(item => item.PipelineId == pipelineId && item.IsActive && item.Stage.Category == CrmPipelineStageCategory.Open, cancellationToken))
            {
                throw Conflict("crm_pipeline_in_use", "Move or close active Opportunities before deactivating this pipeline.");
            }
        }

        Execute(lifecycleAction == "reactivate" ? value.Reactivate : value.Deactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("{pipelineId:guid}/stages")]
    public async Task<ActionResult<CrmPipelineStageDto>> CreateStage(Guid pipelineId, [FromBody] UpsertCrmPipelineStageRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var pipeline = await Require(pipelineId, cancellationToken);
        if (!pipeline.IsActive) throw Conflict("crm_pipeline_inactive", "Reactivate the pipeline before adding stages.");
        await EnsureStageUnique(pipelineId, request.Name, request.Position, null, cancellationToken);
        var value = Execute(() => new CrmPipelineStage(pipelineId, request.Name, request.Position, request.Category, request.Probability, request.RequiresReason));
        dbContext.CrmPipelineStages.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/pipelines/{pipelineId}/stages/{value.Id}", ToDto(value));
    }

    [HttpPut("{pipelineId:guid}/stages/{stageId:guid}")]
    public async Task<CrmPipelineStageDto> UpdateStage(Guid pipelineId, Guid stageId, [FromBody] UpsertCrmPipelineStageRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await dbContext.CrmPipelineStages.FirstOrDefaultAsync(item => item.Id == stageId && item.PipelineId == pipelineId, cancellationToken)
            ?? throw NotFound("crm_stage_not_found", "The CRM pipeline stage was not found.");
        EnsureVersion(value.Version, request.Version ?? 0);
        await EnsureStageUnique(pipelineId, request.Name, request.Position, stageId, cancellationToken);
        if (request.Category != value.Category
            && await dbContext.CrmOpportunities.AnyAsync(item => item.StageId == stageId, cancellationToken))
        {
            throw Conflict("crm_stage_category_in_use", "A stage category cannot change after an Opportunity has used the stage. Create a replacement stage instead.");
        }

        Execute(() => value.Update(request.Name, request.Position, request.Category, request.Probability, request.RequiresReason));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("{pipelineId:guid}/stages/{stageId:guid}/{lifecycleAction:regex(^(deactivate|reactivate)$)}")]
    public async Task<CrmPipelineStageDto> ChangeStageActive(Guid pipelineId, Guid stageId, string lifecycleAction, [FromBody] ChangeCrmCompanyActiveRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await dbContext.CrmPipelineStages.FirstOrDefaultAsync(item => item.Id == stageId && item.PipelineId == pipelineId, cancellationToken)
            ?? throw NotFound("crm_stage_not_found", "The CRM pipeline stage was not found.");
        EnsureVersion(value.Version, request.Version);
        if (lifecycleAction == "deactivate" && value.Category == CrmPipelineStageCategory.Open && await dbContext.CrmOpportunities.AnyAsync(item => item.StageId == stageId && item.IsActive, cancellationToken))
        {
            throw Conflict("crm_stage_in_use", "Move active Opportunities before deactivating this stage.");
        }

        Execute(lifecycleAction == "reactivate" ? value.Reactivate : value.Deactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    private async Task<CrmPipeline> Require(Guid id, CancellationToken cancellationToken) => await dbContext.CrmPipelines.Include(value => value.Stages).FirstOrDefaultAsync(value => value.Id == id, cancellationToken) ?? throw NotFound("crm_pipeline_not_found", "The CRM pipeline was not found.");
    private async Task RequireActor(CancellationToken cancellationToken) => _ = await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
    private async Task ClearDefault(Guid? excludedId, CancellationToken cancellationToken)
    {
        foreach (var pipeline in await dbContext.CrmPipelines.Where(value => value.IsDefault && (!excludedId.HasValue || value.Id != excludedId.Value)).ToListAsync(cancellationToken)) pipeline.SetDefault(false);
    }

    private async Task EnsureUniqueName(string name, Guid? excludedId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();
        if (await dbContext.CrmPipelines.AnyAsync(value => (!excludedId.HasValue || value.Id != excludedId.Value) && value.Name.ToLower() == normalized, cancellationToken)) throw Conflict("crm_pipeline_name_exists", "A pipeline with this name already exists.");
    }

    private async Task EnsureStageUnique(Guid pipelineId, string name, int position, Guid? excludedId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();
        if (await dbContext.CrmPipelineStages.AnyAsync(value => value.PipelineId == pipelineId && (!excludedId.HasValue || value.Id != excludedId.Value) && (value.Name.ToLower() == normalized || value.Position == position), cancellationToken)) throw Conflict("crm_stage_name_or_position_exists", "This pipeline already uses that stage name or position.");
    }

    private static CrmPipelineDto ToDto(CrmPipeline value) => new(value.Id, value.Name, value.Description, value.IsDefault, value.IsActive, value.Stages.OrderBy(stage => stage.Position).Select(ToDto).ToList(), value.Version);
    private static CrmPipelineStageDto ToDto(CrmPipelineStage value) => new(value.Id, value.PipelineId, value.Name, value.Position, value.Category, value.Probability, value.RequiresReason, value.IsActive, value.Version);
    private static CrmException NotFound(string code, string message) => CrmAccess.NotFound(code, message);
    private static CrmException Conflict(string code, string message) => CrmAccess.Conflict(code, message);
}
