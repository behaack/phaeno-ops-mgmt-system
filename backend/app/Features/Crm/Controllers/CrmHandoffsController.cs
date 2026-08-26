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
using PhaenoPortal.App.Infrastructure.Persistence;
using static PhaenoPortal.App.Features.Crm.Services.CrmAccess;

[ApiController]
[Authorize]
[Route("api/platform/crm/companies/{companyId:guid}")]
public sealed class CrmHandoffsController(PSeqOperationsDbContext dbContext, IExternalIdentityContext externalIdentityContext) : ControllerBase
{
    [HttpGet("handoffs")]
    public async Task<IReadOnlyList<CrmHandoffDto>> Handoffs(Guid companyId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var values = await dbContext.CrmHandoffs.AsNoTracking().Include(value => value.RelationshipRequest)
            .Where(value => value.CompanyId == companyId).OrderByDescending(value => value.CreatedAt).ToListAsync(cancellationToken);
        return values.Select(value => ToDto(value)).ToList();
    }

    [HttpPost("handoffs")]
    public async Task<ActionResult<CrmHandoffDto>> CreateHandoff(Guid companyId, [FromBody] CreateCrmHandoffRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        var company = await dbContext.CrmCompanies.FirstOrDefaultAsync(value => value.Id == companyId && value.IsActive, cancellationToken)
            ?? throw Missing("crm_company_not_found", "The active CRM company was not found.");
        if (await dbContext.CrmHandoffs.AnyAsync(value => value.IdempotencyKey == request.IdempotencyKey, cancellationToken))
            throw CrmAccess.Conflict("crm_handoff_duplicate", "This CRM handoff has already been created.");

        CrmOpportunity? opportunity = null;
        if (request.OpportunityId.HasValue)
        {
            opportunity = await dbContext.CrmOpportunities.FirstOrDefaultAsync(value => value.Id == request.OpportunityId && value.CompanyId == companyId, cancellationToken)
                ?? throw Missing("crm_handoff_opportunity_not_found", "The selected Opportunity does not belong to this Company.");
        }

        var activeLink = await dbContext.CrmPortalAccountLinks.AsNoTracking().Include(value => value.Organization)
            .Where(value => value.CompanyId == companyId && value.IsActive).OrderByDescending(value => value.LinkedAt).FirstOrDefaultAsync(cancellationToken);
        var organizationId = activeLink?.OrganizationId;
        var requestedKind = activeLink?.Organization.Kind ?? request.RequestedOrganizationKind;
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
            activeLink?.Organization.Name ?? company.Name,
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
        return Created($"/api/platform/crm/companies/{companyId}/handoffs/{value.Id}", ToDto(value, relationshipRequest));
    }

    [HttpGet("portal-links")]
    public async Task<IReadOnlyList<CrmPortalAccountLinkDto>> PortalLinks(Guid companyId, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        return await dbContext.CrmPortalAccountLinks.AsNoTracking().Where(value => value.CompanyId == companyId)
            .OrderByDescending(value => value.IsActive).ThenByDescending(value => value.LinkedAt)
            .Select(value => new CrmPortalAccountLinkDto(value.Id, value.CompanyId, value.OrganizationId, value.Organization.Name, value.Organization.Kind, value.Reason, value.LinkedByUser.FirstName + " " + value.LinkedByUser.LastName, value.LinkedAt, value.IsActive, value.Version))
            .ToListAsync(cancellationToken);
    }

    [HttpPost("portal-links")]
    public async Task<ActionResult<CrmPortalAccountLinkDto>> LinkPortalAccount(Guid companyId, [FromBody] CreateCrmPortalAccountLinkRequest request, CancellationToken cancellationToken)
    {
        var actor = await RequireActor(cancellationToken);
        if (!await dbContext.CrmCompanies.AnyAsync(value => value.Id == companyId && value.IsActive, cancellationToken)) throw Missing("crm_company_not_found", "The active CRM company was not found.");
        var organization = await dbContext.Organizations.FirstOrDefaultAsync(value => value.Id == request.OrganizationId && value.IsActive, cancellationToken)
            ?? throw Missing("portal_organization_not_found", "The active Portal organization was not found.");
        var prior = await dbContext.CrmPortalAccountLinks.FirstOrDefaultAsync(value => value.CompanyId == companyId && value.OrganizationId == organization.Id, cancellationToken);
        if (prior?.IsActive == true) throw CrmAccess.Conflict("crm_portal_link_exists", "This Company is already linked to that Portal organization.");
        var value = prior ?? Execute(() => new CrmPortalAccountLink(companyId, organization.Id, request.Reason, actor.Id, DateTime.UtcNow));
        if (prior is null) dbContext.CrmPortalAccountLinks.Add(value); else value.Reactivate();
        await dbContext.SaveChangesAsync(cancellationToken);
        return Created($"/api/platform/crm/companies/{companyId}/portal-links/{value.Id}", new CrmPortalAccountLinkDto(value.Id, companyId, organization.Id, organization.Name, organization.Kind, value.Reason, $"{actor.FirstName} {actor.LastName}".Trim(), value.LinkedAt, value.IsActive, value.Version));
    }

    [HttpPost("portal-links/{linkId:guid}/{lifecycleAction:regex(^(deactivate|reactivate)$)}")]
    public async Task<CrmPortalAccountLinkDto> ChangePortalLink(Guid companyId, Guid linkId, string lifecycleAction, [FromBody] ChangeCrmPortalAccountLinkRequest request, CancellationToken cancellationToken)
    {
        await RequireActor(cancellationToken);
        var value = await dbContext.CrmPortalAccountLinks.Include(item => item.Organization).Include(item => item.LinkedByUser).FirstOrDefaultAsync(item => item.Id == linkId && item.CompanyId == companyId, cancellationToken)
            ?? throw Missing("crm_portal_link_not_found", "The CRM-to-Portal account link was not found.");
        EnsureVersion(value.Version, request.Version);
        Execute(lifecycleAction == "reactivate" ? value.Reactivate : value.Deactivate);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new(value.Id, value.CompanyId, value.OrganizationId, value.Organization.Name, value.Organization.Kind, value.Reason, $"{value.LinkedByUser.FirstName} {value.LinkedByUser.LastName}".Trim(), value.LinkedAt, value.IsActive, value.Version);
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
    private static CrmHandoffDto ToDto(CrmHandoff value, PortalIntegrationRequest? request = null)
    {
        var relationshipRequest = request ?? value.RelationshipRequest;
        return new(value.Id, value.CompanyId, value.OpportunityId, value.Type, value.RelationshipRequestId, relationshipRequest.RequestNumber, relationshipRequest.Status, relationshipRequest.RequestedOrganizationKind, relationshipRequest.OrganizationId, value.IdempotencyKey, value.CreatedAt);
    }
    private static CrmException Missing(string code, string message) => CrmAccess.NotFound(code, message);
}
