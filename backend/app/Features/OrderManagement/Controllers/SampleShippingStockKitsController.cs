namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

[ApiController]
[Authorize]
[ServiceFilter(typeof(PhaenoPortal.App.Features.Trials.Services.TrialWorkGuard))]
[Route("api/platform/sample-shipping/stock-kits")]
public sealed class SampleShippingStockKitsController(PSeqOperationsDbContext db, OrderRequestContext context,
    SampleShippingContainerCatalogService catalog, TransportationKitRequestService requestService) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<StockKitDto>> List(CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        var kits = await db.SampleShippingStockKits.AsNoTracking().Include(item => item.Tubes)
            .OrderByDescending(item => item.CreatedAt).ToListAsync(ct);
        return await MapAsync(kits, ct);
    }

    [HttpGet("{id:guid}")]
    public async Task<StockKitDto> Read(Guid id, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        return await ReadAsync(id, ct);
    }

    [HttpPost]
    public async Task<ActionResult<StockKitDto>> Create([FromBody] CreateStockKitRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(ct) : null;
        var definition = await catalog.ReadAsync(request.ContainerDefinitionId, ct);
        var now = DateTime.UtcNow;
        if (!definition.IsActive || definition.EffectiveFrom > now || definition.EffectiveTo <= now)
            throw Invalid("Select an active, effective container type before preparing physical stock.");
        var tube = await SelectedProduct(request.TubeSupplierProductId, PSeq.Operations.Laboratory.Domain.LabSupplierProductKind.Tube, ct);
        var shipper = await SelectedProduct(request.ShipperSupplierProductId, PSeq.Operations.Laboratory.Domain.LabSupplierProductKind.ShippingContainer, ct);
        var expirations = await CaptureProductExpirationsAsync(definition, request, ct);
        SampleShippingStockKit kit;
        try
        {
            kit = new SampleShippingStockKit($"KIT-{Guid.NewGuid():N}".ToUpperInvariant(), definition.Id,
                SampleShippingContainerCatalogService.Snapshot(definition), definition.TubeCapacity,
                tube.SupplierName, tube.ProductNumber, request.TubeLotNumber,
                shipper.SupplierName, shipper.ProductNumber,
                request.TubeSupplierProductId, request.ShipperSupplierProductId, tube.Description, shipper.Description,
                JsonSerializer.Serialize(expirations, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        db.SampleShippingStockKits.Add(kit);
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Created($"/api/platform/sample-shipping/stock-kits/{kit.Id}", await ReadAsync(kit.Id, ct));
    }

    [HttpPost("{id:guid}/tubes")]
    public async Task<StockKitDto> Register(Guid id, [FromBody] RegisterSampleTubesRequest request, CancellationToken ct)
    {
        await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"stock-kit:{id}", ct);
        var kit = await db.SampleShippingStockKits.Include(item => item.Tubes).SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        Version(kit.Version, request.Version);
        if (kit.FulfilledAt.HasValue) throw Conflict("Dispatched kit contents cannot be changed.");
        var codes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var value in request.SupplierBarcodes ?? [])
        {
            if (!SupplierTubeBarcode.TryNormalize(value, out var code)) throw Invalid("Scan a complete barcode for each tube.");
            if (!codes.Add(code)) throw Conflict("A tube barcode was scanned more than once.");
        }
        if (codes.Count == 0) throw Invalid("Scan at least one tube.");
        if (kit.Tubes.Count + codes.Count > kit.TubeCapacity) throw Conflict($"This standard kit holds {kit.TubeCapacity} tubes.");
        foreach (var code in codes.Order(StringComparer.Ordinal)) await SampleShippingPackingData.LockAsync(db, $"supplier-tube:{code}", ct);
        if (await db.SampleShippingStockTubes.AnyAsync(item => codes.Contains(item.SupplierBarcode), ct)
            || await db.RegisteredSampleTubes.AnyAsync(item => codes.Contains(item.SupplierBarcode), ct)
            || await db.LabContainers.AnyAsync(item => codes.Contains(item.Barcode.ToUpper()), ct)
            || await db.LabPreparationBatches.AnyAsync(item => (item.TrayBarcode != null && codes.Contains(item.TrayBarcode.ToUpper())) || codes.Contains(item.Name.ToUpper()), ct))
            throw Conflict("A scanned tube barcode is already registered. No tubes were added.");
        foreach (var code in codes)
        {
            var tube = new SampleShippingStockTube(kit.Id, code);
            kit.Tubes.Add(tube);
            db.SampleShippingStockTubes.Add(tube);
        }
        db.Entry(kit).Property(item => item.Version).IsModified = true;
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadAsync(id, ct);
    }

    [HttpPost("{id:guid}/dispatch")]
    public async Task<StockKitDto> Dispatch(Guid id, [FromBody] DispatchStockKitRequest request, CancellationToken ct)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        if (request.DeliveryLocationId.HasValue || request.RequestId.HasValue)
        {
            await using var locationTransaction = await SampleShippingPackingData.BeginAsync(db, $"location-dispatch:{request.DeliveryLocationId}", ct);
            await requestService.DispatchLocationAsync(id, actor.Id, request, ct);
            if (locationTransaction is not null) await locationTransaction.CommitAsync(ct);
            return await ReadAsync(id, ct);
        }
        if (!request.ShipmentId.HasValue) throw Invalid("Choose a Customer delivery location or an authorized legacy Job.");
        var shipment = await db.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .SingleOrDefaultAsync(item => item.Id == request.ShipmentId, ct) ?? throw Missing();
        if (await TransportationKitSupplyGuard.RequiresOrderedKitsAsync(db, shipment, ct))
        {
            await using var requestTransaction = await SampleShippingPackingData.BeginAsync(db, $"sample-shipping:{shipment.AuthorizationSourceId}", ct);
            await requestService.DispatchFromStockAsync(id, actor.Id, shipment, request, ct);
            if (requestTransaction is not null) await requestTransaction.CommitAsync(ct);
            return await ReadAsync(id, ct);
        }
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"stock-kit:{id}", ct);
        var kit = await db.SampleShippingStockKits.Include(item => item.Tubes).SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        Version(kit.Version, request.Version);
        var pairs = await SampleShippingPackingData.ContextsAsync(db, shipment, ct);
        var options = await catalog.ReadCompatibleAsync(pairs, ct);
        if (!options.Any(item => item.Id == kit.ContainerDefinitionId))
            throw Conflict("This kit is not an effective container for the selected job's sample and handling requirements.");
        try
        {
            if (request.FulfilledAt.Kind == DateTimeKind.Unspecified) throw new ArgumentException("Dispatch time must include a time zone.");
            kit.Dispatch(shipment, request.OutboundCarrier, request.OutboundTrackingNumber, request.FulfilledAt.ToUniversalTime());
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict(exception.Message); }
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadAsync(id, ct);
    }

    private async Task<StockKitDto> ReadAsync(Guid id, CancellationToken ct)
    {
        var kit = await db.SampleShippingStockKits.AsNoTracking().Include(item => item.Tubes).SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        return (await MapAsync([kit], ct))[0];
    }

    private async Task<IReadOnlyList<StockKitDto>> MapAsync(IReadOnlyList<SampleShippingStockKit> kits, CancellationToken ct)
    {
        var inventory = (await TransportationKitInventory.MapAsync(db, kits, ct)).ToDictionary(item => item.StockKitId);
        var organizationIds = kits.Where(item => item.OrganizationId.HasValue).Select(item => item.OrganizationId!.Value).Distinct().ToArray();
        var departmentIds = kits.Where(item => item.DepartmentId.HasValue).Select(item => item.DepartmentId!.Value).Distinct().ToArray();
        var locationIds = kits.Where(item => item.CustomerDeliveryLocationId.HasValue).Select(item => item.CustomerDeliveryLocationId!.Value).Distinct().ToArray();
        var organizations = await db.Organizations.Where(item => organizationIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.Name, ct);
        var departments = await db.OrganizationDepartments.Where(item => departmentIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.Name, ct);
        var locations = await db.CustomerDeliveryLocations.Where(item => locationIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.Label, ct);
        var ids = kits.Where(item => item.AuthorizationSourceId.HasValue).Select(item => item.AuthorizationSourceId!.Value).Distinct().ToArray();
        var references = await db.SampleShipments.AsNoTracking().Where(item => ids.Contains(item.AuthorizationSourceId))
            .Select(item => new { item.AuthorizationSourceId, item.AuthorizationReference }).Distinct().ToListAsync(ct);
        return kits.Select(kit => new StockKitDto(kit.Id, kit.KitNumber, SampleShippingPackingData.Container(kit.ContainerSnapshotJson)!,
            kit.TubeSupplierName, kit.TubeProductNumber, kit.TubeLotNumber, kit.ShipperSupplierName, kit.ShipperProductNumber,
            inventory[kit.Id].Status,
            kit.OrganizationId, kit.AuthorizationSourceId, references.FirstOrDefault(item => item.AuthorizationSourceId == kit.AuthorizationSourceId)?.AuthorizationReference,
            kit.BoundSampleShipmentId, kit.OutboundCarrier, kit.OutboundTrackingNumber, kit.FulfilledAt, kit.Version,
            kit.Tubes.OrderBy(item => item.SupplierBarcode).Select(item => new StockKitTubeDto(item.Id, item.SupplierBarcode)).ToArray(),
            kit.DepartmentId, kit.CustomerDeliveryLocationId, kit.CustomerDeliveryLocationId.HasValue ? locations.GetValueOrDefault(kit.CustomerDeliveryLocationId.Value) : null,
            inventory[kit.Id].RequestId, kit.AuthorizationSourceId, inventory[kit.Id].OriginatingJobNumber,
            kit.CustomerReceivedAt, kit.ReservedSampleShipmentId, inventory[kit.Id].AssignedJobId, inventory[kit.Id].AssignedJobNumber,
            kit.OrganizationId.HasValue ? organizations.GetValueOrDefault(kit.OrganizationId.Value) : null,
            kit.DepartmentId.HasValue ? departments.GetValueOrDefault(kit.DepartmentId.Value) : null,
            inventory[kit.Id].Status == "NeedsReview" ? "Record the verified Customer delivery location before this container can become available." : null, kit.TubeProductDescription, kit.ShipperProductDescription,
            kit.ProductExpirySnapshotJson is null ? null : JsonSerializer.Deserialize<StockKitProductExpiryDto[]>(kit.ProductExpirySnapshotJson, new JsonSerializerOptions(JsonSerializerDefaults.Web)))).ToArray();
    }

    private async Task<IReadOnlyList<StockKitProductExpiryDto>> CaptureProductExpirationsAsync(
        SampleShippingContainerDefinitionDto definition, CreateStockKitRequest request, CancellationToken ct)
    {
        var productIds = (definition.KitContents ?? []).Select(item => item.SupplierProductId)
            .Concat([request.TubeSupplierProductId, request.ShipperSupplierProductId]).Distinct().ToArray();
        var requested = request.ProductExpirations ?? [];
        if (requested.Select(item => item.SupplierProductId).Distinct().Count() != requested.Count
            || requested.Any(item => !productIds.Contains(item.SupplierProductId)))
            throw Invalid("Provide at most one expiration date for each product used in this kit.");
        var products = await db.LabSupplierProducts.Where(p => productIds.Contains(p.Id)).ToListAsync(ct);
        var supplierIds = products.Select(p => p.SupplierId).Distinct().ToArray();
        var suppliers = await db.LabSuppliers.Where(s => supplierIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, ct);
        var typeIds = products.Select(p => p.ProductTypeId).Distinct().ToArray();
        var types = await db.LabProductTypes.Where(t => typeIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, ct);
        if (products.Count != productIds.Length || products.Any(p => !p.IsActive || !suppliers[p.SupplierId].IsActive || !types[p.ProductTypeId].IsActive))
            throw Invalid("Every kit product must still have an active supplier and product type.");
        var result = new List<StockKitProductExpiryDto>();
        foreach (var product in products)
        {
            var date = requested.SingleOrDefault(item => item.SupplierProductId == product.Id)?.ExpirationDate;
            if (product.CanExpire && date is null)
                throw Invalid($"Enter the expiration date for {product.ProductNumber}; this product can expire.");
            if (date == DateOnly.MinValue) throw Invalid($"Enter a valid expiration date for {product.ProductNumber}.");
            result.Add(new(product.Id, suppliers[product.SupplierId].Name, product.ProductNumber, product.CanExpire, date));
            // A catalog change during inventory entry must invalidate the saved requirement snapshot.
            db.Entry(product).Property(p => p.UpdatedAt).IsModified = true;
        }
        return result;
    }

    private sealed record SelectedCatalogProduct(string SupplierName, string ProductNumber, string Description);
    private async Task<SelectedCatalogProduct> SelectedProduct(Guid id, PSeq.Operations.Laboratory.Domain.LabSupplierProductKind kind, CancellationToken ct)
        => await (from product in db.LabSupplierProducts.AsNoTracking()
                  join supplier in db.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
                  join type in db.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
                  where product.Id == id && type.KitUse == kind && type.IsActive && product.IsActive && supplier.IsActive
                  select new SelectedCatalogProduct(supplier.Name, product.ProductNumber, product.Description))
            .SingleOrDefaultAsync(ct) ?? throw Invalid($"Choose an active { (kind == PSeq.Operations.Laboratory.Domain.LabSupplierProductKind.Tube ? "tube" : "shipping container") } product from an active supplier.");

    private static void Version(long actual, long expected) { if (actual != expected) throw Conflict("This kit changed. Refresh before continuing."); }
    private static OrderManagementException Invalid(string message) => new("stock_kit_invalid", message);
    private static OrderManagementException Conflict(string message) => new("stock_kit_conflict", message, 409);
    private static OrderManagementException Missing() => new("stock_kit_not_found", "The stock kit or job was not found.", 404);
}
