namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/order-catalog/lab-service-offerings")]
public sealed class LabServiceOfferingCatalogController(PSeqOperationsDbContext dbContext, OrderRequestContext requestContext) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<LabServiceOfferingDto>> List(CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, cancellationToken);
        var eligibility = await LabServiceOrderingEligibility.ReadAsync(dbContext, tenant.Organization.Id,
            DateTime.UtcNow, cancellationToken, tenant.Department.Id);
        if (!eligibility.CanOrder) return [];
        var offerings = await new LabServiceOfferingService(dbContext).ReadAsync(true, cancellationToken);
        var result = new List<LabServiceOfferingDto>();
        foreach (var offering in offerings)
        {
            var price = await LabServicePriceResolver.ResolveAsync(dbContext, tenant.Organization.Id, tenant.Department.Id, offering, cancellationToken);
            result.Add(offering with { UnitPrice = price.UnitPrice, PriceProvenance = price });
        }
        return result;
    }
}
