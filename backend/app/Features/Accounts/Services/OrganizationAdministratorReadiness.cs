namespace PhaenoPortal.App.Features.Accounts.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;

/// <summary>Readiness evidence only; this does not grant organization-wide authority.</summary>
internal static class OrganizationAdministratorReadiness
{
    public static Task<bool> HasActiveAsync(PSeqOperationsDbContext db, Guid organizationId,
        CancellationToken cancellationToken, Guid? departmentId = null) =>
        db.OrganizationMemberships.AsNoTracking().AnyAsync(member =>
            member.OrganizationId == organizationId && member.IsActive
            && member.User != null && member.User.IsActive && member.User.Status == UserAccountStatus.Active
            && (!departmentId.HasValue || db.OrganizationDepartments.Any(department =>
                department.Id == departmentId.Value && department.OrganizationId == organizationId && department.IsActive))
            && (member.IsOrganizationAdmin || db.OrganizationDepartmentMemberships.Any(access =>
                access.OrganizationMembershipId == member.Id && access.IsActive && access.IsDepartmentAdmin
                && access.Department.OrganizationId == organizationId && access.Department.IsActive
                && (!departmentId.HasValue || access.DepartmentId == departmentId.Value))), cancellationToken);

    public static Task<bool> HasPendingInvitationAsync(PSeqOperationsDbContext db, Guid organizationId,
        DateTime utcNow, CancellationToken cancellationToken) =>
        db.OrganizationInvitations.AsNoTracking().AnyAsync(invitation =>
            invitation.OrganizationId == organizationId && invitation.Status == InvitationStatus.Pending
            && invitation.ExpiresAt > utcNow
            && (invitation.IsOrganizationAdmin || db.OrganizationInvitationDepartments.Any(intent =>
                intent.OrganizationInvitationId == invitation.Id && intent.IsDepartmentAdmin
                && intent.Department.OrganizationId == organizationId && intent.Department.IsActive))
            && !db.OrganizationInvitationDepartments.Any(intent => intent.OrganizationInvitationId == invitation.Id
                && (!intent.Department.IsActive || intent.Department.OrganizationId != organizationId)), cancellationToken);
}
