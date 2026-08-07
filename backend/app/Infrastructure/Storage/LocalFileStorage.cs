namespace PhaenoPortal.App.Infrastructure.Storage;

using Microsoft.Extensions.Options;

public sealed class LocalFileStorage : IFileStorage
{
    private readonly string storageRoot;

    public LocalFileStorage(
        IWebHostEnvironment environment,
        IOptions<FileStorageOptions> options)
    {
        var configuredRoot = options.Value.LocalRootPath;
        storageRoot = Path.GetFullPath(
            Path.IsPathRooted(configuredRoot)
                ? configuredRoot
                : Path.Combine(environment.ContentRootPath, configuredRoot));
    }

    public async Task<FileStorageWriteResult> SaveAsync(
        FileStorageWriteRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request.Content);
        var storageKey = FileStorageKeys.Create(request.FileExtension);
        var fullPath = Resolve(request.Area, storageKey);
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
            var stored = await FileStorageKeys.CopyAndHashAsync(
                request.Content,
                destination,
                request.MaximumBytes,
                cancellationToken);

            return new FileStorageWriteResult(storageKey, stored.SizeBytes, stored.Sha256);
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

    public Task<Stream> OpenReadAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var fullPath = Resolve(area, storageKey);
        if (!File.Exists(fullPath))
        {
            throw new FileStorageObjectNotFoundException(area, storageKey);
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

    public Task DeleteIfExistsAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var fullPath = Resolve(area, storageKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }

    private string Resolve(string area, string storageKey)
    {
        var validatedArea = FileStorageKeys.ValidateArea(area);
        var validatedKey = FileStorageKeys.ValidateStorageKey(storageKey);
        var normalizedKey = validatedKey.Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(storageRoot, validatedArea, normalizedKey));
        var rootPrefix = storageRoot.EndsWith(Path.DirectorySeparatorChar)
            ? storageRoot
            : storageRoot + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Storage key escaped its configured local root.");
        }

        return fullPath;
    }
}
