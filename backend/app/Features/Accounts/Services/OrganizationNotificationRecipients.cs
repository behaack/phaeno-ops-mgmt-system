namespace PhaenoPortal.App.Features.Accounts.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>Resolve current delivery authority when a queued notice is dispatched.</summary>
internal static class OrganizationNotificationRecipients
{
    public static async Task<List<string>> ReadAsync(PSeqOperationsDbContext dbContext,
        Guid organizationId, Guid? departmentId, Guid? recipientUserId,
        bool includeDepartmentRouting, CancellationToken cancellationToken,
        bool allowInactiveOrganization = false)
    {
        if (!await dbContext.Organizations.AsNoTracking().AnyAsync(
            organization => organization.Id == organizationId && (organization.IsActive || allowInactiveOrganization), cancellationToken))
            return [];

        string? routingEmail = null;
        if (departmentId.HasValue)
        {
            var department = await dbContext.OrganizationDepartments.AsNoTracking()
                .Where(value => value.Id == departmentId.Value && value.OrganizationId == organizationId
                    && value.IsActive && value.Organization.IsActive)
                .Select(value => new { Email = value.NotificationEmail ?? value.Organization.DefaultNotificationEmail })
                .SingleOrDefaultAsync(cancellationToken);
            if (department is null) return [];
            if (includeDepartmentRouting) routingEmail = department.Email;
        }

        var recipients = await dbContext.OrganizationMemberships.AsNoTracking()
            .Where(membership => membership.OrganizationId == organizationId
                && (membership.Organization!.IsActive || allowInactiveOrganization) && membership.IsActive
                && (!recipientUserId.HasValue || membership.UserId == recipientUserId.Value)
                && membership.User!.IsActive && membership.User.Status == UserAccountStatus.Active
                && (membership.IsOrganizationAdmin || (departmentId.HasValue
                    && dbContext.OrganizationDepartmentMemberships.Any(access =>
                        access.OrganizationMembershipId == membership.Id
                        && access.DepartmentId == departmentId.Value
                        && access.Department.OrganizationId == organizationId
                        && access.Department.IsActive && access.IsActive && access.IsDepartmentAdmin))))
            .Select(membership => membership.User!.Email)
            .ToListAsync(cancellationToken);
        if (!string.IsNullOrWhiteSpace(routingEmail)) recipients.Add(routingEmail);
        return recipients.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }
}
