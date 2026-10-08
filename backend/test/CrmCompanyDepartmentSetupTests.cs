namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Crm.Domain;

public sealed class CrmCompanyDepartmentSetupTests
{
    [Fact]
    public void DepartmentSetupDoesNotEnableAccessAndApprovalRetainsItsIdentity()
    {
        var company = new CrmCompany("Research Company", Guid.NewGuid());
        var setupId = Guid.NewGuid();
        company.SetUpDepartments(setupId);
        Assert.Null(company.AccessOrganizationId);
        Assert.Equal(setupId, company.SetupOrganizationId);
        Assert.Throws<InvalidOperationException>(() => company.EnablePortalAccess(Guid.NewGuid()));
        company.EnablePortalAccess(setupId);
        Assert.Null(company.SetupOrganizationId);
        Assert.Equal(setupId, company.AccessOrganizationId);
        Assert.Throws<InvalidOperationException>(() => company.SetUpDepartments(Guid.NewGuid()));
    }

    [Fact]
    public void MergeRetainsSetupAndRejectsCombiningDepartmentScopes()
    {
        var source = new CrmCompany("Source", Guid.NewGuid());
        var target = new CrmCompany("Target", Guid.NewGuid());
        var setupId = Guid.NewGuid();
        source.SetUpDepartments(setupId);
        source.TransferPortalAccessTo(target);
        Assert.Null(source.SetupOrganizationId);
        Assert.Equal(setupId, target.SetupOrganizationId);
        Assert.Null(target.AccessOrganizationId);
        source.EnablePortalAccess(Guid.NewGuid());
        Assert.Throws<InvalidOperationException>(() => source.TransferPortalAccessTo(target));
        Assert.Throws<InvalidOperationException>(() => target.TransferPortalAccessTo(source));
    }
}
