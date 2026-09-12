namespace PhaenoPortal.App.Features.LabOperations.DTOs;

using PSeq.Operations.Laboratory.Domain;

public sealed record LabAttemptCommand(Guid RequestId, long WorkOrderVersion, string Action,
    Guid? SpecimenId = null, Guid? AttemptId = null, long? AttemptVersion = null,
    Guid? SourceContainerId = null, string? Barcode = null, Guid? StageId = null,
    string? ReasonCode = null, string? Note = null, string? NextAction = null,
    Guid? FailedExecutionId = null, bool ConfirmMaterialExhausted = false, bool ConfirmPolicy = false);
public sealed record LabAttemptDto(Guid Id, Guid SpecimenId, int Sequence, Guid? PreviousAttemptId,
    Guid SourceContainerId, string SourceBarcode, string State, long Version,
    DateTime? StartedAtUtc, DateTime? ClosedAtUtc, string? FailureReasonCode, string? FailureEvidence,
    Guid? FailedExecutionId, string? HoldReason, string? NextAction, Guid? OwnerUserId,
    IReadOnlyList<LabAttemptStageSkip> StageSkips, IReadOnlyList<Guid> ExecutionIds, Guid? PreparationBatchId = null);
public sealed record LabAttemptTubeDto(Guid Id, string Barcode, string? Location, string? IntakeDisposition,
    string PhysicalStatus, string Use, string? UnavailableReason);
public sealed record LabAttemptSpecimenDto(Guid Id, string Name, string? AccessionNumber,
    string IntakeDisposition, string ProcessingState, string? ReasonCode, string? Note,
    string? NextAction, int ExpectedTubes, int ReceivedTubes, int EligibleTubes,
    IReadOnlyList<LabAttemptTubeDto> Tubes, IReadOnlyList<LabAttemptDto> Attempts, string? Blocker);
public sealed record LabAttemptStageDto(Guid Id, int Sequence, string Name, string Requirement, Guid ProtocolVersionId);
public sealed record LabAttemptWorkspaceDto(Guid WorkOrderId, string JobName, long WorkOrderVersion,
    string? PolicyKey, string? WorkflowName, int? WorkflowVersion, bool CanOperate, bool CanAdoptPolicy,
    IReadOnlyList<LabAttemptStageDto> Stages, IReadOnlyList<LabAttemptSpecimenDto> Specimens);
