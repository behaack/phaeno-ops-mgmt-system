namespace PhaenoPortal.App.Features.FileManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record GovernedResultRetention(bool IsDownloadAvailable, string? State,
    ReleasedDeliverableRetentionDto? Retention, DateTime? AdmissionCutoffAtUtc);

public sealed class GovernedResultRetentionService(PSeqOperationsDbContext db)
{
    public async Task<IReadOnlyDictionary<Guid, GovernedResultRetention>> ReadAsync(
        IReadOnlyCollection<ResultOutputPackage> packages, IReadOnlyCollection<ResultArtifact> artifacts,
        DateTime utcNow, CancellationToken cancellationToken)
    {
        var ids = packages.Select(package => package.Id).ToList();
        if (ids.Count == 0) return new Dictionary<Guid, GovernedResultRetention>();
        var schedules = await db.ResultRetentionSchedules.AsNoTracking()
            .Where(schedule => ids.Contains(schedule.ResultOutputPackageId))
            .ToDictionaryAsync(schedule => schedule.ResultOutputPackageId, cancellationToken);
        var snapshotIds = schedules.Values.Where(schedule => schedule.RetentionSnapshotId.HasValue)
            .Select(schedule => schedule.RetentionSnapshotId!.Value).ToList();
        var snapshots = await db.ReleasedDeliverableRetentionSnapshots.AsNoTracking()
            .Where(snapshot => snapshotIds.Contains(snapshot.Id)).ToDictionaryAsync(snapshot => snapshot.Id, cancellationToken);
        var attempts = await db.OperationalFileDownloads.AsNoTracking()
            .Where(attempt => attempt.ReleasedPackageType == ReleasedDeliverablePackageType.PSeqResult
                && ids.Contains(attempt.ReleasedPackageId)).ToListAsync(cancellationToken);
        var governedIds = schedules.Values.Where(value => value.RetentionSnapshotId.HasValue).Select(value => value.ResultOutputPackageId).ToHashSet();
        var committed = await new DownloadCommitEvidenceService(db).ReadCompletionsAsync(
            attempts.Where(value => governedIds.Contains(value.ReleasedPackageId)).ToList(), cancellationToken);
        return packages.ToDictionary(package => package.Id, package =>
        {
            var files = artifacts.Where(artifact => artifact.ResultOutputPackageId == package.Id).ToList();
            var packageAvailable = package.State == ResultOutputPackageState.Released
                && files.Count == package.ExpectedArtifactCount
                && files.All(artifact => artifact.ScanState == ResultArtifactScanState.Clean && !artifact.DeletedAtUtc.HasValue);
            schedules.TryGetValue(package.Id, out var schedule);
            if (schedule?.RetentionSnapshotId is not Guid snapshotId)
                return new GovernedResultRetention(packageAvailable && (schedule?.AllowsLegacyDownload(utcNow) ?? true),
                    schedule is null ? null : schedule.AllowsLegacyDownload(utcNow) ? schedule.State.ToString()
                        : schedule.State is ResultRetentionState.Deleted or ResultRetentionState.Reissued ? schedule.State.ToString() : "Cutoff", null, schedule?.CutoffAtUtc);
            if (!snapshots.TryGetValue(snapshotId, out var snapshot) || snapshot.OrganizationId != package.OrganizationId)
                throw new InvalidOperationException("The governed package retention snapshot is unavailable.");
            var download = ReleasedDeliverableDownloadProjection.Create(files.Select(file => file.Id).ToList(),
                attempts.Where(attempt => attempt.ReleasedPackageId == package.Id && attempt.OrganizationId == package.OrganizationId).ToList(), utcNow, committed);
            var decision = ReleasedDeliverableRetentionDecision.Evaluate(snapshot,
                download.Files.Values.Select(file => file.DownloadedAtUtc).ToList(), utcNow);
            var terminal = schedule.State is ResultRetentionState.Deleted or ResultRetentionState.Reissued;
            var state = terminal ? schedule.State.ToString() : decision.DownloadAccessClosedAtUtc.HasValue ? "Cutoff"
                : decision.GraceActivatedAtUtc.HasValue ? "Grace" : decision.ShowUndownloadedWarning ? "WarningDue" : "Active";
            return new GovernedResultRetention(packageAvailable && !snapshot.IsQuarantined && !terminal && decision.IsDownloadAvailable, state,
                snapshot.ToDto(download) with { GraceActivatedAtUtc = decision.GraceActivatedAtUtc,
                    DownloadAccessClosedAtUtc = decision.DownloadAccessClosedAtUtc }, decision.DeletionDueAtUtc);
        });
    }
}
