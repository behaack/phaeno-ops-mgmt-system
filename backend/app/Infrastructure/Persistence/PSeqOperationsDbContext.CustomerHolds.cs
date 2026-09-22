namespace PhaenoPortal.App.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class PSeqOperationsDbContext
{
    private async Task<(HashSet<Guid> NewWork, HashSet<Guid> Ongoing)> HoldWriteTargets(CancellationToken ct)
    {
        var blocked = new HashSet<Guid>(); var ongoing = new HashSet<Guid>();
        var workIds = new HashSet<Guid>(); var submitted = new HashSet<Guid>(); var batchIds = new HashSet<Guid>();
        foreach (var entry in ChangeTracker.Entries().Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            var added = entry.State == EntityState.Added;
            switch (entry.Entity)
            {
                case LabSpecimenAttempt a when added || entry.Property(nameof(a.StartedAtUtc)).IsModified:
                    blocked.Add(a.LabSpecimenId); break;
                case LabProtocolExecution e:
                    if (added || entry.Property(nameof(e.StartedAtUtc)).IsModified)
                    { if (e.LabSpecimenId is {} id) blocked.Add(id); else workIds.Add(e.LabWorkOrderId); }
                    else if (entry.Property(nameof(e.CapturedResultsJson)).IsModified)
                    { if (e.LabSpecimenId is {} id) ongoing.Add(id); }
                    break;
                case LabAnalysisRun a when added: blocked.Add(a.LabSpecimenId); break;
                case LabAssemblyJob a when added || entry.Property(nameof(a.DispatchRequestedAtUtc)).IsModified:
                    blocked.Add(a.LabSpecimenId); break;
                case LabLibrary l when added: ongoing.Add(l.LabSpecimenId); break;
                case LabNgsSendout s when added || entry.Property(nameof(s.Status)).IsModified
                    && s.Status is LabNgsSendoutStatus.Shipped or LabNgsSendoutStatus.Sequencing:
                    // A provider already sequencing may finish; only a new handoff/start is blocked.
                    if (added || (LabNgsSendoutStatus)entry.Property(nameof(s.Status)).OriginalValue! is not (LabNgsSendoutStatus.Sequencing or LabNgsSendoutStatus.Complete)) batchIds.Add(s.LabOperationalBatchId);
                    break;
                case ResultOutputPackage p when (added || entry.Property(nameof(p.ReleasedAtUtc)).IsModified) && p.ReleasedAtUtc != null:
                    if (p.LabSampleId is {} sample) submitted.Add(sample); break;
                case LabResultRelease r when (added || entry.Property(nameof(r.ReleasedAt)).IsModified) && r.ReleasedAt != null:
                    submitted.Add(r.LabSampleId); break;
            }
        }
        if (workIds.Count > 0) blocked.UnionWith(await LabSpecimens.Where(s => workIds.Contains(s.LabWorkOrderId)).Select(s => s.Id).ToListAsync(ct));
        if (submitted.Count > 0) blocked.UnionWith(await LabSpecimens.Where(s => submitted.Contains(s.SubmittedSpecimenId)).Select(s => s.Id).ToListAsync(ct));
        if (batchIds.Count > 0) blocked.UnionWith(await (from member in LabBatchMembers join library in LabLibraries on member.LabLibraryId equals library.Id
            where batchIds.Contains(member.LabOperationalBatchId) select library.LabSpecimenId).ToListAsync(ct));
        // A new handoff may save its membership and libraries in the same transaction.
        var stagedLibraries = ChangeTracker.Entries<LabBatchMember>().Where(e => e.State == EntityState.Added && batchIds.Contains(e.Entity.LabOperationalBatchId))
            .Select(e => e.Entity.LabLibraryId).ToHashSet();
        if (stagedLibraries.Count > 0)
        {
            blocked.UnionWith(await LabLibraries.Where(l => stagedLibraries.Contains(l.Id)).Select(l => l.LabSpecimenId).ToListAsync(ct));
            blocked.UnionWith(ChangeTracker.Entries<LabLibrary>().Where(e => stagedLibraries.Contains(e.Entity.Id)).Select(e => e.Entity.LabSpecimenId));
        }
        return (blocked, ongoing);
    }

    private async Task<int> SaveWithCustomerHoldsAsync(bool acceptAllChangesOnSuccess, CancellationToken ct)
    {
        ProtectLineageHistory();
        var targets = await HoldWriteTargets(ct);
        if (targets.NewWork.Count == 0 && targets.Ongoing.Count == 0)
            return await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
        await using var tx = Database.IsRelational() && Database.CurrentTransaction is null ? await Database.BeginTransactionAsync(ct) : null;
        // All affected samples lock in one stable order, shared with hold decisions and requests.
        foreach (var id in targets.NewWork.Concat(targets.Ongoing).Distinct().Order())
            await Features.OrderManagement.Services.SampleShippingPackingData.LockAsync(this, "customer-hold:" + id, ct);
        await Features.LabOperations.Services.LabCustomerHolds.RequireUnblockedAsync(this, targets.NewWork, ct);
        if (await LabCustomerHolds.AsNoTracking().AnyAsync(h => targets.Ongoing.Contains(h.LabSpecimenId)
            && h.PausedAtUtc != null, ct))
            throw new Features.OrderManagement.Services.OrderManagementException("customer_hold_applied", "This sample is paused. Phaeno must approve resumption before further execution evidence or library output can be recorded.", 409);
        var result = await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return result;
    }
}
