namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record InvitationPreviewRequest(string Token);

// Only the details needed by the holder of a valid invitation link before sign-in.
public sealed record InvitationPreviewDto(
    string Email,
    string? FirstName,
    string? LastName,
    string OrganizationName,
    DateTime ExpiresAt);
