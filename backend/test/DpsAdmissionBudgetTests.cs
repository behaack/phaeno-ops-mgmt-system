namespace PhaenoPortal.Test;

using System.Text.Json;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;

public sealed class DpsAdmissionBudgetTests
{
    [Theory]
    [InlineData(100, 100, 100, 1000, true)]
    [InlineData(101, 100, 1000, 1000, false)]
    [InlineData(101, 1000, 100, 1000, false)]
    [InlineData(100, 1000, 1000, 199, false)] // Parameters belong to the same admission budget.
    [InlineData(100, 1000, 1000, 200, true)]
    [InlineData(1, 0, 1000, 1000, false)]
    public void Entire_output_and_parameter_set_is_checked_against_effective_scanner_limits(
        long outputBytes, long scanLimit, long outputLimit, long setLimit, bool allowed)
    {
        var output = Manifest(outputBytes);
        var options = new DpsOptions { MaximumOutputFileBytes = outputLimit, MaximumOutputSetBytes = setLimit };
        var scanner = new FileScanningOptions { MaximumStreamBytes = scanLimit };
        if (allowed) DpsOutputAdmission.RequireAdmissionBudget(output, Address(100), options, scanner);
        else Assert.Equal("dps_output_scan_limit", Assert.Throws<OrderManagementException>(() =>
            DpsOutputAdmission.RequireAdmissionBudget(output, Address(100), options, scanner)).ErrorCode);
    }

    [Fact]
    public void Oversized_later_output_rejects_the_whole_set_without_partial_admission()
    {
        var manifest = Manifest(1);
        manifest = manifest with { Outputs = [manifest.Outputs[0], manifest.Outputs[0] with { ArtifactId = Guid.NewGuid(), S3 = Address(101) }] };
        Assert.Throws<OrderManagementException>(() => DpsOutputAdmission.RequireAdmissionBudget(manifest, Address(1),
            new(), new() { MaximumStreamBytes = 100 }));
    }

    private static DpsObject Address(long bytes) => new("example-bucket", "us-east-2", "fixture/outputs/result", "pinned-version", new string('a', 64), bytes);
    private static DpsOutputManifest Manifest(long bytes)
    {
        var at = DateTime.UtcNow.AddMinutes(-1);
        return new(DpsContract.Version, "local", "output_manifest", Guid.NewGuid(), "test-provider",
            new(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, Guid.NewGuid(), 1, 1),
            new("pseq_scientific_assembly", "0.1.0", JsonSerializer.SerializeToElement(new { }), ["assembly_output"]), new string('b', 64), at, at, at,
            new("fixture-engine", "test-only", [new("fixture-tool", "test-only")], [], [new("fixture-reference", "test-only", new string('c', 64))], null),
            [new(Guid.NewGuid(), "assembly_output", "FASTA", "assembly.fasta", Address(bytes))]);
    }
}
