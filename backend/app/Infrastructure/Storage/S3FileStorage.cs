namespace PhaenoPortal.App.Infrastructure.Storage;

using System.Net;
using System.Buffers;
using System.Security.Cryptography;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

public sealed class S3FileStorage(
    IAmazonS3 s3Client,
    IOptions<FileStorageOptions> options, BackupDeletionLease? deletionLease = null,
    ILogger<S3FileStorage>? logger = null) : IFileStorage
{
    private readonly S3FileStorageOptions s3Options = options.Value.S3;
    private const int PartBytes = 8 * 1024 * 1024;

    public async Task<FileStorageWriteResult> SaveAsync(
        FileStorageWriteRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request.Content);
        if (request.MaximumBytes <= 0) throw new ArgumentOutOfRangeException(nameof(request.MaximumBytes));
        var relativeDirectory = request.RelativeDirectory is null
            ? FileStorageKeys.ValidateArea(request.Area)
            : FileStorageKeys.ValidateStorageKey(request.RelativeDirectory);
        var prefix = FileStorageKeys.NormalizePrefix(s3Options.KeyPrefix);
        var fileName = request.RelativeDirectory is null ? FileStorageKeys.Create(request.FileExtension) : FileStorageKeys.CreateName(request.FileExtension);
        var relativeKey = $"{relativeDirectory}/{fileName}";
        var objectKey = string.IsNullOrEmpty(prefix) ? relativeKey : $"{prefix}/{relativeKey}";
        var storageKey = S3ManagedObject.ToStorageKey(request.Area, objectKey);
        var buffer = ArrayPool<byte>.Shared.Rent(PartBytes);
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        string? uploadId = null;
        var completed = false;
        long total = 0;
        var parts = new List<PartETag>();
        try
        {
            while (true)
            {
                var count = 0;
                while (count < PartBytes)
                {
                    var read = await request.Content.ReadAsync(buffer.AsMemory(count, PartBytes - count), cancellationToken);
                    if (read == 0) break;
                    if (total > request.MaximumBytes - read) throw new FileStorageLimitExceededException(request.MaximumBytes);
                    hash.AppendData(buffer, count, read); total += read; count += read;
                }
                if (uploadId is null && count < PartBytes)
                {
                    // Small objects remain bounded in memory; no full-file disk spool.
                    var digest = hash.GetHashAndReset();
                    var sha256 = Convert.ToHexString(digest).ToLowerInvariant();
                    using var content = new MemoryStream(buffer, 0, count, writable: false);
                    var put = new PutObjectRequest { BucketName = s3Options.BucketName, Key = objectKey,
                        IfNoneMatch = "*", InputStream = content, ContentType = "application/octet-stream",
                        ChecksumSHA256 = Convert.ToBase64String(digest) };
                    put.Metadata["sha256"] = sha256;
                    await s3Client.PutObjectAsync(put, cancellationToken);
                    return new(storageKey, total, sha256);
                }
                if (count == 0) break;
                if (uploadId is null)
                {
                    var initiated = await s3Client.InitiateMultipartUploadAsync(new() { BucketName = s3Options.BucketName,
                        Key = objectKey, ContentType = "application/octet-stream", ChecksumAlgorithm = ChecksumAlgorithm.SHA256 }, cancellationToken);
                    if (string.IsNullOrWhiteSpace(initiated.UploadId))
                        throw new FileStorageUnavailableException();
                    uploadId = initiated.UploadId;
                }
                if (parts.Count >= 10_000) throw new IOException("This upload exceeds the configured streaming part capacity.");
                using var part = new MemoryStream(buffer, 0, count, writable: false);
                var number = parts.Count + 1;
                var uploaded = await s3Client.UploadPartAsync(new() { BucketName = s3Options.BucketName, Key = objectKey,
                    UploadId = uploadId, PartNumber = number, PartSize = count, InputStream = part,
                    ChecksumAlgorithm = ChecksumAlgorithm.SHA256 }, cancellationToken);
                parts.Add(new PartETag(number, uploaded.ETag) { ChecksumSHA256 = uploaded.ChecksumSHA256 });
            }
            await s3Client.CompleteMultipartUploadAsync(new() { BucketName = s3Options.BucketName, Key = objectKey,
                UploadId = uploadId, PartETags = parts, IfNoneMatch = "*" }, cancellationToken);
            completed = true;
            // This is the independently measured full-file hash, not S3's composite multipart checksum.
            return new(storageKey, total, Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant());
        }
        finally
        {
            if (uploadId is not null && !completed)
            {
                using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                try { await s3Client.AbortMultipartUploadAsync(new() { BucketName = s3Options.BucketName, Key = objectKey, UploadId = uploadId }, cleanup.Token); }
                catch (Exception error) { logger?.LogWarning("S3 multipart cleanup needs Operations reconciliation ({ErrorType}).", error.GetType().Name); }
            }
            ArrayPool<byte>.Shared.Return(buffer, clearArray: true);
        }
    }

    public async Task<Stream> OpenReadAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken)
    {
        var request = new GetObjectRequest
        {
            BucketName = s3Options.BucketName,
            Key = S3OriginalObject.IsOriginal(storageKey) ? string.Empty : BuildObjectKey(area, storageKey)
        };
        if (S3OriginalObject.IsOriginal(storageKey))
        {
            var original = S3OriginalObject.Parse(storageKey);
            if (area != FileStorageAreas.OrderManagement || original.Bucket != s3Options.BucketName || original.Region != s3Options.Region)
                throw new FileStorageUnavailableException();
            request.Key = original.Key;
            request.VersionId = original.VersionId;
            request.EtagToMatch = original.ETag;
        }

        try
        {
            var response = await s3Client.GetObjectAsync(request, cancellationToken);
            return new S3ResponseStream(response);
        }
        catch (AmazonS3Exception exception) when (
            exception.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.PreconditionFailed
            || string.Equals(exception.ErrorCode, "NoSuchKey", StringComparison.Ordinal))
        {
            throw new FileStorageObjectNotFoundException(area, storageKey);
        }
    }

    public async Task DeleteIfExistsAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken)
    {
        if (S3OriginalObject.IsOriginal(storageKey))
            throw new InvalidOperationException("Original scientific S3 objects cannot be deleted by Portal cleanup.");
        await using var lease = deletionLease is null ? null : await deletionLease.AcquireAsync(cancellationToken);
        await s3Client.DeleteObjectAsync(
            new DeleteObjectRequest
            {
                BucketName = s3Options.BucketName,
                Key = BuildObjectKey(area, storageKey)
            },
            cancellationToken);
    }

    private string BuildObjectKey(string area, string storageKey)
    {
        return S3ManagedObject.ObjectKey(area, storageKey);
    }

    private sealed class S3ResponseStream(GetObjectResponse response) : Stream
    {
        private GetObjectResponse? ownedResponse = response;

        private Stream Inner => ownedResponse?.ResponseStream
            ?? throw new ObjectDisposedException(nameof(S3ResponseStream));

        public override bool CanRead => Inner.CanRead;
        public override bool CanSeek => Inner.CanSeek;
        public override bool CanWrite => false;
        public override long Length => Inner.Length;
        public override long Position
        {
            get => Inner.Position;
            set => Inner.Position = value;
        }

        public override void Flush() => Inner.Flush();

        public override int Read(byte[] buffer, int offset, int count) =>
            Inner.Read(buffer, offset, count);

        public override ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default) =>
            Inner.ReadAsync(buffer, cancellationToken);

        public override Task<int> ReadAsync(
            byte[] buffer,
            int offset,
            int count,
            CancellationToken cancellationToken) =>
            Inner.ReadAsync(buffer, offset, count, cancellationToken);

        public override long Seek(long offset, SeekOrigin origin) => Inner.Seek(offset, origin);

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) =>
            throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                Interlocked.Exchange(ref ownedResponse, null)?.Dispose();
            }

            base.Dispose(disposing);
        }

        public override ValueTask DisposeAsync()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
            return ValueTask.CompletedTask;
        }
    }
}
