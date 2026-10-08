namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

// Purchased sample-run allocations are independent of preparation attempts, files and analyses.
public sealed class LabSequencingRunProgress(PSeqOperationsDbContext db)
{
    public async Task<Dictionary<Guid, int>> AllocationsAsync(Guid workId, CancellationToken ct)
    {
        var snapshot = await db.LabWorkAuthorizationVersions.AsNoTracking().Where(a => a.LabWorkOrderId == workId)
            .OrderByDescending(a => a.AuthorizationVersion).Select(a => a.SnapshotJson).FirstOrDefaultAsync(ct);
        var counts = new Dictionary<Guid, int>();
        if (snapshot is null) return counts;
        using var document = JsonDocument.Parse(snapshot);
        var root = document.RootElement;
        if (root.TryGetProperty("replacementAuthorization", out var replacement)) root = replacement;
        if (root.TryGetProperty("specimens", out var specimens))
            foreach (var specimen in specimens.EnumerateArray())
                if (specimen.TryGetProperty("submittedSpecimenId", out var id) && id.TryGetGuid(out var guid))
                    counts[guid] = specimen.TryGetProperty("sequencingRunCount", out var value) ? value.GetInt32() : 1;
        return counts;
    }

    public async Task<Dictionary<Guid, HashSet<int>>> AnalysisRunsAsync(Guid workId, CancellationToken ct)
    {
        var rows = await (from input in db.LabAnalysisInputs.AsNoTracking()
            join output in db.LabSequencingOutputs.AsNoTracking() on input.LabSequencingOutputId equals output.Id
            where output.LabWorkOrderId == workId
            select new { input.LabAnalysisRunId, Number = output.SequencingRunNumber ?? 1 }).ToListAsync(ct);
        return rows.GroupBy(r => r.LabAnalysisRunId).Where(g => g.Select(r => r.Number).Distinct().Count() == 1)
            .ToDictionary(g => g.Key, g => g.Select(r => r.Number).ToHashSet());
    }

    public async Task<Dictionary<Guid, int>> ApprovedCountsAsync(Guid workId, CancellationToken ct)
    {
        var packages = await db.ResultOutputPackages.Where(p => p.LabWorkOrderId == workId).ToListAsync(ct);
        packages.AddRange(db.ResultOutputPackages.Local.Where(p => p.LabWorkOrderId == workId && packages.All(x => x.Id != p.Id)));
        var runs = await AnalysisRunsAsync(workId, ct);
        return packages.Where(p => p.ScientificApprovalId.HasValue
                && p.State is ResultOutputPackageState.ReadyForRelease or ResultOutputPackageState.Released)
            .GroupBy(p => (p.LabSampleId ?? p.TrialSampleId)!.Value)
            .ToDictionary(g => g.Key, g => Count(g.Select(p => p.LabAnalysisRunId), runs));
    }

    public static int Count(IEnumerable<Guid?> analyses, IReadOnlyDictionary<Guid, HashSet<int>> runs) =>
        analyses.Where(id => id.HasValue && runs.TryGetValue(id.Value, out var allocations) && allocations.Count == 1)
            .SelectMany(id => runs[id!.Value]).Distinct().Count();
}
