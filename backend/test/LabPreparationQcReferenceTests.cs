namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabPreparationQcReferenceTests
{
    [Theory]
    [InlineData("synthetic-qc-record-reference")]
    [InlineData("synthetic-library-qc-record-reference")]
    public void Legacy_synthetic_reference_is_optional_but_qc_is_still_required(string key)
    {
        var original = LabPreparationBatchTests.Definition();
        var step = original.Steps[0] with { Captures = [new() { Key = key, Label = "Reference", Type = "fileReference", Required = true, Scope = "shared" }] };
        var definition = original with { Steps = [step] };
        var input = new LabProtocolStepInput(step.Key, "record", "recorded", new Dictionary<string, System.Text.Json.JsonElement>(), true, false, "pass", null);
        var evidence = new LabProtocolEvidence(1, []).Append(definition, input, Guid.NewGuid(), new HashSet<LabRole> { LabRole.Operator }, DateTime.UtcNow);
        Assert.Empty(evidence.CompletionBlockers(definition));
        Assert.True(step.Captures[0].Required); // Approved definition is not rewritten.
        Assert.Throws<ArgumentException>(() => new LabProtocolEvidence(1, []).Append(definition, input with { QcOutcome = null }, Guid.NewGuid(), new HashSet<LabRole> { LabRole.Operator }, DateTime.UtcNow));
    }

    [Theory]
    [InlineData("real-report-reference", "fileReference", true)]
    [InlineData("synthetic-qc-record-reference", "text", true)]
    [InlineData("synthetic-qc-record-reference", "fileReference", false)]
    public void Other_required_captures_are_not_waived(string key, string type, bool qc)
    {
        var original = LabPreparationBatchTests.Definition();
        var step = original.Steps[0] with { Captures = [new() { Key = key, Label = "Reference", Type = type, Required = true, Scope = "shared" }], QcGate = qc ? original.Steps[0].QcGate : null };
        var input = new LabProtocolStepInput(step.Key, "record", "recorded", new Dictionary<string, System.Text.Json.JsonElement>(), true, false, qc ? "pass" : null, null);
        Assert.Throws<ArgumentException>(() => new LabProtocolEvidence(1, []).Append(original with { Steps = [step] }, input, Guid.NewGuid(), new HashSet<LabRole> { LabRole.Operator }, DateTime.UtcNow));
    }
    [Fact]
    public void Preparation_reference_is_optional_but_output_and_resource_confirmation_remain_required()
    {
        var original = LabPreparationBatchTests.Definition();
        var step = original.Steps[0] with { QcGate = null, InputMaterials = ["Reagent"], EquipmentTypes = ["Instrument"], PreparedOutputs = ["Library"],
            Captures = [new() { Key = "preparation-record-reference", Label = "Preparation record reference", Type = "text", Required = true, Scope = "shared" },
                new() { Key = "output", Label = "Output barcode", Type = "barcode", Required = true, Scope = "tube" }] };
        var definition = original with { Steps = [step] };
        var values = new Dictionary<string, System.Text.Json.JsonElement> { ["output"] = System.Text.Json.JsonSerializer.SerializeToElement("LIB-TEST") };
        var input = new LabProtocolStepInput(step.Key, "record", "recorded", values, true, true, null, null);
        var roles = new HashSet<LabRole> { LabRole.Operator };
        var evidence = new LabProtocolEvidence(1, []).Append(definition, input, Guid.NewGuid(), roles, DateTime.UtcNow);
        Assert.Empty(evidence.CompletionBlockers(definition));
        Assert.True(step.Captures[0].Required);
        Assert.Throws<ArgumentException>(() => new LabProtocolEvidence(1, []).Append(definition, input with { Captures = new Dictionary<string, System.Text.Json.JsonElement>() }, Guid.NewGuid(), roles, DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => new LabProtocolEvidence(1, []).Append(definition, input with { ResourcesConfirmed = false }, Guid.NewGuid(), roles, DateTime.UtcNow));
    }
}
