namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PhaenoPortal.App.Features.DataProvisioning.Services;

public class DataProvisioningProfileTests
{
    [Fact]
    public void ProductionRejectsSyntheticFixturesEvenWhenConfigurationIsIncorrectlyEnabled()
    {
        var environment = new TestWebHostEnvironment("Production");
        var profile = new DataProvisioningProfile(
            environment,
            Options.Create(new DataProvisioningOptions
            {
                EnableSyntheticFixtures = true,
                AllowedFileKinds = new Dictionary<string, string>
                {
                    [".json"] = "structured_fixture"
                }
            }));

        var exception = Assert.Throws<DataProvisioningException>(() =>
            profile.EnsureSyntheticFixturesAllowed(isSynthetic: true));

        Assert.Equal("synthetic_data_not_allowed", exception.ErrorCode);
    }

    [Fact]
    public async Task ProductionScannerNeverTrustsFilesWithoutAnIntegration()
    {
        var scanner = new EnvironmentManagedFileScanner(
            new TestWebHostEnvironment("Production"),
            Options.Create(new DataProvisioningOptions
            {
                UseTrustedDevelopmentScanner = true
            }));

        var result = await scanner.ScanAsync("managed/file.json", CancellationToken.None);

        Assert.Equal(ManagedFileScanStatus.Unavailable, result.Status);
    }

    [Fact]
    public void EnvironmentProfileRejectsUnconfiguredFileKinds()
    {
        var profile = new DataProvisioningProfile(
            new TestWebHostEnvironment("Development"),
            Options.Create(new DataProvisioningOptions
            {
                EnableSyntheticFixtures = true,
                AllowedFileKinds = []
            }));

        var exception = Assert.Throws<DataProvisioningException>(() =>
            profile.ResolveFileKind("speculative.fastq"));

        Assert.Equal("file_kind_not_allowed", exception.ErrorCode);
    }

    private sealed class TestWebHostEnvironment(string environmentName) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "PhaenoPortal.Test";

        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();

        public string WebRootPath { get; set; } = Path.GetTempPath();

        public string EnvironmentName { get; set; } = environmentName;

        public string ContentRootPath { get; set; } = Path.GetTempPath();

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
