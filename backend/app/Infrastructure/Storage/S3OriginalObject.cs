namespace PhaenoPortal.App.Infrastructure.Storage;

using System.Text;
using System.Text.Json;

/// <summary>Opaque immutable locator stored in an existing scientific receipt, never an access credential.</summary>
public sealed record S3OriginalObject(string Bucket, string Region, string Key, string VersionId, string ETag)
{
    public const string Prefix = "s3-original/";

    public string ToStorageKey()
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(this);
        var key = Prefix + Convert.ToBase64String(json).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        if (key.Length > 1000) throw new ArgumentException("The original-object locator exceeds the scientific receipt limit.");
        return key;
    }

    public static bool IsOriginal(string key) => key.StartsWith(Prefix, StringComparison.Ordinal);

    public static S3OriginalObject Parse(string storageKey)
    {
        if (!IsOriginal(storageKey) || storageKey.Length > 1000) throw new ArgumentException("Invalid original-object locator.");
        try
        {
            var encoded = storageKey[Prefix.Length..].Replace('-', '+').Replace('_', '/');
            encoded = encoded.PadRight((encoded.Length + 3) / 4 * 4, '=');
            var value = JsonSerializer.Deserialize<S3OriginalObject>(Convert.FromBase64String(encoded))
                ?? throw new ArgumentException("Invalid original-object locator.");
            if (string.IsNullOrWhiteSpace(value.Bucket) || string.IsNullOrWhiteSpace(value.Region)
                || string.IsNullOrWhiteSpace(value.Key) || string.IsNullOrWhiteSpace(value.ETag)
                || string.IsNullOrWhiteSpace(value.VersionId) || value.VersionId == "null"
                || Encoding.UTF8.GetByteCount(value.Key) > 1024 || value.Key.Any(char.IsControl)
                || value.ToStorageKey() != storageKey)
                throw new ArgumentException("Invalid original-object locator.");
            return value;
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        { throw new ArgumentException("Invalid original-object locator.", ex); }
    }
}
