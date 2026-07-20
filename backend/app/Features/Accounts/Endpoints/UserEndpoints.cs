namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PhaenoPortal.App.Common.Exceptions.Accounts;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
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

    public static async Task<IResult> ListPhaenoUsers(
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null || !await CanManagePhaenoUserRolesAsync(actor, dbContext, cancellationToken))
        {
            return TypedResults.Forbid();
        }

        var memberships = await dbContext.OrganizationMemberships
            .AsNoTracking()
            .Include(membership => membership.User)
            .Include(membership => membership.Organization)
            .Where(membership =>
                membership.Organization != null
                && membership.Organization.Kind == OrganizationKind.Phaeno)
            .OrderBy(membership => membership.User!.LastName)
            .ThenBy(membership => membership.User!.FirstName)
            .ToListAsync(cancellationToken);

        var userIds = memberships.Select(membership => membership.UserId).ToList();
        var assignments = await dbContext.LabRoleAssignments
            .AsNoTracking()
            .Where(assignment => userIds.Contains(assignment.UserId))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(memberships
            .Where(membership => membership.User != null)
            .Select(membership => ToPhaenoUserDto(
                membership.User!,
                membership,
                assignments.Where(assignment => assignment.UserId == membership.UserId)))
            .ToList());
    }

    public static async Task<IResult> UpdatePhaenoUser(
        Guid id,
        [FromBody] UpdatePhaenoUserRequest request,
        HttpContext httpContext,
        PSeqOperationsDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);

        if (actor == null || !await CanManagePhaenoUserRolesAsync(actor, dbContext, cancellationToken))
        {
            return TypedResults.Forbid();
        }

        var user = await dbContext.Users
            .Include(value => value.Memberships)
            .ThenInclude(membership => membership.Organization)
            .SingleOrDefaultAsync(value => value.Id == id, cancellationToken)
            ?? throw new UserNotFoundException(id);
        var membership = user.Memberships.SingleOrDefault(value =>
            value.Organization is { Kind: OrganizationKind.Phaeno })
            ?? throw new BadRequestException("The user is not a Phaeno organization member.");

        if (user.Version != request.UserVersion || membership.Version != request.MembershipVersion)
        {
            throw new DbUpdateConcurrencyException();
        }

        if (request.LabRoles.Select(value => value.Role).Distinct().Count()
            != request.LabRoles.Count)
        {
            throw new BadRequestException("A laboratory role cannot appear more than once.");
        }

        var requestedRoles = request.LabRoles.ToDictionary(value => value.Role);
        var allRoles = Enum.GetValues<LabRole>();
        if (requestedRoles.Count != allRoles.Length
            || allRoles.Any(role => !requestedRoles.ContainsKey(role)))
        {
            throw new BadRequestException("Every laboratory role must be included in the update.");
        }

        var isPlatformAdministrator = AccountAuthorization.IsPlatformAdmin(actor);
        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        if (firstName.Length is 0 or > 100 || lastName.Length is 0 or > 100)
        {
            throw new BadRequestException("First and last name are required and cannot exceed 100 characters.");
        }

        if (!isPlatformAdministrator
            && (!string.Equals(firstName, user.FirstName, StringComparison.Ordinal)
                || !string.Equals(lastName, user.LastName, StringComparison.Ordinal)
                || request.IsPlatformAdministrator != membership.IsOrganizationAdmin))
        {
            return TypedResults.Forbid();
        }

        if (request.IsPlatformAdministrator != membership.IsOrganizationAdmin)
        {
            if (membership.IsOrganizationAdmin && !request.IsPlatformAdministrator)
            {
                await EnsureNotLastActivePlatformAdminAsync(dbContext, cancellationToken);
            }

            var previousValue = membership.IsOrganizationAdmin;
            membership.SetOrganizationAdmin(request.IsPlatformAdministrator);
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
                    OldIsOrganizationAdmin = previousValue,
                    NewIsOrganizationAdmin = membership.IsOrganizationAdmin
                });
        }

        if (!string.Equals(firstName, user.FirstName, StringComparison.Ordinal)
            || !string.Equals(lastName, user.LastName, StringComparison.Ordinal))
        {
            var previousFirstName = user.FirstName;
            var previousLastName = user.LastName;
            user.UpdateProfile(firstName, lastName);
            AccountAudit.Add(
                dbContext,
                httpContext,
                nameof(User),
                user.Id,
                AccountAudit.UserProfileUpdated,
                membership.OrganizationId,
                actor.Id,
                new
                {
                    OldFirstName = previousFirstName,
                    NewFirstName = firstName,
                    OldLastName = previousLastName,
                    NewLastName = lastName
                });
        }

        var assignments = await dbContext.LabRoleAssignments
            .Where(assignment => assignment.UserId == user.Id)
            .ToListAsync(cancellationToken);
        foreach (var role in allRoles)
        {
            var requestedRole = requestedRoles[role];
            var assignment = assignments.SingleOrDefault(value => value.Role == role);
            if (assignment?.Version != requestedRole.Version)
            {
                throw new DbUpdateConcurrencyException();
            }

            if (requestedRole.IsActive
                && user is not { IsActive: true, Status: UserAccountStatus.Active })
            {
                throw new BadRequestException(
                    "Laboratory roles can be assigned only to active Phaeno users.");
            }

            if (assignment == null)
            {
                if (!requestedRole.IsActive)
                {
                    continue;
                }

                assignment = new LabRoleAssignment(user.Id, role);
                dbContext.LabRoleAssignments.Add(assignment);
                assignments.Add(assignment);
                continue;
            }

            assignment.SetActive(requestedRole.IsActive);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToPhaenoUserDto(user, membership, assignments));
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

        group.MapGet("/phaeno", ListPhaenoUsers)
            .WithName("ListPhaenoUsers")
            .WithSummary("List Phaeno users and their effective role assignments")
            .Produces<List<PhaenoUserAdministrationDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapPut("/{id:guid}/phaeno", UpdatePhaenoUser)
            .WithName("UpdatePhaenoUser")
            .WithSummary("Update a Phaeno user's profile and role assignments")
            .Produces<PhaenoUserAdministrationDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/{id:guid}", GetUser)
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

        group.MapPost("/{id:guid}/disable", DisableUser)
            .WithName("DisableUser")
            .WithSummary("Globally disable a user")
            .Produces<UserDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/reactivate", ReactivateUser)
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

    private static async Task<bool> CanManagePhaenoUserRolesAsync(
        User actor,
        PSeqOperationsDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (AccountAuthorization.IsPlatformAdmin(actor))
        {
            return true;
        }

        return LabOperationsAuthorization.IsEligibleLabStaff(actor)
            && await LabOperationsAuthorization.ActiveAssignmentsFor(
                dbContext.LabRoleAssignments.AsNoTracking(), actor.Id)
            .AnyAsync(
                assignment => assignment.Role == LabRole.OperationsAdministrator,
                cancellationToken);
    }

    private static PhaenoUserAdministrationDto ToPhaenoUserDto(
        User user,
        OrganizationMembership membership,
        IEnumerable<LabRoleAssignment> assignments)
    {
        var assignmentsByRole = assignments.ToDictionary(value => value.Role);
        return new PhaenoUserAdministrationDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            Status = user.Status,
            IsPlatformAdministrator = membership.IsOrganizationAdmin,
            MembershipId = membership.Id,
            UserVersion = user.Version,
            MembershipVersion = membership.Version,
            LabRoles = Enum.GetValues<LabRole>()
                .Select(role =>
                {
                    assignmentsByRole.TryGetValue(role, out var assignment);
                    return new PhaenoLabRoleStateDto
                    {
                        Role = role,
                        IsActive = assignment?.IsActive == true,
                        Version = assignment?.Version
                    };
                })
                .ToList()
        };
    }
}
