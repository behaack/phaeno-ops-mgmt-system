namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.RelationshipManagement.Controllers;
using PhaenoPortal.App.Features.RelationshipManagement.DTOs;
using PhaenoPortal.App.Features.RelationshipManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task RequestAcceptanceCreatesSameCompanyScopeAndRetainsSeparateServiceEntitlementHistory()
    {
        await using var scope = await Scope.Create();
        var db = scope.Db;
        var company = new CrmCompany("SIMULATED request acceptance", scope.Actor.Id);
        db.Add(company); await db.SaveChangesAsync();
        var requests = scope.Controller(new RelationshipManagementController(db, scope.Identity));
        await Assert.ThrowsAsync<RelationshipManagementException>(() => requests.ListRequests(null, null, default));
        scope.Membership.SetOrganizationAdmin(true); await db.SaveChangesAsync();
        var handoffs = scope.Controller(new CrmHandoffsController(db, scope.Identity));
        var created = Assert.IsType<CrmHandoffDto>(Assert.IsType<CreatedResult>((await handoffs.CreateHandoff(company.Id,
            new(CrmHandoffType.PortalOnboarding, null, Guid.NewGuid().ToString(), OrganizationKind.Partner, [],
                "SIMULATED online access", "SIMULATED internal context"), default)).Result).Value);
        Assert.Null(company.AccessOrganizationId);
        Assert.False(await db.OrganizationServiceEntitlements.AnyAsync());
        var pending = await requests.GetRequest(created.RelationshipRequestId, default);
        Assert.Equal(PortalIntegrationRequestStatus.PendingReview, pending.Status);
        var approved = await requests.DecideRequest(pending.Id, new() { Approved = true, Reason = "SIMULATED approval", Version = pending.Version }, default);
        await db.Entry(company).ReloadAsync();
        Assert.Equal(approved.OrganizationId, company.AccessOrganizationId);
        var organization = await db.Organizations.SingleAsync(value => value.Id == approved.OrganizationId);
        Assert.Equal(OrganizationKind.Partner, organization.Kind);
        Assert.False(await db.OrganizationMemberships.AnyAsync(value => value.OrganizationId == organization.Id));
        Assert.False(await db.OrganizationServiceEntitlements.AnyAsync(value => value.OrganizationId == organization.Id));
        Assert.Equal(1, await db.CrmCompanies.CountAsync(value => value.AccessOrganizationId == organization.Id));
        var start = DateTime.UtcNow.AddDays(-1);
        var entitlementInput = new CreateOrganizationServiceEntitlementRequest { Service = PortalService.PSeqLabService,
            ConfigurationStatus = EntitlementConfigurationStatus.Ready, EffectiveFrom = start, SourceRequestId = approved.Id };
        await Assert.ThrowsAsync<RelationshipManagementException>(() => requests.CreateEntitlement(organization.Id, entitlementInput, default));
        var serviceHandoff = Assert.IsType<CrmHandoffDto>(Assert.IsType<CreatedResult>((await handoffs.CreateHandoff(company.Id,
            new(CrmHandoffType.ServiceChange, null, Guid.NewGuid().ToString(), null, [PortalService.PSeqLabService],
                "SIMULATED service approval", null), default)).Result).Value);
        var service = await requests.DecideRequest(serviceHandoff.RelationshipRequestId,
            new() { Approved = true, Reason = "SIMULATED service decision", Version = serviceHandoff.RequestVersion }, default);
        entitlementInput = entitlementInput with { SourceRequestId = service.Id };
        var entitlement = Assert.IsType<OrganizationServiceEntitlementDto>(Assert.IsType<CreatedResult>(
            (await requests.CreateEntitlement(organization.Id, entitlementInput, default)).Result).Value);
        await Assert.ThrowsAsync<RelationshipManagementException>(() => requests.CreateEntitlement(organization.Id, entitlementInput, default));
        entitlement = await requests.UpdateEntitlement(organization.Id, entitlement.Id, new() { EffectiveFrom = start,
            ConfigurationStatus = EntitlementConfigurationStatus.Ready, SourceRequestId = service.Id,
            Notes = "SIMULATED reviewed effective scope", Version = entitlement.Version }, default);
        var applied = await requests.ApplyRequest(service.Id, new() { Version = service.Version, Notes = "SIMULATED entitlement verified" }, default);
        Assert.Equal(PortalIntegrationRequestStatus.Applied, applied.Status);
        var ended = await requests.EndEntitlement(organization.Id, entitlement.Id,
            new() { EffectiveTo = DateTime.UtcNow, Reason = "SIMULATED service ended", Version = entitlement.Version }, default);
        Assert.NotNull(ended.EffectiveTo);
        Assert.Equal(service.Id, ended.SourceRequestId);
        Assert.Single(await db.OrganizationServiceEntitlements.Where(value => value.OrganizationId == organization.Id).ToListAsync());
        Assert.True(organization.IsActive);
        Assert.Equal(approved.Id, (await requests.GetRequest(approved.Id, default)).Id);
    }

    [PostgreSqlReferenceFact]
    public async Task RequestAcceptanceRepairsLegacyAccessAndExplicitlyReusesCompatibleScopeWithoutDuplicatingPeople()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(true); await scope.Db.SaveChangesAsync();
        var db = scope.Db;
        var requests = scope.Controller(new RelationshipManagementController(db, scope.Identity));
        var handoffs = scope.Controller(new CrmHandoffsController(db, scope.Identity));
        foreach (var reuse in new[] { false, true })
        {
            var company = new CrmCompany("SIMULATED legacy access " + reuse, scope.Actor.Id);
            db.Add(company); await db.SaveChangesAsync();
            var handoff = Assert.IsType<CrmHandoffDto>(Assert.IsType<CreatedResult>((await handoffs.CreateHandoff(company.Id,
                new(CrmHandoffType.PortalOnboarding, null, Guid.NewGuid().ToString(), OrganizationKind.Customer, [], "SIMULATED legacy", null), default)).Result).Value);
            // Arrange only the documented historical approved-without-scope prerequisite.
            var request = await db.PortalIntegrationRequests.SingleAsync(value => value.Id == handoff.RelationshipRequestId);
            request.Decide(true, "SIMULATED historical approval", scope.Actor.Id, DateTime.UtcNow); await db.SaveChangesAsync();
            Organization? existing = null;
            if (reuse)
            {
                var incompatible = new Organization(company.Name, OrganizationKind.Partner);
                db.Add(incompatible); await db.SaveChangesAsync();
                await Assert.ThrowsAsync<RelationshipManagementException>(() => requests.CreateAccountFromRequest(request.Id,
                    new() { Version = request.Version, ExistingOrganizationId = incompatible.Id }, default));
                Assert.Null(company.AccessOrganizationId);
                db.Entry(incompatible).Property(value => value.Name).CurrentValue = "SIMULATED rejected scope " + incompatible.Id;
                incompatible.Deactivate(); await db.SaveChangesAsync();
                existing = new Organization(company.Name, OrganizationKind.Customer);
                db.AddRange(existing, new OrganizationMembership(scope.Actor.Id, existing.Id, false));
                await db.SaveChangesAsync();
            }
            var associated = await requests.CreateAccountFromRequest(request.Id,
                new() { Version = request.Version, ExistingOrganizationId = existing?.Id }, default);
            await db.Entry(company).ReloadAsync();
            Assert.Equal(associated.Id, company.AccessOrganizationId);
            if (reuse)
            {
                Assert.Equal(existing!.Id, associated.Id);
                Assert.True(await db.OrganizationMemberships.AnyAsync(value => value.OrganizationId == existing.Id && value.UserId == scope.Actor.Id));
            }
            Assert.Equal(1, await db.CrmCompanies.CountAsync(value => value.AccessOrganizationId == associated.Id));
            Assert.False(await db.OrganizationServiceEntitlements.AnyAsync(value => value.OrganizationId == associated.Id));
        }
    }
}
