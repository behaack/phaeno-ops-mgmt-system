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
    public async Task InvalidImportCommitLeavesPreviewAndBusinessRecordsUnchanged()
    {
        await using var scope = await Scope.Create();
        scope.Membership.SetOrganizationAdmin(true);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmAdministrationController(scope.Db, scope.Identity));
        var name = $"TEST ONLY invalid import {Guid.NewGuid():N}";
        var result = await controller.PreviewImport(new(CrmRecordType.Company, Guid.NewGuid().ToString(), "invalid.csv",
            [new(new Dictionary<string, string?> { ["name"] = name }),
             new(new Dictionary<string, string?> { ["name"] = null }),
             new(new Dictionary<string, string?> { ["name"] = "" })]), default);
        var preview = Assert.IsType<CrmImportPreviewDto>(Assert.IsType<CreatedResult>(result.Result).Value);
        Assert.Equal(2, preview.InvalidRows);
        scope.Db.ChangeTracker.Clear();
        var error = await Assert.ThrowsAsync<CrmException>(() => controller.CommitImport(preview.BatchId, new(preview.Version), default));
        Assert.Equal(400, error.StatusCode);
        Assert.False(await scope.Db.CrmCompanies.AsNoTracking().AnyAsync(value => value.Name == name));
        Assert.DoesNotContain(scope.Db.ChangeTracker.Entries<CrmCompany>(), entry => entry.State == EntityState.Added);
        scope.Db.ChangeTracker.Clear();
        var saved = await scope.Db.CrmImportBatches.AsNoTracking().SingleAsync(value => value.Id == preview.BatchId);
        Assert.Equal(CrmImportStatus.Previewed, saved.Status);
        Assert.Equal(preview.Version, saved.Version);
        Assert.Null(saved.CommittedAt);
    }

    [PostgreSqlReferenceFact]
    public async Task OpportunityStageMoveReturnsSavedStageAndRejectsStaleReplayWithoutDuplicateHistory()
    {
        await using var scope = await Scope.Create();
        var company = new CrmCompany($"TEST ONLY stage response {Guid.NewGuid():N}", scope.Actor.Id);
        var pipeline = new CrmPipeline($"TEST ONLY stage response {Guid.NewGuid():N}", null, false);
        var initial = new CrmPipelineStage(pipeline.Id, "Discovery", 10, CrmPipelineStageCategory.Open, 10, false);
        var qualified = new CrmPipelineStage(pipeline.Id, "Qualified", 20, CrmPipelineStageCategory.Open, 25, false);
        var lost = new CrmPipelineStage(pipeline.Id, "Lost", 30, CrmPipelineStageCategory.Lost, 0, true);
        scope.Db.AddRange(company, pipeline, initial, qualified, lost);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Controller(new CrmOpportunitiesController(scope.Db, scope.Identity));
        var result = await controller.Create(new("TEST ONLY stage response", company.Id, pipeline.Id, initial.Id,
            null, null, 100m, "USD", null, null, null, null, [], null), default);
        var created = Assert.IsType<CrmOpportunityDto>(Assert.IsType<CreatedResult>(result.Result).Value);
        scope.Db.ChangeTracker.Clear();
        var command = new MoveCrmOpportunityStageRequest(qualified.Id, "Reviewed next stage", created.Version);
        var moved = await controller.MoveStage(created.Id, command, default);
        Assert.Equal(qualified.Id, moved.StageId);
        Assert.Equal("Qualified", moved.StageName);
        Assert.Equal(25, moved.Probability);
        Assert.Equal(created.Version + 1, moved.Version);
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(moved, await controller.Get(created.Id, default));
        var history = await controller.StageHistory(created.Id, default);
        Assert.Equal(2, history.Count);
        Assert.Contains(history, value => value.FromStageId == initial.Id && value.ToStageId == qualified.Id && value.Reason == command.Reason);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => controller.MoveStage(created.Id, command, default));
        Assert.Equal(history, await controller.StageHistory(created.Id, default));
        var closed = await controller.MoveStage(created.Id, new(lost.Id, "Reviewed loss", moved.Version), default);
        Assert.Equal(CrmPipelineStageCategory.Lost, closed.StageCategory);
        Assert.NotNull(closed.ClosedAt);
        scope.Db.ChangeTracker.Clear();
        var reopened = await controller.MoveStage(created.Id, new(qualified.Id, "New pursuit", closed.Version), default);
        Assert.Equal(CrmPipelineStageCategory.Open, reopened.StageCategory);
        Assert.Null(reopened.ClosedAt);
        Assert.Equal(4, (await controller.StageHistory(created.Id, default)).Count);
    }

    [PostgreSqlReferenceFact]
    public async Task DisqualifiedLeadRejectsProfileAndStatusChangesWithoutChangingHistory()
    {
        await using var scope = await Scope.Create();
        var controller = scope.Controller(new CrmLeadsController(scope.Db, scope.Identity));
        var input = new UpsertCrmLeadRequest(CrmLeadKind.Company, "TEST ONLY terminal lead", "TEST ONLY Company",
            null, null, null, null, "Isolated regression", null, null, [], null);
        var created = await controller.Create(input, default);
        var lead = Assert.IsType<CrmLeadDto>(Assert.IsType<CreatedResult>(created.Result).Value);
        var disqualified = await controller.Disqualify(lead.Id, new("Outside the requested scope", lead.Version), default);
        var before = await Snapshot();
        Func<Task>[] commands = [
            () => controller.Update(lead.Id, input with { DisplayName = "Changed history", Version = disqualified.Version }, default),
            () => controller.StartWorking(lead.Id, new() { Version = disqualified.Version }, default),
            () => controller.Qualify(lead.Id, new("Erase terminal decision", disqualified.Version), default),
            () => controller.Disqualify(lead.Id, new("Replace original reason", disqualified.Version), default),
            () => controller.Convert(lead.Id, new(null, true, false, false, null, null, disqualified.Version), default),
        ];
        foreach (var command in commands)
        {
            var error = await Assert.ThrowsAsync<CrmException>(command);
            Assert.Equal(409, error.StatusCode);
            Assert.Equal(before, await Snapshot());
        }

        async Task<string> Snapshot()
        {
            scope.Db.ChangeTracker.Clear();
            return System.Text.Json.JsonSerializer.Serialize(new
            {
                Lead = await controller.Get(lead.Id, default),
                History = await scope.Db.CrmActivities.AsNoTracking().Where(value => value.LeadId == lead.Id)
                    .OrderBy(value => value.Id).Select(value => new { value.Id, value.Subject, value.Body, value.ActorUserId, value.Version }).ToListAsync(),
            });
        }
    }

    [PostgreSqlReferenceFact]
    public async Task OutreachDecisionsPersistWithImmutableHistoryAndCannotBeChangedThroughLegacyFields()
    {
        await using var scope = await Scope.Create();
        var controller = scope.Controller(new CrmContactsController(scope.Db, scope.Identity));
        var created = await controller.Create(new("Test", "Outreach", "outreach@example.test", null, null,
            CrmCommunicationPreference.Unknown, null, null, [], null), default);
        var contact = Assert.IsType<CrmContactDto>(Assert.IsType<CreatedResult>(created.Result).Value);
        Assert.False(contact.CanReceiveOutreach);
        var request = new UpsertCrmContactRequest(contact.FirstName, contact.LastName, contact.Email, null, null,
            contact.CommunicationPreference, contact.LawfulContactBasis, contact.CommunicationNotes, [], contact.Version);
        Assert.Equal("crm_outreach_review_required", (await Assert.ThrowsAsync<CrmException>(() => controller.Update(contact.Id,
            request with { CommunicationPreference = CrmCommunicationPreference.Permitted }, default))).ErrorCode);
        var allowed = await controller.Update(contact.Id, request with { OutreachDecision = new(CrmCommunicationPreference.Permitted,
            "RecordedConsent", DateOnly.FromDateTime(DateTime.UtcNow), null, "Product update email requested") }, default);
        Assert.True(allowed.CanReceiveOutreach);
        scope.Db.ChangeTracker.Clear();
        Assert.Equal("Allowed", (await controller.Get(contact.Id, default)).OutreachStatus);
        var history = Assert.Single(await scope.Db.CrmActivities.Where(a => a.ContactId == contact.Id).ToListAsync());
        Assert.Equal(CrmActivityType.System, history.Type);
        Assert.Equal(scope.Actor.Id, history.ActorUserId);
        Assert.Contains("Previous decision:", history.Body);
        Assert.Contains("Product update email requested", history.Body);
        var work = scope.Controller(new CrmWorkController(scope.Db, scope.Identity));
        await Assert.ThrowsAsync<CrmException>(() => work.DeactivateActivity(history.Id, new() { Version = history.Version }, default));
        await Assert.ThrowsAsync<CrmException>(() => work.UpdateActivity(history.Id, new(CrmActivityType.Note, "Erase decision", null,
            DateTime.UtcNow, CrmActivityVisibility.Internal, null, contact.Id, null, null, history.Version), default));
        var changedEmail = await controller.Update(contact.Id, request with { Email = "replacement@example.test", Version = allowed.Version,
            CommunicationPreference = allowed.CommunicationPreference, CommunicationNotes = allowed.CommunicationNotes }, default);
        Assert.Equal("NotEstablished", changedEmail.OutreachStatus);
        Assert.False(changedEmail.CanReceiveOutreach);
        Assert.Equal(2, await scope.Db.CrmActivities.CountAsync(a => a.ContactId == contact.Id));
    }

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
