namespace PhaenoPortal.App.Features.LabOperations.Services;

using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;

public sealed record ScientificS3Object(string Key, string FileName, long SizeBytes, string ETag);
public sealed record ScientificS3Page(bool Available, IReadOnlyList<ScientificS3Object> Files, string? NextCursor, string? SourceLocation);
public sealed record ScientificS3Snapshot(S3OriginalObject Address, string FileName, long SizeBytes);

/// <summary>Uses only the server-selected bucket and an authorized record-derived directory.</summary>
public sealed class ScientificS3Access(IOptions<FileStorageOptions> options, IServiceProvider services)
{
    private FileStorageOptions Options => options.Value;
    public bool Available => string.Equals(Options.Provider, FileStorageProviders.S3, StringComparison.OrdinalIgnoreCase);
    private IAmazonS3 Client => Available ? services.GetRequiredService<IAmazonS3>()
        : throw Error("S3 scientific access is not configured in this environment.", 503);

    public string ObjectPrefix(string directory)
    {
        var prefix = FileStorageKeys.NormalizePrefix(Options.S3.KeyPrefix);
        var relative = FileStorageKeys.ValidateStorageKey(directory);
        return (prefix.Length == 0 ? relative : $"{prefix}/{relative}") + "/";
    }

    private static bool Eligible(string key, string prefix) => key.StartsWith(prefix, StringComparison.Ordinal)
        && !key.EndsWith('/') && !key.Contains("/staging/", StringComparison.Ordinal)
        && (key.Contains("/raw/", StringComparison.Ordinal) || key.Contains("/evidence/", StringComparison.Ordinal)
            || key.Contains("/assemblies/", StringComparison.Ordinal) || key.Contains("/outputs/", StringComparison.Ordinal))
        && !key.Any(char.IsControl) && !key.Split('/').Any(p => p is "." or "..");

    public async Task<ScientificS3Page> ListAsync(string directory, string? cursor, CancellationToken ct)
    {
        if (!Available) return new(false, [], null, null);
        if (cursor?.Length > 8192) throw Error("The S3 page cursor is invalid.", 400);
        var prefix = ObjectPrefix(directory);
        try
        {
            var result = await Client.ListObjectsV2Async(new() { BucketName = Options.S3.BucketName,
                Prefix = prefix, MaxKeys = 200, ContinuationToken = cursor }, ct);
            var files = (result.S3Objects ?? []).Where(o => Eligible(o.Key, prefix) && o.Size > 0)
                .Select(o => new ScientificS3Object(o.Key, o.Key[(o.Key.LastIndexOf('/') + 1)..], o.Size!.Value, o.ETag)).ToArray();
            return new(true, files, result.NextContinuationToken, $"s3://{Options.S3.BucketName}/{prefix}");
        }
        catch (AmazonS3Exception) { throw Error("S3 listing is unavailable. Contact Operations or retry later.", 503); }
    }

    public async Task<ScientificS3Snapshot> CaptureAsync(string directory, string key, string etag, long limit, CancellationToken ct)
    {
        var prefix = ObjectPrefix(directory);
        if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(etag) || etag.Length > 256 || etag.Any(char.IsControl)
            || System.Text.Encoding.UTF8.GetByteCount(key) > 1024 || !Eligible(key, prefix))
            throw Error("Choose an original S3 file belonging to this scientific record.", 400);
        try
        {
            var metadata = await Client.GetObjectMetadataAsync(new() { BucketName = Options.S3.BucketName, Key = key, EtagToMatch = etag }, ct);
            var size = metadata.Headers.ContentLength;
            var name = key[(key.LastIndexOf('/') + 1)..];
            if (size <= 0 || size > limit || name.Length is < 1 or > 255)
                throw Error("The original file is empty, has an invalid name or exceeds current verification/scanning limits.", 400);
            var version = metadata.VersionId;
            if (string.IsNullOrWhiteSpace(version) || version == "null")
                throw new OrderManagementException("scientific_s3_versioning_required",
                    "Original scientific files require an exact S3 object version. Operations must prepare versioned source uploads before this file can be admitted.", 409);
            var address = new S3OriginalObject(Options.S3.BucketName, Options.S3.Region, key,
                version, metadata.ETag);
            try { _ = address.ToStorageKey(); }
            catch (ArgumentException) { throw Error("This object's locator is too long for a scientific receipt. Contact Operations.", 400); }
            return new(address, name, size);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode is System.Net.HttpStatusCode.NotFound or System.Net.HttpStatusCode.PreconditionFailed)
        { throw Error("The original file changed or is no longer available. Reload the S3 files before selecting it.", 409); }
        catch (AmazonS3Exception) { throw Error("S3 file verification is unavailable. Contact Operations or retry later.", 503); }
    }

    public static async Task<(FileStream Content, string Sha256)> ReadAsync(ScientificS3Snapshot snapshot, IOperationalFileStorage storage, CancellationToken ct)
    {
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N") + ".s3-verification");
        var free = new DriveInfo(Path.GetPathRoot(path)!).AvailableFreeSpace;
        if (snapshot.SizeBytes > free / 2) throw Error("Temporary storage has insufficient free space for verification.", 503);
        var settings = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.ReadWrite,
            Share = FileShare.None, Options = FileOptions.Asynchronous | FileOptions.DeleteOnClose };
        if (!OperatingSystem.IsWindows()) settings.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        var temp = new FileStream(path, settings);
        try
        {
            await using var source = await storage.OpenReadAsync(snapshot.Address.ToStorageKey(), ct);
            var receipt = await FileStorageKeys.CopyAndHashAsync(source, temp, snapshot.SizeBytes, ct);
            if (receipt.SizeBytes != snapshot.SizeBytes) throw Error("The original S3 file was incomplete. Reload and retry verification.", 409);
            temp.Position = 0;
            return (temp, receipt.Sha256);
        }
        catch { await temp.DisposeAsync(); throw; }
    }

    private static OrderManagementException Error(string message, int status) => new("scientific_s3_unavailable", message, status);
}
