using System.Buffers.Binary;
using System.Net;
using System.Net.Sockets;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Infrastructure.Storage;

namespace PSeq.Operations.Test;

public sealed class FileScanningTests
{
    [Theory]
    [InlineData("stream: OK\0", FileMalwareScanStatus.Clean)]
    [InlineData("stream: Example-Signature FOUND\0", FileMalwareScanStatus.Rejected)]
    [InlineData("INSTREAM size limit exceeded. ERROR\0", FileMalwareScanStatus.Unavailable)]
    [InlineData("stream: NOT OK\0", FileMalwareScanStatus.Unavailable)]
    [InlineData("stream: OK", FileMalwareScanStatus.Unavailable)]
    public async Task ClamAvStreamsExactBytesAndRequiresAnExplicitCompleteVerdict(string response, FileMalwareScanStatus expected)
    {
        using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        using var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
        var content = Encoding.UTF8.GetBytes("Harmless scanner protocol fixture.");
        var received = ReceiveAsync(listener, response, stop.Token);
        var storage = new MemoryStorage(content);
        var scanner = CreateScanner(storage, ((IPEndPoint)listener.LocalEndpoint).Port);
        var result = await scanner.ScanAsync(FileStorageAreas.OrderManagement, "2026/09/fixture.txt", stop.Token);
        Assert.Equal(content, await received);
        Assert.Equal(expected, result.Status);
        Assert.Equal(FileStorageAreas.OrderManagement, storage.LastArea);
        Assert.DoesNotContain("Example-Signature", result.Message);
    }

    [Fact]
    public async Task UnreachableDaemonNeverMarksAFileClean()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port; listener.Stop();
        var result = await CreateScanner(new MemoryStorage([1]), port).ScanAsync(FileStorageAreas.DataProvisioning, "fixture.txt", CancellationToken.None);
        Assert.Equal(FileMalwareScanStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task CallerCancellationRemainsCancellation()
    {
        using var cancellation = new CancellationTokenSource(); cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => CreateScanner(new MemoryStorage([1]), 3310)
            .ScanAsync(FileStorageAreas.OrderManagement, "fixture.txt", cancellation.Token));
    }

    [Fact]
    public async Task DisabledScannerCannotTurnStoredBytesIntoCleanEvidence()
    {
        var result = await new DisabledFileMalwareScanner().ScanAsync(FileStorageAreas.OrderManagement, "fixture.txt", CancellationToken.None);
        Assert.Equal(FileMalwareScanStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task OversizedInputIsNotSentAsAnApparentlyCompleteCleanStream()
    {
        using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        using var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
        var receive = Task.Run(async () =>
        {
            using var client = await listener.AcceptTcpClientAsync(stop.Token);
            await using var socket = client.GetStream();
            var bytes = new byte[10]; await socket.ReadExactlyAsync(bytes, stop.Token);
            Assert.Equal("zINSTREAM\0", Encoding.ASCII.GetString(bytes));
            Assert.Equal(0, await socket.ReadAsync(new byte[1], stop.Token));
        }, stop.Token);
        var scanner = new ClamAvFileMalwareScanner(new MemoryStorage([1, 2]), Options.Create(new FileScanningOptions
        { Host = "127.0.0.1", Port = ((IPEndPoint)listener.LocalEndpoint).Port, MaximumStreamBytes = 1 }), NullLogger<ClamAvFileMalwareScanner>.Instance);
        Assert.Equal(FileMalwareScanStatus.Unavailable, (await scanner.ScanAsync(FileStorageAreas.OrderManagement, "fixture.txt", stop.Token)).Status);
        await receive;
    }

    private static ClamAvFileMalwareScanner CreateScanner(IFileStorage storage, int port) => new(storage,
        Options.Create(new FileScanningOptions { Host = "127.0.0.1", Port = port, TimeoutSeconds = 2 }), NullLogger<ClamAvFileMalwareScanner>.Instance);

    private static async Task<byte[]> ReceiveAsync(TcpListener listener, string response, CancellationToken token)
    {
        using var client = await listener.AcceptTcpClientAsync(token);
        await using var socket = client.GetStream();
        var command = new byte[10]; await socket.ReadExactlyAsync(command, token);
        Assert.Equal("zINSTREAM\0", Encoding.ASCII.GetString(command));
        using var collected = new MemoryStream();
        var length = new byte[4];
        while (true)
        {
            await socket.ReadExactlyAsync(length, token);
            var count = BinaryPrimitives.ReadUInt32BigEndian(length);
            if (count == 0) break;
            Assert.InRange(count, 1u, 81_920u);
            var chunk = new byte[count]; await socket.ReadExactlyAsync(chunk, token);
            await collected.WriteAsync(chunk, token);
        }
        await socket.WriteAsync(Encoding.UTF8.GetBytes(response), token);
        return collected.ToArray();
    }

    private sealed class MemoryStorage(byte[] bytes) : IFileStorage
    {
        public string? LastArea { get; private set; }
        public Task<Stream> OpenReadAsync(string area, string storageKey, CancellationToken cancellationToken)
        { LastArea = area; return Task.FromResult<Stream>(new MemoryStream(bytes)); }
        public Task<FileStorageWriteResult> SaveAsync(FileStorageWriteRequest request, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string area, string storageKey, CancellationToken cancellationToken) => throw new NotSupportedException();
    }
}
