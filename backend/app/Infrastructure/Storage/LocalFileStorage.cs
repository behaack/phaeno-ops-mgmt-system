namespace PhaenoPortal.App.Infrastructure.Storage;

using Microsoft.Extensions.Options;

public sealed class LocalFileStorage : IFileStorage
{
    private readonly string storageRoot;

    public async Task VerifyWritableAsync(CancellationToken cancellationToken)
    {
        EnsureNoLinks(storageRoot);
        if (OperatingSystem.IsWindows()) Directory.CreateDirectory(storageRoot);
        else
        {
            Directory.CreateDirectory(storageRoot, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
            EnsureNoLinks(storageRoot);
            File.SetUnixFileMode(storageRoot, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        }
        var probe = Path.Combine(storageRoot, $".storage-check-{Guid.NewGuid():N}");
        var created = false;
        try
        {
            EnsureNoLinks(probe);
            await using var stream = new FileStream(probe, FileMode.CreateNew, FileAccess.Write, FileShare.None, 1, FileOptions.Asynchronous);
            created = true;
            await stream.WriteAsync(new byte[] { 0 }, cancellationToken);
            await stream.FlushAsync(cancellationToken);
        }
        finally
        {
            if (created) { EnsureNoLinks(probe); File.Delete(probe); }
        }
    }

    public LocalFileStorage(
        IWebHostEnvironment environment,
        IOptions<FileStorageOptions> options)
    {
        storageRoot = ResolveRoot(environment, options.Value);
    }

    internal static string ResolveRoot(IWebHostEnvironment environment, FileStorageOptions options)
    {
        var configuredRoot = options.LocalRootPath;
        if (string.IsNullOrWhiteSpace(configuredRoot))
        {
            foreach (var area in new[] { FileStorageAreas.DataProvisioning, FileStorageAreas.OrderManagement })
            {
                var legacy = Path.Combine(environment.ContentRootPath, "App_Data", area);
                if (Directory.Exists(legacy) && Directory.EnumerateFileSystemEntries(legacy).Any())
                    throw new InvalidOperationException("Legacy managed files exist under App_Data. Inventory and explicitly migrate them before selecting the new local storage root.");
            }
        }
        if (environment.IsProduction() && (!options.LocalPersistentVolumeConfirmed || !Path.IsPathFullyQualified(configuredRoot)))
            throw new InvalidOperationException("Production Local storage requires an absolute path on an explicitly confirmed persistent volume.");
        var root = string.IsNullOrWhiteSpace(configuredRoot)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PhaenoPortal", "managed-files", environment.EnvironmentName)
            : configuredRoot;
        if (!Path.IsPathFullyQualified(root))
            throw new InvalidOperationException("Local file storage must use an absolute path outside the application and public directories.");
        root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(root));
        if (string.Equals(root, Path.GetPathRoot(root), PathComparison))
            throw new InvalidOperationException("Local file storage cannot use a filesystem root.");
        foreach (var protectedRoot in new[] { environment.ContentRootPath, environment.WebRootPath })
            if (!string.IsNullOrWhiteSpace(protectedRoot) && (ContainsPath(protectedRoot, root) || ContainsPath(root, protectedRoot)))
                throw new InvalidOperationException("Local file storage must be separate from application and public directories.");
        for (var ancestor = environment.ContentRootPath; !string.IsNullOrEmpty(ancestor); ancestor = Path.GetDirectoryName(ancestor))
            if ((Directory.Exists(Path.Combine(ancestor, ".git")) || File.Exists(Path.Combine(ancestor, ".git"))) && ContainsPath(ancestor, root))
                throw new InvalidOperationException("Local file storage cannot write managed bytes inside the source repository.");
        EnsureNoLinks(root);
        return root;
    }

    private static StringComparison PathComparison => OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
    private static bool ContainsPath(string parent, string child)
    {
        parent = Path.TrimEndingDirectorySeparator(Path.GetFullPath(parent));
        return string.Equals(parent, child, PathComparison) || child.StartsWith(parent + Path.DirectorySeparatorChar, PathComparison);
    }

    // The deployment volume must be private to the API/administrators. Reject existing
    // symlinks and reparse points; do not follow a link into another storage area.
    internal static void EnsureNoLinks(string path)
    {
        for (var current = path; !string.IsNullOrEmpty(current); current = Path.GetDirectoryName(current))
        {
            try
            {
                if ((File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                    throw new IOException("Symbolic links and reparse points are not permitted in local file storage.");
            }
            catch (FileNotFoundException) { }
            catch (DirectoryNotFoundException) { }
        }
    }

    public async Task<FileStorageWriteResult> SaveAsync(
        FileStorageWriteRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request.Content);
        var storageKey = FileStorageKeys.Create(request.FileExtension);
        var fullPath = Resolve(request.Area, storageKey);
        var parent = Path.GetDirectoryName(fullPath)!;
        if (OperatingSystem.IsWindows()) Directory.CreateDirectory(parent);
        else Directory.CreateDirectory(parent, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        EnsureNoLinks(fullPath);
        var created = false;

        try
        {
            var fileOptions = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write,
                Share = FileShare.None, BufferSize = 81_920, Options = FileOptions.Asynchronous };
            if (!OperatingSystem.IsWindows()) fileOptions.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            await using var destination = new FileStream(fullPath, fileOptions);
            created = true;
            EnsureNoLinks(fullPath);
            var stored = await FileStorageKeys.CopyAndHashAsync(
                request.Content,
                destination,
                request.MaximumBytes,
                cancellationToken);

            return new FileStorageWriteResult(storageKey, stored.SizeBytes, stored.Sha256);
        }
        catch
        {
            if (created && File.Exists(fullPath))
            {
                EnsureNoLinks(fullPath);
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

        if (!fullPath.StartsWith(rootPrefix, PathComparison))
        {
            throw new InvalidOperationException("Storage key escaped its configured local root.");
        }
        EnsureNoLinks(fullPath);
        return fullPath;
    }
}

public sealed class LocalFileStorageStartupCheck(IFileStorage storage) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken) => storage is LocalFileStorage local
        ? local.VerifyWritableAsync(cancellationToken) : Task.CompletedTask;
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
