namespace PhaenoPortal.Test;

using System.Reflection;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;

public class AccountAuthorizationTests
{
    [Fact]
    public void PlatformAdminCanManageCustomerOrganizationMembers()
    {
        var phaenoOrganization = new Organization("Phaeno", OrganizationKind.Phaeno);
        var customerOrganization = new Organization("Customer", OrganizationKind.Customer);
        var user = new User("admin@phaeno.com", "Phaeno", "Admin");
        user.Activate();
        var membership = new OrganizationMembership(user.Id, phaenoOrganization.Id, isOrganizationAdmin: true);
        AttachOrganization(membership, phaenoOrganization);
        user.Memberships.Add(membership);

        Assert.True(AccountAuthorization.IsPlatformAdmin(user));
        Assert.True(AccountAuthorization.CanManageOrganizationMembers(
            user,
            customerOrganization.Id,
            customerOrganization.Kind));
    }

    [Fact]
    public void CustomerOrgAdminCannotManagePhaenoOrganizationMembers()
    {
        var customerOrganization = new Organization("Customer", OrganizationKind.Customer);
        var phaenoOrganization = new Organization("Phaeno", OrganizationKind.Phaeno);
        var user = new User("admin@example.com", "Org", "Admin");
        user.Activate();
        var membership = new OrganizationMembership(user.Id, customerOrganization.Id, isOrganizationAdmin: true);
        AttachOrganization(membership, customerOrganization);
        user.Memberships.Add(membership);

        Assert.False(AccountAuthorization.IsPlatformAdmin(user));
        Assert.False(AccountAuthorization.CanManageOrganizationMembers(
            user,
            phaenoOrganization.Id,
            phaenoOrganization.Kind));
    }

    [Fact]
    public void CustomerOrgAdminCanManageOwnCustomerOrganizationMembers()
    {
        var organization = new Organization("Customer", OrganizationKind.Customer);
        var user = new User("admin@example.com", "Org", "Admin");
        user.Activate();
        var membership = new OrganizationMembership(user.Id, organization.Id, isOrganizationAdmin: true);
        AttachOrganization(membership, organization);
        user.Memberships.Add(membership);

        Assert.True(AccountAuthorization.CanManageOrganizationMembers(
            user,
            organization.Id,
            organization.Kind));
    }

    [Fact]
    public void ProspectOrgAdminCanManageOwnProspectOrganizationMembers()
    {
        var organization = new Organization("Prospect", OrganizationKind.Prospect);
        var user = new User("admin@example.com", "Prospect", "Admin");
        user.Activate();
        var membership = new OrganizationMembership(user.Id, organization.Id, isOrganizationAdmin: true);
        AttachOrganization(membership, organization);
        user.Memberships.Add(membership);

        Assert.True(AccountAuthorization.CanManageOrganizationMembers(
            user,
            organization.Id,
            organization.Kind));
    }

    [Fact]
    public void DisabledPlatformAdminCannotManageMembers()
    {
        var phaenoOrganization = new Organization("Phaeno", OrganizationKind.Phaeno);
        var customerOrganization = new Organization("Customer", OrganizationKind.Customer);
        var user = new User("admin@phaeno.com", "Phaeno", "Admin");
        user.Activate();
        var membership = new OrganizationMembership(user.Id, phaenoOrganization.Id, isOrganizationAdmin: true);
        AttachOrganization(membership, phaenoOrganization);
        user.Memberships.Add(membership);

        user.Deactivate();

        Assert.False(AccountAuthorization.IsPlatformAdmin(user));
        Assert.False(AccountAuthorization.CanManageOrganizationMembers(
            user,
            customerOrganization.Id,
            customerOrganization.Kind));
    }

    [Fact]
    public void ActiveProspectMemberCanViewOnlyOwnOrganizationDatasets()
    {
        var prospect = new Organization("Prospect", OrganizationKind.Prospect);
        var otherProspect = new Organization("Other prospect", OrganizationKind.Prospect);
        var user = new User("member@example.com", "Prospect", "Member");
        user.Activate();
        var membership = new OrganizationMembership(user.Id, prospect.Id, isOrganizationAdmin: false);
        AttachOrganization(membership, prospect);
        user.Memberships.Add(membership);

        Assert.True(AccountAuthorization.CanViewOrganizationDatasets(user, prospect.Id));
        Assert.False(AccountAuthorization.CanViewOrganizationDatasets(user, otherProspect.Id));

        prospect.ConvertProspectTo(OrganizationKind.Partner);
        Assert.True(AccountAuthorization.CanViewOrganizationDatasets(user, prospect.Id));

        prospect.Deactivate();
        Assert.False(AccountAuthorization.CanViewOrganizationDatasets(user, prospect.Id));
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
