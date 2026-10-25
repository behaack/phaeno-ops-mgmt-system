namespace PhaenoPortal.Test;

using System.Text.Json;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabInvestigationScopeTests
{
    [Fact]
    public void Shared_resource_coverage_retains_sample_exceptions_and_does_not_include_uncovered_members()
    {
        var first = Guid.NewGuid(); var second = Guid.NewGuid(); var excluded = Guid.NewGuid(); var lot = Guid.NewGuid();
        var input = new LabPreparationStepInput(Guid.NewGuid(), "mix", "record", "recorded", [first, second],
            new Dictionary<string, JsonElement>(), [], null, null, true, false, false,
            [new("reagent", ResourceId: lot, Quantity: 5, QuantityUnit: "uL"),
                new("reagent", second, lot, Quantity: 2, QuantityUnit: "uL", ExceptionReason: "Measured tube exception")]);
        var command = new LabPreparationCommand(Guid.NewGuid(), 1, "step", Step: input);
        var record = Record(command);
        var field = new LabProtocolCaptureDefinition { Key = "reagent", Label = "Reagent", Type = "material", Required = true, Scope = "shared", QuantityBasis = "perSample" };
        var step = Step(field);
        var a = Assert.Single(LabInvestigationResourceScope.Resolve(record, command, Guid.NewGuid(), first, step, true));
        var b = Assert.Single(LabInvestigationResourceScope.Resolve(record, command, Guid.NewGuid(), second, step, true));
        Assert.Equal(lot, a.ResourceId); Assert.Equal(5, a.Quantity); Assert.Equal(2, b.Quantity);
        Assert.Equal("Sample amount", a.QuantityScope); Assert.Equal("Measured tube exception", b.ExceptionReason);
        Assert.Empty(LabInvestigationResourceScope.Resolve(record, command, Guid.NewGuid(), excluded, step, false));
        Assert.Throws<OrderManagementException>(() => LabInvestigationResourceScope.Resolve(record, command, Guid.NewGuid(), first, step, false));
        var zero = command with { Step = input with { ResourceEntries = [input.ResourceEntries![0], input.ResourceEntries[1] with { Quantity = 0 }] } };
        Assert.Empty(LabInvestigationResourceScope.Resolve(record, zero, Guid.NewGuid(), second, step, true));
    }

    [Fact]
    public void Shared_totals_unknown_amounts_corrections_and_skips_never_invent_sample_consumption()
    {
        var member = Guid.NewGuid(); var lot = Guid.NewGuid();
        var input = new LabPreparationStepInput(Guid.NewGuid(), "mix", "record", "recorded", [member],
            new Dictionary<string, JsonElement>(), [], null, null, true, false, false,
            [new("reagent", ResourceId: lot, Quantity: 8, QuantityUnit: "uL")]);
        var command = new LabPreparationCommand(Guid.NewGuid(), 1, "step", Step: input); var record = Record(command);
        var step = Step(new() { Key = "reagent", Label = "Reagent", Type = "material", Required = true, Scope = "batch", QuantityBasis = "total" });
        var total = Assert.Single(LabInvestigationResourceScope.Resolve(record, command, Guid.NewGuid(), member, step, true));
        Assert.Null(total.Quantity); Assert.Contains("individual sample amount not recorded", total.QuantityScope);
        var unknown = command with { Step = input with { ResourceEntries = [new("reagent", ResourceId: lot, AmountUnknown: true, QuantityUnit: "uL")] } };
        Assert.True(Assert.Single(LabInvestigationResourceScope.Resolve(record, unknown, Guid.NewGuid(), member, step, true)).AmountUnknown);
        Assert.Empty(LabInvestigationResourceScope.Resolve(record, command with { Step = input with { Action = "correct" } }, Guid.NewGuid(), member, step, true));
        Assert.Empty(LabInvestigationResourceScope.Resolve(record, command with { Step = input with { Outcome = "skipped" } }, Guid.NewGuid(), member, step, true));
    }

    [Fact]
    public void Standalone_preparation_resource_uses_only_its_saved_coverage_and_unknown_allocation()
    {
        var member = Guid.NewGuid(); var command = new LabPreparationCommand(Guid.NewGuid(), 1, "equipment",
            ResourceId: Guid.NewGuid(), CoveredMemberIds: [member]); var record = Record(command);
        var use = Assert.Single(LabInvestigationResourceScope.Resolve(record, LabInvestigationResourceScope.Command(record), Guid.NewGuid(), member, null, false));
        Assert.Equal(command.ResourceId, use.ResourceId); Assert.Null(use.Quantity);
        Assert.Empty(LabInvestigationResourceScope.Resolve(record, command, Guid.NewGuid(), Guid.NewGuid(), null, false));
        var invalid = new LabPreparationRecord(record.Id, record.LabPreparationBatchId, record.ActorUserId, "equipment", "hash",
            JsonSerializer.Serialize(command with { RequestId = Guid.NewGuid() }, JsonSerializerOptions.Web), DateTime.UtcNow);
        Assert.Throws<OrderManagementException>(() => LabInvestigationResourceScope.Command(invalid));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Vendor_versions_keep_sample_failure_and_no_run_history_without_other_libraries_or_files(bool noRun)
    {
        var library = Guid.NewGuid(); var otherLibrary = Guid.NewGuid(); var member = Guid.NewGuid(); var otherMember = Guid.NewGuid();
        var sendout = Guid.NewGuid(); var selectedFile = File("sample.fastq"); var otherFile = File("OTHER-SAMPLE-SECRET.fastq");
        var manifest = JsonSerializer.Serialize(new { schemaVersion = 3, members = new[] {
            new { libraryId = library, libraryKey = "selected", memberId = member },
            new { libraryId = otherLibrary, libraryKey = "OTHER-SAMPLE-SECRET", memberId = otherMember } },
            supplementalDetails = new { confidential = "OTHER-SAMPLE-SECRET" } });
        var snapshot = new VendorResultsSnapshot(Guid.NewGuid(), "batch", "batch", sendout, "Vendor", "vendor job", noRun,
            null, null, null, noRun ? "Failure" : "Success", "Batch note", null, manifest,
            [new(member, library, "selected", noRun ? "Failure" : "Success", noRun ? "Selected sample failure" : null),
                new(otherMember, otherLibrary, "OTHER-SAMPLE-SECRET", noRun ? "Failure" : "Success", noRun ? "OTHER-SAMPLE-SECRET" : null)],
            [], noRun ? [] : [new(Guid.NewGuid(), member, "selected", 1, "single", 1, [selectedFile]), new(Guid.NewGuid(), otherMember, "OTHER-SAMPLE-SECRET", 1, "single", 1, [otherFile])]);
        var version = new LabVendorResultsVersion(Guid.NewGuid(), sendout, 2, JsonSerializer.Serialize(snapshot, JsonSerializerOptions.Web),
            "Corrected vendor result", Guid.NewGuid(), "Operator", DateTime.UtcNow.AddSeconds(-1));
        var projected = JsonSerializer.Serialize(LabInvestigationSequencing.Version(version, new Dictionary<Guid, string> { [library] = "selected" }), JsonSerializerOptions.Web);
        if (noRun) Assert.Contains("Selected sample failure", projected);
        else Assert.Contains("sample.fastq", projected);
        Assert.DoesNotContain("OTHER-SAMPLE-SECRET", projected); Assert.DoesNotContain(otherLibrary.ToString(), projected);
        using var json = JsonDocument.Parse(projected);
        Assert.Equal(noRun, json.RootElement.GetProperty("runNotPerformed").GetBoolean());
        Assert.True(json.RootElement.GetProperty("correctionRecorded").GetBoolean());
        Assert.Single(json.RootElement.GetProperty("libraries").EnumerateArray());
        Assert.Throws<OrderManagementException>(() => LabInvestigationSequencing.Members(manifest, new Dictionary<Guid, string> { [library] = "wrong-key" }));
    }

    [Fact]
    public void Shared_custody_does_not_return_other_sample_exception_arrays_or_previous_snapshots()
    {
        var entry = new LabCustodyEvent(Guid.NewGuid(), null, "VENDOR_RESULTS_CORRECTED", "Vendor",
            "{\"resultVersion\":2,\"previous\":{\"sample\":\"OTHER-SECRET\"},\"exceptions\":[{\"reason\":\"OTHER-SECRET\"}],\"fastqSetIds\":[\"OTHER-SECRET\"]}",
            Guid.NewGuid(), DateTime.UtcNow);
        var scoped = JsonSerializer.Serialize(LabInvestigationSequencing.Custody(entry, false), JsonSerializerOptions.Web);
        Assert.Contains("VENDOR_RESULTS_CORRECTED", scoped); Assert.Contains("resultVersion", scoped);
        Assert.DoesNotContain("OTHER-SECRET", scoped); Assert.DoesNotContain("previous", scoped);
        var tube = new LabCustodyEvent(entry.LabNgsSendoutId, Guid.NewGuid(), "TUBE_HANDOFF", "Laboratory",
            "{\"observedCondition\":\"Frozen\"}", entry.RecordedByUserId, entry.OccurredAtUtc);
        Assert.Contains("Frozen", JsonSerializer.Serialize(LabInvestigationSequencing.Custody(tube, true), JsonSerializerOptions.Web));
    }

    [Fact]
    public void Master_mix_exposure_uses_the_exact_recorded_preparation_identity()
    {
        var member = Guid.NewGuid(); var mix = Guid.NewGuid(); var workflow = Guid.NewGuid();
        var input = new LabPreparationStepInput(Guid.NewGuid(), "mix", "record", "recorded", [member],
            new Dictionary<string, JsonElement>(), [], null, null, true, false, false,
            [new("mix-used", ResourceId: mix, Quantity: 3, QuantityUnit: "uL")]);
        var command = new LabPreparationCommand(Guid.NewGuid(), 1, "step", Step: input);
        var step = Step(new() { Key = "mix-used", Label = "Mix used", Type = "material", Required = true, Scope = "batch",
            QuantityBasis = "perSample", Material = new("Mix", MasterMixWorkflowId: workflow, MasterMixWorkflowRevision: 2) });
        var use = Assert.Single(LabInvestigationResourceScope.Resolve(Record(command), command, Guid.NewGuid(), member, step, true));
        Assert.Equal("masterMix", use.Kind); Assert.Equal(mix, use.ResourceId); Assert.Equal(3, use.Quantity);
    }

    private static LabPreparationRecord Record(LabPreparationCommand command) => new(command.RequestId, Guid.NewGuid(), Guid.NewGuid(),
        command.Action, "hash", JsonSerializer.Serialize(command, JsonSerializerOptions.Web), DateTime.UtcNow);
    private static LabProtocolStepDefinition Step(LabProtocolCaptureDefinition field) => new()
    { Key = "mix", Name = "Mix", Instructions = "Test", Required = true, Repeatable = true, OperatorConfirmation = false,
        Captures = [field], InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [] };
    private static VendorResultsFastqFileSnapshot File(string name) => new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), name, name,
        1, 1, 1, "group", 10, new string('A', 64), 1);
}
