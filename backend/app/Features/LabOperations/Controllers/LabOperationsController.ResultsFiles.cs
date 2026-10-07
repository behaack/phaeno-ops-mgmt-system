namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    private async Task<List<VendorResultsFastqSetSnapshot>> PrepareResultFiles(LabNgsSendout sendout, RecordVendorResultsRequest request,
        IReadOnlyList<Guid> successful, CancellationToken ct)
    {
        if (request.FastqSetIds is null || request.FastqSetIds.Distinct().Count() != request.FastqSetIds.Count
            || request.FastqSetIds.Count != successful.Count) throw Invalid("fastq_coverage_required", "Select one complete verified FASTQ file set for each successful library.");
        if (successful.Count > 0 && !request.FilesConfirmed) throw Invalid("fastq_mapping_confirmation_required", "Confirm all vendor files are present and correctly mapped before saving results.");
        // Upload creation and ZIP import use these same locks. Hold them through sealing/commit.
        foreach (var id in request.FastqSetIds.Order())
            await SampleShippingPackingData.LockAsync(dbContext, "fastq-set:" + id, ct);
        LabVendorResultsDraft? draft = null;
        if (request.DraftId.HasValue) {
            var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
            draft = await RequireResultsDraft(request.DraftId.Value, actor.User.Id, ct);
            if (draft.LabNgsSendoutId != sendout.Id || request.RequestId != draft.Id || request.DraftVersion != draft.Version)
                throw Conflict("results_draft_changed", "Reload the draft and review its current result/file mappings before saving.");
        }
        var latest = await dbContext.LabVendorResultsVersions.AsNoTracking().Where(v => v.LabNgsSendoutId == sendout.Id).OrderByDescending(v => v.ResultVersion).FirstOrDefaultAsync(ct);
        var previous = latest is null ? null : JsonSerializer.Deserialize<VendorResultsSnapshot>(latest.SnapshotJson, JsonOptions)!;
        var priorSets = previous?.FastqSets ?? [];
        var recovered = draft is null ? [] : ResultsDraftRecoveryIds(draft.PayloadJson);
        if (draft is not null && recovered.Length > 0) recovered = await (from set in dbContext.Set<LabFastqSet>().AsNoTracking()
            join source in dbContext.Set<LabVendorResultsDraft>() on set.LabVendorResultsDraftId equals source.Id
            where recovered.Contains(set.Id) && set.RecordedByUserId == draft.UserId
                && source.UserId == draft.UserId && source.LabNgsSendoutId == sendout.Id select set.Id).ToArrayAsync(ct);
        var sets = await dbContext.Set<LabFastqSet>().Where(s => request.FastqSetIds.Contains(s.Id)).ToListAsync(ct);
        if (sets.Count != successful.Count || sets.Select(s => s.LabBatchMemberId).Distinct().Count() != successful.Count
            || sets.Any(s => !successful.Contains(s.LabBatchMemberId) || (s.LabVendorResultsVersionId.HasValue
                ? !priorSets.Any(p => p.SetId == s.Id) : draft is null || s.LabVendorResultsDraftId != draft.Id && !recovered.Contains(s.Id))))
            throw Invalid("fastq_scope_invalid", "Use this draft's verified files or the current result's retained file sets, for successful libraries only.");
        var snapshots = new List<VendorResultsFastqSetSnapshot>();
        var archiveEntries = new HashSet<(Guid ArchiveId, int EntryIndex)>();
        foreach (var set in sets.OrderBy(s => s.LabBatchMemberId)) {
            var uploads = await dbContext.Set<LabFastqUpload>().AsNoTracking().Where(u => u.LabFastqSetId == set.Id).OrderBy(u => u.GroupNumber).ThenBy(u => u.PartNumber).ThenBy(u => u.ReadNumber).ToListAsync(ct);
            var policy = JsonSerializer.Deserialize<LabFastqOptions>(set.PolicyJson, JsonOptions)!;
            LabFastqValidation.RequireComplete(set, uploads, policy);
            if (uploads.Where(u => u.LabFastqArchiveId.HasValue).Any(u => !u.ArchiveEntryIndex.HasValue
                || !archiveEntries.Add((u.LabFastqArchiveId!.Value, u.ArchiveEntryIndex!.Value))))
                throw Invalid("fastq_archive_duplicate_mapping", "A ZIP entry cannot supply two selected libraries or file sets. Review the batch mappings.");
            var fileIds = uploads.Select(u => u.LabScientificFileId!.Value).ToArray();
            var files = await dbContext.LabScientificFiles.AsNoTracking().Where(f => fileIds.Contains(f.Id)
                && f.LabWorkOrderId == set.LabWorkOrderId && f.LabSpecimenId == set.LabSpecimenId).ToDictionaryAsync(f => f.Id, ct);
            if (files.Count != uploads.Count || uploads.Any(u => files[u.LabScientificFileId!.Value].SizeBytes != u.SizeBytes)) throw Conflict("fastq_receipt_invalid", "The admitted files do not match this library's exact file set.");
            var library = await dbContext.LabLibraries.AsNoTracking().SingleAsync(l => l.Id == set.LabLibraryId, ct);
            var archiveIds = uploads.Where(u => u.LabFastqArchiveId.HasValue).Select(u => u.LabFastqArchiveId!.Value).Distinct().ToArray();
            var archiveManifests = await dbContext.Set<LabFastqArchive>().AsNoTracking().Where(a => archiveIds.Contains(a.Id))
                .ToDictionaryAsync(a => a.Id, a => a.ManifestJson, ct);
            var retained = LabVendorResultSafety.RetainedSet(previous, request, set.Id);
            snapshots.Add(new(set.Id, set.LabBatchMemberId, library.LibraryKey, set.SequencingRunNumber, set.ReadLayout, set.SetVersion,
                uploads.Select(u => { var f = files[u.LabScientificFileId!.Value]; return new VendorResultsFastqFileSnapshot(f.Id, u.Id, retained?.Files.Single(v => v.UploadId == u.Id).OutputId ?? Guid.NewGuid(),
                    u.OriginalFileName, f.FileName, u.GroupNumber, u.ReadNumber, u.PartNumber, u.GroupDescription, f.SizeBytes, f.Sha256, u.ReadCount!.Value,
                    u.LabFastqArchiveId, u.ArchiveEntryIndex, u.LabFastqArchiveId.HasValue
                        ? JsonSerializer.Deserialize<List<FastqArchiveEntry>>(archiveManifests[u.LabFastqArchiveId.Value]!, JsonOptions)!.Single(e => e.Index == u.ArchiveEntryIndex).FullName : null); }).ToList()));
            if (!set.LabVendorResultsVersionId.HasValue) set.Seal(request.RequestId);
        }
        var invalidated = priorSets.SelectMany(s => s.Files).Select(f => f.OutputId)
            .Except(snapshots.SelectMany(s => s.Files).Select(f => f.OutputId)).ToArray();
        await new LabVendorResultSafety(dbContext).RequireCorrectionAllowedAsync(invalidated, ct);
        draft?.Complete(DateTime.UtcNow);
        return snapshots;
    }

    private async Task RegisterResultFiles(LabNgsSendout sendout, RecordVendorResultsRequest request,
        IReadOnlyList<VendorResultsFastqSetSnapshot> snapshots, Guid actor, CancellationToken ct)
    {
        var lineage = new LabResultLineageService(dbContext);
        foreach (var snapshot in snapshots) {
            var set = await dbContext.Set<LabFastqSet>().SingleAsync(s => s.Id == snapshot.SetId, ct);
            foreach (var file in snapshot.Files) {
                if (await dbContext.LabSequencingOutputs.AnyAsync(o => o.Id == file.OutputId, ct)) continue;
                var prior = await dbContext.LabSequencingOutputs.AsNoTracking().Where(o => o.LabNgsSendoutId == sendout.Id
                    && o.LabLibraryId == set.LabLibraryId && o.SampleMappingReference == $"{set.LabBatchMemberId:N}:G{file.GroupNumber}:R{file.ReadNumber}:P{file.PartNumber}"
                    && !dbContext.LabSequencingOutputs.Any(c => c.CorrectsOutputId == o.Id)).OrderByDescending(o => o.RecordedAtUtc).FirstOrDefaultAsync(ct);
                await lineage.RegisterOutputAsync(new RegisterSequencingOutputRequest(file.OutputId, set.LabWorkOrderId, set.LabSpecimenId,
                    set.LabLibraryId, sendout.Id, "vendor-fastq", request.VendorJobReference,
                    $"{set.LabBatchMemberId:N}:G{file.GroupNumber}:R{file.ReadNumber}:P{file.PartNumber}", LabScientificFiles.Prefix + file.FileId,
                    file.Sha256, file.SizeBytes, prior?.Id, prior is null ? null : request.Notes,
                    new LabScientificEvidence(1, RunStartedAtUtc: request.RunStartedAtUtc, RunCompletedAtUtc: request.RunCompletedAtUtc,
                        ReceivedAtUtc: request.ResultsReceivedAtUtc), set.SequencingRunNumber, set.LibraryPreparationChoice), actor, "staff-fastq-intake", ct);
            }
        }
    }
}
