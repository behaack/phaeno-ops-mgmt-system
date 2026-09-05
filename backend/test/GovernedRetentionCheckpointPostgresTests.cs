namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using Scope = GovernedResultRetentionPostgresTests.Scope;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class GovernedRetentionCheckpointPostgresTests
{
    private static GovernedRetentionCheckpointService Worker(Scope scope) => new(scope.Db,
        Options.Create(new InvitationOptions { PublicBaseUrl = "https://portal.example.test" }));

    [PostgreSqlReferenceFact]
    public async Task RepeatedProcessingCreatesOneWarningAndOneGraceWithFrozenDates()
    {
        await using var scope = await Scope.Create();
        var snapshot = await scope.Release(DateTime.UtcNow.AddDays(-26));
        var worker = Worker(scope);
        await worker.ProcessAsync(scope.Package.Id, default, snapshot.WarningAtUtc);
        await worker.ProcessAsync(scope.Package.Id, default, snapshot.WarningAtUtc.AddHours(1));
        var warning = Assert.Single(await scope.Db.OrderNotifications.Where(value => value.WorkflowId == snapshot.Id).ToListAsync());
        Assert.Equal("retention-warning", warning.EventType);
        Assert.Null(warning.DepartmentId);
        Assert.Null(warning.RecipientUserId);
        Assert.Contains($"https://portal.example.test/lab-services/{scope.Order.Id:D}", warning.Body);
        Assert.Contains(snapshot.StandardDeletionAtUtc.ToString("yyyy-MM-dd HH:mm:ss"), warning.Body);
        Assert.DoesNotContain(scope.Artifact.FileName, warning.Body);
        Assert.DoesNotContain(scope.Artifact.ObjectStorageKey, warning.Body);
        Assert.DoesNotContain("Synthetic sample", warning.Body);
        await worker.ProcessAsync(scope.Package.Id, default, snapshot.StandardDeletionAtUtc);
        await worker.ProcessAsync(scope.Package.Id, default, snapshot.StandardDeletionAtUtc.AddHours(1));
        Assert.Equal(2, await scope.Db.OrderNotifications.CountAsync(value => value.WorkflowId == snapshot.Id));
        await scope.Db.Entry(snapshot).ReloadAsync();
        Assert.Equal("Queued", snapshot.WarningCheckpointOutcome);
        Assert.Equal(snapshot.StandardDeletionAtUtc, snapshot.GraceActivatedAtUtc);
        Assert.NotNull(snapshot.GraceNotificationId);
        await worker.ProcessAsync(scope.Package.Id, default, snapshot.PotentialFinalDeletionAtUtc);
        await scope.Db.Entry(snapshot).ReloadAsync();
        Assert.Equal(snapshot.PotentialFinalDeletionAtUtc, snapshot.DownloadAccessClosedAtUtc);
        Assert.Null(snapshot.ByteDeletedAtUtc);
    }

    [PostgreSqlReferenceFact]
    public async Task LateWarningSkipsCompletedPackageAndStandardCheckpointClosesWithoutGrace()
    {
        await using var scope = await Scope.Create();
        var snapshot = await scope.Release(DateTime.UtcNow.AddDays(-26));
        AddSuccess(scope, snapshot.WarningAtUtc.AddMinutes(-1));
        await scope.Db.SaveChangesAsync();
        await Worker(scope).ProcessAsync(scope.Package.Id, default, snapshot.WarningAtUtc.AddMinutes(1));
        await scope.Db.Entry(snapshot).ReloadAsync();
        Assert.Equal("SkippedComplete", snapshot.WarningCheckpointOutcome);
        Assert.Null(snapshot.WarningNotificationId);
        await Worker(scope).ProcessAsync(scope.Package.Id, default, snapshot.StandardDeletionAtUtc);
        await scope.Db.Entry(snapshot).ReloadAsync();
        Assert.Null(snapshot.GraceActivatedAtUtc);
        Assert.Equal(snapshot.StandardDeletionAtUtc, snapshot.DownloadAccessClosedAtUtc);
        Assert.Empty(await scope.Db.OrderNotifications.Where(value => value.WorkflowId == snapshot.Id).ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task DelayedWorkerSkipsObsoleteWarningButRetainsGraceEvenAfterLateSuccess()
    {
        await using var scope = await Scope.Create();
        var snapshot = await scope.Release(DateTime.UtcNow.AddDays(-31));
        await Worker(scope).ProcessAsync(scope.Package.Id, default);
        AddSuccess(scope, snapshot.StandardDeletionAtUtc.AddMinutes(1));
        await scope.Db.SaveChangesAsync();
        await Worker(scope).ProcessAsync(scope.Package.Id, default);
        await scope.Db.Entry(snapshot).ReloadAsync();
        Assert.Equal("SkippedPastStandard", snapshot.WarningCheckpointOutcome);
        Assert.Equal(snapshot.StandardDeletionAtUtc, snapshot.GraceActivatedAtUtc);
        Assert.Equal("retention-grace", Assert.Single(await scope.Db.OrderNotifications.Where(value => value.WorkflowId == snapshot.Id).ToListAsync()).EventType);
    }

    [PostgreSqlReferenceFact]
    public async Task MissingAdminsProduceOneUrgentItemAndRetryUsesCurrentOrgAdminsOnly()
    {
        await using var scope = await Scope.Create();
        var snapshot = await scope.Release(DateTime.UtcNow.AddDays(-26));
        var membership = await scope.Db.OrganizationMemberships.SingleAsync(value => value.OrganizationId == scope.Organization.Id);
        // Keep the organization active while its only admin is inactive.
        scope.Actor.Deactivate();
        await scope.Db.SaveChangesAsync();
        await Worker(scope).ProcessAsync(scope.Package.Id, default);
        var notice = Assert.Single(await scope.Db.OrderNotifications.Where(value => value.WorkflowId == snapshot.Id).ToListAsync());
        Assert.Equal(OrderNotificationStatus.Failed, notice.Status);
        var attention = Assert.Single(await scope.Db.OperationalAttentionItems.Where(value => value.SourceId == snapshot.Id).ToListAsync());
        Assert.Contains("Urgent", attention.Summary);
        scope.Actor.Activate();
        var replacement = new User($"replacement-{Guid.NewGuid():N}@example.test", "Other", "Admin");
        replacement.Activate();
        scope.Db.AddRange(replacement, new OrganizationMembership(replacement.Id, scope.Organization.Id, true));
        await scope.Db.SaveChangesAsync();
        notice.Retry(DateTime.UtcNow); notice.BeginAttempt(DateTime.UtcNow.AddMinutes(5));
        await scope.Db.SaveChangesAsync();
        var sender = new Sender();
        await OrderNotificationDispatcher.DeliverAsync(scope.Db, sender, notice.Id, notice.Version, NullLogger.Instance, default);
        Assert.Equal(OrderNotificationStatus.Sent, notice.Status);
        Assert.Equal(2, sender.Recipients.Count);
        Assert.Contains(replacement.Email, sender.Recipients);
        Assert.Equal(1, await scope.Db.OperationalAttentionItems.CountAsync(value => value.SourceId == snapshot.Id));
        Assert.Equal(snapshot.StandardDeletionAtUtc, (await scope.Read()).Retention!.StandardDeletionAtUtc);
    }

    [PostgreSqlReferenceFact]
    public async Task ProviderFailureStaysRetryableAndReopensTheExistingAttentionItem()
    {
        await using var scope = await Scope.Create();
        var snapshot = await scope.Release(DateTime.UtcNow.AddDays(-26));
        await Worker(scope).ProcessAsync(scope.Package.Id, default);
        var notice = await scope.Db.OrderNotifications.SingleAsync(value => value.WorkflowId == snapshot.Id);
        var sender = new Sender { Fail = true };
        for (var index = 0; index < 2; index++)
        {
            if (index > 0) notice.Retry(DateTime.UtcNow);
            notice.BeginAttempt(DateTime.UtcNow.AddMinutes(5)); await scope.Db.SaveChangesAsync();
            await OrderNotificationDispatcher.DeliverAsync(scope.Db, sender, notice.Id, notice.Version, NullLogger.Instance, default);
            Assert.Equal(OrderNotificationStatus.Failed, notice.Status);
            var item = await scope.Db.OperationalAttentionItems.SingleAsync(value => value.SourceId == snapshot.Id);
            Assert.Equal(OperationalAttentionStatus.Open, item.Status);
            if (index == 0) { item.Resolve(scope.Actor.Id, DateTime.UtcNow, "Synthetic attempted recovery"); await scope.Db.SaveChangesAsync(); }
        }
        Assert.Equal(1, await scope.Db.OrderNotifications.CountAsync(value => value.WorkflowId == snapshot.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task InterruptedFinalDeliveryFailureIsRecoveredIntoOperationsAttention()
    {
        await using var scope = await Scope.Create();
        var snapshot = await scope.Release(DateTime.UtcNow.AddDays(-26));
        await Worker(scope).ProcessAsync(scope.Package.Id, default);
        var notice = await scope.Db.OrderNotifications.SingleAsync(value => value.WorkflowId == snapshot.Id);
        for (var index = 0; index < 5; index++) notice.BeginAttempt(DateTime.UtcNow.AddMinutes(-1));
        notice.MarkFailed("Final claim expired during synthetic interruption", DateTime.UtcNow);
        await scope.Db.SaveChangesAsync();
        await GovernedRetentionCheckpointService.SynchronizeFailuresAsync(scope.Db, default);
        await GovernedRetentionCheckpointService.SynchronizeFailuresAsync(scope.Db, default);
        var attention = Assert.Single(await scope.Db.OperationalAttentionItems.Where(value => value.SourceId == snapshot.Id).ToListAsync());
        Assert.Contains(scope.Package.Id.ToString("D"), attention.Summary);
        Assert.Equal(5, attention.AttemptCount);
    }

    [PostgreSqlReferenceFact]
    public async Task RevocationWinsBeforeCompletionAndSuccessfulCompletionRemainsImmutable()
    {
        foreach (var successFirst in new[] { false, true })
        {
            await using var scope = await Scope.Create();
            await scope.Release(DateTime.UtcNow);
            var transfer = await scope.Attempts.StartPSeqArtifactAsync(scope.Package, scope.Artifact, scope.Actor.Id, DateTime.UtcNow, null, null, null, default);
            if (successFirst) Assert.True(await scope.Attempts.CompleteAsync(transfer.AttemptIds, OperationalFileDownloadOutcome.Succeeded, DateTime.UtcNow, null, true, default));
            scope.Actor.Deactivate(); await scope.Db.SaveChangesAsync();
            await scope.Attempts.CompleteAsync(transfer.AttemptIds, OperationalFileDownloadOutcome.Succeeded, DateTime.UtcNow, null, true, default);
            var attempt = await scope.Db.OperationalFileDownloads.SingleAsync(value => value.Id == transfer.AttemptIds[0]);
            await scope.Db.Entry(attempt).ReloadAsync();
            Assert.Equal(successFirst ? OperationalFileDownloadOutcome.Succeeded : OperationalFileDownloadOutcome.Revoked, attempt.Outcome);
            Assert.Equal(successFirst, attempt.CountsForReleasedPackageRetention);
        }
    }

    private static void AddSuccess(Scope scope, DateTime completedAt)
    {
        var attempt = OperationalFileDownload.ForPSeqArtifact(Guid.NewGuid(), scope.Artifact.Id, scope.Organization.Id,
            scope.Actor.Id, scope.Package.Id, completedAt.AddMinutes(-1), completedAt.AddMinutes(30), null, null);
        attempt.Complete(OperationalFileDownloadOutcome.Succeeded, completedAt, countsForReleasedPackageRetention: true);
        scope.Db.Add(attempt);
        GovernedResultRetentionPostgresTests.AddSyntheticCompletion(scope.Db, attempt, completedAt);
    }
    private sealed class Sender : IOrderNotificationSender
    {
        public bool Fail { get; init; }
        public IReadOnlyList<string> Recipients { get; private set; } = [];
        public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken token)
        { Recipients = recipients; if (Fail) throw new IOException("Synthetic provider outage"); return Task.CompletedTask; }
    }
}
