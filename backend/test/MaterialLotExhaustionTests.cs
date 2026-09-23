namespace PhaenoPortal.Test;

using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

public sealed class MaterialLotExhaustionTests
{
    private static LabMaterialLot Lot() => new(LabMaterialLotKind.PreparedReagent, Guid.NewGuid(), "TEST", null, null, Guid.NewGuid(), 100, "uL");

    [Fact]
    public void Exhaustion_preserves_actual_use_and_separately_adjusts_remainder()
    {
        var lot = Lot(); var record = Guid.NewGuid(); var actor = Guid.NewGuid(); var now = DateTime.UtcNow;
        lot.Consume(25, true, record, actor, now);
        Assert.Equal(0, lot.AvailableQuantity);
        using var history = JsonDocument.Parse(lot.QuantityHistoryJson);
        Assert.Equal(2, history.RootElement.GetArrayLength());
        Assert.Equal(25m, history.RootElement[0].GetProperty("consumedQuantity").GetDecimal());
        Assert.Equal(75m, history.RootElement[1].GetProperty("balanceAdjustmentQuantity").GetDecimal());
        Assert.Equal(record, history.RootElement[1].GetProperty("recordId").GetGuid());
        Assert.Equal(actor, history.RootElement[1].GetProperty("actorId").GetGuid());
        Assert.Throws<InvalidOperationException>(() => lot.Consume(1));
    }

    [Fact]
    public void Shared_lot_use_finishes_all_actual_debits_before_exhaustion_adjustment()
    {
        var lot = Lot(); var record = Guid.NewGuid(); var actor = Guid.NewGuid(); var now = DateTime.UtcNow;
        lot.Consume(25, recordId: record, actorId: actor, utcNow: now);
        lot.Consume(15, recordId: record, actorId: actor, utcNow: now);
        lot.ConfirmExhausted(record, actor, now);
        using var history = JsonDocument.Parse(lot.QuantityHistoryJson);
        Assert.Equal(25m, history.RootElement[0].GetProperty("consumedQuantity").GetDecimal());
        Assert.Equal(15m, history.RootElement[1].GetProperty("consumedQuantity").GetDecimal());
        Assert.Equal(60m, history.RootElement[2].GetProperty("balanceAdjustmentQuantity").GetDecimal());
        Assert.Equal(0, lot.AvailableQuantity);
    }

    [Fact]
    public void Exhaustion_does_not_bypass_overdraw_or_uncertain_balance_hold()
    {
        var lot = Lot(); var record = Guid.NewGuid(); var actor = Guid.NewGuid(); var now = DateTime.UtcNow;
        Assert.Throws<InvalidOperationException>(() => lot.Consume(101, true, record, actor, now));
        Assert.Equal(100, lot.AvailableQuantity);
        lot.HoldQuantity("Unknown sample usage", record, actor, now);
        Assert.Throws<InvalidOperationException>(() => lot.Consume(1, true, record, actor, now));
        Assert.Throws<InvalidOperationException>(() => lot.ConfirmExhausted(record, actor, now));
        Assert.Equal(100, lot.AvailableQuantity);
    }

    [Fact]
    public void Full_measured_consumption_needs_no_exhaustion_adjustment()
    {
        var lot = Lot();
        lot.Consume(100, recordId: Guid.NewGuid(), actorId: Guid.NewGuid(), utcNow: DateTime.UtcNow);
        using var history = JsonDocument.Parse(lot.QuantityHistoryJson);
        Assert.Single(history.RootElement.EnumerateArray());
        Assert.Equal(100m, history.RootElement[0].GetProperty("consumedQuantity").GetDecimal());
        Assert.Equal(JsonValueKind.Null, history.RootElement[0].GetProperty("balanceAdjustmentQuantity").ValueKind);
        Assert.Equal(0, lot.AvailableQuantity);
    }
}
