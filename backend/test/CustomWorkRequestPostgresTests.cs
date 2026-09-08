namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class CustomWorkRequestPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SubmissionReplaysOneOpportunityWithImmutableDepartmentOriginWithoutStartingWork()
    {
        await using var scope = await Scope.Create();
        var source = await scope.AddLabJob(scope.Department);
        var request = new CreateCustomWorkRequest("PSeqLabService", "Different deliverable", "Review this synthetic scientific scope.", source.Id);
        var first = await scope.Submit(request);
        var second = await scope.Submit(request);
        Assert.Equal(first, second);
        Assert.Equal("Submitted", first.Status);
        Assert.Equal(scope.Department.Id, first.DepartmentId);
        var opportunity = await scope.Db.CrmOpportunities.Include(value => value.Stage).Include(value => value.Pipeline)
            .SingleAsync(value => value.CompanyId == scope.Company.Id);
        Assert.Equal(scope.Owner.Id, opportunity.OwnerUserId);
        Assert.Equal(CrmPipelineStageCategory.Open, opportunity.Stage.Category);
        Assert.True(opportunity.Pipeline.IsActive && opportunity.Pipeline.IsDefault);
        var activity = await scope.Db.CrmActivities.SingleAsync(value => value.OpportunityId == opportunity.Id);
        Assert.Equal(CrmActivityType.PortalEvent, activity.Type);
        Assert.Equal(scope.Actor.Id, activity.ActorUserId);
        Assert.Contains(scope.Department.Id.ToString("D"), activity.Body);
        Assert.Contains(source.OrderNumber, activity.Body);
        Assert.Throws<InvalidOperationException>(() => activity.Deactivate());
        Assert.Throws<InvalidOperationException>(() => activity.Update(CrmActivityType.Note, "Changed", null, DateTime.UtcNow, CrmActivityVisibility.Internal));
        Assert.Equal(1, await scope.Db.CrmOpportunityStageHistory.CountAsync(value => value.OpportunityId == opportunity.Id));
        Assert.Equal(1, await scope.Db.LabServiceOrders.CountAsync(value => value.OrganizationId == scope.Tenant.Id));
        Assert.False(await scope.Db.CrmHandoffs.AnyAsync(value => value.CompanyId == scope.Company.Id));
        Assert.False(await scope.Db.PortalIntegrationRequests.AnyAsync(value => value.OrganizationId == scope.Tenant.Id));
        Assert.False(await scope.Db.LabServiceQuotes.AnyAsync(value => value.LabServiceOrderId == source.Id));
        Assert.Equal("idempotency_key_reused", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Submit(request with { Description = "A changed scope" }))).ErrorCode);
        scope.Db.ChangeTracker.Clear();
        var membership = await scope.Db.OrganizationMemberships.SingleAsync(value => value.Id == scope.Membership.Id);
        membership.SetOrganizationAdmin(false);
        await scope.Db.SaveChangesAsync();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Submit(request))).StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task SourceOrderCannotCrossDepartmentOrSelectedTenant()
    {
        await using var scope = await Scope.Create();
        var otherDepartment = scope.Tenant.Departments.Single(value => value.IsDefault);
        var source = await scope.AddLabJob(otherDepartment);
        var request = new CreateCustomWorkRequest("PSeqLabService", "Custom scope", "Synthetic needs", source.Id);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.Submit(request))).StatusCode);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Submit(request with { SourceOrderId = Guid.NewGuid() }))).StatusCode);
        Assert.False(await scope.Db.CrmOpportunities.AnyAsync(value => value.CompanyId == scope.Company.Id));
        Assert.False(await scope.Db.OrderIdempotencyRecords.AnyAsync(value => value.ActorUserId == scope.Actor.Id));
        var controller = scope.Controller();
        controller.HttpContext.Request.Headers["X-Organization-Id"] = scope.Staff.Id.ToString();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => controller.Create(request, default))).StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentAdministratorCannotSubmitOnBehalfOfOrganization()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(false);
        scope.Db.OrganizationDepartmentMemberships.Add(new(scope.Membership.Id, scope.Department.Id, true));
        await scope.Db.SaveChangesAsync();
        var failure = await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Submit(new("PSeqLabService", "Custom scope", "Synthetic needs")));
        Assert.Equal("organization_administrator_required", failure.ErrorCode);
        Assert.False(await scope.Db.CrmOpportunities.AnyAsync(value => value.CompanyId == scope.Company.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task PartnerKitRequestKeepsPurchasedOrderReferenceWithoutCreatingAssembly()
    {
        await using var scope = await Scope.Create(OrganizationKind.Partner);
        var order = new PartnerReagentOrder(scope.Tenant.Id, scope.Department.Id, "KIT-" + Guid.NewGuid().ToString("N"));
        scope.Db.Add(order); await scope.Db.SaveChangesAsync();
        var response = await scope.Submit(new("PSeqKit", "Different Kit scope", "Synthetic custom analysis request", order.Id));
        var opportunity = await scope.Db.CrmOpportunities.SingleAsync(value => value.Id == response.OpportunityId);
        Assert.Equal("PSeqKit", opportunity.ProductInterest);
        Assert.Contains(order.OrderNumber, opportunity.Description);
        Assert.False(await scope.Db.DataAssemblyRequests.AnyAsync(value => value.OrganizationId == scope.Tenant.Id));
        Assert.False(await scope.Db.CrmHandoffs.AnyAsync(value => value.CompanyId == scope.Company.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task UnavailableCompanyOwnerCannotFallBackToExternalRequesterOrInventSetup()
    {
        await using var scope = await Scope.Create();
        scope.Owner.Deactivate(); await scope.Db.SaveChangesAsync();
        Assert.Equal("custom_work_unavailable", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Submit(new("PSeqLabService", "Scope", "Needs")))).ErrorCode);
        Assert.False(await scope.Db.CrmOpportunities.AnyAsync(value => value.CompanyId == scope.Company.Id));
        scope.Db.ChangeTracker.Clear();
        var company = await scope.Db.CrmCompanies.SingleAsync(value => value.Id == scope.Company.Id);
        company.Deactivate(); await scope.Db.SaveChangesAsync();
        Assert.Equal("custom_work_unavailable", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Submit(new("PSeqLabService", "Scope", "Needs")))).ErrorCode);
    }

    private sealed class Scope : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db { get; private set; } = null!;
        public Organization Tenant { get; private set; } = null!;
        public Organization Staff { get; } = new("Custom-work staff " + Guid.NewGuid().ToString("N"), OrganizationKind.Phaeno);
        public User Actor { get; private set; } = null!;
        public User Owner { get; private set; } = null!;
        public OrganizationMembership Membership { get; private set; } = null!;
        public OrganizationDepartment Department { get; private set; } = null!;
        public CrmCompany Company { get; private set; } = null!;
        private ExternalIdentity Identity { get; } = new("test", Guid.NewGuid().ToString("N"), $"custom-{Guid.NewGuid():N}@example.test", true);
        private string Key { get; } = Guid.NewGuid().ToString("N");
        private string AuditRequest { get; } = "custom-work-" + Guid.NewGuid().ToString("N");

        public static async Task<Scope> Create(OrganizationKind kind = OrganizationKind.Customer)
        {
            var scope = new Scope();
            var settings = new PersistenceOptions
            {
                CommercialSchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_COMMERCIAL_SCHEMA") ?? "commercial_ops",
                LaboratorySchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_LABORATORY_SCHEMA") ?? "lab_ops",
                MigrationsHistorySchema = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_MIGRATIONS_HISTORY_SCHEMA") ?? "public"
            }.Validate();
            scope.Db = new(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
                .UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext(scope.AuditRequest))).Options, Options.Create(settings));
            scope.Tenant = new("Custom-work tenant " + Guid.NewGuid().ToString("N"), kind);
            scope.Actor = new(scope.Identity.Email, "Synthetic", "Administrator");
            scope.Actor.Activate(); scope.Actor.LinkExternalIdentity(scope.Identity.Provider, scope.Identity.SubjectId);
            scope.Owner = new($"owner-{Guid.NewGuid():N}@example.test", "Synthetic", "Owner"); scope.Owner.Activate();
            scope.Membership = new(scope.Actor.Id, scope.Tenant.Id, true);
            scope.Department = new(scope.Tenant.Id, "RESEARCH", "Research");
            scope.Company = new("Custom-work Company " + Guid.NewGuid().ToString("N"), scope.Owner.Id);
            scope.Company.EnablePortalAccess(scope.Tenant.Id);
            scope.Db.AddRange(scope.Staff, scope.Tenant, scope.Actor, scope.Owner, scope.Membership,
                scope.Department, scope.Company, new OrganizationMembership(scope.Owner.Id, scope.Staff.Id, false));
            await scope.Db.SaveChangesAsync();
            return scope;
        }

        public CustomWorkRequestsController Controller()
        {
            Db.ChangeTracker.Clear();
            var http = new DefaultHttpContext();
            http.Request.Headers["X-Organization-Id"] = Tenant.Id.ToString();
            http.Request.Headers["X-Department-Id"] = Department.Id.ToString();
            http.Request.Headers["Idempotency-Key"] = Key;
            return new(Db, new(Db, new IdentityContext(Identity)), new(Db), new(Db))
                { ControllerContext = new() { HttpContext = http } };
        }
        public async Task<CustomWorkSubmissionDto> Submit(CreateCustomWorkRequest request)
            => Assert.IsType<CustomWorkSubmissionDto>(Assert.IsType<ObjectResult>((await Controller().Create(request, default)).Result).Value);
        public async Task<LabServiceOrder> AddLabJob(OrganizationDepartment department)
        {
            var order = new LabServiceOrder(Tenant.Id, department.Id, "CW-" + Guid.NewGuid().ToString("N"), "Custom origin",
                "Synthetic source Job", 1, false, "Synthetic RNA", "Frozen", "Research only", "Fixture");
            Db.Add(order); await Db.SaveChangesAsync(); return order;
        }
        public async ValueTask DisposeAsync()
        {
            try
            {
                Db.ChangeTracker.Clear();
                var users = new[] { Actor.Id, Owner.Id }; var organizations = new[] { Tenant.Id, Staff.Id };
                var opportunities = Db.CrmOpportunities.Where(value => value.CompanyId == Company.Id).Select(value => value.Id);
                await Db.CrmActivities.Where(value => value.CompanyId == Company.Id).ExecuteDeleteAsync();
                await Db.CrmOpportunityStageHistory.Where(value => opportunities.Contains(value.OpportunityId)).ExecuteDeleteAsync();
                await Db.CrmOpportunities.Where(value => value.CompanyId == Company.Id).ExecuteDeleteAsync();
                await Db.CrmCompanies.Where(value => value.Id == Company.Id).ExecuteDeleteAsync();
                await Db.OrderIdempotencyRecords.Where(value => value.ActorUserId == Actor.Id).ExecuteDeleteAsync();
                await Db.LabServiceOrders.Where(value => value.OrganizationId == Tenant.Id).ExecuteDeleteAsync();
                await Db.PartnerReagentOrders.Where(value => value.OrganizationId == Tenant.Id).ExecuteDeleteAsync();
                await Db.AuditEvents.Where(value => value.RequestId == AuditRequest).ExecuteDeleteAsync();
                await Db.OrganizationDepartmentMemberships.Where(value => organizations.Contains(value.Department.OrganizationId)).ExecuteDeleteAsync();
                await Db.OrganizationDepartments.Where(value => organizations.Contains(value.OrganizationId)).ExecuteDeleteAsync();
                await Db.OrganizationMemberships.Where(value => organizations.Contains(value.OrganizationId)).ExecuteDeleteAsync();
                await Db.Users.Where(value => users.Contains(value.Id)).ExecuteDeleteAsync();
                await Db.Organizations.Where(value => organizations.Contains(value.Id)).ExecuteDeleteAsync();
            }
            finally { await Db.DisposeAsync(); }
        }
    }
    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext
    { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class AuditContext(string id) : ICurrentUserContext
    { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => id; }
}
