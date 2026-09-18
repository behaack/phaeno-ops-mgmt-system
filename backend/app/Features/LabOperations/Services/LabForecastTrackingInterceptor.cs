namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class LabForecastTrackingInterceptor(ICurrentUserContext actor) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData data, InterceptionResult<int> result)
    { Capture(data.Context); return result; }
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data, InterceptionResult<int> result, CancellationToken token = default)
    { Capture(data.Context); return ValueTask.FromResult(result); }

    private void Capture(DbContext? context)
    {
        if (context is not PSeqOperationsDbContext db) return;
        db.ChangeTracker.DetectChanges();
        var now = DateTime.UtcNow;
        foreach (var entry in db.ChangeTracker.Entries().Where(e => e.State is EntityState.Added or EntityState.Modified).ToList())
        {
            (Guid Job, Guid Source, string Property)? source = entry.Entity switch {
                LabLibrary x => (x.LabWorkOrderId, x.Id, nameof(x.Status)),
                ResultOutputPackage x => (x.LabWorkOrderId, x.Id, nameof(x.State)),
                LabSpecimen x => (x.LabWorkOrderId, x.Id, nameof(x.IntakeDisposition)),
                LabSpecimenAttempt x => (x.LabWorkOrderId, x.Id, nameof(x.State)),
                LabProtocolExecution x => (x.LabWorkOrderId, x.Id, nameof(x.Status)),
                LabWorkOrder x => (x.Id, x.Id, nameof(x.Status)),
                _ => null
            };
            if (source is not { } value) continue;
            var property = entry.Property(value.Property);
            if (entry.State != EntityState.Added && Equals(property.OriginalValue, property.CurrentValue)) continue;
            var state = property.CurrentValue?.ToString() ?? "Unknown";
            var kind = entry.Entity.GetType().Name;
            // A failed SaveChanges may be retried with the same tracked entities.
            if (!db.Set<LabForecastTransition>().Local.Any(t => t.SourceId == value.Source && t.SourceKind == kind && t.State == state
                && db.Entry(t).State == EntityState.Added))
                db.Add(new LabForecastTransition(value.Job, value.Source, kind, state,
                    entry.State == EntityState.Added ? null : property.OriginalValue?.ToString(), now, actor.UserId));

            if (entry.State == EntityState.Added && entry.Entity is LabWorkOrder work)
            {
                var workflow = work.LabServiceWorkflowVersionId ?? (from w in db.LabServiceWorkflows.AsNoTracking()
                    join v in db.LabServiceWorkflowVersions.AsNoTracking() on w.Id equals v.LabServiceWorkflowId
                    where w.ServiceKey == work.ServiceKey && v.Status == LabServiceWorkflowStatus.Production select (Guid?)v.Id).SingleOrDefault();
                if (workflow.HasValue) Pin(work.Id, workflow.Value, "Timing policy pinned when the job was created.");
            }
            else if (entry.State == EntityState.Added && entry.Entity is LabSpecimenAttempt attempt)
                Pin(attempt.LabWorkOrderId, attempt.LabServiceWorkflowVersionId, "Timing policy pinned for the selected sample workflow.");
        }
        void Pin(Guid jobId, Guid workflowId, string reason)
        {
            var policy = db.Set<LabTimingPolicy>().AsNoTracking().Where(p => p.LabServiceWorkflowVersionId == workflowId)
                .OrderByDescending(p => p.Revision).FirstOrDefault();
            if (policy is null) return;
            var saved = (from b in db.Set<LabJobTimingPolicy>().AsNoTracking()
                join p in db.Set<LabTimingPolicy>().AsNoTracking() on b.LabTimingPolicyId equals p.Id
                where b.LabWorkOrderId == jobId select new { b.Revision, p.LabServiceWorkflowVersionId }).ToList();
            var pending = db.Set<LabJobTimingPolicy>().Local.Where(b => b.LabWorkOrderId == jobId && db.Entry(b).State == EntityState.Added).ToList();
            if (saved.Any(b => b.LabServiceWorkflowVersionId == workflowId)
                || pending.Any(b => b.LabTimingPolicyId == policy.Id)) return;
            var revision = saved.Select(b => b.Revision).Concat(pending.Select(b => b.Revision)).DefaultIfEmpty(0).Max() + 1;
            db.Add(new LabJobTimingPolicy(jobId, policy.Id, revision, reason));
        }
    }
}
