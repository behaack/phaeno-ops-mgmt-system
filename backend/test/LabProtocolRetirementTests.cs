namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabProtocolRetirementTests
{
    [Fact]
    public void RetirementPreservesIdentityAndRejectsFurtherChanges()
    {
        var protocol = new LabProtocol("test-retirement", "Test retirement", "Synthetic fixture");
        protocol.RecordVersion(1);
        var id = protocol.Id;
        var actor = Guid.NewGuid();
        var now = DateTime.UtcNow;
        protocol.Retire("  Replaced  ", actor, now);
        Assert.Equal(id, protocol.Id);
        Assert.Equal("Test retirement", protocol.Name);
        Assert.Equal(1, protocol.LatestVersion);
        Assert.Equal("Replaced", protocol.RetirementReason);
        Assert.Equal(actor, protocol.RetiredByUserId);
        Assert.Equal(now, protocol.RetiredAtUtc);
        Assert.Throws<InvalidOperationException>(() => protocol.RequireCurrent());
        Assert.Throws<InvalidOperationException>(() => protocol.RecordVersion(2));
        Assert.Throws<InvalidOperationException>(() => protocol.UpdateDetails("Changed", null));
        Assert.Throws<InvalidOperationException>(() => protocol.Retire("Again", actor, now));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void MissingReasonDoesNotPartiallyRetire(string reason)
    {
        var protocol = new LabProtocol("test", "Test", null);
        Assert.Throws<ArgumentException>(() => protocol.Retire(reason, Guid.NewGuid(), DateTime.UtcNow));
        Assert.Null(protocol.RetiredAtUtc);
        Assert.Null(protocol.RetirementReason);
    }

    [Fact]
    public void InvalidActorOrLongReasonDoesNotPartiallyRetire()
    {
        var protocol = new LabProtocol("test", "Test", null);
        Assert.Throws<ArgumentException>(() => protocol.Retire("Reason", Guid.Empty, DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => protocol.Retire(new string('x', 1001), Guid.NewGuid(), DateTime.UtcNow));
        Assert.Null(protocol.RetiredAtUtc);
        Assert.Null(protocol.RetirementReason);
    }
}
