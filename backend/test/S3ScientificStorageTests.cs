namespace PhaenoPortal.Test;
using System.Security.Cryptography;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Infrastructure.Storage;

public sealed class S3ScientificStorageTests
{
    [Fact]
    public async Task S3StoresImmutableFiftyMiBObjectsAndReturnsExactBytes()
    {
        using var client = new MemoryS3();
        var storage = new S3FileStorage(client, Options.Create(new FileStorageOptions { Provider = "S3", S3 = new() { BucketName = "test-only", Region = "us-west-2", KeyPrefix = "poms" } }));
        var bytes = new byte[50 * 1024 * 1024]; Random.Shared.NextBytes(bytes);
        var receipt = await storage.SaveAsync(new(FileStorageAreas.OrderManagement, new MemoryStream(bytes), ".bin", 100 * 1024 * 1024), default);
        Assert.Equal(bytes.LongLength, receipt.SizeBytes);
        await using var read = await storage.OpenReadAsync(FileStorageAreas.OrderManagement, receipt.StorageKey, default);
        Assert.Equal(Convert.ToHexString(SHA256.HashData(bytes)), Convert.ToHexString(await SHA256.HashDataAsync(read)));
        Assert.Single(client.Objects);
        await storage.DeleteIfExistsAsync(FileStorageAreas.OrderManagement, receipt.StorageKey, default);
        Assert.Empty(client.Objects);
    }
    private sealed class MemoryS3() : AmazonS3Client(new AnonymousAWSCredentials(), new AmazonS3Config { RegionEndpoint = Amazon.RegionEndpoint.USWest2 })
    {
        public Dictionary<string, byte[]> Objects { get; } = [];
        public override async Task<PutObjectResponse> PutObjectAsync(PutObjectRequest request, CancellationToken cancellationToken = default)
        {
            Assert.Equal("*", request.IfNoneMatch); Assert.False(Objects.ContainsKey(request.Key));
            using var copy = new MemoryStream(); await request.InputStream.CopyToAsync(copy, cancellationToken);
            Objects.Add(request.Key, copy.ToArray());
            Assert.Equal(Convert.ToHexString(SHA256.HashData(copy.ToArray())), request.Metadata["sha256"], ignoreCase: true);
            return new PutObjectResponse { HttpStatusCode = System.Net.HttpStatusCode.OK };
        }
        public override Task<GetObjectResponse> GetObjectAsync(GetObjectRequest request, CancellationToken cancellationToken = default)
            => Task.FromResult(new GetObjectResponse { ResponseStream = new MemoryStream(Objects[request.Key]), HttpStatusCode = System.Net.HttpStatusCode.OK });
        public override Task<DeleteObjectResponse> DeleteObjectAsync(DeleteObjectRequest request, CancellationToken cancellationToken = default)
        { Objects.Remove(request.Key); return Task.FromResult(new DeleteObjectResponse { HttpStatusCode = System.Net.HttpStatusCode.NoContent }); }
    }
}
