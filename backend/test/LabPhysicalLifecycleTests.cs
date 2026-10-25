namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public sealed class LabPhysicalLifecycleTests
{
    private static readonly DateTime Now = new(2026, 10, 24, 18, 0, 0, DateTimeKind.Utc);
    private static LabContainer Tube() => new(Guid.NewGuid(), Guid.NewGuid(), null, LabContainerKind.SubmittedSpecimen,
        "POMS-TUBE", "Test specimen", "BOX-A", 100, "µl", null);

    [Fact]
    public void PreservationHoldBlocksConsumptionAndFinalDisposition()
    {
        var tube = Tube(); tube.SetPhysicalHold("Incident preservation");
        Assert.Throws<InvalidOperationException>(() => tube.ConsumeBiologicalMaterial(10, "µl", false, Guid.NewGuid(), Guid.NewGuid(), Now));
        Assert.Throws<InvalidOperationException>(() => tube.RecordPhysicalDisposition("Destroyed", "Retention complete"));
        Assert.Equal(100, tube.Quantity);
        tube.SetPhysicalHold(null); tube.RecordPhysicalDisposition("Destroyed", "Retention complete");
        Assert.Equal(LabContainerStatus.Disposed, tube.Status); Assert.Equal(0, tube.Quantity);
    }

    [Fact]
    public void ReturnPreservesQuantityWithoutClaimingConsumptionAndClearsStorage()
    {
        var tube = Tube(); var box = new LabStorageBox("BOX-A", "Room 1", "Freezer 2", "Rack 3", "Shelf 4");
        tube.PlaceInBox(box, "b4"); Assert.Equal("B4", tube.StoragePosition);
        tube.RecordPhysicalDisposition("Returned", "Approved return");
        Assert.Equal(LabContainerStatus.Returned, tube.Status); Assert.Equal(100, tube.Quantity);
        Assert.Null(tube.Location); Assert.Null(tube.StorageBoxId);
        Assert.Throws<InvalidOperationException>(() => tube.PlaceInBox(box, "B4"));
        Assert.Throws<InvalidOperationException>(() => tube.RecordPhysicalDisposition("Destroyed", "Duplicate"));
    }

    [Fact]
    public void WorkingLocationEndsRegisteredBoxOccupancyAndRetainsTubeIdentity()
    {
        var tube = Tube(); var id = tube.Id; var barcode = tube.Barcode;
        tube.PlaceInBox(new("BOX-A", "Room", "Freezer", "Rack", "Shelf"), "A1");
        tube.Move("Tray 7 · A1"); Assert.Null(tube.StorageBoxId); Assert.Null(tube.StoragePosition);
        Assert.Equal(id, tube.Id); Assert.Equal(barcode, tube.Barcode);
    }

    [Fact]
    public void DueDateDoesNotPerformDisposition()
    {
        var tube = Tube(); tube.SetPhysicalRetention(Now.AddDays(-1));
        Assert.Equal(LabContainerStatus.Available, tube.Status); Assert.Equal(100, tube.Quantity);
    }

    [Fact]
    public void MeasuredIntervalAndAdditionalParticipantsRequireReview()
    {
        var performer = Guid.NewGuid(); var participant = Guid.NewGuid();
        var value = LabStepPerformance.Capture(new("earlier", true, "2026-10-24T10:30-07:00", "Bench worksheet",
            Interval: new("2026-10-24T10:00-07:00", "2026-10-24T10:30-07:00"), Participants: [new(participant, "Independent check")]), performer, Now);
        Assert.Equal("PendingReview", value.VerificationStatus);
        Assert.Equal(TimeSpan.FromMinutes(30), value.Interval!.CompletedAtUtc - value.Interval.StartedAtUtc);
        Assert.Equal(participant, Assert.Single(value.Participants!).UserId);
    }

    [Theory]
    [InlineData("2026-10-24T10:31-07:00", "2026-10-24T10:30-07:00")]
    [InlineData("2026-10-24T10:00", "2026-10-24T10:30-07:00")]
    [InlineData("2026-10-24T10:00-07:00", "2026-10-24T12:00-07:00")]
    public void IntervalRejectsReversalMissingOffsetAndFuture(string start, string end) =>
        Assert.Throws<ArgumentException>(() => LabStepPerformance.Capture(new("now", true, Interval: new(start, end)), Guid.NewGuid(), Now));

    [Fact]
    public void ParticipantIdentityCannotDuplicatePrimaryOrAnotherParticipant()
    {
        var actor = Guid.NewGuid(); var other = Guid.NewGuid();
        Assert.Throws<ArgumentException>(() => LabStepPerformance.Capture(new("now", true, LateEntryReason: "Worksheet", Participants: [new(actor, "Check")]), actor, Now));
        Assert.Throws<ArgumentException>(() => LabStepPerformance.Capture(new("now", true, LateEntryReason: "Worksheet", Participants: [new(other, "Check"), new(other, "Assist")]), actor, Now));
    }

    [Fact]
    public void PinnedProcedureRequiresActualTimingAndNamedParticipants()
    {
        var step = new LabProtocolStepDefinition { Key = "incubate", Name = "Incubate", Instructions = "TEST ONLY",
            Required = true, Repeatable = false, OperatorConfirmation = true, Captures = [], InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [],
            TimingRequired = true, MinimumParticipants = 2 };
        var single = LabStepPerformance.Capture(new("now", true), Guid.NewGuid(), Now);
        Assert.Throws<ArgumentException>(() => single.ValidateRequirements(step));
        var withTiming = LabStepPerformance.Capture(new("now", true, Interval: new("2026-10-24T10:00-07:00", "2026-10-24T10:30-07:00")), Guid.NewGuid(), Now);
        Assert.Throws<ArgumentException>(() => withTiming.ValidateRequirements(step));
    }
}
