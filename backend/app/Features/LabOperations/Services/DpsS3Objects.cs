namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Net;
using System.Security.Cryptography;
using System.Text;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Storage;

public sealed class DpsS3Objects(IServiceProvider services, IOptions<FileStorageOptions> options)
{
    private FileStorageOptions Settings => options.Value;
    private IAmazonS3 Client => services.GetRequiredService<IAmazonS3>();
    public bool Available => Settings.Provider.Equals(FileStorageProviders.S3, StringComparison.OrdinalIgnoreCase);
    public void RequireAddress(DpsObject file, string? prefix = null)
    {
        var configured = FileStorageKeys.NormalizePrefix(Settings.S3.KeyPrefix);
        if (!Available || file.Bucket != Settings.S3.BucketName || file.Region != Settings.S3.Region
            || string.IsNullOrWhiteSpace(file.VersionId) || file.VersionId == "null" || file.SizeBytes <= 0
            || Encoding.UTF8.GetByteCount(file.Key) > 1024 || file.Key.Any(char.IsControl)
            || file.Key.Split('/').Any(s => s is "." or "..")
            || configured.Length > 0 && !file.Key.StartsWith(configured + "/", StringComparison.Ordinal)
            || prefix is not null && !file.Key.StartsWith(prefix, StringComparison.Ordinal)) throw DpsContract.Invalid();
        _ = PSeq.Operations.Laboratory.Domain.LabLineageText.Hash(file.Sha256);
    }
    public async Task<DpsObject> ResolveAsync(string storageKey, string hash, long size, CancellationToken ct)
    {
        if (!Available) throw new OrderManagementException("dps_s3_required", "DPS requires configured versioned S3 scientific storage.", 503);
        var original = S3OriginalObject.IsOriginal(storageKey) ? S3OriginalObject.Parse(storageKey) : null;
        var key = original?.Key ?? S3ManagedObject.ObjectKey(FileStorageAreas.OrderManagement, storageKey);
        if (original is not null && (original.Bucket != Settings.S3.BucketName || original.Region != Settings.S3.Region)) throw DpsContract.Invalid();
        var metadata = await Client.GetObjectMetadataAsync(new() { BucketName = Settings.S3.BucketName, Key = key,
            VersionId = original?.VersionId, EtagToMatch = original?.ETag }, ct);
        var result = new DpsObject(Settings.S3.BucketName, Settings.S3.Region, key, metadata.VersionId ?? "", hash.ToLowerInvariant(), size);
        if (string.IsNullOrWhiteSpace(result.VersionId) || result.VersionId == "null")
            throw new OrderManagementException("dps_s3_versioning_required", "DPS handoff requires exact S3 object versions. Operations must configure versioned scientific storage.", 409);
        RequireAddress(result);
        if (metadata.Headers.ContentLength != size) throw DpsContract.Invalid();
        await VerifyAsync(result, ct); return result;
    }
    public async Task VerifyAsync(DpsObject file, CancellationToken ct)
    {
        RequireAddress(file);
        using var response = await Client.GetObjectAsync(new() { BucketName = file.Bucket, Key = file.Key, VersionId = file.VersionId }, ct);
        if (response.ContentLength != file.SizeBytes || response.VersionId != file.VersionId) throw DpsContract.Invalid();
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = new byte[81920]; long total = 0; int count;
        while ((count = await response.ResponseStream.ReadAsync(buffer, ct)) > 0) {
            if (total > file.SizeBytes - count) throw DpsContract.Invalid();
            total += count; hash.AppendData(buffer, 0, count);
        }
        if (total != file.SizeBytes || !Convert.ToHexString(hash.GetHashAndReset()).Equals(file.Sha256, StringComparison.OrdinalIgnoreCase)) throw DpsContract.Invalid();
    }
    public async Task<byte[]> ReadAsync(DpsObject file, int maximum, CancellationToken ct)
    {
        RequireAddress(file);
        if (file.SizeBytes > maximum) throw DpsContract.Invalid();
        using var response = await Client.GetObjectAsync(new() { BucketName = file.Bucket, Key = file.Key, VersionId = file.VersionId }, ct);
        if (response.ContentLength != file.SizeBytes || response.VersionId != file.VersionId) throw DpsContract.Invalid();
        using var memory = new MemoryStream(); var buffer = new byte[81920]; int count;
        while ((count = await response.ResponseStream.ReadAsync(buffer, ct)) > 0) {
            if (memory.Length > file.SizeBytes - count) throw DpsContract.Invalid();
            await memory.WriteAsync(buffer.AsMemory(0, count), ct);
        }
        var bytes = memory.ToArray();
        if (bytes.LongLength != file.SizeBytes || !Hash(bytes).Equals(file.Sha256, StringComparison.OrdinalIgnoreCase)) throw DpsContract.Invalid();
        return bytes;
    }
    public async Task<DpsObject> WriteOnceAsync(string key, byte[] bytes, CancellationToken ct)
    {
        if (!Available || bytes.Length is < 1 or > DpsContract.MaximumManifestBytes) throw DpsContract.Invalid();
        var digest = SHA256.HashData(bytes);
        using var stream = new MemoryStream(bytes, writable: false);
        try {
            await Client.PutObjectAsync(new() { BucketName = Settings.S3.BucketName, Key = key, InputStream = stream,
                ContentType = "application/json", IfNoneMatch = "*", ChecksumSHA256 = Convert.ToBase64String(digest) }, ct);
        } catch (AmazonS3Exception error) when (error.StatusCode == HttpStatusCode.PreconditionFailed) {
            // A retry must match the already-written instructions, never overwrite them.
        }
        return await ResolveAsync(S3ManagedObject.ToStorageKey(FileStorageAreas.OrderManagement, key), Convert.ToHexString(digest), bytes.LongLength, ct);
    }
    public async Task<(DpsObject Address, byte[] Content)?> ReadExistingInstructionsAsync(string key, CancellationToken ct)
    {
        if (!Available) throw DpsContract.Invalid();
        try {
            var metadata = await Client.GetObjectMetadataAsync(new() { BucketName = Settings.S3.BucketName, Key = key }, ct);
            var size = metadata.Headers.ContentLength;
            var address = new DpsObject(Settings.S3.BucketName, Settings.S3.Region, key, metadata.VersionId ?? "", new string('0', 64), size);
            RequireAddress(address);
            if (size > DpsContract.MaximumManifestBytes) throw DpsContract.Invalid();
            using var response = await Client.GetObjectAsync(new() { BucketName = address.Bucket, Key = key, VersionId = address.VersionId }, ct);
            if (response.VersionId != address.VersionId || response.ContentLength != size) throw DpsContract.Invalid();
            using var content = new MemoryStream(); var buffer = new byte[81920]; int count;
            while ((count = await response.ResponseStream.ReadAsync(buffer, ct)) > 0) {
                if (content.Length > size - count) throw DpsContract.Invalid();
                await content.WriteAsync(buffer.AsMemory(0, count), ct);
            }
            var bytes = content.ToArray(); if (bytes.LongLength != size) throw DpsContract.Invalid();
            return (address with { Sha256 = Hash(bytes) }, bytes);
        } catch (AmazonS3Exception error) when (error.StatusCode == HttpStatusCode.NotFound) { return null; }
    }
    public async Task<string> StorageKeyAsync(DpsObject file, string prefix, CancellationToken ct)
    {
        RequireAddress(file, prefix);
        var metadata = await Client.GetObjectMetadataAsync(new() { BucketName = file.Bucket, Key = file.Key, VersionId = file.VersionId }, ct);
        if (metadata.Headers.ContentLength != file.SizeBytes || metadata.VersionId != file.VersionId) throw DpsContract.Invalid();
        return new S3OriginalObject(file.Bucket, file.Region, file.Key, file.VersionId, metadata.ETag).ToStorageKey();
    }
    public static string Hash(ReadOnlySpan<byte> bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
}
