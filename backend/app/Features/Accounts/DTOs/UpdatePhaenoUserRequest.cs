namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed record UpdatePhaenoUserRequest
{
    public required string FirstName { get; init; }

    public required string LastName { get; init; }

    public required bool IsPlatformAdministrator { get; init; }

    public required long UserVersion { get; init; }

    public required long MembershipVersion { get; init; }

    public required IReadOnlyList<PhaenoLabRoleUpdateDto> LabRoles { get; init; }

    public IReadOnlyList<PhaenoBusinessRoleUpdateDto> BusinessRoles { get; init; } = [];
}

public sealed record PhaenoBusinessRoleUpdateDto
{
    public required BusinessRole Role { get; init; }

    public required bool IsActive { get; init; }

    public long? Version { get; init; }
}

public sealed record PhaenoLabRoleUpdateDto
{
    public required LabRole Role { get; init; }

    public required bool IsActive { get; init; }

    public long? Version { get; init; }
}
