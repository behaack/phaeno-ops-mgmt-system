namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PhaenoPortal.App.Features.LabOperations.Services;

public sealed class LabServiceTimingService(PSeqOperationsDbContext db)
{
    public async Task<bool> CanOverrideAsync(HttpContext context, bool enforceRoles, CancellationToken token)
    {
        if (context.Items[HttpCurrentUserContext.InternalUserIdItemKey] is not Guid actorId) return false;
        var actor = await db.Users.AsNoTracking().Include(value => value.Memberships).ThenInclude(value => value.Organization)
            .SingleOrDefaultAsync(value => value.Id == actorId, token);
        if (actor is null) return false;
        var roles = await db.LabRoleAssignments.AsNoTracking().Where(value => value.UserId == actorId && value.IsActive)
            .Select(value => value.Role).ToHashSetAsync(token);
        return new LabOperationsActor(actor, roles, enforceRoles, !enforceRoles).HasAny(LabRole.Operator, LabRole.Supervisor);
    }
    internal static async Task<List<string>> DelayRecipientsAsync(PSeqOperationsDbContext db, Guid organizationId,
        Guid? departmentId, Guid? orderContactId, CancellationToken token)
    {
        var emails = await db.OrganizationMemberships.AsNoTracking().Where(value => value.OrganizationId == organizationId
            && value.Organization != null && value.Organization.IsActive && value.IsActive
            && value.User != null && value.User.IsActive && value.User.Status == UserAccountStatus.Active
            && (value.IsOrganizationAdmin || (value.UserId == orderContactId && departmentId.HasValue
                && db.OrganizationDepartmentMemberships.Any(access => access.OrganizationMembershipId == value.Id
                    && access.DepartmentId == departmentId && access.IsActive && access.Department.IsActive))))
            .Select(value => value.User!.Email).ToListAsync(token);
        return emails.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }
    public async Task<LabServiceTimingDto?> ReadAsync(Guid orderId, Guid organizationId, bool internalView,
        bool canOverride, CancellationToken token)
    {
        var work = await db.LabWorkOrders.AsNoTracking().Include(value => value.Specimens).SingleOrDefaultAsync(value =>
            value.AuthorizationSource == LabAuthorizationSource.CommercialOrder && value.AuthorizationSourceId == orderId
            && value.SubmittingOrganizationId == organizationId, token);
        if (work is null || !work.MaximumTurnaroundDays.HasValue) return null;
        var changes = await db.Set<LabWorkTimingChange>().AsNoTracking().Where(value => value.LabWorkOrderId == work.Id)
            .OrderBy(value => value.OccurredAtUtc).ToListAsync(token);
        var notificationIds = changes.Where(value => value.NotificationId.HasValue).Select(value => value.NotificationId!.Value).ToList();
        var notifications = await db.OrderNotifications.AsNoTracking().Where(value => notificationIds.Contains(value.Id))
            .ToDictionaryAsync(value => value.Id, value => value.Status.ToString(), token);
        return new(work.Specimens.Select(value => value.ReceivedAtUtc).Min(), work.Specimens.Select(value => value.AcceptedAtUtc).Min(),
            work.OriginalTargetAtUtc, work.ExpectedCompletionAtUtc, work.CompletedAtUtc, work.ScheduleHealth(DateTime.UtcNow),
            changes.Select(value => new LabServiceTimingChangeDto(value.Id, value.PreviousExpectedAtUtc, value.ExpectedAtUtc,
                value.Reason, value.CustomerSafeNote, internalView ? value.InternalNote : null,
                value.TimingChangedByUserId, value.OccurredAtUtc, value.NotificationId.HasValue,
                value.NotificationId.HasValue ? notifications.GetValueOrDefault(value.NotificationId.Value) ?? "Pending" : "NotRequired")).ToList(),
            work.Version, canOverride && work.OriginalTargetAtUtc.HasValue
                && work.Status is not (LabWorkOrderStatus.ReadyForRelease or LabWorkOrderStatus.Cancelled));
    }

    public static LabServiceCommercialSnapshotDto? CommercialSnapshot(ConfiguredLabServiceSnapshot? value) => value is null ? null : new(
        value.OfferingId, value.FamilyId, value.OfferingVersion, value.ProductName, value.CatalogItemId, value.CatalogCode,
        value.CatalogItemVersion, value.Currency, value.UnitPrice, value.SpecimenCount, value.Subtotal, value.Tax, value.Total,
        value.AnalysisIds, value.IncludedOutputContract, value.MinimumTurnaroundDays, value.MaximumTurnaroundDays, value.CommittedAtUtc);
}
