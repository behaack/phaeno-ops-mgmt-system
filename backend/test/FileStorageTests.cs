using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Commercial.DataProvisioning.Application;

namespace PSeq.Operations.Test;

public sealed class FileStorageTests
{
    [Fact]
    public async Task LocalStorageRoundTripsAndDeletesWithinItsArea()
    {
        var root = NewTemporaryRoot();
        try
        {
            var storage = CreateLocalStorage(root);
            var content = "Phaeno storage fixture"u8.ToArray();

            var stored = await storage.SaveAsync(
                new FileStorageWriteRequest(
                    FileStorageAreas.DataProvisioning,
                    new MemoryStream(content),
                    ".TXT",
                    1_024),
                CancellationToken.None);

            Assert.EndsWith(".txt", stored.StorageKey, StringComparison.Ordinal);
            Assert.Equal(content.Length, stored.SizeBytes);
            Assert.Equal(
                Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(content)).ToLowerInvariant(),
                stored.Sha256);
            Assert.True(File.Exists(Path.Combine(
                root,
                FileStorageAreas.DataProvisioning,
                stored.StorageKey.Replace('/', Path.DirectorySeparatorChar))));

            await using var read = await storage.OpenReadAsync(
                FileStorageAreas.DataProvisioning,
                stored.StorageKey,
                CancellationToken.None);
            using var buffer = new MemoryStream();
            await read.CopyToAsync(buffer);
            Assert.Equal(content, buffer.ToArray());

            await storage.DeleteIfExistsAsync(
                FileStorageAreas.DataProvisioning,
                stored.StorageKey,
                CancellationToken.None);
            await Assert.ThrowsAsync<FileStorageObjectNotFoundException>(() =>
                storage.OpenReadAsync(
                    FileStorageAreas.DataProvisioning,
                    stored.StorageKey,
                    CancellationToken.None));
        }
        finally
        {
            DeleteTemporaryRoot(root);
        }
    }

    [Fact]
    public async Task LocalStorageRejectsOversizedContentWithoutLeavingAnObject()
    {
        var root = NewTemporaryRoot();
        try
        {
            var storage = CreateLocalStorage(root);
            await Assert.ThrowsAsync<FileStorageLimitExceededException>(() =>
                storage.SaveAsync(
                    new FileStorageWriteRequest(
                        FileStorageAreas.OrderManagement,
                        new MemoryStream(new byte[] { 1, 2, 3, 4 }),
                        ".bin",
                        3),
                    CancellationToken.None));

            Assert.Empty(Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories));
        }
        finally
        {
            DeleteTemporaryRoot(root);
        }
    }

    [Fact]
    public async Task FeatureAdaptersKeepExistingStorageAreasAndContracts()
    {
        var storage = new RecordingFileStorage();
        var managed = new ManagedFileStorageAdapter(storage);
        var operational = new OperationalFileStorageAdapter(storage);

        await managed.SaveAsync(new MemoryStream([1]), ".csv", 10, CancellationToken.None);
        await operational.SaveAsync(new MemoryStream([2]), ".zip", 10, CancellationToken.None);
        await managed.OpenReadAsync("2026/08/managed.csv", CancellationToken.None);
        await operational.OpenReadAsync("2026/08/output.zip", CancellationToken.None);

        Assert.Equal(
            [
                FileStorageAreas.DataProvisioning,
                FileStorageAreas.OrderManagement,
                FileStorageAreas.DataProvisioning,
                FileStorageAreas.OrderManagement
            ],
            storage.Areas);
    }

    [Fact]
    public void DependencyInjectionSelectsLocalStorageForDevelopment()
    {
        var root = NewTemporaryRoot();
        try
        {
            using var provider = BuildProvider(
                Environments.Development,
                new Dictionary<string, string?>
                {
                    ["FileStorage:Provider"] = FileStorageProviders.Local,
                    ["FileStorage:LocalRootPath"] = root
                });

            Assert.IsType<LocalFileStorage>(provider.GetRequiredService<IFileStorage>());
            Assert.IsType<ManagedFileStorageAdapter>(provider.GetRequiredService<IManagedFileStorage>());
            Assert.IsType<OperationalFileStorageAdapter>(provider.GetRequiredService<IOperationalFileStorage>());
        }
        finally
        {
            DeleteTemporaryRoot(root);
        }
    }

    [Fact]
    public void DependencyInjectionRejectsLocalStorageInProduction()
    {
        using var provider = BuildProvider(
            Environments.Production,
            new Dictionary<string, string?>
            {
                ["FileStorage:Provider"] = FileStorageProviders.Local,
                ["FileStorage:LocalRootPath"] = "App_Data"
            });

        Assert.Throws<OptionsValidationException>(() =>
            provider.GetRequiredService<IFileStorage>());
    }

    [Fact]
    public void DependencyInjectionSelectsS3StorageForProduction()
    {
        using var provider = BuildProvider(
            Environments.Production,
            new Dictionary<string, string?>
            {
                ["FileStorage:Provider"] = FileStorageProviders.S3,
                ["FileStorage:S3:BucketName"] = "phaeno-production-files",
                ["FileStorage:S3:Region"] = "us-west-2",
                ["FileStorage:S3:KeyPrefix"] = "phaeno-portal"
            });

        Assert.IsType<S3FileStorage>(provider.GetRequiredService<IFileStorage>());
    }

    private static LocalFileStorage CreateLocalStorage(string root) => new(
        new TestWebHostEnvironment(Environments.Development, root),
        Options.Create(new FileStorageOptions
        {
            Provider = FileStorageProviders.Local,
            LocalRootPath = root
        }));

    private static ServiceProvider BuildProvider(
        string environmentName,
        Dictionary<string, string?> values)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
        var environment = new TestWebHostEnvironment(environmentName, Environment.CurrentDirectory);
        var services = new ServiceCollection();
        services.AddSingleton<IWebHostEnvironment>(environment);
        services.AddSingleton<IHostEnvironment>(environment);
        services.AddFileStorage(configuration, environment);
        return services.BuildServiceProvider();
    }

    private static string NewTemporaryRoot()
    {
        var root = Path.Combine(
            Path.GetTempPath(),
            "phaeno-file-storage-tests",
            Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return root;
    }

    private static void DeleteTemporaryRoot(string root)
    {
        if (Directory.Exists(root))
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private sealed class RecordingFileStorage : IFileStorage
    {
        public List<string> Areas { get; } = [];

        public Task<FileStorageWriteResult> SaveAsync(
            FileStorageWriteRequest request,
            CancellationToken cancellationToken)
        {
            Areas.Add(request.Area);
            return Task.FromResult(new FileStorageWriteResult("stored.file", 1, "sha256"));
        }

        public Task<Stream> OpenReadAsync(
            string area,
            string storageKey,
            CancellationToken cancellationToken)
        {
            Areas.Add(area);
            return Task.FromResult<Stream>(new MemoryStream());
        }

        public Task DeleteIfExistsAsync(
            string area,
            string storageKey,
            CancellationToken cancellationToken)
        {
            Areas.Add(area);
            return Task.CompletedTask;
        }
    }

    private sealed class TestWebHostEnvironment(
        string environmentName,
        string contentRootPath) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "PSeq.Operations.Test";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = contentRootPath;
        public string EnvironmentName { get; set; } = environmentName;
        public string ContentRootPath { get; set; } = contentRootPath;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
