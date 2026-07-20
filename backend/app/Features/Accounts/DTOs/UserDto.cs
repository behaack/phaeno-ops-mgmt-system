namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;

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
    /// Email address of the user.
    /// </summary>
    public required string Email { get; init; }

    /// <summary>
    /// Normalized email address used for matching and uniqueness.
    /// </summary>
    public required string NormalizedEmail { get; init; }

    /// <summary>
    /// External identity provider linked to the user.
    /// </summary>
    public string? ExternalIdentityProvider { get; init; }

    /// <summary>
    /// External identity subject linked to the user.
    /// </summary>
    public string? ExternalSubjectId { get; init; }

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

    public required IReadOnlyList<OrganizationMembershipDto> Memberships { get; init; }

    /// <summary>
    /// Optimistic concurrency version.
    /// </summary>
    public required long Version { get; init; }
}

public sealed record OrganizationMembershipDto
{
    public required Guid Id { get; init; }

    public required Guid OrganizationId { get; init; }

    public string? OrganizationName { get; init; }

    public OrganizationKind? OrganizationKind { get; init; }

    public required bool IsActive { get; init; }

    public required bool IsOrganizationAdmin { get; init; }

    public required DateTime CreatedAt { get; init; }

    public required DateTime UpdatedAt { get; init; }

    public required long Version { get; init; }
}

public sealed record PhaenoUserAdministrationDto
{
    public required Guid Id { get; init; }

    public required string Email { get; init; }

    public required string FirstName { get; init; }

    public required string LastName { get; init; }

    public required bool IsActive { get; init; }

    public required UserAccountStatus Status { get; init; }

    public required bool IsPlatformAdministrator { get; init; }

    public required Guid MembershipId { get; init; }

    public required long UserVersion { get; init; }

    public required long MembershipVersion { get; init; }

    public required IReadOnlyList<PhaenoLabRoleStateDto> LabRoles { get; init; }
}

public sealed record PhaenoLabRoleStateDto
{
    public required LabRole Role { get; init; }

    public required bool IsActive { get; init; }

    public long? Version { get; init; }
}
