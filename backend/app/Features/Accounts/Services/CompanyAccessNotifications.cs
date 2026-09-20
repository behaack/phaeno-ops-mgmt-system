namespace PhaenoPortal.App.Features.Accounts.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>Informational access notices share the durable transactional notification outbox.</summary>
internal static class CompanyAccessNotifications
{
    public const string WorkflowType = "CompanyAccess";

    public static async Task QueueAsync(PSeqOperationsDbContext db, OrganizationMembership membership,
        string change, CancellationToken token)
    {
        var organization = await db.Organizations.AsNoTracking()
            .SingleAsync(value => value.Id == membership.OrganizationId, token);
        if (organization.IsPhaeno()) return;
        var subjectName = organization.Name.Replace('\r', ' ').Replace('\n', ' ');
        var body = $"Your Portal access to {organization.Name} was updated.\n\n{change}\n\n"
            + "This change is already in effect. There is no invitation to accept and no action is required to confirm it. "
            + "If you were not expecting this change, contact your Company administrator.";
        db.OrderNotifications.Add(new OrderNotification(membership.OrganizationId, membership.UserId,
            WorkflowType, membership.Id, "access-changed", $"Your access to {subjectName} changed", body));
    }

    public static Task<List<string>> ReadRecipientsAsync(PSeqOperationsDbContext db, OrderNotification notice, CancellationToken token) =>
        db.OrganizationMemberships.AsNoTracking()
            // A removal notice must still reach the affected person after access is deactivated.
            // Never substitute an administrator or a department routing address for this recipient.
            .Where(value => value.Id == notice.WorkflowId && value.OrganizationId == notice.OrganizationId
                && value.UserId == notice.RecipientUserId)
            .Select(value => value.User!.Email).ToListAsync(token);
}
