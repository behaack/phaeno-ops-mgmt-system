namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CommercialSaleSummary : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string WorkflowType { get; private set; } = null!;
    public Guid OrderId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid? OpportunityId { get; private set; }
    public string ProductSummary { get; private set; } = null!;
    public decimal Quantity { get; private set; }
    public decimal Total { get; private set; }
    public string Currency { get; private set; } = null!;
    public DateTime CommittedAtUtc { get; private set; }
    public Guid CommitmentActorUserId { get; private set; }
    public DateTime? ExpectedCompletionAtUtc { get; private set; }
    public string ScheduleHealth { get; private set; } = "OnTrack";
    public int Revision { get; private set; } = 1;
    public int ProjectedRevision { get; private set; }
    public Guid? ProjectedActivityId { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTime NextAttemptAtUtc { get; private set; } = DateTime.UtcNow;
    public string? FailureCode { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    private CommercialSaleSummary() { }
    public CommercialSaleSummary(string workflowType, Guid orderId, Guid organizationId, Guid? opportunityId,
        string productSummary, decimal quantity, decimal total, string currency, DateTime committedAt, Guid actorUserId)
    {
        if (workflowType is not (OrderWorkflowTypes.LabService or OrderWorkflowTypes.Reagent)
            || orderId == Guid.Empty || organizationId == Guid.Empty || actorUserId == Guid.Empty || quantity <= 0 || total < 0)
            throw new ArgumentException("A committed commercial order and valid total are required.");
        WorkflowType = workflowType; OrderId = orderId; OrganizationId = organizationId; OpportunityId = opportunityId;
        ProductSummary = OrderText.Required(productSummary, "Product summary", 500);
        Quantity = quantity; Total = total; Currency = OrderText.Required(currency, "Currency", 3).ToUpperInvariant();
        CommittedAtUtc = committedAt.ToUniversalTime(); CommitmentActorUserId = actorUserId;
    }
    public void SetSchedule(DateTime? expectedAt, string health, DateTime now)
    {
        if (health is not ("OnTrack" or "AtRisk" or "Delayed" or "Complete")) throw new ArgumentException("Invalid schedule health.");
        if (ExpectedCompletionAtUtc == expectedAt && ScheduleHealth == health) return;
        ExpectedCompletionAtUtc = expectedAt; ScheduleHealth = health; Revision++; AttemptCount = 0; FailureCode = null; NextAttemptAtUtc = now;
    }
    public void Projected(Guid activityId) { ProjectedActivityId = activityId; ProjectedRevision = Revision; AttemptCount = 0; FailureCode = null; }
    public string CurrentScheduleHealth(DateTime now) => ScheduleHealth != "Complete" && ExpectedCompletionAtUtc < now ? "Delayed" : ScheduleHealth;
    public void Failed(string safeCode, DateTime now) { FailureCode = OrderText.Required(safeCode, "Failure code", 100); AttemptCount++; NextAttemptAtUtc = now.AddMinutes(Math.Min(60, 1 << Math.Min(AttemptCount, 5))); }
    public void Retry(DateTime now) { if (ProjectedRevision == Revision) throw new InvalidOperationException("This summary is already published."); AttemptCount = 0; FailureCode = null; NextAttemptAtUtc = now; }
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}
