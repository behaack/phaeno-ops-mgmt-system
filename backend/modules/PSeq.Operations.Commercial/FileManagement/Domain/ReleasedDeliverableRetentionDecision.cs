namespace PSeq.Operations.Commercial.FileManagement.Domain;

/// <summary>Authoritative frozen-date decision; independent of cleanup worker progress.</summary>
public sealed record ReleasedDeliverableRetentionDecision(
    bool IsDownloadAvailable, bool ShowUndownloadedWarning,
    DateTime? GraceActivatedAtUtc, DateTime? DownloadAccessClosedAtUtc,
    DateTime DeletionDueAtUtc)
{
    public static ReleasedDeliverableRetentionDecision Evaluate(
        ReleasedDeliverableRetentionSnapshot snapshot,
        IReadOnlyCollection<DateTime?> firstSuccessfulFileDownloads, DateTime utcNow)
    {
        ArgumentNullException.ThrowIfNull(snapshot);
        if (utcNow.Kind != DateTimeKind.Utc
            || firstSuccessfulFileDownloads.Any(value => value.HasValue && value.Value.Kind != DateTimeKind.Utc))
            throw new ArgumentException("Retention evidence and evaluation must use UTC.");
        var allDownloaded = firstSuccessfulFileDownloads.Count > 0
            && firstSuccessfulFileDownloads.All(value => value.HasValue && value.Value <= utcNow);
        var completedBeforeStandard = allDownloaded
            && firstSuccessfulFileDownloads.All(value => value!.Value < snapshot.StandardDeletionAtUtc);
        // A late completion, including a pre-deadline lease, never cancels grace.
        var grace = snapshot.GraceActivatedAtUtc
            ?? (!snapshot.StandardCheckpointAtUtc.HasValue && utcNow >= snapshot.StandardDeletionAtUtc && !completedBeforeStandard
                ? snapshot.StandardDeletionAtUtc : (DateTime?)null);
        var due = grace.HasValue ? snapshot.PotentialFinalDeletionAtUtc : snapshot.StandardDeletionAtUtc;
        var closed = snapshot.DownloadAccessClosedAtUtc ?? (utcNow >= due ? due : (DateTime?)null);
        return new(!closed.HasValue && !snapshot.ByteDeletedAtUtc.HasValue,
            utcNow >= snapshot.WarningAtUtc && utcNow < snapshot.StandardDeletionAtUtc
                && !allDownloaded && !closed.HasValue && !snapshot.ByteDeletedAtUtc.HasValue,
            grace, closed, due);
    }
}
