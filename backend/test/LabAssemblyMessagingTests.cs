namespace PhaenoPortal.Test;

using System.Security.Claims;
using PhaenoPortal.App.Features.LabOperations.Services;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabAssemblyMessagingTests
{
    private static readonly DateTime Now = new(2026, 9, 30, 1, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Delivery_retries_keep_identity_and_receipt_does_not_establish_execution()
    {
        var job = LabAssemblyTests.Job();
        var command = new LabAssemblyCommand(job.Id, "Run", Now);
        var identity = command.Id;
        command.Attempt(Now, 5, 60);
        Assert.False(command.IsDue(Now.AddSeconds(4)));
        Assert.Throws<InvalidOperationException>(() => command.Attempt(Now, 5, 60));
        command.Attempt(Now.AddSeconds(5), 5, 60);
        Assert.Equal(Now.AddSeconds(15), command.NextAttemptAtUtc);
        command.Receive(Now.AddSeconds(6));
        Assert.Null(command.ConfirmedAtUtc); Assert.Null(job.StartedAtUtc);
        Assert.Equal(identity, command.Id); Assert.Equal(2, command.AttemptCount);
        Assert.True(command.Escalate(Now.AddMinutes(30), 1800));
        Assert.False(command.Escalate(Now.AddMinutes(31), 1800));
        Assert.True(command.IsDue(Now.AddMinutes(31)));
        command.Confirm(Now.AddMinutes(31));
        Assert.False(command.IsDue(Now.AddDays(1)));
    }

    [Fact]
    public void A_terminal_race_can_resolve_cancel_without_claiming_its_command_was_received()
    {
        var command = new LabAssemblyCommand(Guid.NewGuid(), "Cancel", Now);
        command.Confirm(Now.AddMinutes(1));
        Assert.Null(command.ReceivedAtUtc); Assert.Equal(0, command.AttemptCount);
        Assert.NotNull(command.ConfirmedAtUtc); Assert.False(command.IsDue(Now.AddDays(1)));
    }

    [Fact]
    public void Accepted_receipt_cannot_establish_an_execution_start()
    {
        var job = LabAssemblyTests.Job();
        Assert.Throws<ArgumentException>(() => job.Observe("external", "Accepted", Now, null, null, null, null, false, Now));
        Assert.Null(job.StartedAtUtc); Assert.Equal("Queued", job.State);
    }

    [Fact]
    public void Provider_cancellation_before_start_has_no_execution_times_and_replays_idempotently()
    {
        var job = LabAssemblyTests.Job(); job.BeginDispatch(Now);
        Assert.True(job.Observe("external", "CancelledBeforeStart", null, null, Now, "Cancelled", null, true, Now));
        Assert.False(job.Observe("external", "CancelledBeforeStart", null, null, Now, "Cancelled", null, true, Now.AddHours(1)));
        Assert.Null(job.StartedAtUtc); Assert.Null(job.StoppedAtUtc);
        Assert.Throws<InvalidOperationException>(() => job.Observe("external", "Failed", null, null, Now, "Failed", null, true, Now));
    }

    [Fact]
    public void Conflicting_replay_keeps_the_original_receipt_and_blocks_acknowledgment()
    {
        var receipt = new LabAssemblyReceipt(Guid.NewGuid(), "test", "event", 1, Now, Now, new string('A', 64), "{}", "Applied");
        Assert.True(receipt.CanAcknowledge);
        Assert.True(receipt.Conflict(new string('B', 64), Now));
        Assert.False(receipt.Conflict(new string('C', 64), Now.AddHours(1)));
        Assert.Equal(new string('A', 64), receipt.PayloadSha256);
        Assert.Equal(new string('B', 64), receipt.ConflictSha256); Assert.False(receipt.CanAcknowledge);
    }

    [Fact]
    public void Reconnected_subscriptions_refresh_saved_versions_and_cannot_receive_unwatched_jobs()
    {
        var subscriptions = new LabAssemblySubscriptions();
        var job = Guid.NewGuid(); var other = Guid.NewGuid(); var user = Guid.NewGuid();
        subscriptions.Add("first", user, new ClaimsPrincipal(), () => { });
        var first = subscriptions.Require("first"); first.Watch([job]);
        Assert.True(first.Changed(job, 1)); Assert.False(first.Changed(other, 1));
        first.Sent(job, 1); Assert.False(first.Changed(job, 1)); Assert.True(first.Changed(job, 2));
        first.Watch([other]); Assert.False(first.Changed(job, 2));
        subscriptions.Remove("first"); subscriptions.Add("restart", user, new ClaimsPrincipal(), () => { });
        var restarted = subscriptions.Require("restart"); restarted.Watch([job]);
        Assert.True(restarted.Changed(job, 1));
    }
}
