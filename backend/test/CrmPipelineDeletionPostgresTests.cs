namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.Services;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task EmptyPipelineDeletionRequiresAdminAndCurrentVersionAndSupportsInactivePipelines()
    {
        await using var scope = await Scope.Create();
        var pipeline = new CrmPipeline($"TEST ONLY delete {Guid.NewGuid():N}", null, false);
        scope.Db.Add(pipeline);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmPipelinesController(scope.Db, scope.Identity));
        await Forbidden(() => controller.Delete(pipeline.Id, new() { Version = pipeline.Version }, default));
        Assert.True(await scope.Db.CrmPipelines.AnyAsync(value => value.Id == pipeline.Id));
        scope.Membership.SetOrganizationAdmin(true);
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => controller.Delete(pipeline.Id, new() { Version = pipeline.Version + 1 }, default));
        Assert.IsType<NoContentResult>(await controller.Delete(pipeline.Id, new() { Version = pipeline.Version }, default));
        Assert.False(await scope.Db.CrmPipelines.AnyAsync(value => value.Id == pipeline.Id));
        var inactive = new CrmPipeline($"TEST ONLY inactive delete {Guid.NewGuid():N}", null, false);
        inactive.Deactivate();
        scope.Db.Add(inactive);
        await scope.Db.SaveChangesAsync();
        Assert.IsType<NoContentResult>(await controller.Delete(inactive.Id, new() { Version = inactive.Version }, default));
        Assert.False(await scope.Db.CrmPipelines.AnyAsync(value => value.Id == inactive.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task PipelineDeletionPreservesDefaultStagesAndClosedInactiveOpportunityHistory()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(true);
        var pipeline = new CrmPipeline($"TEST ONLY protected {Guid.NewGuid():N}", null, false);
        scope.Db.Add(pipeline);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmPipelinesController(scope.Db, scope.Identity));
        // An unsaved default flag suffices to exercise the guard without changing the shared default.
        pipeline.SetDefault(true);
        var error = await Assert.ThrowsAsync<CrmException>(() => controller.Delete(pipeline.Id, new() { Version = pipeline.Version }, default));
        Assert.Equal("crm_default_pipeline_active", error.ErrorCode);
        pipeline.SetDefault(false);
        var stage = new CrmPipelineStage(pipeline.Id, "Won", 10, CrmPipelineStageCategory.Won, 100, false);
        scope.Db.Add(stage);
        await scope.Db.SaveChangesAsync();
        error = await Assert.ThrowsAsync<CrmException>(() => controller.Delete(pipeline.Id, new() { Version = pipeline.Version }, default));
        Assert.Equal("crm_pipeline_not_empty", error.ErrorCode);
        stage.Deactivate();
        await scope.Db.SaveChangesAsync();
        error = await Assert.ThrowsAsync<CrmException>(() => controller.Delete(pipeline.Id, new() { Version = pipeline.Version }, default));
        Assert.Equal("crm_pipeline_not_empty", error.ErrorCode);
        stage.Reactivate();
        var company = new CrmCompany($"TEST ONLY history {Guid.NewGuid():N}", scope.Actor.Id);
        var opportunity = new CrmOpportunity("TEST ONLY retained", company.Id, stage, scope.Actor.Id, null, null, "USD", null, null, null, null, []);
        opportunity.Deactivate();
        var history = new CrmOpportunityStageHistory(opportunity.Id, null, stage.Id, "Retained history", scope.Actor.Id, DateTime.UtcNow);
        scope.Db.AddRange(company, opportunity, history);
        await scope.Db.SaveChangesAsync();
        error = await Assert.ThrowsAsync<CrmException>(() => controller.Delete(pipeline.Id, new() { Version = pipeline.Version }, default));
        Assert.Equal("crm_pipeline_not_empty", error.ErrorCode);
        Assert.True(await scope.Db.CrmPipelines.AnyAsync(value => value.Id == pipeline.Id));
        Assert.True(await scope.Db.CrmOpportunities.AnyAsync(value => value.Id == opportunity.Id));
        Assert.True(await scope.Db.CrmOpportunityStageHistory.AnyAsync(value => value.OpportunityId == opportunity.Id));
    }
}
