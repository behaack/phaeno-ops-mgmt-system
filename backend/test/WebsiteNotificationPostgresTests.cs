namespace PhaenoPortal.Test;

using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Website;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Features.Website.Notifications;
using PhaenoPortal.App.Features.Website.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Commercial.Accounts.Domain;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class WebsiteNotificationPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PublicSignupPersistsRequestedMessagesAndDuplicateCannotTriggerResend()
    {
        await using var scope = await Scope.Create();
        var request = new WebContactRequest { WebContact = new() { FirstName = "Ada", LastName = "Example", OrganizationName = "Synthetic", Email = $"signup-{Guid.NewGuid():N}@example.test", SendBrochure = true } };
        var service = new WebsiteService(scope.Db, new Recaptcha());
        await service.CreateContactAsync(request);
        var contact = await scope.Db.WebContacts.SingleAsync(item => item.Email == request.WebContact.Email);
        var notifications = await scope.Db.Set<WebNotificationDelivery>().Where(item => item.WebContactId == contact.Id).ToListAsync();
        Assert.Equal(2, notifications.Count);
        Assert.All(notifications, item => Assert.Equal(WebNotificationState.Pending, item.State));
        Assert.Empty(scope.Sender.Sent);
        await Assert.ThrowsAsync<WebsiteContactAlreadyExistsException>(() => service.CreateContactAsync(request));
        Assert.Equal(2, await scope.Db.Set<WebNotificationDelivery>().CountAsync(item => item.WebContactId == contact.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task FailureRetriesAreDurableBoundedAndPreserveEveryAttempt()
    {
        await using var scope = await Scope.Create();
        var delivery = await scope.Enqueue();
        scope.Sender.Fail = true;
        for (var index = 1; index <= WebsiteNotificationDispatcher.MaximumAttempts; index++)
        {
            await scope.Ready(delivery.Id);
            Assert.True(await scope.Dispatcher.ProcessNextAsync(default, delivery.Id));
            var saved = await scope.Read(delivery.Id);
            Assert.Equal(index, saved.AttemptCount);
            Assert.Equal(index == WebsiteNotificationDispatcher.MaximumAttempts ? WebNotificationState.Failed : WebNotificationState.Pending, saved.State);
            Assert.NotNull(saved.LastError);
        }
        Assert.False(await scope.Dispatcher.ProcessNextAsync(default, delivery.Id));
        Assert.Equal(5, await scope.Db.Set<WebNotificationAttempt>().CountAsync(item => item.WebNotificationDeliveryId == delivery.Id && item.Outcome == "Failed"));
    }

    [PostgreSqlReferenceFact]
    public async Task ResendRequiresCurrentVersionCooldownAndAuditsRequestingActor()
    {
        await using var scope = await Scope.Create();
        var delivery = await scope.Enqueue();
        await scope.Dispatcher.ProcessNextAsync(default, delivery.Id);
        var accepted = await scope.Read(delivery.Id);
        Assert.Equal(WebNotificationState.Accepted, accepted.State);
        await Assert.ThrowsAsync<WebsiteNotificationConflictException>(() => scope.Recovery.QueueRecoveryAsync(delivery.Id, accepted.Version, scope.Actor.Id, default));
        await scope.Db.Set<WebNotificationDelivery>().Where(item => item.Id == delivery.Id).ExecuteUpdateAsync(update => update.SetProperty(item => item.LastAttemptAtUtc, DateTimeOffset.UtcNow.AddMinutes(-10)));
        await Assert.ThrowsAsync<WebsiteNotificationConflictException>(() => scope.Recovery.QueueRecoveryAsync(delivery.Id, delivery.Version, scope.Actor.Id, default));
        await scope.Recovery.QueueRecoveryAsync(delivery.Id, accepted.Version, scope.Actor.Id, default);
        await Assert.ThrowsAsync<WebsiteNotificationConflictException>(() => scope.Recovery.QueueRecoveryAsync(delivery.Id, accepted.Version, scope.Actor.Id, default));
        await scope.Dispatcher.ProcessNextAsync(default, delivery.Id);
        var attempts = await scope.Db.Set<WebNotificationAttempt>().Where(item => item.WebNotificationDeliveryId == delivery.Id).OrderBy(item => item.AttemptNumber).ToListAsync();
        Assert.Equal(2, attempts.Count);
        Assert.Null(attempts[0].RecoveryByUserId);
        Assert.Equal(scope.Actor.Id, attempts[1].RecoveryByUserId);
        Assert.Equal(2, scope.Sender.Sent.Count);
        var recoveryAudit = await scope.Db.AuditEvents.SingleAsync(item => item.EntityId == delivery.Id.ToString() && item.Operation == "ResendQueued");
        Assert.Equal(scope.Actor.Id, recoveryAudit.ActorUserId);
        Assert.Contains("PreviousState", recoveryAudit.ChangesJson);
    }

    [PostgreSqlReferenceFact]
    public async Task LastExpiredLeaseStopsWithoutSendingAttemptSix()
    {
        await using var scope = await Scope.Create();
        var delivery = await scope.Enqueue();
        var lease = Guid.NewGuid();
        await scope.Db.Set<WebNotificationDelivery>().Where(item => item.Id == delivery.Id).ExecuteUpdateAsync(update => update
            .SetProperty(item => item.State, WebNotificationState.Processing).SetProperty(item => item.LeaseToken, lease)
            .SetProperty(item => item.AttemptsSinceRecovery, 5).SetProperty(item => item.AttemptCount, 5)
            .SetProperty(item => item.LastAttemptAtUtc, DateTimeOffset.UtcNow.AddMinutes(-10))
            .SetProperty(item => item.LeaseExpiresAtUtc, DateTimeOffset.UtcNow.AddMinutes(-1)));
        scope.Db.Add(new WebNotificationAttempt { Id = lease, WebNotificationDeliveryId = delivery.Id, AttemptNumber = 5, StartedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-10) });
        await scope.Db.SaveChangesAsync();
        await scope.Dispatcher.ProcessNextAsync(default, delivery.Id);
        Assert.Equal(WebNotificationState.Failed, (await scope.Read(delivery.Id)).State);
        Assert.Empty(scope.Sender.Sent);
        Assert.Equal("Interrupted", (await scope.Db.Set<WebNotificationAttempt>().AsNoTracking().SingleAsync(item => item.Id == lease)).Outcome);
    }

    [PostgreSqlReferenceFact]
    public async Task LegacyBriefRecoveryIsConsentScopedAndUnsubscribeCancelsQueuedSending()
    {
        await using var scope = await Scope.Create();
        var contact = await scope.Contact(false);
        await Assert.ThrowsAsync<WebsiteNotificationConflictException>(() => scope.Recovery.QueueLegacyBriefAsync(contact.Id, scope.Actor.Id, default));
        contact.SendBrochure = true;
        await scope.Db.SaveChangesAsync();
        await scope.Recovery.QueueLegacyBriefAsync(contact.Id, scope.Actor.Id, default);
        await Assert.ThrowsAsync<WebsiteNotificationConflictException>(() => scope.Recovery.QueueLegacyBriefAsync(contact.Id, scope.Actor.Id, default));
        var delivery = await scope.Db.Set<WebNotificationDelivery>().SingleAsync(item => item.WebContactId == contact.Id);
        contact.Unsubscribe(scope.Actor.Id, DateTimeOffset.UtcNow);
        await scope.Db.SaveChangesAsync();
        await scope.Dispatcher.ProcessNextAsync(default, delivery.Id);
        Assert.Equal(WebNotificationState.Cancelled, (await scope.Read(delivery.Id)).State);
        Assert.Empty(scope.Sender.Sent);
    }

    [PostgreSqlReferenceFact]
    public async Task CustomerCannotInspectOrRecoverWebsiteNotifications()
    {
        await using var scope = await Scope.Create();
        var controller = new WebsiteOperationsController(scope.Db, scope.Identity, scope.Recovery, new WebsiteNotificationProcessingService(scope.Db)) { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        Assert.Equal(403, (await Assert.ThrowsAsync<WebsiteOperationsAccessException>(() => controller.GetNotifications())).StatusCode);
        Assert.Equal(403, (await Assert.ThrowsAsync<WebsiteOperationsAccessException>(() => controller.GetNotificationSummary())).StatusCode);
        Assert.Equal(403, (await Assert.ThrowsAsync<WebsiteOperationsAccessException>(() => controller.ChangeNotificationProcessing(new(Guid.NewGuid(), true, "Incident")))).StatusCode);
        Assert.Equal(403, (await Assert.ThrowsAsync<WebsiteOperationsAccessException>(() => controller.RecoverLegacyTechnicalBrief(Guid.NewGuid(), default))).StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task PauseKeepsIntakeAndRecoveryQueuedWithoutConsumingAttemptsThenResumeSends()
    {
        await using var scope = await Scope.Create();
        var processing = new WebsiteNotificationProcessingService(scope.Db);
        var initial = await processing.ReadSummaryAsync();
        await processing.ChangeAsync(new(initial.Version, true, " Provider investigation "), scope.Actor.Id);
        var delivery = await scope.Enqueue();
        Assert.False(await scope.Dispatcher.ProcessNextAsync(default, delivery.Id));
        var held = await scope.Read(delivery.Id);
        Assert.Equal(WebNotificationState.Pending, held.State);
        Assert.Equal(0, held.AttemptCount);
        Assert.Empty(scope.Sender.Sent);
        Assert.False(await scope.Db.Set<WebNotificationAttempt>().AnyAsync(item => item.WebNotificationDeliveryId == delivery.Id));

        var legacy = await scope.Contact();
        await scope.Recovery.QueueLegacyBriefAsync(legacy.Id, scope.Actor.Id, default);
        Assert.Equal(WebNotificationState.Pending, (await scope.Db.Set<WebNotificationDelivery>().AsNoTracking().SingleAsync(item => item.WebContactId == legacy.Id)).State);
        var paused = await processing.ReadSummaryAsync();
        Assert.True(paused.IsPaused);
        Assert.Equal("Provider investigation", paused.Reason);
        Assert.Equal("Synthetic Reviewer", paused.UpdatedByName);
        Assert.NotNull(paused.UpdatedAtUtc);
        Assert.NotEqual(initial.Version, paused.Version);
        await processing.ChangeAsync(new(paused.Version, false, "Provider restored"), scope.Actor.Id);
        Assert.True(await scope.Dispatcher.ProcessNextAsync(default, delivery.Id));
        Assert.Equal(WebNotificationState.Accepted, (await scope.Read(delivery.Id)).State);
        Assert.Single(scope.Sender.Sent);
    }

    [PostgreSqlReferenceFact]
    public async Task ProcessingChangesRequireReasonCurrentVersionAndRetainActorAudit()
    {
        await using var scope = await Scope.Create();
        var processing = new WebsiteNotificationProcessingService(scope.Db);
        var initial = await processing.ReadSummaryAsync();
        await Assert.ThrowsAsync<WebsiteNotificationProcessingValidationException>(() => processing.ChangeAsync(new(initial.Version, true, "   "), scope.Actor.Id));
        await Assert.ThrowsAsync<WebsiteNotificationProcessingValidationException>(() => processing.ChangeAsync(new(initial.Version, true, new string('x', 501)), scope.Actor.Id));
        await processing.ChangeAsync(new(initial.Version, true, "Investigate outage"), scope.Actor.Id);
        await Assert.ThrowsAsync<WebsiteNotificationConflictException>(() => processing.ChangeAsync(new(initial.Version, false, "Stale request"), scope.Actor.Id));
        var paused = await processing.ReadSummaryAsync();
        await processing.ChangeAsync(new(paused.Version, false, "Provider verified"), scope.Actor.Id);
        var audit = await scope.Db.AuditEvents.Where(item => item.EntityName == nameof(WebNotificationProcessingControl) && item.ActorUserId == scope.Actor.Id).OrderBy(item => item.OccurredAt).ToListAsync();
        Assert.Equal(new[] { "ProcessingPaused", "ProcessingResumed" }, audit.Select(item => item.Operation));
        Assert.Contains("Investigate outage", audit[0].ChangesJson);
        Assert.Contains("Provider verified", audit[1].ChangesJson);
        Assert.False((await processing.ReadSummaryAsync()).IsPaused);
    }

    [PostgreSqlReferenceFact]
    public async Task SummaryAndAttentionFilterIncludeFailedAndExpiredWorkWhilePaused()
    {
        await using var scope = await Scope.Create();
        var organization = await scope.Db.Organizations.FirstOrDefaultAsync(item => item.Kind == OrganizationKind.Phaeno && item.IsActive);
        if (organization is null) { organization = new Organization("Synthetic Phaeno", OrganizationKind.Phaeno); scope.Db.Add(organization); }
        scope.Db.Add(new OrganizationMembership(scope.Actor.Id, organization.Id, isOrganizationAdmin: true));
        await scope.Db.SaveChangesAsync();
        var processing = new WebsiteNotificationProcessingService(scope.Db);
        var initial = await processing.ReadSummaryAsync();
        var queued = await scope.Enqueue();
        var failed = await scope.Enqueue();
        var expired = await scope.Enqueue();
        var sending = await scope.Enqueue();
        await scope.Db.Set<WebNotificationDelivery>().Where(item => item.Id == failed.Id).ExecuteUpdateAsync(update => update.SetProperty(item => item.State, WebNotificationState.Failed));
        await scope.Db.Set<WebNotificationDelivery>().Where(item => item.Id == expired.Id || item.Id == sending.Id).ExecuteUpdateAsync(update => update.SetProperty(item => item.State, WebNotificationState.Processing)
            .SetProperty(item => item.LeaseExpiresAtUtc, item => item.Id == expired.Id ? DateTimeOffset.UtcNow.AddMinutes(-1) : DateTimeOffset.UtcNow.AddMinutes(2)));
        await processing.ChangeAsync(new(initial.Version, true, "Review interrupted work"), scope.Actor.Id);
        var controller = new WebsiteOperationsController(scope.Db, scope.Identity, scope.Recovery, processing) { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        var summary = await controller.GetNotificationSummary();
        Assert.True(summary.IsPaused);
        Assert.Equal(initial.PendingCount + 1, summary.PendingCount);
        Assert.Equal(initial.ProcessingCount + 2, summary.ProcessingCount);
        Assert.Equal(initial.FailedCount + 1, summary.FailedCount);
        Assert.Equal(initial.ExpiredProcessingCount + 1, summary.ExpiredProcessingCount);
        Assert.NotNull(summary.OldestPendingAtUtc);
        var attention = await controller.GetNotifications(attentionOnly: true);
        Assert.Contains(attention.Items, item => item.Id == failed.Id);
        Assert.Contains(attention.Items, item => item.Id == expired.Id);
        Assert.True(attention.Items.Single(item => item.Id == expired.Id).IsProcessingExpired);
        Assert.False(attention.Items.Single(item => item.Id == failed.Id).IsProcessingExpired);
        Assert.DoesNotContain(attention.Items, item => item.Id == queued.Id || item.Id == sending.Id);
    }

    [PostgreSqlReferenceFact]
    public async Task RetiredIntakeCancelsQueuedAndFailedWorkAndExpiredFinalAttemptWithoutLosingHistory()
    {
        await using var scope = await Scope.Create();
        var organization = await scope.Db.Organizations.FirstOrDefaultAsync(item => item.Kind == OrganizationKind.Phaeno && item.IsActive);
        if (organization is null) { organization = new Organization("Synthetic Phaeno", OrganizationKind.Phaeno); scope.Db.Add(organization); }
        scope.Db.Add(new OrganizationMembership(scope.Actor.Id, organization.Id, isOrganizationAdmin: true));
        await scope.Db.SaveChangesAsync();
        var processing = new WebsiteNotificationProcessingService(scope.Db);
        var baseline = await processing.ReadSummaryAsync();
        var failed = await scope.Enqueue();
        var pending = new WebNotificationDelivery { WebContactId = failed.WebContactId, Kind = WebNotificationKind.MailingListAlert };
        var order = new WebOrder { Id = Guid.NewGuid(), FirstName = "Synthetic", LastName = "Contact", OrganizationName = "Fixture", Email = "order@example.test", Description = "Synthetic demo" };
        var failedOrder = new WebNotificationDelivery { WebOrderId = order.Id, Kind = WebNotificationKind.DemoRequestAlert, State = WebNotificationState.Failed };
        var interrupted = await scope.Enqueue();
        var attemptId = Guid.NewGuid();
        scope.Db.AddRange(pending, order, failedOrder,
            new WebNotificationAttempt { Id = attemptId, WebNotificationDeliveryId = interrupted.Id, AttemptNumber = 5, StartedAtUtc = DateTimeOffset.UtcNow.AddMinutes(-10) });
        await scope.Db.SaveChangesAsync();
        await scope.Db.Set<WebNotificationDelivery>().Where(item => item.Id == failed.Id).ExecuteUpdateAsync(update => update.SetProperty(item => item.State, WebNotificationState.Failed));
        await scope.Db.Set<WebNotificationDelivery>().Where(item => item.Id == interrupted.Id).ExecuteUpdateAsync(update => update
            .SetProperty(item => item.State, WebNotificationState.Processing).SetProperty(item => item.AttemptCount, 5).SetProperty(item => item.AttemptsSinceRecovery, 5)
            .SetProperty(item => item.LeaseToken, attemptId).SetProperty(item => item.LeaseExpiresAtUtc, DateTimeOffset.UtcNow.AddMinutes(-1)));
        var controller = new WebsiteOperationsController(scope.Db, scope.Identity, scope.Recovery, processing) { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        await controller.UnsubscribeMailingListContact(failed.WebContactId!.Value, default);
        await controller.CompleteDemoRequest(order.Id, default);
        await controller.UnsubscribeMailingListContact(interrupted.WebContactId!.Value, default);
        Assert.Equal(WebNotificationState.Cancelled, (await scope.Read(failed.Id)).State);
        Assert.Equal(WebNotificationState.Cancelled, (await scope.Read(pending.Id)).State);
        Assert.Equal(WebNotificationState.Cancelled, (await scope.Read(failedOrder.Id)).State);
        Assert.Equal(WebNotificationState.Processing, (await scope.Read(interrupted.Id)).State);
        Assert.True(await scope.Dispatcher.ProcessNextAsync(default, interrupted.Id));
        Assert.Equal(WebNotificationState.Cancelled, (await scope.Read(interrupted.Id)).State);
        Assert.Equal("Interrupted", (await scope.Db.Set<WebNotificationAttempt>().AsNoTracking().SingleAsync(item => item.Id == attemptId)).Outcome);
        Assert.Empty(scope.Sender.Sent);
        var summary = await processing.ReadSummaryAsync();
        Assert.Equal(baseline.FailedCount, summary.FailedCount);
        Assert.Equal(baseline.ExpiredProcessingCount, summary.ExpiredProcessingCount);
        Assert.True(await scope.Db.AuditEvents.AnyAsync(item => item.EntityId == failed.WebContactId.ToString()));
    }

    [PostgreSqlReferenceFact]
    public async Task InFlightProviderFailureAfterUnsubscribeCancelsWorkButRetainsFailedAttempt()
    {
        await using var scope = await Scope.Create();
        var delivery = await scope.Enqueue();
        scope.Sender.OnSend = async () =>
        {
            var contact = await scope.Db.WebContacts.SingleAsync(item => item.Id == delivery.WebContactId);
            contact.Unsubscribe(scope.Actor.Id, DateTimeOffset.UtcNow);
            await scope.Db.SaveChangesAsync();
        };
        scope.Sender.Fail = true;
        Assert.True(await scope.Dispatcher.ProcessNextAsync(default, delivery.Id));
        var cancelled = await scope.Read(delivery.Id);
        Assert.Equal(WebNotificationState.Cancelled, cancelled.State);
        Assert.Null(cancelled.LastError);
        Assert.False(await scope.Dispatcher.ProcessNextAsync(default, delivery.Id));
        var attempt = await scope.Db.Set<WebNotificationAttempt>().AsNoTracking().SingleAsync(item => item.WebNotificationDeliveryId == delivery.Id);
        Assert.Equal("Failed", attempt.Outcome);
        Assert.NotNull(attempt.Error);
        Assert.Empty(scope.Sender.Sent);
    }

    private sealed class Scope(PSeqOperationsDbContext db, IDbContextTransaction transaction) : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db => db;
        public User Actor { get; private set; } = null!;
        public IExternalIdentityContext Identity { get; private set; } = null!;
        public Sender Sender { get; } = new();
        public WebsiteNotificationDispatcher Dispatcher => new(db, Sender, NullLogger<WebsiteNotificationDispatcher>.Instance);
        public WebsiteNotificationRecoveryService Recovery => new(db);
        public static async Task<Scope> Create()
        {
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
                .UseNpgsql(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options;
            var db = new PSeqOperationsDbContext(options, Options.Create(new PersistenceOptions()));
            var scope = new Scope(db, await db.Database.BeginTransactionAsync());
            var identity = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"website-{Guid.NewGuid():N}@example.test", true);
            scope.Actor = new(identity.Email, "Synthetic", "Reviewer");
            scope.Actor.LinkExternalIdentity(identity.Provider, identity.SubjectId);
            scope.Actor.Activate();
            scope.Identity = new IdentityContext(identity);
            db.Add(scope.Actor);
            await db.SaveChangesAsync();
            return scope;
        }
        public async Task<WebContact> Contact(bool brief = true)
        {
            var email = $"website-{Guid.NewGuid():N}@example.test";
            var contact = new WebContact { Id = Guid.NewGuid(), FirstName = "Ada", LastName = "Example", OrganizationName = "Synthetic", Email = email, NormalizedEmail = email.ToUpperInvariant(), SendBrochure = brief, CreatedAtUtc = DateTimeOffset.UtcNow };
            db.Add(contact);
            await db.SaveChangesAsync();
            return contact;
        }
        public async Task<WebNotificationDelivery> Enqueue()
        {
            var contact = await Contact();
            var delivery = new WebNotificationDelivery { WebContactId = contact.Id, Kind = WebNotificationKind.TechnicalBrief };
            db.Add(delivery);
            await db.SaveChangesAsync();
            return delivery;
        }
        public Task Ready(Guid id) => db.Set<WebNotificationDelivery>().Where(item => item.Id == id).ExecuteUpdateAsync(update => update.SetProperty(item => item.NextAttemptAtUtc, DateTimeOffset.UtcNow.AddMinutes(-1)));
        public Task<WebNotificationDelivery> Read(Guid id) => db.Set<WebNotificationDelivery>().AsNoTracking().SingleAsync(item => item.Id == id);
        public async ValueTask DisposeAsync() { await transaction.RollbackAsync(); await transaction.DisposeAsync(); await db.DisposeAsync(); }
    }
    private sealed class Sender : IWebsiteNotificationSender
    {
        public bool Fail { get; set; }
        public Func<Task>? OnSend { get; set; }
        public List<Guid> Sent { get; } = [];
        private async Task Send(Guid id) { if (OnSend is not null) await OnSend(); if (Fail) throw new HttpRequestException("Synthetic failure"); Sent.Add(id); }
        public Task SendContactAsync(WebContact contact, CancellationToken token) => Send(contact.Id);
        public Task SendTechnicalBriefAsync(WebContact contact, CancellationToken token) => Send(contact.Id);
        public Task SendOrderAsync(WebOrder order, CancellationToken token) => Send(order.Id);
    }
    private sealed class Recaptcha : IWebsiteRecaptchaVerifier
    { public Task<bool> VerifyAsync(string code, string action, CancellationToken token = default) => Task.FromResult(true); }
    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext
    { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class AuditContext : ICurrentUserContext
    { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "website-notification-test"; }
}

public sealed class WebsiteNotificationSenderTests
{
    [Fact]
    public async Task MailgunFailurePropagatesToDurableDispatcher()
    {
        using var client = new HttpClient(new FailureHandler());
        var sender = new MailgunWebsiteNotificationSender(client,
            Options.Create(new WebsiteEmailOptions { Url = "https://email.example.test", Resource = "messages", ApiKey = "synthetic", AccountTo = "staff@example.test", AccountFrom = "noreply@example.test" }),
            Options.Create(new WebsiteApiOptions()), NullLogger<MailgunWebsiteNotificationSender>.Instance);
        await Assert.ThrowsAsync<HttpRequestException>(() => sender.SendTechnicalBriefAsync(new WebContact { Email = "synthetic@example.test", FirstName = "Ada", LastName = "Example" }));
    }
    private sealed class FailureHandler : HttpMessageHandler
    { protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)); }
}
