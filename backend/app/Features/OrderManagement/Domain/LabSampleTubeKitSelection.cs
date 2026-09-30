namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>A physical kit scanned and fixed to a Customer's draft sample preparation.</summary>
public sealed class LabSampleTubeKitSelection : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabServiceOrderId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public Guid StockKitId { get; private set; }
    public DateTime? FinishedAt { get; private set; }
    public Guid? FinishedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private LabSampleTubeKitSelection() { }

    public LabSampleTubeKitSelection(Guid orderId, Guid organizationId, Guid departmentId, Guid stockKitId)
    {
        if (new[] { orderId, organizationId, departmentId, stockKitId }.Any(id => id == Guid.Empty))
            throw new ArgumentException("Scan a registered physical kit for this Job.");
        LabServiceOrderId = orderId;
        OrganizationId = organizationId;
        DepartmentId = departmentId;
        StockKitId = stockKitId;
    }

    public void Finish(Guid actorUserId, DateTime utcNow)
    {
        if (actorUserId == Guid.Empty || utcNow.Kind != DateTimeKind.Utc || FinishedAt.HasValue)
            throw new InvalidOperationException("Choose an unfinished kit and a valid actor to finish sample entry.");
        FinishedAt = utcNow;
        FinishedByUserId = actorUserId;
    }

    public void ReopenForCorrection()
    {
        FinishedAt = null;
        FinishedByUserId = null;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
