namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record LabOperationsActor(User User, IReadOnlySet<LabRole> Roles)
{
    public bool IsPlatformAdmin => AccountAuthorization.IsPlatformAdmin(User);
    public bool HasAny(params LabRole[] roles) =>
        LabOperationsAuthorization.HasAny(User, Roles, roles);
}

internal sealed record LabOperationsCapabilities(
    bool CanManageLabOperations,
    bool CanOperateLabWork,
    bool CanSuperviseLabWork,
    bool CanManageLabProtocols,
    bool CanReviewLabWork,
    bool CanManageLabAccess);

internal static class LabOperationsAuthorization
{
    public static IQueryable<LabRoleAssignment> ActiveAssignmentsFor(
        IQueryable<LabRoleAssignment> assignments,
        Guid userId) =>
        assignments.Where(assignment => assignment.UserId == userId && assignment.IsActive);

    public static bool HasAny(
        User user,
        IReadOnlyCollection<LabRole> assignedRoles,
        params LabRole[] requiredRoles) =>
        AccountAuthorization.IsPlatformAdmin(user)
        || IsEligibleLabStaff(user) && requiredRoles.Any(assignedRoles.Contains);

    public static bool IsEligibleLabStaff(User user) =>
        user is { IsActive: true, Status: UserAccountStatus.Active }
        && user.Memberships.Any(membership =>
            membership.IsActive
            && membership.Organization is { IsActive: true, Kind: OrganizationKind.Phaeno });

    public static LabOperationsCapabilities Evaluate(
        User user,
        IReadOnlyCollection<LabRole> assignedRoles)
    {
        if (!IsEligibleLabStaff(user))
        {
            return new LabOperationsCapabilities(false, false, false, false, false, false);
        }

        var isPlatformAdmin = AccountAuthorization.IsPlatformAdmin(user);
        var hasRole = (LabRole role) => isPlatformAdmin || assignedRoles.Contains(role);
        return new LabOperationsCapabilities(
            CanManageLabOperations: isPlatformAdmin || assignedRoles.Count > 0,
            CanOperateLabWork: hasRole(LabRole.Operator)
                || hasRole(LabRole.Supervisor)
                || hasRole(LabRole.OperationsAdministrator),
            CanSuperviseLabWork: hasRole(LabRole.Supervisor)
                || hasRole(LabRole.OperationsAdministrator),
            CanManageLabProtocols: hasRole(LabRole.ProtocolAdministrator)
                || hasRole(LabRole.OperationsAdministrator),
            CanReviewLabWork: hasRole(LabRole.ScientificReviewer)
                || hasRole(LabRole.OperationsAdministrator),
            CanManageLabAccess: hasRole(LabRole.OperationsAdministrator));
    }
}

public sealed class LabOperationsRequestContext(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext)
{
    public async Task<LabOperationsActor> RequireAsync(
        HttpContext httpContext,
        CancellationToken cancellationToken,
        params LabRole[] roles)
    {
        var user = await AccountAccess.ReadActiveActorAsync(
            httpContext, dbContext, externalIdentityContext, cancellationToken)
            ?? throw new OrderManagementException(
                "active_actor_required", "An active portal user is required.",
                StatusCodes.Status401Unauthorized);
        var assignedRoles = await LabOperationsAuthorization.ActiveAssignmentsFor(
                dbContext.LabRoleAssignments.AsNoTracking(), user.Id)
            .Select(assignment => assignment.Role)
            .ToHashSetAsync(cancellationToken);
        var actor = new LabOperationsActor(user, assignedRoles);
        if (roles.Length > 0 && !actor.HasAny(roles))
        {
            throw new OrderManagementException(
                "lab_capability_required",
                "This action requires an assigned Phaeno laboratory role.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }
}
