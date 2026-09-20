namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.RelationshipManagement.Controllers;
using PhaenoPortal.App.Features.RelationshipManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CompletionRequiresActiveAdministratorAndRechecksAfterPreviouslySuccessfulReadiness()
    {
        await using var scope = await Scope.Create();
        var db = scope.Db;
        var controller = scope.Controller(new RelationshipManagementController(db, scope.Identity));
        var organization = new Organization("TEST ONLY request completion", OrganizationKind.Customer);
        var request = new PortalIntegrationRequest(organization.Id, organization.Name, PortalIntegrationRequestType.Onboarding,
            PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Customer, null, "TEST ONLY access", null, scope.Actor.Id, []);
        request.Decide(true, "TEST ONLY approved", scope.Actor.Id, DateTime.UtcNow);
        db.AddRange(organization, request); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<RelationshipManagementException>(() => controller.GetRequestCompletionReadiness(request.Id, default));
        scope.Membership.SetOrganizationAdmin(true); await db.SaveChangesAsync();
        Assert.False((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        var blocked = await Assert.ThrowsAsync<RelationshipManagementException>(() =>
            controller.ApplyRequest(request.Id, new() { Version = request.Version, Notes = "Attempt before access" }, default));
        Assert.Equal("request_work_incomplete", blocked.ErrorCode);
        Assert.Equal(PortalIntegrationRequestStatus.Approved, request.Status);

        var membership = new OrganizationMembership(scope.Actor.Id, organization.Id, true);
        db.Add(membership); await db.SaveChangesAsync();
        Assert.True((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        membership.Deactivate(); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<RelationshipManagementException>(() =>
            controller.ApplyRequest(request.Id, new() { Version = request.Version, Notes = "Stale browser completion" }, default));
        Assert.Equal(PortalIntegrationRequestStatus.Approved,
            (await db.PortalIntegrationRequests.AsNoTracking().SingleAsync(value => value.Id == request.Id)).Status);
        membership.Activate(); await db.SaveChangesAsync();
        var completed = await controller.ApplyRequest(request.Id, new() { Version = request.Version, Notes = "Administrator access verified" }, default);
        Assert.Equal(PortalIntegrationRequestStatus.Applied, completed.Status);
    }

    [PostgreSqlReferenceFact]
    public async Task ServiceCompletionRequiresCurrentReadyEntitlementForThisExactRequest()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(true); await scope.Db.SaveChangesAsync();
        var db = scope.Db;
        var controller = scope.Controller(new RelationshipManagementController(db, scope.Identity));
        var organization = new Organization("TEST ONLY request services", OrganizationKind.Partner);
        var request = new PortalIntegrationRequest(organization.Id, organization.Name, PortalIntegrationRequestType.ServiceChange,
            PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Partner, null, "TEST ONLY service", null, scope.Actor.Id, [PortalService.PSeqKit]);
        request.Decide(true, "TEST ONLY approved", scope.Actor.Id, DateTime.UtcNow);
        var start = DateTime.UtcNow.AddDays(-1);
        var entitlement = new OrganizationServiceEntitlement(organization.Id, PortalService.PSeqKit, start, null,
            EntitlementConfigurationStatus.Ready, scope.Actor.Id, null, null);
        db.AddRange(organization, request, entitlement); await db.SaveChangesAsync();
        Assert.False((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        entitlement.Update(start, null, EntitlementConfigurationStatus.Pending, request.Id, null); await db.SaveChangesAsync();
        Assert.False((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        entitlement.Update(DateTime.UtcNow.AddDays(1), null, EntitlementConfigurationStatus.Ready, request.Id, null); await db.SaveChangesAsync();
        Assert.False((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        entitlement.Update(start, null, EntitlementConfigurationStatus.Ready, request.Id, null); await db.SaveChangesAsync();
        Assert.True((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        entitlement.End(DateTime.UtcNow.AddMinutes(-1), "TEST ONLY expired"); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<RelationshipManagementException>(() =>
            controller.ApplyRequest(request.Id, new() { Version = request.Version, Notes = "Stale entitlement" }, default));
    }

    [PostgreSqlReferenceFact]
    public async Task OffboardingCannotCompleteWhileAccessRemainsActive()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(true); await scope.Db.SaveChangesAsync();
        var db = scope.Db;
        var controller = scope.Controller(new RelationshipManagementController(db, scope.Identity));
        var organization = new Organization("TEST ONLY offboarding completion", OrganizationKind.Partner);
        var request = new PortalIntegrationRequest(organization.Id, organization.Name, PortalIntegrationRequestType.Offboarding,
            PortalIntegrationRequestSource.FirstPartyCrm, OrganizationKind.Partner, null, "TEST ONLY offboarding", null, scope.Actor.Id, []);
        request.Decide(true, "TEST ONLY approved", scope.Actor.Id, DateTime.UtcNow);
        db.AddRange(organization, request); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<RelationshipManagementException>(() =>
            controller.ApplyRequest(request.Id, new() { Version = request.Version, Notes = "Access still enabled" }, default));
        organization.Deactivate(); await db.SaveChangesAsync();
        Assert.True((await controller.GetRequestCompletionReadiness(request.Id, default)).CanComplete);
        var completed = await controller.ApplyRequest(request.Id,
            new() { Version = request.Version, Notes = "Reviewed work, billing and retention; access deactivated" }, default);
        Assert.Equal(PortalIntegrationRequestStatus.Applied, completed.Status);
    }
}