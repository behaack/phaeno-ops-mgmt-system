namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PhaenoPortal.App.Features.Accounts.Domain;

/// <summary>
/// Response DTO for user information.
/// </summary>
public sealed record UserDto
{
    /// <summary>
    /// Unique identifier for the user.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// The organization this user belongs to.
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
    /// Indicates whether the user account is active.
    /// </summary>
    public required bool IsActive { get; init; }

    /// <summary>
    /// Indicates whether the user can administer users in their own organization.
    /// </summary>
    public required bool IsOrganizationAdmin { get; init; }

    /// <summary>
    /// Invitation-first lifecycle status for the user account.
    /// </summary>
    public required UserAccountStatus Status { get; init; }

    /// <summary>
    /// Date and time when the user was created.
    /// </summary>
    public required DateTime CreatedAt { get; init; }

    /// <summary>
    /// Date and time when the user was last updated.
    /// </summary>
    public required DateTime UpdatedAt { get; init; }

    /// <summary>
    /// Date and time of the user's last login.
    /// </summary>
    public DateTime? LastLoginAt { get; init; }

    public required DateTime InvitedAt { get; init; }

    public Guid? InvitedByUserId { get; init; }

    public DateTime? InvitationAcceptedAt { get; init; }

    /// <summary>
    /// Optimistic concurrency version.
    /// </summary>
    public required long Version { get; init; }
}
