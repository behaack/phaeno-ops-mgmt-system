namespace PhaenoPortal.App.Infrastructure.Storage;

/// <summary>
/// Keeps file-storage dependencies resolvable while production object storage
/// is intentionally inactive. It never persists file bytes.
/// </summary>
public sealed class DisabledFileStorage : IFileStorage
{
    public Task<FileStorageWriteResult> SaveAsync(
        FileStorageWriteRequest request,
        CancellationToken cancellationToken) =>
        Task.FromException<FileStorageWriteResult>(new FileStorageUnavailableException());

    public Task<Stream> OpenReadAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken) =>
        Task.FromException<Stream>(new FileStorageUnavailableException());

    public Task DeleteIfExistsAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken) =>
        Task.FromException(new FileStorageUnavailableException());
}
