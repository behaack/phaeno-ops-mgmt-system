namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var definition = await catalog.ReadAsync(request.ContainerDefinitionId, ct);
        var now = DateTime.UtcNow;
        if (!definition.IsActive || definition.EffectiveFrom > now || definition.EffectiveTo <= now)
            throw Invalid("Select an active, effective container type before preparing physical stock.");
        SampleShippingStockKit kit;
        try
        {
            kit = new SampleShippingStockKit($"KIT-{Guid.NewGuid():N}".ToUpperInvariant(), definition.Id,
                SampleShippingContainerCatalogService.Snapshot(definition), definition.TubeCapacity,
                request.TubeSupplierName, request.TubeProductNumber, request.TubeLotNumber,
                request.ShipperSupplierName, request.ShipperProductNumber);
        }
        catch (ArgumentException exception) { throw Invalid(exception.Message); }
        db.SampleShippingStockKits.Add(kit);
        await db.SaveChangesAsync(ct);
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
            || await db.RegisteredSampleTubes.AnyAsync(item => codes.Contains(item.SupplierBarcode), ct))
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
        var ids = kits.Where(item => item.AuthorizationSourceId.HasValue).Select(item => item.AuthorizationSourceId!.Value).Distinct().ToArray();
        var references = await db.SampleShipments.AsNoTracking().Where(item => ids.Contains(item.AuthorizationSourceId))
            .Select(item => new { item.AuthorizationSourceId, item.AuthorizationReference }).Distinct().ToListAsync(ct);
        return kits.Select(kit => new StockKitDto(kit.Id, kit.KitNumber, SampleShippingPackingData.Container(kit.ContainerSnapshotJson)!,
            kit.TubeSupplierName, kit.TubeProductNumber, kit.TubeLotNumber, kit.ShipperSupplierName, kit.ShipperProductNumber,
            kit.BoundSampleShipmentId.HasValue ? "Bound" : kit.FulfilledAt.HasValue ? "Fulfilled" : "Preparing",
            kit.OrganizationId, kit.AuthorizationSourceId, references.FirstOrDefault(item => item.AuthorizationSourceId == kit.AuthorizationSourceId)?.AuthorizationReference,
            kit.BoundSampleShipmentId, kit.OutboundCarrier, kit.OutboundTrackingNumber, kit.FulfilledAt, kit.Version,
            kit.Tubes.OrderBy(item => item.SupplierBarcode).Select(item => new StockKitTubeDto(item.Id, item.SupplierBarcode)).ToArray())).ToArray();
    }

    private static void Version(long actual, long expected) { if (actual != expected) throw Conflict("This kit changed. Refresh before continuing."); }
    private static OrderManagementException Invalid(string message) => new("stock_kit_invalid", message);
    private static OrderManagementException Conflict(string message) => new("stock_kit_conflict", message, 409);
    private static OrderManagementException Missing() => new("stock_kit_not_found", "The stock kit or job was not found.", 404);
}
