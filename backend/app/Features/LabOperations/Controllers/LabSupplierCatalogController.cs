namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record SupplierCatalogProductDto(Guid Id, Guid SupplierId, string ProductNumber, string Description, string Kind, bool IsActive, long Version, Guid ProductTypeId, string ProductTypeName, bool ProductTypeIsActive);
public sealed record SupplierCatalogEntryDto(Guid Id, string Name, bool IsActive, long Version, IReadOnlyList<SupplierCatalogProductDto> Products);
public sealed record SaveSupplierRequest(string Name, bool IsActive = true, long Version = 0);
public sealed record SaveSupplierProductRequest(string ProductNumber, string Description, Guid ProductTypeId, bool IsActive = true, long Version = 0);

[ApiController]
[Authorize]
[Route("api/platform/lab-operations/suppliers")]
public sealed class LabSupplierCatalogController(PSeqOperationsDbContext db, OrderRequestContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<SupplierCatalogEntryDto>> List(CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var suppliers = await db.LabSuppliers.AsNoTracking().OrderBy(s => s.Name).ToListAsync(ct);
        var products = await db.LabSupplierProducts.AsNoTracking().OrderBy(p => p.ProductNumber).ToListAsync(ct);
        var types = await db.LabProductTypes.AsNoTracking().ToDictionaryAsync(t => t.Id, ct);
        return suppliers.Select(s => new SupplierCatalogEntryDto(s.Id, s.Name, s.IsActive, s.Version,
            products.Where(p => p.SupplierId == s.Id).Select(p => Product(p, types[p.ProductTypeId])).ToArray())).ToArray();
    }

    [HttpPost]
    public async Task<SupplierCatalogEntryDto> Create([FromBody] SaveSupplierRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        LabSupplier supplier;
        try { supplier = new LabSupplier(request.Name); supplier.SetActive(request.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        db.LabSuppliers.Add(supplier);
        await Save(ct);
        return new(supplier.Id, supplier.Name, supplier.IsActive, supplier.Version, []);
    }

    [HttpPut("{id:guid}")]
    public async Task<SupplierCatalogEntryDto> Update(Guid id, [FromBody] SaveSupplierRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var supplier = await db.LabSuppliers.SingleOrDefaultAsync(s => s.Id == id, ct) ?? throw Missing();
        Version(supplier.Version, request.Version);
        try { supplier.Rename(request.Name); supplier.SetActive(request.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        await Save(ct);
        var products = await db.LabSupplierProducts.AsNoTracking().Where(p => p.SupplierId == id).OrderBy(p => p.ProductNumber).ToListAsync(ct);
        var types = await db.LabProductTypes.AsNoTracking().ToDictionaryAsync(t => t.Id, ct);
        return new(supplier.Id, supplier.Name, supplier.IsActive, supplier.Version, products.Select(p => Product(p, types[p.ProductTypeId])).ToArray());
    }

    [HttpPost("{supplierId:guid}/products")]
    public async Task<SupplierCatalogProductDto> CreateProduct(Guid supplierId, [FromBody] SaveSupplierProductRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var supplier = await db.LabSuppliers.SingleOrDefaultAsync(s => s.Id == supplierId, ct) ?? throw Missing();
        if (!supplier.IsActive) throw Invalid("Reactivate the supplier before adding products.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"product-type:{request.ProductTypeId}", ct);
        var type = await ProductType(request.ProductTypeId, null, ct);
        LabSupplierProduct product;
        try { product = new(supplierId, request.ProductNumber, request.Description, type.Id); product.Update(request.ProductNumber, request.Description, type.Id, request.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        db.LabSupplierProducts.Add(product);
        await Save(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Product(product, type);
    }

    [HttpPut("{supplierId:guid}/products/{productId:guid}")]
    public async Task<SupplierCatalogProductDto> UpdateProduct(Guid supplierId, Guid productId, [FromBody] SaveSupplierProductRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var product = await db.LabSupplierProducts.SingleOrDefaultAsync(p => p.Id == productId && p.SupplierId == supplierId, ct) ?? throw Missing();
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"product-type:{request.ProductTypeId}", ct);
        Version(product.Version, request.Version);
        var type = await ProductType(request.ProductTypeId, product.ProductTypeId, ct);
        try { product.Update(request.ProductNumber, request.Description, type.Id, request.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        await Save(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Product(product, type);
    }

    private async Task Save(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw new OrderManagementException("supplier_catalog_duplicate", "That supplier name or product number already exists. Edit the existing record, including inactive records.", 409); }
    }
    private static SupplierCatalogProductDto Product(LabSupplierProduct p, LabProductType t) => new(p.Id, p.SupplierId, p.ProductNumber, p.Description, t.KitUse.ToString(), p.IsActive, p.Version, t.Id, t.Name, t.IsActive);
    private async Task<LabProductType> ProductType(Guid id, Guid? currentId, CancellationToken ct)
    {
        var type = await db.LabProductTypes.SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw Invalid("Choose a saved product type.");
        if (!type.IsActive && id != currentId) throw Invalid("Choose an active product type.");
        return type;
    }
    private static void Version(long actual, long expected) { if (actual != expected) throw new OrderManagementException("supplier_catalog_changed", "This record changed. Close the editor and refresh before trying again.", 409); }
    private static OrderManagementException Invalid(string message) => new("supplier_catalog_invalid", message);
    private static OrderManagementException Missing() => new("supplier_catalog_not_found", "The supplier or product was not found.", 404);
}
