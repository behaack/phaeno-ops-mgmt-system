namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Storage;

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

public sealed class OperationalFileStorageAdapter(IFileStorage storage) : IOperationalFileStorage
{
    public async Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken cancellationToken)
    {
        try
        {
            var stored = await storage.SaveAsync(
                new FileStorageWriteRequest(
                    FileStorageAreas.OrderManagement,
                    content,
                    extension,
                    maximumBytes),
                cancellationToken);
            return new StoredOperationalFile(stored.StorageKey, stored.SizeBytes, stored.Sha256);
        }
        catch (FileStorageLimitExceededException)
        {
            throw new OrderManagementException(
                "file_too_large",
                $"The uploaded file exceeds the {maximumBytes} byte limit.");
        }
    }

    public async Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken)
    {
        try
        {
            return await storage.OpenReadAsync(
                FileStorageAreas.OrderManagement,
                storageKey,
                cancellationToken);
        }
        catch (FileStorageObjectNotFoundException)
        {
            throw new OrderManagementException(
                "managed_file_missing",
                "The managed file is unavailable.",
                StatusCodes.Status409Conflict);
        }
    }

    public Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken) =>
        storage.DeleteIfExistsAsync(
            FileStorageAreas.OrderManagement,
            storageKey,
            cancellationToken);
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
