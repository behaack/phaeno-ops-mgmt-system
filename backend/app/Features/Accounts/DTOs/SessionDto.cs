namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PhaenoPortal.App.Features.Accounts.Domain;

public sealed record SessionDto
{
    public required string State { get; init; }

    public SessionUserDto? User { get; init; }

    public required IReadOnlyList<SessionMembershipDto> Memberships { get; init; }

    public required bool IsPlatformAdmin { get; init; }

    public SessionSelectedOrganizationDto? SelectedOrganization { get; init; }

    public required SessionCapabilitiesDto Capabilities { get; init; }
}

public sealed record SessionUserDto
{
    public required Guid Id { get; init; }

    public required string Email { get; init; }

    public required string FirstName { get; init; }

    public required string LastName { get; init; }

    public required UserAccountStatus Status { get; init; }
}

public sealed record SessionMembershipDto
{
    public required Guid MembershipId { get; init; }

    public required Guid OrganizationId { get; init; }

    public required string OrganizationName { get; init; }

    public required OrganizationKind OrganizationKind { get; init; }

    public required bool IsOrganizationAdmin { get; init; }
}

public sealed record SessionSelectedOrganizationDto
{
    public required Guid OrganizationId { get; init; }

    public required Guid MembershipId { get; init; }

    public required bool IsAvailable { get; init; }
}

public sealed record SessionCapabilitiesDto
{
    public required bool CanInviteUsers { get; init; }

    public required bool CanManageMembers { get; init; }

    public required bool CanChangeMemberRoles { get; init; }

    public required bool CanLeaveOrganization { get; init; }

    public required bool CanManageOrganizations { get; init; }

    public required bool CanManageAllUsers { get; init; }

    public required bool CanDisableUsers { get; init; }
}
