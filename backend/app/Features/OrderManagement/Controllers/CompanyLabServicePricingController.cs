namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record NegotiatedLabPriceWrite(Guid CatalogItemId, Guid? DepartmentId, decimal UnitPrice,
    DateTime EffectiveFrom, DateTime? EffectiveTo, bool IsActive, long? Version = null);
public sealed record NegotiatedLabPriceDto(Guid Id, Guid CatalogItemId, Guid? DepartmentId, decimal UnitPrice,
    DateTime EffectiveFrom, DateTime? EffectiveTo, bool IsActive, long Version);
public sealed record LabPriceChoice(Guid Id, string Name, bool IsActive);
public sealed record CompanyLabPricingDto(Guid OrganizationId, IReadOnlyList<NegotiatedLabPriceDto> Prices,
    IReadOnlyList<LabPriceChoice> Services, IReadOnlyList<LabPriceChoice> Departments);

[ApiController, Authorize, Route("api/platform/companies/{companyId:guid}/lab-service-pricing")]
public sealed class CompanyLabServicePricingController(PSeqOperationsDbContext db, OrderRequestContext access,
    IOptions<PSeqOrderToCashOptions> options) : ControllerBase
{
    [HttpGet]
    public async Task<CompanyLabPricingDto> List(Guid companyId, CancellationToken token)
    {
        await access.RequireCommercialOrderAsync(HttpContext, options.Value.BusinessRoles, true, token);
        var organizationId = await CompanyScope(companyId, token);
        var prices = await db.Set<LabServiceNegotiatedPrice>().AsNoTracking()
            .Where(p => p.OrganizationId == organizationId).OrderByDescending(p => p.EffectiveFrom).ToListAsync(token);
        var services = await db.QboCatalogItems.AsNoTracking().Where(p => p.ServiceFamily == CatalogServiceFamily.PSeqLabService)
            .OrderBy(p => p.Name).Select(p => new LabPriceChoice(p.Id, p.Name, p.IsActive)).ToListAsync(token);
        var departments = await db.OrganizationDepartments.AsNoTracking().Where(p => p.OrganizationId == organizationId && p.IsActive)
            .OrderBy(p => p.Name).Select(p => new LabPriceChoice(p.Id, p.Name, p.IsActive)).ToListAsync(token);
        return new(organizationId, prices.Select(Map).ToArray(), services, departments);
    }

    [HttpPost]
    public Task<NegotiatedLabPriceDto> Create(Guid companyId, [FromBody] NegotiatedLabPriceWrite request, CancellationToken token)
        => Save(companyId, null, request, token);
    [HttpPatch("{id:guid}")]
    public Task<NegotiatedLabPriceDto> Update(Guid companyId, Guid id, [FromBody] NegotiatedLabPriceWrite request, CancellationToken token)
        => Save(companyId, id, request, token);

    private async Task<NegotiatedLabPriceDto> Save(Guid companyId, Guid? id, NegotiatedLabPriceWrite request, CancellationToken token)
    {
        var actor = await access.RequireCommercialOrderAsync(HttpContext, options.Value.BusinessRoles, false, token);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
        var organizationId = await CompanyScope(companyId, token);
        if (!await db.QboCatalogItems.AnyAsync(p => p.Id == request.CatalogItemId && p.Currency == "USD"
            && p.ServiceFamily == CatalogServiceFamily.PSeqLabService && (id.HasValue || p.IsActive), token))
            throw Invalid("Select an active USD Lab service for a new negotiated price.");
        if (request.DepartmentId.HasValue && !await db.OrganizationDepartments.AnyAsync(p => p.Id == request.DepartmentId
            && p.OrganizationId == organizationId && p.IsActive, token)) throw Invalid("Select an active Department in this Company.");
        LabServiceNegotiatedPrice price;
        try
        {
            if (id.HasValue)
            {
                price = await db.Set<LabServiceNegotiatedPrice>().SingleOrDefaultAsync(p => p.Id == id && p.OrganizationId == organizationId, token)
                    ?? throw new OrderManagementException("price_not_found", "The service price was not found.", 404);
                if (price.Version != request.Version) throw new DbUpdateConcurrencyException();
                if (price.CatalogItemId != request.CatalogItemId || price.DepartmentId != request.DepartmentId)
                    throw Invalid("Create a new price to change its service or scope.");
                price.Update(request.UnitPrice, request.EffectiveFrom, request.EffectiveTo, request.IsActive);
            }
            else price = new(organizationId, request.DepartmentId, request.CatalogItemId, request.UnitPrice,
                request.EffectiveFrom, request.EffectiveTo, request.IsActive);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        if (request.IsActive && await db.Set<LabServiceNegotiatedPrice>().AnyAsync(p => p.OrganizationId == organizationId
            && p.CatalogItemId == request.CatalogItemId && p.DepartmentId == request.DepartmentId && p.Id != price.Id && p.IsActive
            && (!request.EffectiveTo.HasValue || p.EffectiveFrom < request.EffectiveTo)
            && (!p.EffectiveTo.HasValue || request.EffectiveFrom < p.EffectiveTo), token))
            throw new OrderManagementException("price_window_overlap", "Another price for this service and scope overlaps this window. Edit that price or choose a separate window.", 409);
        if (!id.HasValue) db.Set<LabServiceNegotiatedPrice>().Add(price);
        AccountAudit.Add(db, HttpContext, nameof(LabServiceNegotiatedPrice), price.Id, "LabServicePriceSaved", null,
            actor.Id, new { price.OrganizationId, price.DepartmentId, price.CatalogItemId, price.UnitPrice, price.IsActive, price.EffectiveFrom, price.EffectiveTo });
        await db.SaveChangesAsync(token);
        await transaction.CommitAsync(token);
        return Map(price);
    }
    private async Task<Guid> CompanyScope(Guid companyId, CancellationToken token)
    {
        var company = await db.CrmCompanies.AsNoTracking().SingleOrDefaultAsync(p => p.Id == companyId && p.IsActive && p.MergedIntoCompanyId == null, token)
            ?? throw new OrderManagementException("company_not_found", "The active Company was not found.", 404);
        var organizationId = company.AccessOrganizationId ?? company.SetupOrganizationId;
        if (!organizationId.HasValue || !await db.Organizations.AnyAsync(p => p.Id == organizationId && p.Kind == OrganizationKind.Customer && p.IsActive, token))
            throw Invalid("Set up the Company's Customer scope before configuring service prices.");
        return organizationId.Value;
    }
    private static NegotiatedLabPriceDto Map(LabServiceNegotiatedPrice p) => new(p.Id, p.CatalogItemId, p.DepartmentId,
        p.UnitPrice, p.EffectiveFrom, p.EffectiveTo, p.IsActive, p.Version);
    private static OrderManagementException Invalid(string message) => new("service_price_invalid", message, 400);
}
