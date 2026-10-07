namespace PhaenoPortal.Test;

using System.IO.Compression;
using System.Text;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed class LabFastqArchiveInspectionTests
{
    private static MemoryStream Zip(params string[] names)
    {
        var bytes = new MemoryStream();
        using (var zip = new ZipArchive(bytes, ZipArchiveMode.Create, true)) foreach (var name in names) {
            using var file = zip.CreateEntry(name).Open(); file.Write(Encoding.ASCII.GetBytes("@test\nACGT\n+\nIIII\n"));
        }
        bytes.Position = 0; return bytes;
    }
    [Fact]
    public void BatchArchiveRetainsRelativeNamesAndSeparatesReportsFromFastq()
    {
        using var bytes = Zip("library-a/reads_R1.fastq", "library-a/reads_R2.fastq", "report.txt");
        using var zip = new ZipArchive(bytes, ZipArchiveMode.Read);
        var entries = LabFastqArchiveInspection.Inspect(zip, new());
        Assert.Equal(2, entries.Count(e => e.IsFastq)); Assert.False(entries[2].IsFastq);
        Assert.Equal("library-a/reads_R1.fastq", entries[0].FullName);
    }
    [Theory]
    [InlineData("../reads.fastq")]
    [InlineData("/reads.fastq")]
    [InlineData("C:/reads.fastq")]
    [InlineData("nested.zip")]
    public void UnsafeOrUnsupportedArchivePathsAreRejected(string name)
    {
        using var bytes = Zip(name); using var zip = new ZipArchive(bytes, ZipArchiveMode.Read);
        Assert.Throws<OrderManagementException>(() => LabFastqArchiveInspection.Inspect(zip, new()));
    }
    [Fact]
    public void CaseCollidingNamesAndExpandedSizeLimitAreRejected()
    {
        using var duplicateBytes = Zip("reads.fastq", "READS.fastq"); using var duplicate = new ZipArchive(duplicateBytes, ZipArchiveMode.Read);
        Assert.Throws<OrderManagementException>(() => LabFastqArchiveInspection.Inspect(duplicate, new()));
        using var largeBytes = Zip("reads.fastq"); using var large = new ZipArchive(largeBytes, ZipArchiveMode.Read);
        Assert.Throws<OrderManagementException>(() => LabFastqArchiveInspection.Inspect(large, new() { MaximumArchiveExpandedBytes = 1 }));
    }
}
