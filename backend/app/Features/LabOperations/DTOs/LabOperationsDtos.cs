namespace PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed record LabRoleAssignmentDto(
    Guid Id, Guid UserId, string UserName, string Email, string Role, bool IsActive, long Version);

public sealed record LabWorkOrderSummaryDto(
    Guid Id, Guid AuthorizationId, Guid? CommercialOrderId, string? CommercialOrderNumber,
    Guid SubmittingOrganizationId, string ServiceKey, string Status, int SpecimenCount,
    int OpenExceptionCount, DateTime UpdatedAt, long Version);

public sealed record LabProtocolDto(
    Guid Id, string Key, string Name, string? Description, int LatestVersion,
    IReadOnlyList<LabProtocolVersionDto> Versions, long Version);

public sealed record LabProtocolVersionDto(
    Guid Id, int ProtocolVersion, string Status, string DefinitionJson,
    Guid AuthoredByUserId, DateTime AuthoredAtUtc, Guid? ApprovedByUserId, DateTime? ApprovedAtUtc);

public sealed record LabMaterialLotDto(
    Guid Id, string Kind, string MaterialKey, string Name, string LotNumber,
    string? Supplier, DateTime? ExpiresAtUtc, string StorageLocation,
    decimal AvailableQuantity, string QuantityUnit, string QcDisposition, long Version);

public sealed record LabEquipmentDto(
    Guid Id, string AssetCode, string Name, string EquipmentType, string Location,
    string Status, DateTime? LastCalibrationAtUtc, DateTime? CalibrationDueAtUtc, long Version);

public sealed record LabBatchDto(
    Guid Id, string BatchNumber, string BatchType, string Status, string? Notes,
    int MemberCount, Guid? SendoutId, string? SendoutStatus, long? SendoutVersion, long Version);

public sealed record LabOperationsDashboardDto(
    IReadOnlyList<LabWorkOrderSummaryDto> WorkOrders,
    IReadOnlyList<LabProtocolDto> Protocols,
    IReadOnlyList<LabMaterialLotDto> MaterialLots,
    IReadOnlyList<LabEquipmentDto> Equipment,
    IReadOnlyList<LabBatchDto> Batches,
    IReadOnlyList<LabRoleAssignmentDto> RoleAssignments);

public sealed record LabSpecimenDto(
    Guid Id, Guid SubmittedSpecimenId, string? AccessionNumber, DateTime? ReceivedAtUtc,
    string IntakeDisposition, string? ReceiptCondition, string? IntakeReasonCode,
    string? CurrentLocation, long Version);

public sealed record LabContainerDto(
    Guid Id, Guid? LabSpecimenId, Guid? ParentContainerId, string Kind, string Barcode,
    string Label, int LabelPrintCount, string Location, decimal? Quantity,
    string? QuantityUnit, string Status, DateTime? RetainUntilUtc, long Version);

public sealed record LabExecutionDto(
    Guid Id, Guid? LabSpecimenId, Guid LabProtocolVersionId, Guid? AssignedToUserId,
    string Status, string CapturedResultsJson, string? DeviationNote,
    DateTime? StartedAtUtc, DateTime? CompletedAtUtc, long Version);

public sealed record LabLibraryDto(
    Guid Id, Guid LabSpecimenId, Guid SourceContainerId, Guid LibraryContainerId,
    Guid PreparationExecutionId, string LibraryKey, string Status,
    string? QcResultsJson, long Version);

public sealed record LabExceptionDto(
    Guid Id, Guid? LabSpecimenId, Guid? LabProtocolExecutionId, string Audience,
    string CategoryCode, string Title, string InternalDescription,
    string? CustomerSafeSummary, bool IsBlocking, string Status,
    DateTime? ResponseDueAtUtc, DateTime? ResolvedAtUtc, long Version);

public sealed record LabWorkOrderDetailDto(
    LabWorkOrderSummaryDto WorkOrder,
    IReadOnlyList<LabSpecimenDto> Specimens,
    IReadOnlyList<LabContainerDto> Containers,
    IReadOnlyList<LabExecutionDto> Executions,
    IReadOnlyList<LabLibraryDto> Libraries,
    IReadOnlyList<LabExceptionDto> Exceptions,
    IReadOnlyList<LabScientificApprovalDto> ScientificApprovals);

public sealed record LabScientificApprovalDto(
    Guid Id, int ApprovalVersion, string ReleaseDefinitionKey,
    int ReleaseDefinitionVersion, Guid ApprovedByUserId, DateTime ApprovedAtUtc,
    long ProjectionVersion);

public sealed record SetLabRoleRequest(bool IsActive, long? Version);
public sealed record CreateProtocolRequest(string Key, string Name, string? Description);
public sealed record CreateProtocolVersionRequest(string DefinitionJson, long ProtocolVersion);
public sealed record ProtocolTransitionRequest(string Action);
public sealed record WorkMilestoneRequest(string Status, long Version);
public sealed record SpecimenReceiptRequest(DateTime ReceivedAtUtc, string? ReceiptCondition, string? CurrentLocation, long Version);
public sealed record SpecimenAccessionRequest(string AccessionNumber, string Barcode, string Label, string Location,
    decimal? Quantity, string? QuantityUnit, DateTime? RetainUntilUtc, long Version);
public sealed record SpecimenDispositionRequest(string Disposition, string? ReasonCode, long Version);
public sealed record CreateContainerRequest(Guid? LabSpecimenId, Guid? ParentContainerId, string Kind,
    string Barcode, string Label, string Location, decimal? Quantity, string? QuantityUnit, DateTime? RetainUntilUtc);
public sealed record CreateExecutionRequest(Guid? LabSpecimenId, Guid LabProtocolVersionId, Guid? AssignedToUserId);
public sealed record ExecutionTransitionRequest(string Action, string? CapturedResultsJson, string? DeviationNote, long Version);
public sealed record CreateMaterialLotRequest(string Kind, string MaterialKey, string Name, string LotNumber,
    string? Supplier, string? ComponentsJson, DateTime? ExpiresAtUtc, string StorageLocation,
    decimal AvailableQuantity, string QuantityUnit);
public sealed record MaterialQcRequest(string Disposition, string ResultsJson, long Version);
public sealed record ConsumeMaterialRequest(Guid LabMaterialLotId, Guid? OutputContainerId,
    decimal Quantity, string QuantityUnit, long LotVersion);
public sealed record CreateEquipmentRequest(string AssetCode, string Name, string EquipmentType,
    string Location, DateTime? LastCalibrationAtUtc, DateTime? CalibrationDueAtUtc);
public sealed record RecordEquipmentUsageRequest(Guid LabEquipmentId, DateTime UsedAtUtc, string? RunReference);
public sealed record CreateLibraryRequest(Guid LabSpecimenId, Guid SourceContainerId,
    Guid LibraryContainerId, Guid PreparationExecutionId, string LibraryKey);
public sealed record LibraryQcRequest(bool Passed, string ResultsJson, long Version);
public sealed record CreateBatchRequest(string BatchNumber, string BatchType, string? Notes);
public sealed record BatchTransitionRequest(string Action, long Version);
public sealed record AddBatchMemberRequest(Guid LabWorkOrderId, Guid LabLibraryId);
public sealed record CreateSendoutRequest(string ProviderName, string? ProviderReference,
    string ManifestJson, DateTime? ExpectedCompletionAtUtc);
public sealed record SendoutTransitionRequest(string Status, long Version);
public sealed record CustodyEventRequest(Guid? LabContainerId, string EventCode,
    string LocationOrParty, string DetailsJson);
public sealed record CreateExceptionRequest(Guid? LabSpecimenId, Guid? LabProtocolExecutionId,
    string Audience, string CategoryCode, string Title, string InternalDescription,
    string? CustomerSafeSummary, bool IsBlocking, DateTime? ResponseDueAtUtc);
public sealed record ResolveExceptionRequest(string ResolutionNote, long Version);
public sealed record ScientificApprovalRequest(string ReleaseDefinitionKey,
    int ReleaseDefinitionVersion, string? PermittedQcProjectionJson, long WorkOrderVersion);
