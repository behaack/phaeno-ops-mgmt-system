namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabPhaseOperations(PSeqOperationsDbContext db)
{
    public async Task AssignNewSamplesAsync(CancellationToken ct)
    {
        var added = db.ChangeTracker.Entries<LabSample>().Where(x => x.State == EntityState.Added)
            .Select(x => x.Entity).ToArray();
        foreach (var group in added.GroupBy(x => x.LabServiceOrderId))
        {
            var order = db.LabServiceOrders.Local.SingleOrDefault(x => x.Id == group.Key)
                ?? await db.LabServiceOrders.SingleAsync(x => x.Id == group.Key, ct);
            var phases = order.Phases.Where(x => x.SupersededAtUtc == null)
                .OrderBy(x => x.Position).ToArray();
            if (phases.Length == 0 || phases.Sum(x => x.SampleCount) != order.RequestedSpecimenCount)
                throw Error("phase_scope_invalid", "Configure phase sample counts to cover the accepted Job roster.");
            var existing = await db.LabSamples.Where(x => x.LabServiceOrderId == group.Key)
                .ToListAsync(ct);
            // Roster replacement deletes the old rows in this same save. Count the
            // pending roster, including tracked phase edits, rather than deleted rows.
            var retained = existing.Where(s => db.Entry(s).State != EntityState.Deleted).ToArray();
            var counts = phases.ToDictionary(x => x.Id, x => retained.Count(s => s.LabJobPhaseId == x.Id));
            foreach (var sample in group)
            {
                if (sample.LabJobPhaseId.HasValue)
                {
                    if (!counts.ContainsKey(sample.LabJobPhaseId.Value))
                        throw Error("phase_scope_invalid", "Choose a phase belonging to this Job.");
                    counts[sample.LabJobPhaseId.Value]++;
                    var assigned = phases.Single(p => p.Id == sample.LabJobPhaseId);
                    if (assigned.CancelledAtUtc.HasValue) sample.ApplyLaboratoryOutcome(LabSampleStatus.Cancelled, assigned.CancellationReason!);
                    continue;
                }
                var phase = phases.FirstOrDefault(x => counts[x.Id] < x.SampleCount)
                    ?? throw Error("phase_scope_full", "Every configured phase sample position is already assigned.");
                sample.AssignPhase(phase.Id);
                counts[phase.Id]++;
                if (phase.CancelledAtUtc.HasValue) sample.ApplyLaboratoryOutcome(LabSampleStatus.Cancelled, phase.CancellationReason!);
            }
            if (phases.Any(p => counts[p.Id] > p.SampleCount))
                throw Error("phase_scope_full", "The assigned sample count exceeds this phase's configured scope.");
        }
        // A phase can be cancelled before roster finalization creates its laboratory specimens.
        // Retain their identities but prevent receipt or processing of the cancelled scope.
        var newSpecimens = db.ChangeTracker.Entries<LabSpecimen>().Where(e => e.State == EntityState.Added)
            .Select(e => e.Entity).ToArray();
        var submittedIds = newSpecimens.Select(s => s.SubmittedSpecimenId).ToArray();
        var cancelledIds = (await db.LabSamples.Where(s => submittedIds.Contains(s.Id)
            && s.Status == LabSampleStatus.Cancelled).Select(s => s.Id).ToListAsync(ct)).ToHashSet();
        cancelledIds.UnionWith(added.Where(s => s.Status == LabSampleStatus.Cancelled).Select(s => s.Id));
        foreach (var specimen in newSpecimens.Where(s => cancelledIds.Contains(s.SubmittedSpecimenId)
            && s.IntakeDisposition == LabSpecimenIntakeDisposition.AwaitingReceipt))
            specimen.CancelBeforeReceipt("phase_cancelled");
    }

    public HashSet<Guid> StartingSpecimens()
    {
        var ids = new HashSet<Guid>();
        foreach (var entry in db.ChangeTracker.Entries().Where(x => x.State is EntityState.Added or EntityState.Modified))
        {
            switch (entry.Entity)
            {
                case LabSpecimenAttempt a when a.StartedAtUtc.HasValue &&
                    (entry.State == EntityState.Added || entry.Property(nameof(a.StartedAtUtc)).IsModified):
                    ids.Add(a.LabSpecimenId); break;
                case LabProtocolExecution e when e.LabSpecimenId.HasValue && e.StartedAtUtc.HasValue &&
                    (entry.State == EntityState.Added || entry.Property(nameof(e.StartedAtUtc)).IsModified):
                    ids.Add(e.LabSpecimenId.Value); break;
                case LabAnalysisRun a when entry.State == EntityState.Added:
                    ids.Add(a.LabSpecimenId); break;
                case LabAssemblyJob a when entry.State == EntityState.Added || entry.Property(nameof(a.DispatchRequestedAtUtc)).IsModified:
                    ids.Add(a.LabSpecimenId); break;
                case LabLibrary l when entry.State == EntityState.Added:
                    ids.Add(l.LabSpecimenId); break;
            }
        }
        return ids;
    }

    public async Task<HashSet<Guid>> WriteOrderIdsAsync(IReadOnlyCollection<Guid> starts, CancellationToken ct)
    {
        var result = new HashSet<Guid>();
        var workIds = new HashSet<Guid>();
        var registered = new HashSet<Guid>();
        foreach (var entry in db.ChangeTracker.Entries().Where(x => x.State is EntityState.Added or EntityState.Modified))
        {
            switch (entry.Entity)
            {
                case LabServiceOrder o: result.Add(o.Id); break;
                case LabSample s: result.Add(s.LabServiceOrderId); break;
                case LabJobPhase p: result.Add(p.LabServiceOrderId); break;
                case LabPhasePlanProposal p: result.Add(p.LabServiceOrderId); break;
                case SampleShipment s when s.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder:
                    result.Add(s.AuthorizationSourceId); break;
                case LabSpecimen s: workIds.Add(s.LabWorkOrderId); break;
                case RegisteredSampleTube t: registered.Add(t.Id); break;
                case LabResultRelease r: result.Add(r.LabServiceOrderId); break;
            }
        }
        workIds.UnionWith(await db.LabSpecimens.Where(x => starts.Contains(x.Id)).Select(x => x.LabWorkOrderId).ToListAsync(ct));
        result.UnionWith(await db.LabWorkOrders.Where(x => workIds.Contains(x.Id)
            && x.AuthorizationSource == LabAuthorizationSource.CommercialOrder).Select(x => x.AuthorizationSourceId).ToListAsync(ct));
        if (registered.Count > 0)
            result.UnionWith(await (from slot in db.SampleShipmentTubeSlots
                join item in db.SampleShipmentItems on slot.SampleShipmentItemId equals item.Id
                join shipment in db.SampleShipments on item.SampleShipmentId equals shipment.Id
                where slot.RegisteredSampleTubeId != null && registered.Contains(slot.RegisteredSampleTubeId.Value)
                    && shipment.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder
                select shipment.AuthorizationSourceId).ToListAsync(ct));
        return result;
    }

    public async Task RequireStartsAsync(IReadOnlyCollection<Guid> specimenIds, CancellationToken ct)
    {
        var specimens = await db.LabSpecimens.Where(x => specimenIds.Contains(x.Id)).ToListAsync(ct);
        foreach (var group in specimens.GroupBy(x => x.LabWorkOrderId))
        {
            var work = await db.LabWorkOrders.SingleAsync(x => x.Id == group.Key, ct);
            if (work.AuthorizationSource != LabAuthorizationSource.CommercialOrder) continue;
            var samples = await db.LabSamples.Where(x => x.LabServiceOrderId == work.AuthorizationSourceId).ToListAsync(ct);
            var phases = await db.Set<LabJobPhase>().Where(x => x.LabServiceOrderId == work.AuthorizationSourceId
                && x.SupersededAtUtc == null).OrderBy(x => x.Position).ToListAsync(ct);
            var ids = samples.Select(x => x.Id).ToArray();
            var released = (await new LabJobQuery(db).Releases().Where(x => ids.Contains(x.SampleId)).Select(x => x.SampleId).ToListAsync(ct)).ToHashSet();
            var phaseIds = phases.Select(x => x.Id).ToArray();
            var pending = await db.Set<LabPhaseCancellationRequest>().Where(x => phaseIds.Contains(x.LabJobPhaseId)
                && x.Status == "Pending").Select(x => x.LabJobPhaseId).ToListAsync(ct);
            foreach (var specimen in group)
            {
                var sample = samples.Single(x => x.Id == specimen.SubmittedSpecimenId);
                var phase = phases.SingleOrDefault(x => x.Id == sample.LabJobPhaseId)
                    ?? throw Error("sample_phase_missing", "Assign this sample to the accepted phase plan before processing.");
                if (phase.CancelledAtUtc.HasValue || pending.Contains(phase.Id))
                    throw Error("phase_cancelled_or_pending", "Resolve this phase's cancellation request before starting work.");
                foreach (var predecessor in phases.Where(x => x.Position < phase.Position && x.CancelledAtUtc == null))
                {
                    var members = samples.Where(x => x.LabJobPhaseId == predecessor.Id).ToArray();
                    if (members.Length != predecessor.SampleCount || members.Any(x => !released.Contains(x.Id)))
                        throw Error("previous_phase_not_delivered", "Deliver every required result from the preceding phases before starting this phase.");
                }
                phase.Start(DateTime.UtcNow);
            }
        }
    }

    public async Task RefreshReceiptAsync(Guid orderId, CancellationToken ct)
    {
        var phases = await db.Set<LabJobPhase>().Where(x => x.LabServiceOrderId == orderId && x.SupersededAtUtc == null).ToListAsync(ct);
        phases.AddRange(db.Set<LabJobPhase>().Local.Where(x => x.LabServiceOrderId == orderId && phases.All(p => p.Id != x.Id)));
        var samples = await db.LabSamples.Where(x => x.LabServiceOrderId == orderId).ToListAsync(ct);
        var shipments = await db.SampleShipments.Include(x => x.Items).ThenInclude(x => x.TubeSlots)
            .Where(x => x.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder
                && x.AuthorizationSourceId == orderId && !x.IsPackingPool && x.Status != SampleShipmentStatus.Cancelled).ToListAsync(ct);
        var tubeIds = shipments.SelectMany(x => x.Items).SelectMany(x => x.TubeSlots).Where(x => x.RegisteredSampleTubeId != null)
            .Select(x => x.RegisteredSampleTubeId!.Value).Distinct().ToArray();
        var tubes = await db.RegisteredSampleTubes.Where(x => tubeIds.Contains(x.Id)).ToListAsync(ct);
        var calendar = await db.Set<LabBusinessCalendar>().Include(x => x.Holidays).OrderByDescending(x => x.Revision).FirstOrDefaultAsync(ct);
        foreach (var phase in phases.Where(x => x.CancelledAtUtc == null && x.SupersededAtUtc == null))
        {
            var cohort = samples.Where(x => x.LabJobPhaseId == phase.Id).ToArray();
            var members = cohort.Select(x => x.Id).ToHashSet();
            var items = shipments.SelectMany(x => x.Items).Where(x => members.Contains(x.SubmittedSpecimenId)).ToArray();
            var slots = items.SelectMany(x => x.TubeSlots).ToArray();
            var expectedIds = slots.Where(x => x.RegisteredSampleTubeId != null).Select(x => x.RegisteredSampleTubeId!.Value).Distinct().ToArray();
            var physical = tubes.Where(x => expectedIds.Contains(x.Id)).ToArray();
            var arrivals = physical.Where(x => x.ReceivedAt.HasValue).Select(x => x.ReceivedAt!.Value).ToArray();
            if (arrivals.Length == 0) continue;
            DateTime? complete = members.Count == phase.SampleCount && cohort.All(sample => items.Where(x => x.SubmittedSpecimenId == sample.Id).Sum(x => x.TubeSlots.Count) == sample.Quantity)
                && slots.Length == expectedIds.Length && physical.Length == slots.Length && arrivals.Length == slots.Length ? arrivals.Max() : null;
            DateTime? due = null;
            if (complete.HasValue && phase.TurnaroundBusinessDays.HasValue && calendar != null)
            {
                try { due = LabForecastClock.AddDays(complete.Value, phase.TurnaroundBusinessDays.Value, LabDayBasis.Business, calendar); }
                catch (LabForecastCalendarException) { /* Receipt remains retained until calendar coverage is corrected. */ }
            }
            phase.RecordReceipt(arrivals.Min(), complete, due, due.HasValue ? calendar?.Id : null, due.HasValue ? calendar?.Revision : null);
        }
    }

    public async Task RecordDeliveryAsync(Guid orderId, IReadOnlyDictionary<Guid, DateTime> covered, CancellationToken ct)
    {
        var phases = await db.Set<LabJobPhase>().Where(x => x.LabServiceOrderId == orderId
            && x.SupersededAtUtc == null && x.CancelledAtUtc == null).ToListAsync(ct);
        var samples = await db.LabSamples.Where(x => x.LabServiceOrderId == orderId).ToListAsync(ct);
        foreach (var phase in phases)
        {
            var ids = samples.Where(x => x.LabJobPhaseId == phase.Id).Select(x => x.Id).ToArray();
            if (ids.Length == phase.SampleCount && ids.All(covered.ContainsKey)) phase.RecordDelivery(ids.Max(id => covered[id]));
        }
    }

    public static OrderManagementException Error(string code, string message) => new(code, message, 409);
}
