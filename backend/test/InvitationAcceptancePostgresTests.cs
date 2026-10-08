namespace PhaenoPortal.Test;

using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Features.Website;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed partial class InvitationAcceptancePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ContactInvitationQueuesWithoutAccessThenVerifiedAcceptancePersistsOnlyResearchAndRejectsReplay()
    {
        await using var scope = await Scope.Create();
        var contact = await scope.Contact();
        Assert.False(await scope.Db.Users.AnyAsync(item => item.NormalizedEmail == contact.NormalizedEmail));
        Assert.False(await scope.Db.CrmContactUserLinks.AnyAsync(item => item.ContactId == contact.Id));
        var invitation = await scope.Invite(contact);
        Assert.Equal(InvitationStatus.Pending, invitation.Status);
        Assert.Equal(InvitationDeliveryState.Queued, invitation.DeliveryStatus);
        Assert.False(invitation.IsOrganizationAdmin);
        Assert.Equal(scope.Research.Id, Assert.Single(invitation.Departments).DepartmentId);
        Assert.False(await scope.Db.Users.AnyAsync(item => item.NormalizedEmail == contact.NormalizedEmail));
        var token = await scope.Token(invitation.Id);
        var preview = Assert.IsType<Ok<InvitationPreviewDto>>(await InvitationEndpoints.PreviewInvitation(new(token), new DefaultHttpContext(), scope.Db, scope.Tokens, default));
        Assert.Equal(contact.Email, preview.Value!.Email);
        await scope.Dispatch();
        var sent = Assert.Single(scope.Transport.Messages);
        Assert.Equal(contact.Email, sent["to"]);
        Assert.Contains("SIMULATED Company", sent["subject"]);
        Assert.Contains("/accept-invite?token=", sent["text"]);
        var pending = Assert.Single(await scope.List());
        Assert.Equal(InvitationStatus.Pending, pending.Status);
        Assert.Equal(InvitationDeliveryState.Accepted, pending.DeliveryStatus);
        Assert.Null(pending.AcceptedAt);
        Assert.Empty((await scope.Session(scope.Invited(contact))).Memberships);
        await Assert.ThrowsAsync<BadRequestException>(() => scope.Accept(token, Scope.Identity("wrong@example.test")));
        await Assert.ThrowsAsync<BadRequestException>(() => scope.Accept(token, scope.Invited(contact) with { IsEmailVerified = false }));
        Assert.False(await scope.Db.Users.AnyAsync(item => item.NormalizedEmail == contact.NormalizedEmail));
        var identity = scope.Invited(contact);
        var accepted = await scope.Accept(token, identity);
        Assert.Equal(InvitationStatus.Accepted, accepted.Status);
        scope.Db.ChangeTracker.Clear();
        var user = await scope.Db.Users.SingleAsync(item => item.NormalizedEmail == contact.NormalizedEmail);
        var membership = await scope.Db.OrganizationMemberships.SingleAsync(item => item.UserId == user.Id);
        Assert.True(membership.IsActive);
        Assert.False(membership.IsOrganizationAdmin);
        var assignment = Assert.Single(await scope.Db.OrganizationDepartmentMemberships.Where(item => item.OrganizationMembershipId == membership.Id && item.IsActive).ToListAsync());
        Assert.Equal(scope.Research.Id, assignment.DepartmentId);
        Assert.False(assignment.IsDepartmentAdmin);
        Assert.Equal(user.Id, (await scope.Db.CrmContactUserLinks.SingleAsync(item => item.ContactId == contact.Id)).UserId);
        var session = await scope.Session(identity);
        Assert.Equal("ready", session.State);
        Assert.Equal(scope.Research.Id, session.SelectedDepartment!.DepartmentId);
        Assert.Equal("Research", Assert.Single(Assert.Single(session.Memberships).Departments).DepartmentName);
        Assert.False(session.IsPlatformAdmin);
        Assert.False(session.Capabilities.CanManageAllUsers);
        Assert.False(session.Capabilities.CanInviteUsers);
        await Assert.ThrowsAsync<BadRequestException>(() => scope.Accept(token, identity));
        Assert.Single(await scope.Db.Users.Where(item => item.NormalizedEmail == contact.NormalizedEmail).ToListAsync());
        Assert.Single(await scope.Db.OrganizationMemberships.Where(item => item.UserId == user.Id).ToListAsync());
        Assert.Single(await scope.Db.AuditEvents.Where(item => item.EntityId == invitation.Id.ToString() && item.Operation == AccountAudit.InviteAccepted).ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task ResendRotatesLinkAndEnforcesCooldownWhilePreservingCurrentDepartmentIntent()
    {
        await using var scope = await Scope.Create();
        var contact = await scope.Contact();
        var original = await scope.Invite(contact);
        var oldToken = await scope.Token(original.Id);
        await Assert.ThrowsAsync<BadRequestException>(() => scope.Resend(original.Id));
        await scope.Dispatch();
        await scope.AgeDelivery(original.Id);
        var resent = await scope.Resend(original.Id);
        Assert.Equal(original.Id, resent.Id);
        Assert.Equal(scope.Research.Id, Assert.Single(resent.Departments).DepartmentId);
        var currentToken = await scope.Token(original.Id);
        Assert.True(oldToken != currentToken);
        await Assert.ThrowsAsync<BadRequestException>(() => scope.Accept(oldToken, scope.Invited(contact)));
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.PreviewInvitation(new(oldToken), new DefaultHttpContext(), scope.Db, scope.Tokens, default));
        await Assert.ThrowsAsync<BadRequestException>(() => scope.Resend(original.Id));
        Assert.Equal(2, await scope.Db.InvitationDeliveryAttempts.CountAsync());
        await scope.Dispatch();
        Assert.Equal(2, scope.Transport.Messages.Count);
        Assert.Equal(InvitationStatus.Accepted, (await scope.Accept(currentToken, scope.Invited(contact))).Status);
        Assert.Single(await scope.Db.OrganizationInvitations.ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task RevokedExpiredDeclinedAndChangedDepartmentLinksNeverCreateMemberships()
    {
        await using var scope = await Scope.Create();
        var rows = new List<(CrmContact Contact, InvitationDto Invitation, string Token)>();
        for (var index = 0; index < 4; index++)
        {
            var contact = await scope.Contact(); var invitation = await scope.Invite(contact);
            rows.Add((contact, invitation, await scope.Token(invitation.Id)));
        }
        var revoked = rows[0];
        await InvitationEndpoints.RevokeInvitation(revoked.Invitation.Id, scope.Http, scope.Db, scope.AdminIdentity, default);
        await AssertDenied(revoked);
        scope.Db.ChangeTracker.Clear();
        var expired = await scope.Db.OrganizationInvitations.SingleAsync(item => item.Id == rows[1].Invitation.Id);
        scope.Db.Entry(expired).Property(item => item.ExpiresAt).CurrentValue = DateTime.UtcNow.AddMinutes(-1);
        await scope.Db.SaveChangesAsync(); await AssertDenied(rows[1]);
        var declined = rows[2];
        await InvitationEndpoints.DeclineInvitation(new() { Token = declined.Token }, scope.Http, scope.Db, scope.Tokens, new IdentityContext(scope.Invited(declined.Contact)), new VerifiedEmail(), default);
        await AssertDenied(declined);
        scope.Db.ChangeTracker.Clear();
        (await scope.Db.OrganizationDepartments.SingleAsync(item => item.Id == scope.Research.Id)).Deactivate();
        await scope.Db.SaveChangesAsync();
        await AssertDenied(rows[3]);
        await Assert.ThrowsAsync<BadRequestException>(() => scope.Resend(rows[3].Invitation.Id));
        var listed = await scope.List();
        Assert.Equal(InvitationStatus.Revoked, listed.Single(item => item.Id == revoked.Invitation.Id).Status);
        Assert.True(listed.Single(item => item.Id == rows[1].Invitation.Id).IsExpired);
        Assert.Equal(InvitationStatus.Declined, listed.Single(item => item.Id == declined.Invitation.Id).Status);
        Assert.Equal(2, await scope.Db.AuditEvents.CountAsync(item => item.Operation == AccountAudit.InviteRevoked || item.Operation == AccountAudit.InviteDeclined));
        Assert.Equal(1, await scope.Db.Users.CountAsync());
        Assert.Equal(1, await scope.Db.OrganizationMemberships.CountAsync());
        Assert.Empty(await scope.Db.OrganizationDepartmentMemberships.ToListAsync());
        foreach (var row in rows.Skip(1).Where(item => item.Invitation.Id != declined.Invitation.Id))
            await InvitationEndpoints.RevokeInvitation(row.Invitation.Id, scope.Http, scope.Db, scope.AdminIdentity, default);

        async Task AssertDenied((CrmContact Contact, InvitationDto Invitation, string Token) row) =>
            await Assert.ThrowsAsync<BadRequestException>(() => scope.Accept(row.Token, scope.Invited(row.Contact)));
    }

    [PostgreSqlReferenceFact]
    public async Task SignedHardBounceIsIdempotentAndRevokeReissueActivatesOnlyCorrectedContact()
    {
        await using var scope = await Scope.Create();
        var contact = await scope.Contact(); var original = await scope.Invite(contact); var token = await scope.Token(original.Id);
        await scope.Dispatch();
        var delivery = await scope.Db.InvitationDeliveryAttempts.SingleAsync();
        const string signingKey = "SIMULATED-webhook-key";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        const string webhookToken = "SIMULATED-webhook-token";
        var signature = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(signingKey), Encoding.UTF8.GetBytes(timestamp + webhookToken)));
        var payload = JsonSerializer.SerializeToElement(new Dictionary<string, object> {
            ["signature"] = new { timestamp, token = webhookToken, signature },
            ["event-data"] = new Dictionary<string, object> { ["id"] = "SIMULATED-hard-bounce", ["event"] = "failed", ["severity"] = "permanent", ["timestamp"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(), ["message"] = new { headers = new Dictionary<string, string> { ["message-id"] = delivery.ProviderMessageId! } }, ["delivery-status"] = new { description = "SIMULATED invalid destination" } }
        });
        var controller = new MailgunInvitationWebhookController(scope.Db, new(Options.Create(new WebsiteEmailOptions { WebhookSigningKey = signingKey })));
        Assert.IsType<OkResult>(await controller.Receive(payload, default));
        Assert.IsType<OkResult>(await controller.Receive(payload, default));
        Assert.Single(await scope.Db.InvitationDeliveryWebhookEvents.ToListAsync());
        var bounced = Assert.Single(await scope.List());
        Assert.True(bounced.HasHardBounce);
        Assert.Equal(InvitationDeliveryState.Bounced, bounced.DeliveryStatus);
        Assert.Equal(InvitationStatus.Pending, bounced.Status);
        Assert.Null(bounced.AcceptedAt);
        Assert.False(await scope.Db.CrmContactUserLinks.AnyAsync());
        await InvitationEndpoints.RevokeInvitation(original.Id, scope.Http, scope.Db, scope.AdminIdentity, default);
        await Assert.ThrowsAsync<BadRequestException>(() => scope.Accept(token, scope.Invited(contact)));
        var corrected = await scope.Contact(); var reissued = await scope.Invite(corrected);
        Assert.NotEqual(original.Id, reissued.Id);
        await scope.Dispatch();
        await scope.Accept(await scope.Token(reissued.Id), scope.Invited(corrected));
        Assert.False(await scope.Db.Users.AnyAsync(item => item.NormalizedEmail == contact.NormalizedEmail));
        Assert.True(await scope.Db.Users.AnyAsync(item => item.NormalizedEmail == corrected.NormalizedEmail));
        Assert.Equal(InvitationStatus.Revoked, (await scope.List()).Single(item => item.Id == original.Id).Status);
    }

    private sealed class Scope : IAsyncDisposable
    {
        private readonly NpgsqlConnection admin;
        private readonly string databaseName;
        private readonly DbContextOptions<PSeqOperationsDbContext> options;
        private readonly HttpClient client;
        public PSeqOperationsDbContext Db { get; }
        public DefaultHttpContext Http { get; } = new();
        public InvitationTokenService Tokens { get; } = new();
        public IInvitationDeliveryPayloadProtector Protector { get; } = new InvitationDeliveryPayloadProtector(new EphemeralDataProtectionProvider());
        public CaptureTransport Transport { get; } = new();
        public IInvitationEmailSender Sender { get; }
        public Organization Organization { get; } = new("SIMULATED Company", OrganizationKind.Customer);
        public OrganizationDepartment Research { get; private set; } = null!;
        private CrmCompany Company { get; set; } = null!;
        private User Actor { get; set; } = null!;
        public IdentityContext AdminIdentity { get; } = new(Identity("admin@example.test"));
        private static readonly IOptions<InvitationOptions> InviteOptions = Options.Create(new InvitationOptions { PublicBaseUrl = "https://portal.example.test", ResendCooldownMinutes = 5 });
        private static readonly IOptions<PSeqOrderToCashOptions> Features = Options.Create(new PSeqOrderToCashOptions { InvitationDelivery = true });
        private Scope(NpgsqlConnection admin, string name, DbContextOptions<PSeqOperationsDbContext> options)
        {
            this.admin = admin; databaseName = name; this.options = options;
            Db = NewDb(); client = new HttpClient(Transport);
            Sender = new MailgunInvitationEmailSender(client, Options.Create(new WebsiteEmailOptions { Url = "https://email.example.test", Resource = "messages", ApiKey = "synthetic", AccountFrom = "invites@example.test" }), new InvitationEmailTemplateRenderer());
        }
        private PSeqOperationsDbContext NewDb() => new(options, Options.Create(new PersistenceOptions()));
        public static async Task<Scope> Create()
        {
            var source = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!);
            if (source.Host is not ("localhost" or "127.0.0.1") || (source.Database is not ("phaeno_ops" or "phaeno_ops_lab06_uat") && source.Database?.StartsWith("phaeno_release_verification_", StringComparison.Ordinal) != true))
                throw new InvalidOperationException("Invitation acceptance requires a known loopback source and a disposable database.");
            var name = "pseq_invite_test_" + Guid.NewGuid().ToString("N");
            var admin = new NpgsqlConnection(source.ConnectionString); await admin.OpenAsync();
            await using (var create = new NpgsqlCommand($"CREATE DATABASE {name}", admin)) await create.ExecuteNonQueryAsync();
            source.Database = name; source.Pooling = false;
            var scope = new Scope(admin, name, new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(source.ConnectionString).AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options);
            try
            {
                await scope.Db.Database.MigrateAsync();
                var identity = scope.AdminIdentity.Read(scope.Http)!;
                scope.Actor = new(identity.Email, "SIMULATED", "Administrator"); scope.Actor.Activate(); scope.Actor.LinkExternalIdentity(identity.Provider, identity.SubjectId);
                scope.Research = new(scope.Organization.Id, "RESEARCH", "Research");
                scope.Company = new("SIMULATED Company", scope.Actor.Id); scope.Company.EnablePortalAccess(scope.Organization.Id);
                var staff = new Organization("SIMULATED Phaeno", OrganizationKind.Phaeno);
                scope.Db.AddRange(scope.Actor, staff, scope.Organization, scope.Research, scope.Company, new OrganizationMembership(scope.Actor.Id, staff.Id, true));
                await scope.Db.SaveChangesAsync();
                Assert.True(AccountAuthorization.IsPlatformAdmin((await AccountAccess.ReadActiveActorAsync(scope.Http, scope.Db, scope.AdminIdentity, default))!));
                return scope;
            }
            catch { await scope.DisposeAsync(); throw; }
        }
        public async Task<CrmContact> Contact()
        {
            var contact = new CrmContact("SIMULATED", "Invitee", Actor.Id, $"invite-{Guid.NewGuid():N}@example.test");
            Db.AddRange(contact, new CrmCompanyContact(Company.Id, contact.Id, "Researcher", null, true, DateOnly.FromDateTime(DateTime.UtcNow)));
            await Db.SaveChangesAsync(); return contact;
        }
        public async Task<InvitationDto> Invite(CrmContact contact, bool linkContact = true, bool organizationAdmin = false) => Assert.IsType<Created<InvitationDto>>(await InvitationEndpoints.CreateInvitation(
            new() { OrganizationId = Organization.Id, IsOrganizationAdmin = organizationAdmin, FirstName = contact.FirstName, LastName = contact.LastName, Email = contact.Email!, CrmContactId = linkContact ? contact.Id : null, Departments = [new(Research.Id, false)] }, Http, Db, Tokens, Sender, Protector, AdminIdentity, InviteOptions, Features, default)).Value!;
        public async Task<string> Token(Guid id)
        {
            var attempt = await Db.InvitationDeliveryAttempts.AsNoTracking().Where(item => item.OrganizationInvitationId == id).OrderByDescending(item => item.QueuedAtUtc).FirstAsync();
            return QueryHelpers.ParseQuery(new Uri(Protector.Unprotect(attempt.ProtectedPayload).InviteUrl).Query)["token"].ToString();
        }
        public ExternalIdentity Invited(CrmContact contact) => new("test", contact.Id.ToString("N"), contact.Email!, true);
        public static ExternalIdentity Identity(string email) => new("test", Guid.NewGuid().ToString("N"), email, true);
        public async Task<InvitationDto> Accept(string token, ExternalIdentity identity) => Assert.IsType<Ok<InvitationDto>>(await InvitationEndpoints.AcceptInvitation(new() { Token = token }, Http, Db, Tokens, new IdentityContext(identity), new VerifiedEmail(), default)).Value!;
        public async Task<InvitationDto> Resend(Guid id) => Assert.IsType<Ok<InvitationDto>>(await InvitationEndpoints.ResendInvitation(id, Http, Db, Tokens, Sender, Protector, AdminIdentity, InviteOptions, Features, default)).Value!;
        public async Task<List<InvitationDto>> List()
        {
            Db.ChangeTracker.Clear();
            var items = new List<InvitationDto>();
            foreach (var status in new[] { InvitationStatus.Pending, InvitationStatus.Accepted, InvitationStatus.Revoked, InvitationStatus.Declined })
            {
                var result = await InvitationEndpoints.ListInvitations(Http, Db, AdminIdentity, Organization.Id, status, true, default);
                items.AddRange(Assert.IsAssignableFrom<IEnumerable<InvitationDto>>(((IValueHttpResult)result).Value));
            }
            return items;
        }
        public async Task<SessionDto> Session(ExternalIdentity identity, Guid? organizationId = null, Guid? departmentId = null)
        {
            Db.ChangeTracker.Clear(); var http = new DefaultHttpContext(); http.Request.Headers["X-Organization-Id"] = (organizationId ?? Organization.Id).ToString(); http.Request.Headers["X-Department-Id"] = (departmentId ?? Research.Id).ToString();
            return Assert.IsType<Ok<SessionDto>>(await SessionEndpoints.GetSession(http, Db, new IdentityContext(identity), Options.Create(new BootstrapOptions()), Features, default)).Value!;
        }
        public async Task Dispatch()
        {
            await using var services = new ServiceCollection().AddScoped(_ => NewDb()).AddSingleton(Sender).AddSingleton(Protector).BuildServiceProvider();
            using var dispatcher = new InvitationDeliveryDispatcher(services.GetRequiredService<IServiceScopeFactory>(), NullLogger<InvitationDeliveryDispatcher>.Instance);
            await dispatcher.DispatchBatchAsync(default); Db.ChangeTracker.Clear();
        }
        public async Task AgeDelivery(Guid id)
        {
            await Db.OrganizationInvitations.Where(item => item.Id == id).ExecuteUpdateAsync(update => update.SetProperty(item => item.LastSentAt, DateTime.UtcNow.AddMinutes(-6)));
            await Db.InvitationDeliveryAttempts.Where(item => item.OrganizationInvitationId == id).ExecuteUpdateAsync(update => update.SetProperty(item => item.QueuedAtUtc, DateTime.UtcNow.AddMinutes(-6))); Db.ChangeTracker.Clear();
        }
        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync(); client.Dispose();
            try { await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {databaseName} WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
            finally { await admin.DisposeAsync(); }
        }
    }
    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class VerifiedEmail : IVerifiedExternalEmailResolver
    { public Task<bool> IsVerifiedAsync(ExternalIdentity identity, string email, CancellationToken token) => Task.FromResult(identity.IsEmailVerified && string.Equals(identity.Email, email, StringComparison.OrdinalIgnoreCase)); }
    private sealed class AuditContext : ICurrentUserContext { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "simulated-invitation-acceptance"; }
    private sealed class CaptureTransport : HttpMessageHandler
    {
        public List<Dictionary<string, string>> Messages { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Assert.Equal("email.example.test", request.RequestUri!.Host);
            Messages.Add(QueryHelpers.ParseQuery(await request.Content!.ReadAsStringAsync(token)).ToDictionary(item => item.Key, item => item.Value.ToString()));
            return new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { id = $"simulated-message-{Messages.Count}", message = "SIMULATED accepted" })) };
        }
    }
}
