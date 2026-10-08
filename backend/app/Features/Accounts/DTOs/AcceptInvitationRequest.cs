namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record AcceptInvitationRequest
{
    public required string Token { get; init; }

    // Current clients send the revision they showed during access review.
    public long? Version { get; init; }

    public string? FirstName { get; init; }

    public string? LastName { get; init; }
}
