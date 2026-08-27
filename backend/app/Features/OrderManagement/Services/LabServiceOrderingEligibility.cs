namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record LabServiceOrderingEligibilitySnapshot(
    Guid? EntitlementId,
    Guid? CatalogItemId)
{
    public bool OrderingAuthorized => EntitlementId.HasValue;
    public bool OfferingAvailable => CatalogItemId.HasValue;
    public bool CanOrder => OrderingAuthorized && OfferingAvailable;
}

public static class LabServiceOrderingEligibility
{
    public static async Task<LabServiceOrderingEligibilitySnapshot> ReadAsync(
        PSeqOperationsDbContext dbContext,
        Guid organizationId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var entitlementId = await dbContext.OrganizationServiceEntitlements
            .AsNoTracking()
            .Where(item => item.OrganizationId == organizationId
                && item.Service == PortalService.PSeqLabService
                && item.ConfigurationStatus == EntitlementConfigurationStatus.Ready
                && item.EffectiveFrom <= utcNow
                && (!item.EffectiveTo.HasValue || item.EffectiveTo.Value > utcNow))
            .OrderByDescending(item => item.EffectiveFrom)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var catalogItemId = await dbContext.QboCatalogItems
            .AsNoTracking()
            .Where(item => item.IsActive
                && item.ExternalItemId.ToLower() == OrderServiceKeys.PSeqLabService
                && item.SalesUnit.ToLower() == OrderSalesUnits.Specimen)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return new LabServiceOrderingEligibilitySnapshot(entitlementId, catalogItemId);
    }

    public static async Task<LabServiceOrderingEligibilitySnapshot> RequireAsync(
        PSeqOperationsDbContext dbContext,
        Guid organizationId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var eligibility = await ReadAsync(dbContext, organizationId, utcNow, cancellationToken);
        if (!eligibility.OrderingAuthorized)
        {
            throw new OrderManagementException(
                "lab_service_ordering_not_authorized",
                "Ordering is not authorized for this Customer. Enable a current Ready PSeq Lab Service entitlement before continuing.",
                StatusCodes.Status409Conflict);
        }

        if (!eligibility.OfferingAvailable)
        {
            throw new OrderManagementException(
                "lab_service_offering_unavailable",
                "PSeq Lab Service is not currently available for ordering. Activate the canonical specimen catalog item before continuing.",
                StatusCodes.Status409Conflict);
        }

        return eligibility;
    }
}
