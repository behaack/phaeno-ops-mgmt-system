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
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(ct) : null;
        if (request.AssemblyRequestId == Guid.Empty) throw Invalid("Use a valid assembly request identity.");
        var requestedBarcode = request.AssemblyRequestId.HasValue ? $"KIT-{request.AssemblyRequestId.Value:N}".ToUpperInvariant() : null;
        if (requestedBarcode is not null)
        {
            await SampleShippingPackingData.LockAsync(db, $"kit-create:{requestedBarcode}", ct);
            var existing = await db.SampleShippingStockKits.AsNoTracking().SingleOrDefaultAsync(item => item.KitNumber == requestedBarcode, ct);
            if (existing is not null)
            {
                var ownerId = await db.LabKitAssemblyRuns.AsNoTracking().Where(item => item.StockKitId == existing.Id)
                    .Select(item => (Guid?)item.StartedByUserId).SingleOrDefaultAsync(ct);
                if (ownerId != actor.Id || existing.ContainerDefinitionId != request.ContainerDefinitionId
                    || existing.TubeSupplierProductId != request.TubeSupplierProductId || existing.ShipperSupplierProductId != request.ShipperSupplierProductId)
                    throw Conflict("This assembly request already belongs to another kit. Review the saved assembly.");
                if (transaction is not null) await transaction.CommitAsync(ct);
                return Ok(await ReadAsync(existing.Id, ct));
            }
        }
        var scope = await db.SampleShippingContainerDefinitions.AsNoTracking()
            .Where(item => item.Id == request.ContainerDefinitionId)
            .Select(item => new { item.ContainerTypeId, item.SampleTypeAnchorId,
                item.ShippingContainerProductId, item.AssemblyWorkflowId }).SingleOrDefaultAsync(ct)
            ?? throw Invalid("Select an existing Transportation kit specification.");
        await SampleShippingPackingData.LockAsync(db, $"shipping-specification:{scope.ContainerTypeId}", ct);
        if (scope.SampleTypeAnchorId.HasValue)
        {
            var sampleKey = await db.SampleTypeDefinitions.AsNoTracking()
                .Where(item => item.Id == scope.SampleTypeAnchorId.Value)
                .Select(item => (Guid?)item.DefinitionKey).SingleOrDefaultAsync(ct);
            if (sampleKey.HasValue)
            {
                await SampleShippingPackingData.LockAsync(db, $"sample-type:{sampleKey.Value}", ct);
                var selectedProcedureId = await db.SampleTypeDefinitions.AsNoTracking()
                    .Where(item => item.DefinitionKey == sampleKey && item.IsActive
                        && item.EffectiveFrom <= DateTime.UtcNow
                        && (!item.EffectiveTo.HasValue || item.EffectiveTo > DateTime.UtcNow))
                    .OrderByDescending(item => item.Revision)
                    .Select(item => item.ShippingProcedureId).FirstOrDefaultAsync(ct);
                if (selectedProcedureId.HasValue)
                {
                    var procedureKey = await db.SampleShippingProcedures.AsNoTracking()
                        .Where(item => item.Id == selectedProcedureId.Value)
                        .Select(item => (Guid?)item.DefinitionKey).SingleOrDefaultAsync(ct);
                    if (procedureKey.HasValue)
                        await SampleShippingPackingData.LockAsync(db, $"shipping-procedure:{procedureKey.Value}", ct);
                }
            }
        }
        if (scope.AssemblyWorkflowId.HasValue)
            await SampleShippingPackingData.LockAsync(db, $"kit-assembly-workflow-id:{scope.AssemblyWorkflowId.Value}", ct);
        var definition = await catalog.ReadAsync(request.ContainerDefinitionId, ct);
        var now = DateTime.UtcNow;
        if (!definition.IsActive || definition.EffectiveFrom > now || definition.EffectiveTo <= now)
            throw Invalid("Select an active, effective container type before preparing physical stock.");
        if (definition.NewWorkReady != true)
            throw Conflict("The kit product or shipping dependencies are not ready for a new physical kit.");
        if (!definition.SampleTypeAnchorId.HasValue || !definition.ShippingContainerProductId.HasValue)
            throw Invalid("Select a kit specification linked to one Sample type and a purchased Shipping Container.");
        var selectedProductId = definition.ShippingContainerProductId.Value;
        await SampleShippingPackingData.LockAsync(db, $"supplier-product:{selectedProductId}", ct);
        var containerAvailable = await (from product in db.LabSupplierProducts.AsNoTracking()
            join supplier in db.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
            join type in db.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
            where product.Id == selectedProductId && product.IsActive && supplier.IsActive
                && type.IsActive && !supplier.IsInternalProducer
                && product.ProductTypeId == PSeq.Operations.Laboratory.Domain.LabProductType.ShippingContainerId
            select product.Id).AnyAsync(ct);
        if (!containerAvailable) throw Invalid("Choose an active purchased Shipping Container before preparing a kit.");
        var tube = await SelectedProduct(request.TubeSupplierProductId, PSeq.Operations.Laboratory.Domain.LabSupplierProductKind.Tube, ct);
        var shipper = await SelectedProduct(request.ShipperSupplierProductId, PSeq.Operations.Laboratory.Domain.LabSupplierProductKind.ShippingContainer, ct);
        PSeq.Operations.Laboratory.Domain.LabKitAssemblyWorkflowRevision? workflowRevision = null;
        {
            var workflowId = definition.AssemblyWorkflowId
                ?? throw Conflict("Choose an approved assembly workflow on this kit specification.");
            workflowRevision = await db.LabKitAssemblyWorkflowRevisions.AsNoTracking()
                .Where(item => item.WorkflowId == workflowId
                    && item.Status == PSeq.Operations.Laboratory.Domain.LabKitAssemblyRevisionStatus.Approved)
                .OrderByDescending(item => item.Revision).FirstOrDefaultAsync(ct)
                ?? throw Conflict("This kit product has no approved assembly workflow revision.");
            var contents = definition.KitContents ?? [];
            if (definition.AssemblyWorkflowReady != true
                || contents.Count(item => item.Kind == "Tube") != 1
                || contents.Single(item => item.Kind == "Tube").SupplierProductId != request.TubeSupplierProductId
                || contents.Single(item => item.Kind == "Tube").Quantity != definition.TubeCapacity
                || contents.Count(item => item.Kind == "ShippingContainer") != 1
                || contents.Single(item => item.Kind == "ShippingContainer").SupplierProductId != request.ShipperSupplierProductId
                || contents.Single(item => item.Kind == "ShippingContainer").Quantity != 1)
                throw Conflict("The selected tube and outer shipper must match the active Kit specification's approved contents.");
        }
        var componentIds = (definition.KitContents ?? []).Select(item => item.SupplierProductId).ToArray();
        var expirations = await CaptureProductExpirationsAsync(componentIds, request, ct);
        SampleShippingStockKit kit;
        try
        {
            kit = new SampleShippingStockKit(requestedBarcode ?? $"KIT-{Guid.NewGuid():N}".ToUpperInvariant(), definition.Id,
                SampleShippingContainerCatalogService.Snapshot(definition), definition.TubeCapacity,
                tube.SupplierName, tube.ProductNumber, request.TubeLotNumber,
                shipper.SupplierName, shipper.ProductNumber,
                request.TubeSupplierProductId, request.ShipperSupplierProductId, tube.Description, shipper.Description,
                JsonSerializer.Serialize(expirations, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
                SupplierTubeBarcode.NamespaceForSupplier(tube.SupplierId), workflowRevision.Id);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        db.SampleShippingStockKits.Add(kit);
        if (workflowRevision is not null) db.LabKitAssemblyRuns.Add(new(kit.Id, workflowRevision, actor.Id, now));
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
        await SampleShippingStockTubeRegistration.AddAsync(db, kit, request.SupplierBarcodes, ct);
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadAsync(id, ct);
    }

    [HttpPost("{id:guid}/verify-tubes")]
    public async Task<StockKitDto> VerifyTubes(Guid id, [FromBody] VerifyStockKitTubesRequest request, CancellationToken ct)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"stock-kit:{id}", ct);
        var kit = await db.SampleShippingStockKits.Include(item => item.Tubes).SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        Version(kit.Version, request.Version);
        var codes = new List<string>();
        foreach (var value in request.SupplierBarcodes ?? [])
        {
            if (!SupplierTubeBarcode.TryNormalize(value, out var code)) throw Invalid("Scan a complete permanent barcode on every tube in the kit.");
            codes.Add(code);
        }
        if (codes.Count != codes.Distinct(StringComparer.Ordinal).Count()) throw Conflict("A tube was scanned twice. Verify every physical tube once.");
        try { kit.VerifyTubeRoster(actor.Id, codes, DateTime.UtcNow); }
        catch (InvalidOperationException exception) { throw Conflict(exception.Message); }
        db.Entry(kit).Property(item => item.Version).IsModified = true;
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadAsync(id, ct);
    }

    [HttpPost("{id:guid}/correct-tube")]
    public async Task<StockKitDto> CorrectTube(Guid id, [FromBody] CorrectStockKitTubeRequest request, CancellationToken ct)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"stock-kit:{id}", ct);
        var kit = await db.SampleShippingStockKits.Include(item => item.Tubes).SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        Version(kit.Version, request.Version);
        if (kit.FulfilledAt.HasValue) throw Conflict("Dispatched kit contents are frozen. Use the discrepancy recovery process.");
        if (!SupplierTubeBarcode.TryNormalize(request.PreviousBarcode, out var previous)
            || !SupplierTubeBarcode.TryNormalize(request.ReplacementBarcode, out var replacement)
            || previous == replacement) throw Invalid("Scan the registered tube and its distinct replacement.");
        var current = kit.Tubes.SingleOrDefault(item => item.SupplierBarcode == previous)
            ?? throw Conflict("The tube to correct is no longer registered to this kit.");
        if (string.IsNullOrWhiteSpace(request.Reason)) throw Invalid("Explain why the physical tube was replaced.");
        await SampleShippingPackingData.LockAsync(db, $"supplier-tube:{replacement}", ct);
        if (kit.Tubes.Any(item => item.SupplierBarcode == replacement)
            || await db.SampleShippingStockTubes.AnyAsync(item => item.SupplierBarcode == replacement
                && (item.BarcodeNamespace == kit.TubeBarcodeNamespace), ct)
            || await db.RegisteredSampleTubes.AnyAsync(item => item.SupplierBarcode == replacement
                && (item.BarcodeNamespace == kit.TubeBarcodeNamespace), ct)
            || await db.LabContainers.AnyAsync(item => item.Barcode.ToUpper() == replacement
                && (item.BarcodeNamespace == kit.TubeBarcodeNamespace), ct)
            || await db.LabPreparationBatches.AnyAsync(item => (item.TrayBarcode != null && item.TrayBarcode.ToUpper() == replacement)
                || item.Name.ToUpper() == replacement, ct))
            throw Conflict("The replacement tube ID is already registered.");
        kit.InvalidateTubeVerification();
        kit.Tubes.Remove(current);
        db.SampleShippingStockTubes.Remove(current);
        var newTube = new SampleShippingStockTube(kit.Id, replacement, kit.TubeBarcodeNamespace, kit.TubeSupplierProductId);
        kit.Tubes.Add(newTube);
        db.SampleShippingStockTubes.Add(newTube);
        try { db.SampleShippingStockTubeCorrections.Add(new SampleShippingStockTubeCorrection(
            kit.Id, previous, replacement, kit.TubeBarcodeNamespace, request.Reason, actor.Id, DateTime.UtcNow)); }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
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

    [HttpPost("{id:guid}/withdraw")]
    public async Task<StockKitDto> Withdraw(Guid id, [FromBody] WithdrawStockKitRequest request, CancellationToken ct)
    {
        var actor = await context.RequirePlatformAdminAsync(HttpContext, ct);
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"stock-kit:{id}", ct);
        var kit = await db.SampleShippingStockKits.SingleOrDefaultAsync(item => item.Id == id, ct) ?? throw Missing();
        Version(kit.Version, request.Version);
        try { kit.Withdraw(actor.Id, DateTime.UtcNow, request.Reason); }
        catch (ArgumentException error) { throw Invalid(error.Message); }
        catch (InvalidOperationException error) { throw Conflict(error.Message); }
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
        var kitIds = kits.Select(item => item.Id).ToArray();
        var corrections = await db.SampleShippingStockTubeCorrections.AsNoTracking()
            .Where(item => kitIds.Contains(item.SampleShippingStockKitId)).OrderBy(item => item.CorrectedAt).ToListAsync(ct);
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
            kit.ProductExpirySnapshotJson is null ? null : JsonSerializer.Deserialize<StockKitProductExpiryDto[]>(kit.ProductExpirySnapshotJson, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            kit.TubesVerifiedAt, kit.TubesVerifiedByUserId, corrections.Where(item => item.SampleShippingStockKitId == kit.Id)
                .Select(item => new StockKitTubeCorrectionDto(item.PreviousBarcode, item.ReplacementBarcode,
                    item.Reason, item.CorrectedByUserId, item.CorrectedAt)).ToArray(),
            kit.AssemblyWorkflowRevisionId, kit.AssemblyCompletedAt, kit.WithdrawnAt, kit.WithdrawalReason)).ToArray();
    }

    private async Task<IReadOnlyList<StockKitProductExpiryDto>> CaptureProductExpirationsAsync(
        IReadOnlyCollection<Guid> componentIds, CreateStockKitRequest request, CancellationToken ct)
    {
        var productIds = componentIds
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

    private sealed record SelectedCatalogProduct(Guid SupplierId, string SupplierName, string ProductNumber,
        string Description, string ProductTypeName);
    private async Task<SelectedCatalogProduct> SelectedProduct(Guid id, PSeq.Operations.Laboratory.Domain.LabSupplierProductKind kind, CancellationToken ct)
        => await (from product in db.LabSupplierProducts.AsNoTracking()
                  join supplier in db.LabSuppliers.AsNoTracking() on product.SupplierId equals supplier.Id
                  join type in db.LabProductTypes.AsNoTracking() on product.ProductTypeId equals type.Id
                  where product.Id == id && type.KitUse == kind && type.IsActive && product.IsActive && supplier.IsActive
                  select new SelectedCatalogProduct(supplier.Id, supplier.Name, product.ProductNumber,
                      product.Description, type.Name))
            .SingleOrDefaultAsync(ct) ?? throw Invalid($"Choose an active { (kind == PSeq.Operations.Laboratory.Domain.LabSupplierProductKind.Tube ? "tube" : "shipping container") } product from an active supplier.");

    private static void Version(long actual, long expected) { if (actual != expected) throw Conflict("This kit changed. Refresh before continuing."); }
    private static OrderManagementException Invalid(string message) => new("stock_kit_invalid", message);
    private static OrderManagementException Conflict(string message) => new("stock_kit_conflict", message, 409);
    private static OrderManagementException Missing() => new("stock_kit_not_found", "The stock kit or job was not found.", 404);
}
