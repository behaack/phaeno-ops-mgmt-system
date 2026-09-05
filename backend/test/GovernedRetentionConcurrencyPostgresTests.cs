namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using Scope = GovernedResultRetentionPostgresTests.Scope;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class GovernedRetentionConcurrencyPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task IndependentConnectionsSerializeCheckpointsLateCompletionAndStreamRevocation()
    {
        // A disposable local database is necessary: rollback fixtures are invisible to independent connections.
        var source = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (source.Host is not ("localhost" or "127.0.0.1") || source.Database != "phaeno_ops")
            throw new InvalidOperationException("Concurrent verification requires the configured localhost/phaeno_ops source.");
        var name = $"pseq_retention_test_{Guid.NewGuid():N}";
        var original = source.ConnectionString;
        source.Database = name; source.Pooling = false;
        await using var admin = new NpgsqlConnection(original);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        try
        {
            await using (var setup = Db(source.ConnectionString))
            {
                await setup.Database.MigrateAsync();
                if (!await setup.ReleasedDeliverablePolicyDefaults.AnyAsync())
                {
                    setup.Add(new ReleasedDeliverablePolicyDefault(1, ReleasedDeliverablePolicyValues.Create(30, 5, 5), "Synthetic verification"));
                    await setup.SaveChangesAsync();
                }
            }
            await using var fixture = await Scope.Create(source.ConnectionString);
            var snapshot = await fixture.Release(DateTime.UtcNow.AddDays(-26));
            await fixture.CommitFixtureAsync();
            await using var first = Db(source.ConnectionString);
            await using var second = Db(source.ConnectionString);
            var links = Options.Create(new InvitationOptions { PublicBaseUrl = "https://portal.example.test" });
            await Task.WhenAll(new GovernedRetentionCheckpointService(first, links).ProcessAsync(fixture.Package.Id, default),
                new GovernedRetentionCheckpointService(second, links).ProcessAsync(fixture.Package.Id, default));
            Assert.Equal(1, await first.OrderNotifications.CountAsync(value => value.WorkflowId == snapshot.Id));

            // Simulate a deadline becoming due while completion waits for another package transaction.
            await using var lockDb = Db(source.ConnectionString);
            await using var held = await RetentionTransaction.OpenAsync(lockDb, fixture.Package.Id, default);
            var transfer = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), fixture.Artifact.Id, fixture.Organization.Id,
                fixture.Actor.Id, fixture.Package.Id, DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddMinutes(20), null, null);
            // Persist on a separate connection before the waiting completion starts.
            second.Add(transfer); await second.SaveChangesAsync();
            var service = Attempts(first);
            var completion = service.CompleteAsync([transfer.Id], OperationalFileDownloadOutcome.Succeeded,
                DateTime.UtcNow.AddMinutes(-1), null, true, default);
            await Task.Delay(100);
            Assert.False(completion.IsCompleted);
            await lockDb.Database.ExecuteSqlInterpolatedAsync($"UPDATE commercial_ops.released_deliverable_retention_snapshots SET standard_deletion_at_utc = clock_timestamp() - interval '1 second', potential_final_deletion_at_utc = clock_timestamp() + interval '5 days' WHERE id = {snapshot.Id}");
            await held.CommitAsync(default);
            Assert.True(await completion.WaitAsync(TimeSpan.FromSeconds(10)));
            first.ChangeTracker.Clear();
            var frozen = await first.ReleasedDeliverableRetentionSnapshots.SingleAsync(value => value.Id == snapshot.Id);
            Assert.NotNull(frozen.GraceActivatedAtUtc);
            var completed = await first.OperationalFileDownloads.SingleAsync(value => value.Id == transfer.Id);
            Assert.True(completed.CompletedAtUtc > frozen.StandardDeletionAtUtc);
            await new GovernedRetentionCheckpointService(second, links).ProcessAsync(fixture.Package.Id, default);
            Assert.Equal(2, await first.OrderNotifications.CountAsync(value => value.WorkflowId == snapshot.Id));

            // A different serving connection changes authority while a response is active.
            first.ChangeTracker.Clear();
            var active = await Attempts(first).StartPSeqArtifactAsync(fixture.Package, fixture.Artifact, fixture.Actor.Id,
                DateTime.UtcNow, null, null, null, default);
            var stopped = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            using var cancel = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            var monitor = Attempts(first).MonitorAccessAsync(active, () => stopped.TrySetResult(), cancel.Token);
            await second.Database.ExecuteSqlInterpolatedAsync($"UPDATE commercial_ops.users SET is_active = false WHERE id = {fixture.Actor.Id}");
            await stopped.Task.WaitAsync(TimeSpan.FromSeconds(5));
            await monitor.WaitAsync(TimeSpan.FromSeconds(5));
            first.ChangeTracker.Clear();
            var revoked = await first.OperationalFileDownloads.SingleAsync(value => value.Id == active.AttemptIds[0]);
            Assert.Equal(OperationalFileDownloadOutcome.Revoked, revoked.Outcome);
            Assert.False(revoked.CountsForReleasedPackageRetention);
            await second.Database.ExecuteSqlInterpolatedAsync($"UPDATE commercial_ops.users SET is_active = true WHERE id = {fixture.Actor.Id}");
            Assert.False(await Attempts(first).CompleteAsync(active.AttemptIds, OperationalFileDownloadOutcome.Succeeded, DateTime.UtcNow, null, true, default));
            first.ChangeTracker.Clear();
            var streamed = await Attempts(first).StartPSeqArtifactAsync(fixture.Package, fixture.Artifact, fixture.Actor.Id, DateTime.UtcNow, null, null, null, default);
            var blockedStream = new BlockingStream();
            var result = new CompletionTrackedFileStreamResult(blockedStream, "text/plain", "synthetic.txt", false,
                streamed, Attempts(first), NullLogger<CompletionTrackedFileStreamResult>.Instance);
            var executing = result.ExecuteResultAsync(new ActionContext(fixture.Http, new RouteData(), new ActionDescriptor()));
            await blockedStream.Started.Task.WaitAsync(TimeSpan.FromSeconds(5));
            await second.Database.ExecuteSqlInterpolatedAsync($"UPDATE commercial_ops.users SET is_active = false WHERE id = {fixture.Actor.Id}");
            // MVC may consume cancellation after aborting the response; terminal evidence and stopped bytes are authoritative.
            try { await executing.WaitAsync(TimeSpan.FromSeconds(5)); }
            catch (OperationCanceledException) { }
            first.ChangeTracker.Clear();
            var interrupted = await first.OperationalFileDownloads.SingleAsync(value => value.Id == streamed.AttemptIds[0]);
            Assert.Equal(OperationalFileDownloadOutcome.Revoked, interrupted.Outcome);
            Assert.Equal(0, fixture.Http.Response.Body.Length);

        }
        finally
        {
            if (!name.StartsWith("pseq_retention_test_", StringComparison.Ordinal) || name.Length != 52)
                throw new InvalidOperationException("Refusing cleanup outside the unique test database.");
            await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed class BlockingStream : MemoryStream
    {
        public BlockingStream() : base(new byte[256]) { }
        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            Started.TrySetResult();
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            return 0;
        }
    }

    private static ReleasedDeliverableDownloadAttemptService Attempts(PSeqOperationsDbContext db) =>
        new(db, Options.Create(new OrderManagementOptions()), NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance);
    private static PSeqOperationsDbContext Db(string connection) => new(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
        .UseNpgsql(connection).AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options, Options.Create(new PersistenceOptions()));
    private sealed class AuditContext : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "concurrent-retention-test"; }
}
