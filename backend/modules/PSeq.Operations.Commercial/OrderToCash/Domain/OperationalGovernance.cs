namespace PSeq.Operations.Commercial.OrderToCash.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum AttentionItemStatus { Open = 1, InProgress = 2, Resolved = 3 }

public sealed class AttentionItem : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Category { get; private set; } = null!;
    public string SourceType { get; private set; } = null!;
    public Guid SourceId { get; private set; }
    public Guid? OrganizationId { get; private set; }
    public string OwnerRole { get; private set; } = null!;
    public AttentionItemStatus Status { get; private set; } = AttentionItemStatus.Open;
    public int AttemptCount { get; private set; }
    public string NextAction { get; private set; } = null!;
    public string? LastError { get; private set; }
    public DateTime FirstObservedAtUtc { get; private set; }
    public DateTime LastObservedAtUtc { get; private set; }
    public DateTime? ResolvedAtUtc { get; private set; }
    public Guid? ResolvedByUserId { get; private set; }
    public string? Resolution { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    private AttentionItem() { }
    public AttentionItem(string category, string sourceType, Guid sourceId, Guid? organizationId,
        string ownerRole, string nextAction, string? lastError, DateTime utcNow)
    {
        Category = ResultText.Required(category, nameof(category), 100); SourceType = ResultText.Required(sourceType, nameof(sourceType), 100);
        SourceId = sourceId != Guid.Empty ? sourceId : throw new ArgumentException("A source is required.", nameof(sourceId));
        OrganizationId = organizationId; OwnerRole = ResultText.Required(ownerRole, nameof(ownerRole), 100);
        NextAction = ResultText.Required(nextAction, nameof(nextAction), 1000); LastError = ResultText.Optional(lastError, 2000);
        FirstObservedAtUtc = utcNow; LastObservedAtUtc = utcNow; AttemptCount = 1;
    }
    public void Observe(string nextAction, string? lastError, DateTime utcNow)
    {
        if (Status == AttentionItemStatus.Resolved) Status = AttentionItemStatus.Open;
        AttemptCount++; NextAction = ResultText.Required(nextAction, nameof(nextAction), 1000);
        LastError = ResultText.Optional(lastError, 2000); LastObservedAtUtc = utcNow;
    }
    public void Start() { if (Status == AttentionItemStatus.Resolved) throw new InvalidOperationException("The attention item is resolved."); Status = AttentionItemStatus.InProgress; }
    public void Resolve(Guid actorUserId, DateTime utcNow, string resolution)
    {
        Status = AttentionItemStatus.Resolved; ResolvedByUserId = actorUserId; ResolvedAtUtc = utcNow;
        Resolution = ResultText.Required(resolution, nameof(resolution), 2000);
    }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public enum DualControlMode { Disabled = 1, AuditOnly = 2, Enforced = 3 }

public sealed class DualControlObservation
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string ControlCode { get; private set; } = null!;
    public string WorkflowType { get; private set; } = null!;
    public Guid WorkflowId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public string ConflictingActorIdsJson { get; private set; } = "[]";
    public DualControlMode Mode { get; private set; }
    public bool WasBlocked { get; private set; }
    public DateTime ObservedAtUtc { get; private set; }
    private DualControlObservation() { }
    public DualControlObservation(string controlCode, string workflowType, Guid workflowId,
        Guid actorUserId, IEnumerable<Guid> conflictingActorIds, DualControlMode mode, DateTime utcNow)
    {
        ControlCode = ResultText.Required(controlCode, nameof(controlCode), 100);
        WorkflowType = ResultText.Required(workflowType, nameof(workflowType), 100);
        WorkflowId = workflowId; ActorUserId = actorUserId;
        ConflictingActorIdsJson = System.Text.Json.JsonSerializer.Serialize(conflictingActorIds.Distinct().Order().ToArray());
        Mode = mode; WasBlocked = mode == DualControlMode.Enforced; ObservedAtUtc = utcNow;
    }
}
