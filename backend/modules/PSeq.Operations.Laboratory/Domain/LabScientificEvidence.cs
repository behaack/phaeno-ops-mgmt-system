namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;

public sealed record LabScientificVersion(string Name, string Version, string? Sha256 = null);
public sealed record LabScientificDocument(string Role, string ExternalFileReference, string Sha256, long SizeBytes);
public sealed record LabScientificInputRole(Guid SequencingOutputId, string Role);
public sealed record LabScientificMetric(decimal Value, string Unit);

/// <summary>Producer-declared scientific metadata. Presence is not scientific approval or file availability proof.</summary>
public sealed record LabScientificEvidence(
    int SchemaVersion,
    string? Instrument = null, string? Flowcell = null, string? Lane = null,
    string? Pool = null, string? IndexMapping = null, string? WorkflowVersion = null,
    IReadOnlyList<LabScientificVersion>? Software = null,
    IReadOnlyList<LabScientificVersion>? ReferenceData = null,
    string? ParametersSha256 = null,
    IReadOnlyList<LabScientificInputRole>? InputRoles = null,
    DateTime? RunStartedAtUtc = null, DateTime? RunCompletedAtUtc = null,
    DateTime? SubmittedAtUtc = null, DateTime? ReceivedAtUtc = null,
    string? QcSummary = null, IReadOnlyList<LabScientificDocument>? Documents = null,
    IReadOnlyDictionary<string, LabScientificMetric>? QcMetrics = null,
    [property: System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    IReadOnlyDictionary<string, string>? NotApplicable = null)
{
    public LabScientificEvidence Normalize(DateTime recordedAtUtc)
    {
        if (SchemaVersion != 1) throw new ArgumentException("Use scientific evidence schema version 1.");
        if (NotApplicable?.Keys.Any(key => !LabScientificRequirements.ExceptionKeys.Contains(key)) == true)
            throw new ArgumentException("Only QC, software, settings or reference-data requirements permit explained Not applicable cases. Source, run, time and file attribution cannot be waived.");
        if (NotApplicable is not null && (NotApplicable.ContainsKey("qc") && (QcSummary is not null || QcMetrics?.Count > 0 || Documents?.Any(x => x.Role == "qc") == true)
            || NotApplicable.ContainsKey("software") && Software?.Count > 0 || NotApplicable.ContainsKey("parameters") && ParametersSha256 is not null
            || NotApplicable.ContainsKey("referenceData") && ReferenceData?.Count > 0))
            throw new ArgumentException("A requirement cannot be recorded and marked Not applicable at the same time.");
        foreach (var time in new[] { RunStartedAtUtc, RunCompletedAtUtc, SubmittedAtUtc, ReceivedAtUtc })
            if (time.HasValue && (time.Value.Kind != DateTimeKind.Utc || time.Value > recordedAtUtc || time.Value == default))
                throw new ArgumentException("Scientific event times must be real UTC times, no later than their recording time.");
        if (RunStartedAtUtc > RunCompletedAtUtc || SubmittedAtUtc > ReceivedAtUtc)
            throw new ArgumentException("Scientific event end times cannot precede their start times.");
        if ((Software?.Count ?? 0) > 64 || (ReferenceData?.Count ?? 0) > 64 || (Documents?.Count ?? 0) > 64 || (InputRoles?.Count ?? 0) > 256 || (QcMetrics?.Count ?? 0) > 128)
            throw new ArgumentException("Scientific metadata exceeds the supported collection size.");
        if (Software?.Any(x => x is null) == true || ReferenceData?.Any(x => x is null) == true || Documents?.Any(x => x is null) == true
            || InputRoles?.Any(x => x is null) == true || QcMetrics?.Values.Any(x => x is null) == true)
            throw new ArgumentException("Scientific evidence collections cannot contain empty records.");
        if (InputRoles is not null && (InputRoles.Any(x => x.SequencingOutputId == Guid.Empty) || InputRoles.Select(x => x.SequencingOutputId).Distinct().Count() != InputRoles.Count))
            throw new ArgumentException("Each sequencing input may have one explicit role mapping.");
        string? Text(string? value, int max = 1000) => value is null ? null : LabLineageText.Required(value, max);
        LabScientificVersion Version(LabScientificVersion v) => new(LabLineageText.Required(v.Name, 255), LabLineageText.Required(v.Version, 1000), v.Sha256 is null ? null : LabLineageText.Hash(v.Sha256));
        var result = this with
        {
            NotApplicable = NotApplicable?.OrderBy(x => x.Key, StringComparer.Ordinal).ToDictionary(x => x.Key, x => LabLineageText.Required(x.Value, 4000)),
            Instrument = Text(Instrument), Flowcell = Text(Flowcell), Lane = Text(Lane), Pool = Text(Pool), IndexMapping = Text(IndexMapping), WorkflowVersion = Text(WorkflowVersion),
            Software = Software?.Select(Version).OrderBy(x => x.Name, StringComparer.Ordinal).ThenBy(x => x.Version, StringComparer.Ordinal).ToArray(),
            ReferenceData = ReferenceData?.Select(Version).OrderBy(x => x.Name, StringComparer.Ordinal).ThenBy(x => x.Version, StringComparer.Ordinal).ToArray(),
            ParametersSha256 = ParametersSha256 is null ? null : LabLineageText.Hash(ParametersSha256), QcSummary = Text(QcSummary, 8000),
            InputRoles = InputRoles?.Select(x => new LabScientificInputRole(x.SequencingOutputId, LabLineageText.Required(x.Role, 100))).OrderBy(x => x.SequencingOutputId).ToArray(),
            Documents = Documents?.Select(x => x.SizeBytes < 1 ? throw new ArgumentException("Scientific documents require a positive size.")
                : new LabScientificDocument(LabLineageText.Required(x.Role, 100), LabLineageText.Required(x.ExternalFileReference, 1000), LabLineageText.Hash(x.Sha256), x.SizeBytes))
                .OrderBy(x => x.Role, StringComparer.Ordinal).ThenBy(x => x.ExternalFileReference, StringComparer.Ordinal).ToArray(),
            QcMetrics = QcMetrics?.OrderBy(x => x.Key, StringComparer.Ordinal).ToDictionary(x => LabLineageText.Required(x.Key, 100), x => new LabScientificMetric(x.Value.Value, LabLineageText.Required(x.Value.Unit, 100)))
        };
        if (System.Text.Encoding.UTF8.GetByteCount(result.ToJson()) > 65536) throw new ArgumentException("Scientific metadata must not exceed 64 KB.");
        return result;
    }
    public string ToJson() => JsonSerializer.Serialize(this, new JsonSerializerOptions(JsonSerializerDefaults.Web));
}
