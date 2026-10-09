using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Infrastructure.Storage;

namespace PSeq.Operations.Test;

public sealed class ScientificS3StorageTests
{
    [Fact]
    public void OriginalSequencingFilesRequireTheirRecordedSampleLibraryAndPurchasedRun()
    {
        var sample = Guid.NewGuid(); var library = Guid.NewGuid();
        var raw = ScientificStorageHierarchy.RawSet(Guid.NewGuid(), Guid.NewGuid(), sample, library, Guid.NewGuid(), 2);
        var original = new S3OriginalObject("scientific-fixture", "us-east-2", raw + "/R1.fastq", "version-A", "\"etag-A\"");
        ScientificStorageHierarchy.RequireOriginalSequencingBranch(original.ToStorageKey(), sample, library, 2);
        Assert.Throws<PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException>(() =>
            ScientificStorageHierarchy.RequireOriginalSequencingBranch(original.ToStorageKey(), sample, Guid.NewGuid(), 2));
        Assert.Throws<PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException>(() =>
            ScientificStorageHierarchy.RequireOriginalSequencingBranch(original.ToStorageKey(), sample, library, 1));
        Assert.Throws<PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException>(() =>
            ScientificStorageHierarchy.RequireOriginalSequencingBranch(original.ToStorageKey(), Guid.NewGuid(), library, 2));
        Assert.Throws<PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException>(() =>
            ScientificStorageHierarchy.RequireOriginalSequencingBranch((original with { Key = raw.Replace("/raw", "/assemblies") + "/report.pdf" }).ToStorageKey(), sample, library, 2));
        var nested = raw.Replace("library-" + library.ToString("N"), "library-" + Guid.NewGuid().ToString("N"))
            + "/sample-" + sample.ToString("N") + "/library-" + library.ToString("N")
            + "/sequencing-" + Guid.NewGuid().ToString("N") + "-run-002/raw/R1.fastq";
        Assert.Throws<PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException>(() =>
            ScientificStorageHierarchy.RequireOriginalSequencingBranch((original with { Key = nested }).ToStorageKey(), sample, library, 2));
    }

    [Fact]
    public void RepeatedScientificWorkHasDistinctOwningDirectories()
    {
        var customer = Guid.NewGuid(); var job = Guid.NewGuid(); var sample = Guid.NewGuid();
        var library = Guid.NewGuid(); var sendout = Guid.NewGuid();
        var first = ScientificStorageHierarchy.Sequencing(customer, job, sample, library, sendout, 1);
        var preparedAgain = ScientificStorageHierarchy.Sequencing(customer, job, sample, Guid.NewGuid(), sendout, 1);
        var sequencedAgain = ScientificStorageHierarchy.Sequencing(customer, job, sample, library, Guid.NewGuid(), 1);
        Assert.Equal(3, new[] { first, preparedAgain, sequencedAgain }.Distinct().Count());
        Assert.All(new[] { first, preparedAgain, sequencedAgain }, path => Assert.StartsWith(ScientificStorageHierarchy.Sample(customer, job, sample) + "/", path));
        var assemblyA = ScientificStorageHierarchy.Assembly(customer, job, sample, library, sendout, 1, Guid.NewGuid());
        var assemblyB = ScientificStorageHierarchy.Assembly(customer, job, sample, library, sendout, 1, Guid.NewGuid());
        Assert.NotEqual(assemblyA, assemblyB);
        Assert.StartsWith(first + "/assemblies/", assemblyA);
        Assert.StartsWith(first + "/assemblies/", assemblyB);
        Assert.Throws<ArgumentException>(() => ScientificStorageHierarchy.Sample(Guid.Empty, job, sample));
        Assert.Throws<ArgumentOutOfRangeException>(() => ScientificStorageHierarchy.Sequencing(customer, job, sample, library, sendout, 0));
    }

    [Fact]
    public async Task ScopedWritesReturnExactKeysUsedForReadAndCleanup()
    {
        using var client = new RecordingS3();
        var storage = Create(client);
        var directory = ScientificStorageHierarchy.RawSet(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1);
        var content = "original fixture"u8.ToArray();
        var receipt = await storage.SaveAsync(new(FileStorageAreas.OrderManagement, new MemoryStream(content), ".fastq", 100)
            { RelativeDirectory = directory }, CancellationToken.None);
        Assert.StartsWith(directory + "/", client.PutKey);
        Assert.Equal(S3ManagedObject.ObjectKey(FileStorageAreas.OrderManagement, receipt.StorageKey), client.PutKey);
        Assert.Throws<ArgumentException>(() => S3ManagedObject.ObjectKey(FileStorageAreas.DataProvisioning, receipt.StorageKey));
        Assert.Equal("*", client.PutCondition);
        await using (var downloaded = await storage.OpenReadAsync(FileStorageAreas.OrderManagement, receipt.StorageKey, CancellationToken.None))
        {
            using var bytes = new MemoryStream(); await downloaded.CopyToAsync(bytes);
            Assert.Equal(content, bytes.ToArray());
        }
        Assert.Equal(client.PutKey, client.Read!.Key);
        await storage.DeleteIfExistsAsync(FileStorageAreas.OrderManagement, receipt.StorageKey, CancellationToken.None);
        Assert.Equal(client.PutKey, client.DeletedKey);
    }

    [Fact]
    public async Task MissingMultipartIdentityCannotProduceAVerifiedReceipt()
    {
        using var client = new RecordingS3 { UploadIdentity = null };
        var storage = Create(client);
        await Assert.ThrowsAsync<FileStorageUnavailableException>(() => storage.SaveAsync(
            new(FileStorageAreas.OrderManagement, new MemoryStream(new byte[8 * 1024 * 1024]), ".fastq", 9 * 1024 * 1024), CancellationToken.None));
        Assert.Empty(client.PartSizes);
        Assert.Null(client.CompleteCondition);
    }

    [Fact]
    public async Task OriginalAccessPinsVersionAndConditionAndCannotDeleteOrCopySource()
    {
        using var client = new RecordingS3();
        var storage = Create(client);
        var original = new S3OriginalObject("scientific-fixture", "us-east-2", "customer-A/job-A/sample-A/library-A/sequencing-A/raw/R1.fastq", "version-A", "\"etag-A\"");
        var locator = original.ToStorageKey();
        Assert.Equal(original, S3OriginalObject.Parse(locator));
        await using (var content = await storage.OpenReadAsync(FileStorageAreas.OrderManagement, locator, CancellationToken.None)) { }
        Assert.Equal(original.Bucket, client.Read!.BucketName);
        Assert.Equal(original.Key, client.Read.Key);
        Assert.Equal(original.VersionId, client.Read.VersionId);
        Assert.Equal(original.ETag, client.Read.EtagToMatch);
        Assert.Null(client.PutKey);
        await Assert.ThrowsAsync<InvalidOperationException>(() => storage.DeleteIfExistsAsync(FileStorageAreas.OrderManagement, locator, CancellationToken.None));
        Assert.Null(client.DeletedKey);
        var differentBucket = original with { Bucket = "another-customer-bucket" };
        await Assert.ThrowsAsync<FileStorageUnavailableException>(() => storage.OpenReadAsync(FileStorageAreas.OrderManagement, differentBucket.ToStorageKey(), CancellationToken.None));
        Assert.Throws<ArgumentException>(() => S3OriginalObject.Parse("s3-original/invalid"));
    }

    private static S3FileStorage Create(IAmazonS3 client) => new(client, Options.Create(new FileStorageOptions
        { Provider = "S3", S3 = new() { BucketName = "scientific-fixture", Region = "us-east-2" } }));

    [Fact]
    public async Task LargeNonSeekableInputsStreamInBoundedPartsAndLimitsAbortPublication()
    {
        using var client = new RecordingS3(); var storage = Create(client);
        var bytes = new byte[9 * 1024 * 1024]; Random.Shared.NextBytes(bytes);
        using var source = new NonSeekingSource(bytes);
        var receipt = await storage.SaveAsync(new(FileStorageAreas.OrderManagement, source, ".bin", bytes.Length), default);
        Assert.Null(client.PutKey);
        Assert.Equal([8 * 1024 * 1024, 1024 * 1024], client.PartSizes);
        Assert.Equal("*", client.CompleteCondition);
        Assert.Equal(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(bytes)), receipt.Sha256, ignoreCase: true);
        using var excessive = new NonSeekingSource(bytes);
        await Assert.ThrowsAsync<FileStorageLimitExceededException>(() => storage.SaveAsync(new(FileStorageAreas.OrderManagement, excessive, ".bin", 8 * 1024 * 1024), default));
        Assert.Equal(1, client.Aborts);
    }

    private sealed class NonSeekingSource(byte[] bytes) : MemoryStream(bytes)
    {
        public override bool CanSeek => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    }

    private sealed class RecordingS3() : AmazonS3Client(new AnonymousAWSCredentials(), RegionEndpoint.USEast2)
    {
        public string? UploadIdentity = "fixture-stream";
        public string? PutKey, PutCondition, DeletedKey;
        public GetObjectRequest? Read;
        public readonly List<int> PartSizes = [];
        public string? CompleteCondition;
        public int Aborts;
        private readonly List<byte[]> parts = [];
        private byte[] content = "fixture"u8.ToArray();
        public override Task<InitiateMultipartUploadResponse> InitiateMultipartUploadAsync(InitiateMultipartUploadRequest request, CancellationToken ct = default)
        { parts.Clear(); return Task.FromResult(new InitiateMultipartUploadResponse { UploadId = UploadIdentity }); }
        public override async Task<UploadPartResponse> UploadPartAsync(UploadPartRequest request, CancellationToken ct = default)
        {
            using var bytes = new MemoryStream(); await request.InputStream.CopyToAsync(bytes, ct);
            var data = bytes.ToArray(); parts.Add(data); PartSizes.Add(data.Length);
            return new UploadPartResponse { ETag = $"part-{request.PartNumber}", ChecksumSHA256 = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(data)) };
        }
        public override Task<CompleteMultipartUploadResponse> CompleteMultipartUploadAsync(CompleteMultipartUploadRequest request, CancellationToken ct = default)
        { CompleteCondition = request.IfNoneMatch; content = parts.SelectMany(p => p).ToArray(); parts.Clear(); return Task.FromResult(new CompleteMultipartUploadResponse()); }
        public override Task<AbortMultipartUploadResponse> AbortMultipartUploadAsync(AbortMultipartUploadRequest request, CancellationToken ct = default)
        { Aborts++; parts.Clear(); return Task.FromResult(new AbortMultipartUploadResponse()); }
        public override async Task<PutObjectResponse> PutObjectAsync(PutObjectRequest request, CancellationToken ct = default)
        {
            PutKey = request.Key; PutCondition = request.IfNoneMatch;
            using var bytes = new MemoryStream(); await request.InputStream.CopyToAsync(bytes, ct); content = bytes.ToArray();
            return new();
        }
        public override Task<GetObjectResponse> GetObjectAsync(GetObjectRequest request, CancellationToken ct = default)
        { Read = request; return Task.FromResult(new GetObjectResponse { ResponseStream = new MemoryStream(content) }); }
        public override Task<DeleteObjectResponse> DeleteObjectAsync(DeleteObjectRequest request, CancellationToken ct = default)
        { DeletedKey = request.Key; return Task.FromResult(new DeleteObjectResponse()); }
    }
}
