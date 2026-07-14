namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PhaenoPortal.App.Features.Accounts.Domain;

public sealed record ConvertOrganizationRequest
{
    public required OrganizationKind TargetKind { get; init; }

    public required long Version { get; init; }
}
