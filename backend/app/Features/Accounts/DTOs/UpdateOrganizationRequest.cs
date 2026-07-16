namespace PhaenoPortal.App.Features.Accounts.DTOs;

using PSeq.Operations.Commercial.Accounts.Domain;

public sealed record UpdateOrganizationRequest
{
    public required string Name { get; init; }

    public string? Description { get; init; }

    public required PortalReadinessStatus PortalReadiness { get; init; }

    public string? PortalReadinessNote { get; init; }

    public required long Version { get; init; }
}
