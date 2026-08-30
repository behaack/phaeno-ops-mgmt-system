namespace PhaenoPortal.App.Features.FileManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public enum ReleasedDeliverableDownloadStatus
{
    NoFiles = 1,
    NotStarted = 2,
    InProgress = 3,
    PartiallyDownloaded = 4,
    Downloaded = 5
}

public sealed record ReleasedDeliverableFileDownloadProjection(
    bool IsDownloaded,
    int ActiveAttemptCount,
    DateTime? DownloadedAtUtc);

public sealed record ReleasedDeliverableDownloadProjection(
    int TotalFileCount,
    int DownloadedFileCount,
    int ActiveAttemptCount,
    ReleasedDeliverableDownloadStatus Status,
    DateTime? CompletedAtUtc,
    IReadOnlyDictionary<Guid, ReleasedDeliverableFileDownloadProjection> Files)
{
    public static ReleasedDeliverableDownloadProjection Create(
        IReadOnlyCollection<Guid> fileIds,
        IReadOnlyCollection<OperationalFileDownload> attempts,
        DateTime utcNow)
    {
        if (utcNow.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Projection timestamps must use UTC.", nameof(utcNow));

        var distinctFileIds = fileIds.Where(id => id != Guid.Empty).Distinct().ToList();
        var relevantAttempts = attempts
            .Where(attempt => distinctFileIds.Contains(attempt.ManagedOperationalFileId))
            .ToList();
        var files = new Dictionary<Guid, ReleasedDeliverableFileDownloadProjection>();

        foreach (var fileId in distinctFileIds)
        {
            var fileAttempts = relevantAttempts
                .Where(attempt => attempt.ManagedOperationalFileId == fileId)
                .ToList();
            var successfulAt = fileAttempts
                .Where(attempt => attempt.Outcome == OperationalFileDownloadOutcome.Succeeded
                    && attempt.CountsForReleasedPackageRetention
                    && attempt.CompletedAtUtc.HasValue)
                .Select(attempt => attempt.CompletedAtUtc!.Value)
                .Order()
                .FirstOrDefault();
            var fileActiveAttemptCount = fileAttempts.Count(attempt =>
                attempt.Outcome == OperationalFileDownloadOutcome.Started
                && attempt.LeaseExpiresAtUtc > utcNow);
            files[fileId] = new ReleasedDeliverableFileDownloadProjection(
                successfulAt != default,
                fileActiveAttemptCount,
                successfulAt == default ? null : successfulAt);
        }

        var downloadedFileCount = files.Values.Count(file => file.IsDownloaded);
        var activeAttemptCount = relevantAttempts
            .Where(attempt => attempt.Outcome == OperationalFileDownloadOutcome.Started
                && attempt.LeaseExpiresAtUtc > utcNow)
            .Select(attempt => attempt.TransferId)
            .Distinct()
            .Count();
        var status = distinctFileIds.Count switch
        {
            0 => ReleasedDeliverableDownloadStatus.NoFiles,
            _ when downloadedFileCount == distinctFileIds.Count => ReleasedDeliverableDownloadStatus.Downloaded,
            _ when downloadedFileCount > 0 => ReleasedDeliverableDownloadStatus.PartiallyDownloaded,
            _ when activeAttemptCount > 0 => ReleasedDeliverableDownloadStatus.InProgress,
            _ => ReleasedDeliverableDownloadStatus.NotStarted
        };
        var completedAtUtc = status == ReleasedDeliverableDownloadStatus.Downloaded
            ? files.Values.Max(file => file.DownloadedAtUtc)
            : null;

        return new ReleasedDeliverableDownloadProjection(
            distinctFileIds.Count,
            downloadedFileCount,
            activeAttemptCount,
            status,
            completedAtUtc,
            files);
    }
}

public sealed class ReleasedDeliverableDownloadProjectionService(PSeqOperationsDbContext dbContext)
{
    public async Task<IReadOnlyDictionary<Guid, ReleasedDeliverableDownloadProjection>> ReadAsync(
        Guid organizationId,
        ReleasedDeliverablePackageType packageType,
        IReadOnlyDictionary<Guid, IReadOnlyCollection<Guid>> fileIdsByPackageId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var packageIds = fileIdsByPackageId.Keys.Where(id => id != Guid.Empty).Distinct().ToList();
        if (packageIds.Count == 0)
            return new Dictionary<Guid, ReleasedDeliverableDownloadProjection>();

        var attempts = await dbContext.OperationalFileDownloads
            .AsNoTracking()
            .Where(attempt => attempt.OrganizationId == organizationId
                && attempt.ReleasedPackageType == packageType
                && packageIds.Contains(attempt.ReleasedPackageId))
            .ToListAsync(cancellationToken);

        return fileIdsByPackageId.ToDictionary(
            item => item.Key,
            item => ReleasedDeliverableDownloadProjection.Create(
                item.Value,
                attempts.Where(attempt => attempt.ReleasedPackageId == item.Key).ToList(),
                utcNow));
    }
}

public static class ReleasedDeliverableManifest
{
    public static IReadOnlyCollection<Guid> ReadFileIds(string manifestJson)
    {
        try
        {
            using var document = JsonDocument.Parse(manifestJson);
            var result = new HashSet<Guid>();
            if (document.RootElement.TryGetProperty("fileId", out var singleFile)
                && singleFile.TryGetGuid(out var singleFileId))
            {
                result.Add(singleFileId);
            }

            if (document.RootElement.TryGetProperty("files", out var files)
                && files.ValueKind == JsonValueKind.Array)
            {
                foreach (var file in files.EnumerateArray())
                {
                    if (file.TryGetProperty("id", out var id) && id.TryGetGuid(out var fileId))
                        result.Add(fileId);
                    else if (file.TryGetProperty("fileId", out var nestedId) && nestedId.TryGetGuid(out fileId))
                        result.Add(fileId);
                }
            }

            return result;
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
