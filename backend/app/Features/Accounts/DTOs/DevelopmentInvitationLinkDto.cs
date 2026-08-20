namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record DevelopmentInvitationLinkDto
{
    public required Guid InvitationId { get; init; }

    public required string InviteUrl { get; init; }

    public required DateTime ExpiresAt { get; init; }
}
