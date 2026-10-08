namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;

public sealed class LabVendorResultSafetyTests
{
    [Fact]
    public void NotesAndUnrelatedLibraryOutcomesRetainExactInputIdentities()
    {
        var setId = Guid.NewGuid(); var outputId = Guid.NewGuid(); var now = DateTime.UtcNow.AddHours(-1);
        var set = new VendorResultsFastqSetSnapshot(setId, Guid.NewGuid(), "LIB-1", 1, "SingleEnd", 1,
            [new(Guid.NewGuid(), Guid.NewGuid(), outputId, "vendor.fastq", "canonical.fastq", 1, 1, 1, "lane 1", 20, new string('A', 64), 1)]);
        var previous = new VendorResultsSnapshot(Guid.NewGuid(), "BATCH-1", "Test", Guid.NewGuid(), "Vendor", "JOB-1", false,
            now, now, now, "Success", "old note", now, "{}", [], [], [set]);
        var edit = new RecordVendorResultsRequest(Guid.NewGuid(), 1, " JOB-1 ", false, now, now, now, "Success",
            [new(Guid.NewGuid(), "Failure", "Another library failed")], [setId], "Corrected note", FilesConfirmed: true);
        Assert.Equal(outputId, LabVendorResultSafety.RetainedSet(previous, edit, setId)!.Files.Single().OutputId);
        Assert.Null(LabVendorResultSafety.RetainedSet(previous, edit with { RunCompletedAtUtc = now.AddSeconds(1) }, setId));
        Assert.Null(LabVendorResultSafety.RetainedSet(previous, edit with { VendorJobReference = "OTHER-JOB" }, setId));
        Assert.Null(LabVendorResultSafety.RetainedSet(previous, edit, Guid.NewGuid()));
    }
}
