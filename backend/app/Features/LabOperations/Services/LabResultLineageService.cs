namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;

/// <summary>One validation boundary shared by staff capture, pipeline capture and result registration.</summary>
public sealed class LabResultLineageService(PSeqOperationsDbContext db)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<LabSequencingOutput> RegisterOutputAsync(RegisterSequencingOutputRequest request,
        Guid? actorId, string recordedBySource, CancellationToken ct)
    {
        var normalized = Normalize(request);
        var hash = Hash(normalized);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"sequencing-output:{request.Id}", ct);
        await SampleShippingPackingData.LockAsync(db, "sequencing-file:" + Hash(new[] {
            normalized.ProviderKey, normalized.ProviderRunReference, normalized.ExternalFileReference, normalized.SampleMappingReference }), ct);
        var existing = await db.LabSequencingOutputs.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id, ct);
        if (existing is not null)
        {
            RequireReplay(existing.RequestSha256, hash, existing.RecordedBySource, recordedBySource);
            return existing;
        }
        var specimen = await RequireSpecimenAsync(request.LabWorkOrderId, request.LabSpecimenId, ct);
        await SampleShippingPackingData.LockAsync(db, $"sample-sequencing:{specimen.Id}", ct);
        await ValidatePurchasedRunAsync(normalized, specimen, ct);
        var library = await db.LabLibraries.SingleOrDefaultAsync(x => x.Id == request.LabLibraryId
            && x.LabWorkOrderId == specimen.LabWorkOrderId && x.LabSpecimenId == specimen.Id, ct)
            ?? throw Invalid("The selected library does not belong to this specimen and job.");
        var execution = await db.LabProtocolExecutions.SingleAsync(x => x.Id == library.PreparationExecutionId, ct);
        if (!execution.LabSpecimenAttemptId.HasValue || execution.LabWorkOrderId != specimen.LabWorkOrderId
            || execution.LabSpecimenId != specimen.Id || execution.Status != LabExecutionStatus.Completed)
            throw Invalid("The library must have a completed preparation execution with an explicit specimen attempt.");
        var attempt = await RequireSuccessfulAttemptAsync(execution.LabSpecimenAttemptId.Value, specimen, ct);
        if (!await db.LabServiceWorkflowStages.AnyAsync(x => x.Id == execution.LabServiceWorkflowStageId
            && x.LabServiceWorkflowVersionId == attempt.LabServiceWorkflowVersionId && x.LabProtocolVersionId == execution.LabProtocolVersionId, ct))
            throw Invalid("The library execution must match a stage and protocol in its attempt's pinned workflow.");
        if (library.Status is LabLibraryStatus.Prepared or LabLibraryStatus.Failed)
            throw Invalid("Only a library that passed QC can supply sequencing output.");
        var sourceChain = await ReadContainerChainAsync(library.SourceContainerId, attempt, ct);
        var libraryChain = await ReadContainerChainAsync(library.LibraryContainerId, attempt, ct);
        if (libraryChain.Count < 2 || !await db.LabContainers.AnyAsync(x => x.Id == library.LibraryContainerId && x.Kind == LabContainerKind.Library, ct))
            throw Invalid("The sequencing library needs its own recorded derived container.");
        var sendout = await db.LabNgsSendouts.SingleOrDefaultAsync(x => x.Id == request.LabNgsSendoutId, ct)
            ?? throw Invalid("Select the sendout that carried this library.");
        if (sendout.Status is LabNgsSendoutStatus.Preparing or LabNgsSendoutStatus.Exception)
            throw Invalid("The sendout must have proceeded to sequencing without an unresolved exception.");
        using var manifest = JsonDocument.Parse(sendout.ManifestJson);
        if (!manifest.RootElement.TryGetProperty("members", out var members) || members.ValueKind != JsonValueKind.Array)
            throw Invalid("This sendout has no recorded library membership. Do not infer membership from the current batch.");
        var matching = members.EnumerateArray().Where(m => m.TryGetProperty("libraryId", out var id)
            && id.TryGetGuid(out var parsed) && parsed == library.Id).ToArray();
        if (matching.Length != 1 || !matching[0].TryGetProperty("containerBarcode", out var barcode)
            || barcode.GetString() != libraryChain[0].Barcode
            || !matching[0].TryGetProperty("libraryKey", out var libraryKey) || libraryKey.GetString() != library.LibraryKey)
            throw Invalid("The library identity and barcode must match exactly one member of the saved sendout manifest.");
        if (request.CorrectsOutputId.HasValue && !await db.LabSequencingOutputs.AnyAsync(x => x.Id == request.CorrectsOutputId
            && x.LabWorkOrderId == specimen.LabWorkOrderId && x.LabSpecimenId == specimen.Id, ct))
            throw Invalid("The corrected output must belong to this specimen and job.");
        if (!request.CorrectsOutputId.HasValue && await db.LabSequencingOutputs.AnyAsync(x => x.ProviderKey == normalized.ProviderKey
            && x.ProviderRunReference == normalized.ProviderRunReference && x.ExternalFileReference == normalized.ExternalFileReference
            && x.SampleMappingReference == normalized.SampleMappingReference && x.Sha256 != normalized.Sha256, ct))
            throw Invalid("A different checksum is already recorded for this output. Reference that output explicitly as a correction.");
        var snapshot = JsonSerializer.Serialize(new
        {
            schemaVersion = 1, specimen.Id, specimen.SubmittedSpecimenId, specimen.AccessionNumber,
            attemptId = attempt.Id, attempt.Sequence, attempt.SourceContainerId,
            sourceBarcode = sourceChain[^1].Barcode, libraryId = library.Id, library.LibraryKey,
            library.PreparationExecutionId, sourceChain, libraryChain,
            sendoutId = sendout.Id, sendout.ProviderName, sendout.ProviderReference,
            sendout.LabOperationalBatchId, submittedMember = matching[0]
        }, JsonOptions);
        var output = new LabSequencingOutput(normalized.Id, specimen.LabWorkOrderId, specimen.Id, attempt.Id,
            attempt.SourceContainerId, library.Id, sendout.Id, normalized.ProviderKey, normalized.ProviderRunReference,
            normalized.SampleMappingReference, normalized.ExternalFileReference, normalized.Sha256, normalized.SizeBytes,
            normalized.CorrectsOutputId, normalized.CorrectionReason, snapshot, hash, actorId, recordedBySource, DateTime.UtcNow, normalized.ScientificEvidence, normalized.SequencingRunNumber, normalized.LibraryPreparationChoice);
        db.LabSequencingOutputs.Add(output);
        db.LabWorkEvents.Add(new LabWorkEvent(specimen.LabWorkOrderId, specimen.Id, "SequencingOutputRecorded", DateTime.UtcNow,
            actorId, JsonSerializer.Serialize(new { outputId = output.Id, output.LabSpecimenAttemptId, output.SourceContainerId, recordedBySource }, JsonOptions)));
        // A concurrent hold, failure or library edit must invalidate this capture rather than race it.
        db.Entry(attempt).Property(x => x.UpdatedAt).IsModified = true;
        db.Entry(library).Property(x => x.UpdatedAt).IsModified = true;
        db.Entry(sendout).Property(x => x.UpdatedAt).IsModified = true;
        await SaveCaptureAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return output;
    }

    public async Task<LabAnalysisRun> RegisterAnalysisAsync(RegisterAnalysisRunRequest request,
        Guid? actorId, string recordedBySource, CancellationToken ct, bool requireScientificEvidence = false)
    {
        if (request.RequirementsVersion is not (null or 1)) throw Invalid("Scientific evidence profile version 1 is required.");
        if (request.SequencingOutputIds is null || request.SequencingOutputIds.Count is < 1 or > 256
            || request.SequencingOutputIds.Contains(Guid.Empty)
            || request.SequencingOutputIds.Distinct().Count() != request.SequencingOutputIds.Count)
            throw Invalid("Provide 1–256 distinct sequencing output identities for the completed analysis.");
        RegisterAnalysisRunRequest normalized;
        try
        {
            LabLineageText.RequireCorrection(request.PreviousAnalysisRunId, request.ReanalysisReason);
            normalized = request with { ProviderKey = LabLineageText.Required(request.ProviderKey, 100),
                RunReference = LabLineageText.Required(request.RunReference, 255),
                SequencingOutputIds = request.SequencingOutputIds.Order().ToArray(), ReanalysisReason = request.ReanalysisReason?.Trim(),
                ScientificEvidence = request.ScientificEvidence?.Normalize(DateTime.UtcNow) };
            if (normalized.ScientificEvidence?.InputRoles is { } roles &&
                (roles.Count != normalized.SequencingOutputIds.Count || roles.Any(x => !normalized.SequencingOutputIds.Contains(x.SequencingOutputId))))
                throw new ArgumentException("When input roles are supplied, map every registered analysis input exactly once.");
        }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        if (request.Id == Guid.Empty) throw Invalid("An analysis identity is required for safe retries.");
        var hash = Hash(normalized);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"analysis-run:{request.Id}", ct);
        var existing = await db.LabAnalysisRuns.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id, ct);
        if (existing is not null)
        {
            RequireReplay(existing.RequestSha256, hash, existing.RecordedBySource, recordedBySource);
            return existing;
        }
        var specimen = await RequireSpecimenAsync(request.LabWorkOrderId, request.LabSpecimenId, ct);
        var inputs = await db.LabSequencingOutputs.Where(x => request.SequencingOutputIds.Contains(x.Id)
            && x.LabWorkOrderId == specimen.LabWorkOrderId && x.LabSpecimenId == specimen.Id).ToListAsync(ct);
        if (inputs.Count != request.SequencingOutputIds.Count || inputs.Select(x => x.LabSpecimenAttemptId).Distinct().Count() != 1
            || inputs.Select(x => x.SourceContainerId).Distinct().Count() != 1)
            throw Invalid("Every analysis input must belong to this specimen, job and one producing tube attempt.");
        var attempt = await RequireSuccessfulAttemptAsync(inputs[0].LabSpecimenAttemptId, specimen, ct);
        if (inputs.Any(x => x.SourceContainerId != attempt.SourceContainerId)) throw Invalid("The analysis inputs have conflicting source tubes.");
        if (request.PreviousAnalysisRunId.HasValue && !await db.LabAnalysisRuns.AnyAsync(x => x.Id == request.PreviousAnalysisRunId
            && x.LabWorkOrderId == specimen.LabWorkOrderId && x.LabSpecimenId == specimen.Id, ct))
            throw Invalid("The previous analysis must belong to this specimen and job.");
        var run = new LabAnalysisRun(normalized.Id, specimen.LabWorkOrderId, specimen.Id, attempt.Id,
            normalized.ProviderKey, normalized.RunReference, normalized.PreviousAnalysisRunId, normalized.ReanalysisReason,
            hash, actorId, recordedBySource, DateTime.UtcNow, normalized.ScientificEvidence, requireScientificEvidence ? 1 : request.RequirementsVersion);
        db.LabAnalysisRuns.Add(run);
        db.LabWorkEvents.Add(new LabWorkEvent(specimen.LabWorkOrderId, specimen.Id, "AnalysisRunRecorded", DateTime.UtcNow,
            actorId, JsonSerializer.Serialize(new { analysisRunId = run.Id, run.LabSpecimenAttemptId, recordedBySource }, JsonOptions)));
        db.LabAnalysisInputs.AddRange(inputs.Select(x => new LabAnalysisInput(run.Id, x.Id)));
        db.Entry(attempt).Property(x => x.UpdatedAt).IsModified = true;
        await SaveCaptureAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return run;
    }

    public async Task<LabAnalysisRun?> RequireResultAsync(Guid? analysisRunId, bool required,
        Guid organizationId, Guid? workOrderId, Guid submittedSampleId, CancellationToken ct, bool requireScientificEvidence = false)
    {
        required |= requireScientificEvidence;
        if (!analysisRunId.HasValue && !required) return null;
        if (!analysisRunId.HasValue || analysisRunId == Guid.Empty)
            throw Invalid("Record the producing analysis and its source-tube lineage before registering this result.");
        var run = await db.LabAnalysisRuns.AsNoTracking().SingleOrDefaultAsync(x => x.Id == analysisRunId, ct)
            ?? throw Invalid("The producing analysis was not found.");
        var specimen = await db.LabSpecimens.AsNoTracking().SingleOrDefaultAsync(x => x.Id == run.LabSpecimenId
            && x.LabWorkOrderId == run.LabWorkOrderId && x.SubmittedSpecimenId == submittedSampleId, ct);
        if (specimen is null || workOrderId.HasValue && run.LabWorkOrderId != workOrderId
            || !await db.LabWorkOrders.AnyAsync(x => x.Id == run.LabWorkOrderId && x.SubmittingOrganizationId == organizationId, ct))
            throw Invalid("The producing analysis does not belong to this result's organization, job and sample.");
        await RequireSpecimenAsync(run.LabWorkOrderId, run.LabSpecimenId, ct);
        var attempt = await RequireSuccessfulAttemptAsync(run.LabSpecimenAttemptId, specimen, ct);
        var inputs = await (from input in db.LabAnalysisInputs
            join output in db.LabSequencingOutputs on input.LabSequencingOutputId equals output.Id
            where input.LabAnalysisRunId == run.Id select output).ToListAsync(ct);
        if (inputs.Count == 0 || inputs.Any(x => x.LabWorkOrderId != run.LabWorkOrderId || x.LabSpecimenId != specimen.Id
            || x.LabSpecimenAttemptId != attempt.Id || x.SourceContainerId != attempt.SourceContainerId))
            throw Invalid("The analysis lacks a complete, consistent input-to-tube chain.");
        if (requireScientificEvidence && run.RequirementsSnapshotJson is null)
            throw Invalid("Record a new analysis with the approved scientific evidence profile before registering this new result. Historical analyses are not silently reclassified.");
        if (run.RequirementsSnapshotJson is not null)
        {
            var missing = LabScientificRequirements.Assess(run, inputs).Where(x => x.Status == "Missing").Select(x => x.Label).ToArray();
            if (missing.Length > 0) throw Invalid("Required scientific evidence is missing: " + string.Join("; ", missing) + ". Record linked correction/reanalysis evidence before review or release.");
        }
        await new LabPerformanceReviewService(db).RequireReviewedAsync(attempt.Id, run.RequirementsSnapshotJson is not null, ct);
        // The saved result is immutable; its initial eligibility still participates in concurrency control.
        db.Entry(attempt).Property(x => x.UpdatedAt).IsModified = true;
        return run;
    }

    public async Task RequirePackageAsync(ResultOutputPackage package, CancellationToken ct, PSeqOrderToCashOptions? policy = null)
    {
        policy ??= new PSeqOrderToCashOptions();
        if (!package.TraceabilityRequired && !policy.RequireResultTraceability && !policy.RequireScientificEvidence) return;
        await RequireResultAsync(package.LabAnalysisRunId, true, package.OrganizationId,
            package.LabWorkOrderId, (package.LabSampleId ?? package.TrialSampleId)!.Value, ct, policy.RequireScientificEvidence);
        var artifacts = await db.ResultArtifacts.AsNoTracking().Where(x => x.ResultOutputPackageId == package.Id).ToListAsync(ct);
        if (artifacts.Count != package.ExpectedArtifactCount || artifacts.Any(x => string.IsNullOrWhiteSpace(x.ResultLocator)))
            throw Invalid("The result package needs its complete artifact-to-analysis attribution before review or release.");
    }

    public async Task RequireReleaseAsync(LabResultRelease release, CancellationToken ct, PSeqOrderToCashOptions? policy = null)
    {
        policy ??= new PSeqOrderToCashOptions();
        if (!release.TraceabilityRequired && !policy.RequireResultTraceability && !policy.RequireScientificEvidence) return;
        await RequireResultAsync(release.LabAnalysisRunId, true, release.OrganizationId, null, release.LabSampleId, ct, policy.RequireScientificEvidence);
        if (string.IsNullOrWhiteSpace(release.ResultLocator)) throw Invalid("The result file needs an explicit result locator before release.");
    }

    private async Task<LabSpecimen> RequireSpecimenAsync(Guid workId, Guid specimenId, CancellationToken ct)
    {
        var specimen = await db.LabSpecimens.AsNoTracking().SingleOrDefaultAsync(x => x.Id == specimenId && x.LabWorkOrderId == workId, ct)
            ?? throw Invalid("Choose a specimen from this job.");
        var work = await db.LabWorkOrders.SingleAsync(x => x.Id == workId, ct);
        if (work.Status is LabWorkOrderStatus.Cancelled or LabWorkOrderStatus.OnHold)
            throw Invalid("Resolve the job hold or cancellation before recording new scientific output.");
        db.Entry(work).Property(x => x.UpdatedAt).IsModified = true;
        return specimen;
    }

    private async Task<LabSpecimenAttempt> RequireSuccessfulAttemptAsync(Guid attemptId, LabSpecimen specimen, CancellationToken ct)
    {
        var attempt = await db.LabSpecimenAttempts.SingleOrDefaultAsync(x => x.Id == attemptId
            && x.LabWorkOrderId == specimen.LabWorkOrderId && x.LabSpecimenId == specimen.Id, ct);
        if (attempt is null || attempt.State != LabSpecimenAttemptState.Succeeded || !attempt.StartedAtUtc.HasValue)
            throw Invalid("Only the explicitly selected successful attempt may produce this result.");
        if (await (from member in db.LabPreparationMembers join batch in db.LabPreparationBatches on member.LabPreparationBatchId equals batch.Id
            where member.LabSpecimenAttemptId == attempt.Id && !member.Removed && batch.Status != LabBatchStatus.Complete select member.Id).AnyAsync(ct))
            throw Invalid("Complete the preparation batch before recording downstream outputs.");
        return attempt;
    }

    private sealed record ContainerFact(Guid Id, string Barcode, Guid? ParentContainerId);
    private async Task<List<ContainerFact>> ReadContainerChainAsync(Guid containerId, LabSpecimenAttempt attempt, CancellationToken ct)
    {
        var chain = new List<ContainerFact>();
        var seen = new HashSet<Guid>();
        Guid? current = containerId;
        while (current.HasValue && seen.Add(current.Value) && chain.Count < 100)
        {
            var container = await db.LabContainers.AsNoTracking().SingleOrDefaultAsync(x => x.Id == current
                && x.LabWorkOrderId == attempt.LabWorkOrderId && x.LabSpecimenId == attempt.LabSpecimenId, ct);
            if (container is null) break;
            chain.Add(new(container.Id, container.Barcode, container.ParentContainerId));
            if (container.Id == attempt.SourceContainerId && container.Kind == LabContainerKind.SubmittedSpecimen) return chain;
            if (container.LabSpecimenAttemptId != attempt.Id) break;
            current = container.ParentContainerId;
        }
        throw Invalid("The library's recorded container parents do not reach this attempt's exact source tube.");
    }

    private async Task SaveCaptureAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw new OrderManagementException("lineage_capture_conflict", "This identity was registered concurrently or already describes another output. Retry the original request unchanged; use an explicit correction for changed evidence.", 409);
        }
    }
    private async Task ValidatePurchasedRunAsync(RegisterSequencingOutputRequest request, LabSpecimen specimen, CancellationToken ct)
    {
        var required = (await new LabSequencingRunProgress(db).AllocationsAsync(specimen.LabWorkOrderId, ct))
            .GetValueOrDefault(specimen.SubmittedSpecimenId, 1);
        var number = request.SequencingRunNumber ?? 1;
        if (number < 1 || number > required) throw Invalid($"Choose a purchased run number from 1 to {required}.");
        if (required > 1 && (request.SequencingRunNumber is null || request.LibraryPreparationChoice is null))
            throw Invalid("Repeated sequencing requires an explicit purchased run number and library preparation choice.");
        if (request.LibraryPreparationChoice is not (null or "NewPreparation" or "ExistingLibrary"))
            throw Invalid("Choose new library preparation or an existing prepared library.");
        if (required == 1 && request.SequencingRunNumber is null && request.LibraryPreparationChoice is null) return;
        var history = await db.LabSequencingOutputs.AsNoTracking().Where(o => o.LabSpecimenId == specimen.Id).ToListAsync(ct);
        if (request.CorrectsOutputId.HasValue)
        {
            var original = history.SingleOrDefault(o => o.Id == request.CorrectsOutputId);
            if (original is null || (original.SequencingRunNumber ?? 1) != number)
                throw Invalid("A correction must retain the original purchased run number.");
        }
        var sameRun = history.Where(o => (o.SequencingRunNumber ?? 1) == number).ToList();
        // Additional files and corrections preserve the physical run and preparation identity.
        if (!request.CorrectsOutputId.HasValue && sameRun.Where(o => !history.Any(c => c.CorrectsOutputId == o.Id)).Any(o => o.LabLibraryId != request.LabLibraryId || o.ProviderKey != request.ProviderKey
            || o.ProviderRunReference != request.ProviderRunReference || o.LibraryPreparationChoice != request.LibraryPreparationChoice
                && o.LibraryPreparationChoice is not null))
            throw Invalid("Files for one purchased run must use the same library, preparation choice and actual provider run. Use another authorized run number for distinct sequencing.");
        if (request.LibraryPreparationChoice == "NewPreparation"
            && !sameRun.Any(o => o.LabLibraryId == request.LabLibraryId && o.LibraryPreparationChoice == "NewPreparation") && history.Any(o => o.LabLibraryId == request.LabLibraryId
            && (o.SequencingRunNumber ?? 1) != number))
            throw Invalid("This library already supplies another run. Choose existing prepared library, or select the newly prepared library.");
    }

    private static RegisterSequencingOutputRequest Normalize(RegisterSequencingOutputRequest r)
    {
        try
        {
            if (r.Id == Guid.Empty || r.SizeBytes < 1) throw new ArgumentException("An output identity and positive file size are required.");
            LabLineageText.RequireCorrection(r.CorrectsOutputId, r.CorrectionReason);
            if (r.ScientificEvidence?.InputRoles is { Count: > 0 }) throw new ArgumentException("Analysis input roles belong on the analysis declaration.");
            return r with { ProviderKey = LabLineageText.Required(r.ProviderKey, 100), ProviderRunReference = LabLineageText.Required(r.ProviderRunReference, 255),
                SampleMappingReference = LabLineageText.Required(r.SampleMappingReference, 1000), ExternalFileReference = LabLineageText.Required(r.ExternalFileReference, 1000),
                Sha256 = LabLineageText.Hash(r.Sha256), CorrectionReason = r.CorrectionReason?.Trim(), ScientificEvidence = r.ScientificEvidence?.Normalize(DateTime.UtcNow) };
        }
        catch (ArgumentException e) { throw Invalid(e.Message); }
    }
    private static string Hash<T>(T value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value, JsonOptions))));
    private static void RequireReplay(string existingHash, string hash, string existingSource, string source)
    {
        if (existingHash != hash || existingSource != source)
            throw new OrderManagementException("lineage_idempotency_conflict", "This identity already has different evidence. Preserve it and record an explicit correction.", 409);
    }
    private static OrderManagementException Invalid(string message) => new("result_lineage_invalid", message, 409);
}
