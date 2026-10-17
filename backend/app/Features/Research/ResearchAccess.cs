namespace PhaenoPortal.App.Features.Research;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;

public sealed record ResearchActor(Guid UserId, Guid OrganizationId);

public static class ResearchAccess
{
    public static bool CanAccess(User user, OrganizationMembership? selectedMembership, IEnumerable<BusinessRole> roles) =>
        user is { IsActive: true, Status: UserAccountStatus.Active }
        && selectedMembership is { IsActive: true, Organization: { IsActive: true, Kind: OrganizationKind.Phaeno } }
        && (AccountAuthorization.IsPlatformAdmin(user) || roles.Contains(BusinessRole.Researcher));

    public static async Task<ResearchActor> RequireAsync(HttpContext http, PSeqOperationsDbContext db,
        IExternalIdentityContext identity, CancellationToken ct)
    {
        var user = await AccountAccess.ReadActiveActorAsync(http, db, identity, ct)
            ?? throw new OrderManagementException("active_actor_required", "An active Phaeno user is required.", 401);
        var scope = http.Request.Headers["X-Organization-Id"].ToString();
        OrganizationMembership? selected;
        if (string.IsNullOrEmpty(scope))
        {
            var active = user.Memberships.Where(m => m.IsActive && m.Organization is { IsActive: true }).ToArray();
            selected = active.Length == 1 ? active[0] : null;
        }
        else selected = Guid.TryParse(scope, out var id) ? user.Memberships.SingleOrDefault(m => m.OrganizationId == id) : null;
        var roles = await db.BusinessRoleAssignments.AsNoTracking().Where(r => r.UserId == user.Id && r.IsActive)
            .Select(r => r.Role).ToListAsync(ct);
        if (!CanAccess(user, selected, roles))
            throw new OrderManagementException("research_access_required", "Select Phaeno with an assigned Researcher role or platform administrator access.", 403);
        return new(user.Id, selected!.OrganizationId);
    }
}
