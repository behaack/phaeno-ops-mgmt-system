namespace PhaenoPortal.App.Features.RelationshipManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
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

    [HttpGet("organizations/{organizationId:guid}/operational-readiness")]
    public async Task<OrganizationOperationalReadinessDto> GetOperationalReadiness(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var organization = await RequireOrganizationAsync(organizationId, cancellationToken);
        return await EvaluateOperationalReadinessAsync(organization, cancellationToken);
    }

    [HttpPost("organizations/{organizationId:guid}/operational-block")]
    public async Task<OrganizationOperationalReadinessDto> UpdateOperationalBlock(
        Guid organizationId,
        [FromBody] UpdateOperationalReadinessBlockRequest request,
        CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var organization = await RequireOrganizationAsync(organizationId, cancellationToken);
        EnsureVersion(organization.Version, request.Version);
        Execute(() =>
        {
            if (request.IsBlocked)
                organization.SetOperationalReadinessBlock(request.Reason ?? string.Empty);
            else
                organization.ClearOperationalReadinessBlock();
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        return await EvaluateOperationalReadinessAsync(organization, cancellationToken);
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
        await EnsureDepartmentAsync(organizationId, request.DepartmentId, cancellationToken);
        await EnsureSourceRequestAsync(request.SourceRequestId, organizationId, request.Service, cancellationToken);
        await EnsureNoOverlapAsync(organizationId, request.DepartmentId, request.Service, request.EffectiveFrom, request.EffectiveTo, null, cancellationToken);

        var entitlement = Execute(() => new OrganizationServiceEntitlement(
            organizationId,
            request.Service,
            request.EffectiveFrom,
            request.EffectiveTo,
            request.ConfigurationStatus,
            actor.Id,
            request.SourceRequestId,
            request.Notes,
            request.DepartmentId));
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
        await EnsureSourceRequestAsync(request.SourceRequestId, organizationId, entitlement.Service, cancellationToken);
        await EnsureNoOverlapAsync(organizationId, entitlement.DepartmentId, entitlement.Service, request.EffectiveFrom, request.EffectiveTo, entitlementId, cancellationToken);
        Execute(() => entitlement.Update(
            request.EffectiveFrom,
            request.EffectiveTo,
            request.ConfigurationStatus,
            request.SourceRequestId,
            request.Notes));
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
        var requestIds = values.Select(value => value.Id).ToList();
        var companyIds = await dbContext.CrmHandoffs.AsNoTracking()
            .Where(value => requestIds.Contains(value.RelationshipRequestId))
            .ToDictionaryAsync(
                value => value.RelationshipRequestId,
                value => value.CompanyId,
                cancellationToken);
        return values
            .Select(value => ToDto(value, companyIds.GetValueOrDefault(value.Id)))
            .ToList();
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
        EnsureOnlineAccessRequestHasNoServices(request.RequestType, request.RequestedServices);
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

        if (request.Approved && IsNewAccountRequest(value))
        {
            await CreateOrAssociateAccountAsync(
                value,
                request.ExistingOrganizationId,
                cancellationToken);
        }

        if (request.Approved)
        {
            await EnsureCompanyPortalAccessAsync(value, actor.Id, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(value);
    }

    [HttpPost("requests/{requestId:guid}/account")]
    public async Task<OrganizationDto> CreateAccountFromRequest(
        Guid requestId,
        [FromBody] CreateAccountFromPortalIntegrationRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var value = await RequireRequestAsync(requestId, tracking: true, cancellationToken);
        EnsureVersion(value.Version, request.Version);
        var organization = await CreateOrAssociateAccountAsync(
            value,
            request.ExistingOrganizationId,
            cancellationToken);
        await EnsureCompanyPortalAccessAsync(value, actor.Id, cancellationToken);
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

        var appliedOrganization = await RequireOrganizationAsync(
            value.OrganizationId ?? request.OrganizationId!.Value,
            cancellationToken);
        if (appliedOrganization.Kind == OrganizationKind.Customer
            && value.RequestedServices.Any(service => service.Service == PortalService.PSeqLabService))
        {
            var readiness = await EvaluateOperationalReadinessAsync(appliedOrganization, cancellationToken);
            if (readiness.State != OperationalReadiness.Ready)
            {
                throw new RelationshipManagementException(
                    "operational_readiness_incomplete",
                    "Complete the PSeq operational-readiness checklist before marking this account request applied.",
                    StatusCodes.Status409Conflict,
                    readiness.Blockers.Select(blocker => new
                    {
                        code = blocker.Code.ToString(),
                        blocker.Label,
                        blocker.NextAction
                    }).ToList());
            }
        }

        await EnsureCompanyPortalAccessAsync(value, actor.Id, cancellationToken);
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

    private static bool IsNewAccountRequest(PortalIntegrationRequest value) =>
        !value.OrganizationId.HasValue
        && value.RequestType is PortalIntegrationRequestType.Onboarding or PortalIntegrationRequestType.Evaluation
        && value.RequestedOrganizationKind is OrganizationKind.Prospect or OrganizationKind.Customer or OrganizationKind.Partner;

    private async Task<Organization> CreateOrAssociateAccountAsync(
        PortalIntegrationRequest value,
        Guid? confirmedExistingOrganizationId,
        CancellationToken cancellationToken)
    {
        var handoff = await dbContext.CrmHandoffs
            .Include(item => item.Company)
            .FirstOrDefaultAsync(item => item.RelationshipRequestId == value.Id, cancellationToken)
            ?? throw Conflict(
                "company_access_request_required",
                "Portal access can be enabled only from a CRM Company request.");

        if (value.Status != PortalIntegrationRequestStatus.Approved)
        {
            throw Conflict(
                "account_request_not_approved",
                "Approve the Company access request before enabling Portal access.");
        }

        if (value.OrganizationId.HasValue)
        {
            throw Conflict(
                "account_request_already_associated",
                "Portal access is already enabled for this Company request.");
        }

        if (value.RequestType is not (
            PortalIntegrationRequestType.Onboarding
            or PortalIntegrationRequestType.Evaluation))
        {
            throw new RelationshipManagementException(
                "account_request_type_invalid",
                "Only an onboarding or evaluation request can enable Portal access.");
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

        if (handoff.Company.AccessOrganizationId.HasValue)
        {
            throw Conflict(
                "company_portal_access_exists",
                "Portal access is already enabled for this Company.");
        }

        var existingOrganization = await dbContext.Organizations
            .FirstOrDefaultAsync(
                organization => organization.Name == handoff.Company.Name,
                cancellationToken);
        if (existingOrganization is not null)
        {
            var linkedCompany = await dbContext.CrmCompanies.AsNoTracking()
                .Where(company => company.AccessOrganizationId == existingOrganization.Id)
                .Select(company => new { company.Id, company.Name })
                .FirstOrDefaultAsync(cancellationToken);
            if (linkedCompany is not null)
            {
                throw Conflict(
                    "account_name_already_linked",
                    $"An internal access scope with this Company name is already linked to {linkedCompany.Name}.");
            }

            if (!existingOrganization.IsActive)
            {
                throw Conflict(
                    "account_name_inactive",
                    "An inactive internal access scope with this Company name already exists. Resolve or reactivate it before enabling access.");
            }

            if (existingOrganization.Kind != value.RequestedOrganizationKind.Value)
            {
                throw Conflict(
                    "account_kind_mismatch",
                    $"The existing internal access scope is {existingOrganization.Kind}, but this request is for {value.RequestedOrganizationKind.Value}. Resolve the relationship before enabling access.");
            }

            if (confirmedExistingOrganizationId != existingOrganization.Id)
            {
                throw new RelationshipManagementException(
                    "existing_access_scope_confirmation_required",
                    "An active unlinked access scope with this Company name already exists. Confirm that it should be used before enabling access.",
                    StatusCodes.Status409Conflict,
                    new
                    {
                        organizationId = existingOrganization.Id,
                        organizationName = existingOrganization.Name,
                        organizationKind = existingOrganization.Kind
                    });
            }

            Execute(() => value.AssociateOrganization(existingOrganization.Id));
            Execute(() => handoff.Company.EnablePortalAccess(existingOrganization.Id));
            await AssociateUnlinkedCompanyRequestsAsync(
                handoff.Company.Id,
                existingOrganization.Id,
                cancellationToken);
            return existingOrganization;
        }

        if (confirmedExistingOrganizationId.HasValue)
        {
            throw Conflict(
                "existing_access_scope_changed",
                "The previously identified access scope is no longer available. Review the latest Company state and try again.");
        }

        var description = value.Summary.Length <= 1000
            ? value.Summary
            : value.Summary[..1000];
        var organization = new Organization(
            handoff.Company.Name,
            value.RequestedOrganizationKind.Value,
            description);
        organization.UpdatePortalReadiness(
            PortalReadinessStatus.Pending,
            $"Created from approved request {value.RequestNumber}. Phaeno must still configure users, Portal readiness, and product or service entitlements.");

        dbContext.Organizations.Add(organization);
        Execute(() => value.AssociateOrganization(organization.Id));
        Execute(() => handoff.Company.EnablePortalAccess(organization.Id));
        await AssociateUnlinkedCompanyRequestsAsync(
            handoff.Company.Id,
            organization.Id,
            cancellationToken);

        return organization;
    }

    private async Task AssociateUnlinkedCompanyRequestsAsync(
        Guid companyId,
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        var requests = await (
            from handoff in dbContext.CrmHandoffs
            join request in dbContext.PortalIntegrationRequests
                on handoff.RelationshipRequestId equals request.Id
            where handoff.CompanyId == companyId
                && !request.OrganizationId.HasValue
            select request)
            .ToListAsync(cancellationToken);

        foreach (var request in requests)
        {
            Execute(() => request.AssociateOrganization(organizationId));
        }
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

    private async Task<OrganizationOperationalReadinessDto> EvaluateOperationalReadinessAsync(
        Organization organization,
        CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var hasActiveAdministrator = await dbContext.OrganizationMemberships.AsNoTracking()
            .AnyAsync(value => value.OrganizationId == organization.Id
                && value.IsActive
                && value.IsOrganizationAdmin
                && value.User != null
                && value.User.IsActive
                && value.User.Status == UserAccountStatus.Active,
                cancellationToken);
        var hasReadyEntitlement = await dbContext.OrganizationServiceEntitlements.AsNoTracking()
            .AnyAsync(value => value.OrganizationId == organization.Id
                && value.Service == PortalService.PSeqLabService
                && value.ConfigurationStatus == EntitlementConfigurationStatus.Ready
                && value.EffectiveFrom <= utcNow
                && (!value.EffectiveTo.HasValue || value.EffectiveTo > utcNow),
                cancellationToken);
        var hasActiveOffering = await (
            from analysis in dbContext.AnalysisDefinitions.AsNoTracking()
            join catalog in dbContext.QboCatalogItems.AsNoTracking()
                on analysis.QboCatalogItemId equals catalog.Id
            where analysis.IsActive && !analysis.IsSynthetic && catalog.IsActive
            select analysis.Id).AnyAsync(cancellationToken);
        var system = await dbContext.OrderSystemConfigurations.AsNoTracking()
            .OrderBy(value => value.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        var profile = await dbContext.OrganizationCommercialProfiles.AsNoTracking()
            .FirstOrDefaultAsync(value => value.OrganizationId == organization.Id, cancellationToken);

        var input = new OperationalReadinessInput(
            HasActiveCustomerRelationship: organization is
                { IsActive: true, Kind: OrganizationKind.Customer },
            HasManualBlock: organization.IsOperationalReadinessBlocked,
            ManualBlockReason: organization.OperationalReadinessBlockReason,
            HasActiveCustomerAdministrator: hasActiveAdministrator,
            HasReadyPSeqEntitlement: hasReadyEntitlement,
            HasActivePSeqOffering: hasActiveOffering,
            HasCompleteOrderConfiguration: system != null && system.QuoteValidityDays > 0,
            HasCompleteSampleConfiguration: system?.SampleConfigurationJson != "{}",
            HasCompleteShippingConfiguration: system?.ShippingConfigurationJson != "{}",
            HasCompleteResultDestination: system?.ResultDestinationConfigurationJson != "{}",
            HasCompleteSubmissionInstructions: !string.IsNullOrWhiteSpace(system?.SampleSubmissionInstructions),
            HasCompleteBillingContact: profile?.HasCompleteBillingContact == true,
            HasCompleteBillingAddress: profile?.HasCompleteBillingAddress == true,
            HasValidPaymentTerms: profile is { PaymentTermsDays: >= 0 and <= 365 },
            HasEffectiveTaxDecision: profile?.HasEffectiveTaxDecision == true,
            HasFinanceApprovedTaxDecision: profile?.HasFinanceApprovedTaxDecision == true);
        var evaluation = OperationalReadinessPolicy.Evaluate(input);
        return new OrganizationOperationalReadinessDto
        {
            OrganizationId = organization.Id,
            State = evaluation.State,
            CanStageOrder = evaluation.CanStageOrder,
            CanIssueQuote = evaluation.CanIssueQuote,
            HasManualBlock = organization.IsOperationalReadinessBlocked,
            ManualBlockReason = organization.OperationalReadinessBlockReason,
            Blockers = evaluation.Blockers
        };
    }

    private async Task EnsureCompanyPortalAccessAsync(PortalIntegrationRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        if (!request.OrganizationId.HasValue)
        {
            return;
        }

        var handoff = await dbContext.CrmHandoffs
            .Include(value => value.Company)
            .FirstOrDefaultAsync(value => value.RelationshipRequestId == request.Id, cancellationToken);
        if (handoff is null)
        {
            return;
        }

        if (handoff.Company.AccessOrganizationId == request.OrganizationId)
        {
            return;
        }

        Execute(() => handoff.Company.EnablePortalAccess(request.OrganizationId.Value));
        dbContext.CrmActivities.Add(new CrmActivity(
            CrmActivityType.PortalEvent,
            "Portal access enabled",
            $"Portal access was enabled through Company request {request.RequestNumber}.",
            DateTime.UtcNow,
            CrmActivityVisibility.Internal,
            actorUserId,
            handoff.CompanyId,
            opportunityId: handoff.OpportunityId));
    }

    private async Task EnsureNoOverlapAsync(
        Guid organizationId,
        Guid? departmentId,
        PortalService service,
        DateTime effectiveFrom,
        DateTime? effectiveTo,
        Guid? excludedId,
        CancellationToken cancellationToken)
    {
        var overlaps = await dbContext.OrganizationServiceEntitlements.AsNoTracking()
            .AnyAsync(value => value.OrganizationId == organizationId
                && value.DepartmentId == departmentId
                && value.Service == service
                && (!excludedId.HasValue || value.Id != excludedId.Value)
                && (!effectiveTo.HasValue || value.EffectiveFrom < effectiveTo.Value)
                && (!value.EffectiveTo.HasValue || value.EffectiveTo.Value > effectiveFrom),
                cancellationToken);
        if (overlaps)
        {
            throw Conflict(
                "entitlement_period_overlap",
                "This service already has an overlapping entitlement period. Edit the existing entitlement or choose a non-overlapping period.");
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

    private static void EnsureOnlineAccessRequestHasNoServices(
        PortalIntegrationRequestType requestType,
        IEnumerable<PortalService> services)
    {
        if (requestType is (
                PortalIntegrationRequestType.Onboarding
                or PortalIntegrationRequestType.Evaluation
                or PortalIntegrationRequestType.Offboarding)
            && services.Any())
        {
            throw new RelationshipManagementException(
                "online_access_services_not_allowed",
                "Online access requests cannot include products or services. Use a service change request instead.");
        }
    }

    private async Task EnsureDepartmentAsync(
        Guid organizationId,
        Guid? departmentId,
        CancellationToken cancellationToken)
    {
        if (!departmentId.HasValue) return;
        var valid = await dbContext.OrganizationDepartments.AsNoTracking().AnyAsync(value =>
            value.Id == departmentId.Value
            && value.OrganizationId == organizationId
            && value.IsActive,
            cancellationToken);
        if (!valid)
        {
            throw Conflict("department_not_available", "Select an active Department in this Organization.");
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
            DepartmentId = value.DepartmentId,
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

    private static PortalIntegrationRequestDto ToDto(
        PortalIntegrationRequest value,
        Guid? companyId = null) => new()
    {
        Id = value.Id,
        RequestNumber = value.RequestNumber,
        CompanyId = companyId,
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
