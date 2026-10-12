using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime.CredentialManagement;
using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using PhaenoPortal.App.Infrastructure.Storage;

// No runtime installation or provider activation. Invoke against a coordinated
// restored-database reference manifest under an independently authorized runbook.
try { await Run(args); }
catch (Exception error) { Console.Error.WriteLine($"s3_recovery=FAILED ({error.GetType().Name}); private diagnostic review required"); Environment.ExitCode = 1; }

static async Task Run(string[] args)
{
    if (args.Length < 2 || args[0] is not ("dry-run" or "capture" or "verify"))
        throw new ArgumentException("Use dry-run <references.tsv>, capture <references.tsv> --bucket <name> --region <region> --destination <new-private-directory>, or verify <captured-directory>.");
    var mode = args[0];
    if (mode == "verify")
    {
        var directory = Path.GetFullPath(args[1]);
        var manifest = JsonSerializer.Deserialize<RecoveryManifest>(await File.ReadAllTextAsync(Path.Combine(directory, "objects.json"))) ?? throw new InvalidDataException();
        if (manifest.FormatVersion != 1) throw new InvalidDataException("Unsupported recovery manifest format.");
        foreach (var entry in manifest.Objects)
        {
            if (!Regex.IsMatch(entry.Blob, "^[a-f0-9]{64}\\.blob$")) throw new InvalidDataException();
            var file = Path.Combine(directory, entry.Blob);
            await VerifyBytes(file, entry.Length, entry.Sha256);
        }
        Console.WriteLine($"s3_recovery=VERIFIED objects={manifest.Objects.Count}; source locators preserved; no database or S3 mutation");
        return;
    }
    var references = new Dictionary<string, Reference>(StringComparer.Ordinal);
    foreach (var line in await File.ReadAllLinesAsync(args[1]))
    {
        var columns = line.Split('\t');
        if (columns.Length != 4 || columns[3] is not ("required" or "retired")) throw new InvalidDataException();
        if (columns[3] == "retired") continue;
        var slash = columns[0].IndexOf('/');
        if (slash < 1 || !long.TryParse(columns[2], NumberStyles.None, CultureInfo.InvariantCulture, out var length) || length < 0
            || !Regex.IsMatch(columns[1], "^[a-f0-9]{64}$")) throw new InvalidDataException();
        var area = FileStorageKeys.ValidateArea(columns[0][..slash]);
        var storageKey = columns[0][(slash + 1)..];
        var identity = area + "/" + storageKey;
        var reference = new Reference(area, storageKey, columns[1], length);
        if (references.TryGetValue(identity, out var prior) && prior != reference) throw new InvalidDataException();
        references[identity] = reference;
    }
    if (mode == "dry-run")
    {
        foreach (var entry in references.Values) { if (S3OriginalObject.IsOriginal(entry.StorageKey)) _ = S3OriginalObject.Parse(entry.StorageKey); else if (entry.StorageKey.StartsWith("s3-managed/", StringComparison.Ordinal)) _ = S3ManagedObject.ObjectKey(entry.Area, entry.StorageKey); else _ = FileStorageKeys.ValidateStorageKey(entry.StorageKey); }
        Console.WriteLine($"s3_recovery=PLANNED references={references.Count} bytes={references.Values.Sum(entry => entry.Length)}; no credential lookup, filesystem capture or network access");
        return;
    }
    string Option(string name) { var index = Array.IndexOf(args, name); return index >= 0 && index + 1 < args.Length ? args[index + 1] : throw new ArgumentException($"Missing {name}."); }
    var bucket = Option("--bucket"); var region = Option("--region"); var destination = Path.GetFullPath(Option("--destination"));
    if (OperatingSystem.IsWindows()) throw new InvalidOperationException("Live scientific capture requires a qualified private Unix backup host; Windows supports dry-run and synthetic verify only.");
    if (Directory.Exists(destination) || File.Exists(destination) || destination.StartsWith(Path.GetFullPath(Environment.CurrentDirectory) + Path.DirectorySeparatorChar, StringComparison.Ordinal)) throw new InvalidOperationException("Use a fresh private directory outside the application/source checkout.");
    Directory.CreateDirectory(destination);
    File.SetUnixFileMode(destination, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
    var profileIndex = Array.IndexOf(args, "--profile");
    Amazon.Runtime.AWSCredentials? credentials = null;
    if (profileIndex >= 0 && (profileIndex + 1 >= args.Length || !new CredentialProfileStoreChain().TryGetAWSCredentials(args[profileIndex + 1], out credentials))) throw new InvalidOperationException("The named credential profile is unavailable.");
    var entries = new List<RecoveredObject>();
    foreach (var reference in references.Values)
    {
        var original = S3OriginalObject.IsOriginal(reference.StorageKey) ? S3OriginalObject.Parse(reference.StorageKey) : null;
        var sourceBucket = original?.Bucket ?? bucket;
        var sourceRegion = original?.Region ?? region;
        var sourceKey = original?.Key ?? (reference.StorageKey.StartsWith("s3-managed/", StringComparison.Ordinal) ? S3ManagedObject.ObjectKey(reference.Area, reference.StorageKey) : reference.Area + "/" + FileStorageKeys.ValidateStorageKey(reference.StorageKey));
        using var client = credentials is null ? new AmazonS3Client(RegionEndpoint.GetBySystemName(sourceRegion)) : new AmazonS3Client(credentials, RegionEndpoint.GetBySystemName(sourceRegion));
        var metadata = await client.GetObjectMetadataAsync(new GetObjectMetadataRequest { BucketName = sourceBucket, Key = sourceKey, VersionId = original?.VersionId });
        var version = original?.VersionId ?? metadata.VersionId;
        if (string.IsNullOrWhiteSpace(version) || version == "null") throw new InvalidDataException("A versioned source is required.");
        using var response = await client.GetObjectAsync(new GetObjectRequest { BucketName = sourceBucket, Key = sourceKey, VersionId = version });
        if (response.ContentLength != reference.Length || response.VersionId != version || original is not null && response.ETag != original.ETag) throw new InvalidDataException();
        var blob = reference.Sha256 + ".blob";
        var path = Path.Combine(destination, blob);
        if (!File.Exists(path))
        {
            await using (var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 1024 * 1024, true)) await response.ResponseStream.CopyToAsync(output);
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }
        await VerifyBytes(path, reference.Length, reference.Sha256);
        entries.Add(new(reference.Area, reference.StorageKey, sourceBucket, sourceRegion, sourceKey, version, response.ETag, reference.Sha256, reference.Length, blob));
    }
    await File.WriteAllTextAsync(Path.Combine(destination, "objects.json"), JsonSerializer.Serialize(new RecoveryManifest(1, DateTime.UtcNow, entries)));
    File.SetUnixFileMode(Path.Combine(destination, "objects.json"), UnixFileMode.UserRead | UnixFileMode.UserWrite);
    Console.WriteLine($"s3_recovery=CAPTURED objects={entries.Count}; encrypt with the coordinated database snapshot before export; scheduling/restore acceptance remains required");
}

static async Task VerifyBytes(string path, long length, string sha256)
{
    if (new FileInfo(path).Length != length) throw new InvalidDataException();
    await using var stream = File.OpenRead(path);
    if (Convert.ToHexStringLower(await SHA256.HashDataAsync(stream)) != sha256) throw new InvalidDataException();
}
sealed record Reference(string Area, string StorageKey, string Sha256, long Length);
sealed record RecoveredObject(string Area, string StorageKey, string Bucket, string Region, string Key, string VersionId, string ETag, string Sha256, long Length, string Blob);
sealed record RecoveryManifest(int FormatVersion, DateTime CapturedAtUtc, IReadOnlyList<RecoveredObject> Objects);
