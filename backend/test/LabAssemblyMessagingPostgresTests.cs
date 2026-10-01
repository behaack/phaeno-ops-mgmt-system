namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task NotificationsReadCommittedStateAndStopAfterAccessRevocationOrTokenExpiry()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock) = await AddMessagingJobAsync(scope);
        var services = new ServiceCollection();
        services.AddScoped(_ => scope.CreateAdditionalContext());
        services.AddScoped(provider => scope.CreateNotificationAccess(provider.GetRequiredService<PSeqOperationsDbContext>()));
        await using var provider = services.BuildServiceProvider();
        var subscriptions = new LabAssemblySubscriptions(); var hub = new MessagingTestHub();
        var aborted = false;
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new("exp", clock.GetUtcNow().AddMinutes(1).ToUnixTimeSeconds().ToString())]));
        subscriptions.Add("viewer", scope.PlatformUser.Id, principal, () => aborted = true);
        subscriptions.Require("viewer").Watch([job.Id]);
        var progress = new LabAssemblyProgress(clock);
        var worker = new LabAssemblyNotificationWorker(provider.GetRequiredService<IServiceScopeFactory>(), subscriptions,
            hub, progress, clock, NullLogger<LabAssemblyNotificationWorker>.Instance);
        await worker.PumpAsync(default); Assert.Single(hub.Messages);
        await worker.PumpAsync(default); Assert.Single(hub.Messages);
        var version = job.Version;
        progress.Report(job.Id, 42, 1); await worker.PumpAsync(default); Assert.Equal(2, hub.Messages.Count);
        Assert.Equal(version, job.Version);
        scope.PlatformUser.Deactivate(); await scope.DbContext.SaveChangesAsync();
        await worker.PumpAsync(default); Assert.True(aborted); Assert.Empty(subscriptions.Read()); Assert.Equal(2, hub.Messages.Count);
        aborted = false;
        subscriptions.Add("expired", scope.PlatformUser.Id, principal, () => aborted = true);
        subscriptions.Require("expired").Watch([job.Id]); clock.Now = clock.Now.AddMinutes(2);
        await worker.PumpAsync(default); Assert.True(aborted); Assert.Empty(subscriptions.Read()); Assert.Equal(2, hub.Messages.Count);
    }

    [PostgreSqlReferenceFact]
    public async Task LifecycleReceiptCommitsBeforeAckAndDeduplicatesAcrossReceiverRestart()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock) = await AddMessagingJobAsync(scope);
        var receiver = MessagingReceiver(scope.DbContext, clock);
        var message = new AssemblyLifecycleMessage(job.Id, "test-provider", "running-1", 1, clock.Now,
            new("external", "Running", clock.Now.AddTicks(7), Percentage: 5, ProgressSequence: 1));
        await using var firstReceiverDb = scope.CreateAdditionalContext();
        await using var secondReceiverDb = scope.CreateAdditionalContext();
        var concurrent = await Task.WhenAll(MessagingReceiver(firstReceiverDb, clock).ReceiveAsync(message, default),
            MessagingReceiver(secondReceiverDb, clock).ReceiveAsync(message, default));
        var result = Assert.Single(concurrent, r => !r.Duplicate);
        Assert.Single(concurrent, r => r.Duplicate);
        Assert.True(result.ReadyToAcknowledge);
        await using var fresh = scope.CreateAdditionalContext();
        var saved = await fresh.Set<LabAssemblyReceipt>().SingleAsync(r => r.Id == result.ReceiptId);
        Assert.Equal("Running", (await fresh.Set<LabAssemblyJob>().SingleAsync(j => j.Id == job.Id)).State);
        Assert.DoesNotContain("percentage", saved.PayloadJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("progressSequence", saved.PayloadJson, StringComparison.OrdinalIgnoreCase);
        var command = await fresh.Set<LabAssemblyCommand>().SingleAsync(c => c.LabAssemblyJobId == job.Id);
        Assert.NotNull(command.ConfirmedAtUtc);
        var eventCount = await fresh.Set<LabAssemblyEvent>().CountAsync(e => e.LabAssemblyJobId == job.Id);
        var auditCount = await fresh.Set<AuditEvent>().CountAsync();
        for (var percent = 10; percent <= 100; percent += 10)
            await receiver.ReceiveProgressAsync(job.Id, "test-provider", "external", percent, percent, default);
        Assert.Equal(eventCount, await fresh.Set<LabAssemblyEvent>().CountAsync(e => e.LabAssemblyJobId == job.Id));
        Assert.Equal(auditCount, await fresh.Set<AuditEvent>().CountAsync());
        Assert.Equal("Running", (await fresh.Set<LabAssemblyJob>().AsNoTracking().SingleAsync(j => j.Id == job.Id)).State);
        scope.DbContext.ChangeTracker.Clear();
        result = await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(message with
            { Snapshot = message.Snapshot with { StartedAtUtc = clock.Now, Percentage = 99, ProgressSequence = 99 } }, default);
        Assert.True(result.Duplicate); Assert.True(result.ReadyToAcknowledge);
        Assert.Equal(1, await fresh.Set<LabAssemblyReceipt>().CountAsync(r => r.LabAssemblyJobId == job.Id));
        var conflict = await MessagingReceiver(fresh, clock).ReceiveAsync(message with { Snapshot = message.Snapshot with { StartedAtUtc = clock.Now.AddSeconds(-1) } }, default);
        Assert.True(conflict.Conflict); Assert.False(conflict.ReadyToAcknowledge);
        fresh.ChangeTracker.Clear();
        Assert.Equal(clock.Now, (await fresh.Set<LabAssemblyJob>().SingleAsync(j => j.Id == job.Id)).StartedAtUtc);
        Assert.Equal(saved.PayloadSha256, (await fresh.Set<LabAssemblyReceipt>().SingleAsync(r => r.Id == saved.Id)).PayloadSha256);
        Assert.False((await receiver.ReceiveAsync(message, default)).ReadyToAcknowledge);
    }

    [PostgreSqlReferenceFact]
    public async Task DeliveryDeadlinesPersistEscalationAndActualStartClearsUnconfirmedWarning()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext; var (job, clock) = await AddMessagingJobAsync(scope);
        var delivery = MessagingDelivery(db, clock);
        Assert.True(await delivery.BeginAttemptAsync(job.Id, "Run", default));
        db.ChangeTracker.Clear();
        Assert.False(await MessagingDelivery(db, clock).BeginAttemptAsync(job.Id, "Run", default));
        clock.Now = clock.Now.AddMinutes(31);
        await delivery.CheckDeadlinesAsync(job.Id, default); await delivery.CheckDeadlinesAsync(job.Id, default);
        job = await db.Set<LabAssemblyJob>().SingleAsync(j => j.Id == job.Id);
        Assert.Contains("Escalated", job.AttentionReason); Assert.Null(job.StartedAtUtc);
        Assert.Equal(1, await db.Set<LabAssemblyEvent>().CountAsync(e => e.LabAssemblyJobId == job.Id && e.Kind == "DeliveryEscalated"));
        Assert.True(await delivery.BeginAttemptAsync(job.Id, "Run", default));
        await MessagingReceiver(db, clock).ReceiveAsync(new(job.Id, "test-provider", "confirmed-start", 1, clock.Now,
            new("external", "Running", clock.Now)), default);
        Assert.Null(job.AttentionReason); Assert.Equal(clock.Now, job.StartedAtUtc);
        Assert.False(await delivery.BeginAttemptAsync(job.Id, "Run", default));
    }

    [PostgreSqlReferenceFact]
    public async Task FinalReceiptWinsCancellationRaceAndLateProgressCannotRewriteOutcome()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext; var (job, clock) = await AddMessagingJobAsync(scope);
        job.RequestCancellation(scope.PlatformUser.Id, "TEST cancellation", clock.Now);
        db.Add(new LabAssemblyCommand(job.Id, "Cancel", clock.Now)); await db.SaveChangesAsync();
        var receiver = MessagingReceiver(db, clock);
        var message = new AssemblyLifecycleMessage(job.Id, "test-provider", "final", 2, clock.Now,
            new("external", "Succeeded", clock.Now.AddMinutes(-2), clock.Now.AddMinutes(-1), clock.Now.AddMinutes(-1)));
        Assert.True((await receiver.ReceiveAsync(message, default)).ReadyToAcknowledge);
        var cancel = await db.Set<LabAssemblyCommand>().SingleAsync(c => c.LabAssemblyJobId == job.Id && c.Kind == "Cancel");
        Assert.NotNull(cancel.ConfirmedAtUtc); Assert.Null(cancel.ReceivedAtUtc); Assert.Equal("Succeeded", job.State);
        var version = job.Version;
        Assert.True((await receiver.ReceiveAsync(message with { EventId = "late-running", Sequence = 1,
            Snapshot = new("external", "Running", message.Snapshot.StartedAtUtc, Percentage: 100) }, default)).ReadyToAcknowledge);
        await receiver.ReceiveProgressAsync(job.Id, "test-provider", "external", 100, 4, default);
        Assert.Equal("Succeeded", job.State); Assert.Equal(version, job.Version);
        Assert.False((await receiver.ReceiveAsync(message with { EventId = "conflicting-final", Sequence = 3,
            Snapshot = message.Snapshot with { State = "Failed", Reason = "TEST conflict" } }, default)).ReadyToAcknowledge);
        Assert.Equal("Succeeded", job.State); Assert.Contains("reconciliation", job.AttentionReason);
    }

    [PostgreSqlReferenceFact]
    public async Task ReceiptsRejectWrongProviderAndForeignEventIdentityAndOuterTransactions()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext; var (first, clock) = await AddMessagingJobAsync(scope);
        var (second, _) = await AddMessagingJobAsync(scope);
        var receiver = MessagingReceiver(db, clock);
        var message = new AssemblyLifecycleMessage(first.Id, "test-provider", "owned-event", 1, clock.Now, new("external", "Accepted"));
        await Assert.ThrowsAsync<OrderManagementException>(() => receiver.ReceiveAsync(message with { ProviderKey = "other" }, default));
        Assert.True((await receiver.ReceiveAsync(message, default)).ReadyToAcknowledge);
        await Assert.ThrowsAsync<OrderManagementException>(() => receiver.ReceiveAsync(message with { JobId = second.Id }, default));
        Assert.Equal("Dispatching", second.State);
        await using var tx = await db.Database.BeginTransactionAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => receiver.ReceiveAsync(message, default));
        await tx.RollbackAsync();
    }

    [PostgreSqlReferenceFact]
    public async Task MalformedLifecycleManifestIsHeldWithoutChangingExecutionFacts()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock) = await AddMessagingJobAsync(scope);
        var message = new AssemblyLifecycleMessage(job.Id, "test-provider", "malformed", 1, clock.Now,
            new("external", "Succeeded", clock.Now, clock.Now, clock.Now, OutputManifestJson: "{broken"));
        var result = await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(message, default);
        Assert.False(result.ReadyToAcknowledge); Assert.True(result.Conflict);
        Assert.Equal("Dispatching", job.State); Assert.Null(job.StartedAtUtc); Assert.Null(job.StoppedAtUtc);
        Assert.Null(job.OutputManifestJson); Assert.Contains("reconciliation", job.AttentionReason);
        Assert.Equal("Conflict", (await scope.DbContext.Set<LabAssemblyReceipt>().SingleAsync(r => r.Id == result.ReceiptId)).Outcome);
    }

    private static async Task<(LabAssemblyJob Job, AssemblyTestClock Clock)> AddMessagingJobAsync(ShippingTestScope scope)
    {
        var now = DateTime.UtcNow.AddMinutes(-2); now = new(now.Ticks - now.Ticks % 10, DateTimeKind.Utc);
        var order = scope.AddCommercialPhaseOrder("TEST messaging " + Guid.NewGuid());
        var sample = scope.AddCommercialPhaseSample(order, "TEST messaging sample");
        var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id,
            scope.CustomerOrganization.Id, "messaging-test", 1, "test", null);
        var specimen = new LabSpecimen(work.Id, sample.Id); work.Specimens.Add(specimen);
        var job = new LabAssemblyJob(Guid.NewGuid(), work.Id, specimen.Id, scope.CustomerOrganization.Id, 1,
            scope.PlatformUser.Id, "test-provider", "{}", "{}", new string('A', 64), now);
        job.BeginDispatch(now); scope.DbContext.AddRange(work, job, new LabAssemblyCommand(job.Id, "Run", now));
        await scope.DbContext.SaveChangesAsync(); return (job, new(now));
    }
    private static LabAssemblyService MessagingService(PhaenoPortal.App.Infrastructure.Persistence.PSeqOperationsDbContext db, AssemblyTestClock clock,
        LabAssemblyProgress progress) => new(db, new AssemblyTestProvider(), progress, Options.Create(new LabAssemblyOptions()), Options.Create(new PSeqOrderToCashOptions()), clock);
    private static LabAssemblyDelivery MessagingDelivery(PhaenoPortal.App.Infrastructure.Persistence.PSeqOperationsDbContext db, AssemblyTestClock clock)
        => new(db, MessagingService(db, clock, new(clock)), Options.Create(new LabAssemblyOptions()), clock);
    private static LabAssemblyReceiptService MessagingReceiver(PhaenoPortal.App.Infrastructure.Persistence.PSeqOperationsDbContext db, AssemblyTestClock clock)
    {
        var progress = new LabAssemblyProgress(clock); var service = MessagingService(db, clock, progress);
        return new(db, service, new(db, service, new AssemblyTestProvider(), progress, clock, new(db, service, Options.Create(new LabAssemblyOptions()), clock)), progress, clock);
    }

    private sealed partial class ShippingTestScope
    {
        public LabOperationsRequestContext CreateNotificationAccess(PSeqOperationsDbContext db)
            => new(db, new FixedIdentityContext(platformIdentity));
    }
    private sealed class MessagingTestHub : IHubContext<LabAssemblyNotificationHub>, IHubClients, IClientProxy
    {
        public List<string> Messages { get; } = [];
        public IHubClients Clients => this;
        public IGroupManager Groups => throw new NotSupportedException();
        public IClientProxy All => this;
        public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => this;
        public IClientProxy Client(string connectionId) => this;
        IClientProxy IHubClients<IClientProxy>.Clients(IReadOnlyList<string> connectionIds) => this;
        public IClientProxy Group(string groupName) => this;
        public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => this;
        IClientProxy IHubClients<IClientProxy>.Groups(IReadOnlyList<string> groupNames) => this;
        public IClientProxy User(string userId) => this;
        public IClientProxy Users(IReadOnlyList<string> userIds) => this;
        public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
        { Assert.Equal("AssemblyJobChanged", method); Messages.Add(System.Text.Json.JsonSerializer.Serialize(args)); return Task.CompletedTask; }
    }
}
