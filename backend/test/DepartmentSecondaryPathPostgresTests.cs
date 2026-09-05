namespace PhaenoPortal.Test;

using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.DataProvisioning.Application;
using PSeq.Operations.Commercial.DataProvisioning.Domain;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.DataProvisioning.Controllers;
using PhaenoPortal.App.Features.DataProvisioning.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class DepartmentSecondaryPathPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SharedPackageFileAndArchiveCaptureRequestDepartmentAndHistoryNeverFollowsUserReassignment()
    {
        await using var scope = await Scope.Create();
        var grant = scope.Grant();
        await scope.Db.SaveChangesAsync();
        var controller = scope.Curated();
        var file = await controller.DownloadFile(grant.CuratedDatasetId, grant.CuratedDatasetVersion.Files.Single().Id, default);
        await Assert.IsType<FileStreamResult>(file).FileStream.DisposeAsync();
        scope.Select(scope.Research);
        var archive = await controller.DownloadArchive(grant.CuratedDatasetId, default);
        await Assert.IsType<FileStreamResult>(archive).FileStream.DisposeAsync();
        var downloads = await scope.Db.DatasetDownloadAudits.AsNoTracking().Where(value => value.OrganizationId == scope.Organization.Id).ToListAsync();
        Assert.Equal(scope.General.Id, downloads.Single(value => value.Kind == DatasetDownloadKind.File).DepartmentId);
        Assert.Equal(scope.Research.Id, downloads.Single(value => value.Kind == DatasetDownloadKind.Archive).DepartmentId);
        scope.Membership.SetOrganizationAdmin(false);
        var access = new OrganizationDepartmentMembership(scope.Membership.Id, scope.General.Id, true);
        scope.Db.Add(access);
        await scope.Db.SaveChangesAsync();
        scope.Select(scope.General);
        Assert.Equal(DatasetDownloadKind.File, Assert.Single(await controller.ListDownloadHistory(default)).Kind);
        // Historical scope remains the request's department, even when the same person moves.
        access.Deactivate();
        scope.Db.Add(new OrganizationDepartmentMembership(scope.Membership.Id, scope.Research.Id, true));
        await scope.Db.SaveChangesAsync();
        scope.Select(scope.Research);
        Assert.Equal(DatasetDownloadKind.Archive, Assert.Single(await controller.ListDownloadHistory(default)).Kind);
    }

    [PostgreSqlReferenceFact]
    public async Task LegacyUnknownHistoryIsRestrictedToOrganizationAdminsAndRevokedMembershipFailsClosed()
    {
        await using var scope = await Scope.Create();
        var grant = scope.Grant();
        var audit = new DatasetDownloadAudit(scope.Organization.Id, scope.General.Id, grant.Id,
            grant.CuratedDatasetVersionId, scope.Actor.Id, DatasetDownloadKind.File, null, DateTime.UtcNow, null, null);
        scope.Db.Add(audit);
        await scope.Db.SaveChangesAsync();
        await scope.Db.DatasetDownloadAudits.Where(value => value.Id == audit.Id)
            .ExecuteUpdateAsync(update => update.SetProperty(value => value.DepartmentId, (Guid?)null));
        Assert.Equal(audit.Id, Assert.Single(await scope.Curated().ListDownloadHistory(default)).Id);
        scope.Membership.SetOrganizationAdmin(false);
        var access = new OrganizationDepartmentMembership(scope.Membership.Id, scope.General.Id, true);
        scope.Db.Add(access);
        await scope.Db.SaveChangesAsync();
        Assert.Empty(await scope.Curated().ListDownloadHistory(default));
        access.SetDepartmentAdmin(false);
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<DataProvisioningException>(() => scope.Curated().ListDownloadHistory(default));
        access.Deactivate();
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<DataProvisioningException>(() => scope.Curated().List(default));
        await Assert.ThrowsAsync<DataProvisioningException>(() => scope.Curated().DownloadArchive(grant.CuratedDatasetId, default));
        Assert.Equal(0, scope.Storage.ReadCount);
    }

    [PostgreSqlReferenceFact]
    public async Task OtherDepartmentGrantIsAbsentFromListsDetailsAndDownloadsBeforeStorageOpens()
    {
        await using var scope = await Scope.Create();
        var hidden = scope.Grant(scope.Research);
        var visible = scope.Grant(scope.General);
        await scope.Db.SaveChangesAsync();
        var controller = scope.Curated();
        Assert.Equal(visible.CuratedDatasetId, Assert.Single(await controller.List(default)).DatasetId);
        Assert.Equal(404, (await Assert.ThrowsAsync<DataProvisioningException>(() => controller.Get(hidden.CuratedDatasetId, default))).StatusCode);
        await Assert.ThrowsAsync<DataProvisioningException>(() => controller.DownloadFile(hidden.CuratedDatasetId, hidden.CuratedDatasetVersion.Files.Single().Id, default));
        await Assert.ThrowsAsync<DataProvisioningException>(() => controller.DownloadArchive(hidden.CuratedDatasetId, default));
        Assert.Equal(0, scope.Storage.ReadCount);
        var other = new Organization($"Other {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.Add(other);
        await scope.Db.SaveChangesAsync();
        scope.Select(other.Departments.Single());
        await Assert.ThrowsAsync<DataProvisioningException>(() => controller.List(default));
    }

    [PostgreSqlReferenceFact]
    public async Task ActivityIncludesSharedAndSelectedDepartmentNoticesWithoutExposingOtherDepartments()
    {
        await using var scope = await Scope.Create();
        var own = scope.Notice(scope.Grant(scope.General));
        var shared = scope.Notice(scope.Grant());
        var hidden = scope.Notice(scope.Grant(scope.Research));
        await scope.Db.SaveChangesAsync();
        var activity = await scope.Curated().ListActivity(default);
        Assert.Equal(new[] { own.Id, shared.Id }.Order(), activity.Select(value => value.Id).Order());
        Assert.DoesNotContain(activity, value => value.Id == hidden.Id);
        scope.Membership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.Membership.Id, scope.General.Id, true));
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<DataProvisioningException>(() => scope.Curated().SubmitGovernanceAttestation(Guid.NewGuid(), new() { Version = 1, Notes = "Reviewed" }, default));
    }

    [PostgreSqlReferenceFact]
    public async Task QueuedOrderRechecksRecipientAssignmentsAndRetainsOnlySelectedAdminAndConfiguredRouting()
    {
        await using var scope = await Scope.Create();
        var administrator = scope.Member(scope.Research, true);
        var revoked = scope.Member(scope.Research, true);
        scope.Member(scope.Research, false);
        scope.Member(scope.General, true);
        var notice = scope.OrderNotice(scope.Research);
        await scope.Db.SaveChangesAsync();
        revoked.Access.Deactivate();
        scope.Organization.UpdateConfigurationDefaults(new(null, null, "fallback@example.test", null, null));
        scope.Research.UpdateConfiguration(null, null, "research-routing@example.test", null, null);
        await scope.Db.SaveChangesAsync();
        await scope.DeliverOrder(notice);
        Assert.Equal(new[] { scope.Actor.Email, administrator.User.Email, "research-routing@example.test" }.Order(), scope.Sender.Emails.Order());
        Assert.Equal(OrderNotificationStatus.Sent, notice.Status);
        // A distinct targeted notice may no longer deliver to the revoked recipient.
        scope.Research.UpdateConfiguration(null, null, null, null, null);
        scope.Organization.UpdateConfigurationDefaults(new(null, null, null, null, null));
        var targeted = scope.OrderNotice(scope.Research, revoked.User.Id);
        await scope.Db.SaveChangesAsync();
        scope.Sender.Emails.Clear();
        await scope.DeliverOrder(targeted);
        Assert.Empty(scope.Sender.Emails);
        Assert.Equal(OrderNotificationStatus.Failed, targeted.Status);
        Assert.Null(targeted.SentAt);
        Assert.Contains("No eligible recipients", targeted.LastError);
    }

    [PostgreSqlReferenceFact]
    public async Task InactiveOrForeignOrderScopeCannotDeliverEvenThroughConfiguredRouting()
    {
        foreach (var reason in new[] { "organization", "department", "foreign-department" })
        {
            await using var scope = await Scope.Create();
            var notice = scope.OrderNotice(scope.Research);
            scope.Organization.UpdateConfigurationDefaults(new(null, null, "fallback@example.test", null, null));
            await scope.Db.SaveChangesAsync();
            if (reason == "organization") scope.Organization.Deactivate();
            else if (reason == "department") scope.Research.Deactivate();
            else
            {
                var other = new Organization($"Other {Guid.NewGuid():N}", OrganizationKind.Customer);
                scope.Db.Add(other);
                await scope.Db.SaveChangesAsync();
                await scope.Db.OrderNotifications.Where(value => value.Id == notice.Id).ExecuteUpdateAsync(
                    update => update.SetProperty(value => value.DepartmentId, other.Departments.Single().Id));
                await scope.Db.Entry(notice).ReloadAsync();
            }
            await scope.Db.SaveChangesAsync();
            await scope.DeliverOrder(notice);
            Assert.Empty(scope.Sender.Emails);
            Assert.Equal(OrderNotificationStatus.Failed, notice.Status);
        }
    }

    [PostgreSqlReferenceFact]
    public async Task OrderRoutingInheritsOrganizationDefaultAndDeduplicatesCaseInsensitiveEmail()
    {
        await using var scope = await Scope.Create();
        var notice = scope.OrderNotice(scope.Research);
        scope.Organization.UpdateConfigurationDefaults(new(null, null, scope.Actor.Email.ToUpperInvariant(), null, null));
        await scope.Db.SaveChangesAsync();
        await scope.DeliverOrder(notice);
        Assert.Equal(scope.Actor.Email, Assert.Single(scope.Sender.Emails));
    }

    [PostgreSqlReferenceFact]
    public async Task RevokedGrantNoticeUsesCurrentAdminsAndOrganizationWideNoticesExcludeDepartmentAdmins()
    {
        await using var scope = await Scope.Create();
        var grant = scope.Grant(scope.Research);
        var administrator = scope.Member(scope.Research, true);
        var disabled = scope.Member(scope.Research, true);
        scope.Member(scope.General, true);
        scope.Member(scope.Research, false);
        var notice = scope.Notice(grant);
        await scope.Db.SaveChangesAsync();
        grant.Revoke("Synthetic revocation", scope.Actor.Id, DateTime.UtcNow);
        disabled.User.Deactivate();
        await scope.Db.SaveChangesAsync();
        await scope.DeliverData(notice);
        Assert.Equal(new[] { scope.Actor.Email, administrator.User.Email }.Order(), scope.Sender.Emails.Order());
        Assert.Equal(DataProvisioningNoticeStatus.Delivered, notice.Status);
        var shared = scope.Notice(null);
        await scope.Db.SaveChangesAsync();
        scope.Sender.Emails.Clear();
        await scope.DeliverData(shared);
        Assert.Equal(scope.Actor.Email, Assert.Single(scope.Sender.Emails));
    }

    [PostgreSqlReferenceFact]
    public async Task DataNoticeWithoutCurrentEligibleScopeIsFailedInsteadOfFalselyDelivered()
    {
        foreach (var reason in new[] { "organization", "department", "no-administrator", "membership" })
        {
            await using var scope = await Scope.Create();
            var notice = scope.Notice(scope.Grant(scope.Research));
            await scope.Db.SaveChangesAsync();
            if (reason == "organization") scope.Organization.Deactivate();
            else if (reason == "department") scope.Research.Deactivate();
            else if (reason == "membership") scope.Membership.Deactivate();
            else scope.Membership.SetOrganizationAdmin(false);
            await scope.Db.SaveChangesAsync();
            await scope.DeliverData(notice);
            Assert.Empty(scope.Sender.Emails);
            Assert.Equal(DataProvisioningNoticeStatus.Failed, notice.Status);
            Assert.Null(notice.DeliveredAt);
            Assert.Contains("No eligible recipients", notice.LastError);
            Assert.Equal(1, notice.AttemptCount);
        }
    }

    [PostgreSqlReferenceFact]
    public async Task SuspendedOrganizationStillReceivesGovernanceInstructionsOnlyThroughCurrentOrganizationAdmins()
    {
        await using var scope = await Scope.Create();
        scope.Member(scope.Research, true);
        var source = new SourceSample($"Governance {Guid.NewGuid():N}", true);
        var incident = new DataGovernanceIncident(source, DataGovernanceConcernCategory.Other,
            "Synthetic concern", "Stop using the synthetic copy", "Synthetic evidence", DateTime.UtcNow.AddDays(7));
        var affected = new DataGovernanceAffectedOrganization(incident.Id, scope.Organization, 1);
        DataProvisioningNotice Notice() => new(scope.Organization, DataProvisioningNoticeKind.Withdrawal,
            "Synthetic withdrawal", "Stop using the synthetic copy", DateTime.UtcNow, incident.Id);
        var notice = Notice();
        scope.Db.AddRange(source, incident, affected, notice);
        scope.Organization.Deactivate();
        await scope.Db.SaveChangesAsync();
        await scope.DeliverData(notice);
        Assert.Equal(scope.Actor.Email, Assert.Single(scope.Sender.Emails));
        Assert.Equal(DataProvisioningNoticeStatus.Delivered, notice.Status);
        // A suspended tenant remains denied in the Portal despite receiving safety instructions.
        await Assert.ThrowsAsync<DataProvisioningException>(() => scope.Curated().List(default));
        scope.Membership.Deactivate();
        var retry = Notice();
        scope.Db.Add(retry);
        await scope.Db.SaveChangesAsync();
        scope.Sender.Emails.Clear();
        await scope.DeliverData(retry);
        Assert.Empty(scope.Sender.Emails);
        Assert.Equal(DataProvisioningNoticeStatus.Failed, retry.Status);
        Assert.Null(retry.DeliveredAt);
        // Incident identity alone never makes an unrelated organization eligible.
        scope.Db.Remove(affected);
        scope.Membership.Activate();
        var unrelated = Notice();
        scope.Db.Add(unrelated);
        await scope.Db.SaveChangesAsync();
        await scope.DeliverData(unrelated);
        Assert.Empty(scope.Sender.Emails);
        Assert.Equal(DataProvisioningNoticeStatus.Failed, unrelated.Status);
    }

    [PostgreSqlReferenceFact]
    public async Task CustomerLabListCountSearchAndExportStayInSelectedDepartment()
    {
        await using var scope = await Scope.Create();
        var own = new LabServiceOrder(scope.Organization.Id, scope.General.Id, $"OWN-{Guid.NewGuid():N}", "Own", null, 1, false, "RNA", "Frozen", "Safe", "Instructions");
        var hidden = new LabServiceOrder(scope.Organization.Id, scope.Research.Id, $"HIDDEN-{Guid.NewGuid():N}", "Hidden", null, 1, false, "RNA", "Frozen", "Safe", "Instructions");
        scope.Db.AddRange(own, hidden);
        await scope.Db.SaveChangesAsync();
        var controller = new LabServiceOrdersController(scope.Db, scope.Context, null!, null!, Options.Create(new PSeqOrderToCashOptions()), null!, null!, null!, null!, null!) { ControllerContext = new() { HttpContext = scope.Http } };
        await CheckExport(() => controller.List(null, null, null, null, null), () => controller.List(null, hidden.OrderNumber, null, null, null),
            () => controller.Export(null, null, null, null, null), () => controller.Export(null, hidden.OrderNumber, null, null, null), own.Id, own.OrderNumber, hidden.OrderNumber);
    }

    [PostgreSqlReferenceFact]
    public async Task PartnerReagentListCountSearchAndExportStayInSelectedDepartment()
    {
        await using var scope = await Scope.Create(OrganizationKind.Partner);
        var own = new PartnerReagentOrder(scope.Organization.Id, scope.General.Id, $"OWN-{Guid.NewGuid():N}");
        var hidden = new PartnerReagentOrder(scope.Organization.Id, scope.Research.Id, $"HIDDEN-{Guid.NewGuid():N}");
        scope.Db.AddRange(own, hidden);
        await scope.Db.SaveChangesAsync();
        var controller = new ReagentOrdersController(scope.Db, scope.Context, null!) { ControllerContext = new() { HttpContext = scope.Http } };
        await CheckExport(() => controller.List(null, null, null, null, null), () => controller.List(null, hidden.OrderNumber, null, null, null),
            () => controller.Export(null, null, null, null, null), () => controller.Export(null, hidden.OrderNumber, null, null, null), own.Id, own.OrderNumber, hidden.OrderNumber);
        scope.Membership.SetOrganizationAdmin(false);
        var access = new OrganizationDepartmentMembership(scope.Membership.Id, scope.General.Id, false);
        scope.Db.Add(access);
        await scope.Db.SaveChangesAsync();
        Assert.Single((await controller.List(null, null, null, null, null)).Items);
        access.Deactivate();
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.Export(null, null, null, null, null));
    }

    [PostgreSqlReferenceFact]
    public async Task PartnerAssemblyListCountSearchAndExportStayInSelectedDepartment()
    {
        await using var scope = await Scope.Create(OrganizationKind.Partner);
        var catalog = new QboCatalogItem($"fixture-{Guid.NewGuid():N}", "Synthetic", "Fixture", "specimen", 1, "USD", true, DateTime.UtcNow);
        var profile = new AssemblyProfile(catalog.Id, "Synthetic profile", 1, "Fixture", "Instructions", "{}", "[]", "{}", 100, 100, true, true);
        DataAssemblyRequest Request(OrganizationDepartment department, string prefix) => new(scope.Organization.Id, department.Id, $"{prefix}-{Guid.NewGuid():N}", prefix, profile.Id, 1, profile.Name, "Instructions", "{}", "Test output", null, true);
        var own = Request(scope.General, "OWN");
        var hidden = Request(scope.Research, "HIDDEN");
        scope.Db.AddRange(catalog, profile, own, hidden);
        await scope.Db.SaveChangesAsync();
        var controller = new DataAssemblyRequestsController(scope.Db, scope.Context, null!, null!, null!, null!, null!, null!, null!, null!) { ControllerContext = new() { HttpContext = scope.Http } };
        await CheckExport(() => controller.List(null, null, null, null, null), () => controller.List(null, hidden.RequestNumber, null, null, null),
            () => controller.Export(null, null, null, null, null), () => controller.Export(null, hidden.RequestNumber, null, null, null), own.Id, own.RequestNumber, hidden.RequestNumber);
    }

    private static async Task CheckExport(Func<Task<PagedResult<OrderListItemDto>>> list, Func<Task<PagedResult<OrderListItemDto>>> search,
        Func<Task<FileContentResult>> export, Func<Task<FileContentResult>> searchedExport, Guid ownId, string ownNumber, string hiddenNumber)
    {
        var result = await list();
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(ownId, Assert.Single(result.Items).Id);
        Assert.Equal(0, (await search()).TotalCount);
        var csv = Encoding.UTF8.GetString((await export()).FileContents);
        Assert.Contains(ownNumber, csv);
        Assert.DoesNotContain(hiddenNumber, csv);
        Assert.DoesNotContain(hiddenNumber, Encoding.UTF8.GetString((await searchedExport()).FileContents));
    }

    private sealed class Scope(PSeqOperationsDbContext db, IDbContextTransaction transaction) : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db => db;
        public Organization Organization { get; private set; } = null!;
        public OrganizationDepartment General => Organization.Departments.Single(value => value.IsDefault);
        public OrganizationDepartment Research { get; private set; } = null!;
        public User Actor { get; private set; } = null!;
        public OrganizationMembership Membership { get; private set; } = null!;
        public DefaultHttpContext Http { get; } = new();
        public IExternalIdentityContext Identity { get; private set; } = null!;
        public ManagedStorage Storage { get; } = new();
        public Sender Sender { get; } = new();
        public OrderRequestContext Context => new(db, Identity);
        public CuratedDataController Curated() => new(db, Identity, Storage) { ControllerContext = new() { HttpContext = Http } };
        public void Select(OrganizationDepartment department) => Http.Request.Headers["X-Department-Id"] = department.Id.ToString();
        public static async Task<Scope> Create(OrganizationKind kind = OrganizationKind.Customer)
        {
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
                .UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options;
            var db = new PSeqOperationsDbContext(options, Options.Create(new PersistenceOptions()));
            var scope = new Scope(db, await db.Database.BeginTransactionAsync());
            scope.Organization = new($"Secondary scope {Guid.NewGuid():N}", kind);
            var identity = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"scope-{Guid.NewGuid():N}@example.test", true);
            scope.Actor = new(identity.Email, "Scope", "Administrator");
            scope.Actor.LinkExternalIdentity(identity.Provider, identity.SubjectId);
            scope.Actor.Activate();
            scope.Identity = new IdentityContext(identity);
            scope.Membership = new(scope.Actor.Id, scope.Organization.Id, true);
            scope.Research = new(scope.Organization.Id, "RESEARCH", "Research");
            db.AddRange(scope.Organization, scope.Actor, scope.Membership, scope.Research);
            await db.SaveChangesAsync();
            scope.Http.Request.Headers["X-Organization-Id"] = scope.Organization.Id.ToString();
            scope.Select(scope.General);
            return scope;
        }
        public (User User, OrganizationMembership Membership, OrganizationDepartmentMembership Access) Member(OrganizationDepartment department, bool admin)
        {
            var user = new User($"member-{Guid.NewGuid():N}@example.test", "Scoped", "Member");
            user.Activate();
            var membership = new OrganizationMembership(user.Id, Organization.Id, false);
            var access = new OrganizationDepartmentMembership(membership.Id, department.Id, admin);
            db.AddRange(user, membership, access);
            return (user, membership, access);
        }
        public OrganizationDatasetGrant Grant(OrganizationDepartment? department = null)
        {
            var now = DateTime.UtcNow;
            var source = new SourceSample($"Synthetic {Guid.NewGuid():N}", true);
            source.UpdateMetadata(source.Label, "Fixture", "Synthetic context", "Synthetic assay", "Synthetic analysis", "Passed", "Automated fixture");
            source.ConfirmOwnership("Phaeno fixture", "TEST", Actor.Id, now);
            source.ConfirmDeidentification("Synthetic only", null, Actor.Id, now);
            var file = new ManagedFile(source.Id, "fixture.json", "structured_fixture", "application/json", 2, new string('a', 64), $"test/{Guid.NewGuid():N}/fixture.json");
            file.RecordScan(ManagedFileScanStatus.Clean, "Test");
            source.Files.Add(file);
            source.MarkReady(Actor.Id, now);
            var dataset = new CuratedDataset($"Fixture {Guid.NewGuid():N}", "Synthetic test package");
            var version = new CuratedDatasetVersion(dataset.Id, 1, source, "Fixture", now);
            version.Files.Add(new CuratedDatasetVersionFile(version.Id, file));
            var manifest = DatasetManifestService.Build(version);
            version.SetManifest(manifest.ManifestJson, manifest.ContentChecksum);
            version.Publish(Actor.Id, now);
            var grant = new OrganizationDatasetGrant(Organization, dataset, version, Actor.Id, now, department);
            db.AddRange(source, dataset, version, grant);
            return grant;
        }
        public DataProvisioningNotice Notice(OrganizationDatasetGrant? grant)
        {
            var notice = new DataProvisioningNotice(Organization, DataProvisioningNoticeKind.Revocation, "Synthetic notice", "No production data", DateTime.UtcNow, organizationDatasetGrantId: grant?.Id);
            db.Add(notice);
            return notice;
        }
        public OrderNotification OrderNotice(OrganizationDepartment department, Guid? recipient = null)
        {
            var notice = new OrderNotification(Organization.Id, recipient, OrderWorkflowTypes.LabService, Guid.NewGuid(), "scope-test", "Synthetic notice", "No production data", department.Id);
            notice.BeginAttempt(DateTime.UtcNow.AddMinutes(5));
            db.Add(notice);
            return notice;
        }
        public Task DeliverOrder(OrderNotification notice) => OrderNotificationDispatcher.DeliverAsync(db, Sender, notice.Id, notice.Version, NullLogger.Instance, default);
        public async Task DeliverData(DataProvisioningNotice notice)
        {
            await DataProvisioningNoticeDispatcher.DeliverAsync(db, Sender, notice, NullLogger.Instance, default);
            await db.SaveChangesAsync();
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
    { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "secondary-scope-test"; }
    private sealed class ManagedStorage : IManagedFileStorage
    {
        public int ReadCount { get; private set; }
        public Task<Stream> OpenReadAsync(string key, CancellationToken token) { ReadCount++; return Task.FromResult<Stream>(new MemoryStream(Encoding.UTF8.GetBytes("{}"))); }
        public Task<StoredFileResult> SaveAsync(Stream content, string extension, long limit, CancellationToken token) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string key, CancellationToken token) => throw new NotSupportedException();
    }
    private sealed class Sender : IOrderNotificationSender, IDataProvisioningNoticeSender
    {
        public List<string> Emails { get; } = [];
        public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken token) { Emails.AddRange(recipients); return Task.CompletedTask; }
        public Task SendAsync(DataProvisioningNoticeMessage message, CancellationToken token) { Emails.Add(message.Email); return Task.CompletedTask; }
    }
}
