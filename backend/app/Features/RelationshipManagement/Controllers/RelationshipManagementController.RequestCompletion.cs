namespace PhaenoPortal.App.Features.RelationshipManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Relationships.Application;
using PSeq.Operations.Commercial.Relationships.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PhaenoPortal.App.Features.RelationshipManagement.DTOs;
using PhaenoPortal.App.Features.RelationshipManagement.Services;

public sealed partial class RelationshipManagementController
{
    [HttpGet("requests/{requestId:guid}/completion-readiness")]
    public async Task<RequestCompletionReadinessDto> GetRequestCompletionReadiness(
        Guid requestId, CancellationToken cancellationToken)
    {
        await RequirePlatformAdminAsync(cancellationToken);
        var request = await RequireRequestAsync(requestId, tracking: false, cancellationToken);
        var organization = request.OrganizationId.HasValue
            ? await RequireOrganizationAsync(request.OrganizationId.Value, cancellationToken)
            : null;
        var readiness = await EvaluateRequestCompletionAsync(request, organization, cancellationToken);
        return readiness with { CompletesAutomatically = await OnlineAccessRequestCompletion.IsAutomaticAsync(dbContext, request, cancellationToken) };
    }

    [HttpPost("requests/{requestId:guid}/reconcile-online-access")]
    public async Task<PortalIntegrationRequestDto> ReconcileOnlineAccess(
        Guid requestId, [FromBody] ReconcileOnlineAccessRequest input, CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        var request = await RequireRequestAsync(requestId, tracking: true, cancellationToken);
        if (request.Status == PortalIntegrationRequestStatus.Applied)
            return ToDto(request);
        EnsureVersion(request.Version, input.Version);
        if (await OnlineAccessRequestCompletion.CompleteIfReadyAsync(dbContext, request, actor.Id, cancellationToken))
            await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(request);
    }

    private async Task<RequestCompletionReadinessDto> EvaluateRequestCompletionAsync(
        PortalIntegrationRequest request, Organization? organization, CancellationToken cancellationToken)
    {
        var blockers = new List<string>();
        if (request.Status != PortalIntegrationRequestStatus.Approved)
            blockers.Add("Only an approved request can be completed.");
        if (organization is null)
        {
            blockers.Add("Enable and attach the Company's Portal access before completing this request.");
            return new(false, blockers);
        }

        if (request.RequestType == PortalIntegrationRequestType.Offboarding)
        {
            if (organization.IsActive)
                blockers.Add("Deactivate Company Portal access after reviewing offboarding obligations.");
            return new(blockers.Count == 0, blockers);
        }

        if (!organization.IsActive)
            blockers.Add("Restore active Company Portal access before completing this request.");

        if (request.RequestType is PortalIntegrationRequestType.Onboarding or PortalIntegrationRequestType.Evaluation)
        {
            var hasActiveAdmin = await OrganizationAdministratorReadiness.HasActiveAsync(
                dbContext, organization.Id, cancellationToken);
            if (!hasActiveAdmin)
                blockers.Add("An organization administrator or an administrator of an active department must accept their invitation and have active Portal access.");
        }

        var now = DateTime.UtcNow;
        if (request.RequestType != PortalIntegrationRequestType.SalesAssistedOrder && request.RequestedServices.Count > 0)
        {
            var usableServices = await dbContext.OrganizationServiceEntitlements.AsNoTracking()
                .Where(value => value.OrganizationId == organization.Id && value.SourceRequestId == request.Id
                    && value.ConfigurationStatus == EntitlementConfigurationStatus.Ready
                    && value.EffectiveFrom <= now && (!value.EffectiveTo.HasValue || value.EffectiveTo > now)
                    && (!value.DepartmentId.HasValue || dbContext.OrganizationDepartments.Any(department =>
                        department.Id == value.DepartmentId && department.OrganizationId == organization.Id && department.IsActive)))
                .Select(value => value.Service).Distinct().ToListAsync(cancellationToken);
            foreach (var requested in request.RequestedServices)
            {
                if (!usableServices.Contains(requested.Service))
                    blockers.Add("Apply a current, Ready " + (requested.Service == PortalService.PSeqLabService ? "PSeq Lab Service" : "PSeq Kit + data assembly")
                        + " entitlement linked to this request in an active Department or at Company scope.");
            }
        }

        if (organization.Kind == OrganizationKind.Customer
            && request.RequestedServices.Any(value => value.Service == PortalService.PSeqLabService))
        {
            var readiness = await EvaluateOperationalReadinessAsync(organization, cancellationToken);
            if (request.RequestType != PortalIntegrationRequestType.SalesAssistedOrder && readiness.State != OperationalReadiness.Ready)
                blockers.AddRange(readiness.Blockers.Count > 0
                    ? readiness.Blockers.Select(value => value.NextAction)
                    : ["Complete the Customer operational-readiness checklist."]);
        }

        if (request.RequestType == PortalIntegrationRequestType.RelationshipChange
            && organization.Kind != request.RequestedOrganizationKind
            && (organization.Kind != OrganizationKind.Prospect
                || request.RequestedOrganizationKind is not (OrganizationKind.Customer or OrganizationKind.Partner)))
            blockers.Add("Only an approved Prospect-to-Customer or Prospect-to-Partner conversion can be applied.");

        var handoff = await dbContext.CrmHandoffs.AsNoTracking()
            .SingleOrDefaultAsync(value => value.RelationshipRequestId == request.Id, cancellationToken);
        if (handoff?.Type == CrmHandoffType.TrialProject)
        {
            var trial = await dbContext.TrialProjects.AsNoTracking()
                .SingleOrDefaultAsync(value => value.CrmHandoffId == handoff.Id, cancellationToken);
            if (trial is null)
                blockers.Add("Start the Trial from this exact Company request.");
            else if (trial.Status is TrialStatus.Declined or TrialStatus.Expired or TrialStatus.Cancelled or TrialStatus.ClosedIncomplete)
                blockers.Add("The linked Trial did not complete its approved handoff. Review its outcome and cancel this request when appropriate.");
            else if (trial.CurrentScopeRevision == 0
                || trial.ApprovedScopeRevision != trial.CurrentScopeRevision
                || trial.AcceptedScopeRevision != trial.CurrentScopeRevision)
                blockers.Add("Obtain both Trial scope approvals and the Prospect's acceptance of the current scope revision.");
        }

        if (request.RequestType == PortalIntegrationRequestType.SalesAssistedOrder
            && request.RequestedOrganizationKind == OrganizationKind.Customer
            && request.RequestedServices.Any(value => value.Service == PortalService.PSeqLabService)
            && !await dbContext.LabServiceOrders.AsNoTracking().AnyAsync(value =>
                value.SourceRequestId == request.Id && value.OrganizationId == organization.Id, cancellationToken))
            blockers.Add("Start the Customer order from this exact request in Order operations. Creating the order completes the request.");

        return new(blockers.Count == 0, blockers.Distinct().ToList());
    }
}