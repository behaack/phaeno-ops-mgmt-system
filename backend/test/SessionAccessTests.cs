namespace PhaenoPortal.Test;

using System.Reflection;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Crm.Services;

public class SessionAccessTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void PartnerLabNavigationRequiresEntitlementOrOwnedHistoryWithoutGrantingAdministration(bool partnerLabAccess)
    {
        var organization = new Organization("Partner", OrganizationKind.Partner);
        var user = new User("member@example.test", "Partner", "Member"); user.Activate();
        var membership = new OrganizationMembership(user.Id, organization.Id, false);
        AttachOrganization(membership, organization); user.Memberships.Add(membership);
        var department = new OrganizationDepartment(organization.Id, "main", "Main");
        var session = SessionEndpoints.ToSession(user, [], "ready", membership, selectedDepartment: department, partnerLabAccess: partnerLabAccess);
        Assert.Equal(partnerLabAccess, session.Capabilities.CanViewLabServiceOrders);
        Assert.Equal(partnerLabAccess, session.Capabilities.CanViewSampleShipping);
        Assert.Equal(partnerLabAccess, session.Capabilities.CanDownloadLabResults);
        Assert.False(session.Capabilities.CanViewLabServiceInvoices);
        Assert.False(session.Capabilities.CanCreateLabServiceRequests);
        Assert.False(session.Capabilities.CanManageOrganizations);
    }

    [Fact]
    public void CustomerLabInvoiceNavigationPreservesCurrentReceivablesReadAuthority()
    {
        var organization = new Organization("Customer", OrganizationKind.Customer);
        var user = new User("customer@example.test", "Customer", "Member"); user.Activate();
        var membership = new OrganizationMembership(user.Id, organization.Id, false);
        AttachOrganization(membership, organization); user.Memberships.Add(membership);
        var department = new OrganizationDepartment(organization.Id, "main", "Main");
        var session = SessionEndpoints.ToSession(user, [], "ready", membership, selectedDepartment: department);
        Assert.True(session.Capabilities.CanViewLabServiceOrders);
        Assert.True(session.Capabilities.CanViewLabServiceInvoices);
        Assert.False(session.Capabilities.CanCreateLabServiceRequests);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CommercialCrmAccessDoesNotDependOnBusinessRoleFeatureFlag(bool featureEnabled)
    {
        var organization = new Organization("Phaeno", OrganizationKind.Phaeno);
        var user = new User("commercial@example.test", "Commercial", "Staff"); user.Activate();
        var membership = new OrganizationMembership(user.Id, organization.Id, false); AttachOrganization(membership, organization); user.Memberships.Add(membership);
        var session = SessionEndpoints.ToSession(user, [], "ready", membership, [BusinessRole.CommercialOperator], featureEnabled);
        Assert.True(session.Capabilities.CanAccessCrm);
        Assert.False(session.Capabilities.CanAdministerCrm);
        Assert.False(session.IsPlatformAdmin);
        Assert.False(session.Capabilities.CanManageOrganizations);
        Assert.False(session.Capabilities.CanManageAllUsers);
        Assert.False(CrmAccess.CanAccess(user, [BusinessRole.CashOperator]));
        membership.Deactivate();
        Assert.False(CrmAccess.CanAccess(user, [BusinessRole.CommercialOperator]));
    }

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
