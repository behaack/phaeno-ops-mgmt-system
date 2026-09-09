using PSeq.Operations.Commercial.OrderManagement.Domain;

namespace PhaenoPortal.Tests;

public sealed class SamplePackingInvariantTests
{
    [Fact]
    public void MovingUnmatchedSlotPreservesGlobalOrdinal()
    {
        var slot = new SampleShipmentTubeSlot(Guid.NewGuid(), 4);
        var target = Guid.NewGuid();
        slot.MoveTo(target);
        Assert.Equal(target, slot.SampleShipmentItemId);
        Assert.Equal(4, slot.Ordinal);
    }

    [Fact]
    public void MovingMatchedSlotRequiresExplicitCorrection()
    {
        var original = Guid.NewGuid();
        var slot = new SampleShipmentTubeSlot(original, 2);
        slot.AssignTube(Guid.NewGuid(), DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => slot.MoveTo(Guid.NewGuid()));
        Assert.Equal(original, slot.SampleShipmentItemId);
    }

    [Fact]
    public void ReceivingOneTubeDoesNotReceiveOtherTubes()
    {
        var now = DateTime.UtcNow;
        var kit = Guid.NewGuid();
        var first = new RegisteredSampleTube(kit, "PACK-FIRST");
        var second = new RegisteredSampleTube(kit, "PACK-SECOND");
        first.MarkAssigned(now.AddMinutes(-1));
        second.MarkAssigned(now.AddMinutes(-1));
        first.RecordReceipt(now);
        Assert.Equal(now, first.ReceivedAt);
        Assert.Null(second.ReceivedAt);
    }

    [Fact]
    public void UnassignedTubeCannotBeReceived()
    {
        var tube = new RegisteredSampleTube(Guid.NewGuid(), "PACK-UNASSIGNED");
        Assert.Throws<InvalidOperationException>(() => tube.RecordReceipt(DateTime.UtcNow));
        Assert.Null(tube.ReceivedAt);
    }
}
