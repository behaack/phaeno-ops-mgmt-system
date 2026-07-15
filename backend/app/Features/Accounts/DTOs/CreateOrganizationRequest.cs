namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PhaenoPortal.App.Features.Accounts.Domain;

/// <summary>
/// Request DTO for creating an organization.
/// </summary>
public sealed record CreateOrganizationRequest
{
    /// <summary>
    /// Name of the organization.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Optional description of the organization.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Authentication and authorization category for the organization.
    /// </summary>
    public OrganizationKind Kind { get; init; } = OrganizationKind.Prospect;

    public PortalReadinessStatus PortalReadiness { get; init; } = PortalReadinessStatus.NotReviewed;

    public string? PortalReadinessNote { get; init; }
}
