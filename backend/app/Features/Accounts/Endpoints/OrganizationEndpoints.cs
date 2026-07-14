namespace PhaenoPortal.App.Features.Accounts.Endpoints;

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Common.Exceptions.Accounts;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
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
    public static async Task<IResult> CreateOrganization(
        [FromBody] CreateOrganizationRequest request,
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null || !AccountAccess.IsPlatformAdmin(actor))
        {
            return TypedResults.Forbid();
        }

        if (request.Kind == OrganizationKind.Phaeno)
        {
            throw new OrganizationKindNotAllowedException(
                "New tenant organizations must be a Prospect, Customer, or Partner.");
        }

        // Check if organization already exists
        var existingOrg = await dbContext.Organizations
            .FirstOrDefaultAsync(o => o.Name == request.Name, cancellationToken);

        if (existingOrg != null)
        {
            throw new OrganizationAlreadyExistsException(request.Name);
        }

        var organization = new Organization(request.Name, request.Kind, request.Description);

        dbContext.Organizations.Add(organization);
        await dbContext.SaveChangesAsync(cancellationToken);

        var dto = new OrganizationDto
        {
            Id = organization.Id,
            Name = organization.Name,
            Description = organization.Description,
            Kind = organization.Kind,
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
    public static async Task<IResult> GetOrganization(
        Guid id,
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var organization = await dbContext.Organizations.FindAsync([id], cancellationToken);

        if (organization == null)
        {
            throw new OrganizationNotFoundException(id);
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null
            || (!AccountAccess.IsPlatformAdmin(actor)
                && !AccountAccess.HasActiveMembership(actor, organization.Id)))
        {
            return TypedResults.Forbid();
        }

        var dto = new OrganizationDto
        {
            Id = organization.Id,
            Name = organization.Name,
            Description = organization.Description,
            Kind = organization.Kind,
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
    public static async Task<IResult> ListOrganizations(
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        [FromQuery] bool includeInactive = false)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            httpContext.RequestAborted);
        if (actor == null || !AccountAccess.IsPlatformAdmin(actor))
        {
            return TypedResults.Forbid();
        }

        var query = dbContext.Organizations.AsQueryable();
        if (!includeInactive)
        {
            query = query.Where(o => o.IsActive);
        }

        var organizations = await query
            .OrderBy(o => o.Name)
            .ToListAsync(httpContext.RequestAborted);

        var dtos = organizations.Select(o => new OrganizationDto
        {
            Id = o.Id,
            Name = o.Name,
            Description = o.Description,
            Kind = o.Kind,
            IsActive = o.IsActive,
            CreatedAt = o.CreatedAt,
            UpdatedAt = o.UpdatedAt,
            Version = o.Version
        }).ToList();

        return TypedResults.Ok(dtos);
    }

    public static async Task<IResult> DeactivateOrganization(
        Guid id,
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var organization = await dbContext.Organizations.FindAsync([id], cancellationToken);
        if (organization == null)
        {
            throw new OrganizationNotFoundException(id);
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null || !AccountAccess.IsPlatformAdmin(actor))
        {
            return TypedResults.Forbid();
        }

        var wasActive = organization.IsActive;
        organization.Deactivate();
        if (wasActive)
        {
            AccountAudit.Add(
                dbContext,
                httpContext,
                nameof(Organization),
                organization.Id,
                AccountAudit.OrganizationDeactivated,
                organization.Id,
                actor.Id,
                new
                {
                    organization.Name,
                    organization.Kind
                });
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(organization));
    }

    public static async Task<IResult> ReactivateOrganization(
        Guid id,
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var organization = await dbContext.Organizations.FindAsync([id], cancellationToken);
        if (organization == null)
        {
            throw new OrganizationNotFoundException(id);
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null || !AccountAccess.IsPlatformAdmin(actor))
        {
            return TypedResults.Forbid();
        }

        var wasInactive = !organization.IsActive;
        organization.Activate();
        if (wasInactive)
        {
            AccountAudit.Add(
                dbContext,
                httpContext,
                nameof(Organization),
                organization.Id,
                AccountAudit.OrganizationReactivated,
                organization.Id,
                actor.Id,
                new
                {
                    organization.Name,
                    organization.Kind
                });
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToDto(organization));
    }

    public static async Task<IResult> ConvertProspect(
        Guid id,
        [FromBody] ConvertOrganizationRequest request,
        HttpContext httpContext,
        AppDbContext dbContext,
        IExternalIdentityContext externalIdentityContext,
        CancellationToken cancellationToken)
    {
        var organization = await dbContext.Organizations.FindAsync([id], cancellationToken);
        if (organization == null)
        {
            throw new OrganizationNotFoundException(id);
        }

        var actor = await AccountAccess.ReadActiveActorAsync(
            httpContext,
            dbContext,
            externalIdentityContext,
            cancellationToken);
        if (actor == null || !AccountAccess.IsPlatformAdmin(actor))
        {
            return TypedResults.Forbid();
        }

        if (organization.Version != request.Version)
        {
            throw new DbUpdateConcurrencyException();
        }

        if (!organization.IsProspect())
        {
            throw new OrganizationConversionException("Only a Prospect organization can be converted.");
        }

        if (request.TargetKind is not (OrganizationKind.Customer or OrganizationKind.Partner))
        {
            throw new OrganizationConversionException(
                "A Prospect can be converted only to a Customer or Partner.");
        }

        var priorKind = organization.Kind;
        organization.ConvertProspectTo(request.TargetKind);
        AccountAudit.Add(
            dbContext,
            httpContext,
            nameof(Organization),
            organization.Id,
            AccountAudit.ProspectConverted,
            organization.Id,
            actor.Id,
            new
            {
                priorKind,
                targetKind = organization.Kind,
                preservedDatasetGrants = true
            });

        await dbContext.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(ToDto(organization));
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
            .RequireAuthorization()
            .Produces<OrganizationDto>(StatusCodes.Status201Created)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/{id}", GetOrganization)
            .WithName("GetOrganization")
            .WithSummary("Get organization by ID")
            .RequireAuthorization()
            .Produces<OrganizationDto>(StatusCodes.Status200OK)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapGet("/", ListOrganizations)
            .WithName("ListOrganizations")
            .WithSummary("List all organizations")
            .RequireAuthorization()
            .Produces<List<OrganizationDto>>(StatusCodes.Status200OK);

        group.MapPost("/{id}/deactivate", DeactivateOrganization)
            .WithName("DeactivateOrganization")
            .WithSummary("Mark an organization inactive")
            .RequireAuthorization()
            .Produces<OrganizationDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/{id}/reactivate", ReactivateOrganization)
            .WithName("ReactivateOrganization")
            .WithSummary("Reactivate an inactive organization")
            .RequireAuthorization()
            .Produces<OrganizationDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);

        group.MapPost("/{id}/convert", ConvertProspect)
            .WithName("ConvertProspect")
            .WithSummary("Convert a Prospect organization to a Customer or Partner")
            .RequireAuthorization()
            .Produces<OrganizationDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces<ApiResponse<object>>(StatusCodes.Status409Conflict);
    }

    private static OrganizationDto ToDto(Organization organization)
    {
        return new OrganizationDto
        {
            Id = organization.Id,
            Name = organization.Name,
            Description = organization.Description,
            Kind = organization.Kind,
            IsActive = organization.IsActive,
            CreatedAt = organization.CreatedAt,
            UpdatedAt = organization.UpdatedAt,
            Version = organization.Version
        };
    }
}
