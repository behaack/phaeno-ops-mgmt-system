namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class ReleasedDeliverableRetentionDecisionTests
{
    private static readonly DateTime Released = new(2026, 8, 1, 12, 0, 0, DateTimeKind.Utc);
    private static ReleasedDeliverableRetentionSnapshot Snapshot() => ReleasedDeliverableRetentionSnapshot.ForLabResult(
        Guid.NewGuid(), Guid.NewGuid(), new(1, ReleasedDeliverablePolicyValues.Create(30, 5, 5), "Synthetic policy"), null, Released);

    [Theory]
    [InlineData(24, false, true, false)]
    [InlineData(25, true, true, false)]
    [InlineData(29, true, true, false)]
    [InlineData(30, false, true, true)]
    [InlineData(34, false, true, true)]
    [InlineData(35, false, false, true)]
    [InlineData(45, false, false, true)]
    public void IncompletePackageUsesExactWarningAndWholePackageGrace(int elapsedDays, bool warning, bool available, bool grace)
    {
        var snapshot = Snapshot();
        var decision = ReleasedDeliverableRetentionDecision.Evaluate(snapshot, [Released.AddDays(1), null], Released.AddDays(elapsedDays));
        Assert.Equal(warning, decision.ShowUndownloadedWarning);
        Assert.Equal(available, decision.IsDownloadAvailable);
        Assert.Equal(grace, decision.GraceActivatedAtUtc.HasValue);
        if (grace) Assert.Equal(snapshot.StandardDeletionAtUtc, decision.GraceActivatedAtUtc);
        if (!available) Assert.Equal(snapshot.PotentialFinalDeletionAtUtc, decision.DownloadAccessClosedAtUtc);
    }

    [Fact]
    public void EveryFileCompletedBeforeStandardSuppressesWarningAndGrace()
    {
        var snapshot = Snapshot();
        Assert.False(ReleasedDeliverableRetentionDecision.Evaluate(snapshot, [Released.AddDays(1)], Released.AddDays(26)).ShowUndownloadedWarning);
        var decision = ReleasedDeliverableRetentionDecision.Evaluate(snapshot, [Released.AddDays(1)], Released.AddDays(30));
        Assert.False(decision.IsDownloadAvailable);
        Assert.Null(decision.GraceActivatedAtUtc);
        Assert.Equal(snapshot.StandardDeletionAtUtc, decision.DownloadAccessClosedAtUtc);
    }

    [Theory]
    [InlineData(30)]
    [InlineData(31)]
    public void CompletionAtOrAfterStandardNeverCancelsGrace(int completionDay)
    {
        var decision = ReleasedDeliverableRetentionDecision.Evaluate(Snapshot(), [Released.AddDays(completionDay)], Released.AddDays(34));
        Assert.True(decision.IsDownloadAvailable);
        Assert.Equal(Released.AddDays(30), decision.GraceActivatedAtUtc);
        Assert.Equal(Released.AddDays(35), decision.DeletionDueAtUtc);
    }

    [Fact]
    public void PersistedGraceCannotBeReversedByAnEarlierLookingCompletion()
    {
        var snapshot = Snapshot();
        var due = Released.AddDays(30);
        snapshot.ApplyDeadlineDecision(ReleasedDeliverableRetentionDecision.Evaluate(snapshot, [null], due), due);
        var after = ReleasedDeliverableRetentionDecision.Evaluate(snapshot, [Released.AddDays(1)], due.AddDays(1));
        Assert.Equal(due, after.GraceActivatedAtUtc);
        Assert.Equal(Released.AddDays(35), after.DeletionDueAtUtc);
        Assert.True(after.IsDownloadAvailable);
    }

    [Fact]
    public void WarningCheckpointRecordsOneImmutableOutcomeAndGraceHasOneNotice()
    {
        var snapshot = Snapshot();
        Assert.Throws<ArgumentException>(() => snapshot.RecordWarningCheckpoint(Released, "Queued", Guid.NewGuid()));
        snapshot.RecordWarningCheckpoint(snapshot.WarningAtUtc, "Queued", Guid.NewGuid());
        Assert.Throws<InvalidOperationException>(() => snapshot.RecordWarningCheckpoint(snapshot.WarningAtUtc, "SkippedComplete", null));
        Assert.Throws<InvalidOperationException>(() => snapshot.RecordGraceNotification(Guid.NewGuid()));
        snapshot.ApplyDeadlineDecision(ReleasedDeliverableRetentionDecision.Evaluate(snapshot, [null], snapshot.StandardDeletionAtUtc), snapshot.StandardDeletionAtUtc);
        snapshot.RecordGraceNotification(Guid.NewGuid());
        Assert.Throws<InvalidOperationException>(() => snapshot.RecordGraceNotification(Guid.NewGuid()));
    }

    [Fact]
    public void SnapshotScheduleRejectsTheOldWorkerAndLegacyDatesStillDenyWithoutWorkerProgress()
    {
        var schedule = new ResultRetentionSchedule(Guid.NewGuid(), Snapshot());
        Assert.Throws<InvalidOperationException>(() => schedule.Advance(Released.AddYears(1)));
        Assert.False(schedule.AllowsLegacyDownload(Released));
        var legacy = new ResultRetentionSchedule(Guid.NewGuid(), Released.AddDays(10), Released.AddDays(20), Released.AddDays(25), Released.AddDays(30));
        Assert.True(legacy.AllowsLegacyDownload(Released.AddDays(20).AddTicks(-1)));
        Assert.False(legacy.AllowsLegacyDownload(Released.AddDays(20)));
        Assert.Equal(ResultRetentionState.Active, legacy.State);
    }
}
