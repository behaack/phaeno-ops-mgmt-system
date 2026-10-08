namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed class LabScientificFilesTests
{
    [Fact]
    public async Task VerifiedDownloadUsesActualBytesAndClosesItsTemporaryFile()
    {
        byte[] bytes = [1, 2, 3, 4];
        var hash = Convert.ToHexString(SHA256.HashData(bytes));
        string path;
        await using (var verified = await LabScientificFiles.OpenVerifiedAsync(new BytesStorage(bytes), "key", hash, bytes.Length, default))
        {
            path = verified.Name;
            using var copy = new MemoryStream();
            await verified.CopyToAsync(copy);
            Assert.Equal(bytes, copy.ToArray());
        }
        Assert.False(File.Exists(path));
    }

    [Theory]
    [InlineData(3, 4, false)]
    [InlineData(5, 4, false)]
    [InlineData(4, 4, true)]
    public async Task MissingExtraOrChangedBytesNeverProduceADownload(int actual, int expected, bool tamper)
    {
        var bytes = new byte[actual];
        var hash = Convert.ToHexString(SHA256.HashData(new byte[expected]));
        if (tamper) bytes[0] = 1;
        var exception = await Assert.ThrowsAsync<OrderManagementException>(() =>
            LabScientificFiles.OpenVerifiedAsync(new BytesStorage(bytes), "key", hash, expected, default));
        Assert.Contains("fingerprint or size", exception.Message);
    }

    [Fact]
    public async Task FiftyMegabyteFileVerifiesWithoutTruncation()
    {
        var bytes = new byte[50 * 1024 * 1024];
        RandomNumberGenerator.Fill(bytes);
        var hash = Convert.ToHexString(SHA256.HashData(bytes));
        await using var verified = await LabScientificFiles.OpenVerifiedAsync(new BytesStorage(bytes), "fifty-megabyte", hash, bytes.Length, default);
        Assert.Equal(bytes.LongLength, verified.Length);
        Assert.Equal(hash, Convert.ToHexString(await SHA256.HashDataAsync(verified)));
    }

    private sealed class BytesStorage(byte[] bytes) : IOperationalFileStorage
    {
        public Task<Stream> OpenReadAsync(string key, CancellationToken ct) => Task.FromResult<Stream>(new MemoryStream(bytes));
        public Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken ct) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string key, CancellationToken ct) => throw new NotSupportedException();
    }
}
