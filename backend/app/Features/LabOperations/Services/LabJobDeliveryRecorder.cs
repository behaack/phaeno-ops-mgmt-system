namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

// Called only by result publication/withdrawal actions, before their existing
// SaveChanges. The work update and publication commit atomically; concurrent
// publications must pass the work's existing optimistic concurrency check.
public sealed class LabJobDeliveryRecorder(PSeqOperationsDbContext db)
{
    public async Task RecordAsync(Guid workId, IReadOnlyList<LabJobRelease> newlyPublished, CancellationToken token)
    {
        var work = await db.LabWorkOrders.Include(w => w.Specimens).SingleAsync(w => w.Id == workId, token);
        var roster = work.Specimens.Where(s => s.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled)
            .Select(s => s.SubmittedSpecimenId).ToHashSet();
        if (roster.Count > 0 && work.FirstDeliveredAtUtc == null)
        {
            var releases = await new LabJobQuery(db).Releases().Where(r => roster.Contains(r.SampleId)).ToListAsync(token);
            var previouslyCovered = releases.Select(r => r.SampleId).ToHashSet();
            // Historical complete coverage proves delivery, not its first timestamp.
            // Only capture a newly observed transition to full coverage.
            if (roster.All(previouslyCovered.Contains)) { work.AdvanceProjectionVersion(); return; }
            var published = newlyPublished.Where(r => roster.Contains(r.SampleId)).ToList();
            var progress = new LabSequencingRunProgress(db);
            var allocations = await progress.AllocationsAsync(workId, token);
            var analysisRuns = await progress.AnalysisRunsAsync(workId, token);
            foreach (var allocation in allocations.Where(p => p.Value > 1 && roster.Contains(p.Key)))
            {
                // Track the caller's pending publication in the same transaction. File versions
                // and reanalyses contribute the same purchased run only once.
                var results = await db.LabResultReleases.Where(r => r.LabSampleId == allocation.Key).ToListAsync(token);
                results.AddRange(db.LabResultReleases.Local.Where(r => r.LabSampleId == allocation.Key && results.All(x => x.Id != r.Id)));
                var runDates = results.Where(r => r.ReleaseStatus == PhaenoPortal.App.Features.OrderManagement.Domain.FileReleaseStatus.Released
                        && r.ReleasedAt != null && r.LabAnalysisRunId.HasValue && analysisRuns.ContainsKey(r.LabAnalysisRunId.Value))
                    .SelectMany(r => analysisRuns[r.LabAnalysisRunId!.Value].Select(number => new { Number = number, Date = r.ReleasedAt!.Value }))
                    .GroupBy(r => r.Number).ToDictionary(g => g.Key, g => g.Min(r => r.Date));
                published.RemoveAll(r => r.SampleId == allocation.Key);
                if (Enumerable.Range(1, allocation.Value).All(runDates.ContainsKey))
                    published.Add(new(allocation.Key, Enumerable.Range(1, allocation.Value).Max(number => runDates[number])));
            }
            releases.AddRange(published);
            var first = releases.Where(r => r.ReleasedAtUtc != null).GroupBy(r => r.SampleId)
                .ToDictionary(g => g.Key, g => g.Min(r => r.ReleasedAtUtc!.Value));
            if (roster.All(first.ContainsKey)) work.RecordFirstDelivery(roster.Max(id => first[id]));
        }
        work.AdvanceProjectionVersion();
    }

    public async Task RecordCommercialAsync(Guid orderId, IReadOnlyList<LabJobRelease> published, CancellationToken token)
    {
        var ids = await db.LabWorkOrders.Where(w => w.AuthorizationSource == LabAuthorizationSource.CommercialOrder
            && w.AuthorizationSourceId == orderId).Select(w => w.Id).ToListAsync(token);
        foreach (var id in ids.Order()) await RecordAsync(id, published, token);
    }
}
