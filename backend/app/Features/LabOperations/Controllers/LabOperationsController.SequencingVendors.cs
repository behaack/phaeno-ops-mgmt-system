namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpGet("sequencing-vendors")]
    public async Task<object> SequencingVendors(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        var products = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join t in dbContext.LabProductTypes.AsNoTracking() on p.ProductTypeId equals t.Id
            join s in dbContext.LabSuppliers.AsNoTracking() on p.SupplierId equals s.Id
            where p.IsActive && t.IsActive && t.Id == LabProductType.SequencingServiceId && s.IsActive && !s.IsInternalProducer
            orderby p.ProductNumber select p).ToListAsync(ct);
        var ids = products.Select(p => p.SupplierId).Distinct().ToArray();
        var suppliers = await dbContext.LabSuppliers.AsNoTracking().Where(s => ids.Contains(s.Id)).OrderBy(s => s.Name).ToListAsync(ct);
        var addresses = await dbContext.LabSupplierShipmentAddresses.AsNoTracking().Where(a => ids.Contains(a.SupplierId) && a.IsActive).OrderBy(a => a.Label).ToListAsync(ct);
        return suppliers.Select(s => new { s.Id, s.Name, s.Version,
            products = products.Where(p => p.SupplierId == s.Id).Select(p => new { p.Id, p.ProductNumber, p.Description, p.Version }),
            shipmentAddresses = addresses.Where(a => a.SupplierId == s.Id).Select(LabSupplierCatalogController.Address) });
    }

    private async Task<(LabSupplier Supplier, LabSupplierProduct Product, LabSupplierShipmentAddress Address)> RequireSequencingVendor(
        Guid supplierId, Guid productId, Guid addressId, long supplierVersion, long productVersion, long addressVersion, CancellationToken ct)
    {
        await SampleShippingPackingData.LockAsync(dbContext, $"supplier-catalog:{supplierId}", ct);
        var supplier = await dbContext.LabSuppliers.AsNoTracking().SingleOrDefaultAsync(s => s.Id == supplierId && s.IsActive && !s.IsInternalProducer, ct)
            ?? throw Invalid("sequencing_vendor_invalid", "Choose an active external sequencing vendor.");
        var product = await dbContext.LabSupplierProducts.AsNoTracking().SingleOrDefaultAsync(p => p.Id == productId && p.SupplierId == supplierId
            && p.IsActive && p.ProductTypeId == LabProductType.SequencingServiceId, ct)
            ?? throw Invalid("sequencing_service_invalid", "Choose an active sequencing service belonging to this vendor.");
        if (!await dbContext.LabProductTypes.AnyAsync(t => t.Id == product.ProductTypeId && t.IsActive, ct))
            throw Invalid("sequencing_service_invalid", "The sequencing service type is inactive.");
        var address = await dbContext.LabSupplierShipmentAddresses.AsNoTracking().SingleOrDefaultAsync(a => a.Id == addressId && a.SupplierId == supplierId && a.IsActive, ct)
            ?? throw Invalid("sequencing_address_invalid", "Choose an active shipment address belonging to this vendor.");
        EnsureVersion(supplier.Version, supplierVersion);
        EnsureVersion(product.Version, productVersion);
        EnsureVersion(address.Version, addressVersion);
        return (supplier, product, address);
    }
}
