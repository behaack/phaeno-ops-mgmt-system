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

public sealed record LabMaterialDefinitionDto(
    Guid Id, string Key, string Name, string Kind, bool IsActive);

public sealed record LabSupplierDto(Guid Id, string Name, bool IsActive);

public sealed record LabStorageLocationDto(Guid Id, string Name, bool IsActive);

public sealed record LabPreparedReagentComponentDto(
    Guid Id, Guid ComponentMaterialLotId, string MaterialKey, string MaterialName,
    string LotNumber, decimal Quantity, string QuantityUnit);

public sealed record LabMaterialLotDto(
    Guid Id, string Kind, Guid MaterialDefinitionId, string MaterialKey, string Name,
    string LotNumber, Guid? SupplierId, string? Supplier,
    DateOnly? ExpirationOrRetestDate, Guid StorageLocationId, string StorageLocation,
    decimal AvailableQuantity, string QuantityUnit, string QcDisposition,
    DateOnly? QcPerformedOn, string? QcFailureReason,
    IReadOnlyList<LabPreparedReagentComponentDto> Components, long Version);

public sealed record LabEquipmentDto(
    Guid Id, string AssetCode, string Name, string EquipmentType, string Location,
    string Status, DateOnly? LastCalibrationOn, DateOnly? CalibrationDueOn, long Version);

public sealed record LabBatchDto(
    Guid Id, string BatchNumber, string Name, string BatchType, string Status,
    DateTime? StartedAtUtc, DateTime? CompletedAtUtc, string? Notes,
    int MemberCount, Guid? SendoutId, string? SendoutStatus, long? SendoutVersion, long Version);

public sealed record LabOperationsDashboardDto(
    IReadOnlyList<LabWorkOrderSummaryDto> WorkOrders,
    IReadOnlyList<LabProtocolDto> Protocols,
    IReadOnlyList<LabMaterialLotDto> MaterialLots,
    IReadOnlyList<LabMaterialDefinitionDto> MaterialDefinitions,
    IReadOnlyList<LabSupplierDto> Suppliers,
    IReadOnlyList<LabStorageLocationDto> StorageLocations,
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

public sealed record LabContainerScanDto(
    Guid LabWorkOrderId, string? CommercialOrderNumber, string? AccessionNumber,
    string? ParentBarcode, Guid? LabLibraryId, string? LibraryStatus,
    LabContainerDto Container);

public sealed record LabLabelPrintEventDto(
    Guid Id, Guid LabContainerId, string Outcome, string Reason,
    string? FailureDetails, int? PrintNumber, Guid? ActorUserId,
    DateTime OccurredAtUtc);

public sealed record LabContainerLabelDto(
    Guid LabWorkOrderId, string? CommercialOrderNumber, string? AccessionNumber,
    string? ParentBarcode, LabContainerDto Container,
    IReadOnlyList<LabLabelPrintEventDto> PrintHistory);

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
public sealed record CreateProtocolRequest(string Name, string? Description);
public sealed record CreateProtocolVersionRequest(string DefinitionJson, long ProtocolVersion);
public sealed record UpdateProtocolVersionRequest(string DefinitionJson, long ProtocolVersion);
public sealed record ProtocolTransitionRequest(string Action, long ProtocolVersion);
public sealed record WorkMilestoneRequest(string Status, long Version);
public sealed record SpecimenReceiptRequest(DateTime ReceivedAtUtc, string? ReceiptCondition, string? CurrentLocation, long Version);
public sealed record SpecimenAccessionRequest(string AccessionNumber, string Label, string Location,
    decimal? Quantity, string? QuantityUnit, DateTime? RetainUntilUtc, long Version);
public sealed record SpecimenDispositionRequest(string Disposition, string? ReasonCode, long Version);
public sealed record CreateContainerRequest(Guid? LabSpecimenId, Guid? ParentContainerId, string Kind,
    string Label, string Location, decimal? Quantity, string? QuantityUnit, DateTime? RetainUntilUtc);
public sealed record RecordLabelPrintRequest(string Reason, string Outcome, string? FailureDetails);
public sealed record CreateExecutionRequest(Guid? LabSpecimenId, Guid LabProtocolVersionId, Guid? AssignedToUserId);
public sealed record ExecutionTransitionRequest(string Action, string? CapturedResultsJson, string? DeviationNote, long Version);
public sealed record CreatePreparedReagentComponentRequest(
    Guid ComponentMaterialLotId, decimal Quantity, string QuantityUnit);
public sealed record CreateMaterialLotRequest(
    string Kind, Guid? MaterialDefinitionId, string? NewMaterialName, string LotNumber,
    Guid? SupplierId, string? NewSupplierName,
    Guid? StorageLocationId, string? NewStorageLocationName,
    DateOnly? ExpirationOrRetestDate, decimal AvailableQuantity, string QuantityUnit,
    IReadOnlyList<CreatePreparedReagentComponentRequest>? Components);
public sealed record MaterialQcRequest(
    string Disposition, DateOnly PerformedOn, string? FailureReason,
    string ResultsJson, long Version);
public sealed record ConsumeMaterialRequest(Guid LabMaterialLotId, Guid? OutputContainerId,
    decimal Quantity, string QuantityUnit, long LotVersion);
public sealed record CreateEquipmentRequest(string Name, string EquipmentType,
    string Location, DateOnly? LastCalibrationOn, DateOnly? CalibrationDueOn);
public sealed record RecordEquipmentUsageRequest(Guid LabEquipmentId, DateTime UsedAtUtc, string? RunReference);
public sealed record CreateLibraryRequest(Guid LabSpecimenId, Guid SourceContainerId,
    Guid LibraryContainerId, Guid PreparationExecutionId);
public sealed record LibraryQcRequest(bool Passed, string ResultsJson, long Version);
public sealed record CreateBatchRequest(string Name, string? Notes);
public sealed record BatchTransitionRequest(string Action, long Version, DateTime? OccurredAtUtc = null);
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
