namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;

public sealed class DepartmentAccessDomainTests
{
    [Fact]
    public void NewOrganizationBeginsWithOneActiveGeneralDepartment()
    {
        var organization = new Organization("Reference Customer", OrganizationKind.Customer);

        var department = Assert.Single(organization.Departments);
        Assert.Equal(OrganizationDepartment.DefaultCode, department.Code);
        Assert.Equal(OrganizationDepartment.DefaultName, department.Name);
        Assert.True(department.IsDefault);
        Assert.True(department.IsActive);
        Assert.Equal(organization.Id, department.OrganizationId);
    }

    [Fact]
    public void DepartmentConfigurationUsesNullAsInheritanceAndProtectsDefault()
    {
        var department = new OrganizationDepartment(
            Guid.NewGuid(),
            " genomics ",
            " Genomics ",
            " Sequencing group ");

        department.UpdateConfiguration(
            true,
            "billing@example.com",
            null,
            "Ship frozen",
            null);

        Assert.Equal("GENOMICS", department.Code);
        Assert.True(department.PurchaseOrderRequired);
        Assert.Null(department.NotificationEmail);
        department.MakeDefault();
        Assert.Throws<InvalidOperationException>(department.Deactivate);
    }

    [Fact]
    public void DepartmentOverridesResolveIndependentlyAndClearingRestoresOrganizationDefaults()
    {
        var organization = new Organization("Configured customer", OrganizationKind.Customer);
        organization.UpdateConfigurationDefaults(new(true, " billing@example.com ", "notice@example.com", "Frozen", "Portal"));
        var department = organization.Departments.Single();
        var inherited = department.ResolveConfiguration(organization);
        Assert.True(inherited.PurchaseOrderRequired);
        Assert.Equal("billing@example.com", inherited.BillingContactEmail);
        department.UpdateConfiguration(false, null, "team@example.com", null, "Team instructions");
        var overridden = department.ResolveConfiguration(organization);
        Assert.False(overridden.PurchaseOrderRequired);
        Assert.Equal("billing@example.com", overridden.BillingContactEmail);
        Assert.Equal("team@example.com", overridden.NotificationEmail);
        Assert.Equal("Frozen", overridden.ShippingInstructions);
        Assert.Equal("Team instructions", overridden.ResultDeliveryInstructions);
        department.UpdateConfiguration(null, null, null, null, null);
        Assert.Equal(inherited, department.ResolveConfiguration(organization));
        organization.UpdateConfigurationDefaults(new(null, " ", null, null, null));
        Assert.Equal(new DepartmentConfiguration(null, null, null, null, null), department.ResolveConfiguration(organization));
        // Previously resolved values remain unchanged after a defaults edit.
        Assert.Equal("Frozen", inherited.ShippingInstructions);
        Assert.Throws<ArgumentException>(() => department.ResolveConfiguration(new Organization("Other", OrganizationKind.Customer)));
    }

    [Fact]
    public void InvalidOrganizationDefaultsDoNotPartiallyChangeConfiguration()
    {
        var organization = new Organization("Configured customer", OrganizationKind.Customer);
        organization.UpdateConfigurationDefaults(new(true, null, null, "Frozen", null));
        var original = organization.GetConfigurationDefaults();
        Assert.Throws<ArgumentException>(() => organization.UpdateConfigurationDefaults(new(false, "invalid", null, null, null)));
        Assert.Throws<ArgumentException>(() => organization.UpdateConfigurationDefaults(new(false, null, null, new string('x', 2001), null)));
        Assert.Equal(original, organization.GetConfigurationDefaults());
    }

    [Fact]
    public void ContactUserIdentityLinkRequiresAReasonAndRetainsHistory()
    {
        Assert.Throws<ArgumentException>(() =>
            new CrmContactUserLink(Guid.NewGuid(), Guid.NewGuid(), " "));

        var link = new CrmContactUserLink(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Verified by account administrator");

        link.Deactivate();
        Assert.False(link.IsActive);

        link.Reactivate("Reverified after account recovery");
        Assert.True(link.IsActive);
        Assert.Equal("Reverified after account recovery", link.LinkReason);
    }
}
