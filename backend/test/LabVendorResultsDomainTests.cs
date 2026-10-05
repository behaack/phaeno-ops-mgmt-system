namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabVendorResultsDomainTests
{
    private static LabNgsSendout New() => new(Guid.NewGuid(), "SIMULATED vendor", null, "{}", null);

    [Fact]
    public void ResultsReceiptDoesNotInferSuccessAndFinalOutcomeCannotBeOverwritten()
    {
        var sendout = New(); var time = DateTime.UtcNow.AddMinutes(-1);
        Assert.Throws<InvalidOperationException>(() => sendout.SetStatus(LabNgsSendoutStatus.ResultsReceived, time));
        foreach (var stage in new[] { LabNgsSendoutStatus.Shipped, LabNgsSendoutStatus.ReceivedByProvider,
            LabNgsSendoutStatus.Sequencing, LabNgsSendoutStatus.ResultsReceived }) sendout.SetStatus(stage, time);
        Assert.Null(sendout.Outcome);
        Assert.Equal(time, sendout.ResultsReceivedAtUtc);
        Assert.Throws<ArgumentException>(() => sendout.FinalizeOutcome(LabVendorOutcome.Success, time.AddMinutes(-1), "SIMULATED report"));
        sendout.FinalizeOutcome(LabVendorOutcome.Failure, time, "SIMULATED unsuccessful vendor run");
        Assert.Equal(LabVendorOutcome.Failure, sendout.Outcome);
        Assert.Equal(LabNgsSendoutStatus.Complete, sendout.Status);
        Assert.Throws<InvalidOperationException>(() => sendout.FinalizeOutcome(LabVendorOutcome.Success, time, "Changed"));
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
        var exception = new LabVendorLibraryException(sendoutId, memberId, LabVendorOutcome.Failure, "SIMULATED low read yield");
        Assert.Equal(memberId, reference.LabBatchMemberId); Assert.Equal(actorId, reference.RecordedByUserId);
        Assert.Equal(time, reference.RecordedAtUtc); Assert.Equal(sendoutId, exception.LabNgsSendoutId);
        Assert.Throws<ArgumentException>(() => new LabVendorLibraryException(sendoutId, memberId, LabVendorOutcome.Failure, " "));
    }
}
