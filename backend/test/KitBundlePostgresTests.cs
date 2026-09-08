namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class KitBundlePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SavedJsonbScopePlacesExactlyOnceAndChangedProfileRollsBackUntilDraftReview()
    {
        await using var scope = await Scope.Create();
        var draft = await scope.CreateOrder(2);
        var line = await scope.Db.PartnerReagentOrderLines.AsNoTracking().SingleAsync(x => x.PartnerReagentOrderId == draft.Id);
        Assert.NotNull(line.IncludedAssemblyProfileSnapshotJson);
        Assert.Equal(scope.Profile.Id, KitBundleService.FrozenProfileDto(line.IncludedAssemblyProfileSnapshotJson!).Id);
        var key = Guid.NewGuid().ToString(); var placement = scope.Placement(draft);
        var placed = await scope.TenantController(key).Place(draft.Id, placement, default);
        var replay = await scope.TenantController(key).Place(draft.Id, placement, default);
        Assert.Equal(placed.Id, replay.Id); Assert.Equal(placed.Version, replay.Version);
        Assert.Equal(2, placed.KitUnits!.Count); Assert.Equal(2, placed.AssemblyCases!.Count);
        Assert.Single(await scope.Db.Set<CommercialSaleSummary>().Where(x => x.OrderId == placed.Id).ToListAsync());
        Assert.Single(await scope.Db.CommercialDocumentLinks.Where(x => x.WorkflowId == placed.Id).ToListAsync());

        var next = await scope.CreateOrder(1);
        var profile = await scope.Db.AssemblyProfiles.SingleAsync(x => x.Id == scope.Profile.Id);
        profile.Update("New reviewed description", profile.Instructions, profile.MetadataSchemaJson, profile.AllowedFileKindsJson,
            "{\"outputs\":[\"updated.fasta\"]}", profile.MaximumFileSizeBytes, profile.MaximumTotalSizeBytes, true, false);
        await scope.Db.SaveChangesAsync();
        Assert.Equal("kit_scope_changed", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.TenantController().Place(next.Id, scope.Placement(next), default))).ErrorCode);
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(ReagentOrderStatus.Draft, (await scope.Db.PartnerReagentOrders.SingleAsync(x => x.Id == next.Id)).Status);
        Assert.False(await scope.Db.PartnerKitUnits.AnyAsync(x => x.PartnerReagentOrderId == next.Id));
        Assert.False(await scope.Db.CommercialDocumentLinks.AnyAsync(x => x.WorkflowId == next.Id));
        var refreshed = await scope.TenantController().Update(next.Id, scope.Writes(1) with { Version = next.Version }, default);
        Assert.True(refreshed.Version > next.Version);
        var current = await scope.TenantController().Place(next.Id, scope.Placement(refreshed), default);
        Assert.Contains("updated.fasta", Assert.Single(current.AssemblyCases!).Profile.OutputContractJson);
    }

    [PostgreSqlReferenceFact]
    public async Task SplitShipmentsFreezePerUnitDeadlinesAndOriginalBillingSources()
    {
        await using var scope = await Scope.Create();
        var placed = await scope.PlaceOrder(3);
        var accepted = await scope.Platform().Accept(placed.Id, new(placed.Version), default);
        var firstAt = DateTime.UtcNow.AddDays(-2); firstAt = firstAt.AddTicks(-(firstAt.Ticks % 10));
        var expiry = firstAt.AddMonths(2);
        var firstRequest = new CreateShipmentRequest(accepted.Version, "Fixture carrier", null, "FIRST", firstAt,
            [new(Assert.Single(accepted.Lines).Id, 1, "LOT-FIRST", expiry)]);
        var shipmentKey = Guid.NewGuid().ToString();
        var first = await scope.Platform(shipmentKey).CreateShipment(placed.Id, firstRequest, default);
        await scope.Platform(shipmentKey).CreateShipment(placed.Id, firstRequest, default);
        Assert.Equal("PartiallyShipped", first.Status);
        Assert.Equal(1, first.KitUnits!.Count(x => x.Status == "Shipped"));
        var secondAt = firstAt.AddDays(1);
        var second = await scope.Platform().CreateShipment(placed.Id, new(first.Version, "Fixture carrier", null, "SECOND", secondAt,
            [new(Assert.Single(first.Lines).Id, 2, "LOT-SECOND", null)]), default);
        var fulfilled = await scope.Platform().Fulfill(placed.Id, new(second.Version), default);
        Assert.Equal("KitFulfilledAssemblyPending", fulfilled.Status);
        var cases = await scope.Db.KitAssemblyCases.AsNoTracking().Where(x => x.PartnerReagentOrderId == placed.Id).ToListAsync();
        Assert.Equal(3, cases.Count);
        Assert.Single(cases, x => x.SubmissionDeadlineAt == expiry.AddDays(90));
        Assert.Equal(2, cases.Count(x => x.SubmissionDeadlineAt == secondAt.AddMonths(12)));
        Assert.Equal(2, cases.Select(x => x.BillingDocumentId).Distinct().Count());
        var invoices = await scope.Db.CommercialDocumentLinks.AsNoTracking().Where(x => x.WorkflowId == placed.Id && x.Kind == CommercialDocumentKind.Invoice).ToListAsync();
        Assert.Equal(new[] { 100m, 200m }, invoices.Select(x => x.Total).Order().ToArray());
        Assert.All(cases, included => Assert.Contains(invoices, invoice => invoice.Id == included.BillingDocumentId));
        Assert.Equal(2, await scope.Db.ReagentShipments.CountAsync(x => x.PartnerReagentOrderId == placed.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task ReplacementRetainsInputHistoryAndIncludedReleaseUsesKitBalanceWithoutSecondInvoice()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(1);
        var included = Assert.Single(order.AssemblyCases!);
        var original = included.CurrentKitUnitId;
        var billing = (await scope.Db.KitAssemblyCases.AsNoTracking().SingleAsync(x => x.Id == included.Id)).BillingDocumentId;
        var start = new KitAssemblyStartRequest(included.Version, "Synthetic project", "{}", "Attempted different outputs", null, true);
        var key = Guid.NewGuid().ToString();
        var draft = await scope.Assembly(key).PrepareIncludedCase(order.Id, included.Id, start, default);
        var replay = await scope.Assembly(key).PrepareIncludedCase(order.Id, included.Id, start, default);
        Assert.Equal(draft.Id, replay.Id);
        var wrongDepartment = scope.Assembly(key);
        wrongDepartment.HttpContext.Request.Headers["X-Department-Id"] = scope.OtherDepartment.Id.ToString();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            wrongDepartment.PrepareIncludedCase(order.Id, included.Id, start, default))).StatusCode);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.Assembly(key).PrepareIncludedCase(Guid.NewGuid(), included.Id, start, default))).StatusCode);
        Assert.DoesNotContain("Attempted different outputs", draft.RequestedOutput);
        var input = await scope.AddFile(draft.Id, null, OperationalFilePurpose.AssemblyInput);
        var submitted = await scope.Assembly().Submit(draft.Id, new(draft.Version, JsonSerializer.Serialize(new { files = new[] { new { id = input.Id } } })), default);
        var validating = await scope.Scientific().BeginIntake(draft.Id, new(submitted.Version), default);
        var changes = await scope.Scientific().RequestChanges(draft.Id, new(validating.Version, "Replace affected inputs", null), default);
        var currentOrder = await scope.Platform().Get(order.Id, default);
        var currentCase = Assert.Single(currentOrder.AssemblyCases!);
        var replaced = await scope.Platform().ReplaceKit(order.Id, included.Id,
            new(currentCase.Version, "Synthetic damaged Kit replacement", "REPLACEMENT", null, DateTime.UtcNow, "Fixture carrier", "REPLACE"), default);
        var replacement = Assert.Single(replaced.AssemblyCases!).CurrentKitUnitId;
        Assert.NotEqual(original, replacement);
        var again = await scope.Assembly().Submit(draft.Id, new(changes.Version, JsonSerializer.Serialize(new { files = new[] { new { id = input.Id } } })), default);
        var revisions = await scope.Db.AssemblyInputRevisions.AsNoTracking().Where(x => x.DataAssemblyRequestId == draft.Id).OrderBy(x => x.Revision).ToListAsync();
        Assert.Equal(2, revisions.Count); Assert.Equal(original, revisions[0].KitUnitId); Assert.Equal(replacement, revisions[1].KitUnitId);
        Assert.Equal(revisions[0].Id, revisions[1].PreviousRevisionId);
        var intake = await scope.Scientific().BeginIntake(draft.Id, new(again.Version), default);
        var queued = await scope.Scientific().AcceptIntake(draft.Id, new(intake.Version), default);
        Assert.Empty(queued.Quotes); Assert.False(queued.CanAcceptQuote);
        var processing = await scope.Scientific().StartProcessing(draft.Id, new(queued.Version, "1", "fixture-pipeline", "Synthetic acceptance"), default);
        var run = Assert.Single(processing.ProcessingRuns);
        var review = await scope.Scientific().DecideProcessing(draft.Id, run.Id, new(processing.Version, run.Id, true, "Pass"), default);
        await scope.AddFile(draft.Id, run.Id, OperationalFilePurpose.AssemblyOutput);
        var held = await scope.Scientific().ReleaseOutput(draft.Id, new(review.Version, run.Id, "{}", "fixture-pipeline", "Synthetic acceptance", "Pass"), default);
        Assert.Equal("PaymentHold", Assert.Single(held.OutputReleases).ReleaseStatus);
        Assert.False(await scope.Db.CommercialDocumentLinks.AnyAsync(x => x.WorkflowType == OrderWorkflowTypes.DataAssembly && x.WorkflowId == draft.Id));
        Assert.Equal(billing, (await scope.Db.KitAssemblyCases.AsNoTracking().SingleAsync(x => x.Id == included.Id)).BillingDocumentId);
        await scope.ReleaseService().ApplyAssemblyReleaseGateAsync(draft.Id, 0m, default);
        await scope.Db.SaveChangesAsync();
        Assert.Equal(FileReleaseStatus.PaymentHold, (await scope.Db.AssemblyOutputReleases.AsNoTracking()
            .SingleAsync(x => x.DataAssemblyRequestId == draft.Id)).ReleaseStatus);
        // Independent Assembly-credit policy releases against this purchased Kit's
        // original invoice; it never inserts a separately sold Assembly invoice.
        var commercial = new OrganizationCommercialProfile(scope.Partner.Id);
        commercial.Update(null, false, true, scope.Operator.Id, DateTime.UtcNow);
        scope.Db.Add(commercial); await scope.Db.SaveChangesAsync();
        scope.Db.ChangeTracker.Clear();
        using var services = new ServiceCollection().AddSingleton(scope.Db).AddSingleton(scope.ReleaseService()).BuildServiceProvider();
        await KitCaseLifecycleWorker.ProcessCaseAsync(services, included.Id, DateTime.UtcNow, default);
        var released = await scope.Scientific().Get(draft.Id, default);
        Assert.Equal("Released", Assert.Single(released.OutputReleases).ReleaseStatus);
        var complete = await scope.Scientific().Complete(draft.Id, new(released.Version), default);
        Assert.Equal("Completed", complete.Status);
        Assert.Equal("Completed", (await scope.Platform().Get(order.Id, default)).Status);
        Assert.Single(await scope.Db.CommercialDocumentLinks.Where(x => x.WorkflowId == order.Id && x.Kind == CommercialDocumentKind.Invoice).ToListAsync());
        Assert.False(await scope.Db.CommercialDocumentLinks.AnyAsync(x => x.WorkflowId == draft.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task PaidIncludedOutputWaitsForOperationalHoldAndCancellationDecision()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(1);
        var included = Assert.Single(order.AssemblyCases!);
        var draft = await scope.Assembly().PrepareIncludedCase(order.Id, included.Id,
            new(included.Version, "Held output project", "{}", "Included outputs", null, true), default);
        var input = await scope.AddFile(draft.Id, null, OperationalFilePurpose.AssemblyInput);
        var submitted = await scope.Assembly().Submit(draft.Id,
            new(draft.Version, JsonSerializer.Serialize(new { files = new[] { new { id = input.Id } } })), default);
        var intake = await scope.Scientific().BeginIntake(draft.Id, new(submitted.Version), default);
        var queued = await scope.Scientific().AcceptIntake(draft.Id, new(intake.Version), default);
        var processing = await scope.Scientific().StartProcessing(draft.Id,
            new(queued.Version, "1", "fixture-pipeline", "Synthetic held-output acceptance"), default);
        var run = Assert.Single(processing.ProcessingRuns);
        var review = await scope.Scientific().DecideProcessing(draft.Id, run.Id,
            new(processing.Version, run.Id, true, "Pass"), default);
        await scope.AddFile(draft.Id, run.Id, OperationalFilePurpose.AssemblyOutput);
        var available = await scope.Scientific().ReleaseOutput(draft.Id,
            new(review.Version, run.Id, "{}", "fixture-pipeline", "Synthetic acceptance", "Pass"), default);
        Assert.Equal("PaymentHold", Assert.Single(available.OutputReleases).ReleaseStatus);
        var held = await scope.Scientific().Hold(draft.Id, new(available.Version, "Scientific review still required", null), default);

        // Only this disposable fixture's original shipment invoice is paid.
        // Neither an Assembly-credit exception nor another invoice is involved.
        var billingId = (await scope.Db.KitAssemblyCases.AsNoTracking().SingleAsync(x => x.Id == included.Id)).BillingDocumentId;
        var invoice = await scope.Db.CommercialDocumentLinks.SingleAsync(x => x.Id == billingId);
        invoice.MarkSynchronized("synthetic-paid-kit", "SYNTHETIC-PAID", null, invoice.Total, 0m, invoice.Currency, DateTime.UtcNow);
        await scope.Db.SaveChangesAsync();
        using var services = new ServiceCollection().AddSingleton(scope.Db).AddSingleton(scope.ReleaseService()).BuildServiceProvider();

        async Task AssertReleaseBlocked(AssemblyRequestStatus expectedStatus)
        {
            scope.Db.ChangeTracker.Clear();
            await scope.ReleaseService().ApplyAssemblyReleaseGateAsync(draft.Id, 0m, default);
            await scope.Db.SaveChangesAsync();
            await KitCaseLifecycleWorker.ProcessCaseAsync(services, included.Id, DateTime.UtcNow, default);
            scope.Db.ChangeTracker.Clear();
            Assert.Equal(expectedStatus, (await scope.Db.DataAssemblyRequests.SingleAsync(x => x.Id == draft.Id)).Status);
            var currentCase = await scope.Db.KitAssemblyCases.Include(x => x.History).SingleAsync(x => x.Id == included.Id);
            Assert.Equal(KitAssemblyCaseStatus.InProgress, currentCase.Status);
            Assert.DoesNotContain(currentCase.History, item => item.EventType == "ResultsReleased");
            var output = await scope.Db.AssemblyOutputReleases.SingleAsync(x => x.DataAssemblyRequestId == draft.Id);
            Assert.Equal(FileReleaseStatus.PaymentHold, output.ReleaseStatus);
            Assert.False(await scope.Db.ReleasedDeliverableRetentionSnapshots.AnyAsync(x => x.AssemblyOutputReleaseId == output.Id));
            Assert.All(await scope.Db.ManagedOperationalFiles.Where(x => x.WorkflowId == draft.Id
                && x.Purpose == OperationalFilePurpose.AssemblyOutput).ToListAsync(), file => Assert.Equal(FileReleaseStatus.PaymentHold, file.ReleaseStatus));
            Assert.Equal("KitFulfilledAssemblyPending", (await scope.Platform().Get(order.Id, default)).Status);
        }

        await AssertReleaseBlocked(AssemblyRequestStatus.OnHold);
        var resumed = await scope.Scientific().ReleaseHold(draft.Id, new(held.Version, "Scientific review complete", null), default);
        var cancellation = await scope.Assembly().RequestCancellation(draft.Id,
            new(resumed.Version, "Partner requests cancellation before delivery"), default);
        await AssertReleaseBlocked(AssemblyRequestStatus.CancellationRequested);
        var resolved = await scope.Scientific().DecideCancellation(draft.Id, Assert.Single(cancellation.CancellationRequests).Id,
            new(cancellation.Version, "Declined", "Completed reviewed work will be delivered"), default);
        Assert.Equal("OutputAvailable", resolved.Status);
        scope.Db.ChangeTracker.Clear();
        await KitCaseLifecycleWorker.ProcessCaseAsync(services, included.Id, DateTime.UtcNow, default);
        scope.Db.ChangeTracker.Clear();
        Assert.Equal(FileReleaseStatus.Released, (await scope.Db.AssemblyOutputReleases.SingleAsync(x => x.DataAssemblyRequestId == draft.Id)).ReleaseStatus);
        Assert.Equal(KitAssemblyCaseStatus.ResultsReleased, (await scope.Db.KitAssemblyCases.SingleAsync(x => x.Id == included.Id)).Status);
        Assert.Equal("Completed", (await scope.Platform().Get(order.Id, default)).Status);
        Assert.False(await scope.Db.CommercialDocumentLinks.AnyAsync(x => x.WorkflowId == draft.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task ExplicitLifecycleCheckExpiresUnusedDraftOnceAndPreservesItsInputRequest()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(1);
        var included = Assert.Single(order.AssemblyCases!);
        var request = await scope.Assembly().PrepareIncludedCase(order.Id, included.Id,
            new(included.Version, "Unsubmitted project", "{}", "Included outputs", null, true), default);
        scope.Db.ChangeTracker.Clear();
        using var services = new ServiceCollection().AddSingleton(scope.Db).AddSingleton(scope.ReleaseService()).BuildServiceProvider();
        var afterDeadline = included.SubmissionDeadlineAt!.Value.AddTicks(10);
        await KitCaseLifecycleWorker.ProcessCaseAsync(services, included.Id, afterDeadline, default);
        scope.Db.ChangeTracker.Clear();
        await KitCaseLifecycleWorker.ProcessCaseAsync(services, included.Id, afterDeadline.AddHours(1), default);
        var current = await scope.Db.KitAssemblyCases.AsNoTracking().Include(x => x.History).SingleAsync(x => x.Id == included.Id);
        Assert.Equal(KitAssemblyCaseStatus.Expired, current.Status);
        Assert.Equal(request.Id, current.AssemblyRequestId);
        Assert.Single(current.History, item => item.EventType == "ExpiredUnused");
        Assert.Equal(AssemblyRequestStatus.Draft, (await scope.Db.DataAssemblyRequests.SingleAsync(x => x.Id == request.Id)).Status);
        Assert.Equal("Completed", (await scope.Platform().Get(order.Id, default)).Status);
        Assert.False(new KitCaseLifecycleOptions().Enabled);
    }

    [PostgreSqlReferenceFact]
    public async Task TenantDepartmentAndRoleAdmissionApplyToNewCommandsAndReplays()
    {
        await using var scope = await Scope.Create();
        var key = Guid.NewGuid().ToString(); var write = scope.Writes(1);
        var draft = await scope.TenantController(key).Create(write, default);
        var wrongDepartment = scope.OtherDepartment.Id;
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.TenantController(key, wrongDepartment).Create(write, default))).StatusCode);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.TenantController(department: wrongDepartment).Place(draft.Id, scope.Placement(draft), default))).StatusCode);
        var unauthorized = scope.TenantController(); unauthorized.HttpContext.Request.Headers["X-Organization-Id"] = Guid.NewGuid().ToString();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => unauthorized.Get(draft.Id, default))).StatusCode);
        var placeKey = Guid.NewGuid().ToString(); var place = scope.Placement(draft);
        await scope.TenantController(placeKey).Place(draft.Id, place, default);
        scope.Db.ChangeTracker.Clear();
        var membership = await scope.Db.OrganizationMemberships.SingleAsync(x => x.Id == scope.Membership.Id);
        membership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(membership.Id, scope.Department.Id, true));
        await scope.Db.SaveChangesAsync();
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.TenantController(placeKey).Place(draft.Id, place, default))).StatusCode);
        // The controller identity, not caller-supplied tenant headers, owns staff
        // access; construct an external identity context for the actual denial.
        var externalStaff = new PlatformReagentOrdersController(scope.Db, new(scope.Db, new IdentityContext(scope.PartnerIdentity)), new(scope.Db))
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => externalStaff.Get(draft.Id, default))).StatusCode);
    }

    private sealed class Scope : IAsyncDisposable
    {
        private NpgsqlConnection Admin { get; }
        private string DatabaseName { get; }
        public PSeqOperationsDbContext Db { get; }
        public Organization Partner { get; } = new("Synthetic Kit Partner", OrganizationKind.Partner);
        public Organization Staff { get; } = new("Synthetic Kit staff", OrganizationKind.Phaeno);
        public OrganizationDepartment Department => Partner.Departments.Single(x => x.IsDefault);
        public OrganizationDepartment OtherDepartment { get; private set; } = null!;
        public OrganizationMembership Membership { get; private set; } = null!;
        public User Operator { get; private set; } = null!;
        public User Actor { get; private set; } = null!;
        public PartnerReagentOffering Offering { get; private set; } = null!;
        public AssemblyProfile Profile { get; private set; } = null!;
        public PartnerShippingAddress Address { get; private set; } = null!;
        public ExternalIdentity PartnerIdentity { get; } = Identity("partner");
        private ExternalIdentity StaffIdentity { get; } = Identity("staff");
        private Scope(NpgsqlConnection admin, string name, PSeqOperationsDbContext db) { Admin = admin; DatabaseName = name; Db = db; }
        public static async Task<Scope> Create()
        {
            var source = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
            if (source.Host is not ("localhost" or "127.0.0.1") || source.Database != "phaeno_ops")
                throw new InvalidOperationException("Kit acceptance requires the configured localhost/phaeno_ops source and a disposable database.");
            var name = "pseq_kit_test_" + Guid.NewGuid().ToString("N");
            var admin = new NpgsqlConnection(source.ConnectionString); await admin.OpenAsync();
            await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
            source.Database = name; source.Pooling = false;
            var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(source.ConnectionString)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options, Options.Create(new PersistenceOptions()));
            var scope = new Scope(admin, name, db);
            try
            {
                await db.Database.MigrateAsync();
                scope.Actor = User(scope.PartnerIdentity); scope.Operator = User(scope.StaffIdentity);
                scope.Membership = new(scope.Actor.Id, scope.Partner.Id, true);
                scope.OtherDepartment = new(scope.Partner.Id, "OTHER", "Other Department");
                scope.Address = new(scope.Partner.Id, scope.Department.Id, "Fixture", "Synthetic receiver", "1 Test Way", null, "Test City", "CA", "90000", "US", null);
                var item = new QboCatalogItem("KIT-" + Guid.NewGuid().ToString("N"), "Synthetic Kit", "Fixture scope", "kit", 100m, "USD", true, DateTime.UtcNow);
                scope.Profile = new(item.Id, "Synthetic acceptance profile", 1, "Fixture scope", "Fixture instructions", "{}", "[\".fasta\"]", "{\"outputs\":[\"result.fasta\"]}", 10000, 20000, true, false);
                scope.Offering = new(scope.Partner.Id, item.Id, 100m, "USD", "kit", 1, 1, 100, "{}", DateTime.UtcNow.AddDays(-5), null, true);
                scope.Offering.SetIncludedAssemblyProfile(scope.Profile.Id);
                db.AddRange(scope.Partner, scope.Staff, scope.Actor, scope.Operator, scope.Membership, scope.OtherDepartment, scope.Address,
                    item, scope.Profile, scope.Offering, new OrganizationMembership(scope.Operator.Id, scope.Staff.Id, true));
                await db.SaveChangesAsync(); return scope;
            }
            catch { await scope.DisposeAsync(); throw; }
        }
        public ReagentOrderWriteRequest Writes(decimal quantity) => new([new(Offering.Id, quantity, null)]);
        public PlaceReagentOrderRequest Placement(PartnerReagentOrderDto draft) => new(draft.Version, "SYNTHETIC-PO", Address.Id, null, null);
        public async Task<PartnerReagentOrderDto> CreateOrder(decimal quantity) => await TenantController().Create(Writes(quantity), default);
        public async Task<PartnerReagentOrderDto> PlaceOrder(decimal quantity)
        { var draft = await CreateOrder(quantity); return await TenantController().Place(draft.Id, Placement(draft), default); }
        public async Task<PartnerReagentOrderDto> ShipAndFulfill(decimal quantity)
        {
            var order = await PlaceOrder(quantity); order = await Platform().Accept(order.Id, new(order.Version), default);
            order = await Platform().CreateShipment(order.Id, new(order.Version, "Fixture", null, "TRACK", DateTime.UtcNow.AddDays(-1),
                [new(Assert.Single(order.Lines).Id, quantity, "LOT", null)]), default);
            return await Platform().Fulfill(order.Id, new(order.Version), default);
        }
        public ReagentOrdersController TenantController(string? key = null, Guid? department = null)
            => Attach(new ReagentOrdersController(Db, Context(PartnerIdentity), new(Db)), true, key, department);
        public PlatformReagentOrdersController Platform(string? key = null)
            => Attach(new PlatformReagentOrdersController(Db, Context(StaffIdentity), new(Db)), false, key);
        public DataAssemblyRequestsController Assembly(string? key = null)
            => Attach(new DataAssemblyRequestsController(Db, Context(PartnerIdentity), new(Db), null!, null!, Options.Create(new OrderManagementOptions()),
                null!, new ReleasedDeliverableDownloadProjectionService(Db), NullLogger<CompletionTrackedFileStreamResult>.Instance, NullLogger<CompletionTrackedArchiveResult>.Instance), true, key);
        public PlatformDataAssemblyRequestsController Scientific(string? key = null)
            => Attach(new PlatformDataAssemblyRequestsController(Db, Context(StaffIdentity), new(Db), null!, null!, Options.Create(new OrderManagementOptions()), ReleaseService()), false, key);
        public ManualCommercialReleaseService ReleaseService() => new(Db, new ReleasedDeliverableRetentionSnapshotService(Db));
        private OrderRequestContext Context(ExternalIdentity identity) => new(Db, new IdentityContext(identity));
        private T Attach<T>(T controller, bool tenant, string? key, Guid? department = null) where T : ControllerBase
        {
            Db.ChangeTracker.Clear(); var http = new DefaultHttpContext();
            http.Request.Headers["Idempotency-Key"] = key ?? Guid.NewGuid().ToString();
            if (tenant) { http.Request.Headers["X-Organization-Id"] = Partner.Id.ToString(); http.Request.Headers["X-Department-Id"] = (department ?? Department.Id).ToString(); }
            controller.ControllerContext = new() { HttpContext = http }; return controller;
        }
        public async Task<ManagedOperationalFile> AddFile(Guid request, Guid? parent, OperationalFilePurpose purpose)
        {
            var file = new ManagedOperationalFile(Partner.Id, OrderWorkflowTypes.DataAssembly, request, parent, purpose,
                "synthetic.fasta", ".fasta", "text/plain", 4, new string('a', 64), "synthetic-" + Guid.NewGuid().ToString("N"));
            file.RecordScan(OperationalFileScanStatus.Clean, "Synthetic controller acceptance fixture; no production bytes.");
            Db.Add(file); await Db.SaveChangesAsync(); return file;
        }
        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            try { await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {DatabaseName} WITH (FORCE)", Admin); await drop.ExecuteNonQueryAsync(); }
            finally { await Admin.DisposeAsync(); }
        }
        private static ExternalIdentity Identity(string prefix) => new("test", Guid.NewGuid().ToString("N"), $"{prefix}-{Guid.NewGuid():N}@example.test", true);
        private static User User(ExternalIdentity identity)
        { var value = new User(identity.Email, "Synthetic", "Fixture"); value.Activate(); value.LinkExternalIdentity(identity.Provider, identity.SubjectId); return value; }
    }
    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class AuditContext : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "kit-disposable-acceptance"; }
}
