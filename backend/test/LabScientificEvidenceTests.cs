namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public sealed class LabScientificEvidenceTests
{
    [Fact]
    public void Capture_normalizes_versions_checksums_and_collection_order_without_inventing_missing_evidence()
    {
        var now = DateTime.UtcNow;
        var a = new LabScientificVersion("aligner", " 2.1 ", new string('a', 64));
        var b = new LabScientificVersion("container", "sha256-image", new string('b', 64));
        var evidence = new LabScientificEvidence(1, Software: [b, a], RunStartedAtUtc: now.AddMinutes(-3), RunCompletedAtUtc: now.AddMinutes(-1),
            QcMetrics: new Dictionary<string, LabScientificMetric> { ["read-count"] = new(100, "reads") });
        var normalized = evidence.Normalize(now);
        Assert.Equal("aligner", normalized.Software![0].Name);
        Assert.Equal("2.1", normalized.Software[0].Version);
        Assert.Equal(new string('A', 64), normalized.Software[0].Sha256);
        Assert.Equal(normalized.ToJson(), (evidence with { Software = [a, b] }).Normalize(now).ToJson());
        Assert.Null(normalized.Instrument);
        Assert.Null(normalized.ReferenceData);
    }

    [Fact]
    public void ExplainedExceptionsCannotWaiveSourceIdentityOrContradictRecordedEvidence()
    {
        var now = DateTime.UtcNow;
        var evidence = new LabScientificEvidence(1, NotApplicable: new Dictionary<string, string> { ["referenceData"] = "De novo analysis" });
        Assert.Equal("De novo analysis", evidence.Normalize(now).NotApplicable!["referenceData"]);
        foreach (var key in new[] { "sourceTube", "sampleMapping", "runTimes", "inputChecksums", "outputAttribution", "inputRoles" })
            Assert.Throws<ArgumentException>(() => (evidence with { NotApplicable = new Dictionary<string, string> { [key] = "Waive" } }).Normalize(now));
        Assert.Throws<ArgumentException>(() => (evidence with { NotApplicable = new Dictionary<string, string> { ["qc"] = " " } }).Normalize(now));
        Assert.Throws<ArgumentException>(() => (evidence with { ReferenceData = [new("Reference", "v1")] }).Normalize(now));
    }

    [Fact]
    public void Invalid_time_hash_size_schema_or_input_mapping_is_rejected()
    {
        var now = DateTime.UtcNow; var input = Guid.NewGuid();
        Assert.Throws<ArgumentException>(() => new LabScientificEvidence(2).Normalize(now));
        Assert.Throws<ArgumentException>(() => new LabScientificEvidence(1, RunStartedAtUtc: now.AddDays(1)).Normalize(now));
        Assert.Throws<ArgumentException>(() => new LabScientificEvidence(1, RunStartedAtUtc: DateTime.SpecifyKind(now, DateTimeKind.Unspecified)).Normalize(now));
        Assert.Throws<ArgumentException>(() => new LabScientificEvidence(1, RunStartedAtUtc: now, RunCompletedAtUtc: now.AddDays(-1)).Normalize(now));
        Assert.Throws<ArgumentException>(() => new LabScientificEvidence(1, ParametersSha256: "invalid").Normalize(now));
        Assert.Throws<ArgumentException>(() => new LabScientificEvidence(1, Documents: [new("QC", "stable-version", new string('A', 64), 0)]).Normalize(now));
        Assert.Throws<ArgumentException>(() => new LabScientificEvidence(1, InputRoles: [new(input, "R1"), new(input, "R2")]).Normalize(now));
    }
}
