namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task AssemblyReconciliationPreservesExecutionReceiptsAndOriginalHistoryAcrossReplayAndRestart()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock, final) = await AddConflictedAssemblyAsync(scope);
        var db = scope.DbContext;
        var receipts = await db.Set<LabAssemblyReceipt>().AsNoTracking().Where(r => r.LabAssemblyJobId == job.Id)
            .OrderBy(r => r.Id).Select(r => new { r.Id, r.PayloadJson, r.PayloadSha256, r.Outcome, r.ConflictSha256 }).ToArrayAsync();
        var originalEvents = await db.Set<LabAssemblyEvent>().AsNoTracking().Where(e => e.LabAssemblyJobId == job.Id).ToDictionaryAsync(e => e.Id, e => e.EvidenceJson);
        var before = new { job.State, job.ProviderJobId, job.StartedAtUtc, job.StoppedAtUtc, job.DispositionAtUtc, job.DispositionReason };
        var provider = new ReconciliationTestProvider();
        var service = ReconciliationService(db, clock, provider);
        var repeatService = MessagingService(db, clock, new(clock));
        await Assert.ThrowsAsync<OrderManagementException>(() => repeatService.RequireRepeatHistoryAsync(job.LabSpecimenId, job.SequencingRunNumber, default));
        var request = await ReviewRequestAsync(service, job);
        await service.ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default);
        Assert.Null(job.AttentionReason);
        Assert.Equal(job.Id, (await repeatService.RequireRepeatHistoryAsync(job.LabSpecimenId, job.SequencingRunNumber, default))!.Id);
        Assert.Equal(before, new { job.State, job.ProviderJobId, job.StartedAtUtc, job.StoppedAtUtc, job.DispositionAtUtc, job.DispositionReason });
        Assert.Equal(receipts, await db.Set<LabAssemblyReceipt>().AsNoTracking().Where(r => r.LabAssemblyJobId == job.Id)
            .OrderBy(r => r.Id).Select(r => new { r.Id, r.PayloadJson, r.PayloadSha256, r.Outcome, r.ConflictSha256 }).ToArrayAsync());
        Assert.All(await db.Set<LabAssemblyEvent>().AsNoTracking().Where(e => originalEvents.Keys.Contains(e.Id)).ToArrayAsync(),
            e => Assert.Equal(originalEvents[e.Id], e.EvidenceJson));
        var decisionEvent = await db.Set<LabAssemblyEvent>().SingleAsync(e => e.Id == request.Id);
        Assert.Equal(scope.PlatformUser.Id, decisionEvent.ActorUserId);
        var decision = JsonSerializer.Deserialize<AssemblyReconciliationDecision>(decisionEvent.EvidenceJson, LabAssemblyService.Json)!;
        Assert.Equal("MissingHistory", decision.ProviderObservation.Status);
        Assert.Equal(2, decision.ReviewedReceipts.Count);
        Assert.Equal("Failed", decision.SavedExecution.State);
        await using var restarted = scope.CreateAdditionalContext();
        var restartedService = ReconciliationService(restarted, clock, provider);
        await restartedService.ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default);
        Assert.Single(await restarted.Set<LabAssemblyEvent>().Where(e => e.Kind == "ConflictReconciled" && e.LabAssemblyJobId == job.Id).ToArrayAsync());
        Assert.False((await restartedService.ReviewAsync(await restarted.Set<LabAssemblyJob>().SingleAsync(j => j.Id == job.Id), default)).HasUnresolvedConflict);
        var replay = await MessagingReceiver(restarted, clock).ReceiveAsync(final, default);
        Assert.True(replay.Duplicate); Assert.True(replay.ReadyToAcknowledge); Assert.False(replay.Conflict);
        await MessagingDelivery(restarted, clock).CheckDeadlinesAsync(job.Id, default);
        Assert.Null((await restarted.Set<LabAssemblyJob>().SingleAsync(j => j.Id == job.Id)).AttentionReason);
        Assert.Equal(0, provider.StartCalls);
        Assert.Equal(0, (await restarted.Set<LabAssemblyCommand>().SingleAsync(c => c.LabAssemblyJobId == job.Id)).AttemptCount);
        await Assert.ThrowsAsync<OrderManagementException>(() => restartedService.ReconcileAsync(job.LabWorkOrderId, job.Id,
            request with { Reason = "Changed review" }, scope.PlatformUser.Id, default));
    }

    [PostgreSqlReferenceFact]
    public async Task AssemblyReconciliationRejectsStaleEvidenceAndNewConflictsReopenAfterReview()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock, final) = await AddConflictedAssemblyAsync(scope);
        var service = ReconciliationService(scope.DbContext, clock, new ReconciliationTestProvider());
        var request = await ReviewRequestAsync(service, job);
        // A further conflict can arrive without changing the already-visible attention text or job version.
        var third = final with { EventId = "third-failure", Sequence = 4, Snapshot = final.Snapshot with { Reason = "Third conflicting failure" } };
        await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(third, default);
        await Assert.ThrowsAsync<OrderManagementException>(() => service.ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default));
        request = await ReviewRequestAsync(service, job);
        await service.ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default);
        Assert.False(await MessagingDelivery(scope.DbContext, clock).HasConflictAsync(job.Id, default));
        var changed = final with { Snapshot = final.Snapshot with { Reason = "Changed bytes under the same provider event" } };
        Assert.False((await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(changed, default)).ReadyToAcknowledge);
        Assert.True(await MessagingDelivery(scope.DbContext, clock).HasConflictAsync(job.Id, default));
        request = await ReviewRequestAsync(service, job);
        await service.ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default);
        Assert.True((await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(changed, default)).ReadyToAcknowledge);
        // A third payload hash must reopen review even though the receipt retains its first conflict hash.
        var fourth = changed with { Snapshot = changed.Snapshot with { Reason = "Another changed payload" } };
        Assert.False((await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(fourth, default)).ReadyToAcknowledge);
        Assert.True((await service.ReviewAsync(job, default)).HasUnresolvedConflict);
        Assert.Contains("reconciliation", job.AttentionReason);
        Assert.Equal("First failure", job.DispositionReason);
    }

    [PostgreSqlReferenceFact]
    public async Task AssemblyReconciliationRequiresIndependentVerificationAndRejectsActiveProviderExecution()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock, _) = await AddConflictedAssemblyAsync(scope);
        var provider = new ReconciliationTestProvider();
        var service = ReconciliationService(scope.DbContext, clock, provider);
        var request = await ReviewRequestAsync(service, job);
        foreach (var invalid in new[] { request with { ConfirmedStopped = false }, request with { VerificationEvidence = " " },
            request with { Version = job.Version - 1 }, request with { EvidenceFingerprint = new string('F', 64) } })
            await Assert.ThrowsAsync<OrderManagementException>(() => service.ReconcileAsync(job.LabWorkOrderId, job.Id, invalid, scope.PlatformUser.Id, default));
        provider.Observation = new("Observed", new("external", "Running", clock.Now));
        await Assert.ThrowsAsync<OrderManagementException>(() => service.ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default));
        provider.Observation = new("Observed", new("foreign-execution", "Failed", clock.Now, clock.Now, clock.Now));
        await Assert.ThrowsAsync<OrderManagementException>(() => service.ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => service.ReconcileAsync(Guid.NewGuid(), job.Id, request, scope.PlatformUser.Id, default));
        Assert.Empty(await scope.DbContext.Set<LabAssemblyEvent>().Where(e => e.Kind == "ConflictReconciled" && e.LabAssemblyJobId == job.Id).ToArrayAsync());
        Assert.NotNull(job.AttentionReason);
        Assert.Equal(0, provider.StartCalls);
    }

    [PostgreSqlReferenceFact]
    public async Task AssemblyReconciliationConcurrentIdenticalReviewsAppendOneDecision()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock, _) = await AddConflictedAssemblyAsync(scope);
        var provider = new ReconciliationTestProvider();
        var request = await ReviewRequestAsync(ReconciliationService(scope.DbContext, clock, provider), job);
        await using var first = scope.CreateAdditionalContext();
        await using var second = scope.CreateAdditionalContext();
        await Task.WhenAll(ReconciliationService(first, clock, provider).ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default),
            ReconciliationService(second, clock, provider).ReconcileAsync(job.LabWorkOrderId, job.Id, request, scope.PlatformUser.Id, default));
        Assert.Single(await scope.DbContext.Set<LabAssemblyEvent>().AsNoTracking().Where(e => e.LabAssemblyJobId == job.Id && e.Kind == "ConflictReconciled").ToArrayAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task AssemblyReconciliationCannotResolveActiveOrSuccessfulExecution()
    {
        foreach (var state in new[] { "Running", "Succeeded" })
        {
            await using var scope = await ShippingTestScope.CreateAsync();
            var (job, clock) = await AddMessagingJobAsync(scope);
            var stop = state == "Succeeded" ? (DateTime?)clock.Now : null;
            var first = new AssemblyLifecycleMessage(job.Id, "test-provider", "original", 1, clock.Now,
                new("external", state, clock.Now, stop, stop));
            await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(first, default);
            var conflict = first with { EventId = "conflict", Sequence = 2, Snapshot = new("external", "Failed", clock.Now.AddSeconds(-1), clock.Now, clock.Now, "Disputed failure") };
            await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(conflict, default);
            var service = ReconciliationService(scope.DbContext, clock, new ReconciliationTestProvider());
            Assert.False((await service.ReviewAsync(job, default)).Eligible);
            var request = await ReviewRequestAsync(service, job);
            await Assert.ThrowsAsync<OrderManagementException>(() => service.ReconcileAsync(job.LabWorkOrderId, job.Id,
                request, scope.PlatformUser.Id, default));
            Assert.Equal(state, job.State); Assert.NotNull(job.AttentionReason);
        }
    }

    [PostgreSqlReferenceFact]
    public async Task AssemblyReconciliationEndpointRequiresAssignedSupervisorOrOperationsRole()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var (job, clock, _) = await AddConflictedAssemblyAsync(scope);
        var service = ReconciliationService(scope.DbContext, clock, new ReconciliationTestProvider());
        var request = await ReviewRequestAsync(service, job);
        scope.DbContext.Add(new LabRoleAssignment(scope.PlatformUser.Id, LabRole.Operator));
        await scope.DbContext.SaveChangesAsync();
        var denied = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateStrictReconciliationController()
            .ReconcileAssembly(job.LabWorkOrderId, job.Id, request, service, MessagingService(scope.DbContext, clock, new(clock)), default));
        Assert.Equal(403, denied.StatusCode);
        scope.DbContext.Add(new LabRoleAssignment(scope.PlatformUser.Id, LabRole.OperationsAdministrator));
        await scope.DbContext.SaveChangesAsync();
        var result = await scope.CreateStrictReconciliationController().ReconcileAssembly(job.LabWorkOrderId, job.Id, request,
            service, MessagingService(scope.DbContext, clock, new(clock)), default);
        Assert.Null(result.AttentionReason); Assert.Equal("Failed", result.State);
    }

    private static async Task<(LabAssemblyJob Job, AssemblyTestClock Clock, AssemblyLifecycleMessage Final)> AddConflictedAssemblyAsync(ShippingTestScope scope)
    {
        var (job, clock) = await AddMessagingJobAsync(scope);
        var start = clock.Now; clock.Now = start.AddMinutes(2);
        var first = new AssemblyLifecycleMessage(job.Id, "test-provider", "first-failure", 2, clock.Now,
            new("external", "Failed", start, start.AddSeconds(30), start.AddSeconds(30), "First failure"));
        await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(first, default);
        var second = first with { EventId = "conflicting-failure", Sequence = 3,
            Snapshot = first.Snapshot with { StoppedAtUtc = start.AddSeconds(60), DispositionAtUtc = start.AddSeconds(60), Reason = "Second failure" } };
        Assert.True((await MessagingReceiver(scope.DbContext, clock).ReceiveAsync(second, default)).Conflict);
        return (job, clock, second);
    }
    private static LabAssemblyReconciliationService ReconciliationService(PSeqOperationsDbContext db, AssemblyTestClock clock, ReconciliationTestProvider provider)
        => new(db, MessagingService(db, clock, new(clock)), provider, clock);
    private static async Task<ReconcileAssemblyRequest> ReviewRequestAsync(LabAssemblyReconciliationService service, LabAssemblyJob job)
        => new(Guid.NewGuid(), job.Version, (await service.ReviewAsync(job, default)).EvidenceFingerprint,
            "Retain the recorded failure; disputed provider times remain recorded.",
            "Provider operator verified the old process stopped and that this execution cannot resume.", true);
    private sealed class ReconciliationTestProvider : ILabAssemblyProvider, ILabAssemblyReconciliationProvider
    {
        public string Key => "test-provider";
        public AssemblyProviderAvailability Availability => new(true, "TEST ONLY", true, []);
        public bool SupportsIdempotentStart => true;
        public int StartCalls { get; private set; }
        public AssemblyReconciliationObservation Observation { get; set; } = new("MissingHistory");
        public Task<AssemblyReconciliationObservation> ObserveForReconciliationAsync(Guid id, CancellationToken ct) => Task.FromResult(Observation);
        public Task<AssemblyProviderSnapshot?> FindAsync(Guid id, CancellationToken ct) => throw new InvalidOperationException("Use the read-only observation.");
        public Task<AssemblyProviderSnapshot> StartAsync(LabAssemblyJob job, CancellationToken ct) { StartCalls++; throw new NotSupportedException(); }
        public Task<AssemblyProviderSnapshot?> CancelAsync(Guid id, string reason, CancellationToken ct) => throw new NotSupportedException();
        public Task<AssemblyInputVerification> VerifyInputsAsync(IReadOnlyList<AssemblyInput> inputs, CancellationToken ct) => throw new NotSupportedException();
    }
    private sealed partial class ShippingTestScope
    {
        public LabOperationsController CreateStrictReconciliationController() => new(DbContext,
            new LabOperationsRequestContext(DbContext, new FixedIdentityContext(platformIdentity),
                Options.Create(new PSeqOrderToCashOptions { DualControlEnforced = true }), NullLogger<LabOperationsRequestContext>.Instance))
        { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
    }
}
