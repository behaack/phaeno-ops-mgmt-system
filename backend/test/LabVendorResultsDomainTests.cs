namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabVendorResultsDomainTests
{
    private static LabNgsSendout New() => new(Guid.NewGuid(), "SIMULATED vendor", null, "{}", null);

    [Fact]
    public void ResultsCaptureDistinctTimesAndRequireNotesForCorrections()
    {
        var sendout = New(); var t = DateTime.UtcNow.AddHours(-1);
        sendout.SetStatus(LabNgsSendoutStatus.Shipped, t);
        sendout.SetStatus(LabNgsSendoutStatus.ReceivedByProvider, t.AddMinutes(1));
        Assert.Throws<ArgumentException>(() => sendout.RecordResults("SIM-RUN", false, t.AddMinutes(2), t.AddMinutes(1), t.AddMinutes(5), LabVendorOutcome.Success, null));
        sendout.RecordResults("SIM-RUN", false, t.AddMinutes(2), t.AddMinutes(4), t.AddMinutes(5), LabVendorOutcome.Success, null);
        Assert.Equal(t.AddMinutes(4), sendout.SequencingCompletedAtUtc);
        Assert.Equal(t.AddMinutes(5), sendout.ResultsReceivedAtUtc);
        Assert.Equal(false, sendout.RunNotPerformed);
        sendout.RecordResults("SIM-RUN", false, t.AddMinutes(2), t.AddMinutes(4), t.AddMinutes(5), LabVendorOutcome.Success, "Additional data handoff");
        Assert.Throws<ArgumentException>(() => sendout.RecordResults("SIM-RUN", false, t.AddMinutes(2), t.AddMinutes(4), t.AddMinutes(6), LabVendorOutcome.Success, null));
        sendout.RecordResults("SIM-RUN", false, t.AddMinutes(2), t.AddMinutes(4), t.AddMinutes(6), LabVendorOutcome.Failure, "SIMULATED corrected vendor report");
        Assert.Equal(LabVendorOutcome.Failure, sendout.Outcome);
        Assert.Equal(t.AddMinutes(6), sendout.ResultsReceivedAtUtc);
    }

    [Fact]
    public void RunNotPerformedRequiresReasonAndRetainsAbsentRunTimes()
    {
        var sendout = New(); var t = DateTime.UtcNow.AddHours(-1);
        sendout.SetStatus(LabNgsSendoutStatus.Shipped, t);
        sendout.SetStatus(LabNgsSendoutStatus.ReceivedByProvider, t.AddMinutes(1));
        Assert.Throws<ArgumentException>(() => sendout.RecordResults("SIM-NORUN", true, null, null, null, LabVendorOutcome.Failure, null));
        sendout.RecordResults("SIM-NORUN", true, null, null, null, LabVendorOutcome.Failure, "SIMULATED rejected input; run not performed");
        Assert.True(sendout.RunNotPerformed);
        Assert.Null(sendout.SequencingStartedAtUtc); Assert.Null(sendout.SequencingCompletedAtUtc);
        Assert.Null(sendout.ResultsReceivedAtUtc);
        Assert.NotNull(sendout.OutcomeAtUtc);
    }

    [Fact]
    public void SeparateSequencingAndResultsTransitionsAreNotAvailable()
    {
        var sendout = New(); var time = DateTime.UtcNow.AddMinutes(-1);
        sendout.SetStatus(LabNgsSendoutStatus.Shipped, time);
        sendout.SetStatus(LabNgsSendoutStatus.ReceivedByProvider, time);
        Assert.Throws<InvalidOperationException>(() => sendout.SetStatus(LabNgsSendoutStatus.Sequencing, time));
        Assert.Throws<InvalidOperationException>(() => sendout.SetStatus(LabNgsSendoutStatus.ResultsReceived, time));
        Assert.Null(sendout.SequencingStartedAtUtc);
        Assert.Null(sendout.ResultsReceivedAtUtc);
        Assert.Null(sendout.Outcome);
    }

    [Fact]
    public void DispatchFreezesDestinationButTrackingAndEtaCanBeUpdated()
    {
        var sendout = New(); var time = DateTime.UtcNow;
        sendout.UpdateShipment("SIMULATED vendor dock", "SIMULATED carrier", "SIM-1", "RUN-1", null);
        sendout.SetStatus(LabNgsSendoutStatus.Shipped, time);
        Assert.Throws<InvalidOperationException>(() => sendout.UpdateShipment("Other dock", "Carrier", "SIM-2", null, null));
        sendout.UpdateShipment("SIMULATED vendor dock", "SIMULATED carrier", "SIM-2", "RUN-1", time.AddDays(7));
        Assert.Equal("SIM-2", sendout.TrackingReference);
        Assert.Equal(time.AddDays(7), sendout.ExpectedCompletionAtUtc);
    }

    [Fact]
    public void CompletedSendoutCannotFillPreviouslyMissingResults()
    {
        var sendout = New(); var time = DateTime.UtcNow.AddMinutes(-10);
        sendout.SetStatus(LabNgsSendoutStatus.Shipped, time);
        sendout.SetStatus(LabNgsSendoutStatus.ReceivedByProvider, time.AddMinutes(1));
        typeof(LabNgsSendout).GetProperty(nameof(LabNgsSendout.Status))!.SetValue(sendout, LabNgsSendoutStatus.Complete);
        Assert.Throws<InvalidOperationException>(() => sendout.RecordResults("SIM-RUN", false,
            time.AddMinutes(2), time.AddMinutes(3), time.AddMinutes(4), LabVendorOutcome.Success, null));
        Assert.Null(sendout.Outcome);
        Assert.Null(sendout.SequencingStartedAtUtc);
        Assert.Null(sendout.ResultsReceivedAtUtc);
    }

    [Theory]
    [InlineData("https://storage.example/file?token=secret")]
    [InlineData("s3://access:secret@bucket/file")]
    [InlineData("https://storage.example/file#secret")]
    public void StorageReferenceRejectsExpiringOrCredentialBearingLocations(string location)
    {
        Assert.Throws<ArgumentException>(() => new LabVendorResultReference(Guid.NewGuid(), Guid.NewGuid(), null,
            "SIMULATED results", location, null, Guid.NewGuid(), DateTime.UtcNow));
    }

    [Fact]
    public void ReferenceAndExceptionRetainLibraryIdentityWithoutScientificOutputOrMaterialMutation()
    {
        var sendoutId = Guid.NewGuid(); var memberId = Guid.NewGuid(); var actorId = Guid.NewGuid(); var time = DateTime.UtcNow;
        var reference = new LabVendorResultReference(Guid.NewGuid(), sendoutId, memberId, "Manifest", "s3://simulated/batch/manifest.csv", "Reference only", actorId, time);
        var exception = new LabVendorLibraryException(sendoutId, memberId, Guid.NewGuid(), LabVendorOutcome.Failure, "SIMULATED low read yield");
        Assert.Equal(memberId, reference.LabBatchMemberId); Assert.Equal(actorId, reference.RecordedByUserId);
        Assert.Equal(time, reference.RecordedAtUtc); Assert.Equal(sendoutId, exception.LabNgsSendoutId);
        Assert.Throws<ArgumentException>(() => new LabVendorLibraryException(sendoutId, memberId, Guid.NewGuid(), LabVendorOutcome.Failure, " "));
    }
}
