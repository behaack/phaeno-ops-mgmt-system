namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class LabVendorResultsVersionTests
{
    [Fact]
    public void LaterVersionRequiresNoteAndRetainsItsOwnSnapshot()
    {
        var sendout = Guid.NewGuid(); var actor = Guid.NewGuid(); var now = DateTime.UtcNow;
        var first = new LabVendorResultsVersion(Guid.NewGuid(), sendout, 1, "{\"outcome\":\"Failure\"}", "Original report", actor, "Operator", now);
        Assert.Throws<ArgumentException>(() => new LabVendorResultsVersion(Guid.NewGuid(), sendout, 2,
            "{\"outcome\":\"Success\"}", null, actor, "Operator", now));
        var second = new LabVendorResultsVersion(Guid.NewGuid(), sendout, 2, "{\"outcome\":\"Success\"}", "Corrected against final report", actor, "Operator", now);
        Assert.Contains("Failure", first.SnapshotJson);
        Assert.Contains("Success", second.SnapshotJson);
        Assert.Equal(1, first.ResultVersion); Assert.Equal(2, second.ResultVersion);
        Assert.Equal(actor, second.RecordedByUserId);
    }
}
