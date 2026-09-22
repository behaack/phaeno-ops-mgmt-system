namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Features.RelationshipManagement.Controllers;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task DepartmentSetupIsAdminOnlyAndApprovalPreservesSettingsWithoutGrantingMembershipOrServices()
    {
        await using var scope = await Scope.Create();
        var db = scope.Db;
        var company = new CrmCompany($"Department setup {Guid.NewGuid():N}", scope.Actor.Id);
        db.Add(company); await db.SaveChangesAsync();
        var controller = scope.Controller(new CrmCompanyDepartmentsController(db, scope.Identity));
        var input = new UpsertDepartmentRequest("Cardiology", "Research group", true, "billing@example.test", null, "Keep upright", null, null);
        await Assert.ThrowsAsync<CrmException>(() => controller.CreateDepartment(company.Id, input, default));
        Assert.Null(company.SetupOrganizationId);
        scope.Membership.SetOrganizationAdmin(true); await db.SaveChangesAsync();
        var department = Assert.IsType<DepartmentDto>(Assert.IsType<CreatedResult>(
            (await controller.CreateDepartment(company.Id, input, default)).Result).Value);
        var setup = await db.Organizations.SingleAsync(value => value.Id == department.OrganizationId);
        Assert.Equal(setup.Id, company.SetupOrganizationId);
        Assert.Null(company.AccessOrganizationId);
        Assert.False(setup.IsActive);
        Assert.Equal(PortalReadinessStatus.NotReviewed, setup.PortalReadiness);
        Assert.Empty(await db.PortalIntegrationRequests.ToListAsync());
        Assert.False(await db.OrganizationMemberships.AnyAsync(value => value.OrganizationId == setup.Id));
        Assert.False(await db.OrganizationInvitations.AnyAsync(value => value.OrganizationId == setup.Id));
        Assert.False(await db.OrganizationServiceEntitlements.AnyAsync(value => value.OrganizationId == setup.Id));
        Assert.Equal("DEPT-000001", department.Code);
        Assert.True(await db.AuditEvents.AnyAsync(value => value.EntityId == department.Id.ToString()));
        await Assert.ThrowsAsync<BadRequestException>(() => OrganizationEndpoints.ReactivateOrganization(
            setup.Id, new DefaultHttpContext(), db, scope.Identity, default));

        var edited = Assert.IsType<Ok<DepartmentDto>>(await DepartmentEndpoints.UpdateDepartment(setup.Id, department.Id,
            input with { Name = "Cardiology Research", Version = department.Version }, new DefaultHttpContext(), db, scope.Identity, default)).Value!;
        Assert.Equal(department.Code, edited.Code);
        var another = Assert.IsType<DepartmentDto>(Assert.IsType<CreatedResult>(
            (await controller.CreateDepartment(company.Id, input with { Name = "Neurology" }, default)).Result).Value);
        Assert.Equal(setup.Id, another.OrganizationId);
        Assert.Equal("DEPT-000002", another.Code);

        var handoffs = scope.Controller(new CrmHandoffsController(db, scope.Identity));
        var request = Assert.IsType<CrmHandoffDto>(Assert.IsType<CreatedResult>((await handoffs.CreateHandoff(company.Id,
            new(CrmHandoffType.PortalOnboarding, null, Guid.NewGuid().ToString(), OrganizationKind.Customer, [], "Online access", null), default)).Result).Value);
        var reviews = scope.Controller(new RelationshipManagementController(db, scope.Identity));
        var pending = await reviews.GetRequest(request.RelationshipRequestId, default);
        await reviews.DecideRequest(pending.Id, new() { Approved = true, Reason = "Approved", Version = pending.Version }, default);
        Assert.Null(company.SetupOrganizationId);
        Assert.Equal(setup.Id, company.AccessOrganizationId);
        Assert.True(setup.IsActive);
        Assert.Equal(OrganizationKind.Customer, setup.Kind);
        var retained = await db.OrganizationDepartments.SingleAsync(value => value.Id == department.Id);
        Assert.Equal(setup.Id, retained.OrganizationId);
        Assert.Equal("Cardiology Research", retained.Name);
        Assert.Equal(department.Code, retained.Code);
        Assert.True(retained.PurchaseOrderRequired);
        Assert.Equal("Keep upright", retained.ShippingInstructions);
        Assert.False(await db.OrganizationMemberships.AnyAsync(value => value.OrganizationId == setup.Id));
        Assert.False(await db.OrganizationServiceEntitlements.AnyAsync(value => value.OrganizationId == setup.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task InactiveCompanyCannotCreateOrEditDepartmentSetup()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(true);
        var company = new CrmCompany($"Inactive setup {Guid.NewGuid():N}", scope.Actor.Id);
        scope.Db.Add(company); await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmCompanyDepartmentsController(scope.Db, scope.Identity));
        var input = new UpsertDepartmentRequest("Research", null, null, null, null, null, null, null);
        var department = Assert.IsType<DepartmentDto>(Assert.IsType<CreatedResult>(
            (await controller.CreateDepartment(company.Id, input, default)).Result).Value);
        company.Deactivate(); await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<CrmException>(() => controller.CreateDepartment(company.Id, input, default));
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.UpdateDepartment(department.OrganizationId, department.Id,
            input with { Version = department.Version }, new DefaultHttpContext(), scope.Db, scope.Identity, default));
    }
}
