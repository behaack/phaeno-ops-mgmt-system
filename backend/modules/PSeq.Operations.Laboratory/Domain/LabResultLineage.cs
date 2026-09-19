namespace PSeq.Operations.Laboratory.Domain;

/// <summary>Immutable identity of one sample's actual sequencing output, not a transfer acknowledgement.</summary>
public sealed class LabSequencingOutput
{
    public string? ScientificEvidenceJson { get; private set; }
    public Guid Id { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid LabSpecimenAttemptId { get; private set; }
    public Guid SourceContainerId { get; private set; }
    public Guid LabLibraryId { get; private set; }
    public Guid LabNgsSendoutId { get; private set; }
    public string ProviderKey { get; private set; } = null!;
    public string ProviderRunReference { get; private set; } = null!;
    public string SampleMappingReference { get; private set; } = null!;
    public string ExternalFileReference { get; private set; } = null!;
    public string Sha256 { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public Guid? CorrectsOutputId { get; private set; }
    public string? CorrectionReason { get; private set; }
    public string LineageSnapshotJson { get; private set; } = null!;
    public string RequestSha256 { get; private set; } = null!;
    public string ExternalIdentitySha256 { get; private set; } = null!;
    public DateTime RecordedAtUtc { get; private set; }
    public Guid? RecordedByUserId { get; private set; }
    public string RecordedBySource { get; private set; } = null!;

    private LabSequencingOutput() { }

    public LabSequencingOutput(Guid id, Guid workId, Guid specimenId, Guid attemptId, Guid sourceId,
        Guid libraryId, Guid sendoutId, string providerKey, string runReference, string mappingReference,
        string fileReference, string sha256, long sizeBytes, Guid? correctsId, string? reason,
        string snapshotJson, string requestSha256, Guid? actorId, string source, DateTime now, LabScientificEvidence? scientificEvidence = null)
    {
        if (new[] { id, workId, specimenId, attemptId, sourceId, libraryId, sendoutId }.Contains(Guid.Empty) || sizeBytes < 1)
            throw new ArgumentException("Output identity, complete tube lineage, and positive file size are required.");
        LabLineageText.RequireCorrection(correctsId, reason);
        ScientificEvidenceJson = scientificEvidence?.Normalize(now).ToJson();
        Id = id; LabWorkOrderId = workId; LabSpecimenId = specimenId; LabSpecimenAttemptId = attemptId;
        SourceContainerId = sourceId; LabLibraryId = libraryId; LabNgsSendoutId = sendoutId;
        ProviderKey = LabLineageText.Required(providerKey, 100);
        ProviderRunReference = LabLineageText.Required(runReference, 255);
        SampleMappingReference = LabLineageText.Required(mappingReference, 1000);
        ExternalFileReference = LabLineageText.Required(fileReference, 1000);
        Sha256 = LabLineageText.Hash(sha256); SizeBytes = sizeBytes;
        ExternalIdentitySha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(
                new[] { ProviderKey, ProviderRunReference, ExternalFileReference, SampleMappingReference, Sha256, correctsId?.ToString() }))));
        CorrectsOutputId = correctsId; CorrectionReason = reason?.Trim();
        LineageSnapshotJson = snapshotJson; RequestSha256 = LabLineageText.Hash(requestSha256);
        RecordedByUserId = actorId; RecordedBySource = LabLineageText.Required(source, 150);
        RecordedAtUtc = now.Kind == DateTimeKind.Utc ? now : throw new ArgumentException("Use UTC recording time.");
    }
}

/// <summary>A completed analysis declaration with immutable, explicit inputs.</summary>
public sealed class LabAnalysisRun
{
    public string? RequirementsSnapshotJson { get; private set; }
    public string? ScientificEvidenceJson { get; private set; }
    public Guid Id { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid LabSpecimenAttemptId { get; private set; }
    public string ProviderKey { get; private set; } = null!;
    public string RunReference { get; private set; } = null!;
    public Guid? PreviousAnalysisRunId { get; private set; }
    public string? ReanalysisReason { get; private set; }
    public string RequestSha256 { get; private set; } = null!;
    public DateTime RecordedAtUtc { get; private set; }
    public Guid? RecordedByUserId { get; private set; }
    public string RecordedBySource { get; private set; } = null!;

    private LabAnalysisRun() { }

    public LabAnalysisRun(Guid id, Guid workId, Guid specimenId, Guid attemptId, string providerKey,
        string runReference, Guid? previousId, string? reason, string requestHash, Guid? actorId, string source, DateTime now, LabScientificEvidence? scientificEvidence = null, int? requirementsVersion = null)
    {
        RequirementsSnapshotJson = requirementsVersion.HasValue ? LabScientificRequirements.Snapshot(requirementsVersion.Value) : null;
        if (new[] { id, workId, specimenId, attemptId }.Contains(Guid.Empty))
            throw new ArgumentException("Analysis, specimen and producing attempt identities are required.");
        LabLineageText.RequireCorrection(previousId, reason);
        ScientificEvidenceJson = scientificEvidence?.Normalize(now).ToJson();
        Id = id; LabWorkOrderId = workId; LabSpecimenId = specimenId; LabSpecimenAttemptId = attemptId;
        ProviderKey = LabLineageText.Required(providerKey, 100); RunReference = LabLineageText.Required(runReference, 255);
        PreviousAnalysisRunId = previousId; ReanalysisReason = reason?.Trim();
        RequestSha256 = LabLineageText.Hash(requestHash); RecordedByUserId = actorId;
        RecordedBySource = LabLineageText.Required(source, 150);
        RecordedAtUtc = now.Kind == DateTimeKind.Utc ? now : throw new ArgumentException("Use UTC recording time.");
    }
}

public sealed class LabAnalysisInput
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabAnalysisRunId { get; private set; }
    public Guid LabSequencingOutputId { get; private set; }
    private LabAnalysisInput() { }
    public LabAnalysisInput(Guid runId, Guid outputId)
    {
        if (runId == Guid.Empty || outputId == Guid.Empty) throw new ArgumentException("Both input identities are required.");
        LabAnalysisRunId = runId; LabSequencingOutputId = outputId;
    }
}

public static class LabLineageText
{
    public static string Required(string value, int maximum)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Length > maximum)
            throw new ArgumentException($"A non-empty value of at most {maximum} characters is required.");
        return value.Trim();
    }
    public static string Hash(string value)
    {
        var result = Required(value, 64).ToUpperInvariant();
        if (result.Length != 64 || result.Any(c => !char.IsAsciiHexDigit(c))) throw new ArgumentException("A SHA-256 checksum is required.");
        return result;
    }
    public static void RequireCorrection(Guid? previousId, string? reason)
    {
        if (previousId == Guid.Empty || previousId.HasValue != !string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("A correction requires both its predecessor and a reason.");
        if (reason is not null) Required(reason, 2000);
    }
}
