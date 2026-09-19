namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;

public sealed class LabPerformanceProposal
{
    public Guid Id { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid LabProtocolExecutionId { get; private set; }
    public Guid StepRecordId { get; private set; }
    public Guid? BasedOnProposalId { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public DateTime RequestedAtUtc { get; private set; }
    public string Kind { get; private set; } = null!;
    public string Reason { get; private set; } = null!;
    public string PerformanceJson { get; private set; } = null!;
    public string OriginalPerformanceJson { get; private set; } = null!;
    private LabPerformanceProposal() { }
    public LabPerformanceProposal(Guid id, Guid workId, Guid specimenId, Guid executionId, Guid recordId,
        Guid? basedOn, Guid actorId, DateTime now, string kind, string reason, LabStepPerformance performance, LabStepPerformance? original)
    {
        if (new[] { id, workId, specimenId, executionId, recordId, actorId, performance.PerformedByUserId }.Contains(Guid.Empty)
            || basedOn == Guid.Empty || now.Kind != DateTimeKind.Utc || performance.PerformedAtUtc.Kind != DateTimeKind.Utc
            || performance.PerformedAtUtc > now || kind is not ("OnBehalf" or "Amendment"))
            throw new ArgumentException("Valid source identities, UTC times and performance proposal type are required.");
        Id = id; LabWorkOrderId = workId; LabSpecimenId = specimenId; LabProtocolExecutionId = executionId; StepRecordId = recordId;
        BasedOnProposalId = basedOn; RequestedByUserId = actorId; RequestedAtUtc = now; Kind = kind;
        Reason = LabLineageText.Required(reason, 4000);
        PerformanceJson = JsonSerializer.Serialize(performance with { VerificationStatus = "PendingReview" }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        OriginalPerformanceJson = JsonSerializer.Serialize(original, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }
}

public sealed class LabPerformanceDecision
{
    public Guid Id { get; private set; }
    public Guid ReviewedByUserId { get; private set; }
    public DateTime ReviewedAtUtc { get; private set; }
    public bool Approved { get; private set; }
    public string Reason { get; private set; } = null!;
    private LabPerformanceDecision() { }
    public LabPerformanceDecision(LabPerformanceProposal proposal, Guid reviewerId, DateTime now, bool approved, string reason)
    {
        if (reviewerId == Guid.Empty || reviewerId == proposal.RequestedByUserId)
            throw new ArgumentException("A different supervisor must review this performance entry.");
        if (now.Kind != DateTimeKind.Utc || now < proposal.RequestedAtUtc) throw new ArgumentException("Review time must follow the proposal.");
        Id = proposal.Id; ReviewedByUserId = reviewerId; ReviewedAtUtc = now; Approved = approved; Reason = LabLineageText.Required(reason, 4000);
    }
}
