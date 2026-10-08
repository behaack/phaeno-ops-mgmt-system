namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;

public sealed partial class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task TrialBusinessRolesProvideCrmAndTrialAccessWithoutCommercialBillingOrLabPrivileges()
    {
        await using var scope = await Scope.Create();
        scope.Role.SetActive(false);
        var department = await scope.Db.OrganizationDepartments.SingleAsync(value => value.OrganizationId == scope.Membership.OrganizationId);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.Membership.Id, department.Id, false));
        var http = new DefaultHttpContext(); http.Request.Headers["X-Organization-Id"] = scope.Membership.OrganizationId.ToString(); http.Request.Headers["X-Department-Id"] = department.Id.ToString();
        foreach (var role in new[] { BusinessRole.BusinessDevelopment, BusinessRole.CommercialLeadership })
        {
            var assignment = new BusinessRoleAssignment(scope.Actor.Id, role);
            scope.Db.Add(assignment); await scope.Db.SaveChangesAsync();
            var session = Assert.IsType<Ok<SessionDto>>(await SessionEndpoints.GetSession(http, scope.Db,
                scope.Identity, Options.Create(new BootstrapOptions()),
                Options.Create(new PSeqOrderToCashOptions { BusinessRoles = true, DualControlEnforced = true }), default)).Value!;
            Assert.True(session.Capabilities.CanAccessCrm); Assert.False(session.Capabilities.CanAdministerCrm);
            Assert.True(session.Capabilities.CanViewTrialProjects); Assert.True(session.Capabilities.CanManageTrialProjects);
            Assert.True(session.Capabilities.CanCreateTrialProjects);
            Assert.False(session.Capabilities.CanOperateCommercialWork); Assert.False(session.Capabilities.CanReleasePSeqResults);
            Assert.False(session.Capabilities.CanManagePSeqBilling); Assert.False(session.Capabilities.CanManagePSeqCash);
            Assert.False(session.Capabilities.CanReconcilePSeqCash); Assert.False(session.Capabilities.CanOperateLabWork);
            await scope.Controller(new CrmWorkController(scope.Db, scope.Identity)).Dashboard(default);
            assignment.SetActive(false); await scope.Db.SaveChangesAsync();
            await Forbidden(() => scope.Controller(new CrmWorkController(scope.Db, scope.Identity)).Dashboard(default));
        }
        scope.Membership.SetOrganizationAdmin(true); await scope.Db.SaveChangesAsync();
        var administrator = Assert.IsType<Ok<SessionDto>>(await SessionEndpoints.GetSession(http, scope.Db,
            scope.Identity, Options.Create(new BootstrapOptions()),
            Options.Create(new PSeqOrderToCashOptions { BusinessRoles = true, DualControlEnforced = true }), default)).Value!;
        Assert.True(administrator.IsPlatformAdmin); Assert.True(administrator.Capabilities.CanCreateTrialProjects);
    }

    [PostgreSqlReferenceFact]
    public async Task OpportunityRequiresActiveCompanyDepartmentAndSingleChoiceIsAutomatic()
    {
        await using var scope = await Scope.Create();
        var organization = new Organization($"Department setup {Guid.NewGuid():N}", OrganizationKind.Prospect); organization.Deactivate();
        var company = new CrmCompany($"Department Company {Guid.NewGuid():N}", scope.Actor.Id); company.SetUpDepartments(organization.Id);
        var department = organization.Departments.Single();
        var pipeline = new CrmPipeline($"Department pipeline {Guid.NewGuid():N}", null);
        var stage = new CrmPipelineStage(pipeline.Id, "New", 1, CrmPipelineStageCategory.Open, 10, false);
        scope.Db.AddRange(organization, company, pipeline, stage); await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmOpportunitiesController(scope.Db, scope.Identity));
        var choices = scope.Controller(new CrmCompanyDepartmentsController(scope.Db, scope.Identity));
        Assert.Equal(department.Id, Assert.Single(await choices.OpportunityChoices(company.Id, default)).Id);
        var request = new UpsertCrmOpportunityRequest("Department pursuit", company.Id, pipeline.Id, null, null, null, null, "USD", null, null, null, null, [], null);
        var created = Assert.IsType<CrmOpportunityDto>(Assert.IsType<CreatedResult>((await controller.Create(request, default)).Result).Value);
        Assert.Equal(department.Id, created.DepartmentId); Assert.Equal(OrganizationDepartment.DefaultName, created.DepartmentName);
        var second = new OrganizationDepartment(organization.Id, "ONCOLOGY", "Oncology");
        scope.Db.Add(second); await scope.Db.SaveChangesAsync();
        var count = await scope.Db.CrmOpportunities.CountAsync();
        Assert.Equal("crm_opportunity_department_required", (await Assert.ThrowsAsync<CrmException>(() => controller.Create(request, default))).ErrorCode);
        Assert.Equal("crm_opportunity_department_invalid", (await Assert.ThrowsAsync<CrmException>(() => controller.Create(request with { DepartmentId = Guid.NewGuid() }, default))).ErrorCode);
        Assert.Equal(count, await scope.Db.CrmOpportunities.CountAsync());
        var updated = await controller.Update(created.Id, request with { DepartmentId = second.Id, Version = created.Version }, default);
        Assert.Equal(second.Id, updated.DepartmentId); Assert.Equal("Oncology", updated.DepartmentName);
        Assert.Null((await scope.Db.CrmCompanies.SingleAsync(value => value.Id == company.Id)).AccessOrganizationId);
        await Forbidden(() => choices.CreateDepartment(company.Id, new("Forbidden", null, false, null, null, null, null, null), default));
    }
}
