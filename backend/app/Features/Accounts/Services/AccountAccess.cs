namespace PhaenoPortal.App.Features.Accounts.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class AccountAccess
{
    public static async Task<User?> ReadActiveActorAsync(
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var identity = externalIdentityContext.Read(httpContext);
        if (identity == null)
        {
            return null;
        }

        var user = await dbContext.Users
            .Include(u => u.Memberships)
            .ThenInclude(m => m.Organization)
            .FirstOrDefaultAsync(
                u => u.ExternalIdentityProvider == identity.Provider
                    && u.ExternalSubjectId == identity.SubjectId,
                cancellationToken);

        if (user is not { IsActive: true, Status: UserAccountStatus.Active })
        {
            return null;
        }

        return user;
    }

    public static bool IsPlatformAdmin(User user)
    {
        return user.IsActive
            && user.Status == UserAccountStatus.Active
            && user.Memberships.Any(m => m.GrantsPlatformAdmin());
    }

    public static bool CanManageOrganizationMembers(User user, Guid organizationId, OrganizationKind organizationKind)
    {
        if (IsPlatformAdmin(user))
        {
            return true;
        }

        if (organizationKind == OrganizationKind.Phaeno)
        {
            return false;
        }

        return user.Memberships.Any(m =>
            m.OrganizationId == organizationId
            && m.IsActive
            && m.IsOrganizationAdmin
            && m.Organization?.IsActive == true);
    }

    public static bool CanInviteToOrganization(User user, Guid organizationId, OrganizationKind organizationKind)
    {
        return CanManageOrganizationMembers(user, organizationId, organizationKind);
    }
}
