namespace PhaenoPortal.App.Features.Trials.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record TrialActor(User User, bool IsStaff, bool IsPlatformAdmin, OrderTenantContext? Tenant)
{
    public bool IsOrganizationAdmin => Tenant?.Membership.IsOrganizationAdmin == true;
}
public sealed class TrialAccess(PSeqOperationsDbContext db, IExternalIdentityContext identity, OrderRequestContext context)
{
    public async Task<TrialActor> ReadAsync(HttpContext http, CancellationToken token)
    {
        var user = await AccountAccess.ReadActiveActorAsync(http, db, identity, token) ?? throw Error("trial_actor_required", "Sign in with an active Portal account.", 401);
        var platform = AccountAuthorization.IsPlatformAdmin(user);
        var phaeno = user.Memberships.Any(value => value.IsActive && value.Organization is { IsActive: true, Kind: OrganizationKind.Phaeno });
        var staff = phaeno && (platform || await db.BusinessRoleAssignments.AnyAsync(value => value.UserId == user.Id && value.IsActive
            && (value.Role == BusinessRole.CommercialOperator || value.Role == BusinessRole.ResultReleaseManager), token)
            || await db.LabRoleAssignments.AnyAsync(value => value.UserId == user.Id && value.IsActive && (value.Role == PSeq.Operations.Laboratory.Domain.LabRole.Operator
                || value.Role == PSeq.Operations.Laboratory.Domain.LabRole.Supervisor || value.Role == PSeq.Operations.Laboratory.Domain.LabRole.ScientificReviewer), token)
            || await db.TrialApprovalAuthorities.AnyAsync(value => value.UserId == user.Id && value.RevokedAtUtc == null, token));
        if (staff) return new(user, true, platform, null);
        if (!Guid.TryParse(http.Request.Headers["X-Organization-Id"].FirstOrDefault(), out var organizationId))
            throw Error("trial_organization_required", "Select an organization before opening Trials.");
        var membership = user.Memberships.FirstOrDefault(value => value.OrganizationId == organizationId && value.IsActive && value.Organization is { IsActive: true });
        if (membership?.Organization is null || membership.Organization.Kind is not (OrganizationKind.Prospect or OrganizationKind.Customer or OrganizationKind.Partner)) throw Missing();
        return new(user, false, false, await context.RequireTenantAsync(http, membership.Organization.Kind, false, token));
    }
    public static void RequireStaff(TrialActor actor) { if (!actor.IsStaff) throw Error("trial_staff_required", "An authorized Phaeno Trial operator is required.", 403); }
    public async Task RequireCommercialAsync(TrialActor actor, CancellationToken token)
    {
        RequireStaff(actor);
        if (actor.IsPlatformAdmin || await db.BusinessRoleAssignments.AnyAsync(value => value.UserId == actor.User.Id && value.IsActive && value.Role == BusinessRole.CommercialOperator, token)) return;
        await RequireAuthorityAsync(actor, TrialApprovalDomain.Commercial, token);
    }
    public static async Task GuardProspectDeactivationAsync(PSeqOperationsDbContext db, Guid organizationId, CancellationToken token)
    {
        if (await db.Organizations.AnyAsync(value => value.Id == organizationId && value.IsActive && value.Kind == OrganizationKind.Prospect, token)
            && await db.TrialProjects.AnyAsync(value => value.OrganizationId == organizationId, token))
            throw Error("trial_closeout_required", "Use the Trial Project's Close Prospect access action to review remaining relationships and record a deactivation reason.", 409);
    }
    public static void RequireTenantAdmin(TrialActor actor)
    { if (actor.IsStaff || !actor.IsOrganizationAdmin || actor.Tenant?.Organization.Kind != OrganizationKind.Prospect) throw Error("trial_organization_admin_required", "An active Prospect organization administrator must perform this action.", 403); }
    public static IQueryable<TrialProject> Scope(IQueryable<TrialProject> query, TrialActor actor) => actor.IsStaff ? query
        : query.Where(value => value.OrganizationId == actor.Tenant!.Organization.Id && value.DepartmentId == actor.Tenant.Department.Id && value.ApprovedScopeRevision != null);
    public async Task<TrialApprovalAuthority> RequireAuthorityAsync(TrialActor actor, TrialApprovalDomain domain, CancellationToken token)
    {
        RequireStaff(actor);
        if (db.Database.IsNpgsql() && db.Database.CurrentTransaction is not null)
        {
            var entity = db.Model.FindEntityType(typeof(TrialApprovalAuthority))!;
            var table = $"\"{entity.GetSchema()!.Replace("\"", "\"\"")}\".\"{entity.GetTableName()!.Replace("\"", "\"\"")}\"";
#pragma warning disable EF1002
            await db.Database.ExecuteSqlRawAsync($"SELECT id FROM {table} WHERE domain = {{0}} ORDER BY id FOR SHARE", [domain.ToString()], token);
#pragma warning restore EF1002
        }
        var authority = await db.TrialApprovalAuthorities.SingleOrDefaultAsync(value => value.UserId == actor.User.Id && value.Domain == domain
            && value.RevokedAtUtc == null && value.EffectiveAtUtc <= DateTime.UtcNow, token) ?? throw Error("trial_approval_authority_required", "You do not hold active authority for this approval domain.", 403);
        if (!authority.IsPrimary && !await db.TrialApprovalAuthorities.AnyAsync(value => value.Id == authority.PrimaryAuthorityId && value.IsPrimary
            && value.Domain == domain && value.RevokedAtUtc == null, token)) throw Error("trial_delegate_revoked", "The designating primary authority is no longer active.", 403);
        return authority;
    }
    public static OrderManagementException Missing() => Error("trial_not_found", "The Trial was not found.", 404);
    public static OrderManagementException Error(string code, string message, int status = 400) => new(code, message, status);
    public static void Version(long current, long requested) { if (current != requested) throw Error("trial_version_conflict", "This Trial changed. Reload it and review your entries before retrying.", 409); }
}
