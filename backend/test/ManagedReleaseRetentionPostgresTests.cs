namespace PhaenoPortal.Test;

using System.Data.Common;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed partial class ManagedReleaseRetentionPostgresTests
{
    [PostgreSqlReferenceFact]
    public Task FileAndArchiveEnforceFrozenPolicyAndCurrentScope() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var closed = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-36));
            foreach (var zip in new[] { false, true })
            {
                var error = await Assert.ThrowsAsync<OrderManagementException>(() => closed.Download(zip));
                Assert.Equal("released_deliverable_retention_cutoff_reached", error.ErrorCode);
            }
            Assert.Equal(0, closed.Storage.Reads);
            Assert.Empty(await closed.Attempts());
            Assert.False((await closed.Projection()).RetentionDecision!.IsDownloadAvailable);
            // The default-off path preserves prior behavior, and dates are never manufactured for legacy releases.
            await using var legacy = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-100), snapshot: false);
            await legacy.Execute(await legacy.Download(true));
            Assert.Null((await legacy.Projection()).RetentionDecision);
            Assert.Equal(2, (await legacy.Projection()).DownloadedFileCount);
            await closed.Execute(await closed.Download(false, enforce: false));
            Assert.Equal(1, closed.Storage.Reads);

            await using var grace = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-31));
            await grace.Execute(await grace.Download(false));
            Assert.Equal(1, (await grace.Projection()).DownloadedFileCount);
            Assert.True((await grace.Projection()).RetentionDecision!.IsDownloadAvailable);
            grace.Storage.FailKey = grace.Files[1].StorageKey;
            await Assert.ThrowsAsync<IOException>(async () => await grace.Execute(await grace.Download(true)));
            var archiveFailures = (await grace.Attempts()).Where(value => value.Scope == OperationalFileDownloadScope.PackageArchive).ToList();
            Assert.Equal(2, archiveFailures.Count);
            Assert.All(archiveFailures, value => Assert.False(value.CountsForReleasedPackageRetention));
            Assert.Equal(1, (await grace.Projection()).DownloadedFileCount);
            grace.Storage.FailKey = null;
            grace.ResetResponse();
            grace.Http.Request.Headers.Range = "bytes=0-1";
            await grace.Execute(await grace.Download(false));
            Assert.False((await grace.Attempts()).OrderBy(value => value.StartedAtUtc).Last().CountsForReleasedPackageRetention);
            grace.Http.Request.Headers.Remove("Range");
            grace.ResetResponse();
            await grace.Execute(await grace.Download(true));
            Assert.Equal(2, (await grace.Projection()).DownloadedFileCount);
            Assert.Equal(grace.Snapshot!.StandardDeletionAtUtc, (await grace.Projection()).RetentionDecision!.GraceActivatedAtUtc);

            await using var complete = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-30).AddSeconds(3));
            await complete.Execute(await complete.Download(true));
            await CrossDeadline(complete.Db, complete.Snapshot!.StandardDeletionAtUtc);
            var decision = (await complete.Projection()).RetentionDecision!;
            Assert.False(decision.IsDownloadAvailable);
            Assert.Null(decision.GraceActivatedAtUtc);
            Assert.Equal(complete.Snapshot.StandardDeletionAtUtc, decision.DownloadAccessClosedAtUtc);

            await using var scope = await Fixture.Create(connection, assembly, DateTime.UtcNow);
            var other = new OrganizationDepartment(scope.Organization.Id, "research", "Research");
            scope.Db.Add(other); await scope.Db.SaveChangesAsync();
            scope.Http.Request.Headers["X-Department-Id"] = other.Id.ToString();
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.Download(true));
            Assert.Equal(0, scope.Storage.Reads);
            scope.Http.Request.Headers["X-Department-Id"] = scope.Organization.Departments.Single(value => value.IsDefault).Id.ToString();
            scope.Files[1].Withdraw(); await scope.Db.SaveChangesAsync();
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.Download(true));
            Assert.Equal(0, scope.Storage.Reads);
            await using var held = await Fixture.Create(connection, assembly, DateTime.UtcNow, held: true);
            await Assert.ThrowsAsync<OrderManagementException>(() => held.Download(false));
            await Assert.ThrowsAsync<OrderManagementException>(() => held.Download(true));
            Assert.Equal(0, held.Storage.Reads);
        }
    });

    [PostgreSqlReferenceFact]
    public Task ActualCommitBoundaryAndIndependentArchiveRevocation() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var late = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-30).AddSeconds(3));
            var gate = new CommitGate { Armed = true };
            await using var serving = Db(connection, gate);
            var pending = late.Download(true, serving);
            try { await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5)); await CrossDeadline(late.Db, late.Snapshot!.StandardDeletionAtUtc); }
            finally { gate.Release.TrySetResult(); }
            Assert.Equal("released_deliverable_retention_cutoff_reached", (await Assert.ThrowsAsync<OrderManagementException>(() => pending)).ErrorCode);
            Assert.Equal(0, late.Storage.Reads);
            Assert.All(await late.Attempts(), value => Assert.Equal(OperationalFileDownloadOutcome.Failed, value.Outcome));

            await using var completion = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-30).AddSeconds(3));
            var finishGate = new CommitGate();
            await using var finishing = Db(connection, finishGate);
            var result = await completion.Download(true, finishing);
            finishGate.Armed = true;
            var executing = completion.Execute(result);
            try { await finishGate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5)); await CrossDeadline(completion.Db, completion.Snapshot!.StandardDeletionAtUtc); }
            finally { finishGate.Release.TrySetResult(); }
            await executing.WaitAsync(TimeSpan.FromSeconds(10));
            var evidence = await completion.Attempts();
            Assert.All(evidence, value => Assert.True(value.CompletedAtUtc < completion.Snapshot!.StandardDeletionAtUtc));
            Assert.NotNull((await completion.Projection()).RetentionDecision!.GraceActivatedAtUtc);

            await using var revoked = await Fixture.Create(connection, assembly, DateTime.UtcNow);
            revoked.Storage.Block = true;
            await using var streamDb = Db(connection);
            var streaming = revoked.Execute(await revoked.Download(true, streamDb));
            await revoked.Storage.Started.Task.WaitAsync(TimeSpan.FromSeconds(5));
            // A separate connection revokes one file; the entire ZIP must stop and remain non-counting.
            await revoked.Db.ManagedOperationalFiles.Where(value => value.Id == revoked.Files[1].Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(value => value.ReleaseStatus, FileReleaseStatus.Withdrawn));
            try { await streaming.WaitAsync(TimeSpan.FromSeconds(6)); } catch (OperationCanceledException) { }
            Assert.All(await revoked.Attempts(), value => { Assert.Equal(OperationalFileDownloadOutcome.Revoked, value.Outcome); Assert.False(value.CountsForReleasedPackageRetention); });
            Assert.Equal(1, revoked.Storage.Reads);
            Assert.Equal(0, (await revoked.Projection()).DownloadedFileCount);
        }
    });

    private sealed class Fixture(PSeqOperationsDbContext db, ServiceProvider services) : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db => db;
        public Organization Organization { get; private set; } = null!;
        public User Actor { get; private set; } = null!;
        public Guid WorkflowId { get; private set; }
        public Guid ReleaseId { get; private set; }
        public bool Assembly { get; private set; }
        public ManagedOperationalFile[] Files { get; private set; } = [];
        public ReleasedDeliverableRetentionSnapshot? Snapshot { get; private set; }
        public DefaultHttpContext Http { get; } = new();
        public Storage Storage { get; } = new();
        private IExternalIdentityContext identity = null!;
        public IExternalIdentityContext IdentityContext => identity;
        public ReleasedDeliverablePackageType Type => Assembly ? ReleasedDeliverablePackageType.AssemblyOutput : ReleasedDeliverablePackageType.LabResult;
        public static async Task<Fixture> Create(string connection, bool assembly, DateTime released, bool snapshot = true, bool held = false)
        {
            var db = ManagedReleaseRetentionPostgresTests.Db(connection);
            var services = new ServiceCollection().AddLogging().AddControllers().Services.BuildServiceProvider();
            var fixture = new Fixture(db, services) { Assembly = assembly };
            fixture.Organization = new($"Managed retention {Guid.NewGuid():N}", assembly ? OrganizationKind.Partner : OrganizationKind.Customer);
            var external = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"managed-{Guid.NewGuid():N}@example.test", true);
            fixture.Actor = new(external.Email, "Synthetic", "Recipient"); fixture.Actor.Activate(); fixture.Actor.LinkExternalIdentity(external.Provider, external.SubjectId);
            fixture.identity = new Identity(external);
            db.AddRange(fixture.Organization, fixture.Actor, new OrganizationMembership(fixture.Actor.Id, fixture.Organization.Id, true));
            var department = fixture.Organization.Departments.Single();
            Guid parent;
            AssemblyOutputRelease? output = null;
            LabServiceOrder? lab = null; LabSample? sample = null;
            if (assembly)
            {
                var catalog = new QboCatalogItem($"managed-{Guid.NewGuid():N}", "Synthetic", "Fixture", "specimen", 1, "USD", true, DateTime.UtcNow);
                var profile = new AssemblyProfile(catalog.Id, $"Synthetic profile {Guid.NewGuid():N}", 1, "Fixture", "Instructions", "{}", "[]", "{}", 100, 100, true, true);
                var request = new DataAssemblyRequest(fixture.Organization.Id, department.Id, $"RET-{Guid.NewGuid():N}", "Synthetic", profile.Id, 1, profile.Name, "Instructions", "{}", "Output", null, true);
                var input = new AssemblyInputRevision(request.Id, 1, null, "{}", null, "{}", fixture.Actor.Id, released);
                var run = new AssemblyProcessingRun(request.Id, input.Id, 1, "1", "synthetic", "synthetic", released);
                output = new(fixture.Organization.Id, request.Id, input.Id, run.Id, 1, "{}", "synthetic", "synthetic", "Passed", released);
                fixture.WorkflowId = request.Id; fixture.ReleaseId = output.Id; parent = output.Id;
                db.AddRange(catalog, profile, request, input, run, output);
            }
            else
            {
                lab = new(fixture.Organization.Id, department.Id, $"RET-{Guid.NewGuid():N}", "Synthetic", null, 1, false, "RNA", "Frozen", "Safe", "Synthetic");
                sample = new(lab.Id, "Sample", "RNA", "Synthetic", 1, "tube", "Frozen", "Safe", null, null, null, "[]");
                fixture.WorkflowId = lab.Id; parent = sample.Id; db.AddRange(lab, sample);
            }
            fixture.Files = Enumerable.Range(1, 2).Select(index => new ManagedOperationalFile(fixture.Organization.Id,
                assembly ? OrderWorkflowTypes.DataAssembly : OrderWorkflowTypes.LabService, fixture.WorkflowId, parent,
                assembly ? OperationalFilePurpose.AssemblyOutput : OperationalFilePurpose.LabResult,
                $"result-{index}.txt", "report", "text/plain", 16, new string('A', 64), $"synthetic/{Guid.NewGuid():N}")).ToArray();
            foreach (var file in fixture.Files) { file.RecordScan(OperationalFileScanStatus.Clean, null); if (held) file.HoldForPayment(); else file.Release(released); }
            db.AddRange(fixture.Files);
            LabResultRelease? release = null;
            if (!assembly)
            {
                release = new(fixture.Organization.Id, lab!.Id, sample!.Id, 1, "PSeq", "synthetic", "fixture", "Passed",
                    JsonSerializer.Serialize(new { files = fixture.Files.Select(value => new { id = value.Id }) }), released);
                fixture.ReleaseId = release.Id; db.Add(release);
            }
            if (assembly) { output!.MarkReady(held); if (!held) output.Release(released); }
            else { release!.MarkReady(held); if (!held) release.Release(released); }
            if (snapshot && !held) fixture.Snapshot = assembly
                ? await new ReleasedDeliverableRetentionSnapshotService(db).CaptureAssemblyOutputAsync(output!, released, default)
                : await new ReleasedDeliverableRetentionSnapshotService(db).CaptureLabResultAsync(release!, released, default);
            await db.SaveChangesAsync();
            if (fixture.Snapshot is not null) await db.Entry(fixture.Snapshot).ReloadAsync();
            fixture.Http.Request.Method = "GET"; fixture.Http.RequestServices = services;
            fixture.Http.Request.Headers["X-Organization-Id"] = fixture.Organization.Id.ToString();
            fixture.Http.Request.Headers["X-Department-Id"] = department.Id.ToString();
            fixture.ResetResponse(); return fixture;
        }
        public void ResetResponse() { Http.Response.Body = new MemoryStream(); Http.Response.StatusCode = 200; Http.RequestAborted = default; }
        public Task<List<OperationalFileDownload>> Attempts() => db.OperationalFileDownloads.AsNoTracking().Where(value => value.ReleasedPackageId == ReleaseId).ToListAsync();
        public async Task<ReleasedDeliverableDownloadProjection> Projection() => (await new ReleasedDeliverableDownloadProjectionService(db, Enabled)
            .ReadAsync(Organization.Id, Type, new Dictionary<Guid, IReadOnlyCollection<Guid>> { [ReleaseId] = Files.Select(value => value.Id).ToList() }, DateTime.UtcNow, default))[ReleaseId];
        public Task<IActionResult> Download(bool archive, PSeqOperationsDbContext? serving = null, bool enforce = true)
        {
            var target = serving ?? db;
            var options = Options.Create(new OrderManagementOptions { ReleasedDeliverableRetentionEnforcement = enforce });
            var attempts = new ReleasedDeliverableDownloadAttemptService(target, options, NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance);
            var context = new OrderRequestContext(target, identity);
            if (Assembly)
            {
                var controller = new DataAssemblyRequestsController(target, context, null!, Storage, null!, options, attempts, new(target, options),
                    NullLogger<CompletionTrackedFileStreamResult>.Instance, NullLogger<CompletionTrackedArchiveResult>.Instance) { ControllerContext = new() { HttpContext = Http } };
                return archive ? controller.DownloadOutputRelease(WorkflowId, ReleaseId, default) : controller.DownloadOutput(WorkflowId, ReleaseId, Files[0].Id, default);
            }
            var lab = new LabServiceOrdersController(target, context, null!, Storage, Options.Create(new PSeqOrderToCashOptions()), null!, attempts, new(target, options),
                NullLogger<CompletionTrackedFileStreamResult>.Instance, NullLogger<CompletionTrackedArchiveResult>.Instance) { ControllerContext = new() { HttpContext = Http } };
            return archive ? lab.DownloadRelease(WorkflowId, ReleaseId, default) : lab.Download(WorkflowId, Files[0].Id, default);
        }
        public Task Execute(IActionResult result) => result.ExecuteResultAsync(new(Http, new RouteData(), new ActionDescriptor()));
        public async ValueTask DisposeAsync() { await db.DisposeAsync(); await services.DisposeAsync(); }
    }
    private static readonly IOptions<OrderManagementOptions> Enabled = Options.Create(new OrderManagementOptions { ReleasedDeliverableRetentionEnforcement = true });
    private sealed class Identity(ExternalIdentity identity) : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class Storage : IOperationalFileStorage
    {
        public int Reads { get; private set; }
        public string? FailKey { get; set; }
        public bool Block { get; set; }
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public Task<Stream> OpenReadAsync(string key, CancellationToken token) { Reads++; if (key == FailKey) throw new IOException("Synthetic ZIP source failure"); return Task.FromResult<Stream>(Block ? new BlockedStream(Started) : new MemoryStream(Encoding.UTF8.GetBytes("synthetic-result"))); }
        public Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximum, CancellationToken token) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string key, CancellationToken token) => throw new NotSupportedException();
    }
    private sealed class BlockedStream(TaskCompletionSource started) : MemoryStream(new byte[16])
    {
        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken token = default) { started.TrySetResult(); await Task.Delay(Timeout.InfiniteTimeSpan, token); return 0; }
    }
    private sealed class CommitGate : DbTransactionInterceptor
    {
        public bool Armed { get; set; }
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction, TransactionEventData data, InterceptionResult result, CancellationToken token = default)
        { if (Armed) { Armed = false; Entered.TrySetResult(); await Release.Task.WaitAsync(TimeSpan.FromSeconds(10), token); } return result; }
    }
    private static async Task CrossDeadline(PSeqOperationsDbContext db, DateTime deadline)
    { var wait = deadline - await RetentionTransaction.ClockAsync(db, default); if (wait > TimeSpan.FromSeconds(5)) throw new InvalidOperationException("Unexpected test deadline."); if (wait > TimeSpan.Zero) await Task.Delay(wait + TimeSpan.FromMilliseconds(60)); }
    private static PSeqOperationsDbContext Db(string connection, DbTransactionInterceptor? interceptor = null)
    { var builder = new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(connection).AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())); if (interceptor is not null) builder.AddInterceptors(interceptor); return new(builder.Options, Options.Create(new PersistenceOptions())); }
    private sealed class AuditContext : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "managed-retention-test"; }
    private static async Task InDatabase(Func<string, Task> test)
    {
        var source = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (source.Host is not ("localhost" or "127.0.0.1") || source.Database != "phaeno_ops") throw new InvalidOperationException("Local phaeno_ops source required.");
        var name = $"pseq_retention_test_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(source.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        source.Database = name; source.Pooling = false;
        try { await using (var setup = Db(source.ConnectionString)) await setup.Database.MigrateAsync(); await test(source.ConnectionString); }
        finally { if (!name.StartsWith("pseq_retention_test_", StringComparison.Ordinal) || name.Length != 52) throw new InvalidOperationException("Unsafe cleanup target."); await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
}
