namespace PhaenoPortal.App.Features.RelationshipManagement.DTOs;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed record OrganizationRelationshipSummaryDto
{
    public required Guid OrganizationId { get; init; }
    public required string OrganizationName { get; init; }
    public required OrganizationKind OrganizationKind { get; init; }
    public required bool IsActive { get; init; }
    public required PortalReadinessStatus PortalReadiness { get; init; }
    public string? PortalReadinessNote { get; init; }
    public required string AdministratorStatus { get; init; }
    public required int ActiveMemberCount { get; init; }
    public required int PendingInvitationCount { get; init; }
    public required IReadOnlyList<PortalService> EffectiveServices { get; init; }
    public required int PendingRequestCount { get; init; }
}

public sealed record OrganizationServiceEntitlementDto
{
    public required Guid Id { get; init; }
    public required Guid OrganizationId { get; init; }
    public required PortalService Service { get; init; }
    public required DateTime EffectiveFrom { get; init; }
    public DateTime? EffectiveTo { get; init; }
    public required EntitlementConfigurationStatus ConfigurationStatus { get; init; }
    public Guid? SourceRequestId { get; init; }
    public required Guid ApprovedByUserId { get; init; }
    public string? Notes { get; init; }
    public string? EndReason { get; init; }
    public required bool IsEffective { get; init; }
    public required bool IsUsable { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required long Version { get; init; }
}

public sealed record CreateOrganizationServiceEntitlementRequest
{
    public required PortalService Service { get; init; }
    public required DateTime EffectiveFrom { get; init; }
    public DateTime? EffectiveTo { get; init; }
    public required EntitlementConfigurationStatus ConfigurationStatus { get; init; }
    public Guid? SourceRequestId { get; init; }
    public string? Notes { get; init; }
}

public sealed record UpdateOrganizationServiceEntitlementRequest
{
    public required DateTime EffectiveFrom { get; init; }
    public DateTime? EffectiveTo { get; init; }
    public required EntitlementConfigurationStatus ConfigurationStatus { get; init; }
    public string? Notes { get; init; }
    public required long Version { get; init; }
}

public sealed record EndOrganizationServiceEntitlementRequest
{
    public required DateTime EffectiveTo { get; init; }
    public required string Reason { get; init; }
    public required long Version { get; init; }
}

public sealed record PortalIntegrationRequestDto
{
    public required Guid Id { get; init; }
    public required string RequestNumber { get; init; }
    public Guid? OrganizationId { get; init; }
    public required string CandidateOrganizationName { get; init; }
    public required PortalIntegrationRequestType RequestType { get; init; }
    public required PortalIntegrationRequestSource Source { get; init; }
    public required PortalIntegrationRequestStatus Status { get; init; }
    public OrganizationKind? RequestedOrganizationKind { get; init; }
    public string? SourceReference { get; init; }
    public required string Summary { get; init; }
    public string? InternalNotes { get; init; }
    public required Guid RequestedByUserId { get; init; }
    public Guid? ReviewedByUserId { get; init; }
    public DateTime? ReviewedAt { get; init; }
    public string? DecisionReason { get; init; }
    public Guid? AppliedByUserId { get; init; }
    public DateTime? AppliedAt { get; init; }
    public string? ApplicationNotes { get; init; }
    public required IReadOnlyList<PortalService> RequestedServices { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required long Version { get; init; }
}

public sealed record CreatePortalIntegrationRequest
{
    public Guid? OrganizationId { get; init; }
    public string? CandidateOrganizationName { get; init; }
    public required PortalIntegrationRequestType RequestType { get; init; }
    public OrganizationKind? RequestedOrganizationKind { get; init; }
    public string? SourceReference { get; init; }
    public required string Summary { get; init; }
    public string? InternalNotes { get; init; }
    public IReadOnlyList<PortalService> RequestedServices { get; init; } = [];
}

public sealed record DecidePortalIntegrationRequest
{
    public required bool Approved { get; init; }
    public required string Reason { get; init; }
    public required long Version { get; init; }
}

public sealed record ApplyPortalIntegrationRequest
{
    public Guid? OrganizationId { get; init; }

    public required string Notes { get; init; }
    public required long Version { get; init; }
}

public sealed record CancelPortalIntegrationRequest
{
    public required string Reason { get; init; }
    public required long Version { get; init; }
}
