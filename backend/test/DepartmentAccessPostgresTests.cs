namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class DepartmentAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task OrganizationAdminCannotReadAnotherOrganizationsDepartmentMembers()
    {
        await using var scope = await Scope.Create();
        var other = new Organization($"Other {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.Add(other);
        await scope.Db.SaveChangesAsync();
        var result = await DepartmentEndpoints.ListDepartmentMembers(scope.Organization.Id,
            other.Departments.Single().Id, scope.Http, scope.Db, scope.Identity, default);
        Assert.IsType<ForbidHttpResult>(result);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentDeactivationCannotStrandAnActiveMember()
    {
        await using var scope = await Scope.Create();
        var member = scope.AddMember(scope.Research, false);
        await scope.Db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<BadRequestException>(() => DepartmentEndpoints.ChangeDepartmentActive(
            scope.Organization.Id, scope.Research.Id, "deactivate", new(scope.Research.Version),
            scope.Http, scope.Db, scope.Identity, default));
        Assert.Contains("another department", error.Message);
        Assert.True(scope.Research.IsActive);
        Assert.True(member.IsActive);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentDeactivationPreservesOtherAccessAndReactivationDoesNotRestoreRevokedAccess()
    {
        await using var scope = await Scope.Create();
        var member = scope.AddMember(scope.Research, false);
        scope.Db.Add(new OrganizationDepartmentMembership(member.OrganizationMembershipId, scope.General.Id, false));
        await scope.Db.SaveChangesAsync();
        await DepartmentEndpoints.ChangeDepartmentActive(scope.Organization.Id, scope.Research.Id,
            "deactivate", new(scope.Research.Version), scope.Http, scope.Db, scope.Identity, default);
        Assert.False(member.IsActive);
        await DepartmentEndpoints.ChangeDepartmentActive(scope.Organization.Id, scope.Research.Id,
            "reactivate", new(scope.Research.Version), scope.Http, scope.Db, scope.Identity, default);
        Assert.False(member.IsActive);
    }

    [PostgreSqlReferenceFact]
    public async Task DefaultSwitchRemainsUniqueAndAudited()
    {
        await using var scope = await Scope.Create();
        await DepartmentEndpoints.SetDefaultDepartment(scope.Organization.Id, scope.Research.Id,
            new(scope.Research.Version), scope.Http, scope.Db, scope.Identity, default);
        var defaults = await scope.Db.OrganizationDepartments.AsNoTracking()
            .Where(value => value.OrganizationId == scope.Organization.Id && value.IsDefault).ToListAsync();
        Assert.Equal(scope.Research.Id, Assert.Single(defaults).Id);
        Assert.True(await scope.Db.AuditEvents.AnyAsync(value => value.EntityId == scope.Research.Id.ToString()));
    }

    [PostgreSqlReferenceFact]
    public async Task InvalidInvitationDepartmentNeverFallsBackToGeneral()
    {
        await using var scope = await Scope.Create();
        var invitation = new OrganizationInvitation(scope.Organization.Id, $"invite-{Guid.NewGuid():N}@example.com",
            "Invited", "Person", false, Guid.NewGuid().ToString("N"), DateTime.UtcNow.AddDays(1));
        scope.Db.AddRange(invitation, new OrganizationInvitationDepartment(invitation.Id, scope.Research.Id, false));
        scope.Research.Deactivate();
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.ValidateDepartmentIntentAsync(scope.Db, invitation, default));
        Assert.Single(await scope.Db.OrganizationInvitationDepartments.Where(value => value.OrganizationInvitationId == invitation.Id).ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task BlockedDepartmentEntitlementOverridesReadyOrganizationDefault()
    {
        await using var scope = await Scope.Create();
        scope.Db.AddRange(
            new OrganizationServiceEntitlement(scope.Organization.Id, PortalService.PSeqLabService,
                DateTime.UtcNow.AddDays(-1), null, EntitlementConfigurationStatus.Ready, scope.Actor.Id, null, null),
            new OrganizationServiceEntitlement(scope.Organization.Id, PortalService.PSeqLabService,
                DateTime.UtcNow.AddDays(-1), null, EntitlementConfigurationStatus.Blocked, scope.Actor.Id, null, null, scope.Research.Id));
        await scope.Db.SaveChangesAsync();
        var research = await LabServiceOrderingEligibility.ReadAsync(scope.Db, scope.Organization.Id, DateTime.UtcNow, default, scope.Research.Id);
        var general = await LabServiceOrderingEligibility.ReadAsync(scope.Db, scope.Organization.Id, DateTime.UtcNow, default, scope.General.Id);
        Assert.False(research.OrderingAuthorized);
        Assert.True(general.OrderingAuthorized);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentOnlyEntitlementCannotAuthorizeAnUnspecifiedDepartment()
    {
        await using var scope = await Scope.Create();
        scope.Db.Add(new OrganizationServiceEntitlement(scope.Organization.Id, PortalService.PSeqLabService,
            DateTime.UtcNow.AddDays(-1), null, EntitlementConfigurationStatus.Ready, scope.Actor.Id, null, null, scope.Research.Id));
        await scope.Db.SaveChangesAsync();
        Assert.False((await LabServiceOrderingEligibility.ReadAsync(scope.Db, scope.Organization.Id, DateTime.UtcNow, default)).OrderingAuthorized);
    }

    [PostgreSqlReferenceFact]
    public async Task ResultListAndDownloadRejectOtherDepartmentBeforeReadingStorage()
    {
        await using var scope = await Scope.Create();
        var order = scope.AddOrder(scope.Research);
        await scope.Db.SaveChangesAsync();
        var storage = new RecordingStorage();
        var controller = new PSeqResultDownloadsController(scope.Db, scope.Context, storage)
            { ControllerContext = new() { HttpContext = scope.Http } };
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => controller.List(order.Id, default));
        Assert.Equal(StatusCodes.Status404NotFound, error.StatusCode);
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.Download(order.Id, Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), default));
        Assert.Equal(0, storage.ReadCount);
        scope.Http.Request.Headers["X-Department-Id"] = scope.Research.Id.ToString();
        Assert.Empty(await controller.List(order.Id, default));
    }

    [PostgreSqlReferenceFact]
    public async Task InvoiceListAndPdfStayInsideSelectedDepartment()
    {
        await using var scope = await Scope.Create();
        var own = scope.AddInvoice(scope.General);
        var other = scope.AddInvoice(scope.Research);
        await scope.Db.SaveChangesAsync();
        var storage = new RecordingStorage();
        var controller = new CustomerInvoicesController(scope.Db, scope.Context, storage)
            { ControllerContext = new() { HttpContext = scope.Http } };
        Assert.Equal(own.Id, Assert.Single(await controller.List(default)).Id);
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.DownloadPdf(other.Id, default));
        Assert.Equal(0, storage.ReadCount);
        Assert.IsType<FileStreamResult>(await controller.DownloadPdf(own.Id, default));
        Assert.Equal(1, storage.ReadCount);
    }

    [PostgreSqlReferenceFact]
    public async Task InactiveOrganizationCannotBeManagedThroughDepartmentAdminAssignment()
    {
        await using var scope = await Scope.Create();
        scope.AdminMembership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.AdminMembership.Id, scope.Research.Id, true));
        scope.Organization.Deactivate();
        await scope.Db.SaveChangesAsync();
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.ListDepartmentMembers(scope.Organization.Id,
            scope.Research.Id, scope.Http, scope.Db, scope.Identity, default));
    }

    [PostgreSqlReferenceFact]
    public async Task InactiveDepartmentCannotAuthorizeOrdering()
    {
        await using var scope = await Scope.Create();
        scope.Research.Deactivate();
        await scope.Db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => LabServiceOrderingEligibility.RequireAsync(
            scope.Db, scope.Organization.Id, DateTime.UtcNow, default, scope.Research.Id));
        Assert.Equal("customer_department_not_available", error.ErrorCode);
    }

    [PostgreSqlReferenceFact]
    public async Task MissingInvitationIntentCannotGrantGeneralAccess()
    {
        await using var scope = await Scope.Create();
        var invitation = new OrganizationInvitation(scope.Organization.Id, $"invite-{Guid.NewGuid():N}@example.com",
            "Invited", "Person", false, Guid.NewGuid().ToString("N"), DateTime.UtcNow.AddDays(1));
        scope.Db.Add(invitation);
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.ValidateDepartmentIntentAsync(scope.Db, invitation, default));
        Assert.False(await scope.Db.OrganizationInvitationDepartments.AnyAsync(value => value.OrganizationInvitationId == invitation.Id));
    }

    private sealed class Scope(PSeqOperationsDbContext db, IDbContextTransaction transaction) : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db => db;
        public Organization Organization { get; } = new($"Department review {Guid.NewGuid():N}", OrganizationKind.Customer);
        public OrganizationDepartment General => Organization.Departments.Single(value => value.Code == OrganizationDepartment.DefaultCode);
        public OrganizationDepartment Research { get; private set; } = null!;
        public User Actor { get; private set; } = null!;
        public OrganizationMembership AdminMembership { get; private set; } = null!;
        public DefaultHttpContext Http { get; } = new();
        public IExternalIdentityContext Identity { get; private set; } = null!;
        public OrderRequestContext Context => new(db, Identity);

        public static async Task<Scope> Create()
        {
            var connection = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!;
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(connection)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options;
            var db = new PSeqOperationsDbContext(options, Options.Create(new PersistenceOptions()));
            var scope = new Scope(db, await db.Database.BeginTransactionAsync());
            var external = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"review-{Guid.NewGuid():N}@example.com", true);
            scope.Actor = new User(external.Email, "Department", "Administrator");
            scope.Actor.LinkExternalIdentity(external.Provider, external.SubjectId);
            scope.Actor.Activate();
            scope.Identity = new IdentityContext(external);
            scope.AdminMembership = new(scope.Actor.Id, scope.Organization.Id, true);
            scope.Research = new(scope.Organization.Id, "RESEARCH", "Research");
            db.AddRange(scope.Organization, scope.Actor, scope.AdminMembership, scope.Research);
            await db.SaveChangesAsync();
            scope.Http.Request.Headers["X-Organization-Id"] = scope.Organization.Id.ToString();
            scope.Http.Request.Headers["X-Department-Id"] = scope.General.Id.ToString();
            return scope;
        }

        public OrganizationDepartmentMembership AddMember(OrganizationDepartment department, bool admin)
        {
            var user = new User($"member-{Guid.NewGuid():N}@example.com", "Department", "Member");
            user.Activate();
            var membership = new OrganizationMembership(user.Id, Organization.Id, false);
            var assignment = new OrganizationDepartmentMembership(membership.Id, department.Id, admin);
            db.AddRange(user, membership, assignment);
            return assignment;
        }

        public LabServiceOrder AddOrder(OrganizationDepartment department)
        {
            var order = new LabServiceOrder(Organization.Id, department.Id, $"TEST-{Guid.NewGuid():N}",
                $"Review {Guid.NewGuid():N}", null, 1, false, "RNA", "Frozen", "No hazard", "Test instructions");
            db.Add(order);
            return order;
        }

        public Invoice AddInvoice(OrganizationDepartment department)
        {
            var order = AddOrder(department);
            var now = DateTime.UtcNow;
            var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial, "[]", 100, 0, "USD", now, now.AddDays(7));
            var invoice = new Invoice(Organization.Id, order.Id, quote.Id, $"INV-{Guid.NewGuid():N}",
                DateOnly.FromDateTime(now), 30, "{}", "{}", "{}", 100, 0, "test.pdf", new string('A', 64), Actor.Id, now);
            db.AddRange(quote, invoice);
            return invoice;
        }

        public async ValueTask DisposeAsync()
        {
            await transaction.RollbackAsync();
            await transaction.DisposeAsync();
            await db.DisposeAsync();
        }
    }

    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext
    { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class AuditContext : ICurrentUserContext
    { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "department-review"; }
    private sealed class RecordingStorage : IOperationalFileStorage
    {
        public int ReadCount { get; private set; }
        public Task<Stream> OpenReadAsync(string key, CancellationToken token) { ReadCount++; return Task.FromResult<Stream>(new MemoryStream()); }
        public Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken token) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string key, CancellationToken token) => throw new NotSupportedException();
    }
}
