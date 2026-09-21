namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public class SampleShippingPackingInstructionsTests
{
    private static readonly DateTime Now = new(2026, 9, 21, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData("Regular ice: use the approved sealed bags.")]
    [InlineData("No cooling required. Keep at the approved ambient conditions.")]
    [InlineData("Cold packs: condition and position as approved.")]
    [InlineData("Dry ice: use the approved amount for this container.")]
    public void UsesTheApprovedMethodWithoutAssumingDryIce(string control)
    {
        var sample = Sample();
        var rule = Rule(sample, Procedure());
        var pair = Pair(sample, rule, control);
        var result = SampleShippingPackingInstructions.Resolve(Resolution(sample, rule), [pair], Keys(sample));
        Assert.Equal(control, Assert.Single(result).TemperatureControlInstructions);
        Assert.Equal(pair.PackingInstructions, result[0].PackingInstructions);
    }

    [Fact]
    public void UsesTheActualContainerCombinationWithoutScalingOrSummingAmounts()
    {
        var sample = Sample();
        var rule = Rule(sample, Procedure());
        var small = Pair(sample, rule, "Synthetic small-container amount: 2 units.");
        var large = Pair(sample, rule, "Synthetic large-container amount: 5 units.");
        Assert.Equal(small.TemperatureControlInstructions, Assert.Single(SampleShippingPackingInstructions.Resolve(Resolution(sample, rule), [small], Keys(sample))).TemperatureControlInstructions);
        Assert.Equal(large.TemperatureControlInstructions, Assert.Single(SampleShippingPackingInstructions.Resolve(Resolution(sample, rule), [large], Keys(sample))).TemperatureControlInstructions);
    }

    [Fact]
    public void RejectsMissingNewPackingAndConflictingMixedSampleControls()
    {
        var first = Sample(); var second = Sample();
        var procedure = Procedure(); var rule = Rule(first, procedure); var other = Rule(second, procedure);
        Assert.Throws<InvalidOperationException>(() => SampleShippingPackingInstructions.Resolve(Resolution(first, rule), [], Keys(first)));
        var incomplete = new SampleShippingContainerCompatibility(Guid.NewGuid(), first.Id, rule.Id, "Regular ice", null);
        Assert.Throws<InvalidOperationException>(() => SampleShippingPackingInstructions.Resolve(Resolution(first, rule), [incomplete], Keys(first)));
        var combined = new SampleShippingResolution(null!, [new(first, rule), new(second, other)], "TEST", false);
        Assert.Throws<InvalidOperationException>(() => SampleShippingPackingInstructions.Resolve(combined,
            [Pair(first, rule, "Regular ice"), Pair(second, other, "No cooling")], Keys(first, second)));
        var same = SampleShippingPackingInstructions.Resolve(combined,
            [Pair(first, rule, "Regular ice"), Pair(second, other, "Regular ice")], Keys(first, second));
        Assert.Equal(2, same.Count);
        Assert.All(same, item => Assert.Equal("Regular ice", item.TemperatureControlInstructions));
    }

    [Fact]
    public void ApprovedProcedureIsAuthoritativeAndDraftCannotBeAssigned()
    {
        var procedure = Procedure(); var rule = Rule(Sample(), procedure);
        Assert.Equal(procedure.Id, rule.ShippingProcedureId);
        Assert.Equal(procedure.PackingInstructions, rule.PackingInstructions);
        Assert.Equal(procedure.CarrierInstructions, rule.CarrierInstructions);
        Assert.Equal("Destination exception", rule.DestinationInstructions);
        Assert.Empty(rule.DeliveryInstructions);
        Assert.Throws<ArgumentException>(() => Rule(Sample(), Procedure(false)));
        var revision = new SampleShippingProcedure(procedure.DefinitionKey, 2, procedure.Id,
            "Updated", "Updated packing", "Transit", "Carrier", "Dispatch", "Documents", "Exceptions", null, true);
        Assert.NotEqual(revision.PackingInstructions, rule.PackingInstructions);
        Assert.Equal(procedure.Id, rule.ShippingProcedureId);
    }

    [Fact]
    public void LegacyAssignmentsRemainUsableAndNewSamplesNeedNoDuplicatePackingText()
    {
        var sample = Sample(); var legacy = Rule(sample, null);
        Assert.Empty(sample.PackagingInstructions);
        Assert.Empty(SampleShippingPackingInstructions.Resolve(Resolution(sample, legacy), [], Keys(sample)));
        Assert.Equal("Legacy packing", legacy.PackingInstructions);
    }

    private static SampleShippingProcedure Procedure(bool active = true) => new(Guid.NewGuid(), 1, null,
        "Synthetic procedure", "Shared packing", "Approved transit", "Approved carrier", "Dispatch", "Documents", "Exceptions", null, active);
    private static SampleTypeDefinition Sample() => new(Guid.NewGuid(), 1, null, "TEST", "Synthetic sample", "Test only", "Test material",
        1, null, "tube", "Approved tube", "Preservation", null, "", "Safe labels", "No personal identifiers", "Safety", null, 48, Now, true);
    private static SampleShippingInstructionRule Rule(SampleTypeDefinition sample, SampleShippingProcedure? procedure) => new(Guid.NewGuid(), 1, null,
        Guid.NewGuid(), sample.Id, "TEST", "Legacy packing", "Legacy temperature", "Legacy carrier", "Legacy dispatch", "Legacy delivery",
        "Legacy documents", "Legacy exceptions", null, false, Now, true, procedure, "Destination exception");
    private static SampleShippingContainerCompatibility Pair(SampleTypeDefinition sample, SampleShippingInstructionRule rule, string control)
        => new(Guid.NewGuid(), sample.Id, rule.Id, control, "Approved packing for this combination");
    private static SampleShippingResolution Resolution(SampleTypeDefinition sample, SampleShippingInstructionRule rule) => new(null!, [new(sample, rule)], "TEST", false);
    private static Dictionary<Guid, Guid> Keys(params SampleTypeDefinition[] samples) => samples.ToDictionary(item => item.Id, item => item.DefinitionKey);
}
