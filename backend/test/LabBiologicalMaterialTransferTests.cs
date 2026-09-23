namespace PhaenoPortal.Test;

using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabBiologicalMaterialTransferTests
{
    private static readonly Guid Actor = Guid.NewGuid();
    private static readonly DateTime Now = new(2026, 9, 23, 12, 0, 0, DateTimeKind.Utc);

    private static (LabContainer Source, LabContainer Destination, LabSpecimenAttempt Attempt) Material(decimal? quantity = 100)
    {
        var work = Guid.NewGuid(); var specimen = Guid.NewGuid();
        var source = new LabContainer(work, specimen, null, LabContainerKind.SubmittedSpecimen,
            "TEST-SOURCE", "Test source", "Freezer", quantity, quantity.HasValue ? "uL" : null, null, quantityBasis: "CustomerDeclared");
        var attempt = new LabSpecimenAttempt(work, specimen, source.Id, Guid.NewGuid(), 1, null);
        var destination = new LabContainer(work, specimen, source.Id, LabContainerKind.Library,
            "TEST-LIBRARY", "Test library", "Tray A1", null, null, null, LabContainerBarcodeSource.Manufacturer);
        destination.AttachAttempt(attempt);
        return (source, destination, attempt);
    }

    private static LabBiologicalMaterialTransfer Transfer((LabContainer Source, LabContainer Destination, LabSpecimenAttempt Attempt) material,
        decimal quantity, bool exhausted = false, string unit = "uL") => LabBiologicalMaterialTransfer.Record(Guid.NewGuid(), new string('a', 64),
            material.Source, material.Destination, material.Attempt, quantity, unit, exhausted, Actor, Now, preparationMemberId: Guid.NewGuid());

    [Fact]
    public void Partial_transfer_preserves_declared_opening_and_records_actual_remainder()
    {
        var material = Material();
        var transfer = Transfer(material, 25);
        Assert.Equal(100m, material.Source.InitialQuantity);
        Assert.Equal("CustomerDeclared", material.Source.QuantityBasis);
        Assert.Equal(75m, material.Source.Quantity);
        Assert.Equal(25m, material.Destination.Quantity);
        Assert.Equal(25m, transfer.Quantity);
        Assert.Equal(100m, transfer.SourceQuantityBefore);
        Assert.Equal(75m, transfer.SourceQuantityAfter);
        Assert.Null(transfer.BalanceAdjustmentQuantity);
        Assert.Equal(LabContainerStatus.Available, material.Source.Status);
    }

    [Fact]
    public void Exhaustion_override_retains_true_aliquot_and_separate_balance_adjustment()
    {
        var material = Material();
        var transfer = Transfer(material, 25, exhausted: true);
        Assert.Equal(25m, transfer.Quantity);
        Assert.Equal(25m, material.Destination.Quantity);
        Assert.Equal(75m, transfer.BalanceAdjustmentQuantity);
        Assert.Equal(0m, material.Source.Quantity);
        Assert.Equal(LabContainerStatus.Consumed, material.Source.Status);
        Assert.Throws<InvalidOperationException>(() => Transfer(material, 1));
        using var history = JsonDocument.Parse(material.Source.QuantityHistoryJson);
        Assert.Equal(25m, history.RootElement[0].GetProperty("transferred").GetDecimal());
        Assert.Equal(75m, history.RootElement[0].GetProperty("balanceAdjustment").GetDecimal());
    }

    [Fact]
    public void Unknown_opening_stays_unknown_until_operator_confirms_exhaustion()
    {
        var material = Material(null);
        var first = Transfer(material, 25);
        Assert.Null(first.SourceQuantityBefore);
        Assert.Null(first.SourceQuantityAfter);
        Assert.Null(material.Source.InitialQuantity);
        Assert.Null(material.Source.Quantity);
        var last = Transfer(material, 5, exhausted: true);
        Assert.Null(last.SourceQuantityBefore);
        Assert.Null(last.BalanceAdjustmentQuantity);
        Assert.Equal(0m, last.SourceQuantityAfter);
        Assert.Equal(30m, material.Destination.Quantity);
    }

    [Theory]
    [InlineData(101, "uL")]
    [InlineData(1, "mL")]
    [InlineData(0, "uL")]
    public void Overdraw_wrong_unit_and_zero_leave_both_tubes_unchanged(decimal quantity, string unit)
    {
        var material = Material();
        Assert.Throws<ArgumentException>(() => Transfer(material, quantity, unit: unit));
        Assert.Equal(100m, material.Source.Quantity);
        Assert.Null(material.Destination.Quantity);
        Assert.Equal("[]", material.Source.QuantityHistoryJson);
        Assert.Equal("[]", material.Destination.QuantityHistoryJson);
    }

    [Fact]
    public void Repeat_input_accumulates_until_prepared_yield_without_a_second_source_debit()
    {
        var material = Material();
        Transfer(material, 25); Transfer(material, 10);
        Assert.Equal(35m, material.Destination.Quantity);
        Assert.Equal(65m, material.Source.Quantity);
        material.Destination.RecordPreparedQuantity(60, "uL", Guid.NewGuid(), Actor, Now);
        Assert.Equal(60m, material.Destination.Quantity);
        Assert.Equal(65m, material.Source.Quantity);
        Assert.Equal("Measured", material.Destination.QuantityBasis);
        Assert.Throws<InvalidOperationException>(() => Transfer(material, 1));
        Assert.Equal(65m, material.Source.Quantity);
    }

    [Fact]
    public void Wrong_attempt_destination_rejected_before_source_debit()
    {
        var material = Material();
        var other = new LabSpecimenAttempt(material.Source.LabWorkOrderId, material.Source.LabSpecimenId!.Value,
            material.Source.Id, Guid.NewGuid(), 2, material.Attempt.Id);
        Assert.Throws<ArgumentException>(() => LabBiologicalMaterialTransfer.Record(Guid.NewGuid(), new string('b', 64),
            material.Source, material.Destination, other, 10, "uL", false, Actor, Now, preparationMemberId: Guid.NewGuid()));
        Assert.Equal(100m, material.Source.Quantity);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Sequencing_transfer_rejects_unfinished_or_failed_attempt_before_debit(bool failed)
    {
        var material = Material();
        Transfer(material, 25);
        if (failed)
        {
            material.Attempt.Start(material.Source.Barcode, material.Source.Barcode, Now);
            material.Attempt.Fail("material_unusable", "Failed preparation", Guid.NewGuid(), Actor, Now);
        }
        var sequencingTube = new LabContainer(material.Source.LabWorkOrderId, material.Source.LabSpecimenId,
            material.Destination.Id, LabContainerKind.Sequencing, "TEST-SEQUENCING", "Test aliquot", "Sendout rack", null, null, null);
        sequencingTube.AttachAttempt(material.Attempt);
        Assert.Throws<InvalidOperationException>(() => LabBiologicalMaterialTransfer.Record(Guid.NewGuid(), new string('c', 64),
            material.Destination, sequencingTube, material.Attempt, 5, "uL", false, Actor, Now, sequencingBatchMemberId: Guid.NewGuid()));
        Assert.Equal(25m, material.Destination.Quantity);
        Assert.Null(sequencingTube.Quantity);
        Assert.Equal("[]", sequencingTube.QuantityHistoryJson);
    }

    [Fact]
    public void Successful_library_can_supply_sequencing_after_original_source_is_exhausted()
    {
        var material = Material();
        Transfer(material, 25, exhausted: true);
        material.Destination.RecordPreparedQuantity(20, "uL", Guid.NewGuid(), Actor, Now);
        material.Attempt.Start(material.Source.Barcode, material.Source.Barcode, Now);
        material.Attempt.Refresh(false, true, Actor, Now);
        var sequencingTube = new LabContainer(material.Source.LabWorkOrderId, material.Source.LabSpecimenId,
            material.Destination.Id, LabContainerKind.Sequencing, "TEST-SEQUENCING", "Test aliquot", "Sendout rack", null, null, null);
        sequencingTube.AttachAttempt(material.Attempt);
        var transfer = LabBiologicalMaterialTransfer.Record(Guid.NewGuid(), new string('d', 64), material.Destination,
            sequencingTube, material.Attempt, 5, "uL", false, Actor, Now, sequencingBatchMemberId: Guid.NewGuid());
        Assert.Equal(5m, transfer.Quantity);
        Assert.Equal(15m, material.Destination.Quantity);
        Assert.Equal(5m, sequencingTube.Quantity);
        Assert.Equal(0m, material.Source.Quantity);
        Assert.Equal(LabContainerStatus.Consumed, material.Source.Status);
    }

    [Fact]
    public void Biological_field_is_per_sample_and_preserves_protocol_unit()
    {
        var original = LabPreparationBatchTests.Definition();
        var capture = new LabProtocolCaptureDefinition { Key = "sample-input", Label = "Sample input", Type = "biologicalMaterial", Required = true, Scope = "tube", Unit = "uL" };
        var definition = original with { Steps = [original.Steps[0] with { Captures = [capture] }] };
        Assert.True(LabProtocolDefinition.Parse(definition.ToJson()).Steps[0].Captures[0].IsResource);
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse((definition with { Steps = [definition.Steps[0] with { Captures = [capture with { Scope = "batch" }] }] }).ToJson()));
        Assert.Throws<ArgumentException>(() => LabProtocolDefinition.Parse((definition with { Steps = [definition.Steps[0] with { Captures = [capture, capture with { Key = "second-input" }] }] }).ToJson()));
    }
}
