namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task DpsWholeSecondStartAndRunningCommitAndReplayWithoutChangingExecutionTimes()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock) = await AddDpsTimestampJobAsync(scope);
        var command = await scope.DbContext.Set<LabAssemblyCommand>().SingleAsync(c => c.LabAssemblyJobId == job.Id);
        var occurred = WholeSecond(job.RequestedAtUtc);
        var receipt = new DpsReceipt(DpsContract.Version, "local", 108, Guid.NewGuid(), command.Id, job.Id,
            "Start", "Accepted", "dps-timestamp-test", occurred, null);
        var running = DpsTimestampEvent(job, "Running", occurred, occurred);
        var receiver = DpsTimestampReceiver(scope.DbContext, clock);
        await receiver.ReceiveCommandAsync(receipt, default);
        var acknowledgments = 0;
        async Task Acknowledge(Guid id, Guid eventId, string outcome, Guid? receiptId, string? reason, CancellationToken ct)
        {
            await using var saved = scope.CreateAdditionalContext();
            Assert.Equal("committed", outcome);
            Assert.Equal(occurred, (await saved.Set<LabAssemblyJob>().SingleAsync(j => j.Id == id, ct)).StartedAtUtc);
            Assert.True(await saved.Set<LabAssemblyReceipt>().AnyAsync(r => r.Id == receiptId, ct));
            acknowledgments++;
        }
        await receiver.ReceiveEventAsync(running, Acknowledge, default);
        await using var restarted = scope.CreateAdditionalContext();
        receiver = DpsTimestampReceiver(restarted, clock);
        // Authoritative Query reuses these receiver paths and the exact original receipt/event.
        await receiver.ReceiveCommandAsync(receipt, default);
        await receiver.ReceiveEventAsync(running, Acknowledge, default);
        Assert.Equal(2, acknowledgments);
        Assert.Equal(2, await restarted.Set<LabAssemblyReceipt>().CountAsync(r => r.LabAssemblyJobId == job.Id));
        var savedCommand = await restarted.Set<LabAssemblyCommand>().SingleAsync(c => c.Id == command.Id);
        Assert.NotNull(savedCommand.ReceivedAtUtc);
        Assert.NotNull(savedCommand.ConfirmedAtUtc);
        Assert.Equal(1, savedCommand.AttemptCount);
        Assert.Equal(occurred, (await restarted.Set<LabAssemblyJob>().SingleAsync(j => j.Id == job.Id)).StartedAtUtc);
    }

    [PostgreSqlReferenceFact]
    public async Task DpsWholeSecondCancelReceiptReplaysAfterTerminationWithoutAnotherDelivery()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        var (job, clock) = await AddDpsTimestampJobAsync(scope);
        var started = WholeSecond(job.RequestedAtUtc);
        var receiver = DpsTimestampReceiver(db, clock);
        await receiver.ReceiveEventAsync(DpsTimestampEvent(job, "Running", started, started), DpsTimestampAck, default);
        var requested = job.RequestedAtUtc.AddSeconds(35);
        job.RequestCancellation(scope.PlatformUser.Id, "TEST cancellation", requested);
        var command = new LabAssemblyCommand(job.Id, "Cancel", requested);
        command.Attempt(requested.AddMilliseconds(73), 5, 60);
        db.Add(command); await db.SaveChangesAsync();
        var stopped = WholeSecond(requested);
        var terminal = DpsTimestampEvent(job, "Terminated", stopped, started) with {
            Sequence = 2, StoppedAtUtc = stopped, DispositionAtUtc = stopped, Reason = "TEST cancellation",
        };
        await receiver.ReceiveEventAsync(terminal, DpsTimestampAck, default);
        job.SetAttention("DPS recovery or command delivery is unavailable. Reconciliation will continue.");
        await db.SaveChangesAsync();
        var receipt = new DpsReceipt(DpsContract.Version, "local", 108, Guid.NewGuid(), command.Id, job.Id,
            "Cancel", "Accepted", terminal.ProviderJobId, stopped, null);
        await using var restarted = scope.CreateAdditionalContext();
        receiver = DpsTimestampReceiver(restarted, clock);
        await receiver.ReceiveCommandAsync(receipt, default);
        await receiver.ReceiveCommandAsync(receipt, default);
        await receiver.ReceiveEventAsync(terminal, DpsTimestampAck, default);
        // The normal reconciliation processor reapplies the saved terminal authority after Query.
        await DpsTimestampProcessor(restarted, clock).ApplyAsync(job.Id,
            new(terminal.ProviderJobId, "Terminated", started, stopped, stopped, terminal.Reason), default);
        var saved = await restarted.Set<LabAssemblyJob>().SingleAsync(j => j.Id == job.Id);
        Assert.Equal("Terminated", saved.State);
        Assert.Null(saved.AttentionReason);
        Assert.Equal(started, saved.StartedAtUtc); Assert.Equal(stopped, saved.StoppedAtUtc);
        var savedCommand = await restarted.Set<LabAssemblyCommand>().SingleAsync(c => c.Id == command.Id);
        Assert.NotNull(savedCommand.ReceivedAtUtc); Assert.NotNull(savedCommand.ConfirmedAtUtc);
        Assert.Equal(1, savedCommand.AttemptCount);
        var savedReceipt = await restarted.Set<LabAssemblyReceipt>().SingleAsync(r => r.ProviderEventId == "command:" + receipt.ReceiptId);
        Assert.Equal(stopped, savedReceipt.OccurredAtUtc);
        Assert.Equal(stopped, DpsContract.Read<DpsReceipt>(JsonSerializer.Deserialize<JsonElement>(savedReceipt.PayloadJson)).OccurredAtUtc);
        Assert.Equal(3, await restarted.Set<LabAssemblyReceipt>().CountAsync(r => r.LabAssemblyJobId == job.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task DpsTimestampPrecisionDoesNotAdmitOldForeignFutureOrConflictingEvidence()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        var (job, clock) = await AddDpsTimestampJobAsync(scope);
        var occurred = WholeSecond(job.RequestedAtUtc);
        job.Observe("dps-timestamp-test", "Running", occurred, null, null, null, null, false, clock.Now);
        await db.SaveChangesAsync();
        var command = await db.Set<LabAssemblyCommand>().SingleAsync(c => c.LabAssemblyJobId == job.Id);
        var receipt = new DpsReceipt(DpsContract.Version, "local", 108, Guid.NewGuid(), command.Id, job.Id,
            "Start", "Accepted", job.ProviderJobId, occurred, null);
        var receiver = DpsTimestampReceiver(db, clock);
        foreach (var invalid in new[] {
            receipt with { OccurredAtUtc = occurred.AddSeconds(-1) },
            receipt with { OccurredAtUtc = job.RequestedAtUtc.AddTicks(-10) },
            receipt with { OccurredAtUtc = clock.Now.AddSeconds(1) },
            receipt with { ProviderJobId = "foreign-execution" },
            receipt with { Environment = "staging" },
            receipt with { JobId = Guid.NewGuid() },
        }) await Assert.ThrowsAsync<OrderManagementException>(() => receiver.ReceiveCommandAsync(invalid, default));
        var running = DpsTimestampEvent(job, "Running", occurred, occurred);
        foreach (var invalid in new[] {
            running with { OccurredAtUtc = occurred.AddSeconds(-1) },
            running with { StartedAtUtc = occurred.AddSeconds(-1) },
            running with { OccurredAtUtc = job.RequestedAtUtc.AddTicks(-10) },
            running with { StartedAtUtc = job.RequestedAtUtc.AddTicks(-10), OccurredAtUtc = occurred.AddSeconds(1) },
            running with { StartedAtUtc = occurred.AddSeconds(1) },
        }) await Assert.ThrowsAsync<OrderManagementException>(() => receiver.ReceiveEventAsync(invalid, DpsTimestampAck, default));
        Assert.False(await db.Set<LabAssemblyReceipt>().AnyAsync(r => r.LabAssemblyJobId == job.Id));
        await receiver.ReceiveCommandAsync(receipt, default);
        await Assert.ThrowsAsync<OrderManagementException>(() => receiver.ReceiveCommandAsync(
            receipt with { OccurredAtUtc = occurred.AddSeconds(1) }, default));
        var saved = await db.Set<LabAssemblyReceipt>().SingleAsync(r => r.LabAssemblyJobId == job.Id);
        Assert.NotNull(saved.ConflictSha256);
        Assert.Equal(occurred, saved.OccurredAtUtc);
        Assert.Equal(LabAssemblyDelivery.ConflictAttention, job.AttentionReason);
    }

    private static DateTime WholeSecond(DateTime value) => new(value.Ticks - value.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc);
    private static Task DpsTimestampAck(Guid job, Guid @event, string outcome, Guid? receipt, string? reason, CancellationToken ct)
    { Assert.Equal("committed", outcome); return Task.CompletedTask; }
    private static DpsEvent DpsTimestampEvent(LabAssemblyJob job, string state, DateTime occurred, DateTime started)
        => new(DpsContract.Version, "local", 102, Guid.NewGuid(), job.Id, "dps-timestamp-test", 1, state,
            occurred, started, null, null, false, null, null, null);
    private static LabAssemblyProcessor DpsTimestampProcessor(PSeqOperationsDbContext db, AssemblyTestClock clock)
    {
        var progress = new LabAssemblyProgress(clock); var service = MessagingService(db, clock, progress);
        return new(db, service, new AssemblyTestProvider(), progress, clock, MessagingDelivery(db, clock));
    }
    private static DpsEventReceiver DpsTimestampReceiver(PSeqOperationsDbContext db, AssemblyTestClock clock)
        // These receipt/running/termination fixtures have no output locator; no S3 handoff is used.
        => new(db, MessagingReceiver(db, clock), DpsTimestampProcessor(db, clock), MessagingService(db, clock, new(clock)),
            null!, Options.Create(new DpsOptions { Environment = "local" }), clock);
    private static async Task<(LabAssemblyJob Job, AssemblyTestClock Clock)> AddDpsTimestampJobAsync(ShippingTestScope scope)
    {
        var requested = new DateTime(2026, 10, 21, 21, 30, 52, DateTimeKind.Utc).AddTicks(1973470);
        var order = scope.AddCommercialPhaseOrder("TEST DPS timestamp " + Guid.NewGuid());
        var sample = scope.AddCommercialPhaseSample(order, "TEST DPS timestamp sample");
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id,
            scope.CustomerOrganization.Id, "timestamp-test", 1, "test", null);
        var specimen = new LabSpecimen(work.Id, sample.Id); work.Specimens.Add(specimen);
        var id = Guid.NewGuid();
        var address = new DpsObject("example-bucket", "us-east-2", "fixture/input.json", "exact-version", new string('a', 64), 100);
        var recipe = new DpsRecipe("example", "1", JsonSerializer.SerializeToElement(new { }), ["assembly_output"]);
        var manifest = new DpsInputManifest(DpsContract.Version, "local", "input_manifest", id, requested,
            new(scope.CustomerOrganization.Id, order.Id, work.Id, specimen.Id, Guid.NewGuid(), Guid.NewGuid(), 1, Guid.NewGuid(), 1, 1),
            "PairedEnd", recipe, [], new("example-bucket", "us-east-2", "fixture/outputs/"));
        var frozen = new AssemblyFrozenInputs([], new("TEST timestamp", requested, []), Dps: new(address, manifest, address));
        var job = new LabAssemblyJob(id, work.Id, specimen.Id, scope.CustomerOrganization.Id, 1, scope.PlatformUser.Id,
            DpsContract.Provider, "{}", JsonSerializer.Serialize(frozen, LabAssemblyService.Json), new string('A', 64), requested);
        job.BeginDispatch(requested);
        var command = new LabAssemblyCommand(job.Id, "Run", requested); command.Attempt(requested, 5, 60);
        scope.DbContext.AddRange(work, job, command); await scope.DbContext.SaveChangesAsync();
        return (job, new(requested.AddMinutes(2)));
    }
}
