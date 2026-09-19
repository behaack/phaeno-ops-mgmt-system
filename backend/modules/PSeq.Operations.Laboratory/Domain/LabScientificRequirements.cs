namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;

public sealed record LabScientificRequirementStatus(string Key, string Label, string Status, string? Explanation = null);

/// <summary>Versioned owner-approved minimum. Never infer scientific validity from coverage.</summary>
public static class LabScientificRequirements
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public static readonly string[] ExceptionKeys = ["qc", "software", "parameters", "referenceData"];
    public static string Snapshot(int version)
    {
        if (version != 1) throw new ArgumentException("Scientific evidence profile version 1 is required.");
        return JsonSerializer.Serialize(new { code = "pseq-result-evidence", version,
            required = new[] { "sourceTube", "sampleMapping", "sequencingRun", "qc", "software", "parameters", "referenceData", "runTimes", "inputChecksums", "outputAttribution" },
            explainedExceptions = ExceptionKeys, approval = "Scientific review remains required; source attribution cannot be waived." }, JsonOptions);
    }

    public static IReadOnlyList<LabScientificRequirementStatus> Assess(LabAnalysisRun run, IReadOnlyList<LabSequencingOutput> inputs)
    {
        if (run.RequirementsSnapshotJson is null) return [new("profile", "Scientific requirements", "Legacy unknown", "No scientific requirement profile was pinned to this analysis.")];
        using var profile = JsonDocument.Parse(run.RequirementsSnapshotJson);
        if (profile.RootElement.GetProperty("version").GetInt32() != 1 || profile.RootElement.GetProperty("code").GetString() != "pseq-result-evidence")
            throw new ArgumentException("The saved scientific requirements profile is not supported.");
        var states = new List<LabScientificRequirementStatus>();
        LabScientificEvidence? Read(string? json) => json is null ? null : JsonSerializer.Deserialize<LabScientificEvidence>(json, JsonOptions);
        void Check(string prefix, string key, string label, bool recorded, LabScientificEvidence? metadata, bool allowException = false)
        {
            var reason = allowException && metadata?.NotApplicable?.TryGetValue(key, out var value) == true ? value : null;
            states.Add(new(prefix + key, label, recorded ? "Recorded" : !string.IsNullOrWhiteSpace(reason) ? "Not applicable" : "Missing", recorded ? null : reason));
        }
        var analysis = Read(run.ScientificEvidenceJson);
        Check("analysis.", "software", "Analysis software and versions", analysis?.Software?.Count > 0, analysis, true);
        Check("analysis.", "parameters", "Analysis settings checksum", analysis?.ParametersSha256 is not null, analysis, true);
        Check("analysis.", "referenceData", "Reference data and versions", analysis?.ReferenceData?.Count > 0, analysis, true);
        Check("analysis.", "runTimes", "Analysis start and completion", analysis?.RunStartedAtUtc is not null && analysis.RunCompletedAtUtc is not null, analysis);
        Check("analysis.", "inputRoles", "Exact analysis input roles", analysis?.InputRoles is { Count: > 0 } roles && roles.Count == inputs.Count && roles.All(r => inputs.Any(i => i.Id == r.SequencingOutputId)), analysis);
        foreach (var input in inputs)
        {
            var metadata = Read(input.ScientificEvidenceJson); var prefix = $"sequencing.{input.Id}.";
            Check(prefix, "qc", $"Sequencing QC · {input.ExternalFileReference}", !string.IsNullOrWhiteSpace(metadata?.QcSummary)
                && (metadata.QcMetrics?.Count > 0 || metadata.Documents?.Any(x => x.Role == "qc") == true), metadata, true);
            Check(prefix, "runTimes", $"Sequencing start and completion · {input.ExternalFileReference}", metadata?.RunStartedAtUtc is not null && metadata.RunCompletedAtUtc is not null, metadata);
        }
        // Source/run identities, checksums and result locators are unwaivable and validated by the lineage boundary.
        if (inputs.Count == 0) states.Add(new("inputs", "Sequencing inputs", "Missing"));
        return states;
    }
}
