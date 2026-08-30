namespace PhaenoPortal.App.Features.OrderToCash;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderToCash.Domain;

public sealed record OrderToCashActor(User User, IReadOnlySet<BusinessRole> Roles)
{
    public Guid Id => User.Id;
    public bool Has(BusinessRole role) => Roles.Contains(role);
}

public sealed class OrderToCashAuthorization(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext,
    IOptions<OrderToCashOptions> options)
{
    private readonly OrderToCashOptions settings = options.Value;

    public async Task<OrderToCashActor?> ReadActorAsync(HttpContext httpContext, CancellationToken cancellationToken)
    {
        var user = await AccountAccess.ReadActiveActorAsync(httpContext, dbContext,
            externalIdentityContext, cancellationToken);
        if (user is null) return null;
        var roles = await dbContext.BusinessRoleAssignments.AsNoTracking()
            .Where(value => value.UserId == user.Id && value.IsActive)
            .Select(value => value.Role).ToListAsync(cancellationToken);
        return new OrderToCashActor(user, roles.ToHashSet());
    }

    public async Task<OrderToCashActor> RequireAsync(HttpContext httpContext,
        BusinessRole role, CancellationToken cancellationToken)
    {
        var actor = await ReadActorAsync(httpContext, cancellationToken);
        if (actor is null) throw new OrderManagementException("authentication_required",
            "An active POMS user is required.", StatusCodes.Status401Unauthorized);
        if (!settings.Features.BusinessRoles && AccountAuthorization.IsPlatformAdmin(actor.User)) return actor;
        if (!actor.Has(role)) throw new OrderManagementException("business_role_required",
            $"The {role} role is required.", StatusCodes.Status403Forbidden);
        return actor;
    }
}

public sealed class DualControlService(
    PSeqOperationsDbContext dbContext,
    IOptions<OrderToCashOptions> options)
{
    private readonly OrderToCashOptions settings = options.Value;

    public async Task CheckAsync(string controlCode, string workflowType, Guid workflowId,
        Guid actorUserId, IEnumerable<Guid?> possibleConflictingActors,
        CancellationToken cancellationToken)
    {
        var conflicts = possibleConflictingActors.Where(value => value.HasValue)
            .Select(value => value!.Value).Where(value => value == actorUserId).Distinct().ToArray();
        if (conflicts.Length == 0 || settings.DualControlMode == DualControlMode.Disabled) return;
        dbContext.DualControlObservations.Add(new DualControlObservation(controlCode,
            workflowType, workflowId, actorUserId, conflicts, settings.DualControlMode, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (settings.DualControlMode == DualControlMode.Enforced)
            throw new InvalidOperationException("Dual control requires a different authorized actor.");
    }
}
