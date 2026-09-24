namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed record SupplierCatalogProductDto(Guid Id, Guid SupplierId, string ProductNumber, string Description, string Kind, bool IsActive, long Version, Guid ProductTypeId, string ProductTypeName, bool ProductTypeIsActive, bool CanExpire = false, string? DefaultQuantityUnit = null, Guid? MaterialDefinitionId = null);
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
        if (!supplier.IsActive) throw Invalid("Reactivate the supplier before adding products.");
        if (string.IsNullOrWhiteSpace(request.ProductNumber) || string.IsNullOrWhiteSpace(request.Description))
            throw Invalid("Enter a product name or SKU and its description or finished kit name.");
        if (string.IsNullOrWhiteSpace(request.DefaultQuantityUnit))
            throw Invalid("Set the product's inventory unit before saving it.");
        if (supplier.IsInternalProducer && request.ProductTypeId != LabProductType.ReagentId
            && request.ProductTypeId != LabProductType.TransportationKitId)
            throw Invalid("Phaeno products must be Reagents or Transportation kits.");
        if (supplier.IsInternalProducer && request.ProductTypeId == LabProductType.TransportationKitId
            && request.DefaultQuantityUnit is not null
            && !string.Equals(request.DefaultQuantityUnit.Trim(), "each", StringComparison.OrdinalIgnoreCase))
            throw Invalid("Phaeno transportation kits use the inventory unit each.");
        if (supplier.IsInternalProducer && request.ProductTypeId == LabProductType.TransportationKitId
            && request.Description.Trim().Length > 255)
            throw Invalid("A transportation kit product name cannot exceed 255 characters.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"product-type:{request.ProductTypeId}", ct);
        var type = await ProductType(request.ProductTypeId, null, ct);
        LabSupplierProduct product;
        try { product = new(supplierId, request.ProductNumber, request.Description, type.Id, request.CanExpire ?? false); product.Update(request.ProductNumber, request.Description, type.Id, request.IsActive, request.CanExpire); product.SetDefaultQuantityUnit(request.DefaultQuantityUnit); }
        catch (ArgumentException e) { throw Invalid(e.Message); }
        if (supplier.IsInternalProducer && request.ProductTypeId == LabProductType.ReagentId)
        {
            await SampleShippingPackingData.LockAsync(db, $"reagent-material-name:{product.NormalizedProductNumber}", ct);
            if (await db.LabMaterialDefinitions.AnyAsync(d => d.Kind == LabMaterialLotKind.PreparedReagent
                && d.Name.ToUpper() == product.NormalizedProductNumber, ct))
                throw new OrderManagementException("reagent_name_exists", "A reagent with this name already exists. Edit its Phaeno product instead.", 409);
            var definition = new LabMaterialDefinition($"product-{product.Id:N}", product.ProductNumber, LabMaterialLotKind.PreparedReagent);
            definition.SetPreparedReagentUnit(product.DefaultQuantityUnit!);
            definition.SetActive(product.IsActive);
            product.LinkPreparedReagent(definition.Id);
            db.LabMaterialDefinitions.Add(definition);
        }
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
        var supplier = await db.LabSuppliers.AsNoTracking().SingleOrDefaultAsync(s => s.Id == supplierId, ct) ?? throw Missing();
        Version(product.Version, request.Version);
        if (string.IsNullOrWhiteSpace(request.ProductNumber) || string.IsNullOrWhiteSpace(request.Description))
            throw Invalid("Enter a product name or SKU and its description or finished kit name.");
        if (supplier.IsInternalProducer && request.ProductTypeId != product.ProductTypeId)
            throw Invalid("A Phaeno product cannot change between Reagent and Transportation kit. Create a separate product.");
        if (supplier.IsInternalProducer && request.ProductTypeId == LabProductType.TransportationKitId
            && request.DefaultQuantityUnit is not null
            && !string.Equals(request.DefaultQuantityUnit.Trim(), "each", StringComparison.OrdinalIgnoreCase))
            throw Invalid("Phaeno transportation kits use the inventory unit each.");
        if (supplier.IsInternalProducer && request.ProductTypeId == LabProductType.TransportationKitId
            && request.Description.Trim().Length > 255)
            throw Invalid("A transportation kit product name cannot exceed 255 characters.");
        if (supplier.IsInternalProducer && string.IsNullOrWhiteSpace(request.ProductNumber))
            throw Invalid("Enter the product name or SKU.");
        if (supplier.IsInternalProducer && product.ProductTypeId == LabProductType.TransportationKitId
            && (!string.Equals(product.ProductNumber, request.ProductNumber.Trim(), StringComparison.Ordinal)
                || !string.Equals(product.Description, request.Description.Trim(), StringComparison.Ordinal))
            && await db.SampleShippingContainerTypes.AsNoTracking()
                .AnyAsync(item => item.FinishedKitProductId == product.Id, ct))
            throw new OrderManagementException("kit_identity_frozen",
                "A kit with a shipping specification keeps its SKU and name. Create a new product for a different identity.", 409);
        var type = await ProductType(request.ProductTypeId, product.ProductTypeId, ct);
        if (supplier.IsInternalProducer && product.ProductTypeId == LabProductType.ReagentId)
        {
            var definition = await db.LabMaterialDefinitions.SingleOrDefaultAsync(d => d.Id == product.MaterialDefinitionId, ct)
                ?? throw new OrderManagementException("reagent_identity_missing", "This Phaeno product has no reagent identity. Contact support before editing it.", 409);
            if (definition.DefaultQuantityUnit is not null && request.DefaultQuantityUnit is not null
                && !string.Equals(definition.DefaultQuantityUnit,
                request.DefaultQuantityUnit.Trim(), StringComparison.OrdinalIgnoreCase))
                throw new OrderManagementException("reagent_unit_conflict", "The reagent inventory unit cannot be changed. Create a distinct reagent product for a different unit.", 409);
            if (definition.DefaultQuantityUnit is null && !string.IsNullOrWhiteSpace(request.DefaultQuantityUnit))
            {
                if (await db.LabMaterialLots.AsNoTracking().AnyAsync(lot =>
                    lot.MaterialDefinitionId == definition.Id
                    && lot.QuantityUnit.ToUpper() != request.DefaultQuantityUnit.Trim().ToUpper(), ct))
                    throw new OrderManagementException("reagent_unit_conflict",
                        "Existing lots use another unit. Verify them before setting this reagent's inventory unit.", 409);
                definition.SetPreparedReagentUnit(request.DefaultQuantityUnit);
            }
            if (!string.Equals(product.ProductNumber, request.ProductNumber.Trim(), StringComparison.Ordinal))
            {
                var normalizedName = request.ProductNumber.Trim().ToUpperInvariant();
                await SampleShippingPackingData.LockAsync(db, $"reagent-material-name:{normalizedName}", ct);
                if (await db.LabMaterialDefinitions.AsNoTracking().AnyAsync(d => d.Id != definition.Id
                    && d.Kind == LabMaterialLotKind.PreparedReagent && d.Name.ToUpper() == normalizedName, ct))
                    throw new OrderManagementException("reagent_name_exists", "A reagent with this name already exists.", 409);
                definition.RenamePreparedReagent(request.ProductNumber);
            }
            definition.SetActive(request.IsActive);
        }
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
    private static SupplierCatalogProductDto Product(LabSupplierProduct p, LabProductType t) => new(p.Id, p.SupplierId, p.ProductNumber, p.Description, t.KitUse.ToString(), p.IsActive, p.Version, t.Id, t.Name, t.IsActive, p.CanExpire, p.DefaultQuantityUnit, p.MaterialDefinitionId);
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
