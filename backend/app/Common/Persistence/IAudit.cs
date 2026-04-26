namespace PhaenoPortal.App.Common.Persistence;

public interface IAudit
{
    DateTime CreatedAt { get; }
    Guid? CreatedByUserId { get; }
    DateTime UpdatedAt { get; }
    Guid? UpdatedByUserId { get; }

    void MarkCreated(DateTime utcNow, Guid? actorUserId);
    void MarkUpdated(DateTime utcNow, Guid? actorUserId);
}
