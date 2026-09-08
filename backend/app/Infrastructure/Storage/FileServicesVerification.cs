namespace PhaenoPortal.App.Infrastructure.Storage;

using System.Security.Cryptography;
using System.Text;

/// <summary>Permanent operator readiness check using only uniquely owned synthetic bytes.</summary>
public static class FileServicesVerification
{
    public static async Task VerifyAsync(IFileStorage storage, IFileMalwareScanner scanner, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromMinutes(5));
        if (storage is LocalFileStorage local) await local.VerifyWritableAsync(timeout.Token);
        foreach (var area in new[] { FileStorageAreas.DataProvisioning, FileStorageAreas.OrderManagement })
        {
            var bytes = Encoding.UTF8.GetBytes($"Phaeno file-service readiness check. Synthetic data only. {Guid.NewGuid():N}\n");
            var checksum = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
            FileStorageWriteResult? stored = null;
            try
            {
                using var content = new MemoryStream(bytes, writable: false);
                stored = await storage.SaveAsync(new(area, content, ".txt", bytes.Length), timeout.Token);
                if (stored.SizeBytes != bytes.Length || !string.Equals(stored.Sha256, checksum, StringComparison.Ordinal))
                    throw new InvalidDataException("Stored byte count or checksum did not match.");
                await using (var read = await storage.OpenReadAsync(area, stored.StorageKey, timeout.Token))
                {
                    var downloaded = new byte[bytes.Length];
                    await read.ReadExactlyAsync(downloaded, timeout.Token);
                    if (!downloaded.AsSpan().SequenceEqual(bytes) || await read.ReadAsync(new byte[1], timeout.Token) != 0)
                        throw new InvalidDataException("Stored bytes did not round trip exactly.");
                }
                if ((await scanner.ScanAsync(area, stored.StorageKey, timeout.Token)).Status != FileMalwareScanStatus.Clean)
                    throw new InvalidDataException("Synthetic clean bytes did not receive a clean scan.");
            }
            finally
            {
                if (stored is not null)
                {
                    // Cleanup must still run when the caller or scanning operation is cancelled.
                    using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                    await storage.DeleteIfExistsAsync(area, stored.StorageKey, cleanup.Token);
                    try
                    {
                        await using var remaining = await storage.OpenReadAsync(area, stored.StorageKey, cleanup.Token);
                        throw new InvalidDataException("The readiness file was not removed.");
                    }
                    catch (FileStorageObjectNotFoundException) { }
                }
            }
        }
    }
}
