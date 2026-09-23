namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.RelationshipManagement.DTOs;

public class RelationshipManagementDomainTests
{
    private static readonly DateTime Now = new(2026, 7, 15, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("  Service configured.  ", "Service configured.")]
    public void CompletionNotesAreOptionalAndRetainCompletionIdentity(string? notes, string? expectedNotes)
    {
        var actor = Guid.NewGuid();
        var request = CreateRequest(Guid.NewGuid(), []);
        request.Decide(true, null, actor, Now);
        request.MarkApplied(notes, actor, Now.AddMinutes(1));
        Assert.Equal(PortalIntegrationRequestStatus.Applied, request.Status);
        Assert.Equal(expectedNotes, request.ApplicationNotes);
        Assert.Equal(actor, request.AppliedByUserId);
        Assert.Equal(Now.AddMinutes(1), request.AppliedAt);
    }

    [Fact]
    public void CompletionStillRequiresApprovalAndRejectsOversizedNotesBeforeChangingState()
    {
        var actor = Guid.NewGuid();
        var request = CreateRequest(Guid.NewGuid(), []);
        Assert.Throws<InvalidOperationException>(() => request.MarkApplied(null, actor, Now));
        request.Decide(true, null, actor, Now);
        Assert.Throws<ArgumentException>(() => request.MarkApplied(new string('x', 2001), actor, Now));
        Assert.Equal(PortalIntegrationRequestStatus.Approved, request.Status);
        Assert.Null(request.AppliedByUserId);
        Assert.Null(request.AppliedAt);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CancellationRequiresAReasonBeforeChangingState(bool approved)
    {
        var actor = Guid.NewGuid();
        var request = CreateRequest(Guid.NewGuid(), []);
        if (approved) request.Decide(true, "Approved", actor, Now);
        var previousStatus = request.Status;
        var previousReason = request.DecisionReason;
        var previousReviewer = request.ReviewedByUserId;
        var previousReviewedAt = request.ReviewedAt;
        foreach (var reason in new[] { "", "   ", new string('x', 2001) })
        {
            Assert.Throws<ArgumentException>(() => request.Cancel(reason, actor, Now.AddMinutes(1)));
            Assert.Equal(previousStatus, request.Status);
            Assert.Equal(previousReason, request.DecisionReason);
            Assert.Equal(previousReviewer, request.ReviewedByUserId);
            Assert.Equal(previousReviewedAt, request.ReviewedAt);
        }
        request.Cancel("  Customer withdrew the request.  ", actor, Now.AddMinutes(1));
        Assert.Equal(PortalIntegrationRequestStatus.Cancelled, request.Status);
        Assert.Equal("Customer withdrew the request.", request.DecisionReason);
        Assert.Equal(actor, request.ReviewedByUserId);
        Assert.Equal(Now.AddMinutes(1), request.ReviewedAt);
    }

    [Fact]
    public void CompletionPayloadMayOmitNotes()
    {
        var input = System.Text.Json.JsonSerializer.Deserialize<ApplyPortalIntegrationRequest>(
            """{"version":1}""", new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))!;
        Assert.Null(input.Notes);
        Assert.Equal(1, input.Version);
    }

    [Fact]
    public void DirectOrganizationCreationStillDefaultsOrderingAuthorizationOn()
    {
        Assert.True(new CreateOrganizationRequest
        {
            Name = "Customer",
            Kind = OrganizationKind.Customer
        }.OrderingAuthorized);
    }

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

    [Fact]
    public void ExistingEntitlementCanBeMadeReadyAndLinkedToApprovedRequest()
    {
        var sourceRequestId = Guid.NewGuid();
        var entitlement = new OrganizationServiceEntitlement(
            Guid.NewGuid(),
            PortalService.PSeqLabService,
            Now,
            null,
            EntitlementConfigurationStatus.Pending,
            Guid.NewGuid(),
            null,
            null);

        entitlement.Update(
            Now,
            null,
            EntitlementConfigurationStatus.Ready,
            sourceRequestId,
            "Configured from the approved service request.");

        Assert.Equal(EntitlementConfigurationStatus.Ready, entitlement.ConfigurationStatus);
        Assert.Equal(sourceRequestId, entitlement.SourceRequestId);
        Assert.Equal("Configured from the approved service request.", entitlement.Notes);
    }

    [Theory]
    [InlineData(PortalIntegrationRequestType.Onboarding)]
    [InlineData(PortalIntegrationRequestType.Evaluation)]
    [InlineData(PortalIntegrationRequestType.Offboarding)]
    [InlineData(PortalIntegrationRequestType.ServiceChange)]
    public void RoutineApprovalsAllowEmptyNotesAndRetainDecisionIdentity(PortalIntegrationRequestType type)
    {
        var actor = Guid.NewGuid();
        foreach (var note in new string?[] { null, "", "  " })
        {
            var request = CreateRequest(null, [], type);
            request.Decide(true, note, actor, Now);
            Assert.Equal(PortalIntegrationRequestStatus.Approved, request.Status);
            Assert.Equal(actor, request.ReviewedByUserId);
            Assert.Equal(Now, request.ReviewedAt);
            Assert.Null(request.DecisionReason);
        }
        var annotated = CreateRequest(null, [], type);
        annotated.Decide(true, "  Reviewed the request.  ", actor, Now);
        Assert.Equal("Reviewed the request.", annotated.DecisionReason);
        var tooLong = CreateRequest(null, [], type);
        Assert.Throws<ArgumentException>(() => tooLong.Decide(true, new string('x', 2001), actor, Now));
        Assert.Equal(PortalIntegrationRequestStatus.PendingReview, tooLong.Status);
        Assert.Null(tooLong.ReviewedAt);
    }

    [Theory]
    [InlineData(PortalIntegrationRequestType.Onboarding)]
    [InlineData(PortalIntegrationRequestType.Evaluation)]
    [InlineData(PortalIntegrationRequestType.Offboarding)]
    [InlineData(PortalIntegrationRequestType.ServiceChange)]
    [InlineData(PortalIntegrationRequestType.RelationshipChange)]
    [InlineData(PortalIntegrationRequestType.SalesAssistedOrder)]
    public void EveryDeclineRequiresAReasonBeforeChangingDecisionState(PortalIntegrationRequestType type)
    {
        var request = CreateRequest(null, [], type);
        var actor = Guid.NewGuid();
        foreach (var reason in new string?[] { null, "", "  " })
        {
            Assert.Throws<ArgumentException>(() => request.Decide(false, reason, actor, Now));
            Assert.Equal(PortalIntegrationRequestStatus.PendingReview, request.Status);
            Assert.Null(request.ReviewedByUserId);
            Assert.Null(request.ReviewedAt);
        }
        request.Decide(false, "  Correct the request.  ", actor, Now);
        Assert.Equal(PortalIntegrationRequestStatus.Declined, request.Status);
        Assert.Equal("Correct the request.", request.DecisionReason);
        Assert.Equal(actor, request.ReviewedByUserId);
        Assert.Equal(Now, request.ReviewedAt);
    }

    [Theory]
    [InlineData(PortalIntegrationRequestType.RelationshipChange)]
    [InlineData(PortalIntegrationRequestType.SalesAssistedOrder)]
    public void OtherApprovalsStillRequireReasons(PortalIntegrationRequestType type)
    {
        var request = CreateRequest(null, [], type);
        Assert.Throws<ArgumentException>(() => request.Decide(true, null, Guid.NewGuid(), Now));
        Assert.Equal(PortalIntegrationRequestStatus.PendingReview, request.Status);
    }

    [Fact]
    public void DecisionPayloadMayOmitAnApprovalNote()
    {
        var input = System.Text.Json.JsonSerializer.Deserialize<DecidePortalIntegrationRequest>(
            """{"approved":true,"version":1}""", new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))!;
        Assert.True(input.Approved);
        Assert.Null(input.Reason);
    }

    private static PortalIntegrationRequest CreateRequest(
        Guid? organizationId,
        IEnumerable<PortalService> services,
        PortalIntegrationRequestType requestType = PortalIntegrationRequestType.Onboarding) =>
        new(
            organizationId,
            "Acceptance organization",
            requestType,
            PortalIntegrationRequestSource.Manual,
            OrganizationKind.Customer,
            null,
            "Approve the Portal relationship.",
            null,
            Guid.NewGuid(),
            services);
}
