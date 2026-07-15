namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed record StoredOperationalFile(string StorageKey, long SizeBytes, string Sha256);
public sealed record OperationalScanResult(OperationalFileScanStatus Status, string? Message);

public interface IOperationalFileStorage
{
    Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken cancellationToken);
    Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken);
    Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken);
}
public interface IOperationalFileScanner
{
    Task<OperationalScanResult> ScanAsync(string storageKey, CancellationToken cancellationToken);
}

public sealed class LocalOperationalFileStorage : IOperationalFileStorage
{
    private readonly string storageRoot;

    public LocalOperationalFileStorage(IWebHostEnvironment environment, IOptions<OrderManagementOptions> options)
    {
        storageRoot = Path.GetFullPath(Path.IsPathRooted(options.Value.StorageRoot)
            ? options.Value.StorageRoot
            : Path.Combine(environment.ContentRootPath, options.Value.StorageRoot));
    }

    public async Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(storageRoot);
        var safeExtension = string.IsNullOrWhiteSpace(extension) ? string.Empty : extension.ToLowerInvariant();
        var storageKey = $"{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{safeExtension}";
        var fullPath = Resolve(storageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        try
        {
            await using var destination = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81_920, true);
            using var sha = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
            var buffer = new byte[81_920];
            long total = 0;
            while (true)
            {
                var read = await content.ReadAsync(buffer, cancellationToken);
                if (read == 0) break;
                total += read;
                if (total > maximumBytes)
                    throw new OrderManagementException("file_too_large", $"The uploaded file exceeds the {maximumBytes} byte limit.");
                sha.AppendData(buffer, 0, read);
                await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
            }
            return new StoredOperationalFile(storageKey, total, Convert.ToHexString(sha.GetHashAndReset()).ToLowerInvariant());
        }
        catch
        {
            if (File.Exists(fullPath)) File.Delete(fullPath);
            throw;
        }
    }

    public Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var fullPath = Resolve(storageKey);
        if (!File.Exists(fullPath))
            throw new OrderManagementException("managed_file_missing", "The managed file is unavailable.", StatusCodes.Status409Conflict);
        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81_920, true);
        return Task.FromResult(stream);
    }

    public Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var fullPath = Resolve(storageKey);
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    private string Resolve(string storageKey)
    {
        var fullPath = Path.GetFullPath(Path.Combine(storageRoot, storageKey.Replace('/', Path.DirectorySeparatorChar)));
        var prefix = storageRoot.EndsWith(Path.DirectorySeparatorChar) ? storageRoot : storageRoot + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Storage key escaped its configured root.");
        return fullPath;
    }
}

public sealed class EnvironmentOperationalFileScanner(
    IWebHostEnvironment environment,
    IOptions<OrderManagementOptions> options) : IOperationalFileScanner
{
    public Task<OperationalScanResult> ScanAsync(string storageKey, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(!environment.IsProduction() && options.Value.UseTrustedDevelopmentScanner
            ? new OperationalScanResult(OperationalFileScanStatus.Clean, "Trusted development/test fixture scanner.")
            : new OperationalScanResult(OperationalFileScanStatus.Unavailable, "No production malware scanner is configured."));
    }
}
