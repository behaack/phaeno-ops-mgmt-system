namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabInvestigationDeliveryHistory(PSeqOperationsDbContext db)
{
    public async Task<IReadOnlyCollection<Guid>> ReadAsync(LabWorkOrder work, LabSpecimen specimen, Dictionary<string, object> evidence,
        List<string> limited, int limit, CancellationToken ct)
    {
        var people = new HashSet<Guid>();
        async Task<List<T>> Read<T>(string key, IQueryable<T> query)
        {
            var rows = await query.Take(limit + 1).ToListAsync(ct);
            if (rows.Count > limit) { limited.Add(key); rows.RemoveAt(limit); }
            evidence[key] = rows;
            return rows;
        }
        var packages = db.ResultOutputPackages.Where(p => p.LabWorkOrderId == work.Id && p.OrganizationId == work.SubmittingOrganizationId
            && (p.LabSampleId == specimen.SubmittedSpecimenId || p.TrialSampleId == specimen.SubmittedSpecimenId)).Select(p => p.Id);
        var artifacts = db.ResultArtifacts.Where(a => packages.Contains(a.ResultOutputPackageId)).Select(a => a.Id);
        var releases = db.LabResultReleases.Where(r => r.OrganizationId == work.SubmittingOrganizationId && r.LabSampleId == specimen.SubmittedSpecimenId).Select(r => r.Id);
        var managedFiles = db.ManagedOperationalFiles.Where(f => f.OrganizationId == work.SubmittingOrganizationId
            && f.ParentRecordId == specimen.SubmittedSpecimenId && f.WorkflowId == work.AuthorizationSourceId).Select(f => f.Id);
        var trialFiles = db.TrialResultFiles.Where(f => f.TrialSampleId == specimen.SubmittedSpecimenId && packages.Contains(f.ResultOutputPackageId)).Select(f => f.ManagedOperationalFileId);
        var trialReleaseIds = new List<Guid>();
        if (work.AuthorizationSource == LabAuthorizationSource.TrialProject)
        {
            var candidates = await db.TrialResultReleases.AsNoTracking().Where(r => r.OrganizationId == work.SubmittingOrganizationId && r.TrialProjectId == work.AuthorizationSourceId)
                .OrderBy(r => r.ReleaseVersion).Take(limit + 1).ToListAsync(ct);
            if (candidates.Count > limit) { limited.Add("trialReleases"); candidates.RemoveAt(limit); }
            var fileIds = await trialFiles.OrderBy(id => id).Take(limit + 1).ToListAsync(ct);
            if (fileIds.Count > limit) { limited.Add("trialFiles"); fileIds.RemoveAt(limit); }
            // A corrupt manifest is an unavailable source, never an empty history.
            foreach (var candidate in candidates) { using var manifest = JsonDocument.Parse(candidate.ManifestJson); if (!manifest.RootElement.TryGetProperty("files", out var files) || files.ValueKind != JsonValueKind.Array) throw new InvalidOperationException("A Trial release manifest could not be read."); }
            var matching = candidates.Where(r => ReleasedDeliverableManifest.ReadFileIds(r.ManifestJson).Any(fileIds.Contains)).ToArray();
            trialReleaseIds.AddRange(matching.Select(r => r.Id));
            people.UnionWith(matching.Select(r => r.ReleasedByUserId));
            evidence["trialReleases"] = matching.Select(r => new { r.Id, r.ReleaseVersion, r.ReleasedAtUtc, r.ReleasedByUserId, r.IsCompletePackage, r.IsWithdrawn, r.SupersedesReleaseId,
                scope = "Shared Trial release containing this sample; other sample files are omitted." }).ToArray();
        }
        var delivery = await Read("delivery", db.ResultDeliveryEvidence.AsNoTracking().Where(d => packages.Contains(d.ResultOutputPackageId)
            && (!d.ResultArtifactId.HasValue || artifacts.Contains(d.ResultArtifactId.Value))).OrderBy(d => d.OccurredAtUtc).ThenBy(d => d.Id)
            .Select(d => new { d.Id, d.ResultOutputPackageId, d.ResultArtifactId, d.Kind, d.ActorUserId, d.OccurredAtUtc }));
        var downloads = db.OperationalFileDownloads.AsNoTracking().Where(d => d.OrganizationId == work.SubmittingOrganizationId
            && (d.ReleasedPackageType == ReleasedDeliverablePackageType.PSeqResult && packages.Contains(d.ReleasedPackageId) && d.ResultArtifactId.HasValue && artifacts.Contains(d.ResultArtifactId.Value)
                || d.ReleasedPackageType == ReleasedDeliverablePackageType.LabResult && releases.Contains(d.ReleasedPackageId) && d.ManagedOperationalFileId.HasValue && managedFiles.Contains(d.ManagedOperationalFileId.Value)
                || d.ReleasedPackageType == ReleasedDeliverablePackageType.TrialResult && trialReleaseIds.Contains(d.ReleasedPackageId) && d.ManagedOperationalFileId.HasValue && trialFiles.Contains(d.ManagedOperationalFileId.Value)));
        var downloadRows = await Read("downloads", downloads.OrderBy(d => d.StartedAtUtc).ThenBy(d => d.Id).Select(d => new { d.Id, d.TransferId, d.ReleasedPackageId,
            d.ManagedOperationalFileId, d.ResultArtifactId, d.UserId, d.Scope, d.StartedAtUtc, d.CompletedAtUtc, d.TerminalAtUtc,
            d.Outcome, d.TerminalReasonCode, d.CountsForReleasedPackageRetention }));
        var downloadIds = downloads.Select(d => d.Id);
        await Read("downloadCommitEvidence", db.OperationalDownloadCommitEvidence.AsNoTracking().Where(d => downloadIds.Contains(d.OperationalFileDownloadId))
            .OrderBy(d => d.RecordedAtUtc).ThenBy(d => d.Id).Select(d => new { d.Id, d.OperationalFileDownloadId, d.Phase, d.RecordedAtUtc, d.CommittedAtUtc, d.ObservedAtUtc, d.AdmissionCutoffAtUtc }));
        var schedules = db.ResultRetentionSchedules.AsNoTracking().Where(s => packages.Contains(s.ResultOutputPackageId));
        await Read("retentionSchedules", schedules.OrderBy(s => s.Id).Select(s => new { s.Id, s.ResultOutputPackageId, s.RetentionSnapshotId, s.State, s.WarningAtUtc, s.CutoffAtUtc, s.GraceEndsAtUtc, s.DeleteAtUtc, s.LastProcessedAtUtc }));
        var scheduledSnapshots = schedules.Where(s => s.RetentionSnapshotId.HasValue).Select(s => s.RetentionSnapshotId!.Value);
        var snapshots = db.ReleasedDeliverableRetentionSnapshots.AsNoTracking().Where(s => s.OrganizationId == work.SubmittingOrganizationId
            && (s.LabResultReleaseId.HasValue && releases.Contains(s.LabResultReleaseId.Value) || scheduledSnapshots.Contains(s.Id)
                || s.TrialResultReleaseId.HasValue && trialReleaseIds.Contains(s.TrialResultReleaseId.Value)));
        await Read("retention", snapshots.OrderBy(s => s.ReleasedAtUtc).ThenBy(s => s.Id).Select(s => new { s.Id, s.LabResultReleaseId, s.TrialResultReleaseId,
            s.GlobalPolicyRevision, s.OrganizationPolicyOverrideRevision, s.StandardRetentionDays, s.UndownloadedWarningLeadDays, s.UndownloadedGraceDays,
            s.ReleasedAtUtc, s.WarningAtUtc, s.StandardDeletionAtUtc, s.PotentialFinalDeletionAtUtc, s.WarningCheckpointAtUtc, s.WarningCheckpointOutcome,
            s.StandardCheckpointAtUtc, s.GraceActivatedAtUtc, s.DownloadAccessClosedAtUtc, s.ByteDeletedAtUtc, s.DeletionOutcome,
            s.IsQuarantined, s.DeletionAttemptCount, s.LastDeletionAttemptAtUtc, s.NextDeletionAttemptAtUtc }));
        var snapshotIds = snapshots.Select(s => s.Id);
        var holds = await Read("preservationHolds", db.ReleasedDeliverablePreservationHolds.AsNoTracking().Where(h => snapshotIds.Contains(h.RetentionSnapshotId))
            .OrderBy(h => h.PlacedAtUtc).ThenBy(h => h.Id).Select(h => new { h.Id, h.RetentionSnapshotId, h.Kind, h.PlacedByUserId, h.PlacedAtUtc, h.Reason, h.ReleasedByUserId, h.ReleasedAtUtc, h.ReleaseReason }));
        var reissues = await Read("reissues", db.ReleasedDeliverableReissues.AsNoTracking().Where(r => snapshotIds.Contains(r.OriginalSnapshotId) && snapshotIds.Contains(r.ReplacementSnapshotId))
            .OrderBy(r => r.AuthorizedAtUtc).ThenBy(r => r.Id).Select(r => new { r.Id, r.OriginalSnapshotId, r.ReplacementSnapshotId, r.AuthorizedByUserId, r.AuthorizedAtUtc, r.Reason }));
        people.UnionWith(delivery.Where(d => d.ActorUserId.HasValue).Select(d => d.ActorUserId!.Value));
        people.UnionWith(downloadRows.Select(d => d.UserId));
        people.UnionWith(holds.Select(h => h.PlacedByUserId));
        people.UnionWith(holds.Where(h => h.ReleasedByUserId.HasValue).Select(h => h.ReleasedByUserId!.Value));
        people.UnionWith(reissues.Select(r => r.AuthorizedByUserId));
        return people;
    }
}
