namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Relationships.Application;
using PhaenoPortal.App.Features.RelationshipManagement.Controllers;
using PhaenoPortal.App.Features.RelationshipManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task DepartmentAdministratorSatisfiesOnboardingAndOnlyItsOwnDepartmentReadiness()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(true);
        var organization = new Organization("TEST ONLY department-led Company", OrganizationKind.Customer);
        var department = new OrganizationDepartment(organization.Id, "RESEARCH", "Research");
        var other = new OrganizationDepartment(organization.Id, "OTHER", "Other");
        var membership = new OrganizationMembership(scope.Actor.Id, organization.Id, false);
        var access = new OrganizationDepartmentMembership(membership.Id, department.Id, false);
        var request = new PortalIntegrationRequest(organization.Id, organization.Name, PortalIntegrationRequestType.Onboarding,
            PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Customer, null, "TEST ONLY department access", null, scope.Actor.Id, []);
        request.Decide(true, "Approved", scope.Actor.Id, DateTime.UtcNow);
        scope.Db.AddRange(organization, department, other, membership, access, request);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new RelationshipManagementController(scope.Db, scope.Identity));
        Assert.False((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        access.SetDepartmentAdmin(true); await scope.Db.SaveChangesAsync();
        Assert.Equal("Active", (await controller.GetOrganizationSummary(organization.Id, default)).AdministratorStatus);
        Assert.True((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        var readiness = new OperationalReadinessService(scope.Db);
        Assert.DoesNotContain((await readiness.EvaluateAsync(organization, default, department.Id)).Evaluation.Blockers,
            value => value.Code == OperationalReadinessBlockerCode.ActiveCustomerAdministratorRequired);
        Assert.Contains((await readiness.EvaluateAsync(organization, default, other.Id)).Evaluation.Blockers,
            value => value.Code == OperationalReadinessBlockerCode.ActiveCustomerAdministratorRequired);
        department.Deactivate(); await scope.Db.SaveChangesAsync();
        Assert.False((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        department.Reactivate(); access.Deactivate(); await scope.Db.SaveChangesAsync();
        Assert.False((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        access.Reactivate(); membership.Deactivate(); await scope.Db.SaveChangesAsync();
        Assert.False((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        membership.Activate(); await scope.Db.SaveChangesAsync();
        Assert.Equal(PortalIntegrationRequestStatus.Applied,
            (await controller.ReconcileOnlineAccess(request.Id, new(request.Version), default)).Status);
        Assert.False(membership.IsOrganizationAdmin);
        membership.SetOrganizationAdmin(true); await scope.Db.SaveChangesAsync();
        await MembershipEndpoints.UpdateMembershipRole(membership.Id, new() { IsOrganizationAdmin = false },
            controller.HttpContext, scope.Db, scope.Identity, default);
        Assert.False(membership.IsOrganizationAdmin);
        Assert.True(access.IsDepartmentAdmin);
    }

    [PostgreSqlReferenceFact]
    public async Task ExistingReadyAccessCompletesOnApprovalAndReconciliationIsIdempotent()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(true);
        var organization = new Organization("TEST ONLY automatic access", OrganizationKind.Customer);
        var request = new PortalIntegrationRequest(organization.Id, organization.Name, PortalIntegrationRequestType.Onboarding,
            PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Customer, null, "TEST ONLY access", null, scope.Actor.Id, []);
        scope.Db.AddRange(organization, request, new OrganizationMembership(scope.Actor.Id, organization.Id, true));
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new RelationshipManagementController(scope.Db, scope.Identity));
        var approved = await controller.DecideRequest(request.Id,
            new() { Version = request.Version, Approved = true, Reason = "TEST ONLY approved" }, default);
        Assert.Equal(PortalIntegrationRequestStatus.Applied, approved.Status);
        var version = approved.Version;
        var repeated = await controller.ReconcileOnlineAccess(request.Id, new(version - 1), default);
        Assert.Equal(version, repeated.Version);
        Assert.Equal(OnlineAccessRequestCompletion.CompletionNotes, repeated.ApplicationNotes);

        var older = new PortalIntegrationRequest(organization.Id, organization.Name, PortalIntegrationRequestType.Onboarding,
            PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Customer, null, "TEST ONLY older access", null, scope.Actor.Id, []);
        older.Decide(true, "TEST ONLY previously approved", scope.Actor.Id, DateTime.UtcNow);
        scope.Db.Add(older); await scope.Db.SaveChangesAsync();
        var readiness = await controller.GetRequestCompletionReadiness(older.Id, default);
        Assert.True(readiness.CanComplete);
        Assert.True(readiness.CompletesAutomatically);
        Assert.Equal(PortalIntegrationRequestStatus.Applied,
            (await controller.ReconcileOnlineAccess(older.Id, new(older.Version), default)).Status);
    }
}
