namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class MembershipEndpoints
{
    public static async Task<IResult> UpdateMembershipRole(
        Guid id,
        [FromBody] UpdateMembershipRoleRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var membership = await LoadMembershipAsync(dbContext, id, cancellationToken);
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null || !CanManageMembership(actor, membership))
        {
            return TypedResults.Forbid();
        }

        if (!membership.IsActive)
        {
            throw new BadRequestException("Inactive memberships cannot be changed.");
        }

        if (membership.IsOrganizationAdmin && !request.IsOrganizationAdmin)
        {
            await EnsureNotLastActiveOrganizationAdminAsync(dbContext, membership, cancellationToken);
        }

        var previousIsOrganizationAdmin = membership.IsOrganizationAdmin;
        membership.SetOrganizationAdmin(request.IsOrganizationAdmin);
        if (previousIsOrganizationAdmin != membership.IsOrganizationAdmin)
        {
            AccountAudit.Add(
                dbContext,
                httpContext,
                nameof(OrganizationMembership),
                membership.Id,
                AccountAudit.MembershipRoleChanged,
                membership.OrganizationId,
                actor.Id,
                new
                {
                    membership.UserId,
                    membership.OrganizationId,
                    OldIsOrganizationAdmin = previousIsOrganizationAdmin,
                    NewIsOrganizationAdmin = membership.IsOrganizationAdmin
                });
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(membership));
    }

    public static async Task<IResult> DeactivateMembership(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var membership = await LoadMembershipAsync(dbContext, id, cancellationToken);
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null || !CanManageMembership(actor, membership))
        {
            return TypedResults.Forbid();
        }

        if (!membership.IsActive)
        {
            return TypedResults.Ok(ToDto(membership));
        }

        if (membership.IsOrganizationAdmin)
        {
            await EnsureNotLastActiveOrganizationAdminAsync(dbContext, membership, cancellationToken);
        }

        membership.Deactivate();
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationMembership),
            membership.Id,
            AccountAudit.MembershipDeactivated,
            membership.OrganizationId,
            actor.Id,
            new
            {
                membership.UserId,
                membership.OrganizationId,
                membership.IsOrganizationAdmin
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(membership));
    }

    public static async Task<IResult> LeaveMembership(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var membership = await LoadMembershipAsync(dbContext, id, cancellationToken);
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null || membership.UserId != actor.Id)
        {
            return TypedResults.Forbid();
        }

        if (!membership.IsActive)
        {
            return TypedResults.Ok(ToDto(membership));
        }

        if (membership.IsOrganizationAdmin)
        {
            await EnsureNotLastActiveOrganizationAdminAsync(dbContext, membership, cancellationToken);
        }

        membership.Deactivate();
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(OrganizationMembership),
            membership.Id,
            AccountAudit.MembershipLeft,
            membership.OrganizationId,
            actor.Id,
            new
            {
                membership.UserId,
                membership.OrganizationId,
                membership.IsOrganizationAdmin
            });
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(membership));
    }

    public static void MapMembershipEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/memberships")
            .WithTags("Memberships")
            .RequireAuthorization();

        group.MapPatch("/{id}/role", UpdateMembershipRole)
            .WithName("UpdateMembershipRole")
            .WithSummary("Promote or demote a member inside an organization")
            .Produces<MembershipDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/{id}/deactivate", DeactivateMembership)
            .WithName("DeactivateMembership")
            .WithSummary("Mark an organization membership inactive")
            .Produces<MembershipDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/{id}/leave", LeaveMembership)
            .WithName("LeaveMembership")
            .WithSummary("Leave an organization")
            .Produces<MembershipDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);
    }

    private static async Task<OrganizationMembership> LoadMembershipAsync(
        PSeqOperationsDbContext dbContext,
        Guid id,
        CancellationToken cancellationToken)
    {
        var membership = await dbContext.OrganizationMemberships
            .Include(m => m.User)
            .Include(m => m.Organization)
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

        if (membership == null)
        {
            throw new BadRequestException("Membership not found.");
        }

        return membership;
    }

    private static bool CanManageMembership(User actor, OrganizationMembership membership)
    {
        if (membership.Organization == null)
        {
            return false;
        }

        return AccountAuthorization.CanManageOrganizationMembers(
            actor,
            membership.OrganizationId,
            membership.Organization.Kind);
    }

    private static async Task EnsureNotLastActiveOrganizationAdminAsync(
        PSeqOperationsDbContext dbContext,
        OrganizationMembership membership,
        CancellationToken cancellationToken)
    {
        var activeAdminCount = await dbContext.OrganizationMemberships
            .CountAsync(
                m => m.OrganizationId == membership.OrganizationId
                    && m.IsActive
                    && m.IsOrganizationAdmin,
                cancellationToken);

        if (activeAdminCount <= 1)
        {
            throw new BadRequestException("Cannot remove or demote the last active organization admin.");
        }
    }

    private static MembershipDto ToDto(OrganizationMembership membership)
    {
        return new MembershipDto
        {
            Id = membership.Id,
            UserId = membership.UserId,
            UserEmail = membership.User?.Email ?? string.Empty,
            UserFirstName = membership.User?.FirstName ?? string.Empty,
            UserLastName = membership.User?.LastName ?? string.Empty,
            OrganizationId = membership.OrganizationId,
            OrganizationName = membership.Organization?.Name ?? string.Empty,
            OrganizationKind = membership.Organization?.Kind ?? OrganizationKind.Customer,
            IsActive = membership.IsActive,
            IsOrganizationAdmin = membership.IsOrganizationAdmin,
            CreatedAt = membership.CreatedAt,
            UpdatedAt = membership.UpdatedAt,
            Version = membership.Version
        };
    }
}
