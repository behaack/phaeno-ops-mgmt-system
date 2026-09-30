namespace PhaenoPortal.App.Features.RelationshipManagement.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.RelationshipManagement.DTOs;

public sealed partial class RelationshipManagementController
{
    [HttpPut("requests/{requestId:guid}/service-entitlements")]
    public async Task<IReadOnlyList<OrganizationServiceEntitlementDto>> SaveApprovedServiceEntitlements(
        Guid requestId,
        [FromBody] SaveApprovedServiceEntitlementsRequest input,
        CancellationToken cancellationToken)
    {
        var actor = await RequirePlatformAdminAsync(cancellationToken);
        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken) : null;
        await LockCompanySetupAsync(requestId, cancellationToken);
        var request = await RequireRequestAsync(requestId, tracking: true, cancellationToken);
        EnsureVersion(request.Version, input.Version);
        if (request.Status != PortalIntegrationRequestStatus.Approved)
            throw Conflict("service_request_not_approved", "Approve the service change before saving its permissions.");

        IReadOnlyList<OrganizationServiceEntitlement> saved;
        try
        {
            saved = await SaveRequestedServiceEntitlementsAsync(request, input.ServiceEntitlements, actor.Id, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw Conflict("service_entitlement_version_conflict",
                "A service permission changed. Refresh the request and review the current permission before saving.");
        }
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return saved.Select(ToDto).ToList();
    }

    private async Task<IReadOnlyList<OrganizationServiceEntitlement>> SaveRequestedServiceEntitlementsAsync(
        PortalIntegrationRequest request,
        IReadOnlyList<RequestedServiceEntitlement> changes,
        Guid actorId,
        CancellationToken cancellationToken)
    {
        if (request.RequestType != PortalIntegrationRequestType.ServiceChange || !request.OrganizationId.HasValue)
            throw Conflict("service_request_not_eligible", "The approved service change must have a Company access scope.");

        var requested = request.RequestedServices.Select(value => value.Service).ToHashSet();
        if (requested.Count == 0 || changes.Count != requested.Count
            || changes.Select(value => value.Service).Distinct().Count() != requested.Count
            || changes.Any(value => !requested.Contains(value.Service)))
            throw Conflict("service_request_scope_mismatch", "Provide one permission for each service in this request.");

        var organization = await RequireOrganizationAsync(request.OrganizationId.Value, cancellationToken);
        var saved = new List<OrganizationServiceEntitlement>();
        foreach (var change in changes)
        {
            EnsureServiceAllowed(organization.Kind, change.Service);
            await EnsureDepartmentAsync(organization.Id, change.DepartmentId, cancellationToken);
            if (change.EffectiveFrom == default || change.EffectiveTo.HasValue && change.EffectiveTo <= change.EffectiveFrom)
                throw Conflict("service_entitlement_dates_invalid", "Choose a valid start and an end after the start.");
            if (!Enum.IsDefined(change.ConfigurationStatus))
                throw Conflict("service_entitlement_status_invalid", "Choose a valid service configuration.");

            if (change.ExistingEntitlementId.HasValue)
            {
                if (!change.ExistingEntitlementVersion.HasValue)
                    throw Conflict("service_entitlement_version_required", "Refresh the existing permission before saving.");
                var existing = await RequireEntitlementAsync(organization.Id, change.ExistingEntitlementId.Value, cancellationToken);
                EnsureVersion(existing.Version, change.ExistingEntitlementVersion.Value);
                if (existing.Service != change.Service || existing.DepartmentId != change.DepartmentId || existing.EndReason is not null)
                    throw Conflict("service_entitlement_not_editable", "Choose an active permission for the same service and Department.");
                await EnsureNoOverlapAsync(organization.Id, change.DepartmentId, change.Service,
                    change.EffectiveFrom, change.EffectiveTo, existing.Id, cancellationToken);
                Execute(() => existing.Update(change.EffectiveFrom, change.EffectiveTo,
                    change.ConfigurationStatus, request.Id, existing.Notes));
                saved.Add(existing);
            }
            else
            {
                if (change.ExistingEntitlementVersion.HasValue)
                    throw Conflict("service_entitlement_id_required", "Select the existing permission to update.");
                await EnsureNoOverlapAsync(organization.Id, change.DepartmentId, change.Service,
                    change.EffectiveFrom, change.EffectiveTo, null, cancellationToken);
                var entitlement = Execute(() => new OrganizationServiceEntitlement(
                    organization.Id, change.Service, change.EffectiveFrom, change.EffectiveTo,
                    change.ConfigurationStatus, actorId, request.Id, null, change.DepartmentId));
                dbContext.OrganizationServiceEntitlements.Add(entitlement);
                saved.Add(entitlement);
            }
        }

        return saved;
    }
}
