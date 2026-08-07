namespace PhaenoPortal.App.Infrastructure.Storage;

using System.Security.Cryptography;

public sealed record FileStorageWriteRequest(
    string Area,
    Stream Content,
    string FileExtension,
    long MaximumBytes);

public sealed record FileStorageWriteResult(
    string StorageKey,
    long SizeBytes,
    string Sha256);

public interface IFileStorage
{
    Task<FileStorageWriteResult> SaveAsync(
        FileStorageWriteRequest request,
        CancellationToken cancellationToken);

    Task<Stream> OpenReadAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken);

    Task DeleteIfExistsAsync(
        string area,
        string storageKey,
        CancellationToken cancellationToken);
}

public sealed class FileStorageLimitExceededException(long maximumBytes)
    : Exception($"The file exceeds the {maximumBytes} byte storage limit.")
{
    public long MaximumBytes { get; } = maximumBytes;
}

public sealed class FileStorageObjectNotFoundException(string area, string storageKey)
    : Exception("The stored file is unavailable.")
{
    public string Area { get; } = area;

    public string StorageKey { get; } = storageKey;
}

public sealed class FileStorageUnavailableException()
    : Exception("File storage is not configured for this environment.");

public static class FileStorageAreas
{
    public const string DataProvisioning = "provisioning-files";
    public const string OrderManagement = "order-files";
}

internal static class FileStorageKeys
{
    public static string Create(string fileExtension)
    {
        var extension = NormalizeExtension(fileExtension);
        return $"{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{extension}";
    }

    public static string ValidateArea(string area)
    {
        if (string.IsNullOrWhiteSpace(area)
            || area.Any(character => !char.IsAsciiLetterOrDigit(character) && character != '-'))
        {
            throw new ArgumentException("Storage area must contain only ASCII letters, digits, and hyphens.", nameof(area));
        }

        return area;
    }

    public static string ValidateStorageKey(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey)
            || storageKey.StartsWith("/", StringComparison.Ordinal)
            || storageKey.Contains('\\'))
        {
            throw new ArgumentException("Storage key is invalid.", nameof(storageKey));
        }

        var segments = storageKey.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0
            || segments.Any(segment => segment is "." or "..")
            || !string.Equals(string.Join('/', segments), storageKey, StringComparison.Ordinal))
        {
            throw new ArgumentException("Storage key is invalid.", nameof(storageKey));
        }

        return storageKey;
    }

    public static string NormalizePrefix(string? prefix)
    {
        if (string.IsNullOrWhiteSpace(prefix))
        {
            return string.Empty;
        }

        var normalized = prefix.Trim().Trim('/');
        ValidateStorageKey(normalized);
        return normalized;
    }

    public static async Task<(long SizeBytes, string Sha256)> CopyAndHashAsync(
        Stream source,
        Stream destination,
        long maximumBytes,
        CancellationToken cancellationToken)
    {
        if (maximumBytes <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(maximumBytes));
        }

        using var sha256 = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        var buffer = new byte[81_920];
        long totalBytes = 0;

        while (true)
        {
            var bytesRead = await source.ReadAsync(buffer, cancellationToken);
            if (bytesRead == 0)
            {
                break;
            }

            totalBytes += bytesRead;
            if (totalBytes > maximumBytes)
            {
                throw new FileStorageLimitExceededException(maximumBytes);
            }

            sha256.AppendData(buffer, 0, bytesRead);
            await destination.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
        }

        return (
            totalBytes,
            Convert.ToHexString(sha256.GetHashAndReset()).ToLowerInvariant());
    }

    private static string NormalizeExtension(string fileExtension)
    {
        if (string.IsNullOrWhiteSpace(fileExtension))
        {
            return string.Empty;
        }

        var normalized = fileExtension.Trim().ToLowerInvariant();
        if (!normalized.StartsWith(".", StringComparison.Ordinal)
            || normalized.Length == 1
            || normalized.Contains('/')
            || normalized.Contains('\\')
            || normalized.Contains("..", StringComparison.Ordinal)
            || normalized.Skip(1).Any(character => !char.IsAsciiLetterOrDigit(character) && character is not '.' and not '-' and not '_'))
        {
            throw new ArgumentException("File extension is invalid.", nameof(fileExtension));
        }

        return normalized;
    }
}
