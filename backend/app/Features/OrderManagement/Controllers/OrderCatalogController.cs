namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/order-catalog")]
public sealed class OrderCatalogController(AppDbContext dbContext, OrderRequestContext requestContext) : ControllerBase
{
    [HttpGet("analyses")]
    public async Task<IReadOnlyList<AnalysisDefinitionDto>> Analyses(CancellationToken cancellationToken)
    {
        _ = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Customer, false, cancellationToken);
        return await dbContext.AnalysisDefinitions.AsNoTracking().Where(item => item.IsActive && !item.IsSynthetic)
            .OrderBy(item => item.Name).Select(item => new AnalysisDefinitionDto(item.Id, item.QboCatalogItemId, item.Name,
                item.Description, item.SubmissionInstructions, item.RequiredIntakeFieldsJson, item.ResultContractJson,
                item.IsActive, item.IsSynthetic, item.Version)).ToListAsync(cancellationToken);
    }

    [HttpGet("reagent-offerings")]
    public async Task<IReadOnlyList<ReagentOfferingDto>> ReagentOfferings(CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        var now = DateTime.UtcNow;
        return await (from offering in dbContext.PartnerReagentOfferings.AsNoTracking()
            join item in dbContext.QboCatalogItems.AsNoTracking() on offering.QboCatalogItemId equals item.Id
            where offering.PartnerOrganizationId == tenant.Organization.Id && offering.IsActive && item.IsActive
                && offering.EffectiveFrom <= now && (!offering.EffectiveTo.HasValue || offering.EffectiveTo > now)
            orderby item.Name
            select new ReagentOfferingDto(offering.Id, offering.PartnerOrganizationId, offering.QboCatalogItemId,
                item.Name, offering.NegotiatedUnitPrice, offering.Currency, offering.SellingUnit, offering.OrderIncrement,
                offering.MinimumQuantity ?? offering.OrderIncrement, offering.MaximumQuantity, offering.ShippingRestrictionsJson,
                offering.EffectiveFrom, offering.EffectiveTo, offering.IsActive, offering.Version)).ToListAsync(cancellationToken);
    }

    [HttpGet("assembly-profiles")]
    public async Task<IReadOnlyList<AssemblyProfileDto>> AssemblyProfiles(CancellationToken cancellationToken)
    {
        _ = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        return await dbContext.AssemblyProfiles.AsNoTracking().Where(item => item.IsActive && !item.IsSynthetic)
            .OrderBy(item => item.Name).ThenByDescending(item => item.ProfileVersion)
            .Select(item => new AssemblyProfileDto(item.Id, item.QboCatalogItemId, item.Name, item.ProfileVersion,
                item.Description, item.Instructions, item.MetadataSchemaJson, item.AllowedFileKindsJson,
                item.OutputContractJson, item.MaximumFileSizeBytes, item.MaximumTotalSizeBytes, item.IsActive,
                item.IsSynthetic, item.Version)).ToListAsync(cancellationToken);
    }
}
