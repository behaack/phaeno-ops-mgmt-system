namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Crm.Services;

public class CrmAttentionFilterTests
{
    [Fact]
    public void TaskAttentionSeparatesOverdueFromNextSevenDaysAndExcludesTerminalTasks()
    {
        var now = new DateTime(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc);
        var owner = Guid.NewGuid(); var company = Guid.NewGuid();
        CrmTask Task(string title, DateTime? due) => new(title, null, owner, CrmTaskPriority.Normal, due, null, null, company);
        var overdue = Task("Overdue", now.AddSeconds(-1)); var dueNow = Task("Due now", now); var lastDay = Task("Seventh day", now.AddDays(7));
        var completed = Task("Completed", now.AddDays(-2)); completed.Complete(owner, now);
        var cancelled = Task("Cancelled", now.AddDays(1)); cancelled.Cancel();
        var tasks = new[] { overdue, dueNow, lastDay, Task("Later", now.AddDays(7).AddSeconds(1)), Task("Undated", null), completed, cancelled }.AsQueryable();
        Assert.Equal([overdue.Id], CrmAttentionFilters.Tasks(tasks, true, false, now).Select(task => task.Id));
        Assert.Equal([dueNow.Id, lastDay.Id], CrmAttentionFilters.Tasks(tasks, false, true, now).Select(task => task.Id));
    }

    [Fact]
    public void LeadAttentionOmitsDisqualifiedAndAlreadyPlannedLeads()
    {
        var owner = Guid.NewGuid();
        var missing = new CrmLead(CrmLeadKind.Company, "Needs action", owner, companyName: "Needs action Company");
        var planned = new CrmLead(CrmLeadKind.Company, "Planned", owner, companyName: "Planned Company", nextAction: "Call on Monday");
        var disqualified = new CrmLead(CrmLeadKind.Company, "Disqualified", owner, companyName: "Disqualified Company"); disqualified.Disqualify("Outside scope");
        Assert.Equal(missing.Id, Assert.Single(CrmAttentionFilters.MissingNextAction(new[] { missing, planned, disqualified }.AsQueryable())).Id);
    }

    [Fact]
    public void StaleAttentionCoversOpenStagesAcrossPipelinesWithAnExactThirtyDayCutoff()
    {
        var now = new DateTime(2026, 9, 7, 12, 0, 0, DateTimeKind.Utc);
        CrmOpportunity Opportunity(int days, CrmPipelineStageCategory category)
        {
            var stage = new CrmPipelineStage(Guid.NewGuid(), "Stage", 0, category, category == CrmPipelineStageCategory.Won ? 100 : 0, false);
            var value = new CrmOpportunity("Opportunity", Guid.NewGuid(), stage, Guid.NewGuid(), null, null, "USD", null, null, null, null, null);
            typeof(CrmOpportunity).GetProperty(nameof(CrmOpportunity.Stage))!.SetValue(value, stage);
            value.MarkUpdated(now.AddDays(-days), null); return value;
        }
        var first = Opportunity(31, CrmPipelineStageCategory.Open); var second = Opportunity(45, CrmPipelineStageCategory.Open);
        var values = new[] { first, second, Opportunity(30, CrmPipelineStageCategory.Open), Opportunity(90, CrmPipelineStageCategory.Won) }.AsQueryable();
        Assert.Equal([first.Id, second.Id], CrmAttentionFilters.StaleOpportunities(values, now).Select(value => value.Id));
    }
}
