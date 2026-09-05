namespace PhaenoPortal.App.Features.Trials.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Trials.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;
using static TrialAccess;

public sealed class TrialResultService(PSeqOperationsDbContext db, TrialWorkflowService workflow,
    IOptions<PSeqOrderToCashOptions> pseq, IOptions<OrderManagementOptions> options)
{
    public async Task<IReadOnlyList<ResultPackageDto>> CandidatesAsync(TrialProject trial, TrialActor actor, CancellationToken token)
    {
        RequireStaff(actor);
        var packages = await db.ResultOutputPackages.AsNoTracking().Where(value => value.TrialProjectId == trial.Id).OrderByDescending(value => value.CreatedAt).ToListAsync(token);
        var ids = packages.Select(value => value.Id).ToArray();
        var artifacts = await db.ResultArtifacts.AsNoTracking().Where(value => ids.Contains(value.ResultOutputPackageId)).ToListAsync(token);
        return packages.Select(value => PSeqResultPipelineController.Map(value, artifacts.Where(artifact => artifact.ResultOutputPackageId == value.Id)
            .Select(artifact => new ResultArtifactDto(artifact.Id, artifact.LogicalRole, artifact.FileName, artifact.ContentType, artifact.SizeBytes,
                artifact.Sha256, artifact.ScanState.ToString(), artifact.ScanCompletedAtUtc, artifact.DeletedAtUtc)).ToList())).ToList();
    }
    public async Task ReleaseAsync(TrialProject trial, TrialActor actor, TrialReleaseRequest request, CancellationToken token)
    {
        RequireStaff(actor); Version(trial.Version, request.Version); TrialRules.Text(request.Reason);
        if (!pseq.Value.GovernedPSeqResults || pseq.Value.ValidateGovernedResults().Count > 0 || !options.Value.ReleasedDeliverableRetentionEnforcement)
            throw Error("trial_result_configuration_required", "Governed PSeq results and completion-aware retention must be ready before Trial results can be released.", 409);
        if (trial.IsOnHold || !trial.OrganizationId.HasValue || trial.ApprovedScopeRevision != trial.CurrentScopeRevision
            || trial.AcceptedScopeRevision != trial.ApprovedScopeRevision || trial.IsTerminal && !(trial.Status == TrialStatus.Completed && request.SupersedesReleaseId.HasValue))
            throw Error("trial_release_unavailable", "Release results only for accepted, approved Trial work without a hold, or an authorized replacement of a completed package.", 409);
        if (request.OutputPackageIds is null || request.OutputPackageIds.Count == 0 || request.OutputPackageIds.Distinct().Count() != request.OutputPackageIds.Count)
            throw Error("trial_result_selection_required", "Select the complete set of distinct output packages to release.");
        var packages = await db.ResultOutputPackages.Where(value => request.OutputPackageIds.Contains(value.Id) && value.TrialProjectId == trial.Id
            && value.OrganizationId == trial.OrganizationId).ToListAsync(token);
        if (packages.Count != request.OutputPackageIds.Count || packages.Select(value => value.TrialSampleId).Distinct().Count() != packages.Count)
            throw Error("trial_result_scope_invalid", "Select one output package per sample from this Trial.");
        var scope = trial.CurrentScope().Read(); var now = DateTime.UtcNow;
        var files = new List<ManagedOperationalFile>();
        foreach (var package in packages)
        {
            var sample = trial.Samples.SingleOrDefault(value => value.Id == package.TrialSampleId && value.LabWorkOrderId == package.LabWorkOrderId) ?? throw Missing();
            var canReuseReleased = package.State == ResultOutputPackageState.Released && request.CompletePackage && !request.SupersedesReleaseId.HasValue;
            if (package.State != ResultOutputPackageState.ReadyForRelease && !canReuseReleased || !package.ScientificApprovalId.HasValue
                || !await db.LabWorkOrders.AnyAsync(value => value.Id == package.LabWorkOrderId && value.Status == LabWorkOrderStatus.ReadyForRelease, token)
                || !await db.LabScientificApprovals.AnyAsync(value => value.Id == package.ScientificApprovalId && value.LabWorkOrderId == package.LabWorkOrderId
                    && value.ResultOutputPackageId == package.Id, token)
                || await db.LabExceptions.AnyAsync(value => value.LabWorkOrderId == package.LabWorkOrderId && value.IsBlocking && value.Status == LabExceptionStatus.Open, token))
                throw Error("trial_scientific_release_not_ready", "Every selected package needs current scientific approval and resolved blocking exceptions.", 409);
            var artifacts = await db.ResultArtifacts.Where(value => value.ResultOutputPackageId == package.Id).ToListAsync(token);
            if (artifacts.Count != package.ExpectedArtifactCount || artifacts.Any(value => value.ScanState != ResultArtifactScanState.Clean || value.DeletedAtUtc.HasValue)
                || scope.Deliverables.Any(expected => !artifacts.Any(value => value.LogicalRole.Equals(expected.Key, StringComparison.OrdinalIgnoreCase)))
                || artifacts.Any(value => !scope.Deliverables.Any(expected => value.LogicalRole.Equals(expected.Key, StringComparison.OrdinalIgnoreCase))))
                throw Error("trial_result_manifest_incomplete", "Each selected package must contain every approved deliverable, with clean scans and matching checksums, and no unapproved deliverable roles.", 409);
            foreach (var artifact in artifacts)
            {
                var binding = await db.TrialResultFiles.SingleOrDefaultAsync(value => value.ResultArtifactId == artifact.Id, token);
                ManagedOperationalFile file;
                if (binding is null)
                {
                    file = new(trial.OrganizationId.Value, "trial-project", trial.Id, sample.Id, OperationalFilePurpose.TrialResult,
                        artifact.FileName, artifact.LogicalRole, artifact.ContentType, artifact.SizeBytes, artifact.Sha256, artifact.ObjectStorageKey);
                    file.RecordScan(OperationalFileScanStatus.Clean, "Verified by the governed PSeq pipeline scan."); file.Release(now);
                    db.ManagedOperationalFiles.Add(file); db.TrialResultFiles.Add(new(sample.Id, package.Id, artifact.Id, file.Id));
                }
                else file = await db.ManagedOperationalFiles.SingleAsync(value => value.Id == binding.ManagedOperationalFileId, token);
                if (file.ReleaseStatus != FileReleaseStatus.Released || file.ScanStatus != OperationalFileScanStatus.Clean)
                    throw Error("trial_result_file_unavailable", "A selected file was withdrawn or quarantined. Transfer and approve a replacement package.", 409);
                files.Add(file);
            }
            if (!canReuseReleased) package.Release(actor.User.Id, now);
            sample.RecordReleased();
        }
        if (request.CompletePackage)
        {
            var replaced = trial.Samples.Where(value => value.ReplacesSampleId.HasValue).Select(value => value.ReplacesSampleId!.Value).ToHashSet();
            if (trial.Samples.Any(value => !replaced.Contains(value.Id) && !packages.Any(package => package.TrialSampleId == value.Id)))
                throw Error("trial_complete_package_incomplete", "Include results for every submitted sample, using approved replacements where applicable.", 409);
        }
        TrialResultRelease? superseded = null;
        if (request.SupersedesReleaseId.HasValue)
        {
            superseded = await db.TrialResultReleases.SingleOrDefaultAsync(value => value.Id == request.SupersedesReleaseId && value.TrialProjectId == trial.Id && value.IsCompletePackage, token) ?? throw Missing();
            if (!request.CompletePackage || !await db.ReleasedDeliverableRetentionSnapshots.AnyAsync(value => value.TrialResultReleaseId == superseded.Id && value.ByteDeletedAtUtc != null, token))
                throw Error("trial_reissue_not_ready", "Reissue requires a complete replacement after the original package's byte deletion.", 409);
            var oldIds = ReleasedDeliverableManifest.ReadFileIds(superseded.ManifestJson);
            var originalPackages = await db.TrialResultFiles.Where(value => oldIds.Contains(value.ManagedOperationalFileId)).Select(value => value.ResultOutputPackageId).Distinct().ToListAsync(token);
            if (packages.Any(value => !value.CorrectsPackageId.HasValue || !originalPackages.Contains(value.CorrectsPackageId.Value)))
                throw Error("trial_reissue_lineage_invalid", "Every replacement output must explicitly correct a package from the deleted Trial release.", 409);
            var oldKeys = await db.ManagedOperationalFiles.Where(value => oldIds.Contains(value.Id)).Select(value => value.StorageKey).ToListAsync(token);
            if (files.Any(value => oldKeys.Contains(value.StorageKey))) throw Error("trial_reissue_reuses_source", "Reissue must use newly transferred storage objects.", 409);
        }
        var version = await db.TrialResultReleases.CountAsync(value => value.TrialProjectId == trial.Id, token) + 1;
        var manifest = JsonSerializer.Serialize(new { trialId = trial.Id, scopeRevision = trial.CurrentScopeRevision, termsVersion = TrialRules.TermsVersion,
            intendedUse = TrialRules.RuoStatement, outputPackageIds = packages.Select(value => value.Id),
            files = files.Select(value => new { id = value.Id, value.FileName, value.FileKind, value.SizeBytes, value.Sha256, sampleId = value.ParentRecordId }) });
        var release = new TrialResultRelease(trial.Id, trial.OrganizationId.Value, trial.DepartmentId!.Value, version, trial.CurrentScopeRevision,
            manifest, request.CompletePackage, actor.User.Id, now, superseded?.Id);
        db.TrialResultReleases.Add(release);
        if (request.CompletePackage)
        {
            var global = await db.ReleasedDeliverablePolicyDefaults.SingleOrDefaultAsync(value => value.IsActive, token)
                ?? throw Error("trial_retention_policy_required", "Configure the global released-file policy before release.", 409);
            var organizationOverride = await db.OrganizationReleasedDeliverablePolicyOverrides.SingleOrDefaultAsync(value => value.OrganizationId == trial.OrganizationId && value.IsActive, token);
            var snapshot = ReleasedDeliverableRetentionSnapshot.ForTrialResult(trial.OrganizationId.Value, release.Id, global, organizationOverride, now);
            var tubeIds = await (from slot in db.SampleShipmentTubeSlots.AsNoTracking()
                join item in db.SampleShipmentItems on slot.SampleShipmentItemId equals item.Id
                join shipment in db.SampleShipments on item.SampleShipmentId equals shipment.Id
                where shipment.AuthorizationSourceId == trial.Id select slot.RegisteredSampleTubeId).ToListAsync(token);
            var barcodes = await db.RegisteredSampleTubes.Where(value => tubeIds.Contains(value.Id)).Select(value => value.SupplierBarcode).Distinct().Order().ToListAsync(token);
            snapshot.CaptureReceiptLineage(JsonSerializer.Serialize(new ReleasedReceiptLineage("Trial Project", trial.Samples.Select(value => value.Reference).ToList(), barcodes, null)));
            db.ReleasedDeliverableRetentionSnapshots.Add(snapshot);
            if (superseded is null) trial.Complete(release.Id, now);
            else
            {
                var original = await db.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.TrialResultReleaseId == superseded.Id, token);
                db.ReleasedDeliverableReissues.Add(new(original.Id, snapshot.Id, actor.User.Id, request.Reason, now));
                trial.RecordReissue(release.Id);
            }
        }
        workflow.Record(trial, actor, "ResultsReleased", request.CompletePackage ? "The complete approved Trial result package is available." : "Partial Trial results are available; the complete-package retention period has not started.", new { release.Id, request.Reason });
        workflow.Notice(trial, "trial-results-released", "Trial results available", request.CompletePackage ? "Your complete Trial result package is ready. Its download period starts with this release." : "A partial Trial result package is ready. The complete-package download period has not started.");
    }
}
