namespace PhaenoPortal.App.Infrastructure.Storage;

using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

public sealed class S3FileStorage(
    IAmazonS3 s3Client,
    IOptions<FileStorageOptions> options) : IFileStorage
{
    private readonly S3FileStorageOptions s3Options = options.Value.S3;

    public async Task<FileStorageWriteResult> SaveAsync(
        FileStorageWriteRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request.Content);
        var storageKey = FileStorageKeys.Create(request.FileExtension);
        var objectKey = BuildObjectKey(request.Area, storageKey);
        var temporaryPath = Path.Combine(
            Path.GetTempPath(),
            "phaeno-file-storage",
            $"{Guid.NewGuid():N}.upload");
        Directory.CreateDirectory(Path.GetDirectoryName(temporaryPath)!);

        try
        {
            long sizeBytes;
            string sha256;
            await using (var temporary = new FileStream(
                temporaryPath,
                FileMode.CreateNew,
                FileAccess.ReadWrite,
                FileShare.None,
                bufferSize: 81_920,
                FileOptions.Asynchronous | FileOptions.SequentialScan))
            {
                var stored = await FileStorageKeys.CopyAndHashAsync(
                    request.Content,
                    temporary,
                    request.MaximumBytes,
                    cancellationToken);
                sizeBytes = stored.SizeBytes;
                sha256 = stored.Sha256;
                temporary.Position = 0;

                var putRequest = new PutObjectRequest
                {
                    BucketName = s3Options.BucketName,
                    Key = objectKey,
                    InputStream = temporary,
                    ContentType = "application/octet-stream"
                };
                putRequest.Metadata["sha256"] = sha256;
                await s3Client.PutObjectAsync(putRequest, cancellationToken);
            }

            return new FileStorageWriteResult(storageKey, sizeBytes, sha256);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }
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
            Key = BuildObjectKey(area, storageKey)
        };

        try
        {
            var response = await s3Client.GetObjectAsync(request, cancellationToken);
            return new S3ResponseStream(response);
        }
        catch (AmazonS3Exception exception) when (
            exception.StatusCode == HttpStatusCode.NotFound
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
        var validatedArea = FileStorageKeys.ValidateArea(area);
        var validatedKey = FileStorageKeys.ValidateStorageKey(storageKey);
        var prefix = FileStorageKeys.NormalizePrefix(s3Options.KeyPrefix);
        return string.IsNullOrEmpty(prefix)
            ? $"{validatedArea}/{validatedKey}"
            : $"{prefix}/{validatedArea}/{validatedKey}";
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
