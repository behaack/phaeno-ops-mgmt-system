namespace PhaenoPortal.Test;

using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

public class LabPreparationBatchTests
{
    private static LabTrayFormat Format() => new(new("Partial tray", 2, 3, "grid", ["B3"]));
    internal static LabProtocolDefinition Definition(string scope = "shared") => new()
    {
        SchemaVersion = 1, PreparationBatchEnabled = true,
        Steps = [new() { Key = "qc", Name = "Synthetic QC", Instructions = "Software test only.", Required = true, Repeatable = true, OperatorConfirmation = true,
            Captures = [new() { Key = "value", Label = "Value", Type = "number", Required = true, Scope = scope }], InputMaterials = [], EquipmentTypes = [], PreparedOutputs = [],
            QcGate = new() { Scope = scope, Criteria = "Synthetic criterion", Outcomes = ["pass", "fail", "hold"] } },
            new() { Key = "review", Name = "Review", Instructions = "Review prior evidence.", Required = true, Repeatable = true, OperatorConfirmation = false, Captures = [], InputMaterials = [], EquipmentTypes = [], PreparedOutputs = [] }]
    };
    private static Dictionary<string, JsonElement> Values(double number) => new() { ["value"] = JsonSerializer.SerializeToElement(number) };

    [Fact]
    public void Snapshot_survives_format_edit_and_retirement_and_partial_tray_locks()
    {
        var format = Format(); var batch = new LabPreparationBatch("TEST ONLY", format, Guid.NewGuid());
        var member = new LabPreparationMember(batch.Id, Guid.NewGuid(), "A1", "TUBE-1");
        format.Update(new("Changed", 1, 1, "numeric", []), false);
        Assert.Equal(6, LabTrayLayout.Read(batch.LayoutJson).Positions().Count);
        batch.Start([member], true, DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => member.Move(batch, "A2", [member]));
        Assert.Throws<InvalidOperationException>(() => member.Remove(batch));
        Assert.Throws<InvalidOperationException>(() => batch.Cancel());
    }

    [Theory]
    [InlineData("B3")]
    [InlineData("Z99")]
    public void Unavailable_or_foreign_positions_rejected(string position)
    {
        var batch = new LabPreparationBatch("TEST", Format(), Guid.NewGuid());
        Assert.Throws<ArgumentException>(() => batch.CheckPosition(position, []));
    }

    [Fact]
    public void Duplicate_position_and_unconfirmed_empty_start_rejected()
    {
        var batch = new LabPreparationBatch("TEST", Format(), Guid.NewGuid()); var member = new LabPreparationMember(batch.Id, Guid.NewGuid(), "A1", "TUBE-1");
        Assert.Throws<InvalidOperationException>(() => batch.CheckPosition("A1", [member]));
        Assert.Throws<ArgumentException>(() => batch.Start([], true, DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => batch.Start([member], false, DateTime.UtcNow));
        Assert.Equal(LabBatchStatus.Draft, batch.Status);
    }

    [Fact]
    public void Shared_evidence_keeps_tube_exception_and_hold_separate_with_provenance()
    {
        var d = Definition(); var a = Guid.NewGuid(); var b = Guid.NewGuid(); var recordId = Guid.NewGuid();
        var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", "record", "recorded", [a, b], Values(20), [new(b, Values(2), "hold", "Tube B requires review")], "pass", null, true, true, false);
        var first = LabPreparationEvidence.Resolve(d.Steps[0], input, a, recordId);
        var second = LabPreparationEvidence.Resolve(d.Steps[0], input, b, recordId);
        Assert.Equal(20, first.Captures["value"].GetDouble()); Assert.Equal("pass", first.QcOutcome);
        Assert.Equal(2, second.Captures["value"].GetDouble()); Assert.Equal("hold", second.QcOutcome);
        Assert.Equal(recordId, second.PreparationRecordId);
        var evidence = new LabProtocolEvidence(1, []).Append(d, second, Guid.NewGuid(), new HashSet<LabRole> { LabRole.Operator }, DateTime.UtcNow);
        Assert.Contains("QC is hold", evidence.StepBlocker(d, d.Steps[0]));
        Assert.Equal(recordId, LabProtocolEvidence.Read(evidence.ToJson()).Records[0].PreparationRecordId);
    }

    [Fact]
    public void Tube_required_captures_cannot_be_filled_by_shared_value()
    {
        var d = Definition("tube"); var a = Guid.NewGuid();
        var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", "record", "recorded", [a], Values(20), [], "pass", null, true, true, false);
        Assert.Throws<ArgumentException>(() => LabPreparationEvidence.Resolve(d.Steps[0], input, a, Guid.NewGuid()));
        var missing = input with { SharedCaptures = new Dictionary<string, JsonElement>(), SharedQcOutcome = null, Tubes = [new(a, new Dictionary<string, JsonElement>(), "pass", null)] };
        var effective = LabPreparationEvidence.Resolve(d.Steps[0], missing, a, Guid.NewGuid());
        Assert.Throws<ArgumentException>(() => new LabProtocolEvidence(1, []).Append(d, effective, Guid.NewGuid(), new HashSet<LabRole> { LabRole.Operator }, DateTime.UtcNow));
    }

    [Fact]
    public void Shared_exception_requires_reason_and_batch_fields_cannot_be_overridden()
    {
        var a = Guid.NewGuid(); var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", "record", "recorded", [a], Values(20), [new(a, Values(2), "hold", null)], "pass", null, true, true, false);
        Assert.Throws<ArgumentException>(() => LabPreparationEvidence.Resolve(Definition().Steps[0], input, a, Guid.NewGuid()));
        Assert.Throws<ArgumentException>(() => LabPreparationEvidence.Resolve(Definition("batch").Steps[0], input with { Tubes = [new(a, Values(2), "hold", "Exception")] }, a, Guid.NewGuid()));
    }

    [Fact]
    public void Corrected_shared_evidence_invalidates_later_review_and_preserves_history()
    {
        var d = Definition(); var a = Guid.NewGuid(); var actor = Guid.NewGuid(); var roles = new HashSet<LabRole> { LabRole.Supervisor }; var now = DateTime.UtcNow;
        var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", "record", "recorded", [a], Values(20), [], "pass", null, true, true, false);
        var evidence = new LabProtocolEvidence(1, []).Append(d, LabPreparationEvidence.Resolve(d.Steps[0], input, a, Guid.NewGuid()), actor, roles, now);
        evidence = evidence.Append(d, new("review", "record", "recorded", new Dictionary<string, JsonElement>(), false, false, null, null), actor, roles, now.AddMinutes(1));
        evidence = evidence.Append(d, LabPreparationEvidence.Resolve(d.Steps[0], input with { Action = "correct", Reason = "Correct transcribed value", SharedCaptures = Values(21) }, a, Guid.NewGuid()), actor, roles, now.AddMinutes(2));
        Assert.Equal(3, evidence.Records.Count); Assert.Contains("earlier step changed", evidence.StepBlocker(d, d.Steps[1]));
    }

    [Fact]
    public void Repeating_held_shared_evidence_retains_history_and_requires_reason()
    {
        var definition = Definition(); var member = Guid.NewGuid(); var actor = Guid.NewGuid();
        var roles = new HashSet<LabRole> { LabRole.Operator }; var now = DateTime.UtcNow;
        var input = new LabPreparationStepInput(Guid.NewGuid(), "qc", "record", "recorded", [member], Values(2), [], "hold", "Synthetic hold", true, true, false);
        var evidence = new LabProtocolEvidence(1, []).Append(definition,
            LabPreparationEvidence.Resolve(definition.Steps[0], input, member, Guid.NewGuid()), actor, roles, now);
        Assert.Contains("QC is hold", evidence.StepBlocker(definition, definition.Steps[0]));
        var repeat = input with { Action = "repeat", SharedCaptures = Values(20), SharedQcOutcome = "pass", Reason = null };
        Assert.Throws<ArgumentException>(() => evidence.Append(definition,
            LabPreparationEvidence.Resolve(definition.Steps[0], repeat, member, Guid.NewGuid()), actor, roles, now.AddMinutes(1)));
        var repeated = evidence.Append(definition,
            LabPreparationEvidence.Resolve(definition.Steps[0], repeat with { Reason = "Synthetic repeat resolved hold" }, member, Guid.NewGuid()), actor, roles, now.AddMinutes(1));
        Assert.Equal(2, repeated.Records.Count);
        Assert.Equal("hold", repeated.Records[0].QcOutcome);
        Assert.Equal("pass", repeated.Records[1].QcOutcome);
        Assert.Null(repeated.StepBlocker(definition, definition.Steps[0]));
    }

    [Fact]
    public void Old_protocols_stay_unscoped_and_opt_in_requires_explicit_scopes()
    {
        var old = Definition() with { PreparationBatchEnabled = false, Steps = [Definition().Steps[0] with { Captures = [Definition().Steps[0].Captures[0] with { Scope = null }], QcGate = Definition().Steps[0].QcGate! with { Scope = null } }] };
        Assert.False(LabProtocolDefinition.Parse(old.ToJson()).PreparationBatchEnabled);
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse((old with { PreparationBatchEnabled = true }).ToJson()));
    }

    [Fact]
    public void Output_scan_and_resolved_outcomes_are_required()
    {
        var batch = new LabPreparationBatch("TEST", Format(), Guid.NewGuid()); var member = new LabPreparationMember(batch.Id, Guid.NewGuid(), "A1", "SOURCE");
        member.SetOutput(Guid.NewGuid()); Assert.Throws<ArgumentException>(() => member.ConfirmOutput("OUTPUT", "WRONG")); Assert.False(member.OutputConfirmed);
        member.ConfirmOutput("OUTPUT", "OUTPUT"); Assert.True(member.OutputConfirmed);
        batch.Start([member], true, DateTime.UtcNow); Assert.Throws<InvalidOperationException>(() => batch.Complete(false, DateTime.UtcNow));
        batch.Complete(true, DateTime.UtcNow); Assert.Equal(LabBatchStatus.Complete, batch.Status);
    }
}
