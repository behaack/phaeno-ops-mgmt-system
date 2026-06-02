namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Common.Exceptions.Accounts;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Infrastructure.Persistence;

/// <summary>
/// Endpoints for managing users.
/// </summary>
public static class UserEndpoints
{
    /// <summary>
    /// Creates a new user.
    /// </summary>
    public static async Task<Created<UserDto>> CreateUser(
        [FromBody] CreateUserRequest request,
        AppDbContext dbContext)
    {
        // Verify organization exists
        var organization = await dbContext.Organizations.FindAsync(request.OrganizationId);
        if (organization == null)
        {
            throw new OrganizationNotFoundException(request.OrganizationId);
        }

        // Check if user already exists
        var existingUser = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (existingUser != null)
        {
            throw new UserAlreadyExistsException(request.Email);
        }

        var user = new User(
            request.OrganizationId,
            request.Email,
            request.FirstName,
            request.LastName,
            request.IsOrganizationAdmin);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        var dto = new UserDto
        {
            Id = user.Id,
            OrganizationId = user.OrganizationId,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            IsOrganizationAdmin = user.IsOrganizationAdmin,
            Status = user.Status,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastLoginAt = user.LastLoginAt,
            InvitedAt = user.InvitedAt,
            InvitedByUserId = user.InvitedByUserId,
            InvitationAcceptedAt = user.InvitationAcceptedAt,
            Version = user.Version
        };

        return TypedResults.Created($"/api/users/{user.Id}", dto);
    }

    /// <summary>
    /// Retrieves a user by ID.
    /// </summary>
    public static async Task<Ok<UserDto>?> GetUser(
        Guid id,
        AppDbContext dbContext)
    {
        var user = await dbContext.Users.FindAsync(id);

        if (user == null)
        {
            throw new UserNotFoundException(id);
        }

        var dto = new UserDto
        {
            Id = user.Id,
            OrganizationId = user.OrganizationId,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            IsOrganizationAdmin = user.IsOrganizationAdmin,
            Status = user.Status,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastLoginAt = user.LastLoginAt,
            InvitedAt = user.InvitedAt,
            InvitedByUserId = user.InvitedByUserId,
            InvitationAcceptedAt = user.InvitationAcceptedAt,
            Version = user.Version
        };

        return TypedResults.Ok(dto);
    }

    /// <summary>
    /// Lists all users in an organization.
    /// </summary>
    public static async Task<Ok<List<UserDto>>> ListUsersInOrganization(
        Guid organizationId,
        AppDbContext dbContext)
    {
        // Verify organization exists
        var organization = await dbContext.Organizations.FindAsync(organizationId);
        if (organization == null)
        {
            throw new OrganizationNotFoundException(organizationId);
        }

        var users = await dbContext.Users
            .Where(u => u.OrganizationId == organizationId)
            .OrderBy(u => u.CreatedAt)
            .ToListAsync();

        var dtos = users.Select(u => new UserDto
        {
            Id = u.Id,
            OrganizationId = u.OrganizationId,
            Email = u.Email,
            FirstName = u.FirstName,
            LastName = u.LastName,
            IsActive = u.IsActive,
            IsOrganizationAdmin = u.IsOrganizationAdmin,
            Status = u.Status,
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt,
            LastLoginAt = u.LastLoginAt,
            InvitedAt = u.InvitedAt,
            InvitedByUserId = u.InvitedByUserId,
            InvitationAcceptedAt = u.InvitationAcceptedAt,
            Version = u.Version
        }).ToList();

        return TypedResults.Ok(dtos);
    }

    /// <summary>
    /// Maps user endpoints to the application.
    /// </summary>
    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users");

        group.MapPost("/", CreateUser)
            .WithName("CreateUser")
            .WithSummary("Create a new user")
            .Produces<UserDto>(StatusCodes.Status201Created)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/{id}", GetUser)
            .WithName("GetUser")
            .WithSummary("Get user by ID")
            .Produces<UserDto>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/organization/{organizationId}", ListUsersInOrganization)
            .WithName("ListUsersInOrganization")
            .WithSummary("List all users in an organization")
            .Produces<List<UserDto>>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);
    }
}
