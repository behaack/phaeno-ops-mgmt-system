namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.RelationshipManagement.Controllers;
using PhaenoPortal.App.Features.RelationshipManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed partial class InvitationAcceptancePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task DepartmentAdministratorInvitationWaitsAndAcceptanceCompletesInSameTransaction()
    {
        await using var scope = await Scope.Create();
        var actor = await scope.Db.Users.SingleAsync();
        var request = new PortalIntegrationRequest(scope.Organization.Id, scope.Organization.Name,
            PortalIntegrationRequestType.Onboarding, PortalIntegrationRequestSource.FirstPartyCrm,
            OrganizationKind.Customer, null, "SIMULATED department onboarding", null, actor.Id, []);
        request.Decide(true, "Approved", actor.Id, DateTime.UtcNow);
        scope.Db.Add(request); await scope.Db.SaveChangesAsync();
        var contact = await scope.Contact();
        var invitation = await scope.Invite(contact);
        var intent = await scope.Db.OrganizationInvitationDepartments.SingleAsync(value => value.OrganizationInvitationId == invitation.Id);
        intent.SetDepartmentAdmin(true); await scope.Db.SaveChangesAsync();
        var controller = new RelationshipManagementController(scope.Db, scope.AdminIdentity)
            { ControllerContext = new() { HttpContext = scope.Http } };
        Assert.Equal("Invited", (await controller.GetOrganizationSummary(scope.Organization.Id, default)).AdministratorStatus);
        scope.Research.Deactivate(); await scope.Db.SaveChangesAsync();
        Assert.Equal("Missing", (await controller.GetOrganizationSummary(scope.Organization.Id, default)).AdministratorStatus);
        scope.Research.Reactivate(); intent.SetDepartmentAdmin(false); await scope.Db.SaveChangesAsync();
        Assert.Equal("Missing", (await controller.GetOrganizationSummary(scope.Organization.Id, default)).AdministratorStatus);
        intent.SetDepartmentAdmin(true); await scope.Db.SaveChangesAsync();
        Assert.Equal(PortalIntegrationRequestStatus.Approved, request.Status);
        await scope.Accept(await scope.Token(invitation.Id), scope.Invited(contact));
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(PortalIntegrationRequestStatus.Applied,
            (await scope.Db.PortalIntegrationRequests.SingleAsync(value => value.Id == request.Id)).Status);
        var user = await scope.Db.Users.SingleAsync(value => value.NormalizedEmail == contact.NormalizedEmail);
        var membership = await scope.Db.OrganizationMemberships.SingleAsync(value => value.UserId == user.Id && value.OrganizationId == scope.Organization.Id);
        Assert.False(membership.IsOrganizationAdmin);
        Assert.True((await scope.Db.OrganizationDepartmentMemberships.SingleAsync(value => value.OrganizationMembershipId == membership.Id)).IsDepartmentAdmin);
    }

    [PostgreSqlReferenceFact]
    public async Task AdministratorAcceptanceAutomaticallyCompletesOnlyApprovedAccessRequestsForItsCompany()
    {
        await using var scope = await Scope.Create();
        var actor = await scope.Db.Users.SingleAsync();
        var company = await scope.Db.CrmCompanies.SingleAsync();
        var otherOrganization = new Organization("SIMULATED other Company", OrganizationKind.Customer);
        scope.Db.Add(otherOrganization);
        PortalIntegrationRequest Make(PortalIntegrationRequestType type, Guid? organizationId = null,
            bool approve = true, params PortalService[] services)
        {
            var request = new PortalIntegrationRequest(organizationId ?? scope.Organization.Id, "SIMULATED access request",
                type, PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Customer, null,
                "SIMULATED acceptance completion", null, actor.Id, services);
            if (approve) request.Decide(true, "SIMULATED approved", actor.Id, DateTime.UtcNow);
            scope.Db.Add(request);
            return request;
        }
        var onboarding = Make(PortalIntegrationRequestType.Onboarding);
        var evaluation = Make(PortalIntegrationRequestType.Evaluation);
        var trial = Make(PortalIntegrationRequestType.Evaluation);
        scope.Db.Add(new CrmHandoff(company.Id, null, CrmHandoffType.TrialProject, trial.Id, Guid.NewGuid().ToString("N")));
        var service = Make(PortalIntegrationRequestType.Onboarding, services: [PortalService.PSeqKit]);
        var pending = Make(PortalIntegrationRequestType.Onboarding, approve: false);
        var cancelled = Make(PortalIntegrationRequestType.Onboarding);
        cancelled.Cancel("SIMULATED cancelled", actor.Id, DateTime.UtcNow);
        var other = Make(PortalIntegrationRequestType.Onboarding, otherOrganization.Id);
        var offboarding = Make(PortalIntegrationRequestType.Offboarding);
        await scope.Db.SaveChangesAsync();

        var member = await scope.Contact();
        var memberInvite = await scope.Invite(member);
        await scope.Accept(await scope.Token(memberInvite.Id), scope.Invited(member));
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(PortalIntegrationRequestStatus.Approved,
            (await scope.Db.PortalIntegrationRequests.SingleAsync(value => value.Id == onboarding.Id)).Status);

        var administrator = await scope.Contact();
        var invitation = await scope.Invite(administrator, organizationAdmin: true);
        Assert.Equal(PortalIntegrationRequestStatus.Approved,
            (await scope.Db.PortalIntegrationRequests.SingleAsync(value => value.Id == onboarding.Id)).Status);
        await scope.Accept(await scope.Token(invitation.Id), scope.Invited(administrator));
        scope.Db.ChangeTracker.Clear();
        var user = await scope.Db.Users.SingleAsync(value => value.NormalizedEmail == administrator.NormalizedEmail);
        foreach (var expected in new[] { onboarding, evaluation })
        {
            var completed = await scope.Db.PortalIntegrationRequests.SingleAsync(value => value.Id == expected.Id);
            Assert.Equal(PortalIntegrationRequestStatus.Applied, completed.Status);
            Assert.Equal(OnlineAccessRequestCompletion.CompletionNotes, completed.ApplicationNotes);
            Assert.Equal(user.Id, completed.AppliedByUserId);
            Assert.NotNull(completed.AppliedAt);
            Assert.True(completed.Version > expected.Version);
        }
        foreach (var unchanged in new[] { trial, service, pending, cancelled, other, offboarding })
        {
            var saved = await scope.Db.PortalIntegrationRequests.SingleAsync(value => value.Id == unchanged.Id);
            Assert.Equal(unchanged.Status, saved.Status);
            Assert.Null(saved.AppliedAt);
        }
        var version = (await scope.Db.PortalIntegrationRequests.SingleAsync(value => value.Id == onboarding.Id)).Version;
        var another = await scope.Contact();
        var anotherInvitation = await scope.Invite(another, organizationAdmin: true);
        await scope.Accept(await scope.Token(anotherInvitation.Id), scope.Invited(another));
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(version, (await scope.Db.PortalIntegrationRequests.SingleAsync(value => value.Id == onboarding.Id)).Version);
    }
}
