namespace PhaenoPortal.App.Features.Crm.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Application;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.DTOs;
using PhaenoPortal.App.Features.Crm.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using static PhaenoPortal.App.Features.Crm.Services.CrmAccess;

[ApiController]
[Authorize]
[Route("api/platform/crm/companies/{companyId:guid}")]
public sealed class CrmHandoffsController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet("~/api/platform/crm/order-handoffs")]
    public async Task<IReadOnlyList<CrmOrderHandoffDto>> OrderHandoffs(CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var values = await dbContext.CrmHandoffs.AsNoTracking()
            .Include(value => value.Company)
            .Include(value => value.Opportunity).ThenInclude(value => value!.Stage)
            .Include(value => value.RelationshipRequest).ThenInclude(value => value.RequestedServices)
            .Where(value => value.RelationshipRequest.Source == PortalIntegrationRequestSource.FirstPartyCrm
                && (value.RelationshipRequest.RequestType == PortalIntegrationRequestType.SalesAssistedOrder
                    || value.RelationshipRequest.RequestType == PortalIntegrationRequestType.Evaluation)
                && (value.RelationshipRequest.Status == PortalIntegrationRequestStatus.PendingReview
                    || value.RelationshipRequest.Status == PortalIntegrationRequestStatus.Approved
                    || value.RelationshipRequest.Status == PortalIntegrationRequestStatus.Applied))
            .OrderByDescending(value => value.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);
        var organizationIds = values.Select(value => value.RelationshipRequest.OrganizationId)
            .Where(value => value.HasValue).Select(value => value!.Value).Distinct().ToList();
        var organizationNames = await dbContext.Organizations.AsNoTracking()
            .Where(value => organizationIds.Contains(value.Id))
            .ToDictionaryAsync(value => value.Id, value => value.Name, cancellationToken);
        var result = new List<CrmOrderHandoffDto>(values.Count);
        foreach (var value in values)
        {
            result.Add(new(
                await ToDtoAsync(value, cancellationToken),
                value.Company.Name,
                value.Opportunity?.Name,
                value.RelationshipRequest.OrganizationId.HasValue
                    ? organizationNames.GetValueOrDefault(value.RelationshipRequest.OrganizationId.Value)
                    : null,
                value.RelationshipRequest.Summary));
        }
        return result;
    }

    [HttpGet("handoffs")]
    public async Task<IReadOnlyList<CrmHandoffDto>> Handoffs(Guid companyId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var values = await dbContext.CrmHandoffs.AsNoTracking()
            .Include(value => value.Opportunity).ThenInclude(value => value!.Stage)
            .Include(value => value.RelationshipRequest).ThenInclude(value => value.RequestedServices)
            .Where(value => value.CompanyId == companyId).OrderByDescending(value => value.CreatedAt).ToListAsync(cancellationToken);
        var result = new List<CrmHandoffDto>(values.Count);
        foreach (var value in values) result.Add(await ToDtoAsync(value, cancellationToken));
        return result;
    }

    [HttpPost("handoffs")]
    public async Task<ActionResult<CrmHandoffDto>> CreateHandoff(Guid companyId, [FromBody] CreateCrmHandoffRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var company = await dbContext.CrmCompanies
            .Include(value => value.AccessOrganization)
            .FirstOrDefaultAsync(value => value.Id == companyId && value.IsActive, cancellationToken)
            ?? throw Missing("crm_company_not_found", "The active CRM company was not found.");
        if (await dbContext.CrmHandoffs.AnyAsync(value => value.IdempotencyKey == request.IdempotencyKey, cancellationToken))
            throw CrmAccess.Conflict("crm_handoff_duplicate", "This CRM handoff has already been created.");

        CrmOpportunity? opportunity = null;
        if (request.OpportunityId.HasValue)
        {
            opportunity = await dbContext.CrmOpportunities.FirstOrDefaultAsync(value => value.Id == request.OpportunityId && value.CompanyId == companyId, cancellationToken)
                ?? throw Missing("crm_handoff_opportunity_not_found", "The selected Opportunity does not belong to this Company.");
        }

        var organizationId = company.AccessOrganizationId;
        var requestedKind = company.AccessOrganization?.Kind ?? request.RequestedOrganizationKind;
        var (requestType, defaultKind) = RequestType(request.Type);
        requestedKind ??= defaultKind;
        foreach (var service in request.RequestedServices.Distinct())
        {
            if (!requestedKind.HasValue || !RelationshipPolicy.IsServiceAllowed(requestedKind.Value, service))
                throw new CrmException("crm_handoff_service_invalid", "The requested service is not available for the selected organization type.");
        }

        var sourceReference = $"first-party-crm:{company.Id:N}:{request.IdempotencyKey.Trim()}";
        if (sourceReference.Length > 255) throw new CrmException("crm_handoff_key_too_long", "Use an idempotency key of 190 characters or fewer.");
        var relationshipRequest = Execute(() => new PortalIntegrationRequest(
            organizationId,
            company.Name,
            requestType,
            PortalIntegrationRequestSource.FirstPartyCrm,
            requestedKind,
            sourceReference,
            request.Summary,
            request.InternalNotes,
            actor.Id,
            request.RequestedServices));
        var value = Execute(() => new CrmHandoff(company.Id, opportunity?.Id, request.Type, relationshipRequest.Id, request.IdempotencyKey));
        dbContext.PortalIntegrationRequests.Add(relationshipRequest);
        dbContext.CrmHandoffs.Add(value);
        dbContext.CrmActivities.Add(new CrmActivity(CrmActivityType.PortalEvent, "Portal handoff created", request.Summary, DateTime.UtcNow, CrmActivityVisibility.Internal, actor.Id, company.Id, opportunityId: opportunity?.Id));
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/companies/{companyId}/handoffs/{value.Id}", await ToDtoAsync(value, cancellationToken, relationshipRequest));
    }

    private static (PortalIntegrationRequestType Type, OrganizationKind? DefaultKind) RequestType(CrmHandoffType type) => type switch
    {
        CrmHandoffType.PortalOnboarding => (PortalIntegrationRequestType.Onboarding, null),
        CrmHandoffType.PortalEvaluation or CrmHandoffType.TrialProject => (PortalIntegrationRequestType.Evaluation, OrganizationKind.Prospect),
        CrmHandoffType.CustomWork => (PortalIntegrationRequestType.SalesAssistedOrder, null),
        CrmHandoffType.ServiceChange => (PortalIntegrationRequestType.ServiceChange, null),
        CrmHandoffType.RelationshipChange => (PortalIntegrationRequestType.RelationshipChange, null),
        CrmHandoffType.Offboarding => (PortalIntegrationRequestType.Offboarding, null),
        _ => throw new CrmException("crm_handoff_type_invalid", "Select a supported Portal handoff type.")
    };

    private async Task<User> RequireActor(CancellationToken cancellationToken) => await RequirePlatformAdminAsync(HttpContext, dbContext, externalIdentityContext, cancellationToken);
    private async Task<CrmHandoffDto> ToDtoAsync(CrmHandoff value, CancellationToken cancellationToken, PortalIntegrationRequest? request = null)
    {
        var relationshipRequest = request ?? value.RelationshipRequest;
        var order = await dbContext.LabServiceOrders.AsNoTracking()
            .Where(item => item.SourceRequestId == relationshipRequest.Id)
            .Select(item => new { item.Id, item.OrderNumber, item.Status })
            .SingleOrDefaultAsync(cancellationToken);
        var (canStartOrder, blocker) = await EvaluateOrderStartAsync(value, relationshipRequest, order is not null, cancellationToken);
        return new(value.Id, value.CompanyId, value.OpportunityId, value.Type, value.RelationshipRequestId, relationshipRequest.RequestNumber, relationshipRequest.Status, relationshipRequest.RequestedOrganizationKind, relationshipRequest.OrganizationId, value.IdempotencyKey, value.CreatedAt, relationshipRequest.Version,
            order?.Id, order?.OrderNumber, order?.Status.ToString(), canStartOrder, blocker);
    }

    private async Task<(bool CanStart, string? Blocker)> EvaluateOrderStartAsync(
        CrmHandoff handoff,
        PortalIntegrationRequest request,
        bool orderExists,
        CancellationToken cancellationToken)
    {
        if (orderExists) return (false, null);
        if (request.Source != PortalIntegrationRequestSource.FirstPartyCrm
            || request.RequestType != PortalIntegrationRequestType.SalesAssistedOrder)
            return (false, "This handoff is not a Customer order handoff.");
        if (request.Status != PortalIntegrationRequestStatus.Approved)
            return (false, request.Status == PortalIntegrationRequestStatus.PendingReview
                ? "Approve this handoff in CRM before starting an order."
                : "Only an approved handoff can start an order.");
        if (!request.OrganizationId.HasValue || request.RequestedOrganizationKind != OrganizationKind.Customer)
            return (false, "Attach an active Customer operational scope and approve this handoff before starting an order.");
        if (!request.RequestedServices.Any(value => value.Service == PortalService.PSeqLabService))
            return (false, "This handoff does not request PSeq Lab Service.");
        if (handoff.Opportunity is not null && handoff.Opportunity.Stage.Category != CrmPipelineStageCategory.Won)
            return (false, "Move the linked Opportunity to Won before starting an order.");
        var organization = await dbContext.Organizations.AsNoTracking()
            .SingleOrDefaultAsync(value => value.Id == request.OrganizationId.Value, cancellationToken);
        if (organization is null || !organization.IsActive || organization.Kind != OrganizationKind.Customer)
            return (false, "The Company does not have an active Customer operational scope.");
        if (organization.IsOperationalReadinessBlocked)
            return (false, string.IsNullOrWhiteSpace(organization.OperationalReadinessBlockReason)
                ? "Clear the Customer's manual operational block before starting pricing."
                : organization.OperationalReadinessBlockReason);
        var eligibility = await LabServiceOrderingEligibility.ReadAsync(dbContext, organization.Id, DateTime.UtcNow, cancellationToken);
        if (!eligibility.OrderingAuthorized)
            return (false, "Enable a current Ready PSeq Lab Service entitlement for this Customer.");
        if (!eligibility.OfferingAvailable)
            return (false, "Activate the canonical PSeq Lab Service specimen catalog item.");
        return (true, null);
    }
    private static CrmException Missing(string code, string message) => CrmAccess.NotFound(code, message);
}
