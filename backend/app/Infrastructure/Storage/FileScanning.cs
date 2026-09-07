namespace PhaenoPortal.App.Infrastructure.Storage;

using System.Buffers.Binary;
using System.Net.Sockets;
using System.Text;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PSeq.Operations.Commercial.DataProvisioning.Domain;

public sealed class FileScanningOptions
{
    public const string SectionName = "FileScanning";
    public string Provider { get; set; } = "Disabled";
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 3310;
    public int TimeoutSeconds { get; set; } = 120;
    public long MaximumStreamBytes { get; set; } = 100 * 1024 * 1024;
    public bool ClamAvLimitsConfirmed { get; set; }
}

public enum FileMalwareScanStatus { Clean, Rejected, Unavailable }
public sealed record FileMalwareScanResult(FileMalwareScanStatus Status, string Message);
public interface IFileMalwareScanner
{
    Task<FileMalwareScanResult> ScanAsync(string area, string storageKey, CancellationToken cancellationToken);
}

public sealed class DisabledFileMalwareScanner : IFileMalwareScanner
{
    public Task<FileMalwareScanResult> ScanAsync(string area, string storageKey, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(new FileMalwareScanResult(FileMalwareScanStatus.Unavailable, "File scanning is unavailable. Contact Phaeno support before retrying."));
    }
}

// clamd INSTREAM reads bytes over a private TCP connection. No user-controlled
// filesystem path or command is sent to the daemon; it needs no storage mount.
public sealed class ClamAvFileMalwareScanner(IFileStorage storage, IOptions<FileScanningOptions> options,
    ILogger<ClamAvFileMalwareScanner> logger) : IFileMalwareScanner
{
    public async Task<FileMalwareScanResult> ScanAsync(string area, string storageKey, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(options.Value.TimeoutSeconds));
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(options.Value.Host, options.Value.Port, timeout.Token);
            await using var socket = client.GetStream();
            await socket.WriteAsync("zINSTREAM\0"u8.ToArray(), timeout.Token);
            await using var file = await storage.OpenReadAsync(area, storageKey, timeout.Token);
            var buffer = new byte[81_920];
            var length = new byte[4];
            long total = 0;
            while (true)
            {
                var read = await file.ReadAsync(buffer, timeout.Token);
                if (read == 0) break;
                total += read;
                if (total > options.Value.MaximumStreamBytes)
                    return Unavailable("The file exceeds the configured scanning limit. Contact Phaeno support.");
                BinaryPrimitives.WriteUInt32BigEndian(length, (uint)read);
                await socket.WriteAsync(length, timeout.Token);
                await socket.WriteAsync(buffer.AsMemory(0, read), timeout.Token);
            }
            await socket.WriteAsync(new byte[4], timeout.Token);
            var response = new List<byte>();
            var next = new byte[1];
            while (response.Count < 4096)
            {
                if (await socket.ReadAsync(next, timeout.Token) != 1)
                    return Unavailable("File scanning did not return a complete result. Try again later.");
                if (next[0] == 0)
                {
                    var verdict = Encoding.UTF8.GetString(response.ToArray());
                    if (verdict == "stream: OK") return new(FileMalwareScanStatus.Clean, "Malware scan completed successfully.");
                    if (verdict.StartsWith("stream: ", StringComparison.Ordinal) && verdict.EndsWith(" FOUND", StringComparison.Ordinal))
                        return new(FileMalwareScanStatus.Rejected, "The file was rejected by the malware scanner.");
                    return Unavailable("File scanning could not complete. Contact Phaeno support before retrying.");
                }
                response.Add(next[0]);
            }
            return Unavailable("File scanning returned an invalid result. Contact Phaeno support.");
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (Exception error) when (error is IOException or SocketException or OperationCanceledException
            or FileStorageUnavailableException or FileStorageObjectNotFoundException)
        {
            // Do not log file paths, provider responses or scientific content.
            logger.LogWarning("File scanning is unavailable ({FailureType}).", error.GetType().Name);
            return Unavailable("File scanning is unavailable. Try again later or contact Phaeno support.");
        }
    }
    private static FileMalwareScanResult Unavailable(string message) => new(FileMalwareScanStatus.Unavailable, message);
}

public sealed class ManagedFileScannerAdapter(IFileMalwareScanner scanner) : IManagedFileScanner
{
    public async Task<ManagedFileScanResult> ScanAsync(string storageKey, CancellationToken cancellationToken)
    {
        var result = await scanner.ScanAsync(FileStorageAreas.DataProvisioning, storageKey, cancellationToken);
        return new(result.Status switch { FileMalwareScanStatus.Clean => ManagedFileScanStatus.Clean,
            FileMalwareScanStatus.Rejected => ManagedFileScanStatus.Rejected, _ => ManagedFileScanStatus.Unavailable }, result.Message);
    }
}

public sealed class OperationalFileScannerAdapter(IFileMalwareScanner scanner) : IOperationalFileScanner
{
    public async Task<OperationalScanResult> ScanAsync(string storageKey, CancellationToken cancellationToken)
    {
        var result = await scanner.ScanAsync(FileStorageAreas.OrderManagement, storageKey, cancellationToken);
        return new(result.Status switch { FileMalwareScanStatus.Clean => OperationalFileScanStatus.Clean,
            FileMalwareScanStatus.Rejected => OperationalFileScanStatus.Rejected, _ => OperationalFileScanStatus.Unavailable }, result.Message);
    }
}

public static class FileScanningServiceCollectionExtensions
{
    public static IServiceCollection AddFileScanning(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        var section = configuration.GetSection(FileScanningOptions.SectionName);
        var provider = section[nameof(FileScanningOptions.Provider)] ?? (environment.IsDevelopment() ? "DevelopmentFixture" : "Disabled");
        services.AddOptions<FileScanningOptions>().Bind(section).PostConfigure(options => options.Provider = provider)
            .Validate(options => options.Provider is "Disabled" or "ClamAv" || options.Provider == "DevelopmentFixture" && environment.IsDevelopment(),
                "FileScanning:Provider must be Disabled or ClamAv; DevelopmentFixture is allowed only in Development.")
            .Validate(options => options.Provider != "ClamAv" || (!string.IsNullOrWhiteSpace(options.Host)
                && Uri.CheckHostName(options.Host) != UriHostNameType.Unknown && options.Port is >= 1 and <= 65535
                && options.TimeoutSeconds is >= 1 and <= 600 && options.MaximumStreamBytes is >= 1 and <= 1_073_741_824
                && options.ClamAvLimitsConfirmed),
                "ClamAv requires a private Host, valid Port, TimeoutSeconds from 1 to 600, MaximumStreamBytes up to 1 GiB, and ClamAvLimitsConfirmed=true after verifying complete-scan limits.")
            .ValidateOnStart();
        if (provider == "DevelopmentFixture")
        {
            services.AddSingleton<IManagedFileScanner, EnvironmentManagedFileScanner>();
            services.AddSingleton<IOperationalFileScanner, EnvironmentOperationalFileScanner>();
        }
        else
        {
            if (provider == "ClamAv") services.AddSingleton<IFileMalwareScanner, ClamAvFileMalwareScanner>();
            else services.AddSingleton<IFileMalwareScanner, DisabledFileMalwareScanner>();
            services.AddSingleton<IManagedFileScanner, ManagedFileScannerAdapter>();
            services.AddSingleton<IOperationalFileScanner, OperationalFileScannerAdapter>();
        }
        return services;
    }
}
