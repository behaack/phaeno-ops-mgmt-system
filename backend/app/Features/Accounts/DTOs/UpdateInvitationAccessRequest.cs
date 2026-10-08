namespace PhaenoPortal.App.Features.Accounts.DTOs;

public sealed record UpdateInvitationAccessRequest(
    bool IsOrganizationAdmin,
    IReadOnlyList<DepartmentInvitationAccessRequest> Departments,
    long Version);
