namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record SupplierCatalogProductDto(Guid Id, Guid SupplierId, string ProductNumber, string Description, string Kind, bool IsActive, long Version, Guid ProductTypeId, string ProductTypeName, bool ProductTypeIsActive, bool CanExpire = false, string? DefaultQuantityUnit = null);
public sealed record SupplierCatalogEntryDto(Guid Id, string Name, bool IsActive, long Version, IReadOnlyList<SupplierCatalogProductDto> Products, bool IsInternalProducer = false);
public sealed record SaveSupplierRequest(string Name, bool IsActive = true, long Version = 0);
public sealed record SaveSupplierProductRequest(string ProductNumber, string Description, Guid ProductTypeId, bool IsActive = true, long Version = 0, bool? CanExpire = null, string? DefaultQuantityUnit = null);

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
            products.Where(p => p.SupplierId == s.Id).Select(p => Product(p, types[p.ProductTypeId])).ToArray(), s.IsInternalProducer)).ToArray();
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
        if (supplier.IsInternalProducer)
            throw new OrderManagementException("internal_producer_protected",
                "The seeded Phaeno producer cannot be renamed or deactivated.", 409);
        try { supplier.Rename(request.Name); supplier.SetActive(request.IsActive); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        await Save(ct);
        var products = await db.LabSupplierProducts.AsNoTracking().Where(p => p.SupplierId == id).OrderBy(p => p.ProductNumber).ToListAsync(ct);
        var types = await db.LabProductTypes.AsNoTracking().ToDictionaryAsync(t => t.Id, ct);
        return new(supplier.Id, supplier.Name, supplier.IsActive, supplier.Version, products.Select(p => Product(p, types[p.ProductTypeId])).ToArray(), supplier.IsInternalProducer);
    }

    [HttpPost("{supplierId:guid}/products")]
    public async Task<SupplierCatalogProductDto> CreateProduct(Guid supplierId, [FromBody] SaveSupplierProductRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var supplier = await db.LabSuppliers.SingleOrDefaultAsync(s => s.Id == supplierId, ct) ?? throw Missing();
        if (supplier.IsInternalProducer)
            throw new OrderManagementException("internal_producer_product_not_allowed",
                "Start a reagent manufacturing run to create Phaeno-made material.", 409);
        if (!supplier.IsActive) throw Invalid("Reactivate the supplier before adding products.");
        if (string.IsNullOrWhiteSpace(request.DefaultQuantityUnit))
            throw Invalid("Set the product's inventory unit before saving it.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"product-type:{request.ProductTypeId}", ct);
        var type = await ProductType(request.ProductTypeId, null, ct);
        LabSupplierProduct product;
        try { product = new(supplierId, request.ProductNumber, request.Description, type.Id, request.CanExpire ?? false); product.Update(request.ProductNumber, request.Description, type.Id, request.IsActive, request.CanExpire); product.SetDefaultQuantityUnit(request.DefaultQuantityUnit); }
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
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"product-type:{request.ProductTypeId}", ct);
        await SampleShippingPackingData.LockAsync(db, $"supplier-product:{productId}", ct);
        var product = await db.LabSupplierProducts.SingleOrDefaultAsync(p => p.Id == productId && p.SupplierId == supplierId, ct) ?? throw Missing();
        Version(product.Version, request.Version);
        var type = await ProductType(request.ProductTypeId, product.ProductTypeId, ct);
        if (request.DefaultQuantityUnit is not null && string.IsNullOrWhiteSpace(request.DefaultQuantityUnit)
            && await db.LabMaterialLots.AsNoTracking().AnyAsync(lot => lot.SupplierProductId == product.Id, ct))
            throw new OrderManagementException("product_unit_conflicts_with_lots",
                "The product has inventory lots; its unit cannot be cleared.", 409);
        if (product.DefaultQuantityUnit is not null
            && !string.IsNullOrWhiteSpace(request.DefaultQuantityUnit)
            && !string.Equals(product.DefaultQuantityUnit, request.DefaultQuantityUnit.Trim(), StringComparison.OrdinalIgnoreCase)
            && await db.LabMaterialLots.AsNoTracking().AnyAsync(lot =>
                lot.SupplierProductId == product.Id
                && lot.QuantityUnit.ToUpper() != request.DefaultQuantityUnit.Trim().ToUpper(), ct))
            throw new OrderManagementException("product_unit_conflicts_with_lots",
                "Existing lots use another inventory unit. Verify them before changing this product.", 409);
        try { product.Update(request.ProductNumber, request.Description, type.Id, request.IsActive, request.CanExpire); if (request.DefaultQuantityUnit is not null) product.SetDefaultQuantityUnit(request.DefaultQuantityUnit); }
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
    private static SupplierCatalogProductDto Product(LabSupplierProduct p, LabProductType t) => new(p.Id, p.SupplierId, p.ProductNumber, p.Description, t.KitUse.ToString(), p.IsActive, p.Version, t.Id, t.Name, t.IsActive, p.CanExpire, p.DefaultQuantityUnit);
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
