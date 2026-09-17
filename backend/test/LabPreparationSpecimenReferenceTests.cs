namespace PhaenoPortal.Test;

using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

public class LabPreparationSpecimenReferenceTests
{
    private static LabProtocolStepDefinition Step(string scope = "shared") =>
        LabPreparationBatchTests.Definition().Steps[0] with
        {
            Captures = [new() { Key = "specimen-reference", Label = "Specimen reference", Type = "text", Required = true, Scope = scope }],
            QcGate = null
        };

    [Theory]
    [InlineData("batch", "record")]
    [InlineData("shared", "repeat")]
    [InlineData("tube", "correct")]
    public void Saved_accessions_override_client_values_without_shared_exception_reasons(string scope, string action)
    {
        var first = Guid.NewGuid(); var second = Guid.NewGuid(); var record = Guid.NewGuid();
        var forged = new Dictionary<string, JsonElement> { ["specimen-reference"] = JsonSerializer.SerializeToElement("WRONG") };
        var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", action, "recorded", [first, second],
            forged, [new(first, forged, null, null), new(second, forged, null, null)], null,
            action == "record" ? null : "Test correction or repeat", true, true, false);
        var a = LabPreparationEvidence.Resolve(Step(scope), input, first, record, "ACC-A");
        var b = LabPreparationEvidence.Resolve(Step(scope), input, second, record, "ACC-B");
        Assert.Equal("ACC-A", a.Captures["specimen-reference"].GetString());
        Assert.Equal("ACC-B", b.Captures["specimen-reference"].GetString());
        Assert.Equal(record, a.PreparationRecordId);
        Assert.Equal(record, b.PreparationRecordId);
    }

    [Fact]
    public void Missing_saved_accession_cannot_be_replaced_by_client_evidence()
    {
        var member = Guid.NewGuid();
        var forged = new Dictionary<string, JsonElement> { ["specimen-reference"] = JsonSerializer.SerializeToElement("CLIENT") };
        var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", "record", "recorded", [member], forged, [], null, null, true, true, false);
        Assert.Throws<ArgumentException>(() => LabPreparationEvidence.Resolve(Step(), input, member, Guid.NewGuid()));
    }

    [Fact]
    public void Skipped_step_does_not_claim_automatic_identity_evidence()
    {
        var member = Guid.NewGuid();
        var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", "record", "skipped", [member],
            new Dictionary<string, JsonElement>(), [], null, "Not applicable", true, false, false);
        Assert.Empty(LabPreparationEvidence.Resolve(Step(), input, member, Guid.NewGuid(), "ACC-A").Captures);
    }

    [Fact]
    public void Unrelated_text_capture_with_same_label_retains_normal_shared_exception_rules()
    {
        var member = Guid.NewGuid();
        var step = Step() with { Captures = [Step().Captures[0] with { Key = "external-reference" }] };
        var value = new Dictionary<string, JsonElement> { ["external-reference"] = JsonSerializer.SerializeToElement("External") };
        var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", "record", "recorded", [member],
            new Dictionary<string, JsonElement>(), [new(member, value, null, null)], null, null, true, true, false);
        Assert.Throws<ArgumentException>(() => LabPreparationEvidence.Resolve(step, input, member, Guid.NewGuid(), "ACC-A"));
    }
}
