namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Route("api/partner-shipping-addresses")]
public sealed class PartnerShippingAddressesController(PSeqOperationsDbContext dbContext, OrderRequestContext requestContext) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<ShippingAddressDto>> List(CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, false, cancellationToken);
        var addresses = await dbContext.PartnerShippingAddresses.AsNoTracking()
            .Where(item => item.OrganizationId == tenant.Organization.Id && item.IsActive)
            .OrderBy(item => item.Label).ToListAsync(cancellationToken);
        return addresses.Select(item => item.ToDto()).ToList();
    }

    [HttpPost]
    public async Task<ShippingAddressDto> Create([FromBody] ShippingAddressWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var address = Construct(tenant.Organization.Id, request);
        dbContext.PartnerShippingAddresses.Add(address);
        await dbContext.SaveChangesAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return address.ToDto();
    }

    [HttpPatch("{addressId:guid}")]
    public async Task<ShippingAddressDto> Update(Guid addressId, [FromBody] ShippingAddressWriteRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var address = await ReadAsync(addressId, tenant.Organization.Id, cancellationToken);
        if (!request.Version.HasValue || request.Version.Value != address.Version) throw new DbUpdateConcurrencyException();
        Execute(() => address.Update(request.Label, request.Recipient, request.Line1, request.Line2, request.City,
            request.Region, request.PostalCode, request.CountryCode, request.Phone));
        await dbContext.SaveChangesAsync(cancellationToken);
        return address.ToDto();
    }

    [HttpDelete("{addressId:guid}")]
    public async Task<ShippingAddressDto> Delete(Guid addressId, [FromQuery] long version, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireTenantAsync(HttpContext, OrganizationKind.Partner, true, cancellationToken);
        var address = await ReadAsync(addressId, tenant.Organization.Id, cancellationToken);
        if (version != address.Version) throw new DbUpdateConcurrencyException();
        address.Deactivate();
        await dbContext.SaveChangesAsync(cancellationToken);
        return address.ToDto();
    }

    private async Task<PartnerShippingAddress> ReadAsync(Guid id, Guid organizationId, CancellationToken cancellationToken)
        => await dbContext.PartnerShippingAddresses.FirstOrDefaultAsync(item => item.Id == id && item.OrganizationId == organizationId && item.IsActive, cancellationToken)
            ?? throw new OrderManagementException("shipping_address_not_found", "The shipping address was not found.", StatusCodes.Status404NotFound);

    private static PartnerShippingAddress Construct(Guid organizationId, ShippingAddressWriteRequest request)
    {
        try { return new PartnerShippingAddress(organizationId, request.Label, request.Recipient, request.Line1, request.Line2,
            request.City, request.Region, request.PostalCode, request.CountryCode, request.Phone); }
        catch (ArgumentException exception) { throw new OrderManagementException("shipping_address_invalid", exception.Message); }
    }

    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw new OrderManagementException("shipping_address_invalid", exception.Message); }
    }
}
