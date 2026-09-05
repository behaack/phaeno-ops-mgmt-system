namespace PhaenoPortal.Test;

using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
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
public sealed class GovernedResultRetentionPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task GovernedReleaseFreezesOrganizationPolicyAndOneReleaseInstant()
    {
        await using var scope = await Scope.Create();
        var global = await scope.Db.ReleasedDeliverablePolicyDefaults.SingleAsync(value => value.IsActive);
        var policyOverride = new OrganizationReleasedDeliverablePolicyOverride(scope.Organization.Id, 1,
            45, null, 8, global.ReadValues(), "Synthetic contracted policy");
        scope.Db.AddRange(policyOverride, new BusinessRoleAssignment(scope.Actor.Id, BusinessRole.ResultReleaseManager));
        await scope.Db.SaveChangesAsync();
        var controller = new PSeqResultReleaseController(scope.Db, scope.Context, Options.Create(new PSeqOrderToCashOptions {
            GovernedPSeqResults = true, BusinessRoles = true, PipelineServiceSecret = new string('s', 24),
            PipelineProviderKey = "synthetic", ObjectStorageTransferBaseUrl = "https://example.test/transfers" }), new(scope.Db), new(scope.Db))
            { ControllerContext = new() { HttpContext = scope.Http } };
        await controller.Release(scope.Package.Id, new(scope.Package.Version), default);
        var snapshot = await scope.Db.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.OrganizationId == scope.Organization.Id);
        var release = await scope.Db.LabResultReleases.SingleAsync(value => value.Id == snapshot.LabResultReleaseId);
        var schedule = await scope.Db.ResultRetentionSchedules.SingleAsync(value => value.ResultOutputPackageId == scope.Package.Id);
        Assert.Equal(scope.Package.ReleasedAtUtc, release.ReleasedAt);
        Assert.Equal(release.ReleasedAt, snapshot.ReleasedAtUtc);
        Assert.Equal(policyOverride.Id, snapshot.OrganizationPolicyOverrideId);
        Assert.Equal(global.Id, snapshot.GlobalPolicyId);
        Assert.Equal(45, snapshot.StandardRetentionDays);
        Assert.Equal(8, snapshot.UndownloadedGraceDays);
        Assert.Equal(snapshot.Id, schedule.RetentionSnapshotId);
        Assert.Equal(snapshot.StandardDeletionAtUtc, schedule.CutoffAtUtc);
        policyOverride.Deactivate(DateTime.UtcNow, scope.Actor.Id, "Future releases inherit global policy");
        await scope.Db.SaveChangesAsync();
        var recaptured = await new ReleasedDeliverableRetentionSnapshotService(scope.Db).CaptureLabResultAsync(release, snapshot.ReleasedAtUtc, default);
        Assert.Equal(snapshot.Id, recaptured.Id);
        Assert.Equal(45, recaptured.StandardRetentionDays);
        Assert.Throws<InvalidOperationException>(() => schedule.Advance(snapshot.PotentialFinalDeletionAtUtc));
    }

    [PostgreSqlReferenceFact]
    public async Task FullArtifactResponseCountsOnlyAfterMvcResponseCompletion()
    {
        await using var scope = await Scope.Create();
        await scope.Release(DateTime.UtcNow);
        var result = await scope.Download();
        var attempt = await scope.Db.OperationalFileDownloads.SingleAsync(value => value.ReleasedPackageId == scope.Package.Id);
        Assert.Equal(OperationalFileDownloadOutcome.Started, attempt.Outcome);
        Assert.Null(attempt.ManagedOperationalFileId);
        Assert.Equal(scope.Artifact.Id, attempt.ResultArtifactId);
        Assert.False(attempt.CountsForReleasedPackageRetention);
        await result.ExecuteResultAsync(new(scope.Http, new RouteData(), new ActionDescriptor()));
        await scope.Db.Entry(attempt).ReloadAsync();
        Assert.Equal(OperationalFileDownloadOutcome.Succeeded, attempt.Outcome);
        Assert.True(attempt.CountsForReleasedPackageRetention);
        Assert.Single(await scope.Db.ResultDeliveryEvidence.Where(value => value.ResultOutputPackageId == scope.Package.Id
            && value.Kind == ResultDeliveryEvidenceKind.Download).ToListAsync());
        Assert.Equal("synthetic-result", Encoding.UTF8.GetString(((MemoryStream)scope.Http.Response.Body).ToArray()));
        Assert.Equal(1, (await scope.Read()).Retention!.Download!.DownloadedFileCount);
    }

    [PostgreSqlReferenceFact]
    public async Task PartialCancelledAndFailedResponsesNeverCountAsCompleted()
    {
        foreach (var mode in new[] { "range", "cancel", "read-failure", "open-failure" })
        {
            await using var scope = await Scope.Create();
            await scope.Release(DateTime.UtcNow);
            if (mode == "range") scope.Http.Request.Headers.Range = "bytes=0-2";
            scope.Storage.Mode = mode;
            if (mode == "open-failure") await Assert.ThrowsAsync<IOException>(scope.Download);
            else
            {
                var result = await scope.Download();
                if (mode == "cancel") scope.Http.RequestAborted = new CancellationToken(true);
                try { await result.ExecuteResultAsync(new(scope.Http, new RouteData(), new ActionDescriptor())); }
                catch (Exception exception) when (exception is IOException or OperationCanceledException) { }
            }
            var attempt = await scope.Db.OperationalFileDownloads.SingleAsync(value => value.ReleasedPackageId == scope.Package.Id);
            await scope.Db.Entry(attempt).ReloadAsync();
            Assert.NotEqual(OperationalFileDownloadOutcome.Started, attempt.Outcome);
            Assert.NotEqual(OperationalFileDownloadOutcome.Succeeded, attempt.Outcome);
            Assert.False(attempt.CountsForReleasedPackageRetention);
            Assert.Equal(0, (await scope.Read()).Retention!.Download!.DownloadedFileCount);
        }
    }

    [PostgreSqlReferenceFact]
    public async Task MissingAndLateCompletionsKeepGraceWhileCutoffDoesNotWaitForWorker()
    {
        await using var scope = await Scope.Create();
        var snapshot = await scope.Release(DateTime.UtcNow.AddDays(-31));
        var duringGrace = await scope.Read();
        Assert.True(duringGrace.IsDownloadAvailable);
        Assert.Equal("Grace", duringGrace.State);
        var result = await scope.Download();
        await result.ExecuteResultAsync(new(scope.Http, new RouteData(), new ActionDescriptor()));
        Assert.True((await scope.Read()).IsDownloadAvailable);
        Assert.Equal(snapshot.StandardDeletionAtUtc, (await scope.Read()).Retention!.GraceActivatedAtUtc);
        var atFinal = await scope.Read(snapshot.PotentialFinalDeletionAtUtc);
        Assert.False(atFinal.IsDownloadAvailable);
        Assert.Equal(snapshot.PotentialFinalDeletionAtUtc, atFinal.Retention!.DownloadAccessClosedAtUtc);
        var schedule = await scope.Db.ResultRetentionSchedules.SingleAsync(value => value.ResultOutputPackageId == scope.Package.Id);
        Assert.Equal(ResultRetentionState.Active, schedule.State);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Attempts.StartPSeqArtifactAsync(scope.Package, scope.Artifact,
            scope.Actor.Id, snapshot.PotentialFinalDeletionAtUtc, snapshot.PotentialFinalDeletionAtUtc, null, null, default));
    }

    [PostgreSqlReferenceFact]
    public async Task ExpiredNewAndLegacyPackagesDenyBeforeOpeningStorage()
    {
        foreach (var legacy in new[] { false, true })
        {
            await using var scope = await Scope.Create();
            await scope.Release(DateTime.UtcNow.AddDays(-40), legacy);
            var projection = Assert.Single(await scope.Controller.List(scope.Order.Id, default));
            Assert.False(projection.IsDownloadAvailable);
            Assert.Equal("Cutoff", projection.RetentionState);
            var error = await Assert.ThrowsAsync<OrderManagementException>(scope.Download);
            Assert.Equal(StatusCodes.Status410Gone, error.StatusCode);
            Assert.Equal(0, scope.Storage.ReadCount);
            Assert.Empty(await scope.Db.OperationalFileDownloads.Where(value => value.ReleasedPackageId == scope.Package.Id).ToListAsync());
        }
    }

    [PostgreSqlReferenceFact]
    public async Task DownloadedBeforeDeadlineClosesAtStandardAndOldRequestEvidenceDoesNotCount()
    {
        await using var scope = await Scope.Create();
        var snapshot = await scope.Release(DateTime.UtcNow.AddDays(-31));
        scope.Db.Add(new ResultDeliveryEvidence(scope.Package.Id, scope.Artifact.Id, ResultDeliveryEvidenceKind.Download,
            scope.Actor.Id, snapshot.ReleasedAtUtc.AddDays(1), "{}"));
        await scope.Db.SaveChangesAsync();
        Assert.Equal("Grace", (await scope.Read()).State);
        var attempt = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), scope.Artifact.Id, scope.Organization.Id,
            scope.Actor.Id, scope.Package.Id, snapshot.ReleasedAtUtc.AddDays(1), snapshot.ReleasedAtUtc.AddDays(1).AddHours(1), null, null);
        attempt.Complete(OperationalFileDownloadOutcome.Succeeded, snapshot.ReleasedAtUtc.AddDays(1).AddMinutes(1), countsForReleasedPackageRetention: true);
        scope.Db.Add(attempt);
        await scope.Db.SaveChangesAsync();
        var missing = await Assert.ThrowsAsync<OrderManagementException>(() => scope.Read());
        Assert.Equal("retention_commit_evidence_unavailable", missing.ErrorCode);
        var revocable = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), scope.Artifact.Id, scope.Organization.Id,
            scope.Actor.Id, scope.Package.Id, DateTime.UtcNow, DateTime.UtcNow.AddMinutes(20), null, null);
        scope.Db.Add(revocable);
        await scope.Db.SaveChangesAsync();
        Assert.True(await scope.Attempts.CompleteAsync([revocable.Id], OperationalFileDownloadOutcome.Revoked,
            DateTime.UtcNow, "result_access_revoked", false, default));
        Assert.Equal(OperationalFileDownloadOutcome.Revoked, revocable.Outcome);
        AddSyntheticCompletion(scope.Db, attempt, attempt.CompletedAtUtc!.Value);
        await scope.Db.SaveChangesAsync();
        var status = await scope.Read();
        Assert.False(status.IsDownloadAvailable);
        Assert.Null(status.Retention!.GraceActivatedAtUtc);
        Assert.Equal(snapshot.StandardDeletionAtUtc, status.Retention.DownloadAccessClosedAtUtc);
    }

    internal sealed class Scope(PSeqOperationsDbContext db, IDbContextTransaction transaction, ServiceProvider services) : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db => db;
        public Organization Organization { get; private set; } = null!;
        public User Actor { get; private set; } = null!;
        public LabServiceOrder Order { get; private set; } = null!;
        public LabSample Sample { get; private set; } = null!;
        public ResultOutputPackage Package { get; private set; } = null!;
        public ResultArtifact Artifact { get; private set; } = null!;
        public DefaultHttpContext Http { get; } = new();
        public IExternalIdentityContext Identity { get; private set; } = null!;
        public Storage Storage { get; } = new();
        public OrderRequestContext Context => new(db, Identity);
        public ReleasedDeliverableDownloadAttemptService Attempts => new(db, Options.Create(new OrderManagementOptions()), NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance, new RollbackCommitEvidence(db));
        public PSeqResultDownloadsController Controller => new(db, Context, Storage, Attempts, new(db), NullLogger<CompletionTrackedFileStreamResult>.Instance)
            { ControllerContext = new() { HttpContext = Http } };
        public Task<IActionResult> Download() => Controller.Download(Order.Id, Sample.Id, Package.Id, Artifact.Id, default);
        public async Task<GovernedResultRetention> Read(DateTime? now = null) =>
            (await new GovernedResultRetentionService(db).ReadAsync([Package], [Artifact], now ?? DateTime.UtcNow, default))[Package.Id];
        public static async Task<Scope> Create(string? connectionString = null)
        {
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
                .UseNpgsql(connectionString ?? Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options;
            var db = new PSeqOperationsDbContext(options, Options.Create(new PersistenceOptions()));
            var services = new ServiceCollection().AddLogging().AddControllers().Services.BuildServiceProvider();
            var scope = new Scope(db, await db.Database.BeginTransactionAsync(), services);
            scope.Organization = new($"Retention {Guid.NewGuid():N}", OrganizationKind.Customer);
            var identity = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"retention-{Guid.NewGuid():N}@example.test", true);
            scope.Actor = new(identity.Email, "Synthetic", "Member");
            scope.Actor.LinkExternalIdentity(identity.Provider, identity.SubjectId);
            scope.Actor.Activate();
            scope.Identity = new IdentityContext(identity);
            db.AddRange(scope.Organization, scope.Actor, new OrganizationMembership(scope.Actor.Id, scope.Organization.Id, true));
            var department = scope.Organization.Departments.Single();
            scope.Order = new(scope.Organization.Id, department.Id, $"RET-{Guid.NewGuid():N}", "Retention fixture", null, 1, false, "RNA", "Frozen", "Safe", "Synthetic");
            scope.Sample = new(scope.Order.Id, "Synthetic sample", "RNA", "Synthetic source", 1, "tube", "Frozen", "Safe", null, null, null, "[]");
            scope.Package = new(scope.Organization.Id, scope.Order.Id, Guid.NewGuid(), scope.Sample.Id, 1, null,
                "synthetic", Guid.NewGuid().ToString("N"), Guid.NewGuid().ToString("N"), "{}", new string('A', 64), 1);
            scope.Artifact = new(scope.Package.Id, "report", "synthetic.txt", "text/plain", 16, new string('A', 64), $"fixture/{Guid.NewGuid():N}");
            scope.Artifact.BeginScan(); scope.Artifact.CompleteScan(true, null, DateTime.UtcNow);
            scope.Package.BeginScanning(); scope.Package.MarkReadyForReview(1, true, true);
            var approval = Guid.NewGuid();
            scope.Package.RecordScientificApproval(approval, scope.Actor.Id, DateTime.UtcNow);
            scope.Package.MarkReadyForRelease(approval);
            db.AddRange(scope.Order, scope.Sample, scope.Package, scope.Artifact);
            await db.SaveChangesAsync();
            scope.Http.Request.Method = "GET";
            scope.Http.RequestServices = services;
            scope.Http.Response.Body = new MemoryStream();
            scope.Http.Request.Headers["X-Organization-Id"] = scope.Organization.Id.ToString();
            scope.Http.Request.Headers["X-Department-Id"] = department.Id.ToString();
            return scope;
        }
        public async Task<ReleasedDeliverableRetentionSnapshot> Release(DateTime releasedAt, bool legacy = false)
        {
            Package.Release(Actor.Id, releasedAt);
            var release = new LabResultRelease(Organization.Id, Order.Id, Sample.Id, 1, "PSeq", "synthetic", "fixture", "Passed", "{}", releasedAt);
            release.MarkReady(false); release.Release(releasedAt); db.Add(release);
            var snapshot = await new ReleasedDeliverableRetentionSnapshotService(db).CaptureLabResultAsync(release, releasedAt, default);
            db.Add(legacy ? new ResultRetentionSchedule(Package.Id, releasedAt.AddDays(25), releasedAt.AddDays(30), releasedAt.AddDays(35), releasedAt.AddDays(36)) : new ResultRetentionSchedule(Package.Id, snapshot));
            await db.SaveChangesAsync();
            await db.Entry(snapshot).ReloadAsync();
            return snapshot;
        }
        private bool committedFixture;
        internal async Task CommitFixtureAsync() { await transaction.CommitAsync(); await transaction.DisposeAsync(); committedFixture = true; }
        internal async Task RollbackFixtureAsync() { await transaction.RollbackAsync(); await transaction.DisposeAsync(); committedFixture = true; }
        public async ValueTask DisposeAsync() { if (!committedFixture) await transaction.RollbackAsync(); await transaction.DisposeAsync(); await db.DisposeAsync(); await services.DisposeAsync(); }
    }
    // Rollback fixtures test workflow behavior with explicit synthetic evidence, never real commit timing.
    internal static void AddSyntheticCompletion(PSeqOperationsDbContext db, OperationalFileDownload attempt, DateTime completed)
    {
        var evidence = new OperationalDownloadCommitEvidence(attempt.Id, DownloadCommitPhase.Completion, "3", completed);
        evidence.Observe(completed, completed);
        db.Add(evidence);
    }
    private sealed class RollbackCommitEvidence : DownloadCommitEvidenceService
    {
        private readonly PSeqOperationsDbContext db;
        public RollbackCommitEvidence(PSeqOperationsDbContext db) : base(db) { this.db = db; }
        public override Task EnsureTransferReadyAsync(CancellationToken token) => Task.CompletedTask;
        public override async Task ResolveAsync(IReadOnlyCollection<Guid> evidenceIds, CancellationToken token)
        {
            await db.OperationalDownloadCommitEvidence.Where(value => evidenceIds.Contains(value.Id) && value.CommittedAtUtc == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(value => value.CommittedAtUtc, value => value.RecordedAtUtc)
                    .SetProperty(value => value.ObservedAtUtc, value => value.RecordedAtUtc), token);
        }
    }
    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class AuditContext : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "retention-test"; }
    internal sealed class Storage : IOperationalFileStorage
    {
        public string Mode { get; set; } = "normal";
        public int ReadCount { get; private set; }
        public Task<Stream> OpenReadAsync(string key, CancellationToken token) {
            ReadCount++; if (Mode == "open-failure") throw new IOException("Synthetic storage failure");
            return Task.FromResult<Stream>(Mode == "read-failure" ? new FailingStream() : new MemoryStream(Encoding.UTF8.GetBytes("synthetic-result")));
        }
        public Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maxBytes, CancellationToken token) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string key, CancellationToken token) => throw new NotSupportedException();
    }
    private sealed class FailingStream : MemoryStream
    {
        public FailingStream() : base(Encoding.UTF8.GetBytes("synthetic-result")) { }
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) => throw new IOException("Synthetic interrupted stream");
    }
}
