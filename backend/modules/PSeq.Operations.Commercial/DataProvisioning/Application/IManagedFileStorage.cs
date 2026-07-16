namespace PSeq.Operations.Commercial.DataProvisioning.Application;

public sealed record StoredFileResult(
    string StorageKey,
    long SizeBytes,
    string Sha256);

public interface IManagedFileStorage
{
    Task<StoredFileResult> SaveAsync(
        Stream content,
        string fileExtension,
        long maximumBytes,
        CancellationToken cancellationToken);

    Task<Stream> OpenReadAsync(string storageKey, CancellationToken cancellationToken);

    Task DeleteIfExistsAsync(string storageKey, CancellationToken cancellationToken);
}
