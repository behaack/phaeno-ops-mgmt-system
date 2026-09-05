namespace PhaenoPortal.App.Features.FileManagement.Services;

using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed class CompletionTrackedFileStreamResult(
    Stream stream,
    string contentType,
    string fileName,
    bool requestHasRange,
    ReleasedDeliverableDownloadTransfer transfer,
    ReleasedDeliverableDownloadAttemptService attemptService,
    ILogger<CompletionTrackedFileStreamResult> logger) : IActionResult
{
    private CancellationTokenSource? monitorCancellation;
    private Task? monitorTask;
    private bool monitorFailedOrRevoked;

    public async Task ExecuteResultAsync(ActionContext context)
    {
        using var leaseCancellation = CreateLeaseCancellation(
            context.HttpContext.RequestAborted,
            transfer.LeaseExpiresAtUtc);
        if (transfer.MonitorAccess)
        {
            monitorCancellation = new CancellationTokenSource();
            monitorTask = attemptService.MonitorAccessAsync(transfer, () =>
            {
                monitorFailedOrRevoked = true;
                leaseCancellation.Cancel();
                context.HttpContext.Abort();
            }, monitorCancellation.Token);
        }
        var boundedStream = new LeaseBoundReadStream(stream, leaseCancellation.Token);
        var fileResult = new FileStreamResult(boundedStream, contentType)
        {
            FileDownloadName = fileName,
            EnableRangeProcessing = true
        };

        try
        {
            await fileResult.ExecuteResultAsync(context);
            if (context.HttpContext.RequestAborted.IsCancellationRequested)
            {
                await CompleteSafelyAsync(OperationalFileDownloadOutcome.Cancelled, "request_cancelled", false);
                return;
            }
            if (leaseCancellation.IsCancellationRequested)
            {
                await CompleteSafelyAsync(OperationalFileDownloadOutcome.TimedOut, "lease_expired", false);
                return;
            }
            var statusCode = context.HttpContext.Response.StatusCode;
            var isCompleteResponse = !requestHasRange
                && statusCode is >= StatusCodes.Status200OK and < StatusCodes.Status300MultipleChoices
                && statusCode != StatusCodes.Status206PartialContent;
            await CompleteSafelyAsync(
                isCompleteResponse ? OperationalFileDownloadOutcome.Succeeded : OperationalFileDownloadOutcome.Failed,
                isCompleteResponse ? null : requestHasRange ? "partial_range_request" : $"http_{statusCode}",
                isCompleteResponse);
        }
        catch (OperationCanceledException) when (context.HttpContext.RequestAborted.IsCancellationRequested)
        {
            await CompleteSafelyAsync(OperationalFileDownloadOutcome.Cancelled, "request_cancelled", false);
            throw;
        }
        catch (OperationCanceledException) when (leaseCancellation.IsCancellationRequested)
        {
            await CompleteSafelyAsync(OperationalFileDownloadOutcome.TimedOut, "lease_expired", false);
            throw;
        }
        catch
        {
            await CompleteSafelyAsync(OperationalFileDownloadOutcome.Failed, "response_stream_failed", false);
            throw;
        }
    }

    private async Task CompleteSafelyAsync(
        OperationalFileDownloadOutcome outcome,
        string? reasonCode,
        bool countsForRetention)
    {
        try
        {
            if (monitorCancellation is not null)
            {
                await monitorCancellation.CancelAsync();
                if (monitorTask is not null) await monitorTask;
                monitorCancellation.Dispose();
                monitorCancellation = null;
            }
            if (monitorFailedOrRevoked)
            {
                outcome = OperationalFileDownloadOutcome.Revoked;
                reasonCode = "result_access_monitor_closed";
                countsForRetention = false;
            }
            await attemptService.CompleteAsync(
                transfer.AttemptIds,
                outcome,
                DateTime.UtcNow,
                reasonCode,
                countsForRetention,
                CancellationToken.None);
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Download transfer {TransferId} reached {Outcome}, but its terminal audit state could not be persisted.",
                transfer.TransferId,
                outcome);
        }
    }

    internal static CancellationTokenSource CreateLeaseCancellation(
        CancellationToken requestAborted,
        DateTime leaseExpiresAtUtc)
    {
        var source = CancellationTokenSource.CreateLinkedTokenSource(requestAborted);
        var remaining = leaseExpiresAtUtc - DateTime.UtcNow;
        if (remaining <= TimeSpan.Zero) source.Cancel();
        else source.CancelAfter(remaining);
        return source;
    }
}

public sealed record ReleasedDeliverableArchiveFile(
    Guid Id,
    string StorageKey,
    string FileName,
    DateTime? ReleasedAt);

public sealed class CompletionTrackedArchiveResult(
    IReadOnlyCollection<ReleasedDeliverableArchiveFile> files,
    string fileName,
    ReleasedDeliverableDownloadTransfer transfer,
    IOperationalFileStorage fileStorage,
    ReleasedDeliverableDownloadAttemptService attemptService,
    ILogger<CompletionTrackedArchiveResult> logger) : IActionResult
{
    private CancellationTokenSource? monitorCancellation;
    private Task? monitorTask;
    private bool monitorFailedOrRevoked;

    public async Task ExecuteResultAsync(ActionContext context)
    {
        using var leaseCancellation = CompletionTrackedFileStreamResult.CreateLeaseCancellation(
            context.HttpContext.RequestAborted,
            transfer.LeaseExpiresAtUtc);
        if (transfer.MonitorAccess)
        {
            monitorCancellation = new CancellationTokenSource();
            monitorTask = attemptService.MonitorAccessAsync(transfer, () =>
            {
                monitorFailedOrRevoked = true;
                leaseCancellation.Cancel();
                context.HttpContext.Abort();
            }, monitorCancellation.Token);
        }
        var response = context.HttpContext.Response;
        response.StatusCode = StatusCodes.Status200OK;
        response.ContentType = "application/zip";
        response.Headers[HeaderNames.ContentDisposition] = new ContentDispositionHeaderValue("attachment")
        {
            FileNameStar = fileName
        }.ToString();

        try
        {
            using var archiveStream = new AsyncOnlyWriteStream(response.Body, leaseCancellation.Token);
            using (var archive = new ZipArchive(archiveStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                var allocatedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var file in files.OrderBy(item => item.ReleasedAt).ThenBy(item => item.FileName))
                {
                    var entry = archive.CreateEntry(
                        AllocateEntryName(file.FileName, allocatedNames),
                        CompressionLevel.Fastest);
                    await using var source = await fileStorage.OpenReadAsync(
                        file.StorageKey,
                        leaseCancellation.Token);
                    await using var destination = entry.Open();
                    await source.CopyToAsync(destination, leaseCancellation.Token);
                }
            }

            await response.Body.FlushAsync(leaseCancellation.Token);
            var fullResponse = !context.HttpContext.Request.Headers.ContainsKey(HeaderNames.Range);
            await CompleteSafelyAsync(fullResponse ? OperationalFileDownloadOutcome.Succeeded : OperationalFileDownloadOutcome.Failed,
                fullResponse ? null : "partial_range_request", fullResponse);
        }
        catch (OperationCanceledException) when (context.HttpContext.RequestAborted.IsCancellationRequested)
        {
            await CompleteSafelyAsync(OperationalFileDownloadOutcome.Cancelled, "request_cancelled", false);
            throw;
        }
        catch (OperationCanceledException) when (leaseCancellation.IsCancellationRequested)
        {
            await CompleteSafelyAsync(OperationalFileDownloadOutcome.TimedOut, "lease_expired", false);
            throw;
        }
        catch
        {
            await CompleteSafelyAsync(OperationalFileDownloadOutcome.Failed, "archive_stream_failed", false);
            throw;
        }
    }

    private async Task CompleteSafelyAsync(
        OperationalFileDownloadOutcome outcome,
        string? reasonCode,
        bool countsForRetention)
    {
        try
        {
            if (monitorCancellation is not null)
            {
                await monitorCancellation.CancelAsync();
                if (monitorTask is not null) await monitorTask;
                monitorCancellation.Dispose();
                monitorCancellation = null;
            }
            if (monitorFailedOrRevoked)
            {
                outcome = OperationalFileDownloadOutcome.Revoked;
                reasonCode = "result_access_monitor_closed";
                countsForRetention = false;
            }
            await attemptService.CompleteAsync(
                transfer.AttemptIds,
                outcome,
                DateTime.UtcNow,
                reasonCode,
                countsForRetention,
                CancellationToken.None);
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Package archive transfer {TransferId} reached {Outcome}, but its terminal audit state could not be persisted.",
                transfer.TransferId,
                outcome);
        }
    }

    private static string AllocateEntryName(string fileName, ISet<string> allocatedNames)
    {
        var safeName = Path.GetFileName(fileName);
        if (allocatedNames.Add(safeName)) return safeName;
        var extension = Path.GetExtension(safeName);
        var stem = Path.GetFileNameWithoutExtension(safeName);
        for (var suffix = 2; ; suffix++)
        {
            var candidate = $"{stem} ({suffix}){extension}";
            if (allocatedNames.Add(candidate)) return candidate;
        }
    }
}

internal sealed class AsyncOnlyWriteStream(Stream inner, CancellationToken leaseCancellation) : Stream
{
    public override bool CanRead => false;
    public override bool CanSeek => false;
    public override bool CanWrite => true;
    public override long Length => throw new NotSupportedException();
    public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
    public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Flush() =>
        inner.FlushAsync(leaseCancellation).GetAwaiter().GetResult();

    public override Task FlushAsync(CancellationToken cancellationToken)
    {
        var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, leaseCancellation);
        return FlushLinkedAsync(linked);
    }

    public override void Write(byte[] buffer, int offset, int count) =>
        inner.WriteAsync(buffer.AsMemory(offset, count), leaseCancellation).AsTask().GetAwaiter().GetResult();

    public override Task WriteAsync(
        byte[] buffer,
        int offset,
        int count,
        CancellationToken cancellationToken)
    {
        var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, leaseCancellation);
        return WriteLinkedAsync(buffer.AsMemory(offset, count), linked);
    }

    public override async ValueTask WriteAsync(
        ReadOnlyMemory<byte> buffer,
        CancellationToken cancellationToken = default)
    {
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, leaseCancellation);
        await inner.WriteAsync(buffer, linked.Token);
    }

    protected override void Dispose(bool disposing)
    {
        // The HTTP response owns the underlying stream.
        base.Dispose(disposing);
    }

    private async Task FlushLinkedAsync(CancellationTokenSource linked)
    {
        using (linked) await inner.FlushAsync(linked.Token);
    }

    private async Task WriteLinkedAsync(ReadOnlyMemory<byte> buffer, CancellationTokenSource linked)
    {
        using (linked) await inner.WriteAsync(buffer, linked.Token);
    }
}

internal sealed class LeaseBoundReadStream(Stream inner, CancellationToken leaseCancellation) : Stream
{
    public override bool CanRead => inner.CanRead;
    public override bool CanSeek => inner.CanSeek;
    public override bool CanWrite => false;
    public override long Length => inner.Length;
    public override long Position { get => inner.Position; set => inner.Position = value; }
    public override void Flush() => inner.Flush();
    public override Task FlushAsync(CancellationToken cancellationToken) => inner.FlushAsync(cancellationToken);
    public override long Seek(long offset, SeekOrigin origin) => inner.Seek(offset, origin);
    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    public override int Read(byte[] buffer, int offset, int count)
    {
        leaseCancellation.ThrowIfCancellationRequested();
        return inner.Read(buffer, offset, count);
    }

    public override async Task<int> ReadAsync(
        byte[] buffer,
        int offset,
        int count,
        CancellationToken cancellationToken)
    {
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, leaseCancellation);
        return await inner.ReadAsync(buffer.AsMemory(offset, count), linked.Token);
    }

    public override async ValueTask<int> ReadAsync(
        Memory<byte> buffer,
        CancellationToken cancellationToken = default)
    {
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, leaseCancellation);
        return await inner.ReadAsync(buffer, linked.Token);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) inner.Dispose();
        base.Dispose(disposing);
    }

    public override async ValueTask DisposeAsync()
    {
        await inner.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}
