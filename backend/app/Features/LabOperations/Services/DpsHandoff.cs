namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Laboratory.Domain;

public sealed class DpsHandoff(PSeqOperationsDbContext db, DpsS3Objects objects, IOptions<DpsOptions> options, TimeProvider time)
{
    public async Task<AssemblyInputVerification> VerifyInputsAsync(IReadOnlyList<AssemblyInput> inputs, CancellationToken ct)
    {
        if (inputs.Count is < 1 or > 256 || inputs.Select(i => i.SequencingOutputId).Distinct().Count() != inputs.Count) throw DpsContract.Invalid();
        var ids = inputs.Select(i => i.SequencingOutputId).ToArray();
        var outputs = await db.LabSequencingOutputs.AsNoTracking().Where(o => ids.Contains(o.Id)).ToListAsync(ct);
        if (outputs.Count != inputs.Count || outputs.Select(o => o.LabSpecimenId).Distinct().Count() != 1
            || outputs.Select(o => o.LabWorkOrderId).Distinct().Count() != 1) throw DpsContract.Invalid();
        var files = new List<VerifiedAssemblyInput>();
        foreach (var input in inputs.OrderBy(i => i.SequencingOutputId)) {
            var output = outputs.Single(o => o.Id == input.SequencingOutputId);
            if (input.ExternalFileReference != output.ExternalFileReference || input.SizeBytes != output.SizeBytes
                || !input.Sha256.Equals(output.Sha256, StringComparison.OrdinalIgnoreCase)
                || !input.ExternalFileReference.StartsWith(LabScientificFiles.Prefix, StringComparison.Ordinal)
                || !Guid.TryParseExact(input.ExternalFileReference[LabScientificFiles.Prefix.Length..], "D", out var id)) throw DpsContract.Invalid();
            var file = await db.LabScientificFiles.AsNoTracking().SingleAsync(f => f.Id == id && f.LabWorkOrderId == output.LabWorkOrderId && f.LabSpecimenId == output.LabSpecimenId, ct);
            if (file.SizeBytes != input.SizeBytes || !file.Sha256.Equals(input.Sha256, StringComparison.OrdinalIgnoreCase)) throw DpsContract.Invalid();
            var address = await objects.ResolveAsync(file.StorageKey, file.Sha256, file.SizeBytes, ct);
            files.Add(new(input.SequencingOutputId, address.Bucket, address.Key, address.VersionId, input.Sha256, input.SizeBytes, ManagedFileId: file.Id));
        }
        return new(DpsS3Objects.Hash(JsonSerializer.SerializeToUtf8Bytes(files, DpsContract.Json)), time.GetUtcNow().UtcDateTime, files);
    }
    public async Task<DpsSubmission> PrepareAsync(LabAssemblyJob job, DpsRecipe recipe, CancellationToken ct)
    {
        var frozen = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json) ?? throw DpsContract.Invalid();
        var destination = frozen.OutputStorage ?? throw DpsContract.Invalid();
        var work = await db.LabWorkOrders.AsNoTracking().SingleAsync(w => w.Id == job.LabWorkOrderId, ct);
        if (work.AuthorizationSource != LabAuthorizationSource.CommercialOrder)
            throw new OrderManagementException("dps_scope_unsupported", "The DPS 1.0 contract currently requires a commercial Lab Job.", 409);
        var fileIds = frozen.Verification.Files.Select(f => f.ManagedFileId ?? throw DpsContract.Invalid()).ToArray();
        var uploads = await db.Set<LabFastqUpload>().AsNoTracking().Where(u => u.LabScientificFileId.HasValue && fileIds.Contains(u.LabScientificFileId.Value)).ToListAsync(ct);
        if (uploads.Count != fileIds.Length || uploads.Select(u => u.LabFastqSetId).Distinct().Count() != 1) throw DpsContract.Invalid();
        var set = await db.Set<LabFastqSet>().AsNoTracking().SingleAsync(s => s.Id == uploads[0].LabFastqSetId, ct);
        var allIds = await db.Set<LabFastqUpload>().Where(u => u.LabFastqSetId == set.Id).Select(u => u.LabScientificFileId).ToListAsync(ct);
        if (!allIds.All(id => id.HasValue) || !allIds.Select(id => id!.Value).Order().SequenceEqual(fileIds.Order())
            || set.LabSpecimenId != job.LabSpecimenId || set.LabWorkOrderId != job.LabWorkOrderId || set.SequencingRunNumber != job.SequencingRunNumber
            || !set.LabVendorResultsVersionId.HasValue) throw DpsContract.Invalid();
        var result = await db.LabVendorResultsVersions.AsNoTracking().SingleAsync(v => v.Id == set.LabVendorResultsVersionId, ct);
        var sendout = await db.LabNgsSendouts.AsNoTracking().SingleAsync(s => s.Id == result.LabNgsSendoutId, ct);
        var files = uploads.OrderBy(u => u.GroupNumber).ThenBy(u => u.PartNumber).ThenBy(u => u.ReadNumber).Select(upload => {
            var verified = frozen.Verification.Files.Single(f => f.ManagedFileId == upload.LabScientificFileId);
            return new DpsInputFile(upload.LabScientificFileId!.Value, verified.SequencingOutputId, upload.OriginalFileName, upload.FileName,
                upload.GroupNumber, upload.ReadNumber, upload.PartNumber, upload.GroupDescription, upload.ReadCount ?? throw DpsContract.Invalid(),
                upload.FileName.EndsWith(".gz", StringComparison.OrdinalIgnoreCase) ? "gzip" : "none",
                new(verified.Bucket, destination.Region, verified.Key, verified.VersionId!, verified.Sha256.ToLowerInvariant(), verified.SizeBytes));
        }).ToArray();
        foreach (var group in uploads.GroupBy(u => u.GroupNumber)) {
            var count = group.Max(u => u.PartNumber);
            if (count > 256 || group.Select(u => u.GroupDescription).Distinct().Count() != 1) throw DpsContract.Invalid();
            foreach (var part in Enumerable.Range(1, count)) {
                var pair = group.Where(u => u.PartNumber == part).OrderBy(u => u.ReadNumber).ToArray();
                if (pair.Length != (set.ReadLayout == "PairedEnd" ? 2 : 1) || pair[0].ReadNumber != 1
                    || set.ReadLayout == "PairedEnd" && (pair[1].ReadNumber != 2 || pair[0].ReadCount != pair[1].ReadCount
                        || pair[0].ReadIdentifiersSha256 != pair[1].ReadIdentifiersSha256)) throw DpsContract.Invalid();
            }
        }
        var scope = new DpsScope(work.SubmittingOrganizationId, work.AuthorizationSourceId, work.Id, job.LabSpecimenId,
            set.LabLibraryId, sendout.LabOperationalBatchId, result.ResultVersion, set.Id, set.SetVersion, set.SequencingRunNumber);
        var manifest = new DpsInputManifest(DpsContract.Version, options.Value.Environment, "input_manifest", job.Id,
            job.RequestedAtUtc, scope, set.ReadLayout, recipe, files, new(destination.Bucket, destination.Region, destination.Prefix + "outputs/"));
        DpsContract.Validate("input_manifest", JsonSerializer.SerializeToElement(manifest, DpsContract.Json));
        DpsObject address;
        var existing = await objects.ReadExistingInstructionsAsync(destination.Prefix + "input-manifest.json", ct);
        if (existing is { } prior) {
            var priorManifest = DpsContract.Read<DpsInputManifest>(DpsContract.Parse(prior.Content, "input_manifest", DpsContract.MaximumManifestBytes));
            // A DB rollback may leave its immutable control object. Reuse only identical instructions; preserve original creation evidence.
            if (!JsonElement.DeepEquals(JsonSerializer.SerializeToElement(priorManifest with { CreatedAtUtc = manifest.CreatedAtUtc }, DpsContract.Json),
                JsonSerializer.SerializeToElement(manifest, DpsContract.Json))) throw DpsContract.Invalid();
            manifest = priorManifest; address = prior.Address;
        } else address = await objects.WriteOnceAsync(destination.Prefix + "input-manifest.json", JsonSerializer.SerializeToUtf8Bytes(manifest, DpsContract.Json), ct);
        var parameters = await objects.WriteOnceAsync(destination.Prefix + "parameters.json", JsonSerializer.SerializeToUtf8Bytes(recipe.Parameters, DpsContract.Json), ct);
        return new(address, manifest, parameters);
    }
    public async Task<DpsOutputManifest> ReadOutputAsync(LabAssemblyJob job, DpsObject locator, DpsEvent evidence, CancellationToken ct)
    {
        var frozen = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json) ?? throw DpsContract.Invalid();
        var submission = frozen.Dps ?? throw DpsContract.Invalid();
        var destination = frozen.OutputStorage ?? throw DpsContract.Invalid();
        objects.RequireAddress(locator, destination.Prefix);
        if (locator.Key != destination.Prefix + "output-manifest.json") throw DpsContract.Invalid();
        var bytes = await objects.ReadAsync(locator, DpsContract.MaximumManifestBytes, ct);
        var manifest = DpsContract.Read<DpsOutputManifest>(DpsContract.Parse(bytes, "output_manifest", DpsContract.MaximumManifestBytes));
        RequireOutput(job, manifest, submission);
        if (manifest.ProviderJobId != evidence.ProviderJobId || manifest.StartedAtUtc != evidence.StartedAtUtc
            || manifest.StoppedAtUtc != evidence.StoppedAtUtc) throw DpsContract.Invalid();
        return manifest;
    }
    internal static void RequireOutput(LabAssemblyJob job, DpsOutputManifest manifest, DpsSubmission submission)
    {
        if (manifest.JobId != job.Id || manifest.Environment != submission.Instructions.Environment || manifest.Scope != submission.Instructions.Scope
            || manifest.InputManifestSha256 != submission.InputManifest.Sha256 || !DpsContract.SameRecipe(manifest.Recipe, submission.Instructions.Recipe)
            || manifest.Outputs.Select(o => o.ArtifactId).Distinct().Count() != manifest.Outputs.Count
            || manifest.Outputs.Select(o => o.S3.Key).Distinct().Count() != manifest.Outputs.Count
            || !manifest.Recipe.RequiredOutputRoles.All(role => manifest.Outputs.Any(o => o.Role == role))) throw DpsContract.Invalid();
        var now = DateTime.UtcNow;
        DpsContract.RequireUtc(manifest.StartedAtUtc, now); DpsContract.RequireUtc(manifest.StoppedAtUtc, now); DpsContract.RequireUtc(manifest.CreatedAtUtc, now);
        if (manifest.StartedAtUtc > manifest.StoppedAtUtc || manifest.StoppedAtUtc > manifest.CreatedAtUtc) throw DpsContract.Invalid();
    }
}
