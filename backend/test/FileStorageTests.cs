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

            await using (var read = await storage.OpenReadAsync(
                FileStorageAreas.DataProvisioning,
                stored.StorageKey,
                CancellationToken.None))
            {
                using var buffer = new MemoryStream();
                await read.CopyToAsync(buffer);
                Assert.Equal(content, buffer.ToArray());
            }

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
    public async Task StartupChecksWritableStorageWithoutLeavingAProbeAndFilesSurviveAnotherProviderInstance()
    {
        var root = NewTemporaryRoot();
        try
        {
            var first = CreateLocalStorage(root);
            await new LocalFileStorageStartupCheck(first).StartAsync(CancellationToken.None);
            Assert.Empty(Directory.EnumerateFiles(root));
            var stored = await first.SaveAsync(new(FileStorageAreas.OrderManagement, new MemoryStream([42]), ".bin", 10), CancellationToken.None);
            var restarted = CreateLocalStorage(root);
            await restarted.VerifyWritableAsync(CancellationToken.None);
            await using var read = await restarted.OpenReadAsync(FileStorageAreas.OrderManagement, stored.StorageKey, CancellationToken.None);
            Assert.Equal(42, read.ReadByte());
        }
        finally { DeleteTemporaryRoot(root); }
    }

    [Fact]
    public async Task StartupRejectsAnUnusableRootWithoutOverwritingExistingContent()
    {
        var root = NewTemporaryRoot();
        var file = Path.Combine(root, "not-a-directory");
        try
        {
            File.WriteAllText(file, "preserve");
            await Assert.ThrowsAsync<IOException>(() => CreateLocalStorage(file).VerifyWritableAsync(CancellationToken.None));
            Assert.Equal("preserve", File.ReadAllText(file));
        }
        finally { DeleteTemporaryRoot(root); }
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
    public void DependencyInjectionRejectsUnconfirmedOrRelativeLocalStorageInProduction()
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
    public void ProductionCanSelectExplicitPersistentLocalStorage()
    {
        var root = NewTemporaryRoot();
        try
        {
            using var provider = BuildProvider(Environments.Production, new Dictionary<string, string?>
            {
                ["FileStorage:Provider"] = FileStorageProviders.Local,
                ["FileStorage:LocalRootPath"] = root,
                ["FileStorage:LocalPersistentVolumeConfirmed"] = "true"
            });
            Assert.IsType<LocalFileStorage>(provider.GetRequiredService<IFileStorage>());
        }
        finally { DeleteTemporaryRoot(root); }
    }

    [Theory]
    [InlineData("../escape.txt")]
    [InlineData("2026/../../escape.txt")]
    [InlineData("/absolute.txt")]
    [InlineData("2026\\escape.txt")]
    [InlineData("2026/file.txt:stream")]
    [InlineData("2026/file.txt.")]
    [InlineData("2026//file.txt")]
    public async Task LocalStorageRejectsUnsafeKeysBeforeReadOrDelete(string key)
    {
        var root = NewTemporaryRoot();
        try
        {
            var storage = CreateLocalStorage(root);
            await Assert.ThrowsAsync<ArgumentException>(() => storage.OpenReadAsync(FileStorageAreas.OrderManagement, key, CancellationToken.None));
            await Assert.ThrowsAsync<ArgumentException>(() => storage.DeleteIfExistsAsync(FileStorageAreas.OrderManagement, key, CancellationToken.None));
        }
        finally { DeleteTemporaryRoot(root); }
    }

    [Fact]
    public void LocalStorageRejectsApplicationAndPublicRoots()
    {
        var root = NewTemporaryRoot();
        try
        {
            var environment = new TestWebHostEnvironment(Environments.Development, root);
            foreach (var path in new[] { root, Path.Combine(root, "App_Data"), Path.Combine(root, "wwwroot") })
                Assert.Throws<InvalidOperationException>(() => new LocalFileStorage(environment,
                    Options.Create(new FileStorageOptions { LocalRootPath = path })));
        }
        finally { DeleteTemporaryRoot(root); }
    }

    [Fact]
    public void DefaultRootRefusesToHideLegacyManagedBytes()
    {
        var root = NewTemporaryRoot();
        try
        {
            var legacy = Path.Combine(root, "App_Data", FileStorageAreas.OrderManagement);
            Directory.CreateDirectory(legacy);
            File.WriteAllText(Path.Combine(legacy, "retained.txt"), "retained");
            Assert.Throws<InvalidOperationException>(() => new LocalFileStorage(
                new TestWebHostEnvironment(Environments.Development, root), Options.Create(new FileStorageOptions())));
            Assert.Equal("retained", File.ReadAllText(Path.Combine(legacy, "retained.txt")));
        }
        finally { DeleteTemporaryRoot(root); }
    }

    [Fact]
    public async Task CancelledLocalWriteLeavesNoPartialFile()
    {
        var root = NewTemporaryRoot();
        try
        {
            using var cancellation = new CancellationTokenSource(); cancellation.Cancel();
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => CreateLocalStorage(root).SaveAsync(
                new(FileStorageAreas.OrderManagement, new MemoryStream([1, 2, 3]), ".bin", 10), cancellation.Token));
            Assert.Empty(Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories));
        }
        finally { DeleteTemporaryRoot(root); }
    }

    [UnixSymlinkFact]
    public async Task LinkedAreaCannotReadWriteOrDeleteAnotherDirectory()
    {
        var root = NewTemporaryRoot();
        var outside = NewTemporaryRoot();
        var link = Path.Combine(root, FileStorageAreas.OrderManagement);
        try
        {
            File.WriteAllText(Path.Combine(outside, "retained.txt"), "retained");
            Directory.CreateSymbolicLink(link, outside);
            var storage = CreateLocalStorage(root);
            await Assert.ThrowsAsync<IOException>(() => storage.OpenReadAsync(FileStorageAreas.OrderManagement, "retained.txt", CancellationToken.None));
            await Assert.ThrowsAsync<IOException>(() => storage.DeleteIfExistsAsync(FileStorageAreas.OrderManagement, "retained.txt", CancellationToken.None));
            await Assert.ThrowsAsync<IOException>(() => storage.SaveAsync(new(FileStorageAreas.OrderManagement, new MemoryStream([1]), ".txt", 10), CancellationToken.None));
            Assert.Equal("retained", File.ReadAllText(Path.Combine(outside, "retained.txt")));
            Assert.Single(Directory.EnumerateFiles(outside));
        }
        finally
        {
            if (Directory.Exists(link)) Directory.Delete(link);
            DeleteTemporaryRoot(root); DeleteTemporaryRoot(outside);
        }
    }

    [Fact]
    public async Task DependencyInjectionSelectsDisabledStorageForProductionWithoutCredentials()
    {
        using var provider = BuildProvider(
            Environments.Production,
            new Dictionary<string, string?>
            {
                ["FileStorage:Provider"] = FileStorageProviders.Disabled
            });

        var storage = Assert.IsType<DisabledFileStorage>(provider.GetRequiredService<IFileStorage>());
        await Assert.ThrowsAsync<FileStorageUnavailableException>(() =>
            storage.SaveAsync(
                new FileStorageWriteRequest(
                    FileStorageAreas.DataProvisioning,
                    new MemoryStream([1]),
                    ".csv",
                    10),
                CancellationToken.None));
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
        new TestWebHostEnvironment(Environments.Development, Environment.CurrentDirectory),
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

public sealed class UnixSymlinkFactAttribute : FactAttribute
{
    public UnixSymlinkFactAttribute()
    {
        if (OperatingSystem.IsWindows()) Skip = "Symlink fixture requires Unix; Windows symlinks require a separately enabled host privilege.";
    }
}
