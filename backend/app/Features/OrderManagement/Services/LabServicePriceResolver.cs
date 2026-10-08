namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class LabServicePriceResolver
{
    public static async Task<LabServicePriceProvenance> ResolveAsync(PSeqOperationsDbContext db,
        Guid organizationId, Guid departmentId, LabServiceOfferingDto offering, CancellationToken token)
    {
        var prices = await db.Set<LabServiceNegotiatedPrice>().AsNoTracking().Where(p =>
            p.OrganizationId == organizationId && p.CatalogItemId == offering.CatalogItemId
            && (p.DepartmentId == null || p.DepartmentId == departmentId)).ToArrayAsync(token);
        try { return LabServicePriceRules.Resolve(organizationId, departmentId, offering.CatalogItemId,
            offering.CatalogItemVersion, offering.UnitPrice, prices, DateTime.UtcNow); }
        catch (InvalidOperationException exception) { throw new OrderManagementException("service_price_conflict", exception.Message, 409); }
    }
}
