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
