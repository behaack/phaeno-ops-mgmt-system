namespace PhaenoPortal.App.Features.FileManagement.DTOs;

public sealed record ReleasedDeliverablePolicyValuesDto(
    int StandardRetentionDays,
    int UndownloadedWarningLeadDays,
    int UndownloadedGraceDays);

public sealed record EffectiveReleasedDeliverablePolicyDto(
    int StandardRetentionDays,
    string StandardRetentionSource,
    int UndownloadedWarningLeadDays,
    string UndownloadedWarningLeadSource,
    int UndownloadedGraceDays,
    string UndownloadedGraceSource);

public sealed record ReleasedDeliverablePolicyVersionDto(
    Guid Id,
    int Revision,
    ReleasedDeliverablePolicyValuesDto Values,
    string ChangeReason,
    Guid? SupersedesPolicyId,
    bool IsActive,
    DateTime? DeactivatedAt,
    Guid? DeactivatedByUserId,
    string? DeactivationReason,
    DateTime CreatedAt,
    Guid? CreatedByUserId,
    long Version);

public sealed record OrganizationReleasedDeliverablePolicyOverrideDto(
    Guid Id,
    Guid OrganizationId,
    int Revision,
    int? StandardRetentionDays,
    int? UndownloadedWarningLeadDays,
    int? UndownloadedGraceDays,
    string ChangeReason,
    Guid? SupersedesOverrideId,
    bool IsActive,
    DateTime? DeactivatedAt,
    Guid? DeactivatedByUserId,
    string? DeactivationReason,
    DateTime CreatedAt,
    Guid? CreatedByUserId,
    long Version);

public sealed record ReleasedDeliverablePolicyConfigurationDto(
    ReleasedDeliverablePolicyVersionDto Global,
    IReadOnlyList<ReleasedDeliverablePolicyVersionDto> GlobalHistory);

public sealed record OrganizationReleasedDeliverablePolicyDto(
    Guid OrganizationId,
    string OrganizationName,
    string OrganizationKind,
    ReleasedDeliverablePolicyVersionDto Global,
    OrganizationReleasedDeliverablePolicyOverrideDto? Override,
    EffectiveReleasedDeliverablePolicyDto Effective,
    IReadOnlyList<OrganizationReleasedDeliverablePolicyOverrideDto> OverrideHistory);

public sealed record UpdateReleasedDeliverablePolicyRequest(
    int StandardRetentionDays,
    int UndownloadedWarningLeadDays,
    int UndownloadedGraceDays,
    string Reason,
    long Version);

public sealed record UpsertOrganizationReleasedDeliverablePolicyOverrideRequest(
    int? StandardRetentionDays,
    int? UndownloadedWarningLeadDays,
    int? UndownloadedGraceDays,
    string Reason,
    long GlobalVersion,
    long? OverrideVersion);

public sealed record RemoveOrganizationReleasedDeliverablePolicyOverrideRequest(
    string Reason,
    long Version);
