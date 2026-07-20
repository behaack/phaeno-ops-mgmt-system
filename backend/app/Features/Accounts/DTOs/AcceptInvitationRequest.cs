namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record AcceptInvitationRequest
{
    public required string Token { get; init; }

    public string? FirstName { get; init; }

    public string? LastName { get; init; }
}
