namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record SampleShippingConfigurationDto(
    IReadOnlyList<SampleShippingDestinationDto> Destinations,
    IReadOnlyList<SampleTypeDefinitionDto> SampleTypes,
    IReadOnlyList<SampleShippingInstructionRuleDto> InstructionRules);

public sealed record SampleShippingDestinationDto(
    Guid Id,
    Guid DefinitionKey,
    int Revision,
    Guid? SupersedesDestinationId,
    string Code,
    string Name,
    string RecipientName,
    string OrganizationName,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string StateOrProvince,
    string PostalCode,
    string CountryCode,
    string? ReceivingPhone,
    string? ReceivingEmail,
    string ReceivingHours,
    string TimeZoneId,
    string? ClosureInstructions,
    string DeliveryInstructions,
    string? CarrierRestrictions,
    bool InternationalShippingAllowed,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo,
    bool IsActive,
    long Version);

public sealed record SampleShippingDestinationWriteRequest(
    Guid? SupersedesDestinationId,
    long? SupersededVersion,
    string Code,
    string Name,
    string RecipientName,
    string OrganizationName,
    string AddressLine1,
    string? AddressLine2,
    string City,
    string StateOrProvince,
    string PostalCode,
    string CountryCode,
    string? ReceivingPhone,
    string? ReceivingEmail,
    string ReceivingHours,
    string TimeZoneId,
    string? ClosureInstructions,
    string DeliveryInstructions,
    string? CarrierRestrictions,
    bool InternationalShippingAllowed,
    DateTime EffectiveFrom,
    bool IsActive);

public sealed record SampleTypeDefinitionDto(
    Guid Id,
    Guid DefinitionKey,
    int Revision,
    Guid? SupersedesSampleTypeId,
    string Code,
    string Name,
    string Description,
    string MaterialClass,
    decimal? MinimumQuantity,
    decimal? MaximumQuantity,
    string QuantityUnit,
    string PrimaryContainerRequirements,
    string TemperatureRequirements,
    string? StabilizerRequirements,
    string PackagingInstructions,
    string LabelingInstructions,
    string ProhibitedIdentifiers,
    string SafetyRequirements,
    string? CarrierRestrictions,
    int? MaximumTransitHours,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo,
    bool IsActive,
    long Version);

public sealed record SampleTypeDefinitionWriteRequest(
    Guid? SupersedesSampleTypeId,
    long? SupersededVersion,
    string Code,
    string Name,
    string Description,
    string MaterialClass,
    decimal? MinimumQuantity,
    decimal? MaximumQuantity,
    string QuantityUnit,
    string PrimaryContainerRequirements,
    string TemperatureRequirements,
    string? StabilizerRequirements,
    string PackagingInstructions,
    string LabelingInstructions,
    string ProhibitedIdentifiers,
    string SafetyRequirements,
    string? CarrierRestrictions,
    int? MaximumTransitHours,
    DateTime EffectiveFrom,
    bool IsActive);

public sealed record SampleShippingInstructionRuleDto(
    Guid Id,
    Guid DefinitionKey,
    int Revision,
    Guid? SupersedesInstructionRuleId,
    Guid DestinationId,
    string DestinationName,
    Guid SampleTypeDefinitionId,
    string SampleTypeName,
    string CompatibilityGroup,
    string PackingInstructions,
    string TemperatureInstructions,
    string CarrierInstructions,
    string DispatchInstructions,
    string DeliveryInstructions,
    string RequiredDocuments,
    string ExceptionInstructions,
    string? InternationalCustomsInstructions,
    bool RequiresSeparateShipment,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo,
    bool IsActive,
    long Version);

public sealed record SampleShippingInstructionRuleWriteRequest(
    Guid? SupersedesInstructionRuleId,
    long? SupersededVersion,
    Guid DestinationId,
    Guid SampleTypeDefinitionId,
    string CompatibilityGroup,
    string PackingInstructions,
    string TemperatureInstructions,
    string CarrierInstructions,
    string DispatchInstructions,
    string DeliveryInstructions,
    string RequiredDocuments,
    string ExceptionInstructions,
    string? InternationalCustomsInstructions,
    bool RequiresSeparateShipment,
    DateTime EffectiveFrom,
    bool IsActive);

public sealed record SampleShippingPreviewRequest(
    Guid DestinationId,
    IReadOnlyList<Guid> SampleTypeDefinitionIds,
    DateTime? EffectiveAt);

public sealed record SampleShippingPreviewDto(
    DateTime EffectiveAt,
    SampleShippingDestinationDto Destination,
    string CompatibilityGroup,
    bool RequiresSeparateShipment,
    IReadOnlyList<SampleShippingPreviewRuleDto> SampleRules);

public sealed record SampleShippingPreviewRuleDto(
    SampleTypeDefinitionDto SampleType,
    string PackingInstructions,
    string TemperatureInstructions,
    string CarrierInstructions,
    string DispatchInstructions,
    string DeliveryInstructions,
    string RequiredDocuments,
    string ExceptionInstructions,
    string? InternationalCustomsInstructions,
    bool RequiresSeparateShipment);

public sealed record SampleShippingPacketScanDto(
    Guid PacketRevisionId,
    string PacketNumber,
    string Barcode,
    int PacketRevision,
    bool IsVoided,
    DateTime? VoidedAt,
    string? VoidReason,
    string? ReplacementBarcode,
    Guid ShipmentId,
    string ShipmentNumber,
    string ShipmentStatus,
    Guid OrganizationId,
    string OrganizationName,
    string AuthorizationSource,
    Guid AuthorizationSourceId,
    string AuthorizationReference,
    string AuthorizationName,
    Guid LabWorkOrderId,
    string LabWorkStatus,
    Guid DestinationId,
    string DestinationName,
    string? Carrier,
    string? TrackingNumber,
    DateTime? ShippedAt,
    int ExpectedSampleCount,
    int ReceivedSampleCount,
    int AwaitingReceiptSampleCount,
    string ReceiptState,
    DateTime IssuedAt,
    IReadOnlyList<SampleShippingCrosswalkItemDto> Crosswalk);

public sealed record SampleShippingCrosswalkItemDto(
    Guid ShipmentItemId,
    Guid SubmittedSpecimenId,
    string CustomerSampleId,
    string SampleName,
    string SampleTypeName,
    decimal Quantity,
    string QuantityUnit,
    Guid? RegisteredSampleTubeId,
    string? SupplierTubeBarcode,
    string TubeStatus,
    long Version,
    Guid? TubeSlotId = null,
    int TubeOrdinal = 1,
    int TubeCount = 1);

public sealed record RegisteredSampleTubeDto(
    Guid Id,
    string SupplierBarcode,
    string Status,
    DateTime? AssignedAt,
    DateTime? AccessionedAt,
    long Version);

public sealed record SampleReturnKitDto(
    Guid Id,
    string KitNumber,
    Guid SampleShipmentId,
    Guid OrganizationId,
    string AuthorizationSource,
    Guid AuthorizationSourceId,
    string TubeSupplierName,
    string TubeProductNumber,
    string? TubeLotNumber,
    string ShipperSupplierName,
    string ShipperProductNumber,
    int RequiredTubeCount,
    string Status,
    string? OutboundCarrier,
    string? OutboundTrackingNumber,
    DateTime? FulfilledAt,
    long Version,
    IReadOnlyList<RegisteredSampleTubeDto> Tubes);

public sealed record SampleShipmentWorkflowDto(
    Guid Id,
    string ShipmentNumber,
    Guid OrganizationId,
    string OrganizationName,
    string AuthorizationSource,
    Guid AuthorizationSourceId,
    string AuthorizationReference,
    string AuthorizationName,
    Guid LabWorkOrderId,
    Guid DestinationId,
    string DestinationName,
    string Status,
    string? Carrier,
    string? TrackingNumber,
    DateTime? ShippedAt,
    long Version,
    SampleReturnKitDto? ReturnKit,
    IReadOnlyList<SampleShippingCrosswalkItemDto> Crosswalk,
    SampleShippingPacketSummaryDto? CurrentPacket);

public sealed record SampleShippingPacketSummaryDto(
    Guid Id,
    int Revision,
    string PacketNumber,
    string Barcode,
    DateTime IssuedAt,
    bool IsVoided);

public sealed record SampleShippingPacketDocumentDto(
    SampleShipmentWorkflowDto Shipment,
    string DestinationSnapshotJson,
    string InstructionSnapshotJson,
    string ManifestSnapshotJson);

public sealed record CreateSampleReturnKitRequest(
    int RequiredTubeCount,
    string TubeSupplierName,
    string TubeProductNumber,
    string? TubeLotNumber,
    string ShipperSupplierName,
    string ShipperProductNumber);

public sealed record RegisterSampleTubesRequest(
    IReadOnlyList<string> SupplierBarcodes,
    long Version);

public sealed record FulfillSampleReturnKitRequest(
    string OutboundCarrier,
    string OutboundTrackingNumber,
    DateTime FulfilledAt,
    long Version);

public sealed record AssignSampleTubeRequest(
    string SupplierBarcode,
    string? Reason,
    long Version,
    Guid? TubeSlotId = null);

public sealed record IssueSampleShippingPacketRequest(
    long Version,
    string? ReplacementReason);

public sealed record RecordSampleShipmentRequest(
    string Carrier,
    string TrackingNumber,
    DateTime ShippedAt,
    long Version);

public sealed record RegisteredSampleTubeScanDto(
    string PacketBarcode,
    string SupplierTubeBarcode,
    bool IsExpected,
    Guid? ShipmentItemId,
    Guid? SubmittedSpecimenId,
    string? CustomerSampleId,
    string? SampleName,
    string? TubeStatus,
    bool IsAccessioned,
    string Outcome);
