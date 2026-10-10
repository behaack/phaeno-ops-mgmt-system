namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

/// <summary>Execution acknowledgment and scientific-file admission have independent recovery boundaries.</summary>
public sealed class DpsOutputAdmission(PSeqOperationsDbContext db, DpsS3Objects objects,
    IOperationalFileScanner scanner, IOptions<DpsOptions> options, LabAssemblyService service, TimeProvider time)
{
    public const string Pending = "DPS outputs await verified scientific-file admission. Recovery will continue.";
    public async Task AdmitAsync(Guid id, CancellationToken ct)
    {
        await using var tx = await SampleShippingPackingData.BeginAsync(db, "assembly-job:" + id, ct);
        var job = await service.RequireJobAsync(id, ct); await db.Entry(job).ReloadAsync(ct);
        if (job.State != "Succeeded" || job.ProviderKey != DpsContract.Provider || job.AttentionReason == LabAssemblyDelivery.ConflictAttention) return;
        if (job.LabAnalysisRunId.HasValue) return;
        var frozen = JsonSerializer.Deserialize<AssemblyFrozenInputs>(job.InputsJson, LabAssemblyService.Json) ?? throw DpsContract.Invalid();
        var submission = frozen.Dps ?? throw DpsContract.Invalid();
        using var parsed = JsonDocument.Parse(job.OutputManifestJson ?? throw DpsContract.Invalid());
        DpsContract.Validate("output_manifest", parsed.RootElement);
        var manifest = DpsContract.Read<DpsOutputManifest>(parsed.RootElement);
        DpsHandoff.RequireOutput(job, manifest, submission);
        if (manifest.ProviderJobId != job.ProviderJobId || manifest.StartedAtUtc.Ticks / 10 != job.StartedAtUtc?.Ticks / 10
            || manifest.StoppedAtUtc.Ticks / 10 != job.StoppedAtUtc?.Ticks / 10)
            throw DpsContract.Invalid();
        var documents = new List<LabScientificDocument>(); long bytes = 0;
        foreach (var artifact in manifest.Outputs) {
            if (artifact.S3.SizeBytes > options.Value.MaximumOutputFileBytes || bytes > options.Value.MaximumOutputSetBytes - artifact.S3.SizeBytes
                || artifact.FileName.Length > 255 || artifact.FileName.Any(c => char.IsControl(c) || c is '/' or '\\')) throw DpsContract.Invalid();
            bytes += artifact.S3.SizeBytes;
            var file = await AdmitFileAsync(job, artifact.S3, submission.Instructions.OutputDestination.Prefix, artifact.FileName, ct);
            // Every output is admitted/retained; scientific evidence names the configured required roles.
            if (manifest.Recipe.RequiredOutputRoles.Contains(artifact.Role, StringComparer.Ordinal))
                documents.Add(new(artifact.Role, LabScientificFiles.Prefix + file.Id, file.Sha256, file.SizeBytes));
        }
        if (documents.Count > 63) throw DpsContract.Invalid();
        var parameterFile = await AdmitFileAsync(job, submission.Parameters, frozen.OutputStorage!.Prefix, "parameters.json", ct);
        documents.Add(new("parameters", LabScientificFiles.Prefix + parameterFile.Id, parameterFile.Sha256, parameterFile.SizeBytes));
        var software = new[] { new LabScientificVersion(manifest.Provenance.Engine, manifest.Provenance.EngineVersion) }
            .Concat(manifest.Provenance.Tools.Select(tool => new LabScientificVersion(tool.Name, tool.Version))).ToArray();
        if (software.Length > 64) throw DpsContract.Invalid();
        Guid? previous = null;
        if (job.PreviousJobId.HasValue) previous = await db.Set<LabAssemblyJob>().Where(j => j.Id == job.PreviousJobId)
            .Select(j => j.LabAnalysisRunId).SingleAsync(ct);
        var evidence = new LabScientificEvidence(1, WorkflowVersion: manifest.Recipe.Key + ":" + manifest.Recipe.Version,
            Software: software, ParametersSha256: parameterFile.Sha256,
            ReferenceData: manifest.Provenance.ReferenceData.Count > 0 ? manifest.Provenance.ReferenceData
                .Select(reference => new LabScientificVersion(reference.Name, reference.Version, reference.Sha256)).ToArray() : null,
            InputRoles: submission.Instructions.Files.Select(file => new LabScientificInputRole(file.SequencingOutputId,
                $"G{file.GroupNumber}/R{file.ReadNumber}/P{file.PartNumber}")).ToArray(),
            RunStartedAtUtc: manifest.StartedAtUtc, RunCompletedAtUtc: manifest.StoppedAtUtc,
            Documents: documents, NotApplicable: manifest.Provenance.ReferenceDataNotApplicable is { } reason
                ? new Dictionary<string, string> { ["referenceData"] = reason } : null);
        var analysis = await new LabResultLineageService(db).RegisterAnalysisAsync(new RegisterAnalysisRunRequest(job.Id,
            job.LabWorkOrderId, job.LabSpecimenId, job.ProviderKey, job.ProviderJobId!, frozen.Inputs.Select(i => i.SequencingOutputId).ToArray(),
            previous, previous.HasValue ? job.RetryReason : null, evidence, 1), job.RequestedByUserId, "dps-mqtt", ct, true);
        // Linking establishes execution/input attribution; all existing scientific/QC/release assessments still apply.
        job.LinkAnalysis(analysis.Id);
        if (job.AttentionReason?.StartsWith("DPS outputs ", StringComparison.Ordinal) == true) job.SetAttention(null);
        service.Record(job, "DpsOutputsAdmitted", job.RequestedByUserId);
        await db.SaveChangesAsync(ct); if (tx is not null) await tx.CommitAsync(ct);
    }
    private async Task<LabScientificFile> AdmitFileAsync(LabAssemblyJob job, DpsObject address, string prefix, string name, CancellationToken ct)
    {
        var key = await objects.StorageKeyAsync(address, prefix, ct);
        var existing = await db.LabScientificFiles.SingleOrDefaultAsync(f => f.StorageKey == key, ct);
        if (existing is not null) {
            if (existing.LabWorkOrderId != job.LabWorkOrderId || existing.LabSpecimenId != job.LabSpecimenId
                || existing.SizeBytes != address.SizeBytes || !existing.Sha256.Equals(address.Sha256, StringComparison.OrdinalIgnoreCase)) throw DpsContract.Invalid();
            return existing;
        }
        await objects.VerifyAsync(address, ct);
        if ((await scanner.ScanAsync(key, ct)).Status != OperationalFileScanStatus.Clean)
            throw new OrderManagementException("dps_output_scan_required", "DPS outputs have not passed scientific file scanning. Admission will be retried.", 409);
        var file = new LabScientificFile(job.LabWorkOrderId, job.LabSpecimenId, name, key, address.Sha256,
            address.SizeBytes, job.RequestedByUserId, time.GetUtcNow().UtcDateTime);
        db.Add(file);
        db.Add(new LabWorkEvent(job.LabWorkOrderId, job.LabSpecimenId, "DpsScientificFileAdmitted", time.GetUtcNow().UtcDateTime,
            job.RequestedByUserId, JsonSerializer.Serialize(new { jobId = job.Id, file.Id, source = "dps-mqtt", file.FileName, file.Sha256, file.SizeBytes }, LabAssemblyService.Json)));
        await db.SaveChangesAsync(ct); return file;
    }
}
