namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;

public class RelationshipManagementDomainTests
{
    private static readonly DateTime Now = new(2026, 7, 15, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void ServiceEligibilityFollowsOrganizationKind()
    {
        Assert.True(RelationshipPolicy.IsServiceAllowed(OrganizationKind.Customer, PortalService.PSeqLabService));
        Assert.False(RelationshipPolicy.IsServiceAllowed(OrganizationKind.Customer, PortalService.PSeqKit));
        Assert.True(RelationshipPolicy.IsServiceAllowed(OrganizationKind.Partner, PortalService.PSeqLabService));
        Assert.True(RelationshipPolicy.IsServiceAllowed(OrganizationKind.Partner, PortalService.PSeqKit));
        Assert.False(RelationshipPolicy.IsServiceAllowed(OrganizationKind.Prospect, PortalService.PSeqLabService));
        Assert.False(RelationshipPolicy.IsServiceAllowed(OrganizationKind.Phaeno, PortalService.PSeqLabService));
    }

    [Fact]
    public void ApprovedPreOrganizationRequestAuthorizesOnlyItsCompletedOrganizationAndService()
    {
        var actor = Guid.NewGuid();
        var organizationId = Guid.NewGuid();
        var request = CreateRequest(null, [PortalService.PSeqLabService]);

        request.Decide(approved: true, "Commercial approval recorded.", actor, Now);
        request.AssociateOrganization(organizationId);

        Assert.True(request.AuthorizesEntitlement(organizationId, PortalService.PSeqLabService));
        Assert.False(request.AuthorizesEntitlement(organizationId, PortalService.PSeqKit));
        Assert.False(request.AuthorizesEntitlement(Guid.NewGuid(), PortalService.PSeqLabService));
        Assert.Throws<InvalidOperationException>(() => request.AssociateOrganization(Guid.NewGuid()));

        request.MarkApplied("Organization and service configuration completed.", actor, Now.AddMinutes(1));

        Assert.True(request.AuthorizesEntitlement(organizationId, PortalService.PSeqLabService));
        Assert.Equal(PortalIntegrationRequestStatus.Applied, request.Status);
    }

    [Fact]
    public void RequestWithoutSelectedServiceCannotSourceAnEntitlement()
    {
        var organizationId = Guid.NewGuid();
        var request = CreateRequest(organizationId, []);

        request.Decide(approved: true, "Onboarding approved.", Guid.NewGuid(), Now);

        Assert.False(request.AuthorizesEntitlement(organizationId, PortalService.PSeqLabService));
    }

    [Fact]
    public void EndingEntitlementRequiresAndPreservesAReason()
    {
        var entitlement = new OrganizationServiceEntitlement(
            Guid.NewGuid(),
            PortalService.PSeqLabService,
            Now,
            null,
            EntitlementConfigurationStatus.Ready,
            Guid.NewGuid(),
            null,
            "Configured service.");

        Assert.Throws<ArgumentException>(() => entitlement.End(Now.AddDays(1), " "));

        entitlement.End(Now.AddDays(1), "Commercial term ended.");

        Assert.Equal(Now.AddDays(1), entitlement.EffectiveTo);
        Assert.Equal("Commercial term ended.", entitlement.EndReason);
        Assert.False(entitlement.IsEffectiveAt(Now.AddDays(2)));
    }

    private static PortalIntegrationRequest CreateRequest(
        Guid? organizationId,
        IEnumerable<PortalService> services) =>
        new(
            organizationId,
            "Acceptance organization",
            PortalIntegrationRequestType.Onboarding,
            PortalIntegrationRequestSource.Manual,
            OrganizationKind.Customer,
            null,
            "Approve the Portal relationship.",
            null,
            Guid.NewGuid(),
            services);
}
