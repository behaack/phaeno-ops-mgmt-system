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
/// Endpoints for managing organizations.
/// </summary>
public static class OrganizationEndpoints
{
    /// <summary>
    /// Creates a new organization.
    /// </summary>
    public static async Task<Created<OrganizationDto>> CreateOrganization(
        [FromBody] CreateOrganizationRequest request,
        AppDbContext dbContext)
    {
        // Check if organization already exists
        var existingOrg = await dbContext.Organizations
            .FirstOrDefaultAsync(o => o.Name == request.Name);

        if (existingOrg != null)
        {
            throw new OrganizationAlreadyExistsException(request.Name);
        }

        var organization = new Organization(request.Name, request.Description);

        dbContext.Organizations.Add(organization);
        await dbContext.SaveChangesAsync();

        var dto = new OrganizationDto
        {
            Id = organization.Id,
            Name = organization.Name,
            Description = organization.Description,
            IsActive = organization.IsActive,
            CreatedAt = organization.CreatedAt,
            UpdatedAt = organization.UpdatedAt,
            Version = organization.Version
        };

        return TypedResults.Created($"/api/organizations/{organization.Id}", dto);
    }

    /// <summary>
    /// Retrieves an organization by ID.
    /// </summary>
    public static async Task<Ok<OrganizationDto>?> GetOrganization(
        Guid id,
        AppDbContext dbContext)
    {
        var organization = await dbContext.Organizations.FindAsync(id);

        if (organization == null)
        {
            throw new OrganizationNotFoundException(id);
        }

        var dto = new OrganizationDto
        {
            Id = organization.Id,
            Name = organization.Name,
            Description = organization.Description,
            IsActive = organization.IsActive,
            CreatedAt = organization.CreatedAt,
            UpdatedAt = organization.UpdatedAt,
            Version = organization.Version
        };

        return TypedResults.Ok(dto);
    }

    /// <summary>
    /// Lists all organizations.
    /// </summary>
    public static async Task<Ok<List<OrganizationDto>>> ListOrganizations(
        AppDbContext dbContext)
    {
        var organizations = await dbContext.Organizations
            .OrderBy(o => o.CreatedAt)
            .ToListAsync();

        var dtos = organizations.Select(o => new OrganizationDto
        {
            Id = o.Id,
            Name = o.Name,
            Description = o.Description,
            IsActive = o.IsActive,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt,
            Version = o.Version
        }).ToList();

        return TypedResults.Ok(dtos);
    }

    /// <summary>
    /// Maps organization endpoints to the application.
    /// </summary>
    public static void MapOrganizationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/organizations")
            .WithTags("Organizations");

        group.MapPost("/", CreateOrganization)
            .WithName("CreateOrganization")
            .WithSummary("Create a new organization")
            .Produces<OrganizationDto>(StatusCodes.Status201Created)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/{id}", GetOrganization)
            .WithName("GetOrganization")
            .WithSummary("Get organization by ID")
            .Produces<OrganizationDto>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/", ListOrganizations)
            .WithName("ListOrganizations")
            .WithSummary("List all organizations")
            .Produces<List<OrganizationDto>>(StatusCodes.Status200OK);
    }
}
