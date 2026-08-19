namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.FileManagement.Services;

public sealed class OperationalFileDownloadTests
{
    private static readonly DateTime StartedAt = new(2026, 8, 19, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void AttemptStartsWithoutClaimingACompletedDownload()
    {
        var attempt = CreateAttempt();

        Assert.Equal(OperationalFileDownloadOutcome.Started, attempt.Outcome);
        Assert.Null(attempt.TerminalAtUtc);
        Assert.Null(attempt.CompletedAtUtc);
        Assert.False(attempt.CountsForReleasedPackageRetention);
        Assert.Equal(StartedAt.AddHours(1), attempt.LeaseExpiresAtUtc);
    }

    [Fact]
    public void SuccessfulFullResponseBecomesImmutableRetentionEvidence()
    {
        var attempt = CreateAttempt();
        var completedAt = StartedAt.AddMinutes(2);

        attempt.Complete(
            OperationalFileDownloadOutcome.Succeeded,
            completedAt,
            countsForReleasedPackageRetention: true);

        Assert.Equal(OperationalFileDownloadOutcome.Succeeded, attempt.Outcome);
        Assert.Equal(completedAt, attempt.TerminalAtUtc);
        Assert.Equal(completedAt, attempt.CompletedAtUtc);
        Assert.True(attempt.CountsForReleasedPackageRetention);
        Assert.Throws<InvalidOperationException>(() => attempt.Complete(
            OperationalFileDownloadOutcome.Failed,
            completedAt.AddSeconds(1),
            "cannot_replace_success"));
    }

    [Theory]
    [InlineData(OperationalFileDownloadOutcome.Failed)]
    [InlineData(OperationalFileDownloadOutcome.Cancelled)]
    [InlineData(OperationalFileDownloadOutcome.TimedOut)]
    [InlineData(OperationalFileDownloadOutcome.Revoked)]
    public void NonSuccessfulAttemptCannotCountForRetention(OperationalFileDownloadOutcome outcome)
    {
        var attempt = CreateAttempt();

        Assert.Throws<ArgumentException>(() => attempt.Complete(
            outcome,
            StartedAt.AddMinutes(1),
            "not_complete",
            countsForReleasedPackageRetention: true));
    }

    [Fact]
    public void PackageProjectionRequiresEveryFileToHaveCountingSuccess()
    {
        var firstFileId = Guid.NewGuid();
        var secondFileId = Guid.NewGuid();
        var first = CreateAttempt(firstFileId);
        var partialRange = CreateAttempt(secondFileId);
        first.Complete(
            OperationalFileDownloadOutcome.Succeeded,
            StartedAt.AddMinutes(1),
            countsForReleasedPackageRetention: true);
        partialRange.Complete(
            OperationalFileDownloadOutcome.Succeeded,
            StartedAt.AddMinutes(2),
            "partial_range_request",
            countsForReleasedPackageRetention: false);

        var partial = ReleasedDeliverableDownloadProjection.Create(
            [firstFileId, secondFileId],
            [first, partialRange],
            StartedAt.AddMinutes(3));

        Assert.Equal(ReleasedDeliverableDownloadStatus.PartiallyDownloaded, partial.Status);
        Assert.Equal(1, partial.DownloadedFileCount);
        Assert.False(partial.Files[secondFileId].IsDownloaded);

        var archiveCompletion = CreateAttempt(
            secondFileId,
            OperationalFileDownloadScope.PackageArchive);
        archiveCompletion.Complete(
            OperationalFileDownloadOutcome.Succeeded,
            StartedAt.AddMinutes(4),
            countsForReleasedPackageRetention: true);
        var complete = ReleasedDeliverableDownloadProjection.Create(
            [firstFileId, secondFileId],
            [first, partialRange, archiveCompletion],
            StartedAt.AddMinutes(5));

        Assert.Equal(ReleasedDeliverableDownloadStatus.Downloaded, complete.Status);
        Assert.Equal(2, complete.DownloadedFileCount);
        Assert.Equal(StartedAt.AddMinutes(4), complete.CompletedAtUtc);
    }

    [Fact]
    public void ProjectionShowsOnlyUnexpiredStartedAttemptsAsInProgress()
    {
        var fileId = Guid.NewGuid();
        var attempt = CreateAttempt(fileId);

        var active = ReleasedDeliverableDownloadProjection.Create(
            [fileId],
            [attempt],
            StartedAt.AddMinutes(30));
        var expired = ReleasedDeliverableDownloadProjection.Create(
            [fileId],
            [attempt],
            StartedAt.AddHours(2));

        Assert.Equal(ReleasedDeliverableDownloadStatus.InProgress, active.Status);
        Assert.Equal(1, active.ActiveAttemptCount);
        Assert.Equal(ReleasedDeliverableDownloadStatus.NotStarted, expired.Status);
        Assert.Equal(0, expired.ActiveAttemptCount);
    }

    [Fact]
    public void ManifestReaderSupportsSingleAndMultiFilePackages()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();

        Assert.Equal(
            [first],
            ReleasedDeliverableManifest.ReadFileIds($$"""{"fileId":"{{first}}"}"""));
        Assert.Equal(
            new HashSet<Guid> { first, second },
            ReleasedDeliverableManifest.ReadFileIds(
                $$"""{"files":[{"id":"{{first}}"},{"fileId":"{{second}}"}]}""").ToHashSet());
    }

    private static OperationalFileDownload CreateAttempt(
        Guid? fileId = null,
        OperationalFileDownloadScope scope = OperationalFileDownloadScope.IndividualFile) => new(
        Guid.NewGuid(),
        fileId ?? Guid.NewGuid(),
        Guid.NewGuid(),
        Guid.NewGuid(),
        ReleasedDeliverablePackageType.LabResult,
        Guid.NewGuid(),
        scope,
        StartedAt,
        StartedAt.AddHours(1),
        "127.0.0.1",
        "test-agent");
}
