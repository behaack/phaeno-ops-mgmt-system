namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class CustomerDepartmentUserAccess
{
    public static Task<bool> HasActiveAsync(
        PSeqOperationsDbContext db,
        Guid organizationId,
        Guid departmentId,
        CancellationToken cancellationToken) =>
        db.OrganizationMemberships.AsNoTracking().AnyAsync(membership =>
            membership.OrganizationId == organizationId
            && membership.IsActive
            && membership.User != null
            && membership.User.IsActive
            && membership.User.Status == UserAccountStatus.Active
            && (membership.IsOrganizationAdmin || db.OrganizationDepartmentMemberships.Any(access =>
                access.OrganizationMembershipId == membership.Id
                && access.DepartmentId == departmentId
                && access.IsActive
                && access.Department.IsActive)),
            cancellationToken);
}
