namespace PhaenoPortal.App.Features.RelationshipManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.RelationshipManagement.DTOs;
using PhaenoPortal.App.Features.RelationshipManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/platform/relationships")]
public sealed class RelationshipManagementController(
    PSeqOperationsDbContext dbContext,
    IExternalIdentityContext externalIdentityContext,
    IWebHostEnvironment environment) : ControllerBase
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

    [HttpPost("requests/simulate-hubspot")]
    public async Task<ActionResult<PortalIntegrationRequestDto>> SimulateHubSpotHandoff(
        [FromBody] SimulateHubSpotHandoffRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        if (!environment.IsDevelopment())
        {
            throw NotFound(
                "hubspot_handoff_simulation_disabled",
                "HubSpot handoff simulation is available only in the local development environment.");
        }

        var dealId = request.HubSpotDealId?.Trim();
        if (string.IsNullOrWhiteSpace(dealId))
        {
            throw new RelationshipManagementException(
                "hubspot_deal_required",
                "Enter the simulated HubSpot Deal identifier.");
        }

        var sourceReference = $"hubspot-deal:{dealId}";
        if (sourceReference.Length > 255)
        {
            throw new RelationshipManagementException(
                "hubspot_deal_invalid",
                "The simulated HubSpot Deal identifier must be 242 characters or fewer.");
        }

        Organization? organization = null;
        if (request.OrganizationId.HasValue)
        {
            organization = await RequireOrganizationAsync(request.OrganizationId.Value, cancellationToken);
        }

        PortalIntegrationRequestType requestType;
        OrganizationKind requestedKind;
        IReadOnlyList<PortalService> requestedServices;
        string candidateName;

        switch (request.Path)
        {
            case HubSpotHandoffSimulationPath.SalesAssistedOrder:
                if (organization == null
                    || organization.Kind is not (OrganizationKind.Customer or OrganizationKind.Partner))
                {
                    throw new RelationshipManagementException(
                        "sales_assisted_organization_required",
                        "Select an existing Customer or Partner for a sales-assisted order handoff.");
                }
                if (!request.RequestedService.HasValue)
                {
                    throw new RelationshipManagementException(
                        "sales_assisted_service_required",
                        "Select the service covered by the sales-assisted handoff.");
                }

                EnsureServiceAllowed(organization.Kind, request.RequestedService.Value);
                requestType = PortalIntegrationRequestType.SalesAssistedOrder;
                requestedKind = organization.Kind;
                requestedServices = [request.RequestedService.Value];
                candidateName = organization.Name;
                break;

            case HubSpotHandoffSimulationPath.TrialProject:
                if (organization != null && organization.Kind != OrganizationKind.Prospect)
                {
                    throw new RelationshipManagementException(
                        "trial_prospect_required",
                        "Select an existing Prospect or enter a new Prospect candidate for a Trial Project request.");
                }

                requestType = PortalIntegrationRequestType.Evaluation;
                requestedKind = OrganizationKind.Prospect;
                requestedServices = [];
                candidateName = organization?.Name ?? request.CandidateOrganizationName ?? string.Empty;
                break;

            default:
                throw new RelationshipManagementException(
                    "hubspot_handoff_path_invalid",
                    "Select a supported HubSpot handoff path.");
        }

        var duplicate = await dbContext.PortalIntegrationRequests
            .AsNoTracking()
            .AnyAsync(value => value.Source == PortalIntegrationRequestSource.HubSpot
                && value.SourceReference == sourceReference
                && value.RequestType == requestType,
                cancellationToken);
        if (duplicate)
        {
            throw Conflict(
                "hubspot_handoff_already_received",
                "That simulated HubSpot Deal has already produced this type of Portal handoff.");
        }

        var internalNotes = string.IsNullOrWhiteSpace(request.InternalNotes)
            ? "Development-only simulated HubSpot handoff."
            : $"Development-only simulated HubSpot handoff. {request.InternalNotes.Trim()}";
        var value = Execute(() => new PortalIntegrationRequest(
            organization?.Id,
            candidateName,
            requestType,
            PortalIntegrationRequestSource.HubSpot,
            requestedKind,
            sourceReference,
            request.Summary,
            internalNotes,
            actor.Id,
            requestedServices));
        dbContext.PortalIntegrationRequests.Add(value);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/relationships/requests/{value.Id}", ToDto(value));
    }

    [HttpPost("requests/simulate-hubspot-account")]
    public async Task<ActionResult<PortalIntegrationRequestDto>> SimulateHubSpotAccountIntake(
        [FromBody] SimulateHubSpotAccountIntakeRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        if (!environment.IsDevelopment())
        {
            throw NotFound(
                "hubspot_account_simulation_disabled",
                "HubSpot account simulation is available only in the local development environment.");
        }

        if (request.RequestedOrganizationKind is not (
            OrganizationKind.Prospect
            or OrganizationKind.Customer
            or OrganizationKind.Partner))
        {
            throw new RelationshipManagementException(
                "hubspot_account_kind_invalid",
                "Select Prospect, Customer, or Partner as the requested relationship.");
        }

        var companyId = request.HubSpotCompanyId?.Trim();
        var dealId = request.HubSpotDealId?.Trim();
        if (string.IsNullOrWhiteSpace(companyId) || string.IsNullOrWhiteSpace(dealId))
        {
            throw new RelationshipManagementException(
                "hubspot_account_references_required",
                "Enter both the simulated HubSpot Company and Deal identifiers.");
        }

        var sourceReference = $"hubspot-company:{companyId};deal:{dealId}";
        if (sourceReference.Length > 255)
        {
            throw new RelationshipManagementException(
                "hubspot_account_references_invalid",
                "The combined simulated HubSpot Company and Deal identifiers are too long.");
        }

        var requestedServices = request.RequestedServices.Distinct().ToList();
        if (request.RequestedOrganizationKind == OrganizationKind.Prospect)
        {
            if (requestedServices.Count != 0)
            {
                throw new RelationshipManagementException(
                    "prospect_services_not_allowed",
                    "A Prospect evaluation cannot request commercial service entitlements.");
            }
        }
        else
        {
            if (requestedServices.Count == 0)
            {
                throw new RelationshipManagementException(
                    "hubspot_account_service_required",
                    "Select at least one service requested for the new account.");
            }

            EnsureRequestServicesAllowed(request.RequestedOrganizationKind, requestedServices);
        }

        var requestType = request.RequestedOrganizationKind == OrganizationKind.Prospect
            ? PortalIntegrationRequestType.Evaluation
            : PortalIntegrationRequestType.Onboarding;
        var duplicate = await dbContext.PortalIntegrationRequests
            .AsNoTracking()
            .AnyAsync(value => value.Source == PortalIntegrationRequestSource.HubSpot
                && value.SourceReference == sourceReference
                && value.RequestType == requestType,
                cancellationToken);
        if (duplicate)
        {
            throw Conflict(
                "hubspot_account_handoff_already_received",
                "That simulated HubSpot Company and Deal have already produced this account handoff.");
        }

        var internalNotes = string.IsNullOrWhiteSpace(request.InternalNotes)
            ? "Development-only simulated HubSpot account intake."
            : $"Development-only simulated HubSpot account intake. {request.InternalNotes.Trim()}";
        var value = Execute(() => new PortalIntegrationRequest(
            null,
            request.CandidateOrganizationName,
            requestType,
            PortalIntegrationRequestSource.HubSpot,
            request.RequestedOrganizationKind,
            sourceReference,
            request.Summary,
            internalNotes,
            actor.Id,
            requestedServices));
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

    [HttpPost("requests/{requestId:guid}/account")]
    public async Task<OrganizationDto> CreateAccountFromRequest(
        Guid requestId,
        [FromBody] CreateAccountFromPortalIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var value = await RequireRequestAsync(requestId, tracking: true, cancellationToken);
        EnsureVersion(value.Version, request.Version);

        if (value.Status != PortalIntegrationRequestStatus.Approved)
        {
            throw Conflict(
                "account_request_not_approved",
                "Approve the account request before creating its account.");
        }

        if (value.OrganizationId.HasValue)
        {
            throw Conflict(
                "account_request_already_associated",
                "This request is already associated with an account.");
        }

        if (value.RequestType is not (
            PortalIntegrationRequestType.Onboarding
            or PortalIntegrationRequestType.Evaluation))
        {
            throw new RelationshipManagementException(
                "account_request_type_invalid",
                "Only an onboarding or evaluation request can create a new account.");
        }

        if (value.RequestedOrganizationKind is not (
            OrganizationKind.Prospect
            or OrganizationKind.Customer
            or OrganizationKind.Partner))
        {
            throw new RelationshipManagementException(
                "account_request_kind_invalid",
                "The approved request must identify a Prospect, Customer, or Partner relationship.");
        }

        var duplicate = await dbContext.Organizations.AsNoTracking()
            .AnyAsync(organization => organization.Name == value.CandidateOrganizationName, cancellationToken);
        if (duplicate)
        {
            throw Conflict(
                "account_name_already_exists",
                "An account with this name already exists. Associate the request with that account instead.");
        }

        var description = value.Summary.Length <= 1000
            ? value.Summary
            : value.Summary[..1000];
        var organization = new Organization(
            value.CandidateOrganizationName,
            value.RequestedOrganizationKind.Value,
            description);
        organization.UpdatePortalReadiness(
            PortalReadinessStatus.Pending,
            $"Created from approved request {value.RequestNumber}. Phaeno must still configure users and any requested services.");

        dbContext.Organizations.Add(organization);
        Execute(() => value.AssociateOrganization(organization.Id));
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToDto(organization);
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
        if (actor == null || !AccountAuthorization.IsPlatformAdmin(actor))
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
        if (!RelationshipPolicy.IsServiceAllowed(kind, service))
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

    private static OrganizationDto ToDto(Organization value) => new()
    {
        Id = value.Id,
        Name = value.Name,
        Description = value.Description,
        Kind = value.Kind,
        PortalReadiness = value.PortalReadiness,
        PortalReadinessNote = value.PortalReadinessNote,
        IsActive = value.IsActive,
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
