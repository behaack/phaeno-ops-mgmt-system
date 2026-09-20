namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class InvitationAcceptancePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task PendingAccessEditPreservesDeliveryAndRequiresFreshRecipientReview()
    {
        await using var scope = await Scope.Create();
        var contact = await scope.Contact();
        var original = await scope.Invite(contact);
        var token = await scope.Token(original.Id);
        var edited = Assert.IsType<Ok<InvitationDto>>(await InvitationEndpoints.UpdateInvitationAccess(original.Id,
            new(false, [new(scope.Research.Id, true)], original.Version), scope.Http, scope.Db, scope.AdminIdentity, default)).Value!;
        Assert.True(edited.Version > original.Version); // Department-only edits must fence acceptance too.
        Assert.Equal(original.Id, edited.Id);
        Assert.Equal(original.ExpiresAt, edited.ExpiresAt);
        Assert.Equal(token, await scope.Token(original.Id));
        Assert.Equal(original.DeliveryStatus, edited.DeliveryStatus);
        Assert.Single(await scope.Db.InvitationDeliveryAttempts.ToListAsync());
        Assert.Empty(scope.Transport.Messages);
        Assert.False(await scope.Db.Users.AnyAsync(value => value.NormalizedEmail == contact.NormalizedEmail));
        Assert.Empty(await scope.Db.OrderNotifications.ToListAsync());
        Assert.True(await scope.Db.AuditEvents.AnyAsync(value => value.Operation == AccountAudit.InviteAccessUpdated));
        var preview = Assert.IsType<Ok<InvitationPreviewDto>>(await InvitationEndpoints.PreviewInvitation(
            new(token), new DefaultHttpContext(), scope.Db, scope.Tokens, default)).Value!;
        Assert.Equal(edited.Version, preview.Version);
        Assert.True(Assert.Single(preview.Departments!).IsDepartmentAdmin);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => InvitationEndpoints.AcceptInvitation(
            new() { Token = token, Version = original.Version }, scope.Http, scope.Db, scope.Tokens,
            new IdentityContext(scope.Invited(contact)), new VerifiedEmail(), default));
        Assert.False(await scope.Db.Users.AnyAsync(value => value.NormalizedEmail == contact.NormalizedEmail));
        var accepted = Assert.IsType<Ok<InvitationDto>>(await InvitationEndpoints.AcceptInvitation(
            new() { Token = token, Version = edited.Version }, scope.Http, scope.Db, scope.Tokens,
            new IdentityContext(scope.Invited(contact)), new VerifiedEmail(), default)).Value!;
        Assert.Equal(InvitationStatus.Accepted, accepted.Status);
        Assert.True(Assert.Single(await scope.Db.OrganizationDepartmentMemberships.ToListAsync()).IsDepartmentAdmin);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => InvitationEndpoints.UpdateInvitationAccess(original.Id,
            new(true, [], accepted.Version), scope.Http, scope.Db, scope.AdminIdentity, default));
    }

    [PostgreSqlReferenceFact]
    public async Task PendingAccessEditRejectsForeignEmptyUnauthorizedAndStaleChangesWithoutRenewingExpiry()
    {
        await using var scope = await Scope.Create();
        var original = await scope.Invite(await scope.Contact());
        var request = new UpdateInvitationAccessRequest(false, [new(scope.Research.Id, true)], original.Version);
        Assert.IsType<ForbidHttpResult>(await InvitationEndpoints.UpdateInvitationAccess(original.Id, request,
            scope.Http, scope.Db, new IdentityContext(Scope.Identity("unrelated@example.test")), default));
        var other = new Organization("SIMULATED Other Company", OrganizationKind.Customer);
        scope.Db.Add(other); await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.UpdateInvitationAccess(original.Id,
            request with { Departments = [new(other.Departments.Single().Id, false)] }, scope.Http, scope.Db, scope.AdminIdentity, default));
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.UpdateInvitationAccess(original.Id,
            request with { Departments = [] }, scope.Http, scope.Db, scope.AdminIdentity, default));
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => InvitationEndpoints.UpdateInvitationAccess(original.Id,
            request with { Version = original.Version - 1 }, scope.Http, scope.Db, scope.AdminIdentity, default));
        var row = await scope.Db.OrganizationInvitations.SingleAsync(value => value.Id == original.Id);
        scope.Db.Entry(row).Property(value => value.ExpiresAt).CurrentValue = DateTime.UtcNow.AddMinutes(-1);
        await scope.Db.SaveChangesAsync();
        var expiredAt = row.ExpiresAt;
        var edited = Assert.IsType<Ok<InvitationDto>>(await InvitationEndpoints.UpdateInvitationAccess(original.Id,
            request with { IsOrganizationAdmin = true, Departments = [], Version = row.Version },
            scope.Http, scope.Db, scope.AdminIdentity, default)).Value!;
        Assert.True(edited.IsOrganizationAdmin);
        Assert.True(edited.IsExpired);
        Assert.Equal(expiredAt, edited.ExpiresAt);
        Assert.Equal(scope.Organization.Departments.Single(value => value.IsDefault).Id, Assert.Single(edited.Departments).DepartmentId);
        var noOp = Assert.IsType<Ok<InvitationDto>>(await InvitationEndpoints.UpdateInvitationAccess(original.Id,
            new(true, [], edited.Version), scope.Http, scope.Db, scope.AdminIdentity, default)).Value!;
        Assert.Equal(edited.Version, noOp.Version);
        Assert.Single(await scope.Db.InvitationDeliveryAttempts.ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task ActiveCompanyAccessQueuesPersonalNoticesWithoutReinvitationOrNoOpDuplicates()
    {
        await using var scope = await Scope.Create();
        var contact = await scope.Contact();
        var invite = await scope.Invite(contact);
        await scope.Accept(await scope.Token(invite.Id), scope.Invited(contact));
        var user = await scope.Db.Users.SingleAsync(value => value.NormalizedEmail == contact.NormalizedEmail);
        var member = await scope.Db.OrganizationMemberships.SingleAsync(value => value.UserId == user.Id);
        var administrator = await scope.Db.Users.SingleAsync(value => value.NormalizedEmail == User.NormalizeEmail("admin@example.test"));
        scope.Db.Add(new OrganizationMembership(administrator.Id, scope.Organization.Id, true));
        await scope.Db.SaveChangesAsync();
        await MembershipEndpoints.UpdateMembershipRole(member.Id, new() { IsOrganizationAdmin = true }, scope.Http, scope.Db, scope.AdminIdentity, default);
        await MembershipEndpoints.UpdateMembershipRole(member.Id, new() { IsOrganizationAdmin = true }, scope.Http, scope.Db, scope.AdminIdentity, default);
        Assert.Single(await scope.Db.OrderNotifications.ToListAsync());
        await MembershipEndpoints.UpdateMembershipRole(member.Id, new() { IsOrganizationAdmin = false }, scope.Http, scope.Db, scope.AdminIdentity, default);
        var general = scope.Organization.Departments.Single(value => value.IsDefault);
        var added = Assert.IsType<Ok<DepartmentMembershipDto>>(await DepartmentEndpoints.UpsertDepartmentMember(
            scope.Organization.Id, general.Id, member.Id, new(false, null), scope.Http, scope.Db, scope.AdminIdentity, default)).Value!;
        await DepartmentEndpoints.UpsertDepartmentMember(scope.Organization.Id, general.Id, member.Id,
            new(false, added.Version), scope.Http, scope.Db, scope.AdminIdentity, default);
        Assert.Equal(3, await scope.Db.OrderNotifications.CountAsync());
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => DepartmentEndpoints.UpsertDepartmentMember(
            scope.Organization.Id, general.Id, member.Id, new(true, added.Version - 1), scope.Http, scope.Db, scope.AdminIdentity, default));
        Assert.Equal(3, await scope.Db.OrderNotifications.CountAsync());
        await DepartmentEndpoints.DeactivateDepartmentMember(scope.Organization.Id, general.Id, member.Id,
            new(false, added.Version), scope.Http, scope.Db, scope.AdminIdentity, default);
        await MembershipEndpoints.DeactivateMembership(member.Id, scope.Http, scope.Db, scope.AdminIdentity, default);
        await MembershipEndpoints.DeactivateMembership(member.Id, scope.Http, scope.Db, scope.AdminIdentity, default);
        Assert.False(member.IsActive);
        var notices = await scope.Db.OrderNotifications.ToListAsync();
        Assert.Equal(5, notices.Count);
        foreach (var notice in notices)
        {
            Assert.Equal(CompanyAccessNotifications.WorkflowType, notice.WorkflowType);
            Assert.Equal(user.Id, notice.RecipientUserId);
            Assert.Equal(user.Email, Assert.Single(await CompanyAccessNotifications.ReadRecipientsAsync(scope.Db, notice, default)));
            Assert.Contains("no action is required", notice.Body);
        }
        var delivery = notices[0];
        var sender = new AccessNoticeSender { Fail = true };
        delivery.BeginAttempt(DateTime.UtcNow.AddMinutes(5));
        await scope.Db.SaveChangesAsync();
        await OrderNotificationDispatcher.DeliverAsync(scope.Db, sender, delivery.Id, delivery.Version, NullLogger.Instance, default);
        Assert.Equal(OrderNotificationStatus.Failed, delivery.Status);
        Assert.False(member.IsActive); // Transport failure never rolls back the committed access change.
        sender.Fail = false;
        delivery.BeginAttempt(DateTime.UtcNow.AddMinutes(5));
        await scope.Db.SaveChangesAsync();
        await OrderNotificationDispatcher.DeliverAsync(scope.Db, sender, delivery.Id, delivery.Version, NullLogger.Instance, default);
        Assert.Equal(OrderNotificationStatus.Sent, delivery.Status);
        Assert.Equal(user.Email, Assert.Single(sender.Recipients));
        var mismatched = new OrderNotification(Guid.NewGuid(), user.Id, CompanyAccessNotifications.WorkflowType,
            member.Id, "access-changed", "SIMULATED", "SIMULATED");
        Assert.Empty(await CompanyAccessNotifications.ReadRecipientsAsync(scope.Db, mismatched, default));
        Assert.Single(await scope.Db.OrganizationInvitations.ToListAsync());
        Assert.Single(await scope.Db.InvitationDeliveryAttempts.ToListAsync());
        Assert.Empty(scope.Transport.Messages);
    }
    private sealed class AccessNoticeSender : IOrderNotificationSender
    {
        public bool Fail { get; set; }
        public IReadOnlyList<string> Recipients { get; private set; } = [];
        public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken cancellationToken)
        {
            Recipients = recipients;
            if (Fail) throw new InvalidOperationException("SIMULATED transport failure");
            return Task.CompletedTask;
        }
    }
}
