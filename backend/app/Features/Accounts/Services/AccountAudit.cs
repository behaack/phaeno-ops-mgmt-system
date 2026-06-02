namespace PhaenoPortal.App.Features.Accounts.Services;

using System.Text.Json;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;

public static class AccountAudit
{
    public const string InviteCreated = nameof(InviteCreated);
    public const string InviteResent = nameof(InviteResent);
    public const string InviteRevoked = nameof(InviteRevoked);
    public const string InviteDeclined = nameof(InviteDeclined);
    public const string InviteAccepted = nameof(InviteAccepted);
    public const string UserDisabled = nameof(UserDisabled);
    public const string UserReactivated = nameof(UserReactivated);
    public const string OrganizationDeactivated = nameof(OrganizationDeactivated);
    public const string OrganizationReactivated = nameof(OrganizationReactivated);
    public const string MembershipCreatedByInvite = nameof(MembershipCreatedByInvite);
    public const string MembershipReactivatedByInvite = nameof(MembershipReactivatedByInvite);
    public const string MembershipDeactivated = nameof(MembershipDeactivated);
    public const string MembershipRoleChanged = nameof(MembershipRoleChanged);
    public const string MembershipLeft = nameof(MembershipLeft);

    public static void Add(
        AppDbContext dbContext,
        HttpContext httpContext,
        string entityName,
        Guid entityId,
        string operation,
        Guid? organizationId,
        Guid? actorUserId,
        object details)
    {
        dbContext.AuditEvents.Add(new AuditEvent(
            entityName,
            entityId.ToString(),
            operation,
            organizationId,
            actorUserId,
            httpContext.TraceIdentifier,
            DateTime.UtcNow,
            JsonSerializer.Serialize(details, new JsonSerializerOptions(JsonSerializerDefaults.Web))));
    }
}
