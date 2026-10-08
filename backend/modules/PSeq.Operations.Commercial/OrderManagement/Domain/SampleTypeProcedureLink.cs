namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// A family-level relationship. Anchor IDs are the first revisions of their respective
/// families; changing this link never creates or alters a content revision.
/// </summary>
public sealed class SampleTypeProcedureLink : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SampleTypeAnchorId { get; private set; }
    public Guid ProcedureAnchorId { get; private set; }
    public DateTime ChangedAt { get; private set; }
    public Guid ChangedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private SampleTypeProcedureLink() { }

    public SampleTypeProcedureLink(Guid sampleTypeAnchorId, Guid procedureAnchorId,
        Guid actorUserId, DateTime utcNow)
    {
        if (sampleTypeAnchorId == Guid.Empty || procedureAnchorId == Guid.Empty || actorUserId == Guid.Empty)
            throw new ArgumentException("Choose a Sample type, shipping procedure, and actor.");
        if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("Use a UTC change time.");
        SampleTypeAnchorId = sampleTypeAnchorId;
        ChangeProcedure(procedureAnchorId, actorUserId, utcNow);
    }

    public void ChangeProcedure(Guid procedureAnchorId, Guid actorUserId, DateTime utcNow)
    {
        if (procedureAnchorId == Guid.Empty || actorUserId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Choose an available procedure and record the actor and UTC time.");
        if (ProcedureAnchorId == procedureAnchorId) return;
        ProcedureAnchorId = procedureAnchorId;
        ChangedByUserId = actorUserId;
        ChangedAt = utcNow;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
