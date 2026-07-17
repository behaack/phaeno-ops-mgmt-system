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
    public bool HasAny(params LabRole[] roles) => IsPlatformAdmin || roles.Any(Roles.Contains);
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
        var assignedRoles = await dbContext.LabRoleAssignments.AsNoTracking()
            .Where(assignment => assignment.UserId == user.Id && assignment.IsActive)
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
