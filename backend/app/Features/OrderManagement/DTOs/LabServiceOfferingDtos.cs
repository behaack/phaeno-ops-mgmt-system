namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed record LabServiceOfferingDto(
    Guid Id, Guid FamilyId, int OfferingVersion, string Name, string Description,
    Guid CatalogItemId, string CatalogCode, string CatalogName, long CatalogItemVersion, decimal UnitPrice, string Currency,
    IReadOnlyList<Guid> AnalysisIds, IReadOnlyList<string> AllowedMaterialTypes,
    IReadOnlyList<string> AllowedBiologicalSources, string IncludedOutputContract,
    int MinimumTurnaroundDays, int MaximumTurnaroundDays,
    DateTime EffectiveFrom, DateTime? EffectiveTo, bool IsActive, bool IsSynthetic,
    bool IsAvailable, long Version);

public sealed record LabServiceOfferingWriteRequest(
    string Name, string Description, Guid CatalogItemId, IReadOnlyList<Guid> AnalysisIds,
    IReadOnlyList<string> AllowedMaterialTypes, IReadOnlyList<string> AllowedBiologicalSources,
    string IncludedOutputContract, int MinimumTurnaroundDays, int MaximumTurnaroundDays,
    DateTime EffectiveFrom, DateTime? EffectiveTo, bool IsActive, bool IsSynthetic,
    long? Version = null);

public sealed record LabServiceOfferingAvailabilityRequest(
    long Version, DateTime EffectiveFrom, DateTime? EffectiveTo, bool IsActive);

public sealed record PlaceStandardLabOrderRequest(
    long Version, Guid OfferingId, int OfferingVersion, long OfferingRecordVersion,
    long CatalogItemVersion, long CommercialProfileVersion, long DepartmentVersion,
    long OrganizationVersion, string ReviewToken, bool ProhibitedDataConfirmed, string? PurchaseOrderNumber = null);

public sealed record StandardLabOrderPreviewDto(
    LabServiceOfferingDto Offering, int SpecimenCount, decimal Subtotal, decimal? Tax, decimal? Total,
    string Currency, bool CanPlaceStandardOrder, IReadOnlyList<string> Blockers,
    long OrderVersion, long? CommercialProfileVersion, long DepartmentVersion, long OrganizationVersion, string ReviewToken);

public sealed record LabServiceCommercialSnapshotDto(
    Guid OfferingId, Guid FamilyId, int OfferingVersion, string ProductName,
    Guid CatalogItemId, string CatalogCode, long CatalogItemVersion, string Currency,
    decimal UnitPrice, int SpecimenCount, decimal Subtotal, decimal Tax, decimal Total,
    IReadOnlyList<Guid> AnalysisIds, string IncludedOutputContract,
    int MinimumTurnaroundDays, int MaximumTurnaroundDays, DateTime CommittedAtUtc);

public sealed record LabServiceTimingDto(
    DateTime? FirstReceivedAtUtc, DateTime? AcceptedAtUtc, DateTime? OriginalTargetAtUtc,
    DateTime? ExpectedCompletionAtUtc, DateTime? CompletedAtUtc, string ScheduleHealth,
    IReadOnlyList<LabServiceTimingChangeDto> Changes, long Version, bool CanOverrideTiming);

public sealed record LabServiceTimingChangeDto(
    Guid Id, DateTime PreviousExpectedAtUtc, DateTime ExpectedAtUtc, string Reason,
    string? CustomerSafeNote, string? InternalNote, Guid ActorUserId, DateTime OccurredAtUtc,
    bool NotificationRequired, string NotificationStatus);

public sealed record LabServiceTimingOverrideRequest(
    long Version, DateTime ExpectedCompletionAtUtc, string Reason,
    string? CustomerSafeNote = null, string? InternalNote = null);
