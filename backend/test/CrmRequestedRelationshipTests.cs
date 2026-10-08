namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;

public class CrmRequestedRelationshipTests
{
    [Theory]
    [InlineData(OrganizationKind.Customer)]
    [InlineData(OrganizationKind.Partner)]
    public void ProspectConversionRetainsTheRequestedTarget(OrganizationKind target)
    {
        Assert.Equal(target, CrmHandoff.ResolveRequestedRelationship(CrmHandoffType.RelationshipChange, OrganizationKind.Prospect, target));
    }

    [Theory]
    [InlineData(null, OrganizationKind.Customer)]
    [InlineData(OrganizationKind.Customer, OrganizationKind.Partner)]
    [InlineData(OrganizationKind.Prospect, OrganizationKind.Phaeno)]
    public void UnsupportedRelationshipChangesDoNotCreateAReviewRequest(OrganizationKind? current, OrganizationKind target)
    {
        Assert.Throws<InvalidOperationException>(() => CrmHandoff.ResolveRequestedRelationship(CrmHandoffType.RelationshipChange, current, target));
    }

    [Fact]
    public void ServiceRequestsRetainTheExistingOperationalRelationship()
    {
        Assert.Equal(OrganizationKind.Customer, CrmHandoff.ResolveRequestedRelationship(CrmHandoffType.ServiceChange, OrganizationKind.Customer, OrganizationKind.Partner));
    }
}
