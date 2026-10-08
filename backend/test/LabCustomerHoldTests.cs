namespace PhaenoPortal.Test;
using PSeq.Operations.Laboratory.Domain;
public sealed class LabCustomerHoldTests
{
    [Fact] public void PausingAndResumingRequireSeparateExplicitDecisions()
    {
        var actor = Guid.NewGuid(); var hold = new LabCustomerHold(Guid.NewGuid(), Guid.NewGuid(), actor, "pause", DateTime.UtcNow);
        Assert.Equal("Requested", hold.State); Assert.Null(hold.PausedAtUtc);
        Assert.Throws<InvalidOperationException>(() => hold.Decide("resume", "early", actor, DateTime.UtcNow));
        hold.Decide("apply", "safe boundary", actor, DateTime.UtcNow); Assert.Equal("Applied", hold.State); Assert.NotNull(hold.PausedAtUtc);
        hold.RequestResume("continue"); Assert.Equal("ResumeRequested", hold.State);
        hold.Decide("keep-held", "still unsafe", actor, DateTime.UtcNow); Assert.Equal("Applied", hold.State); Assert.NotNull(hold.PausedAtUtc);
        hold.RequestResume("try again"); hold.Decide("resume", "safe", actor, DateTime.UtcNow); Assert.Equal("Released", hold.State);
        Assert.Throws<InvalidOperationException>(() => hold.RequestResume("again"));
        var underway = new LabCustomerHold(Guid.NewGuid(), Guid.NewGuid(), actor, "pause", DateTime.UtcNow);
        underway.Decide("unable", "procedure underway", actor, DateTime.UtcNow); underway.RequestResume("continue");
        Assert.Null(underway.PausedAtUtc); // Asking to resume does not invent a physical pause.
        Assert.Throws<ArgumentException>(() => new LabCustomerHold(Guid.NewGuid(), Guid.NewGuid(), actor, " ", DateTime.UtcNow));
    }
}
