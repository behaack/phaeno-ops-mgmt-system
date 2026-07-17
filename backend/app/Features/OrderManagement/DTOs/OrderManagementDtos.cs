namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public sealed record OrderListItemDto(
    Guid Id,
    string Number,
    string Status,
    string? Reference,
    Guid OrganizationId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    long Version,
    string? TenantSafeReason,
    Guid? AssignedToUserId = null,
    DateTime? DueAt = null,
    bool IsOverdue = false);

public sealed record OrderTimelineDto(
    Guid Id,
    string FromStatus,
    string ToStatus,
    string? Reason,
    string? InternalNote,
    Guid ActorUserId,
    DateTime OccurredAt);

public sealed record CommercialDocumentDto(
    Guid Id,
    string Kind,
    string SyncStatus,
    string? DocumentNumber,
    string? DocumentUrl,
    decimal Total,
    decimal Balance,
    string Currency,
    DateTime? SynchronizedAt,
    string? LastError,
    long Version);

public sealed record OperationalFileDto(
    Guid Id,
    Guid? ParentRecordId,
    string Purpose,
    string FileName,
    string FileKind,
    string ContentType,
    long SizeBytes,
    string ScanStatus,
    string ReleaseStatus,
    DateTime? ReleasedAt,
    DateTime CreatedAt,
    long Version);

public sealed record CancellationRequestDto(
    Guid Id,
    string Reason,
    string ScopeJson,
    string Status,
    string? DecisionReason,
    DateTime CreatedAt,
    DateTime? DecidedAt,
    long Version);

public sealed record QuoteDto(
    Guid Id,
    int Revision,
    string Purpose,
    string Status,
    string LinesJson,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    string Currency,
    DateTime IssuedAt,
    DateTime ExpiresAt,
    DateTime? AcceptedAt,
    long Version);

public sealed record LabSampleDto(
    Guid Id,
    string CustomerSampleId,
    string MaterialType,
    string BiologicalSource,
    decimal Quantity,
    string QuantityUnit,
    string StorageRequirements,
    string SafetyDeclaration,
    DateTime? CollectionDate,
    decimal? Concentration,
    string? Notes,
    string AnalysisDefinitionIdsJson,
    string? AccessionId,
    string Status,
    Guid? ReplacementForSampleId,
    DateTime? ReceivedAt,
    string? ReceiptCondition,
    string? Carrier,
    string? TrackingNumber,
    DateTime? CustomerShippedAt,
    string? TenantSafeReason,
    string? InternalNote,
    long Version);

public sealed record LabResultReleaseDto(
    Guid Id,
    Guid LabSampleId,
    int ReleaseVersion,
    string AnalysisProfile,
    string PipelineVersion,
    string Provenance,
    string QcStatus,
    string ManifestJson,
    string ReleaseStatus,
    DateTime GeneratedAt,
    DateTime? ReleasedAt,
    long Version);

public sealed record LabRequestRevisionDto(
    Guid Id,
    int Revision,
    Guid? PreviousRevisionId,
    string SnapshotJson,
    string? CorrectionReason,
    Guid SubmittedByUserId,
    DateTime SubmittedAt);

public sealed record LabServiceOrderDto(
    Guid Id,
    Guid OrganizationId,
    string OrderNumber,
    string? CustomerReference,
    string SubmissionInstructions,
    string Status,
    int RequestRevision,
    DateTime? SubmittedAt,
    DateTime? PlacedAt,
    DateTime? CompletedAt,
    string? TenantSafeReason,
    string? InternalNote,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    long Version,
    bool CanEdit,
    bool CanSubmit,
    bool CanAcceptQuote,
    bool CanWithdraw,
    bool CanRequestCancellation,
    IReadOnlyList<LabSampleDto> Samples,
    IReadOnlyList<QuoteDto> Quotes,
    IReadOnlyList<LabResultReleaseDto> ResultReleases,
    IReadOnlyList<OperationalFileDto> ResultFiles,
    IReadOnlyList<CommercialDocumentDto> Documents,
    IReadOnlyList<CancellationRequestDto> CancellationRequests,
    IReadOnlyList<OrderTimelineDto> Timeline,
    Guid? AssignedToUserId = null,
    DateTime? DueAt = null,
    IReadOnlyList<LabRequestRevisionDto>? RequestRevisions = null,
    string? LabMilestone = null,
    string? LabScheduleHealth = null,
    DateTime? LabExpectedCompletionAtUtc = null,
    int LabCustomerActionCount = 0,
    string? LabCustomerActionSummary = null,
    string? LabPermittedQcProjectionJson = null,
    bool LabReadyForRelease = false);

public sealed record ReagentOrderLineDto(
    Guid Id,
    Guid OfferingId,
    Guid QboCatalogItemId,
    string ExternalItemId,
    string Description,
    decimal Quantity,
    string Unit,
    decimal UnitPrice,
    string Currency,
    decimal LineTotal,
    string? Note,
    decimal ShippedQuantity,
    decimal CancelledQuantity,
    decimal RemainingQuantity,
    DateTime? EstimatedShipDate,
    long Version);

public sealed record ShipmentLineDto(Guid Id, Guid OrderLineId, decimal Quantity, string LotBatchNumber, DateTime? ExpiresAt);

public sealed record ReagentShipmentDto(
    Guid Id,
    string ShipmentNumber,
    string PackingSlipNumber,
    string Carrier,
    string? Service,
    string TrackingNumber,
    DateTime ShippedAt,
    IReadOnlyList<ShipmentLineDto> Lines,
    long Version);

public sealed record ReagentAdjustmentDto(
    Guid Id,
    Guid OriginalLineId,
    Guid ProposedOfferingId,
    string BeforeJson,
    string AfterJson,
    string Reason,
    decimal TotalDifference,
    string Status,
    DateTime? DecidedAt,
    long Version);

public sealed record PartnerReagentOrderDto(
    Guid Id,
    Guid OrganizationId,
    string OrderNumber,
    string Status,
    string? PurchaseOrderNumber,
    Guid? ShippingAddressId,
    string? ShippingAddressSnapshotJson,
    DateTime? RequestedDeliveryDate,
    string? ShippingInstructions,
    DateTime? PlacedAt,
    DateTime? AcceptedAt,
    DateTime? FulfilledAt,
    string? TenantSafeReason,
    string? InternalNote,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    long Version,
    bool CanEdit,
    bool CanPlace,
    bool CanCancel,
    bool CanRequestCancellation,
    IReadOnlyList<ReagentOrderLineDto> Lines,
    IReadOnlyList<ReagentShipmentDto> Shipments,
    IReadOnlyList<ReagentAdjustmentDto> Adjustments,
    IReadOnlyList<CommercialDocumentDto> Documents,
    IReadOnlyList<CancellationRequestDto> CancellationRequests,
    IReadOnlyList<OrderTimelineDto> Timeline,
    Guid? AssignedToUserId = null,
    DateTime? DueAt = null,
    string? PlacementSnapshotJson = null);

public sealed record ShippingAddressDto(
    Guid Id,
    string Label,
    string Recipient,
    string Line1,
    string? Line2,
    string City,
    string Region,
    string PostalCode,
    string CountryCode,
    string? Phone,
    bool IsActive,
    long Version);

public sealed record AssemblyInputRevisionDto(
    Guid Id,
    int Revision,
    Guid? PreviousRevisionId,
    string ManifestJson,
    string? CorrectionReason,
    string ValidationSummaryJson,
    DateTime SubmittedAt);

public sealed record AssemblyProcessingRunDto(
    Guid Id,
    Guid InputRevisionId,
    int RunNumber,
    string ProfileVersion,
    string PipelineVersion,
    string Provenance,
    string? QcStatus,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string? FailureReason,
    long Version);

public sealed record AssemblyOutputReleaseDto(
    Guid Id,
    Guid InputRevisionId,
    Guid ProcessingRunId,
    int ReleaseVersion,
    string ManifestJson,
    string PipelineVersion,
    string Provenance,
    string QcStatus,
    string ReleaseStatus,
    DateTime GeneratedAt,
    DateTime? ReleasedAt,
    IReadOnlyList<OperationalFileDto> Files,
    long Version);

public sealed record DataAssemblyRequestDto(
    Guid Id,
    Guid OrganizationId,
    string RequestNumber,
    string ProjectReference,
    Guid AssemblyProfileId,
    int AssemblyProfileVersion,
    string ProfileName,
    string ProfileInstructions,
    string MetadataJson,
    string RequestedOutput,
    string? ProcessingNotes,
    bool ProhibitedDataConfirmed,
    string Status,
    int InputRevision,
    string? PurchaseOrderNumber,
    DateTime? SubmittedAt,
    DateTime? PlacedAt,
    DateTime? CompletedAt,
    string? TenantSafeReason,
    string? InternalNote,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    long Version,
    bool CanEdit,
    bool CanSubmit,
    bool CanAcceptQuote,
    bool CanWithdraw,
    bool CanRequestCancellation,
    IReadOnlyList<AssemblyInputRevisionDto> InputRevisions,
    IReadOnlyList<QuoteDto> Quotes,
    IReadOnlyList<AssemblyProcessingRunDto> ProcessingRuns,
    IReadOnlyList<AssemblyOutputReleaseDto> OutputReleases,
    IReadOnlyList<OperationalFileDto> InputFiles,
    IReadOnlyList<CommercialDocumentDto> Documents,
    IReadOnlyList<CancellationRequestDto> CancellationRequests,
    IReadOnlyList<OrderTimelineDto> Timeline,
    Guid? AssignedToUserId = null,
    DateTime? DueAt = null);

public sealed record AnalysisDefinitionDto(
    Guid Id,
    Guid QboCatalogItemId,
    string Name,
    string Description,
    string SubmissionInstructions,
    string RequiredIntakeFieldsJson,
    string ResultContractJson,
    bool IsActive,
    bool IsSynthetic,
    long Version);

public sealed record ReagentOfferingDto(
    Guid Id,
    Guid PartnerOrganizationId,
    Guid QboCatalogItemId,
    string ItemName,
    decimal NegotiatedUnitPrice,
    string Currency,
    string SellingUnit,
    decimal OrderIncrement,
    decimal MinimumQuantity,
    decimal? MaximumQuantity,
    string ShippingRestrictionsJson,
    DateTime EffectiveFrom,
    DateTime? EffectiveUntil,
    bool IsActive,
    long Version);

public sealed record AssemblyProfileDto(
    Guid Id,
    Guid QboCatalogItemId,
    string Name,
    int ProfileVersion,
    string Description,
    string Instructions,
    string MetadataSchemaJson,
    string AllowedFileKindsJson,
    string OutputContractJson,
    long MaximumFileSizeBytes,
    long MaximumTotalSizeBytes,
    bool IsActive,
    bool IsSynthetic,
    long Version);

public sealed record CatalogItemDto(
    Guid Id,
    string ExternalItemId,
    string Name,
    string Description,
    string SalesUnit,
    decimal BasePrice,
    string Currency,
    bool IsActive,
    DateTime LastSyncedAt,
    long Version);

public sealed record CommercialProfileDto(
    Guid Id,
    Guid OrganizationId,
    string OrganizationName,
    bool LabCreditApproved,
    bool AssemblyCreditApproved,
    string? QboCustomerId,
    long Version);

public sealed record OrderSystemConfigurationDto(
    Guid Id,
    int QuoteValidityDays,
    string SampleSubmissionInstructions,
    string ShippingConfigurationJson,
    long Version);

public sealed record OrderConfigurationDto(
    OrderSystemConfigurationDto System,
    IReadOnlyList<CatalogItemDto> CatalogItems,
    IReadOnlyList<AnalysisDefinitionDto> Analyses,
    IReadOnlyList<ReagentOfferingDto> ReagentOfferings,
    IReadOnlyList<AssemblyProfileDto> AssemblyProfiles,
    IReadOnlyList<CommercialProfileDto> CommercialProfiles);

public sealed record VersionRequest(long Version);
public sealed record ReasonRequest(long Version, string Reason, string? InternalNote = null);
public sealed record CancellationRequestBody(long Version, string Reason, string ScopeJson = "{}");
public sealed record CancellationLineDecisionRequest(Guid OrderLineId, decimal Quantity);
public sealed record CancellationDecisionRequest(long Version, string Status, string Reason, IReadOnlyList<CancellationLineDecisionRequest>? Lines = null);
public sealed record OperationalAssignmentRequest(long Version, bool AssignToMe, DateTime? DueAt);
public sealed record OperationalAssignmentDto(string Workflow, Guid RecordId, Guid? AssignedToUserId, DateTime? DueAt, long Version);

public sealed record LabSampleWriteRequest(
    Guid? Id,
    string CustomerSampleId,
    string MaterialType,
    string BiologicalSource,
    decimal Quantity,
    string QuantityUnit,
    string StorageRequirements,
    string SafetyDeclaration,
    DateTime? CollectionDate,
    decimal? Concentration,
    string? Notes,
    IReadOnlyList<Guid> AnalysisDefinitionIds,
    Guid? ReplacementForSampleId = null);

public sealed record LabOrderWriteRequest(string? CustomerReference, IReadOnlyList<LabSampleWriteRequest> Samples, long? Version = null);
public sealed record SampleShipmentRequest(long Version, string? Carrier, string? TrackingNumber, DateTime? ShippedAt);
public sealed record LabSampleReceiptRequest(long Version, DateTime ReceivedAt, string ReceiptCondition);
public sealed record LabSampleAccessionRequest(long Version, string AccessionId);
public sealed record LabSampleTransitionRequest(long Version, string Status, string? Reason, string? InternalNote);
public sealed record QuoteLineRequest(Guid CatalogItemId, string Description, decimal Quantity, decimal UnitPrice);
public sealed record IssueQuoteRequest(long Version, IReadOnlyList<QuoteLineRequest> Lines, decimal Tax, string Currency, DateTime? ExpiresAt, string Purpose = "Initial");
public sealed record AcceptQuoteRequest(long Version, Guid QuoteId, string? PurchaseOrderNumber = null);

public sealed record ReagentLineWriteRequest(Guid OfferingId, decimal Quantity, string? Note);
public sealed record ReagentOrderWriteRequest(IReadOnlyList<ReagentLineWriteRequest> Lines, long? Version = null);
public sealed record PlaceReagentOrderRequest(long Version, string PurchaseOrderNumber, Guid ShippingAddressId, DateTime? RequestedDeliveryDate, string? ShippingInstructions);
public sealed record ShippingAddressWriteRequest(string Label, string Recipient, string Line1, string? Line2, string City, string Region, string PostalCode, string CountryCode, string? Phone, long? Version = null);
public sealed record ShipmentAllocationRequest(Guid OrderLineId, decimal Quantity, string LotBatchNumber, DateTime? ExpiresAt);
public sealed record CreateShipmentRequest(long Version, string Carrier, string? Service, string TrackingNumber, DateTime ShippedAt, IReadOnlyList<ShipmentAllocationRequest> Lines);
public sealed record ReagentAdjustmentDecisionRequest(long Version, bool Approved);
public sealed record ProposeReagentAdjustmentRequest(long Version, Guid OriginalLineId, Guid ProposedOfferingId, decimal Quantity, string Reason);

public sealed record AssemblyWriteRequest(Guid AssemblyProfileId, string ProjectReference, string MetadataJson, string RequestedOutput, string? ProcessingNotes, bool ProhibitedDataConfirmed, long? Version = null);
public sealed record AssemblySubmitRequest(long Version, string ManifestJson, string ValidationSummaryJson = "{}");
public sealed record AssemblyProcessingRequest(long Version, string ProfileVersion, string PipelineVersion, string Provenance);
public sealed record AssemblyProcessingDecisionRequest(long Version, Guid RunId, bool Succeeded, string QcStatusOrReason);
public sealed record AssemblyOutputReviewRequest(long Version, Guid RunId, string ManifestJson, string PipelineVersion, string Provenance, string QcStatus);

public sealed record UpdateSystemConfigurationRequest(long Version, int QuoteValidityDays, string SampleSubmissionInstructions, string ShippingConfigurationJson);
public sealed record AnalysisDefinitionWriteRequest(Guid QboCatalogItemId, string Name, string Description, string SubmissionInstructions, string RequiredIntakeFieldsJson, string ResultContractJson, bool IsActive, bool IsSynthetic, long? Version = null);
public sealed record ReagentOfferingWriteRequest(Guid PartnerOrganizationId, Guid QboCatalogItemId, decimal NegotiatedUnitPrice, string Currency, string SellingUnit, decimal OrderIncrement, decimal MinimumQuantity, decimal? MaximumQuantity, string ShippingRestrictionsJson, DateTime EffectiveFrom, DateTime? EffectiveUntil, bool IsActive, long? Version = null);
public sealed record AssemblyProfileWriteRequest(Guid QboCatalogItemId, string Name, int ProfileVersion, string Description, string Instructions, string MetadataSchemaJson, string AllowedFileKindsJson, string OutputContractJson, long MaximumFileSizeBytes, long MaximumTotalSizeBytes, bool IsActive, bool IsSynthetic, long? Version = null);
public sealed record CommercialProfileWriteRequest(Guid OrganizationId, bool LabCreditApproved, bool AssemblyCreditApproved, string? QboCustomerId, long? Version = null);
public sealed record LocalCatalogItemRequest(string ExternalItemId, string Name, string Description, string SalesUnit, decimal BasePrice, string Currency, bool IsActive);

public sealed record IntegrationMessageDto(Guid Id, string Operation, string WorkflowType, Guid WorkflowId, string Status, int AttemptCount, DateTime NextAttemptAt, string? LastError, DateTime CreatedAt, long Version);
public sealed record NotificationMessageDto(Guid Id, string WorkflowType, Guid WorkflowId, string EventType, string Subject, string Status, int AttemptCount, DateTime NextAttemptAt, string? LastError, DateTime CreatedAt, long Version);

public static class OrderManagementMappings
{
    public static OperationalFileDto ToDto(this ManagedOperationalFile file) => new(
        file.Id, file.ParentRecordId, file.Purpose.ToString(), file.FileName, file.FileKind,
        file.ContentType, file.SizeBytes, file.ScanStatus.ToString(), file.ReleaseStatus.ToString(),
        file.ReleasedAt, file.CreatedAt, file.Version);

    public static CommercialDocumentDto ToDto(this CommercialDocumentLink document, bool platform) => new(
        document.Id, document.Kind.ToString(), document.SyncStatus.ToString(), document.DocumentNumber,
        document.DocumentUrl, document.Total, document.Balance, document.Currency, document.SynchronizedAt,
        platform ? document.LastError : null, document.Version);

    public static CancellationRequestDto ToDto(this OrderCancellationRequest request) => new(
        request.Id, request.Reason, request.ScopeJson, request.Status.ToString(), request.DecisionReason,
        request.CreatedAt, request.DecidedAt, request.Version);

    public static OrderTimelineDto ToDto(this OrderStatusEvent item, bool platform) => new(
        item.Id, item.FromStatus, item.ToStatus, item.TenantSafeReason,
        platform ? item.InternalNote : null, item.ActorUserId, item.OccurredAt);

    public static QuoteDto ToDto(this LabServiceQuote quote) => new(
        quote.Id, quote.Revision, quote.Purpose.ToString(), quote.Status.ToString(), quote.LinesJson,
        quote.Subtotal, quote.Tax, quote.Total, quote.Currency, quote.IssuedAt, quote.ExpiresAt,
        quote.AcceptedAt, quote.Version);

    public static QuoteDto ToDto(this DataAssemblyQuote quote) => new(
        quote.Id, quote.Revision, quote.Purpose.ToString(), quote.Status.ToString(), quote.LinesJson,
        quote.Subtotal, quote.Tax, quote.Total, quote.Currency, quote.IssuedAt, quote.ExpiresAt,
        quote.AcceptedAt, quote.Version);

    public static LabSampleDto ToDto(this LabSample sample, bool platform) => new(
        sample.Id, sample.CustomerSampleId, sample.MaterialType, sample.BiologicalSource, sample.Quantity,
        sample.QuantityUnit, sample.StorageRequirements, sample.SafetyDeclaration, sample.CollectionDate,
        sample.Concentration, sample.Notes, sample.AnalysisDefinitionIdsJson, sample.AccessionId,
        sample.Status.ToString(), sample.ReplacementForSampleId, sample.ReceivedAt, sample.ReceiptCondition,
        sample.Carrier, sample.TrackingNumber, sample.CustomerShippedAt, sample.TenantSafeReason,
        platform ? sample.InternalNote : null, sample.Version);

    public static LabResultReleaseDto ToDto(this LabResultRelease release) => new(
        release.Id, release.LabSampleId, release.ReleaseVersion, release.AnalysisProfile,
        release.PipelineVersion, release.Provenance, release.QcStatus, release.ManifestJson,
        release.ReleaseStatus.ToString(), release.GeneratedAt, release.ReleasedAt, release.Version);

    public static ReagentOrderLineDto ToDto(this PartnerReagentOrderLine line) => new(
        line.Id, line.OfferingId, line.QboCatalogItemId, line.ExternalItemId, line.Description, line.Quantity,
        line.Unit, line.UnitPrice, line.Currency, line.LineTotal, line.Note, line.ShippedQuantity,
        line.CancelledQuantity, line.RemainingQuantity, line.EstimatedShipDate, line.Version);

    public static ReagentShipmentDto ToDto(this ReagentShipment shipment) => new(
        shipment.Id, shipment.ShipmentNumber, shipment.PackingSlipNumber, shipment.Carrier, shipment.Service,
        shipment.TrackingNumber, shipment.ShippedAt,
        shipment.Lines.Select(line => new ShipmentLineDto(line.Id, line.PartnerReagentOrderLineId,
            line.Quantity, line.LotBatchNumber, line.ExpiresAt)).ToList(), shipment.Version);

    public static ShippingAddressDto ToDto(this PartnerShippingAddress address) => new(
        address.Id, address.Label, address.Recipient, address.Line1, address.Line2, address.City,
        address.Region, address.PostalCode, address.CountryCode, address.Phone, address.IsActive, address.Version);
}
