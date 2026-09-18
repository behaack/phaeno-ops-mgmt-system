namespace PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed record LabStepDto(Guid Id, string Key, string Name, string? Description, int LatestVersion,
    long Version, DateTime? RetiredAtUtc, string? RetirementReason, IReadOnlyList<LabStepVersionDto> Versions,
    IReadOnlyList<LabStepUsageDto> UsedBy);
public sealed record LabStepVersionDto(Guid Id, int StepVersion, string Status, string DefinitionJson,
    Guid AuthoredByUserId, DateTime AuthoredAtUtc, Guid? ApprovedByUserId, DateTime? ApprovedAtUtc, string? ApprovalOverrideReason);
public sealed record LabStepUsageDto(Guid ProtocolId, string ProtocolName, Guid ProtocolVersionId, int ProtocolVersion,
    string Status, string OccurrenceKey, Guid StepVersionId);
public sealed record SaveLabStepVersionRequest(string DefinitionJson, long Version, Guid? DraftId = null);
public sealed record LabStepTransitionRequest(string Action, long Version, Guid? VersionId = null,
    string? Reason = null, string? ApprovalOverrideReason = null);
