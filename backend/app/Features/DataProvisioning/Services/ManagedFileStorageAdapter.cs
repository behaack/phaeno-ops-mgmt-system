namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using PhaenoPortal.App.Infrastructure.Storage;
using PSeq.Operations.Commercial.DataProvisioning.Application;

public sealed class ManagedFileStorageAdapter(IFileStorage storage) : IManagedFileStorage
{
    public async Task<StoredFileResult> SaveAsync(
        Stream content,
        string fileExtension,
        long maximumBytes,
        CancellationToken cancellationToken)
    {
        try
        {
            var stored = await storage.SaveAsync(
                new FileStorageWriteRequest(
                    FileStorageAreas.DataProvisioning,
                    content,
                    fileExtension,
                    maximumBytes),
                cancellationToken);
            return new StoredFileResult(stored.StorageKey, stored.SizeBytes, stored.Sha256);
        }
        catch (FileStorageLimitExceededException)
        {
            throw new DataProvisioningException(
                "file_too_large",
                $"The uploaded file exceeds the {maximumBytes} byte limit.");
        }
    }

    public async Task<Stream> OpenReadAsync(
        string storageKey,
        CancellationToken cancellationToken)
    {
        try
        {
            return await storage.OpenReadAsync(
                FileStorageAreas.DataProvisioning,
                storageKey,
                cancellationToken);
        }
        catch (FileStorageObjectNotFoundException)
        {
            throw new DataProvisioningException(
                "managed_file_missing",
                "The managed file is unavailable.",
                StatusCodes.Status409Conflict);
        }
    }

    public Task DeleteIfExistsAsync(
        string storageKey,
        CancellationToken cancellationToken) =>
        storage.DeleteIfExistsAsync(
            FileStorageAreas.DataProvisioning,
            storageKey,
            cancellationToken);
}
