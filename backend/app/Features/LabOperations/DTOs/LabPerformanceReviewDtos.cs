namespace PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed record ProposeLabPerformanceRequest(Guid RequestId, Guid ExecutionId, Guid StepRecordId,
    Guid PerformedByUserId, string PerformedAt, string Reason, Guid? BasedOnProposalId = null,
    PSeq.Operations.Laboratory.Domain.LabStepIntervalInput? Interval = null,
    IReadOnlyList<PSeq.Operations.Laboratory.Domain.LabStepParticipant>? Participants = null);
public sealed record DecideLabPerformanceRequest(bool Approved, string Reason);
