namespace PhaenoPortal.App.Features.WorkAttention;

using Microsoft.EntityFrameworkCore;

public sealed partial class WorkAttentionReader
{
    // Assess the same domain rule as approval within the caller's read snapshot,
    // before personal counts, filters or paging. Batch reads avoid per-item queries.
    public async Task<IQueryable<WorkItem>> WithReconciliationEligibilityAsync(IQueryable<WorkItem> work, CancellationToken token)
    {
        if (!options.DualControlEnforced || !Caps.CanReconcilePSeqCash) return work;
        var ids = await work.Where(item => item.SourceType == "Reconciliation").Select(item => item.SourceId).ToArrayAsync(token);
        if (ids.Length == 0) return work;
        var batches = await db.ReconciliationBatches.AsNoTracking().Where(batch => ids.Contains(batch.Id)).ToArrayAsync(token);
        var contributors = (await db.ReconciliationBatchItems.AsNoTracking().Where(item => ids.Contains(item.ReconciliationBatchId))
            .Select(item => new { item.ReconciliationBatchId, item.ContributingActorUserId }).ToArrayAsync(token))
            .ToLookup(item => item.ReconciliationBatchId, item => item.ContributingActorUserId);
        var eligible = batches.Where(batch => !batch.HasApprovalConflict(session.User!.Id, contributors[batch.Id]))
            .Select(batch => batch.Id).ToArray();
        return work.Where(item => item.SourceType != "Reconciliation" || eligible.Contains(item.SourceId));
    }
}
