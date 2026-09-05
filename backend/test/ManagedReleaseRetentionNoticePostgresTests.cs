namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.FileManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed partial class ManagedReleaseRetentionPostgresTests
{
    private static readonly IOptions<InvitationOptions> NoticeLinks = Options.Create(new InvitationOptions { PublicBaseUrl = "https://portal.example.test" });
    private static ManagedReleaseRetentionCheckpointService Checkpoints(PSeqOperationsDbContext db) => new(db, new(db, NoticeLinks));

    [Fact]
    public void GeneralNoticeProcessingRequiresAllThreeActivationConditions()
    {
        foreach (var processing in new[] { false, true })
        foreach (var enforcement in new[] { false, true })
        foreach (var attention in new[] { false, true })
            Assert.Equal(processing && enforcement && attention, new OrderManagementOptions
            { ReleasedDeliverableRetentionProcessing = processing, ReleasedDeliverableRetentionEnforcement = enforcement }.CanProcessRetention(attention));
        Assert.False(new OrderManagementOptions().ReleasedDeliverableRetentionProcessing);
    }

    [PostgreSqlReferenceFact]
    public Task ConcurrentNoticePollingRetainsOneWarningAndGraceForEachReleaseType() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var fixture = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-26));
            var snapshot = fixture.Snapshot!;
            await using var other = Db(connection);
            await Task.WhenAll(Checkpoints(fixture.Db).ProcessAsync(fixture.Type, fixture.ReleaseId, default),
                Checkpoints(other).ProcessAsync(fixture.Type, fixture.ReleaseId, default));
            var warning = Assert.Single(await fixture.Db.OrderNotifications.Where(value => value.WorkflowId == snapshot.Id).ToListAsync());
            Assert.Equal("retention-warning", warning.EventType);
            Assert.Null(warning.DepartmentId); Assert.Null(warning.RecipientUserId);
            Assert.Contains($"https://portal.example.test/{(assembly ? "data-assembly" : "lab-services")}/{fixture.WorkflowId:D}", warning.Body);
            Assert.Contains(snapshot.StandardDeletionAtUtc.ToString("yyyy-MM-dd HH:mm:ss"), warning.Body);
            foreach (var file in fixture.Files) { Assert.DoesNotContain(file.FileName, warning.Body); Assert.DoesNotContain(file.StorageKey, warning.Body); }
            await Task.WhenAll(Checkpoints(fixture.Db).ProcessAsync(fixture.Type, fixture.ReleaseId, default, snapshot.StandardDeletionAtUtc),
                Checkpoints(other).ProcessAsync(fixture.Type, fixture.ReleaseId, default, snapshot.StandardDeletionAtUtc));
            await fixture.Db.Entry(snapshot).ReloadAsync();
            Assert.Equal(snapshot.StandardDeletionAtUtc, snapshot.GraceActivatedAtUtc);
            Assert.NotNull(snapshot.GraceNotificationId);
            Assert.Equal(2, await fixture.Db.OrderNotifications.CountAsync(value => value.WorkflowId == snapshot.Id));
            await Checkpoints(fixture.Db).ProcessAsync(fixture.Type, fixture.ReleaseId, default, snapshot.PotentialFinalDeletionAtUtc);
            await fixture.Db.Entry(snapshot).ReloadAsync();
            Assert.Equal(snapshot.PotentialFinalDeletionAtUtc, snapshot.DownloadAccessClosedAtUtc); Assert.Null(snapshot.ByteDeletedAtUtc);
            Assert.Equal(2, await fixture.Db.OrderNotifications.CountAsync(value => value.WorkflowId == snapshot.Id));
        }
    });

    [PostgreSqlReferenceFact]
    public Task NoticesUseVerifiedWholePackageCompletionAndKeepActivatedGrace() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var completed = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-26));
            await completed.Execute(await completed.Download(true));
            await Checkpoints(completed.Db).ProcessAsync(completed.Type, completed.ReleaseId, default);
            await completed.Db.Entry(completed.Snapshot!).ReloadAsync();
            Assert.Equal("SkippedComplete", completed.Snapshot!.WarningCheckpointOutcome);
            await Checkpoints(completed.Db).ProcessAsync(completed.Type, completed.ReleaseId, default, completed.Snapshot.StandardDeletionAtUtc);
            await completed.Db.Entry(completed.Snapshot).ReloadAsync();
            Assert.Null(completed.Snapshot.GraceActivatedAtUtc);
            Assert.Equal(completed.Snapshot.StandardDeletionAtUtc, completed.Snapshot.DownloadAccessClosedAtUtc);
            Assert.Empty(await completed.Db.OrderNotifications.Where(value => value.WorkflowId == completed.Snapshot.Id).ToListAsync());

            await using var late = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-31));
            await late.Execute(await late.Download(true));
            await Checkpoints(late.Db).ProcessAsync(late.Type, late.ReleaseId, default);
            await late.Db.Entry(late.Snapshot!).ReloadAsync();
            Assert.Equal("SkippedPastStandard", late.Snapshot!.WarningCheckpointOutcome);
            Assert.Equal(late.Snapshot.StandardDeletionAtUtc, late.Snapshot.GraceActivatedAtUtc);
            Assert.Equal("retention-grace", Assert.Single(await late.Db.OrderNotifications.Where(value => value.WorkflowId == late.Snapshot.Id).ToListAsync()).EventType);

            await using var unavailable = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-26));
            unavailable.Files[0].RecordScan(OperationalFileScanStatus.Rejected, "Synthetic quarantine"); await unavailable.Db.SaveChangesAsync();
            await Checkpoints(unavailable.Db).ProcessAsync(unavailable.Type, unavailable.ReleaseId, default);
            await unavailable.Db.Entry(unavailable.Snapshot!).ReloadAsync();
            Assert.Equal("SkippedUnavailable", unavailable.Snapshot!.WarningCheckpointOutcome);
            Assert.Empty(await unavailable.Db.OrderNotifications.Where(value => value.WorkflowId == unavailable.Snapshot.Id).ToListAsync());

            await using var legacy = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-40), snapshot: false);
            await Checkpoints(legacy.Db).ProcessAsync(legacy.Type, legacy.ReleaseId, default);
            Assert.Empty(await legacy.Db.OrderNotifications.Where(value => value.OrganizationId == legacy.Organization.Id).ToListAsync());
        }
    });

    [PostgreSqlReferenceFact]
    public Task NoticeRecoveryUsesCurrentAdminsAndReopensOneUrgentItemWithoutChangingDates() => InDatabase(async connection =>
    {
        foreach (var assembly in new[] { false, true })
        {
            await using var fixture = await Fixture.Create(connection, assembly, DateTime.UtcNow.AddDays(-26));
            var snapshot = fixture.Snapshot!;
            fixture.Actor.Deactivate(); await fixture.Db.SaveChangesAsync();
            await Checkpoints(fixture.Db).ProcessAsync(fixture.Type, fixture.ReleaseId, default);
            var notice = Assert.Single(await fixture.Db.OrderNotifications.Where(value => value.WorkflowId == snapshot.Id).ToListAsync());
            Assert.Equal(OrderNotificationStatus.Failed, notice.Status);
            var attention = Assert.Single(await fixture.Db.OperationalAttentionItems.Where(value => value.SourceId == snapshot.Id).ToListAsync());
            Assert.Contains(fixture.ReleaseId.ToString("D"), attention.Summary);
            Assert.Contains(snapshot.StandardDeletionAtUtc.ToString("yyyy-MM-dd HH:mm:ss"), attention.Summary);
            var admin = new User($"new-admin-{Guid.NewGuid():N}@example.test", "New", "Admin"); admin.Activate();
            var member = new User($"member-{Guid.NewGuid():N}@example.test", "Ordinary", "Member"); member.Activate();
            fixture.Db.AddRange(admin, member, new OrganizationMembership(admin.Id, fixture.Organization.Id, true), new OrganizationMembership(member.Id, fixture.Organization.Id, false));
            await fixture.Db.SaveChangesAsync();
            for (var index = 0; index < 2; index++)
            {
                attention.Resolve(admin.Id, DateTime.UtcNow, "Synthetic recovery attempt");
                notice.Retry(DateTime.UtcNow); notice.BeginAttempt(DateTime.UtcNow.AddMinutes(5)); await fixture.Db.SaveChangesAsync();
                await OrderNotificationDispatcher.DeliverAsync(fixture.Db, new NoticeSender { Fail = true }, notice.Id, notice.Version, NullLogger.Instance, default);
                Assert.Equal(OrderNotificationStatus.Failed, notice.Status);
                Assert.Equal(OperationalAttentionStatus.Open, attention.Status);
            }
            notice.Retry(DateTime.UtcNow); notice.BeginAttempt(DateTime.UtcNow.AddMinutes(5)); await fixture.Db.SaveChangesAsync();
            var sender = new NoticeSender();
            await OrderNotificationDispatcher.DeliverAsync(fixture.Db, sender, notice.Id, notice.Version, NullLogger.Instance, default);
            Assert.Equal(OrderNotificationStatus.Sent, notice.Status);
            Assert.Equal(admin.Email, Assert.Single(sender.Recipients));
            Assert.Equal(1, await fixture.Db.OrderNotifications.CountAsync(value => value.WorkflowId == snapshot.Id));
            Assert.Equal(1, await fixture.Db.OperationalAttentionItems.CountAsync(value => value.SourceId == snapshot.Id));
            await fixture.Db.Entry(snapshot).ReloadAsync();
            Assert.Null(snapshot.GraceActivatedAtUtc);
            Assert.Contains(snapshot.StandardDeletionAtUtc.ToString("yyyy-MM-dd HH:mm:ss"), notice.Body);
        }
    });

    [PostgreSqlReferenceFact]
    public Task NoticeWorkerAndDispatcherIsolateGeneralAndGovernedActivationAndRecoverExpiredClaims() => InDatabase(async connection =>
    {
        await using var governed = await GovernedResultRetentionPostgresTests.Scope.Create(connection);
        var governedSnapshot = await governed.Release(DateTime.UtcNow.AddDays(-26));
        await governed.CommitFixtureAsync();
        await using var lab = await Fixture.Create(connection, false, DateTime.UtcNow.AddDays(-26));
        await using var assembly = await Fixture.Create(connection, true, DateTime.UtcNow.AddDays(-26));
        await Checkpoints(governed.Db).ProcessAsync(ReleasedDeliverablePackageType.LabResult, governedSnapshot.LabResultReleaseId!.Value, default);
        await governed.Db.Entry(governedSnapshot).ReloadAsync(); Assert.Null(governedSnapshot.WarningCheckpointAtUtc);
        await using var services = new ServiceCollection().AddScoped(_ => Db(connection))
            .AddSingleton(NoticeLinks).AddScoped<GovernedRetentionCheckpointService>().AddScoped<ManagedReleaseRetentionCheckpointService>().BuildServiceProvider();
        var scopes = services.GetRequiredService<IServiceScopeFactory>();
        var general = Options.Create(new OrderManagementOptions());
        var operations = Options.Create(new PSeqOrderToCashOptions { AttentionOperations = true });
        using var worker = new ManagedReleaseRetentionWorker(scopes, general, operations, NullLogger<ManagedReleaseRetentionWorker>.Instance);
        Assert.Equal(0, await worker.ProcessPendingAsync(default));
        general.Value.ReleasedDeliverableRetentionProcessing = true;
        Assert.Equal(0, await worker.ProcessPendingAsync(default));
        general.Value.ReleasedDeliverableRetentionEnforcement = true;
        Assert.Equal(2, await worker.ProcessPendingAsync(default)); Assert.Equal(0, await worker.ProcessPendingAsync(default));
        await new GovernedRetentionCheckpointService(governed.Db, NoticeLinks).ProcessAsync(governed.Package.Id, default);
        using var dispatcher = new OrderNotificationDispatcher(scopes, Options.Create(new PersistenceOptions()), operations, general, NullLogger<OrderNotificationDispatcher>.Instance);
        general.Value.ReleasedDeliverableRetentionProcessing = false;
        Assert.Null(await dispatcher.ClaimNextAsync(default));
        var ordinary = new OrderNotification(lab.Organization.Id, null, OrderWorkflowTypes.LabService, lab.WorkflowId, "fixture-update", "Synthetic", "Synthetic");
        lab.Db.Add(ordinary); await lab.Db.SaveChangesAsync();
        var ordinaryClaim = Assert.IsType<OrderNotificationDispatcher.NotificationClaim>(await dispatcher.ClaimNextAsync(default));
        Assert.Equal(ordinary.Id, ordinaryClaim.Id); Assert.True(ordinaryClaim.ShouldSend);
        using var pseqDispatcher = new OrderNotificationDispatcher(scopes, Options.Create(new PersistenceOptions()),
            Options.Create(new PSeqOrderToCashOptions { AttentionOperations = true, GovernedPSeqResults = true, GovernedRetentionProcessing = true }), general, NullLogger<OrderNotificationDispatcher>.Instance);
        var pseqClaim = Assert.IsType<OrderNotificationDispatcher.NotificationClaim>(await pseqDispatcher.ClaimNextAsync(default));
        var pseqNotice = await governed.Db.OrderNotifications.AsNoTracking().SingleAsync(value => value.Id == pseqClaim.Id);
        Assert.Equal(governedSnapshot.Id, pseqNotice.WorkflowId);
        Assert.Null(await pseqDispatcher.ClaimNextAsync(default));
        general.Value.ReleasedDeliverableRetentionProcessing = true;
        var claims = new[] { (await dispatcher.ClaimNextAsync(default))!, (await dispatcher.ClaimNextAsync(default))! };
        Assert.Null(await dispatcher.ClaimNextAsync(default));
        var snapshots = await lab.Db.OrderNotifications.AsNoTracking().Where(value => claims.Select(claim => claim.Id).Contains(value.Id)).Select(value => value.WorkflowId).ToListAsync();
        Assert.Contains(lab.Snapshot!.Id, snapshots); Assert.Contains(assembly.Snapshot!.Id, snapshots);
        // An interrupted final claim becomes retryable and appears in Operations through the real claim path.
        var interrupted = await lab.Db.OrderNotifications.SingleAsync(value => value.Id == claims[0].Id);
        while (interrupted.AttemptCount < 5) interrupted.BeginAttempt(DateTime.UtcNow.AddMinutes(-1));
        await lab.Db.SaveChangesAsync();
        var recovered = Assert.IsType<OrderNotificationDispatcher.NotificationClaim>(await dispatcher.ClaimNextAsync(default));
        Assert.Equal(interrupted.Id, recovered.Id); Assert.False(recovered.ShouldSend);
        await GovernedRetentionCheckpointService.SynchronizeFailuresAsync(lab.Db, default);
        await GovernedRetentionCheckpointService.SynchronizeFailuresAsync(lab.Db, default);
        Assert.Equal(5, Assert.Single(await lab.Db.OperationalAttentionItems.Where(value => value.SourceId == interrupted.WorkflowId).ToListAsync()).AttemptCount);
        await lab.Db.Entry(interrupted).ReloadAsync(); Assert.Equal(OrderNotificationStatus.Failed, interrupted.Status);
    });

    private sealed class NoticeSender : IOrderNotificationSender
    {
        public bool Fail { get; init; }
        public IReadOnlyList<string> Recipients { get; private set; } = [];
        public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken token)
        { Recipients = recipients; if (Fail) throw new IOException("Synthetic provider failure"); return Task.CompletedTask; }
    }
}
