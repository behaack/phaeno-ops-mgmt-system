namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using System.Security.Cryptography;
using Microsoft.Extensions.Options;

public sealed class LocalManagedFileStorage : IManagedFileStorage
{
    private readonly string storageRoot;

    public LocalManagedFileStorage(
        IWebHostEnvironment environment,
        IOptions<DataProvisioningOptions> options)
    {
        storageRoot = Path.GetFullPath(
            Path.IsPathRooted(options.Value.StorageRoot)
                ? options.Value.StorageRoot
                : Path.Combine(environment.ContentRootPath, options.Value.StorageRoot));
    }

    public async Task<StoredFileResult> SaveAsync(
        Stream content,
        string fileExtension,
        long maximumBytes,
        CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(storageRoot);
        var storageKey = $"{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{fileExtension.ToLowerInvariant()}";
        var fullPath = ResolveStoragePath(storageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        try
        {
            await using var destination = new FileStream(
                fullPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 81_920,
                useAsync: true);
            using var sha256 = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
            var buffer = new byte[81_920];
            long totalBytes = 0;

            while (true)
            {
                var bytesRead = await content.ReadAsync(buffer, cancellationToken);
                if (bytesRead == 0)
                {
                    break;
                }

                totalBytes += bytesRead;
                if (totalBytes > maximumBytes)
                {
                    throw new DataProvisioningException(
                        "file_too_large",
                        $"The uploaded file exceeds the {maximumBytes} byte limit.");
                }

                sha256.AppendData(buffer, 0, bytesRead);
                await destination.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
            }

            return new StoredFileResult(
                storageKey,
                totalBytes,
                Convert.ToHexString(sha256.GetHashAndReset()).ToLowerInvariant());
        }
        catch
        {
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
            }

            throw;
        }
    }

    public Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var fullPath = ResolveStoragePath(storageKey);
        if (!File.Exists(fullPath))
        {
            throw new DataProvisioningException(
                "managed_file_missing",
                "The managed file is unavailable.",
                StatusCodes.Status409Conflict);
        }

        Stream stream = new FileStream(
            fullPath,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 81_920,
            useAsync: true);
        return Task.FromResult(stream);
    }

    public Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var fullPath = ResolveStoragePath(storageKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }

    private string ResolveStoragePath(string storageKey)
    {
        var normalizedKey = storageKey.Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(storageRoot, normalizedKey));
        var rootPrefix = storageRoot.EndsWith(Path.DirectorySeparatorChar)
            ? storageRoot
            : storageRoot + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Managed storage key escaped its configured root.");
        }

        return fullPath;
    }
}
