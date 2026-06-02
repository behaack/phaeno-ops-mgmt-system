namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record UpdateMembershipRoleRequest
{
    public required bool IsOrganizationAdmin { get; init; }
}
