namespace PhaenoPortal.App.Features.Accounts.DTOs;

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
}
