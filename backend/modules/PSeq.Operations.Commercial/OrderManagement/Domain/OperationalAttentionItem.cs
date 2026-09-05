namespace PSeq.Operations.Commercial.OrderManagement.Domain;

public enum OperationalAttentionCategory
{
    InvitationFailure,
    ReadinessBlocker,
    StagedOrderAwaitingAdminOrApproval,
    ProjectionOrScanningFailure,
    ScientificallyApprovedUnreleased,
    OverdueInvoice,
    UnappliedCash,
    ReconciliationDifference,
    RetentionNoticeFailure
}

public enum OperationalAttentionStatus
{
    Open,
    InProgress,
    Resolved
}

public sealed class OperationalAttentionItem : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public OperationalAttentionCategory Category { get; private set; }
    public Guid? OrganizationId { get; private set; }
    public string SourceType { get; private set; } = null!;
    public Guid SourceId { get; private set; }
    public OperationalAttentionStatus Status { get; private set; } = OperationalAttentionStatus.Open;
    public Guid? OwnerUserId { get; private set; }
    public int AttemptCount { get; private set; }
    public string Summary { get; private set; } = null!;
    public string NextAction { get; private set; } = null!;
    public string? Resolution { get; private set; }
    public Guid? ResolvedByUserId { get; private set; }
    public DateTime? ResolvedAtUtc { get; private set; }

    private OperationalAttentionItem() { }

    public OperationalAttentionItem(OperationalAttentionCategory category,
        Guid? organizationId, string sourceType, Guid sourceId, int attemptCount,
        string summary, string nextAction)
    {
        if (sourceId == Guid.Empty || attemptCount < 0) throw new ArgumentOutOfRangeException(nameof(sourceId));
        Category = category;
        OrganizationId = organizationId;
        SourceType = Required(sourceType, nameof(sourceType), 100);
        SourceId = sourceId;
        AttemptCount = attemptCount;
        Summary = Required(summary, nameof(summary), 1000);
        NextAction = Required(nextAction, nameof(nextAction), 2000);
    }

    public void Refresh(int attemptCount, string summary, string nextAction)
    {
        if (Status == OperationalAttentionStatus.Resolved) return;
        AttemptCount = Math.Max(AttemptCount, attemptCount);
        Summary = Required(summary, nameof(summary), 1000);
        NextAction = Required(nextAction, nameof(nextAction), 2000);
    }

    public void ReopenRetentionFailure(int attemptCount, string summary, string nextAction)
    {
        if (Category != OperationalAttentionCategory.RetentionNoticeFailure)
            throw new InvalidOperationException("Only a retention delivery failure can be reopened by this workflow.");
        Status = OperationalAttentionStatus.Open;
        Resolution = null;
        ResolvedByUserId = null;
        ResolvedAtUtc = null;
        Refresh(attemptCount, summary, nextAction);
    }

    public void Assign(Guid? ownerUserId)
    {
        if (Status == OperationalAttentionStatus.Resolved)
            throw new InvalidOperationException("A resolved attention item cannot be reassigned.");
        OwnerUserId = ownerUserId;
        Status = ownerUserId.HasValue ? OperationalAttentionStatus.InProgress : OperationalAttentionStatus.Open;
    }

    public void Resolve(Guid actorUserId, DateTime utcNow, string resolution)
    {
        if (Status == OperationalAttentionStatus.Resolved)
            throw new InvalidOperationException("The attention item is already resolved.");
        Status = OperationalAttentionStatus.Resolved;
        Resolution = Required(resolution, nameof(resolution), 2000);
        ResolvedByUserId = actorUserId != Guid.Empty ? actorUserId : throw new ArgumentException("An actor is required.");
        ResolvedAtUtc = utcNow;
    }
}
