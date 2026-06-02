namespace PhaenoPortal.App.Features.Accounts.DTOs;

/// <summary>
/// Request DTO for creating a user.
/// </summary>
public sealed record CreateUserRequest
{
    /// <summary>
    /// Organization ID the user belongs to.
    /// </summary>
    public required Guid OrganizationId { get; init; }

    /// <summary>
    /// Email address of the user.
    /// </summary>
    public required string Email { get; init; }

    /// <summary>
    /// First name of the user.
    /// </summary>
    public required string FirstName { get; init; }

    /// <summary>
    /// Last name of the user.
    /// </summary>
    public required string LastName { get; init; }

    /// <summary>
    /// Indicates whether the user can administer users in their own organization.
    /// </summary>
    public bool IsOrganizationAdmin { get; init; }
}
