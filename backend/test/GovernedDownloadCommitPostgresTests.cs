namespace PhaenoPortal.Test;

using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using Scope = GovernedResultRetentionPostgresTests.Scope;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class GovernedDownloadCommitPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ActualCommitTimesPreserveGraceRecoverObservationAndRejectLateAdmissionBeforeStorage()
    {
        var source = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
        if (source.Host is not ("localhost" or "127.0.0.1") || source.Database != "phaeno_ops")
            throw new InvalidOperationException("Commit verification requires the configured localhost/phaeno_ops source.");
        var name = $"pseq_retention_test_{Guid.NewGuid():N}";
        await using var admin = new NpgsqlConnection(source.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
        source.Database = name; source.Pooling = false;
        try
        {
            await using var observer = Db(source.ConnectionString);
            await observer.Database.MigrateAsync();
            await new DownloadCommitEvidenceService(observer).EnsureTrackingAsync(default);


            // Record success before the standard deadline, but hold its actual COMMIT until after it.
            await using var fixture = await Scope.Create(source.ConnectionString);
            var deadline = (await RetentionTransaction.ClockAsync(observer, default)).AddSeconds(5);
            var snapshot = await fixture.Release(deadline.AddDays(-30));
            await fixture.CommitFixtureAsync();
            var gate = new CommitGate();
            await using var serving = Db(source.ConnectionString, gate);
            var transfer = await Attempts(serving).StartPSeqArtifactAsync(fixture.Package, fixture.Artifact, fixture.Actor.Id,
                DateTime.UtcNow, null, null, null, default);
            gate.Armed = true;
            var completing = Attempts(serving, new LostCompletionObservation(serving)).CompleteAsync(transfer.AttemptIds,
                OperationalFileDownloadOutcome.Succeeded, DateTime.UtcNow, null, true, default);
            try
            {
                await gate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
                Assert.True(await RetentionTransaction.ClockAsync(observer, default) < snapshot.StandardDeletionAtUtc);
                await CrossDeadline(observer, snapshot.StandardDeletionAtUtc);
            }
            finally { gate.Release.TrySetResult(); }
            await Assert.ThrowsAsync<IOException>(() => completing);
            var attempt = await observer.OperationalFileDownloads.AsNoTracking().SingleAsync(value => value.Id == transfer.AttemptIds[0]);
            Assert.True(attempt.CompletedAtUtc < snapshot.StandardDeletionAtUtc);
            var evidence = await observer.OperationalDownloadCommitEvidence.AsNoTracking().SingleAsync(value =>
                value.OperationalFileDownloadId == attempt.Id && value.Phase == DownloadCommitPhase.Completion);
            Assert.Null(evidence.CommittedAtUtc);
            // Independent recovery after the source transaction committed but its observer was lost.
            var recovered = await new DownloadCommitEvidenceService(observer).ReadCommitAsync(evidence.Id, default);
            Assert.True(recovered >= snapshot.StandardDeletionAtUtc);
            var persisted = await observer.OperationalDownloadCommitEvidence.AsNoTracking().SingleAsync(value => value.Id == evidence.Id);
            Assert.Equal(recovered, await new DownloadCommitEvidenceService(observer).ReadCommitAsync(evidence.Id, default));
            var unchanged = await observer.OperationalDownloadCommitEvidence.AsNoTracking().SingleAsync(value => value.Id == evidence.Id);
            Assert.Equal(persisted.ObservedAtUtc, unchanged.ObservedAtUtc);
            Assert.Equal(persisted.Version, unchanged.Version);
            await new GovernedRetentionCheckpointService(observer, Options.Create(new InvitationOptions { PublicBaseUrl = "https://portal.example.test" }))
                .ProcessAsync(fixture.Package.Id, default);
            var decision = (await new GovernedResultRetentionService(observer).ReadAsync([fixture.Package], [fixture.Artifact],
                await RetentionTransaction.ClockAsync(observer, default), default))[fixture.Package.Id];
            Assert.Equal("Grace", decision.State);
            Assert.Equal(snapshot.StandardDeletionAtUtc, decision.Retention!.GraceActivatedAtUtc);
            Assert.Equal(recovered, decision.Retention.Download!.CompletedAtUtc);

            // A different package admission starts before cutoff but must never open storage after a late COMMIT.
            foreach (var atFinalCutoff in new[] { false, true })
            {
                await using var late = await Scope.Create(source.ConnectionString);
                var lateDeadline = (await RetentionTransaction.ClockAsync(observer, default)).AddSeconds(4);
                var lateSnapshot = await late.Release(lateDeadline.AddDays(atFinalCutoff ? -35 : -30));
                var cutoff = atFinalCutoff ? lateSnapshot.PotentialFinalDeletionAtUtc : lateSnapshot.StandardDeletionAtUtc;
                await late.CommitFixtureAsync();
                var admissionGate = new CommitGate { Armed = true };
                await using var admissionDb = Db(source.ConnectionString, admissionGate);
                var controller = new PSeqResultDownloadsController(admissionDb, new(admissionDb, late.Identity), late.Storage,
                    Attempts(admissionDb), new(admissionDb), NullLogger<CompletionTrackedFileStreamResult>.Instance)
                    { ControllerContext = new() { HttpContext = late.Http } };
                var downloading = controller.Download(late.Order.Id, late.Sample.Id, late.Package.Id, late.Artifact.Id, default);
                try
                {
                    await admissionGate.Entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
                    Assert.True(await RetentionTransaction.ClockAsync(observer, default) < cutoff);
                    await CrossDeadline(observer, cutoff);
                }
                finally { admissionGate.Release.TrySetResult(); }
                var denied = await Assert.ThrowsAsync<OrderManagementException>(() => downloading);
                Assert.Equal("result_retention_cutoff_reached", denied.ErrorCode);
                Assert.Equal(0, late.Storage.ReadCount);
                var rejected = await observer.OperationalFileDownloads.AsNoTracking().SingleAsync(value => value.ReleasedPackageId == late.Package.Id);
                Assert.Equal(OperationalFileDownloadOutcome.Failed, rejected.Outcome);
                Assert.False(rejected.CountsForReleasedPackageRetention);
                var admission = await observer.OperationalDownloadCommitEvidence.AsNoTracking().SingleAsync(value => value.OperationalFileDownloadId == rejected.Id);
                Assert.True(admission.RecordedAtUtc < admission.AdmissionCutoffAtUtc);
                Assert.True(admission.CommittedAtUtc >= admission.AdmissionCutoffAtUtc);
                Assert.Equal(cutoff, admission.AdmissionCutoffAtUtc);
            }

            // Rollbacks cannot leave source evidence; production admission refuses a caller-owned transaction.
            await using var rollback = await Scope.Create(source.ConnectionString);
            var unavailable = await Assert.ThrowsAsync<OrderManagementException>(() => new DownloadCommitEvidenceService(rollback.Db).EnsureTransferReadyAsync(default));
            Assert.Equal("retention_commit_evidence_unavailable", unavailable.ErrorCode);
            var pending = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), rollback.Artifact.Id, rollback.Organization.Id,
                rollback.Actor.Id, rollback.Package.Id, DateTime.UtcNow, DateTime.UtcNow.AddMinutes(20), null, null);
            rollback.Db.Add(pending);
            var rolled = await new DownloadCommitEvidenceService(rollback.Db).CaptureAsync(pending.Id, DownloadCommitPhase.Admission, null, default);
            await rollback.Db.SaveChangesAsync();
            var uncommitted = await Assert.ThrowsAsync<OrderManagementException>(() =>
                new DownloadCommitEvidenceService(rollback.Db).ReadCommitAsync(rolled.Id, default));
            Assert.Equal("retention_commit_evidence_unavailable", uncommitted.ErrorCode);
            await rollback.RollbackFixtureAsync();
            Assert.False(await observer.OperationalDownloadCommitEvidence.AnyAsync(value => value.Id == rolled.Id));
            var retainedCount = await observer.OperationalDownloadCommitEvidence.CountAsync();
            var refused = await Assert.ThrowsAsync<PostgresException>(() => observer.Database.GetService<IMigrator>()
                .MigrateAsync("20260905031439_AddGovernedRetentionCheckpoints"));
            Assert.Equal("P0001", refused.SqlState);
            Assert.Equal(retainedCount, await observer.OperationalDownloadCommitEvidence.CountAsync());
        }
        finally
        {
            if (!name.StartsWith("pseq_retention_test_", StringComparison.Ordinal) || name.Length != 52)
                throw new InvalidOperationException("Refusing cleanup outside the unique test database.");
            await using var drop = new NpgsqlCommand($"DROP DATABASE {name} WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static async Task CrossDeadline(PSeqOperationsDbContext db, DateTime deadline)
    {
        var remaining = deadline - await RetentionTransaction.ClockAsync(db, default);
        if (remaining > TimeSpan.FromSeconds(6)) throw new InvalidOperationException("Unexpected test deadline.");
        if (remaining > TimeSpan.Zero) await Task.Delay(remaining + TimeSpan.FromMilliseconds(50));
        Assert.True(await RetentionTransaction.ClockAsync(db, default) >= deadline);
    }
    private sealed class CommitGate : DbTransactionInterceptor
    {
        public bool Armed { get; set; }
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction,
            TransactionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        {
            if (!Armed) return result;
            Armed = false;
            Entered.TrySetResult();
            await Release.Task.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken);
            return result;
        }
    }
    private sealed class LostCompletionObservation(PSeqOperationsDbContext db) : DownloadCommitEvidenceService(db)
    {
        public override Task ResolveAsync(IReadOnlyCollection<Guid> evidenceIds, CancellationToken token) =>
            throw new IOException("Synthetic loss after source COMMIT, before observation.");
    }
    private static ReleasedDeliverableDownloadAttemptService Attempts(PSeqOperationsDbContext db, DownloadCommitEvidenceService? commits = null) =>
        new(db, Options.Create(new OrderManagementOptions()), NullLogger<ReleasedDeliverableDownloadAttemptService>.Instance, commits);
    private static PSeqOperationsDbContext Db(string connection, DbTransactionInterceptor? gate = null)
    {
        var builder = new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(connection)
            .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext()));
        if (gate is not null) builder.AddInterceptors(gate);
        return new(builder.Options, Options.Create(new PersistenceOptions()));
    }
    private sealed class AuditContext : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "commit-retention-test"; }
}
