namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record DeclineInvitationRequest
{
    public required string Token { get; init; }
}
