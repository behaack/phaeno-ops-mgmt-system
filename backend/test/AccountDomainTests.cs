namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;

public class AccountDomainTests
{
    [Fact]
    public void NewUserIsInvitedAndInactiveUntilAccepted()
    {
        var user = new User("PERSON@example.com ", "Pat", "Lee");

        Assert.Equal("PERSON@example.com", user.Email);
        Assert.Equal("PERSON@EXAMPLE.COM", user.NormalizedEmail);
        Assert.Equal(UserAccountStatus.Invited, user.Status);
        Assert.False(user.IsActive);
        Assert.False(user.HasLinkedExternalIdentity());
    }

    [Fact]
    public void AcceptInvitationLinksExternalIdentityAndActivatesUser()
    {
        var acceptedAt = new DateTime(2026, 06, 01, 12, 0, 0, DateTimeKind.Utc);
        var user = new User("person@example.com", "Pat", "Lee");

        user.AcceptInvitation("Patricia", "Lee", "clerk", "user_123", acceptedAt);

        Assert.Equal(UserAccountStatus.Active, user.Status);
        Assert.True(user.IsActive);
        Assert.True(user.HasLinkedExternalIdentity());
        Assert.Equal("clerk", user.ExternalIdentityProvider);
        Assert.Equal("user_123", user.ExternalSubjectId);
        Assert.Equal("Patricia", user.FirstName);
    }

    [Fact]
    public void BootstrapIdentityLinkingIsOneTime()
    {
        var user = new User("admin@phaeno.com", "Phaeno", "Admin");

        user.LinkExternalIdentity("clerk", "user_123");

        var exception = Assert.Throws<InvalidOperationException>(() =>
            user.LinkExternalIdentity("clerk", "user_456"));
        Assert.Equal("User is already linked to an external identity.", exception.Message);
    }

    [Fact]
    public void PlatformAdminRequiresActiveAdminMembershipInActivePhaenoOrganization()
    {
        var organization = new Organization("Phaeno", OrganizationKind.Phaeno);
        var membership = new OrganizationMembership(Guid.NewGuid(), organization.Id, isOrganizationAdmin: true);

        typeof(OrganizationMembership)
            .GetProperty(nameof(OrganizationMembership.Organization))!
            .SetValue(membership, organization);

        Assert.True(membership.GrantsPlatformAdmin());

        organization.Deactivate();

        Assert.False(membership.GrantsPlatformAdmin());
    }

    [Fact]
    public void InvitationExpirationIsDerivedFromPendingStatusAndExpiresAt()
    {
        var now = new DateTime(2026, 06, 01, 12, 0, 0, DateTimeKind.Utc);
        var invitation = new OrganizationInvitation(
            Guid.NewGuid(),
            "person@example.com",
            isOrganizationAdmin: false,
            tokenHash: "hash",
            expiresAt: now.AddMinutes(-1));

        Assert.True(invitation.IsExpired(now));
        Assert.False(invitation.CanBeAccepted(now));
    }

    [Fact]
    public void InvitationAcceptIsSingleUse()
    {
        var now = new DateTime(2026, 06, 01, 12, 0, 0, DateTimeKind.Utc);
        var invitation = new OrganizationInvitation(
            Guid.NewGuid(),
            "person@example.com",
            isOrganizationAdmin: true,
            tokenHash: "hash",
            expiresAt: now.AddDays(1));
        var userId = Guid.NewGuid();

        invitation.Accept(userId, now);

        Assert.Equal(InvitationStatus.Accepted, invitation.Status);
        Assert.Equal(userId, invitation.AcceptedByUserId);
        Assert.False(invitation.CanBeAccepted(now));
        Assert.Throws<InvalidOperationException>(() =>
            invitation.Accept(userId, now.AddMinutes(1)));
    }

    [Fact]
    public void InvitationDeclineAndRevokeClosePendingInvite()
    {
        var now = new DateTime(2026, 06, 01, 12, 0, 0, DateTimeKind.Utc);
        var declinedInvitation = new OrganizationInvitation(
            Guid.NewGuid(),
            "person@example.com",
            isOrganizationAdmin: false,
            tokenHash: "decline-hash",
            expiresAt: now.AddDays(1));
        var revokedInvitation = new OrganizationInvitation(
            Guid.NewGuid(),
            "other@example.com",
            isOrganizationAdmin: false,
            tokenHash: "revoke-hash",
            expiresAt: now.AddDays(1));
        var actorUserId = Guid.NewGuid();

        declinedInvitation.Decline(actorUserId, now);
        revokedInvitation.Revoke(actorUserId, now);

        Assert.Equal(InvitationStatus.Declined, declinedInvitation.Status);
        Assert.Equal(actorUserId, declinedInvitation.DeclinedByUserId);
        Assert.Equal(InvitationStatus.Revoked, revokedInvitation.Status);
        Assert.Equal(actorUserId, revokedInvitation.RevokedByUserId);
        Assert.False(declinedInvitation.CanBeAccepted(now));
        Assert.False(revokedInvitation.CanBeAccepted(now));
    }

    [Fact]
    public void InvitationTokenServiceStoresHashSeparateFromRawToken()
    {
        var tokenService = new InvitationTokenService();

        var token = tokenService.CreateToken();

        Assert.NotEqual(token.RawToken, token.TokenHash);
        Assert.Equal(token.TokenHash, tokenService.HashToken(token.RawToken));
    }

    [Fact]
    public void OrganizationDeactivateDoesNotDeactivateMembership()
    {
        var organization = new Organization("Customer", OrganizationKind.Customer);
        var membership = new OrganizationMembership(Guid.NewGuid(), organization.Id, isOrganizationAdmin: false);

        organization.Deactivate();

        Assert.False(organization.IsActive);
        Assert.True(membership.IsActive);
    }

    [Fact]
    public void UserDeactivateDoesNotDeactivateMemberships()
    {
        var user = new User("person@example.com", "Pat", "Lee");
        var membership = new OrganizationMembership(user.Id, Guid.NewGuid(), isOrganizationAdmin: false);
        user.Memberships.Add(membership);
        user.Activate();

        user.Deactivate();

        Assert.False(user.IsActive);
        Assert.Equal(UserAccountStatus.Disabled, user.Status);
        Assert.True(membership.IsActive);
    }

    [Fact]
    public void MembershipCanChangeRoleAndReactivateWithoutDeleting()
    {
        var membership = new OrganizationMembership(Guid.NewGuid(), Guid.NewGuid(), isOrganizationAdmin: false);

        membership.SetOrganizationAdmin(true);
        membership.Deactivate();
        membership.Activate();

        Assert.True(membership.IsOrganizationAdmin);
        Assert.True(membership.IsActive);
    }
}
