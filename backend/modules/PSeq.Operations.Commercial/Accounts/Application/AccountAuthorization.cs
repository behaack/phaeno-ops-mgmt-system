namespace PSeq.Operations.Commercial.Accounts.Application;

using PSeq.Operations.Commercial.Accounts.Domain;

public static class AccountAuthorization
{
    public static bool IsPlatformAdmin(User user)
    {
        return user.IsActive
            && user.Status == UserAccountStatus.Active
            && user.Memberships.Any(membership => membership.GrantsPlatformAdmin());
    }

    public static bool CanManageOrganizationMembers(
        User user,
        Guid organizationId,
        OrganizationKind organizationKind)
    {
        if (IsPlatformAdmin(user))
        {
            return true;
        }

        if (organizationKind == OrganizationKind.Phaeno)
        {
            return false;
        }

        return user.Memberships.Any(membership =>
            membership.OrganizationId == organizationId
            && membership.IsActive
            && membership.IsOrganizationAdmin
            && membership.Organization?.IsActive == true);
    }

    public static bool CanInviteToOrganization(
        User user,
        Guid organizationId,
        OrganizationKind organizationKind)
    {
        return CanManageOrganizationMembers(user, organizationId, organizationKind);
    }

    public static bool HasActiveMembership(User user, Guid organizationId)
    {
        return user.Memberships.Any(membership =>
            membership.OrganizationId == organizationId
            && membership.IsActive
            && membership.Organization?.IsActive == true);
    }

    public static bool IsOrganizationAdmin(User user, Guid organizationId)
    {
        return user.Memberships.Any(membership =>
            membership.OrganizationId == organizationId
            && membership.IsActive
            && membership.IsOrganizationAdmin
            && membership.Organization?.IsActive == true);
    }

    public static bool CanViewOrganizationDatasets(User user, Guid organizationId)
    {
        return user.IsActive
            && user.Status == UserAccountStatus.Active
            && user.Memberships.Any(membership =>
                membership.OrganizationId == organizationId
                && membership.IsActive
                && membership.Organization is { IsActive: true } organization
                && organization.IsExternalOrganization());
    }
}
