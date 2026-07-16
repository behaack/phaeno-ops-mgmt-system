namespace PhaenoPortal.App.Features.RelationshipManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.RelationshipManagement.Domain;
using PhaenoPortal.App.Features.RelationshipManagement.DTOs;
using PhaenoPortal.App.Features.RelationshipManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/relationships")]
public sealed class RelationshipManagementController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet("organizations/{organizationId:guid}/summary")]
    public async Task<OrganizationRelationshipSummaryDto> GetOrganizationSummary(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var organization = await RequireOrganizationAsync(organizationId, cancellationToken);
        var now = DateTime.UtcNow;
        var activeMembers = await dbContext.OrganizationMemberships
            .CountAsync(value => value.OrganizationId == organizationId && value.IsActive, cancellationToken);
        var hasActiveAdmin = await dbContext.OrganizationMemberships
            .AnyAsync(value => value.OrganizationId == organizationId
                && value.IsActive
                && value.IsOrganizationAdmin
                && value.User != null
                && value.User.IsActive
                && value.User.Status == UserAccountStatus.Active,
                cancellationToken);
        var pendingInvitations = await dbContext.OrganizationInvitations
            .CountAsync(value => value.OrganizationId == organizationId
                && value.Status == InvitationStatus.Pending
                && value.ExpiresAt > now,
                cancellationToken);
        var hasPendingAdminInvitation = await dbContext.OrganizationInvitations
            .AnyAsync(value => value.OrganizationId == organizationId
                && value.Status == InvitationStatus.Pending
                && value.IsOrganizationAdmin
                && value.ExpiresAt > now,
                cancellationToken);
        var services = await dbContext.OrganizationServiceEntitlements
            .Where(value => value.OrganizationId == organizationId
                && value.ConfigurationStatus == EntitlementConfigurationStatus.Ready
                && value.EffectiveFrom <= now
                && (!value.EffectiveTo.HasValue || value.EffectiveTo > now))
            .Select(value => value.Service)
            .Distinct()
            .OrderBy(value => value)
            .ToListAsync(cancellationToken);
        var pendingRequests = await dbContext.PortalIntegrationRequests
            .CountAsync(value => value.OrganizationId == organizationId
                && (value.Status == PortalIntegrationRequestStatus.PendingReview
                    || value.Status == PortalIntegrationRequestStatus.Approved),
                cancellationToken);

        return new OrganizationRelationshipSummaryDto
        {
            OrganizationId = organization.Id,
            OrganizationName = organization.Name,
            OrganizationKind = organization.Kind,
            IsActive = organization.IsActive,
            PortalReadiness = organization.PortalReadiness,
            PortalReadinessNote = organization.PortalReadinessNote,
            AdministratorStatus = hasActiveAdmin ? "Active" : hasPendingAdminInvitation ? "Invited" : "Missing",
            ActiveMemberCount = activeMembers,
            PendingInvitationCount = pendingInvitations,
            EffectiveServices = services,
            PendingRequestCount = pendingRequests
        };
    }

    [HttpGet("organizations/{organizationId:guid}/entitlements")]
    public async Task<IReadOnlyList<OrganizationServiceEntitlementDto>> ListEntitlements(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        await RequireOrganizationAsync(organizationId, cancellationToken);
        var values = await dbContext.OrganizationServiceEntitlements
            .AsNoTracking()
            .Where(value => value.OrganizationId == organizationId)
            .OrderByDescending(value => value.EffectiveFrom)
            .ThenBy(value => value.Service)
            .ToListAsync(cancellationToken);
        return values.Select(ToDto).ToList();
    }

    [HttpPost("organizations/{organizationId:guid}/entitlements")]
    public async Task<ActionResult<OrganizationServiceEntitlementDto>> CreateEntitlement(
        Guid organizationId,
        [FromBody] CreateOrganizationServiceEntitlementRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var organization = await RequireOrganizationAsync(organizationId, cancellationToken);
        EnsureServiceAllowed(organization.Kind, request.Service);
        await EnsureSourceRequestAsync(request.SourceRequestId, organizationId, request.Service, cancellationToken);
        await EnsureNoOverlapAsync(organizationId, request.Service, request.EffectiveFrom, request.EffectiveTo, null, cancellationToken);

        var entitlement = Execute(() => new OrganizationServiceEntitlement(
            organizationId,
            request.Service,
            request.EffectiveFrom,
            request.EffectiveTo,
            request.ConfigurationStatus,
            actor.Id,
            request.SourceRequestId,
            request.Notes));
        dbContext.OrganizationServiceEntitlements.Add(entitlement);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/relationships/organizations/{organizationId}/entitlements/{entitlement.Id}", ToDto(entitlement));
    }

    [HttpPatch("organizations/{organizationId:guid}/entitlements/{entitlementId:guid}")]
    public async Task<OrganizationServiceEntitlementDto> UpdateEntitlement(
        Guid organizationId,
        Guid entitlementId,
        [FromBody] UpdateOrganizationServiceEntitlementRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var entitlement = await RequireEntitlementAsync(organizationId, entitlementId, cancellationToken);
        EnsureVersion(entitlement.Version, request.Version);
        await EnsureNoOverlapAsync(organizationId, entitlement.Service, request.EffectiveFrom, request.EffectiveTo, entitlementId, cancellationToken);
        Execute(() => entitlement.Update(request.EffectiveFrom, request.EffectiveTo, request.ConfigurationStatus, request.Notes));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(entitlement);
    }

    [HttpPost("organizations/{organizationId:guid}/entitlements/{entitlementId:guid}/end")]
    public async Task<OrganizationServiceEntitlementDto> EndEntitlement(
        Guid organizationId,
        Guid entitlementId,
        [FromBody] EndOrganizationServiceEntitlementRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var entitlement = await RequireEntitlementAsync(organizationId, entitlementId, cancellationToken);
        EnsureVersion(entitlement.Version, request.Version);
        Execute(() => entitlement.End(request.EffectiveTo, request.Reason));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(entitlement);
    }

    [HttpGet("requests")]
    public async Task<IReadOnlyList<PortalIntegrationRequestDto>> ListRequests(
        [FromQuery] Guid? organizationId,
        [FromQuery] PortalIntegrationRequestStatus? status,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var query = dbContext.PortalIntegrationRequests
            .AsNoTracking()
            .Include(value => value.RequestedServices)
            .AsQueryable();
        if (organizationId.HasValue)
        {
            query = query.Where(value => value.OrganizationId == organizationId);
        }

        if (status.HasValue)
        {
            query = query.Where(value => value.Status == status);
        }

        var values = await query
            .OrderBy(value => value.Status == PortalIntegrationRequestStatus.PendingReview ? 0 : 1)
            .ThenByDescending(value => value.CreatedAt)
            .ToListAsync(cancellationToken);
        return values.Select(ToDto).ToList();
    }

    [HttpGet("requests/{requestId:guid}")]
    public async Task<PortalIntegrationRequestDto> GetRequest(
        Guid requestId,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        return ToDto(await RequireRequestAsync(requestId, tracking: false, cancellationToken));
    }

    [HttpPost("requests")]
    public async Task<ActionResult<PortalIntegrationRequestDto>> CreateRequest(
        [FromBody] CreatePortalIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        Organization? organization = null;
        if (request.OrganizationId.HasValue)
        {
            organization = await RequireOrganizationAsync(request.OrganizationId.Value, cancellationToken);
        }

        var candidateName = organization?.Name ?? request.CandidateOrganizationName;
        var requestedKind = request.RequestedOrganizationKind ?? organization?.Kind;
        EnsureRequestServicesAllowed(requestedKind, request.RequestedServices);
        var value = Execute(() => new PortalIntegrationRequest(
            organization?.Id,
            candidateName ?? string.Empty,
            request.RequestType,
            PortalIntegrationRequestSource.Manual,
            request.RequestedOrganizationKind,
            request.SourceReference,
            request.Summary,
            request.InternalNotes,
            actor.Id,
            request.RequestedServices));
        dbContext.PortalIntegrationRequests.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/relationships/requests/{value.Id}", ToDto(value));
    }

    [HttpPost("requests/{requestId:guid}/decision")]
    public async Task<PortalIntegrationRequestDto> DecideRequest(
        Guid requestId,
        [FromBody] DecidePortalIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var value = await RequireRequestAsync(requestId, tracking: true, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        Execute(() => value.Decide(request.Approved, request.Reason, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("requests/{requestId:guid}/applied")]
    public async Task<PortalIntegrationRequestDto> ApplyRequest(
        Guid requestId,
        [FromBody] ApplyPortalIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var value = await RequireRequestAsync(requestId, tracking: true, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        if (!value.OrganizationId.HasValue && !request.OrganizationId.HasValue)
        {
            throw new RelationshipManagementException(
                "applied_request_organization_required",
                "Associate the request with the completed organization before marking it applied.");
        }

        if (request.OrganizationId.HasValue)
        {
            await RequireOrganizationAsync(request.OrganizationId.Value, cancellationToken);
            Execute(() => value.AssociateOrganization(request.OrganizationId.Value));
        }

        Execute(() => value.MarkApplied(request.Notes, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("requests/{requestId:guid}/cancel")]
    public async Task<PortalIntegrationRequestDto> CancelRequest(
        Guid requestId,
        [FromBody] CancelPortalIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var value = await RequireRequestAsync(requestId, tracking: true, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        Execute(() => value.Cancel(request.Reason, actor.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    private async Task<User> RequirePlatformAdminAsync(CancellationToken cancellationToken)
    {
        var actor = await AccountAccess.ReadActiveActorAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
        if (actor == null || !AccountAccess.IsPlatformAdmin(actor))
        {
            throw new RelationshipManagementException(
                "relationship_administration_forbidden",
                "Phaeno relationship administration access is required.",
                StatusCodes.Status403Forbidden);
        }

        return actor;
    }

    private async Task<Organization> RequireOrganizationAsync(Guid organizationId, CancellationToken cancellationToken) =>
        await dbContext.Organizations.FirstOrDefaultAsync(value => value.Id == organizationId, cancellationToken)
        ?? throw NotFound("organization_not_found", "The organization was not found.");

    private async Task<OrganizationServiceEntitlement> RequireEntitlementAsync(Guid organizationId, Guid entitlementId, CancellationToken cancellationToken) =>
        await dbContext.OrganizationServiceEntitlements.FirstOrDefaultAsync(
            value => value.Id == entitlementId && value.OrganizationId == organizationId,
            cancellationToken)
        ?? throw NotFound("entitlement_not_found", "The service entitlement was not found.");

    private async Task<PortalIntegrationRequest> RequireRequestAsync(Guid requestId, bool tracking, CancellationToken cancellationToken)
    {
        var query = dbContext.PortalIntegrationRequests.Include(value => value.RequestedServices).AsQueryable();
        if (!tracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(value => value.Id == requestId, cancellationToken)
            ?? throw NotFound("relationship_request_not_found", "The Portal integration request was not found.");
    }

    private async Task EnsureSourceRequestAsync(Guid? requestId, Guid organizationId, PortalService service, CancellationToken cancellationToken)
    {
        if (!requestId.HasValue)
        {
            return;
        }

        var request = await dbContext.PortalIntegrationRequests.AsNoTracking()
            .Include(value => value.RequestedServices)
            .FirstOrDefaultAsync(value => value.Id == requestId, cancellationToken)
            ?? throw NotFound("relationship_request_not_found", "The source request was not found.");
        if (!request.AuthorizesEntitlement(organizationId, service))
        {
            throw Conflict("source_request_not_eligible", "The source request must belong to this organization, be approved or applied, and include the selected service.");
        }
    }

    private async Task EnsureNoOverlapAsync(
        Guid organizationId,
        PortalService service,
        DateTime effectiveFrom,
        DateTime? effectiveTo,
        Guid? excludedId,
        CancellationToken cancellationToken)
    {
        var overlaps = await dbContext.OrganizationServiceEntitlements.AsNoTracking()
            .AnyAsync(value => value.OrganizationId == organizationId
                && value.Service == service
                && (!excludedId.HasValue || value.Id != excludedId.Value)
                && (!effectiveTo.HasValue || value.EffectiveFrom < effectiveTo.Value)
                && (!value.EffectiveTo.HasValue || value.EffectiveTo.Value > effectiveFrom),
                cancellationToken);
        if (overlaps)
        {
            throw Conflict("entitlement_period_overlap", "This service already has an overlapping entitlement period.");
        }
    }

    private static void EnsureServiceAllowed(OrganizationKind kind, PortalService service)
    {
        var allowed = kind switch
        {
            OrganizationKind.Customer => service == PortalService.PSeqLabService,
            OrganizationKind.Partner => service is PortalService.PSeqLabService or PortalService.PSeqKit,
            _ => false
        };
        if (!allowed)
        {
            throw new RelationshipManagementException(
                "service_not_allowed_for_organization_kind",
                "That service is not available for this organization type.");
        }
    }

    private static void EnsureRequestServicesAllowed(OrganizationKind? kind, IEnumerable<PortalService> services)
    {
        foreach (var service in services.Distinct())
        {
            if (!kind.HasValue)
            {
                throw new RelationshipManagementException(
                    "requested_organization_kind_required",
                    "Select the requested organization type before requesting services.");
            }

            EnsureServiceAllowed(kind.Value, service);
        }
    }

    private static OrganizationServiceEntitlementDto ToDto(OrganizationServiceEntitlement value)
    {
        var now = DateTime.UtcNow;
        var effective = value.IsEffectiveAt(now);
        return new OrganizationServiceEntitlementDto
        {
            Id = value.Id,
            OrganizationId = value.OrganizationId,
            Service = value.Service,
            EffectiveFrom = value.EffectiveFrom,
            EffectiveTo = value.EffectiveTo,
            ConfigurationStatus = value.ConfigurationStatus,
            SourceRequestId = value.SourceRequestId,
            ApprovedByUserId = value.ApprovedByUserId,
            Notes = value.Notes,
            EndReason = value.EndReason,
            IsEffective = effective,
            IsUsable = effective && value.ConfigurationStatus == EntitlementConfigurationStatus.Ready,
            CreatedAt = value.CreatedAt,
            UpdatedAt = value.UpdatedAt,
            Version = value.Version
        };
    }

    private static PortalIntegrationRequestDto ToDto(PortalIntegrationRequest value) => new()
    {
        Id = value.Id,
        RequestNumber = value.RequestNumber,
        OrganizationId = value.OrganizationId,
        CandidateOrganizationName = value.CandidateOrganizationName,
        RequestType = value.RequestType,
        Source = value.Source,
        Status = value.Status,
        RequestedOrganizationKind = value.RequestedOrganizationKind,
        SourceReference = value.SourceReference,
        Summary = value.Summary,
        InternalNotes = value.InternalNotes,
        RequestedByUserId = value.RequestedByUserId,
        ReviewedByUserId = value.ReviewedByUserId,
        ReviewedAt = value.ReviewedAt,
        DecisionReason = value.DecisionReason,
        AppliedByUserId = value.AppliedByUserId,
        AppliedAt = value.AppliedAt,
        ApplicationNotes = value.ApplicationNotes,
        RequestedServices = value.RequestedServices.Select(service => service.Service).OrderBy(service => service).ToList(),
        CreatedAt = value.CreatedAt,
        UpdatedAt = value.UpdatedAt,
        Version = value.Version
    };

    private static void EnsureVersion(long currentVersion, long requestedVersion)
    {
        if (currentVersion != requestedVersion)
        {
            throw new DbUpdateConcurrencyException();
        }
    }

    private static T Execute<T>(Func<T> action)
    {
        try
        {
            return action();
        }
        catch (ArgumentException exception)
        {
            throw new RelationshipManagementException("invalid_relationship_request", exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            throw Conflict("invalid_relationship_request_state", exception.Message);
        }
    }

    private static void Execute(Action action) => Execute(() =>
    {
        action();
        return true;
    });

    private static RelationshipManagementException NotFound(string code, string message) =>
        new(code, message, StatusCodes.Status404NotFound);

    private static RelationshipManagementException Conflict(string code, string message) =>
        new(code, message, StatusCodes.Status409Conflict);
}
