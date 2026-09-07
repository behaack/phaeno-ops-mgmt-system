namespace PhaenoPortal.App.Features.Crm.Services;

using PSeq.Operations.Commercial.Crm.Domain;

public static class CrmAttentionFilters
{
    public static IQueryable<CrmTask> Tasks(IQueryable<CrmTask> query, bool overdue, bool dueSoon, DateTime now)
    {
        if (!overdue && !dueSoon) return query;
        query = query.Where(value => value.IsActive && value.Status != CrmTaskStatus.Completed && value.Status != CrmTaskStatus.Cancelled);
        if (overdue) query = query.Where(value => value.DueAt < now);
        if (dueSoon) { var through = now.AddDays(7); query = query.Where(value => value.DueAt >= now && value.DueAt <= through); }
        return query;
    }

    public static IQueryable<CrmLead> MissingNextAction(IQueryable<CrmLead> query) => query.Where(value =>
        value.IsActive && value.Status != CrmLeadStatus.Converted && value.Status != CrmLeadStatus.Disqualified
        && (value.NextAction == null || value.NextAction == ""));

    public static IQueryable<CrmOpportunity> StaleOpportunities(IQueryable<CrmOpportunity> query, DateTime now)
    {
        var cutoff = now.AddDays(-30);
        return query.Where(value => value.IsActive && value.UpdatedAt < cutoff && value.Stage.Category == CrmPipelineStageCategory.Open);
    }
}
