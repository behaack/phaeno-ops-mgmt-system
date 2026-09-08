using System.Security.Cryptography;
using PhaenoPortal.App.Infrastructure.Storage;

namespace PSeq.Operations.Test;

public sealed class FileServicesVerificationTests
{
    [Fact]
    public async Task ChecksBothAreasAndRemovesOnlyItsOwnFiles()
    {
        var storage = new VerificationStorage();
        await FileServicesVerification.VerifyAsync(storage, new VerificationScanner(FileMalwareScanStatus.Clean), CancellationToken.None);
        Assert.Equal(new[] { FileStorageAreas.DataProvisioning, FileStorageAreas.OrderManagement }, storage.Areas);
        Assert.Empty(storage.Files);
        Assert.Equal(2, storage.Deletions);
    }

    [Theory]
    [InlineData(FileMalwareScanStatus.Rejected)]
    [InlineData(FileMalwareScanStatus.Unavailable)]
    public async Task NonCleanVerdictsFailAndCleanUp(FileMalwareScanStatus status)
    {
        var storage = new VerificationStorage();
        await Assert.ThrowsAsync<InvalidDataException>(() => FileServicesVerification.VerifyAsync(storage, new VerificationScanner(status), CancellationToken.None));
        Assert.Empty(storage.Files);
        Assert.Equal(1, storage.Deletions);
    }

    [Fact]
    public async Task CorruptReadbackFailsAndStillCleansUp()
    {
        var storage = new VerificationStorage { CorruptReadback = true };
        await Assert.ThrowsAsync<InvalidDataException>(() => FileServicesVerification.VerifyAsync(storage, new VerificationScanner(FileMalwareScanStatus.Clean), CancellationToken.None));
        Assert.Empty(storage.Files);
    }

    [Fact]
    public async Task IncompleteDeletionCannotReportSuccess()
    {
        var storage = new VerificationStorage { KeepDeletedFile = true };
        await Assert.ThrowsAsync<InvalidDataException>(() => FileServicesVerification.VerifyAsync(storage, new VerificationScanner(FileMalwareScanStatus.Clean), CancellationToken.None));
        Assert.Single(storage.Files);
    }

    private sealed class VerificationScanner(FileMalwareScanStatus status) : IFileMalwareScanner
    {
        public Task<FileMalwareScanResult> ScanAsync(string area, string storageKey, CancellationToken cancellationToken)
            => Task.FromResult(new FileMalwareScanResult(status, "Synthetic verdict"));
    }

    private sealed class VerificationStorage : IFileStorage
    {
        public Dictionary<string, byte[]> Files { get; } = [];
        public List<string> Areas { get; } = [];
        public int Deletions { get; private set; }
        public bool CorruptReadback { get; init; }
        public bool KeepDeletedFile { get; init; }
        public async Task<FileStorageWriteResult> SaveAsync(FileStorageWriteRequest request, CancellationToken cancellationToken)
        {
            using var buffer = new MemoryStream();
            await request.Content.CopyToAsync(buffer, cancellationToken);
            var bytes = buffer.ToArray();
            var key = Guid.NewGuid().ToString("N");
            Files.Add(key, bytes); Areas.Add(request.Area);
            return new(key, bytes.Length, Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant());
        }
        public Task<Stream> OpenReadAsync(string area, string storageKey, CancellationToken cancellationToken)
        {
            if (!Files.TryGetValue(storageKey, out var bytes)) throw new FileStorageObjectNotFoundException(area, storageKey);
            var copy = bytes.ToArray();
            if (CorruptReadback) copy[0] ^= 1;
            return Task.FromResult<Stream>(new MemoryStream(copy, writable: false));
        }
        public Task DeleteIfExistsAsync(string area, string storageKey, CancellationToken cancellationToken)
        {
            if (!KeepDeletedFile) Files.Remove(storageKey);
            Deletions++; return Task.CompletedTask;
        }
    }
}
