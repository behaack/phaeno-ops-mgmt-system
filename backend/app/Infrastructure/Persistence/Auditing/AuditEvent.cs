namespace PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public sealed class AuditEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string EntityName { get; private set; } = null!;
    public string EntityId { get; private set; } = null!;
    public string Operation { get; private set; } = null!;
    public Guid? OrganizationId { get; private set; }
    public Guid? ActorUserId { get; private set; }
    public string? RequestId { get; private set; }
    public DateTime OccurredAt { get; private set; }
    public string ChangesJson { get; private set; } = "{}";

    private AuditEvent()
    {
    }

    public AuditEvent(
        string entityName,
        string entityId,
        string operation,
        Guid? organizationId,
        Guid? actorUserId,
        string? requestId,
        DateTime occurredAt,
        string changesJson)
    {
        EntityName = entityName;
        EntityId = entityId;
        Operation = operation;
        OrganizationId = organizationId;
        ActorUserId = actorUserId;
        RequestId = requestId;
        OccurredAt = occurredAt;
        ChangesJson = changesJson;
    }
}
