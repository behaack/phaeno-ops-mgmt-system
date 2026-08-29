namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record LabOperationsActor(
    User User,
    IReadOnlySet<LabRole> Roles,
    bool EnforceExplicitRoles = false,
    bool AllowOperationsAdministratorFallback = false)
{
    public bool IsPlatformAdmin => AccountAuthorization.IsPlatformAdmin(User);
    public bool HasAny(params LabRole[] roles) =>
        EnforceExplicitRoles
            ? LabOperationsAuthorization.HasExplicit(User, Roles, roles)
            : LabOperationsAuthorization.HasAny(User, Roles, roles)
                || AllowOperationsAdministratorFallback
                    && LabOperationsAuthorization.HasExplicit(
                        User, Roles, LabRole.OperationsAdministrator);
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

    public static bool HasExplicit(
        User user,
        IReadOnlyCollection<LabRole> assignedRoles,
        params LabRole[] requiredRoles) =>
        IsEligibleLabStaff(user) && requiredRoles.Any(assignedRoles.Contains);

    public static bool IsEligibleLabStaff(User user) =>
        user is { IsActive: true, Status: UserAccountStatus.Active }
        && user.Memberships.Any(membership =>
            membership.IsActive
            && membership.Organization is { IsActive: true, Kind: OrganizationKind.Phaeno });

    public static LabOperationsCapabilities Evaluate(
        User user,
        IReadOnlyCollection<LabRole> assignedRoles,
        bool enforceExplicitRoles = false)
    {
        if (!IsEligibleLabStaff(user))
        {
            return new LabOperationsCapabilities(false, false, false, false, false, false);
        }

        var isPlatformAdmin = AccountAuthorization.IsPlatformAdmin(user);
        var hasRole = (LabRole role) =>
            !enforceExplicitRoles && isPlatformAdmin || assignedRoles.Contains(role);
        return new LabOperationsCapabilities(
            CanManageLabOperations: isPlatformAdmin || assignedRoles.Count > 0,
            CanOperateLabWork: hasRole(LabRole.Operator)
                || hasRole(LabRole.Supervisor)
                || !enforceExplicitRoles && hasRole(LabRole.OperationsAdministrator),
            CanSuperviseLabWork: hasRole(LabRole.Supervisor)
                || !enforceExplicitRoles && hasRole(LabRole.OperationsAdministrator),
            CanManageLabProtocols: hasRole(LabRole.ProtocolAdministrator)
                || !enforceExplicitRoles && hasRole(LabRole.OperationsAdministrator),
            CanReviewLabWork: hasRole(LabRole.ScientificReviewer)
                || !enforceExplicitRoles && hasRole(LabRole.OperationsAdministrator),
            CanManageLabAccess: hasRole(LabRole.OperationsAdministrator));
    }
}

public sealed class LabOperationsRequestContext(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext,
    IOptions<PSeqOrderToCashOptions> rolloutOptions,
    ILogger<LabOperationsRequestContext> logger)
{
    private readonly PSeqOrderToCashOptions rollout = rolloutOptions.Value;

    public LabOperationsRequestContext(
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext)
        : this(dbContext, externalIdentityContext,
            Options.Create(new PSeqOrderToCashOptions()),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<LabOperationsRequestContext>.Instance)
    {
    }

    public bool GovernedPSeqResultsEnabled => rollout.GovernedPSeqResults;
    public bool DualControlEnforced => rollout.DualControlEnforced;

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
        var explicitAllowed = roles.Length == 0
            || LabOperationsAuthorization.HasExplicit(user, assignedRoles, roles);
        var legacyAllowed = roles.Length == 0
            || LabOperationsAuthorization.HasAny(user, assignedRoles, roles)
            || !rollout.DualControlEnforced
                && LabOperationsAuthorization.HasExplicit(
                    user, assignedRoles, LabRole.OperationsAdministrator);
        if (rollout.DualControlAuditOnly && legacyAllowed && !explicitAllowed)
        {
            logger.LogWarning(
                "Dual-control audit: user {UserId} relied on legacy platform-admin authorization for Lab roles {Roles}.",
                user.Id, string.Join(',', roles));
        }
        var actor = new LabOperationsActor(
            user,
            assignedRoles,
            rollout.DualControlEnforced,
            AllowOperationsAdministratorFallback: !rollout.DualControlEnforced);
        if (roles.Length > 0 && !actor.HasAny(roles))
        {
            throw new OrderManagementException(
                "lab_capability_required",
                "This action requires an assigned Phaeno laboratory role.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    public void EnforceOrAuditActorConflict(Guid userId, string code, string message, object context)
    {
        if (rollout.DualControlEnforced)
            throw new OrderManagementException(code, message, StatusCodes.Status409Conflict);
        if (rollout.DualControlAuditOnly)
            logger.LogWarning("Dual-control audit: user {UserId}; conflict {Code}; context {@Context}.",
                userId, code, context);
    }
}
