namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging.Abstractions;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class CommercialIntakeAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CommercialBeginsQuoteAndRequestsCorrectionWithoutCreatingLabAuthorization()
    {
        await using var scope = await Scope.Create();
        var customer = new Organization($"Intake pricing {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.Add(customer); await scope.Db.SaveChangesAsync();
        var department = await scope.Db.OrganizationDepartments.SingleAsync(value => value.OrganizationId == customer.Id && value.IsDefault);
        var order = new LabServiceOrder(customer.Id, department.Id, "TEST" + Guid.NewGuid().ToString("N")[..4],
            "TEST ONLY rollback pricing", null, 2, false, "TEST ONLY source", "Test storage", "No physical specimens", "Test instructions", null);
        order.SourceGroups.Add(new LabServiceSourceGroup(order.Id, "TEST ONLY source", 2));
        order.Submit(scope.Actor.Id, DateTime.UtcNow);
        scope.Db.Add(order); await scope.Db.SaveChangesAsync();
        var controller = Lab(scope);
        var prepared = await controller.BeginQuote(order.Id, new(order.Version), default);
        Assert.Equal("QuoteInPreparation", prepared.Status); Assert.True(prepared.CanManageQuotes);
        Assert.Empty(prepared.Samples);
        Assert.False(await scope.Db.CommercialLabAuthorizations.AnyAsync(value => value.CommercialOrderId == order.Id));
        Assert.Equal(order.Id, (await controller.Get(order.Id, default)).Id);
        var changed = await controller.RequestChanges(order.Id, new(prepared.Version, "Confirm test storage", null), default);
        Assert.Equal("ChangesRequested", changed.Status);
        Assert.Equal(2, await scope.Db.OrderStatusEvents.CountAsync(value => value.WorkflowId == order.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task CommercialReadsOnlyLabIntakeAndActiveCustomerDepartmentOptions()
    {
        await using var scope = await Scope.Create();
        var customer = new Organization($"Intake Customer {Guid.NewGuid():N}", OrganizationKind.Customer);
        var active = new OrganizationDepartment(customer.Id, "active", "Active");
        var inactive = new OrganizationDepartment(customer.Id, "inactive", "Inactive");
        inactive.Deactivate();
        scope.Db.AddRange(customer, active, inactive); await scope.Db.SaveChangesAsync();
        var controller = Lab(scope);
        Assert.Contains(await controller.ListCustomerOptions(default), item => item.Id == customer.Id);
        var departments = await controller.ListCustomerDepartments(customer.Id, default);
        Assert.Contains(departments, item => item.Id == active.Id);
        Assert.DoesNotContain(departments, item => item.Id == inactive.Id);
        var context = new OrderRequestContext(scope.Db, scope.Identity);
        Assert.Equal(scope.Actor.Id, (await context.RequireCommercialOrderAsync(new DefaultHttpContext(), true, false, default)).Id);
        Assert.False((await controller.CustomerReadiness(customer.Id, active.Id, default)).CanStartPricing);
        await controller.PricingCatalog(default);
        await scope.Controller(new CrmHandoffsController(scope.Db, scope.Identity)).OrderHandoffs(default);
        var orders = scope.Controller(new PlatformOrdersController(scope.Db, new(scope.Db, scope.Identity), Flags(true)));
        var result = await orders.List(null, null, null, null, null);
        Assert.All(result.Items, item => Assert.Equal("PSeqLabService", item.OrderType));
        await Forbidden(() => orders.List("PSeqKit", null, null, null, null));
        await Forbidden(() => new OrderRequestContext(scope.Db, scope.Identity).RequirePlatformAdminAsync(new DefaultHttpContext(), default));
    }

    [PostgreSqlReferenceFact]
    public async Task AdministratorReadDoesNotGrantPricingAndLegacyFallbackStaysAdministrative()
    {
        await using var scope = await Scope.Create();
        scope.Role.SetActive(false); scope.Membership.SetOrganizationAdmin(true); await scope.Db.SaveChangesAsync();
        await Lab(scope).ListCustomerOptions(default);
        await Forbidden(() => Lab(scope).Initiate(null!, default));
        await Forbidden(() => Lab(scope).BeginQuote(Guid.NewGuid(), new(1), default));
        await Forbidden(() => Lab(scope).RequestChanges(Guid.NewGuid(), new(1, "Test", null), default));
        await Forbidden(() => Lab(scope).IssueQuote(Guid.NewGuid(), null!, default));
        var request = new OrderRequestContext(scope.Db, scope.Identity);
        Assert.Equal(scope.Actor.Id, (await request.RequireCommercialOrderAsync(new DefaultHttpContext(), false, false, default)).Id);
        scope.Role.SetActive(true); scope.Membership.SetOrganizationAdmin(false); await scope.Db.SaveChangesAsync();
        await Forbidden(() => request.RequireCommercialOrderAsync(new DefaultHttpContext(), false, false, default));
        await Forbidden(() => request.RequireCommercialOrderAsync(new DefaultHttpContext(), false, true, default));
    }

    [PostgreSqlReferenceFact]
    public async Task RevokedRoleAndExternalMembershipCannotReadOrStartIntake()
    {
        await using var scope = await Scope.Create();
        scope.Role.SetActive(false); await scope.Db.SaveChangesAsync();
        await Forbidden(() => Lab(scope).ListCustomerOptions(default));
        await Forbidden(() => Lab(scope).Initiate(null!, default));
        scope.Role.SetActive(true); scope.Membership.Deactivate();
        var customer = new Organization($"External {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.AddRange(customer, new OrganizationMembership(scope.Actor.Id, customer.Id, true));
        await scope.Db.SaveChangesAsync();
        await Forbidden(() => Lab(scope).ListCustomerOptions(default));
        await Forbidden(() => Lab(scope).PricingCatalog(default));
        Assert.Equal(403, (await Assert.ThrowsAsync<CrmException>(() => scope.Controller(new CrmHandoffsController(scope.Db, scope.Identity)).OrderHandoffs(default))).StatusCode);
        await Forbidden(() => Lab(scope).ListCustomerDepartments(customer.Id, default));
        await Forbidden(() => Lab(scope).Get(Guid.NewGuid(), default));
        await Forbidden(() => Lab(scope).Initiate(null!, default));
    }

    private static IOptions<PSeqOrderToCashOptions> Flags(bool enabled) => Options.Create(new PSeqOrderToCashOptions { BusinessRoles = enabled, NativePSeqAccountsReceivable = true });
    private static PlatformLabServiceOrdersController Lab(Scope scope) => scope.Controller(new PlatformLabServiceOrdersController(scope.Db,
        new(scope.Db, scope.Identity), new(scope.Db), null!, null!, Options.Create(new OrderManagementOptions()), Flags(true), null!, null!,
        NullLogger<PlatformLabServiceOrdersController>.Instance));
    private static async Task Forbidden(Func<Task> action) => Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(action)).StatusCode);

    private sealed class Scope(PSeqOperationsDbContext db, IDbContextTransaction transaction) : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db => db;
        public User Actor { get; private set; } = null!;
        public OrganizationMembership Membership { get; private set; } = null!;
        public BusinessRoleAssignment Role { get; private set; } = null!;
        public IExternalIdentityContext Identity { get; private set; } = null!;
        public T Controller<T>(T controller) where T : ControllerBase { controller.ControllerContext = new() { HttpContext = new DefaultHttpContext() }; return controller; }
        public static async Task<Scope> Create()
        {
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options;
            var db = new PSeqOperationsDbContext(options, Options.Create(new PersistenceOptions()));
            var scope = new Scope(db, await db.Database.BeginTransactionAsync());
            var organization = new Organization($"CRM staff {Guid.NewGuid():N}", OrganizationKind.Phaeno);
            var identity = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"commercial-{Guid.NewGuid():N}@example.test", true);
            scope.Actor = new(identity.Email, "Commercial", "Operator"); scope.Actor.Activate(); scope.Actor.LinkExternalIdentity(identity.Provider, identity.SubjectId);
            scope.Membership = new(scope.Actor.Id, organization.Id, false);
            scope.Role = new(scope.Actor.Id, BusinessRole.CommercialOperator);
            scope.Identity = new IdentityContext(identity);
            db.AddRange(organization, scope.Actor, scope.Membership, scope.Role); await db.SaveChangesAsync(); return scope;
        }
        public async ValueTask DisposeAsync() { await transaction.RollbackAsync(); await transaction.DisposeAsync(); await db.DisposeAsync(); }
    }
    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class AuditContext : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "commercial-intake-access-test"; }
}
