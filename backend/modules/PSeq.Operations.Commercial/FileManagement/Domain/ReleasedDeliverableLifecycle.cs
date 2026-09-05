namespace PSeq.Operations.Commercial.FileManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum ReleasedDeliverableHoldKind { Preservation = 1, Quarantine = 2 }

public sealed class ReleasedDeliverablePreservationHold : IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RetentionSnapshotId { get; private set; }
    public ReleasedDeliverableHoldKind Kind { get; private set; }
    public Guid PlacedByUserId { get; private set; }
    public DateTime PlacedAtUtc { get; private set; }
    public string Reason { get; private set; } = null!;
    public Guid? ReleasedByUserId { get; private set; }
    public DateTime? ReleasedAtUtc { get; private set; }
    public string? ReleaseReason { get; private set; }
    public long Version { get; private set; } = 1;
    private ReleasedDeliverablePreservationHold() { }
    public ReleasedDeliverablePreservationHold(Guid snapshotId, ReleasedDeliverableHoldKind kind, Guid actor, string reason, DateTime now)
    {
        if (snapshotId == Guid.Empty || actor == Guid.Empty || !Enum.IsDefined(kind) || now.Kind != DateTimeKind.Utc)
            throw new ArgumentException("A retained package, hold kind, actor and UTC time are required.");
        RetentionSnapshotId = snapshotId; Kind = kind; PlacedByUserId = actor; PlacedAtUtc = now;
        Reason = ReleasedDeliverablePolicyDefault.NormalizeReason(reason);
    }
    public void Release(Guid actor, string reason, DateTime now)
    {
        if (ReleasedAtUtc.HasValue || actor == Guid.Empty || now.Kind != DateTimeKind.Utc || now < PlacedAtUtc)
            throw new InvalidOperationException("An active hold and valid release actor/time are required.");
        ReleaseReason = ReleasedDeliverablePolicyDefault.NormalizeReason(reason);
        ReleasedByUserId = actor; ReleasedAtUtc = now;
    }
    public void IncrementVersion() => Version++;
}

public sealed class ReleasedDeliverableReissue
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OriginalSnapshotId { get; private set; }
    public Guid ReplacementSnapshotId { get; private set; }
    public Guid AuthorizedByUserId { get; private set; }
    public DateTime AuthorizedAtUtc { get; private set; }
    public string Reason { get; private set; } = null!;
    private ReleasedDeliverableReissue() { }
    public ReleasedDeliverableReissue(Guid original, Guid replacement, Guid actor, string reason, DateTime now)
    {
        if (original == Guid.Empty || replacement == Guid.Empty || original == replacement || actor == Guid.Empty || now.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Distinct retained packages, an actor and UTC time are required.");
        OriginalSnapshotId = original; ReplacementSnapshotId = replacement; AuthorizedByUserId = actor; AuthorizedAtUtc = now;
        Reason = ReleasedDeliverablePolicyDefault.NormalizeReason(reason);
    }
}
