namespace PhaenoPortal.Test;

using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Features.Website.Notifications;
using PhaenoPortal.App.Features.Website.Services;
using Xunit.Abstractions;

public sealed partial class WebsiteNotificationPostgresTests(ITestOutputHelper output)
{
    [PostgreSqlReferenceFact]
    public async Task RejectedCaptchaRetainsNoIntakeAndDemoRetryCreatesOnlyWebsiteIntent()
    {
        await using var scope = await Scope.Create();
        var captcha = new AcceptanceCaptcha();
        var service = new WebsiteService(scope.Db, captcha);
        var email = $"web-acceptance-{Guid.NewGuid():N}@example.test";
        var signup = new WebContactRequest { WebContact = new() { FirstName = "Simulated", LastName = "Prospect", OrganizationName = "TEST ONLY", Email = email, SendBrochure = false }, RecaptchaCode = "simulated-token", RecaptchaAction = "contact_form_submit" };
        var demo = new WebOrderRequest { WebOrder = new() { FirstName = "Simulated", LastName = "Prospect", OrganizationName = "TEST ONLY", Email = email, Description = "SIMULATED non-binding demo inquiry" }, RecaptchaCode = "simulated-token", RecaptchaAction = "order_form_submit" };
        var before = await Counts();
        await Assert.ThrowsAsync<WebsiteRecaptchaRejectedException>(() => service.CreateContactAsync(signup));
        await Assert.ThrowsAsync<WebsiteRecaptchaRejectedException>(() => service.CreateOrderAsync(demo));
        Assert.Equal(before, await Counts());
        Assert.False(await scope.Db.WebContacts.AnyAsync(item => item.NormalizedEmail == email.ToUpperInvariant()));
        Assert.False(await scope.Db.WebOrders.AnyAsync(item => item.Email == email.ToUpperInvariant()));
        captcha.Accept = true;
        await service.CreateContactAsync(signup);
        var contact = await scope.Db.WebContacts.SingleAsync(item => item.NormalizedEmail == email.ToUpperInvariant());
        var signupNotice = Assert.Single(await scope.Db.Set<WebNotificationDelivery>().Where(item => item.WebContactId == contact.Id).ToListAsync());
        Assert.Equal(WebNotificationKind.MailingListAlert, signupNotice.Kind);
        Assert.Equal(WebNotificationState.Pending, signupNotice.State);
        await service.CreateOrderAsync(demo);
        var savedDemo = await scope.Db.WebOrders.SingleAsync(item => item.Email == email.ToUpperInvariant());
        var demoNotice = Assert.Single(await scope.Db.Set<WebNotificationDelivery>().Where(item => item.WebOrderId == savedDemo.Id).ToListAsync());
        Assert.Equal(WebNotificationKind.DemoRequestAlert, demoNotice.Kind);
        Assert.Equal(WebNotificationState.Pending, demoNotice.State);
        Assert.Equal(before, await Counts());
        Assert.Empty(scope.Sender.Sent);
        Assert.Equal(new[] { "contact_form_submit", "order_form_submit", "contact_form_submit", "order_form_submit" }, captcha.Actions);

        async Task<int[]> Counts() => [await scope.Db.Users.CountAsync(), await scope.Db.Organizations.CountAsync(), await scope.Db.LabServiceOrders.CountAsync(), await scope.Db.PartnerReagentOrders.CountAsync(), await scope.Db.Invoices.CountAsync(), await scope.Db.OrganizationServiceEntitlements.CountAsync()];
    }

    [PostgreSqlReferenceFact]
    public async Task SimulatedMailgunRecoveryKeepsFiveFailuresAndSeparatesProviderAcceptanceFromInboxReceipt()
    {
        await using var scope = await Scope.Create();
        var delivery = await scope.Enqueue();
        var contact = await scope.Db.WebContacts.AsNoTracking().SingleAsync(item => item.Id == delivery.WebContactId);
        const string documentUrl = "https://www.phaenobiotech.com/technical-brief-C660184C-47D0-45AA-872F-8B3538F17BE5/PSeq-Technical-Brief.AD6548E7-F66A-429A-B0F6-A63988935D68.pdf";
        using var transport = new SimulatedMailTransport();
        using var client = new HttpClient(transport);
        var sender = new MailgunWebsiteNotificationSender(client,
            Options.Create(new WebsiteEmailOptions { Url = "https://email.example.test", Resource = "messages", ApiKey = "synthetic", AccountFrom = "noreply@example.test", AccountTo = "staff@example.test" }),
            Options.Create(new WebsiteApiOptions { TechnicalBriefUrl = documentUrl }), NullLogger<MailgunWebsiteNotificationSender>.Instance);
        var dispatcher = new WebsiteNotificationDispatcher(scope.Db, sender, NullLogger<WebsiteNotificationDispatcher>.Instance);
        for (var index = 0; index < WebsiteNotificationDispatcher.MaximumAttempts; index++)
        {
            await scope.Ready(delivery.Id);
            Assert.True(await dispatcher.ProcessNextAsync(default, delivery.Id));
        }
        var failed = await scope.Read(delivery.Id);
        Assert.Equal(WebNotificationState.Failed, failed.State);
        Assert.Null(failed.AcceptedAtUtc);
        Assert.False(await dispatcher.ProcessNextAsync(default, delivery.Id));
        Assert.Equal(5, transport.Requests.Count);
        Assert.True(await scope.Db.WebContacts.AnyAsync(item => item.Id == contact.Id));
        await scope.Db.Set<WebNotificationDelivery>().Where(item => item.Id == delivery.Id).ExecuteUpdateAsync(update => update.SetProperty(item => item.LastAttemptAtUtc, DateTimeOffset.UtcNow.AddMinutes(-10)));
        transport.Fail = false;
        await scope.Recovery.QueueRecoveryAsync(delivery.Id, failed.Version, scope.Actor.Id, default);
        Assert.True(await dispatcher.ProcessNextAsync(default, delivery.Id));
        var accepted = await scope.Read(delivery.Id);
        Assert.Equal(WebNotificationState.Accepted, accepted.State);
        Assert.NotNull(accepted.AcceptedAtUtc);
        Assert.Empty(transport.Inbox);
        var attempts = await scope.Db.Set<WebNotificationAttempt>().AsNoTracking().Where(item => item.WebNotificationDeliveryId == delivery.Id).OrderBy(item => item.AttemptNumber).ToListAsync();
        Assert.Equal(6, attempts.Count);
        Assert.All(attempts.Take(5), item => Assert.Equal("Failed", item.Outcome));
        Assert.Equal("Accepted", attempts[5].Outcome);
        Assert.Equal(scope.Actor.Id, attempts[5].RecoveryByUserId);
        Assert.True(await scope.Db.AuditEvents.AnyAsync(item => item.EntityId == delivery.Id.ToString() && item.Operation == "ResendQueued" && item.ActorUserId == scope.Actor.Id));
        var message = transport.Requests.Last();
        Assert.Equal("fulfill-web-technical-brief-request", message["template"]);
        Assert.Equal($"Ada Example <{contact.Email}>", message["to"]);
        Assert.Equal(documentUrl, message["v:technicalBriefPath"]);
        Assert.Equal("no", message["o:tracking-clicks"]);
        transport.DeliverAcceptedMessage();
        var receipt = Assert.Single(transport.Inbox);
        Assert.True(receipt.ReceivedAtUtc >= accepted.AcceptedAtUtc);
        Assert.Equal(documentUrl, receipt.DocumentUrl);
        Assert.Equal(message["to"], receipt.Recipient);
        Assert.Single(await scope.Db.Set<WebNotificationDelivery>().Where(item => item.WebContactId == contact.Id).ToListAsync());
        output.WriteLine(JsonSerializer.Serialize(new { Mode = "SIMULATED provider and destination inbox; actual Mailgun template is not rendered", DeliveryId = delivery.Id, ProviderAcceptedAtUtc = transport.ProviderAcceptedAtUtc, SavedAcceptedAtUtc = accepted.AcceptedAtUtc, Receipt = receipt, RetainedFailedAttempts = 5 }));
    }

    [PostgreSqlReferenceFact]
    public async Task InactiveLegacyContactCannotQueueBriefAndActiveOptedInRecoveryRetainsActor()
    {
        await using var scope = await Scope.Create();
        var inactive = await scope.Contact();
        inactive.Unsubscribe(scope.Actor.Id, DateTimeOffset.UtcNow);
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<WebsiteNotificationConflictException>(() => scope.Recovery.QueueLegacyBriefAsync(inactive.Id, scope.Actor.Id, default));
        Assert.False(await scope.Db.Set<WebNotificationDelivery>().AnyAsync(item => item.WebContactId == inactive.Id));
        var active = await scope.Contact();
        await scope.Recovery.QueueLegacyBriefAsync(active.Id, scope.Actor.Id, default);
        var delivery = await scope.Db.Set<WebNotificationDelivery>().AsNoTracking().SingleAsync(item => item.WebContactId == active.Id);
        Assert.Equal(WebNotificationState.Pending, delivery.State);
        Assert.Equal(scope.Actor.Id, delivery.LastRecoveryByUserId);
        Assert.True(await scope.Db.AuditEvents.AnyAsync(item => item.EntityId == delivery.Id.ToString() && item.Operation == "LegacyBriefQueued" && item.ActorUserId == scope.Actor.Id));
    }

    private sealed class AcceptanceCaptcha : IWebsiteRecaptchaVerifier
    {
        public bool Accept { get; set; }
        public List<string> Actions { get; } = [];
        public Task<bool> VerifyAsync(string code, string action, CancellationToken token = default) { Actions.Add(action); return Task.FromResult(Accept); }
    }

    private sealed record SimulatedInboxReceipt(string Recipient, string DocumentUrl, DateTimeOffset ReceivedAtUtc);
    private sealed class SimulatedMailTransport : HttpMessageHandler
    {
        public bool Fail { get; set; } = true;
        public List<Dictionary<string, string>> Requests { get; } = [];
        public List<SimulatedInboxReceipt> Inbox { get; } = [];
        public DateTimeOffset? ProviderAcceptedAtUtc { get; private set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Assert.Equal("email.example.test", request.RequestUri!.Host);
            Requests.Add(QueryHelpers.ParseQuery(await request.Content!.ReadAsStringAsync(token)).ToDictionary(item => item.Key, item => item.Value.ToString()));
            if (Fail) return new(HttpStatusCode.ServiceUnavailable);
            ProviderAcceptedAtUtc = DateTimeOffset.UtcNow;
            return new(HttpStatusCode.OK) { Content = new StringContent("{\"id\":\"simulated-message\",\"message\":\"Queued\"}") };
        }
        public void DeliverAcceptedMessage()
        {
            Assert.NotNull(ProviderAcceptedAtUtc);
            var accepted = Requests.Last();
            Inbox.Add(new(accepted["to"], accepted["v:technicalBriefPath"], DateTimeOffset.UtcNow));
        }
    }
}
