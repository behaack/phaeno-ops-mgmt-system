namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.Controllers;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class CrmCommercialAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task CommercialCanMaintainCrmWithoutAdministrationOrPortalAccessPowers()
    {
        await using var scope = await Scope.Create();
        var companies = scope.Controller(new CrmCompaniesController(scope.Db, scope.Identity));
        var created = await companies.CreateCompany(new() { Name = $"Commercial CRM {Guid.NewGuid():N}" }, default);
        var company = Assert.IsType<CrmCompanyDto>(Assert.IsType<CreatedResult>(created.Result).Value);
        var edited = await companies.UpdateCompany(company.Id, new() { Name = company.Name, Description = "Reviewed commercial context", Version = company.Version }, default);
        Assert.Equal("Reviewed commercial context", edited.Description);
        Assert.Null(edited.AccessOrganizationId);
        var work = scope.Controller(new CrmWorkController(scope.Db, scope.Identity));
        Assert.Contains(await work.Owners(default), owner => owner.Id == scope.Actor.Id);
        await work.CreateActivity(new(CrmActivityType.Note, "Commercial follow-up", null, DateTime.UtcNow, CrmActivityVisibility.Internal, company.Id, null, null, null, null), default);
        var administration = scope.Controller(new CrmAdministrationController(scope.Db, scope.Identity));
        await administration.CreateSavedView(new("My view", CrmRecordType.Company, "{}", false, null), default);
        Assert.Contains(await administration.SavedViews(CrmRecordType.Company, default), view => view.OwnerUserId == scope.Actor.Id && !view.IsShared);
        await Forbidden(() => companies.DeactivateCompany(company.Id, new() { Version = edited.Version }, default));
        await Forbidden(() => companies.MergeCompany(company.Id, new() { TargetId = Guid.NewGuid(), Reason = "Not authorized", Version = edited.Version }, default));
        await Forbidden(() => administration.CreateSavedView(new("Shared", CrmRecordType.Company, "{}", true, null), default));
        await Forbidden(() => administration.Export(new(CrmRecordType.Company, "{}"), default));
        await Forbidden(() => administration.CreateCustomField(new("Restricted", CrmRecordType.Company, CrmCustomFieldDataType.Text, CrmFieldSensitivity.Restricted, null, false, null), default));
        await Forbidden(() => scope.Controller(new CrmCompanyPeopleController(scope.Db, scope.Identity)).List(company.Id, default));
        Assert.True((await companies.GetCompany(company.Id, default)).IsActive);
    }

    [PostgreSqlReferenceFact]
    public async Task RestrictedActivityAndCustomValuesAreNeitherReadNorEditableByCommercial()
    {
        await using var scope = await Scope.Create();
        var company = new CrmCompany($"Visibility CRM {Guid.NewGuid():N}", scope.Actor.Id);
        var publicActivity = new CrmActivity(CrmActivityType.Note, "Ordinary context", null, DateTime.UtcNow, CrmActivityVisibility.Internal, scope.Actor.Id, company.Id);
        var restrictedActivity = new CrmActivity(CrmActivityType.Note, "Restricted context", "Private", DateTime.UtcNow, CrmActivityVisibility.Restricted, scope.Actor.Id, company.Id);
        var internalField = new CrmCustomFieldDefinition("Ordinary", CrmRecordType.Company, CrmCustomFieldDataType.Text, CrmFieldSensitivity.Internal, null, false);
        var restrictedField = new CrmCustomFieldDefinition("Restricted", CrmRecordType.Company, CrmCustomFieldDataType.Text, CrmFieldSensitivity.Restricted, null, false);
        scope.Db.AddRange(company, publicActivity, restrictedActivity, internalField, restrictedField,
            new CrmCustomFieldValue(internalField.Id, company.Id, "\"Ordinary\""), new CrmCustomFieldValue(restrictedField.Id, company.Id, "\"Private\""));
        await scope.Db.SaveChangesAsync();
        var work = scope.Controller(new CrmWorkController(scope.Db, scope.Identity));
        Assert.Equal(publicActivity.Id, Assert.Single((await work.Activities(null, company.Id, null, null, null)).Items).Id);
        await Forbidden(() => work.CreateActivity(new(CrmActivityType.Note, "Restricted", null, DateTime.UtcNow, CrmActivityVisibility.Restricted, company.Id, null, null, null, null), default));
        await Forbidden(() => work.UpdateActivity(restrictedActivity.Id, new(CrmActivityType.Note, "Changed", null, DateTime.UtcNow, CrmActivityVisibility.Internal, company.Id, null, null, null, restrictedActivity.Version), default));
        await Forbidden(() => work.DeactivateActivity(restrictedActivity.Id, new() { Version = restrictedActivity.Version }, default));
        var administration = scope.Controller(new CrmAdministrationController(scope.Db, scope.Identity));
        var definitions = await administration.CustomFields(CrmRecordType.Company);
        Assert.Contains(definitions, definition => definition.Id == internalField.Id);
        Assert.DoesNotContain(definitions, definition => definition.Id == restrictedField.Id);
        Assert.Equal(internalField.Id, Assert.Single(await administration.CustomFieldValues(company.Id, default)).DefinitionId);
        await Forbidden(() => administration.SetCustomFieldValue(new(restrictedField.Id, company.Id, "\"Changed\"", 1), default));
        Assert.Equal("Restricted context", restrictedActivity.Subject);
    }

    [PostgreSqlReferenceFact]
    public async Task RevokedCommercialAssignmentAndExternalAdministratorCannotReadCrm()
    {
        await using var scope = await Scope.Create();
        scope.Role.SetActive(false);
        await scope.Db.SaveChangesAsync();
        await Forbidden(() => scope.Controller(new CrmWorkController(scope.Db, scope.Identity)).Dashboard(default));
        scope.Role.SetActive(true);
        scope.Membership.Deactivate();
        var external = new Organization($"Customer {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.AddRange(external, new OrganizationMembership(scope.Actor.Id, external.Id, true));
        await scope.Db.SaveChangesAsync();
        await Forbidden(() => scope.Controller(new CrmWorkController(scope.Db, scope.Identity)).Owners(default));
    }

    private static async Task Forbidden(Func<Task> action) => Assert.Equal(403, (await Assert.ThrowsAsync<CrmException>(action)).StatusCode);

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
    private sealed class AuditContext : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "crm-commercial-access-test"; }
}
