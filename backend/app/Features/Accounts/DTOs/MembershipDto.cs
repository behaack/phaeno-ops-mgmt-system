namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PhaenoPortal.App.Features.Accounts.Domain;

public sealed record MembershipDto
{
    public required Guid Id { get; init; }

    public required Guid UserId { get; init; }

    public required string UserEmail { get; init; }

    public required string UserFirstName { get; init; }

    public required string UserLastName { get; init; }

    public required Guid OrganizationId { get; init; }

    public required string OrganizationName { get; init; }

    public required OrganizationKind OrganizationKind { get; init; }

    public required bool IsActive { get; init; }

    public required bool IsOrganizationAdmin { get; init; }

    public required DateTime CreatedAt { get; init; }

    public required DateTime UpdatedAt { get; init; }

    public required long Version { get; init; }
}
