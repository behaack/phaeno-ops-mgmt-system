namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Common.Exceptions.Accounts;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>
/// Endpoints for managing users.
/// </summary>
public static class UserEndpoints
{
    /// <summary>
    /// Retrieves a user by ID.
    /// </summary>
    public static async Task<IResult> GetUser(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var user = await LoadUserAsync(dbContext, id, cancellationToken);
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null)
        {
            return TypedResults.Forbid();
        }

        if (actor.Id != user.Id && !AccountAuthorization.IsPlatformAdmin(actor))
        {
            return TypedResults.Forbid();
        }

        return TypedResults.Ok(ToDto(user));
    }

    /// <summary>
    /// Lists all users in an organization.
    /// </summary>
    public static async Task<IResult> ListUsersInOrganization(
        Guid organizationId,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var organization = await dbContext.Organizations.FindAsync([organizationId], cancellationToken);
        if (organization == null)
        {
            throw new OrganizationNotFoundException(organizationId);
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null)
        {
            return TypedResults.Forbid();
        }

        var isPlatformAdmin = AccountAuthorization.IsPlatformAdmin(actor);
        if (!AccountAuthorization.CanManageOrganizationMembers(actor, organization.Id, organization.Kind))
        {
            return TypedResults.Forbid();
        }

        var query = dbContext.OrganizationMemberships
            .Where(m => m.OrganizationId == organizationId);

        if (!includeInactive)
        {
            query = query.Where(m =>
                m.IsActive
                && m.User != null
                && m.User.IsActive
                && m.User.Status == UserAccountStatus.Active);
        }

        var users = await query
            .Include(m => m.User)
            .ThenInclude(u => u!.Memberships)
            .ThenInclude(m => m.Organization)
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.User!)
            .ToListAsync(cancellationToken);

        var dtos = users
            .Select(user => ToDto(user, isPlatformAdmin ? null : organizationId))
            .ToList();

        return TypedResults.Ok(dtos);
    }

    public static async Task<IResult> DisableUser(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var user = await LoadUserAsync(dbContext, id, cancellationToken);
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null || !AccountAuthorization.IsPlatformAdmin(actor))
        {
            return TypedResults.Forbid();
        }

        if (AccountAuthorization.IsPlatformAdmin(user))
        {
            await EnsureNotLastActivePlatformAdminAsync(dbContext, cancellationToken);
        }

        var wasEnabled = user.IsActive || user.Status != UserAccountStatus.Disabled;
        user.Deactivate();
        if (wasEnabled)
        {
            AccountAudit.Add(
                dbContext,
                httpContext,
                nameof(User),
                user.Id,
                AccountAudit.UserDisabled,
                null,
                actor.Id,
                new
                {
                    user.Email,
                    user.NormalizedEmail
                });
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(user));
    }

    public static async Task<IResult> ReactivateUser(
        Guid id,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var user = await LoadUserAsync(dbContext, id, cancellationToken);
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null || !AccountAuthorization.IsPlatformAdmin(actor))
        {
            return TypedResults.Forbid();
        }

        var wasDisabled = !user.IsActive || user.Status != UserAccountStatus.Active;
        user.Activate();
        if (wasDisabled)
        {
            AccountAudit.Add(
                dbContext,
                httpContext,
                nameof(User),
                user.Id,
                AccountAudit.UserReactivated,
                null,
                actor.Id,
                new
                {
                    user.Email,
                    user.NormalizedEmail
                });
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(user));
    }

    private static UserDto ToDto(User user, Guid? membershipOrganizationScope = null)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            NormalizedEmail = user.NormalizedEmail,
            ExternalIdentityProvider = user.ExternalIdentityProvider,
            ExternalSubjectId = user.ExternalSubjectId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            Status = user.Status,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastLoginAt = user.LastLoginAt,
            Memberships = user.Memberships
                .Where(m => !membershipOrganizationScope.HasValue
                    || m.OrganizationId == membershipOrganizationScope.Value)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new OrganizationMembershipDto
                {
                    Id = m.Id,
                    OrganizationId = m.OrganizationId,
                    OrganizationName = m.Organization?.Name,
                    OrganizationKind = m.Organization?.Kind,
                    IsActive = m.IsActive,
                    IsOrganizationAdmin = m.IsOrganizationAdmin,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt,
                    Version = m.Version
                })
                .ToList(),
            Version = user.Version
        };
    }

    /// <summary>
    /// Maps user endpoints to the application.
    /// </summary>
    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization();

        group.MapGet("/{id}", GetUser)
            .WithName("GetUser")
            .WithSummary("Get user by ID")
            .Produces<UserDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/organization/{organizationId}", ListUsersInOrganization)
            .WithName("ListUsersInOrganization")
            .WithSummary("List all users in an organization")
            .Produces<List<UserDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/{id}/disable", DisableUser)
            .WithName("DisableUser")
            .WithSummary("Globally disable a user")
            .Produces<UserDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/{id}/reactivate", ReactivateUser)
            .WithName("ReactivateUser")
            .WithSummary("Globally reactivate a user")
            .Produces<UserDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);
    }

    private static async Task<User> LoadUserAsync(
        PSeqOperationsDbContext dbContext,
        Guid id,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .Include(u => u.Memberships)
            .ThenInclude(m => m.Organization)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            throw new UserNotFoundException(id);
        }

        return user;
    }

    private static async Task EnsureNotLastActivePlatformAdminAsync(
        PSeqOperationsDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var platformAdminCount = await dbContext.OrganizationMemberships
            .Where(m => m.IsActive && m.IsOrganizationAdmin)
            .Where(m => m.Organization != null
                && m.Organization.IsActive
                && m.Organization.Kind == OrganizationKind.Phaeno)
            .Where(m => m.User != null
                && m.User.IsActive
                && m.User.Status == UserAccountStatus.Active)
            .CountAsync(cancellationToken);

        if (platformAdminCount <= 1)
        {
            throw new BadRequestException("Cannot disable the last active platform admin.");
        }
    }
}
