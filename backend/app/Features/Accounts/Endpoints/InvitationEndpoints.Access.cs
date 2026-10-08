namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public static partial class InvitationEndpoints
{
    public static async Task<IResult> UpdateInvitationAccess(Guid id,
        [FromBody] UpdateInvitationAccessRequest request, HttpContext httpContext,
        PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(httpContext, dbContext, externalIdentityContext, cancellationToken);
        var invitation = await dbContext.OrganizationInvitations.Include(value => value.Organization)
            .SingleOrDefaultAsync(value => value.Id == id, cancellationToken);
        if (actor is null || invitation?.Organization is null
            || !AccountAuthorization.CanInviteToOrganization(actor, invitation.OrganizationId, invitation.Organization.Kind))
            return TypedResults.Forbid();
        if (!invitation.Organization.IsActive || invitation.Organization.IsPhaeno())
            throw new BadRequestException("Edit invited access is available only for an active external Company.");
        if (invitation.Status != InvitationStatus.Pending || invitation.Version != request.Version)
            throw new DbUpdateConcurrencyException("The invitation changed. Reload it before editing its access.");
        if (request.Departments is null || request.Departments.GroupBy(value => value.DepartmentId).Any(group => group.Count() > 1))
            throw new BadRequestException("Select each department only once.");
        var departments = await dbContext.OrganizationDepartments
            .Where(value => value.OrganizationId == invitation.OrganizationId && value.IsActive
                && (request.IsOrganizationAdmin ? value.IsDefault : request.Departments.Select(item => item.DepartmentId).Contains(value.Id)))
            .OrderByDescending(value => value.IsDefault).ThenBy(value => value.Name).ToListAsync(cancellationToken);
        if (departments.Count == 0 || departments.Count != (request.IsOrganizationAdmin ? 1 : request.Departments.Count))
            throw new BadRequestException("Select one or more active departments in this Company.");
        var current = await dbContext.OrganizationInvitationDepartments
            .Where(value => value.OrganizationInvitationId == id).ToListAsync(cancellationToken);
        var desired = departments.Select(value => new InvitationDepartmentDto(value.Id, value.Name,
            !request.IsOrganizationAdmin && request.Departments.Single(item => item.DepartmentId == value.Id).IsDepartmentAdmin)).ToList();
        var changed = invitation.IsOrganizationAdmin != request.IsOrganizationAdmin
            || current.Count != desired.Count || current.Any(value => !desired.Any(item =>
                item.DepartmentId == value.DepartmentId && item.IsDepartmentAdmin == value.IsDepartmentAdmin));
        if (changed)
        {
            var before = new { invitation.IsOrganizationAdmin, Departments = current.Select(value => new { value.DepartmentId, value.IsDepartmentAdmin }).ToArray() };
            invitation.UpdateIntent(invitation.FirstName, invitation.LastName, request.IsOrganizationAdmin, invitation.CrmContactId);
            // Department-only edits must advance the invitation version too, fencing acceptance/resend races.
            dbContext.Entry(invitation).Property(value => value.IsOrganizationAdmin).IsModified = true;
            foreach (var stale in current.Where(value => desired.All(item => item.DepartmentId != value.DepartmentId)))
                dbContext.OrganizationInvitationDepartments.Remove(stale);
            foreach (var intent in desired)
            {
                var existing = current.SingleOrDefault(value => value.DepartmentId == intent.DepartmentId);
                if (existing is null) dbContext.OrganizationInvitationDepartments.Add(new(id, intent.DepartmentId, intent.IsDepartmentAdmin));
                else existing.SetDepartmentAdmin(intent.IsDepartmentAdmin);
            }
            AccountAudit.Add(dbContext, httpContext, nameof(OrganizationInvitation), id, AccountAudit.InviteAccessUpdated,
                invitation.OrganizationId, actor.Id, new { Before = before, After = new { request.IsOrganizationAdmin, Departments = desired } });
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        var delivery = await dbContext.InvitationDeliveryAttempts.AsNoTracking()
            .Where(value => value.OrganizationInvitationId == id).OrderByDescending(value => value.QueuedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        return TypedResults.Ok(ToDto(invitation, DateTime.UtcNow,
            await ReadIntendedLabRolesAsync(dbContext, id, cancellationToken), delivery,
            await ReadIntendedBusinessRolesAsync(dbContext, id, cancellationToken), desired));
    }

    private static async Task<IReadOnlyList<InvitationDepartmentDto>> ReadDepartmentIntentAsync(
        PSeqOperationsDbContext dbContext, Guid invitationId, CancellationToken cancellationToken) =>
        await dbContext.OrganizationInvitationDepartments.AsNoTracking()
            .Where(value => value.OrganizationInvitationId == invitationId)
            .OrderBy(value => value.Department.Name)
            .Select(value => new InvitationDepartmentDto(value.DepartmentId, value.Department.Name, value.IsDepartmentAdmin))
            .ToListAsync(cancellationToken);
}
