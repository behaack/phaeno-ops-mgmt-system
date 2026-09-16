namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PSeq.Operations.Commercial.Accounts.Domain;

public sealed partial class InvitationAcceptancePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task RegistrationHandoffRequiresLivePortalInvitationAndDoesNotGrantMembership()
    {
        await using var scope = await Scope.Create();
        var actorId = await scope.Db.Users.Select(user => user.Id).FirstAsync();
        var contact = await scope.Contact();
        var saved = await scope.Invite(contact);
        var token = await scope.Token(saved.Id);
        var registration = new RecordingRegistration();
        var anonymous = new DefaultHttpContext();
        var handoff = Assert.IsType<Ok<InvitationAuthenticationDto>>(await InvitationEndpoints.BeginAuthentication(
            new(token), anonymous, scope.Db, scope.Tokens, registration, default));
        Assert.Equal("https://identity.example.test/ticket", handoff.Value!.RegistrationUrl);
        Assert.Equal(contact.Email, registration.Email);
        Assert.Equal("no-store", anonymous.Response.Headers.CacheControl.ToString());
        Assert.False(await scope.Db.Users.AnyAsync(user => user.NormalizedEmail == contact.NormalizedEmail));
        Assert.Equal(InvitationStatus.Pending, (await scope.Db.OrganizationInvitations.FindAsync(saved.Id))!.Status);

        var invitation = (await scope.Db.OrganizationInvitations.FindAsync(saved.Id))!;
        invitation.Revoke(actorId, DateTime.UtcNow);
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.BeginAuthentication(
            new(token), anonymous, scope.Db, scope.Tokens, registration, default));
        Assert.Equal(1, registration.Calls);
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.BeginAuthentication(
            new("unknown-token"), anonymous, scope.Db, scope.Tokens, registration, default));
        Assert.Equal(1, registration.Calls);
    }

    [PostgreSqlReferenceFact]
    public async Task RegistrationRechecksRevocationDuringProviderCall()
    {
        await using var scope = await Scope.Create();
        var actorId = await scope.Db.Users.Select(user => user.Id).FirstAsync();
        var contact = await scope.Contact();
        var saved = await scope.Invite(contact);
        var token = await scope.Token(saved.Id);
        var registration = new RecordingRegistration(async () =>
        {
            var invitation = (await scope.Db.OrganizationInvitations.FindAsync(saved.Id))!;
            invitation.Revoke(actorId, DateTime.UtcNow);
            await scope.Db.SaveChangesAsync();
        });
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.BeginAuthentication(
            new(token), new DefaultHttpContext(), scope.Db, scope.Tokens, registration, default));
        Assert.Equal(1, registration.Calls);
    }

    [PostgreSqlReferenceFact]
    public async Task UnavailableInvitationsNeverPrepareIdentitySetup()
    {
        await using var scope = await Scope.Create();
        var actorId = await scope.Db.Users.Select(user => user.Id).FirstAsync();
        var registration = new RecordingRegistration();
        foreach (var state in new[] { "expired", "revoked", "accepted", "declined", "replaced", "inactive" })
        {
            var token = scope.Tokens.CreateToken();
            var invitation = new OrganizationInvitation(scope.Organization.Id, $"{state}@example.test", "Invited", "Person", false,
                state == "replaced" ? "replacement-hash" : token.TokenHash, DateTime.UtcNow.AddDays(state == "expired" ? -1 : 1));
            if (state == "revoked") invitation.Revoke(actorId, DateTime.UtcNow);
            if (state == "accepted") invitation.Accept(actorId, DateTime.UtcNow);
            if (state == "declined") invitation.Decline(actorId, DateTime.UtcNow);
            if (state == "inactive") scope.Organization.Deactivate();
            scope.Db.Add(invitation);
            await scope.Db.SaveChangesAsync();
            await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.BeginAuthentication(
                new(token.RawToken), new DefaultHttpContext(), scope.Db, scope.Tokens, registration, default));
        }
        foreach (var token in new[] { "", "unknown", new string('x', 257) })
            await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.BeginAuthentication(
                new(token), new DefaultHttpContext(), scope.Db, scope.Tokens, registration, default));
        Assert.Equal(0, registration.Calls);
    }

    private sealed class RecordingRegistration(Func<Task>? onPrepare = null) : IInvitationRegistration
    {
        public int Calls { get; private set; }
        public string? Email { get; private set; }
        public async Task<string?> PrepareAsync(OrganizationInvitation invitation, CancellationToken cancellationToken)
        {
            Calls++;
            Email = invitation.Email;
            if (onPrepare is not null) await onPrepare();
            return "https://identity.example.test/ticket";
        }
    }
}
