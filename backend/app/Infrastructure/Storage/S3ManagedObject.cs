namespace PhaenoPortal.App.Infrastructure.Storage;

/// <summary>Preserves the storage-area boundary without putting an area above Customer in S3.</summary>
public static class S3ManagedObject
{
    private const string Prefix = "s3-managed/";

    public static string ToStorageKey(string area, string objectKey)
    {
        var key = $"{Prefix}{FileStorageKeys.ValidateArea(area)}/{FileStorageKeys.ValidateStorageKey(objectKey)}";
        if (key.Length > 1000) throw new ArgumentException("The S3 object locator exceeds the file receipt limit.");
        return key;
    }

    public static string ObjectKey(string area, string storageKey)
    {
        var prefix = $"{Prefix}{FileStorageKeys.ValidateArea(area)}/";
        if (!storageKey.StartsWith(prefix, StringComparison.Ordinal))
            throw new ArgumentException("This S3 locator belongs to a different storage area or is invalid.");
        return FileStorageKeys.ValidateStorageKey(storageKey[prefix.Length..]);
    }
}
