namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record AcceptInvitationRequest
{
    public required string Token { get; init; }

    public required string FirstName { get; init; }

    public required string LastName { get; init; }
}
