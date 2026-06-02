namespace PhaenoPortal.Test;

using System.Reflection;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Endpoints;

public class SessionAccessTests
{
    [Fact]
    public void GetActiveMembershipsReturnsOnlyActiveMembershipsInActiveOrganizations()
    {
        var user = new User("person@example.com", "Pat", "Lee");
        user.Activate();
        var activeOrganization = new Organization("Active Customer", OrganizationKind.Customer);
        var inactiveOrganization = new Organization("Inactive Customer", OrganizationKind.Customer);
        inactiveOrganization.Deactivate();
        var activeMembership = new OrganizationMembership(user.Id, activeOrganization.Id, isOrganizationAdmin: true);
        var inactiveMembership = new OrganizationMembership(user.Id, activeOrganization.Id, isOrganizationAdmin: false);
        inactiveMembership.Deactivate();
        var inactiveOrganizationMembership = new OrganizationMembership(
            user.Id,
            inactiveOrganization.Id,
            isOrganizationAdmin: true);
        AttachOrganization(activeMembership, activeOrganization);
        AttachOrganization(inactiveMembership, activeOrganization);
        AttachOrganization(inactiveOrganizationMembership, inactiveOrganization);
        user.Memberships.Add(activeMembership);
        user.Memberships.Add(inactiveMembership);
        user.Memberships.Add(inactiveOrganizationMembership);

        var memberships = SessionEndpoints.GetActiveMemberships(user);

        var membership = Assert.Single(memberships);
        Assert.Equal(activeMembership.Id, membership.Id);
    }

    [Fact]
    public void SessionInviteCapabilityMatchesAccountAccess()
    {
        var organization = new Organization("Customer", OrganizationKind.Customer);
        var user = new User("admin@example.com", "Org", "Admin");
        user.Activate();
        var membership = new OrganizationMembership(user.Id, organization.Id, isOrganizationAdmin: true);
        AttachOrganization(membership, organization);
        user.Memberships.Add(membership);

        Assert.True(SessionEndpoints.CanInviteToOrganization(
            user,
            organization.Id,
            organization.Kind));
    }

    private static void AttachOrganization(OrganizationMembership membership, Organization organization)
    {
        typeof(OrganizationMembership)
            .GetProperty(
                nameof(OrganizationMembership.Organization),
                BindingFlags.Instance | BindingFlags.Public)!
            .SetValue(membership, organization);
    }
}
