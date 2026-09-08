namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record KitUnitDto(Guid Id, string Label, Guid OrderLineId, string Status, DateTime? ShippedAt,
    DateTime? ExpiresAt, string? LotBatchNumber, string? Carrier, string? TrackingNumber,
    Guid? ReplacesKitUnitId, Guid? ReplacedByKitUnitId, long Version);
public sealed record KitCaseEventDto(Guid Id, string EventType, DateTime At, string Reason);
public sealed record KitAssemblyCaseDto(Guid Id, string CaseNumber, Guid OriginalKitUnitId, Guid CurrentKitUnitId,
    string Status, DateTime? SubmissionDeadlineAt, string DeadlineBasis, Guid? AssemblyRequestId,
    string? AssemblyRequestNumber, string? AssemblyRequestStatus, AssemblyProfileDto Profile, long Version,
    bool CanPrepare, bool CanExtend, bool CanReplace, bool CanCancel, IReadOnlyList<KitCaseEventDto> History);
public sealed record KitAssemblyStartRequest(long Version, string ProjectReference, string MetadataJson,
    string RequestedOutput, string? ProcessingNotes, bool ProhibitedDataConfirmed);
public sealed record KitCaseExtensionRequest(long Version, DateTime SubmissionDeadlineAt, string Reason);
public sealed record KitCaseCancelRequest(long Version, string Reason);
public sealed record KitReplacementRequest(long Version, string Reason, string LotBatchNumber, DateTime? ExpiresAt,
    DateTime ShippedAt, string Carrier, string TrackingNumber);
