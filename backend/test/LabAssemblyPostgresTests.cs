namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task AssemblyRecoveryRetainsStartStopAndOutcomeWithoutWritingPercentageHistory()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow.AddMinutes(-10);
            now = new DateTime(now.Ticks - now.Ticks % 10, DateTimeKind.Utc);
            var clock = new AssemblyTestClock(now.AddMinutes(5));
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, Guid.NewGuid(),
                scope.CustomerOrganization.Id, "assembly-test", 1, "test", null);
            var specimen = new LabSpecimen(work.Id, Guid.NewGuid()); work.Specimens.Add(specimen);
            var job = new LabAssemblyJob(Guid.NewGuid(), work.Id, specimen.Id, scope.CustomerOrganization.Id, 1,
                scope.PlatformUser.Id, "test-provider", "{}", "{}", new string('B', 64), now);
            job.BeginDispatch(now); db.AddRange(work, job); await db.SaveChangesAsync();
            var adapter = new AssemblyTestProvider { Snapshot = new("external-test-1", "Running", now, Percentage: 1) };
            var cache = new LabAssemblyProgress(clock);
            var service = new LabAssemblyService(db, adapter, cache, Options.Create(new LabAssemblyOptions { WorkerEnabled = true }), Options.Create(new PSeqOrderToCashOptions()), clock);
            var processor = new LabAssemblyProcessor(db, service, adapter, cache, clock);
            // The start was accepted before a simulated connection loss. Recovery must discover it, not send another start.
            await processor.ProcessAsync(job.Id, default);
            Assert.Equal(0, adapter.StartCalls);
            var version = job.Version;
            var auditCount = await db.Set<AuditEvent>().CountAsync();
            var eventCount = await db.Set<LabAssemblyEvent>().CountAsync(e => e.LabAssemblyJobId == job.Id);
            for (var percent = 2; percent <= 100; percent++)
                await processor.ApplyAsync(job.Id, adapter.Snapshot! with { Percentage = percent, ProgressSequence = percent }, default);
            Assert.Equal(version, job.Version);
            Assert.Equal(auditCount, await db.Set<AuditEvent>().CountAsync());
            Assert.Equal(eventCount, await db.Set<LabAssemblyEvent>().CountAsync(e => e.LabAssemblyJobId == job.Id));
            Assert.Equal(100, cache.Read(job.Id, false)!.Percentage); Assert.False(job.IsTerminal);
            // Discard all volatile progress as if the API restarted, then recover the current provider snapshot.
            cache = new LabAssemblyProgress(clock);
            processor = new LabAssemblyProcessor(db, service, adapter, cache, clock);
            await processor.ProcessAsync(job.Id, default); Assert.Equal(0, adapter.StartCalls);
            var stopped = now.AddMinutes(2);
            adapter.Snapshot = new("external-test-1", "Failed", now, stopped, stopped, "TEST ONLY processing failed");
            await processor.ProcessAsync(job.Id, default);
            Assert.Equal("Failed", job.State); Assert.Equal(now, job.StartedAtUtc); Assert.Equal(stopped, job.StoppedAtUtc);
            Assert.Null(job.LabAnalysisRunId); Assert.Null(cache.Read(job.Id, true));
            var finalEvents = await db.Set<LabAssemblyEvent>().CountAsync(e => e.LabAssemblyJobId == job.Id);
            await processor.ApplyAsync(job.Id, adapter.Snapshot, default);
            await processor.ApplyAsync(job.Id, new("external-test-1", "Running", now, Percentage: 99), default);
            Assert.Equal(finalEvents, await db.Set<LabAssemblyEvent>().CountAsync(e => e.LabAssemblyJobId == job.Id));
            Assert.Equal("Failed", job.State);
            var retry = new LabAssemblyJob(Guid.NewGuid(), work.Id, specimen.Id, scope.CustomerOrganization.Id, 1,
                scope.PlatformUser.Id, "test-provider", "{}", "{}", new string('C', 64), clock.Now, job.Id, "TEST ONLY retry");
            db.Add(retry); await db.SaveChangesAsync();
            Assert.Equal(job.SequencingRunNumber, retry.SequencingRunNumber);
            await transaction.CreateSavepointAsync("duplicate_active");
            var duplicate = new LabAssemblyJob(Guid.NewGuid(), work.Id, specimen.Id, scope.CustomerOrganization.Id, 1,
                scope.PlatformUser.Id, "test-provider", "{}", "{}", new string('D', 64), clock.Now, job.Id, "TEST ONLY concurrent start");
            db.Add(duplicate);
            await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
            await transaction.RollbackToSavepointAsync("duplicate_active"); db.ChangeTracker.Clear();
        }
        finally { await transaction.RollbackAsync(); db.ChangeTracker.Clear(); }
    }

    private sealed class AssemblyTestProvider : ILabAssemblyProvider
    {
        public string Key => "test-provider";
        public AssemblyProviderAvailability Availability => new(true, "TEST ONLY", true, []);
        public bool SupportsIdempotentStart => true;
        public AssemblyProviderSnapshot? Snapshot { get; set; }
        public int StartCalls { get; private set; }
        public Task<AssemblyProviderSnapshot?> FindAsync(Guid clientJobId, CancellationToken ct) => Task.FromResult(Snapshot);
        public Task<AssemblyProviderSnapshot> StartAsync(LabAssemblyJob job, CancellationToken ct)
        { StartCalls++; throw new InvalidOperationException("This recovery fixture must not dispatch a new job."); }
        public Task<AssemblyInputVerification> VerifyInputsAsync(IReadOnlyList<AssemblyInput> inputs, CancellationToken ct) => throw new NotSupportedException();
        public Task<AssemblyProviderSnapshot?> CancelAsync(Guid clientJobId, string reason, CancellationToken ct) => Task.FromResult(Snapshot);
    }
}
