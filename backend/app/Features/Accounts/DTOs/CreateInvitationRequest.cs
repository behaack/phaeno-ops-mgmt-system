namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record CreateInvitationRequest
{
    public required Guid OrganizationId { get; init; }

    public required string Email { get; init; }

    public bool IsOrganizationAdmin { get; init; }
}
