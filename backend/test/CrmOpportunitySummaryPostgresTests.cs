namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Crm.Controllers;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task StageSummaryCountsBeyondPageAndSeparatesCurrenciesUnpricedAndEmptyStages()
    {
        await using var scope = await Scope.Create();
        var company = new CrmCompany($"TEST ONLY summary {Guid.NewGuid():N}", scope.Actor.Id);
        var pipeline = new CrmPipeline($"TEST ONLY summary {Guid.NewGuid():N}", null, false);
        var discovery = new CrmPipelineStage(pipeline.Id, "Discovery", 10, CrmPipelineStageCategory.Open, 10, false);
        var proposal = new CrmPipelineStage(pipeline.Id, "Proposal", 20, CrmPipelineStageCategory.Open, 50, false);
        var won = new CrmPipelineStage(pipeline.Id, "Won", 30, CrmPipelineStageCategory.Won, 100, false);
        scope.Db.AddRange(company, pipeline, discovery, proposal, won);
        CrmOpportunity Opportunity(string name, CrmPipelineStage stage, decimal? amount, string currency) =>
            new(name, company.Id, stage, scope.Actor.Id, null, amount, currency, null, null, null, null, []);
        var records = Enumerable.Range(1, 30).Select(index => Opportunity($"TEST ONLY matched {index}", discovery, 100m, "USD")).ToList();
        var euro = Opportunity("TEST ONLY matched Euro", discovery, 50m, "EUR");
        var zero = Opportunity("TEST ONLY matched zero", discovery, 0m, "USD");
        var unpriced = Opportunity("TEST ONLY matched unpriced", proposal, null, "USD");
        var closed = Opportunity("TEST ONLY matched won", discovery, 200m, "USD");
        closed.MoveToStage(won, "Reviewed win", DateTime.UtcNow);
        var inactive = Opportunity("TEST ONLY inactive", discovery, 999m, "USD");
        inactive.Deactivate();
        scope.Db.AddRange(records);
        scope.Db.AddRange(euro, zero, unpriced, closed, inactive);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmOpportunitiesController(scope.Db, scope.Identity));
        var page = await controller.List(null, company.Id, pipeline.Id, null, pageSize: 25);
        Assert.Equal(34, page.TotalCount);
        Assert.Equal(25, page.Items.Count);
        var stages = await controller.StageSummary(null, company.Id, pipeline.Id);
        Assert.Equal(page.TotalCount, stages.Sum(value => value.Count));
        var summary = Assert.Single(stages, value => value.StageId == discovery.Id);
        Assert.Equal(32, summary.Count);
        Assert.Equal(10, summary.Probability);
        Assert.Equal(0, summary.UnpricedCount);
        Assert.Equal(3000m, Assert.Single(summary.CurrencyTotals, value => value.Currency == "USD").Amount);
        Assert.Equal(50m, Assert.Single(summary.CurrencyTotals, value => value.Currency == "EUR").Amount);
        var unknown = Assert.Single(stages, value => value.StageId == proposal.Id);
        Assert.Equal(1, unknown.UnpricedCount);
        Assert.Empty(unknown.CurrencyTotals);
        var searched = await controller.StageSummary("matched Euro", company.Id, pipeline.Id);
        Assert.Equal(1, searched.Sum(value => value.Count));
        Assert.Equal(0, Assert.Single(searched, value => value.StageId == proposal.Id).Count);
        Assert.Equal(35, (await controller.StageSummary(null, company.Id, pipeline.Id, includeInactive: true)).Sum(value => value.Count));
        await scope.Db.CrmOpportunities.Where(value => value.CompanyId == company.Id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(value => value.UpdatedAt, DateTime.UtcNow.AddDays(-31)));
        var stale = await controller.StageSummary(null, company.Id, pipeline.Id, staleOnly: true);
        var stalePage = await controller.List(null, company.Id, pipeline.Id, null, staleOnly: true);
        Assert.Equal(33, stale.Sum(value => value.Count));
        Assert.Equal(stalePage.TotalCount, stale.Sum(value => value.Count));
        Assert.Equal(0, Assert.Single(stale, value => value.StageId == won.Id).Count);
        Assert.Empty(await controller.StageSummary(null, company.Id, Guid.NewGuid()));
    }
}
