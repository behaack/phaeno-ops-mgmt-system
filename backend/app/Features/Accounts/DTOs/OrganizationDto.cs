namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PhaenoPortal.App.Features.Accounts.Domain;

/// <summary>
/// Response DTO for organization information.
/// </summary>
public sealed record OrganizationDto
{
    /// <summary>
    /// Unique identifier for the organization.
    /// </summary>
    public required Guid Id { get; init; }

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
    public required OrganizationKind Kind { get; init; }

    public required PortalReadinessStatus PortalReadiness { get; init; }

    public string? PortalReadinessNote { get; init; }

    /// <summary>
    /// Indicates whether the organization is active.
    /// </summary>
    public required bool IsActive { get; init; }

    /// <summary>
    /// Date and time when the organization was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Date and time when the organization was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }

    /// <summary>
    /// Optimistic concurrency version.
    /// </summary>
    public required long Version { get; init; }
}
