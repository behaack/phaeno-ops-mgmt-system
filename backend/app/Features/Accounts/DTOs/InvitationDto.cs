namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PSeq.Operations.Commercial.Accounts.Domain;

public sealed record InvitationDto
{
    public required Guid Id { get; init; }

    public required Guid OrganizationId { get; init; }

    public string? OrganizationName { get; init; }

    public required string Email { get; init; }

    public required string NormalizedEmail { get; init; }

    public required bool IsOrganizationAdmin { get; init; }

    public required InvitationStatus Status { get; init; }

    public required bool IsExpired { get; init; }

    public required DateTime ExpiresAt { get; init; }

    public DateTime? AcceptedAt { get; init; }

    public Guid? AcceptedByUserId { get; init; }

    public DateTime? RevokedAt { get; init; }

    public Guid? RevokedByUserId { get; init; }

    public DateTime? DeclinedAt { get; init; }

    public Guid? DeclinedByUserId { get; init; }

    public DateTime? LastSentAt { get; init; }

    public Guid? LastSentByUserId { get; init; }

    public required int SendCount { get; init; }

    public string? LastEmailProviderMessageId { get; init; }

    public string? LastSendError { get; init; }

    public required DateTime CreatedAt { get; init; }

    public required DateTime UpdatedAt { get; init; }

    public required long Version { get; init; }
}
