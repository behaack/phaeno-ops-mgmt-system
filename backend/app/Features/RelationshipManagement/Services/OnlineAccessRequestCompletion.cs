namespace PhaenoPortal.App.Features.RelationshipManagement.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;

public static class OnlineAccessRequestCompletion
{
    public const string CompletionNotes = "Completed automatically: Company Portal access is enabled and an organization or active-department administrator has accepted access.";

    public static async Task<bool> IsAutomaticAsync(PSeqOperationsDbContext db, PortalIntegrationRequest request, CancellationToken cancellationToken)
    {
        if (request.Source != PortalIntegrationRequestSource.FirstPartyCrm
            || request.RequestType is not (PortalIntegrationRequestType.Onboarding or PortalIntegrationRequestType.Evaluation)
            || request.RequestedServices.Count > 0)
            return false;

        return !await db.CrmHandoffs.AnyAsync(value => value.RelationshipRequestId == request.Id
            && value.Type != CrmHandoffType.PortalOnboarding && value.Type != CrmHandoffType.PortalEvaluation, cancellationToken);
    }

    public static async Task<bool> CompleteIfReadyAsync(PSeqOperationsDbContext db, PortalIntegrationRequest request, Guid actorUserId, CancellationToken cancellationToken)
    {
        if (request.Status != PortalIntegrationRequestStatus.Approved || !request.OrganizationId.HasValue
            || !await IsAutomaticAsync(db, request, cancellationToken))
            return false;

        var organizationId = request.OrganizationId.Value;
        if (!await db.Organizations.AnyAsync(value => value.Id == organizationId && value.IsActive, cancellationToken)
            || !await OrganizationAdministratorReadiness.HasActiveAsync(db, organizationId, cancellationToken))
            return false;

        request.MarkApplied(CompletionNotes, actorUserId, DateTime.UtcNow);
        return true;
    }

    // Acceptance has already validated identity and access. Save these request changes in
    // that same transaction so accepting access and recording completion cannot diverge.
    public static async Task CompleteAfterAcceptanceAsync(PSeqOperationsDbContext db, Organization? organization,
        OrganizationMembership membership, User user, DateTime utcNow, bool hasValidatedDepartmentAdministratorAccess, CancellationToken cancellationToken)
    {
        if (organization is not { IsActive: true } || !membership.IsActive
            || (!membership.IsOrganizationAdmin && !hasValidatedDepartmentAdministratorAccess)
            || membership.OrganizationId != organization.Id || membership.UserId != user.Id
            || user is not { IsActive: true, Status: UserAccountStatus.Active })
            return;

        var requests = await db.PortalIntegrationRequests.Include(value => value.RequestedServices)
            .Where(value => value.OrganizationId == organization.Id && value.Status == PortalIntegrationRequestStatus.Approved
                && value.Source == PortalIntegrationRequestSource.FirstPartyCrm
                && (value.RequestType == PortalIntegrationRequestType.Onboarding || value.RequestType == PortalIntegrationRequestType.Evaluation)
                && !value.RequestedServices.Any()
                && !db.CrmHandoffs.Any(handoff => handoff.RelationshipRequestId == value.Id
                    && handoff.Type != CrmHandoffType.PortalOnboarding && handoff.Type != CrmHandoffType.PortalEvaluation))
            .ToListAsync(cancellationToken);
        foreach (var request in requests)
            request.MarkApplied(CompletionNotes, user.Id, utcNow);
    }
}
