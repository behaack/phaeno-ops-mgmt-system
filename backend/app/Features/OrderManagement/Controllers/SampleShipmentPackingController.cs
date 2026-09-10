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
[Route("api/sample-shipping/{shipmentId:guid}/packing")]
public sealed partial class SampleShipmentPackingController(PSeqOperationsDbContext db, OrderRequestContext context,
    SampleShippingContainerCatalogService catalog, SampleShippingWorkflowReader reader) : ControllerBase
{
    [HttpGet]
    public async Task<ShipmentPackingContextDto> Read(Guid shipmentId, CancellationToken ct, [FromQuery] Guid? deliveryLocationId = null)
    {
        var tenant = await context.RequireSampleShippingTenantAsync(HttpContext, false, ct);
        var shipment = await LoadAsync(shipmentId, tenant.Organization.Id, tenant.Department.Id, ct);
        var locationId = await TransportationKitInventory.LocationAsync(db, shipment, deliveryLocationId, ct);
        var reason = tenant.IsDepartmentAdmin ? await PackingBlockAsync(shipment, ct)
                ?? await TransportationKitSupplyGuard.PreparationBlockAsync(db, shipment, ct, locationId)
            : "An organization or department administrator can prepare containers for this job.";
        var options = shipment.Items.Count == 0 ? [] : await OptionsAsync(shipment, ct, locationId);
        var ids = options.Select(item => item.Id).ToArray();
        var kits = await TransportationKitInventory.Available(db, shipment, locationId).Where(item => ids.Contains(item.ContainerDefinitionId)).OrderBy(item => item.KitNumber).ToArrayAsync(ct);
        return new(shipment.Id, shipment.Version, SampleShippingPackingData.TubeCount(shipment), options, reason is null, reason,
            locationId, await TransportationKitInventory.LocationsAsync(db, shipment, ct), await TransportationKitInventory.MapAsync(db, kits, ct));
    }

    [HttpPost("preview")]
    public async Task<ContainerPackingPreviewDto> Preview(Guid shipmentId, [FromBody] ShipmentPackingPreviewRequest request, CancellationToken ct)
    {
        var tenant = await context.RequireSampleShippingTenantAsync(HttpContext, false, ct);
        var shipment = await LoadAsync(shipmentId, tenant.Organization.Id, tenant.Department.Id, ct);
        if (await PackingBlockAsync(shipment, ct) is { } reason) throw Conflict(reason);
        if (await TransportationKitSupplyGuard.PreparationBlockAsync(db, shipment, ct, request.DeliveryLocationId) is { } receiptReason) throw Conflict(receiptReason);
        var definitions = await OptionsAsync(shipment, ct, request.DeliveryLocationId);
        var availability = await TransportationKitSupplyGuard.LimitAvailabilityAsync(db, shipment, definitions, request.Availability, ct, request.DeliveryLocationId);
        return SampleShippingContainerPacker.Preview(definitions, SampleShippingPackingData.TubeCount(shipment), availability, request.Selection);
    }

    [HttpPost]
    public async Task<IReadOnlyList<SampleShipmentWorkflowDto>> Confirm(Guid shipmentId, [FromBody] ConfirmShipmentPackingRequest request, CancellationToken ct)
    {
        var tenant = await context.RequireSampleShippingTenantAsync(HttpContext, true, ct);
        var sourceId = await db.SampleShipments.AsNoTracking().Where(item => item.Id == shipmentId
                && item.OrganizationId == tenant.Organization.Id && item.DepartmentId == tenant.Department.Id)
            .Select(item => (Guid?)item.AuthorizationSourceId).SingleOrDefaultAsync(ct) ?? throw Missing();
        await using var transaction = await SampleShippingPackingData.BeginAsync(db, $"sample-shipping:{sourceId}", ct);
        var source = await LoadAsync(shipmentId, tenant.Organization.Id, tenant.Department.Id, ct);
        if (source.Version != request.Version) throw Conflict("This sample list changed. Refresh before choosing containers.");
        if (await PackingBlockAsync(source, ct) is { } reason) throw Conflict(reason);
        if (request.Containers is null || request.Containers.Count == 0) throw Invalid("Choose at least one container.");
        var locationId = await TransportationKitInventory.LocationAsync(db, source, request.DeliveryLocationId, ct);
        var requiresInventory = await TransportationKitSupplyGuard.RequiresOrderedKitsAsync(db, source, ct);
        await TransportationKitSupplyGuard.EnsurePackingAsync(db, source, request.Containers, ct, locationId);
        var options = await OptionsAsync(source, ct, locationId);
        var preview = SampleShippingContainerPacker.Preview(options, SampleShippingPackingData.TubeCount(source), request.Availability, request.Containers);
        if (preview.ContainerCount == 0) throw Invalid("Choose at least one compatible container with capacity.");
        if (request.Containers.Sum(item => (long)item.Quantity) > 10_000) throw Invalid("Select no more than 10,000 containers.");
        var customDefinitions = request.Containers.SelectMany(item => Enumerable.Repeat(options.Single(option => option.Id == item.ContainerDefinitionId), item.Quantity)).ToArray();
        if (request.ContainerTubeCounts is { } counts && (counts.Count != customDefinitions.Length
            || counts.Where((count, index) => count < 0 || count > customDefinitions[index].TubeCapacity).Any()
            || counts.Sum(value => (long)value) != SampleShippingPackingData.TubeCount(source) - preview.UnallocatedTubes))
            throw Invalid("Each container's tube count must fit its capacity, and the counts must equal the tubes being packed.");
        source.MarkPackingPool();

        // Convert the legacy one-container-per-specimen representation to explicit physical slots.
        foreach (var item in source.Items.Where(item => item.TubeSlots.Count == 0))
        {
            var slot = new SampleShipmentTubeSlot(item.Id, 1);
            item.TubeSlots.Add(slot);
            db.SampleShipmentTubeSlots.Add(slot);
        }
        var queue = new Queue<(SampleShipmentItem Item, SampleShipmentTubeSlot Slot)>(source.Items
            .OrderBy(item => item.CustomerSampleId, StringComparer.OrdinalIgnoreCase)
            .SelectMany(item => item.TubeSlots.OrderBy(slot => slot.Ordinal).Select(slot => (item, slot))));
        var created = new List<SampleShipment>();
        var physicalPlans = request.ContainerTubeCounts is { } explicitCounts
            ? customDefinitions.Select((definition, index) => (Definition: definition, Count: explicitCounts[index])).Where(item => item.Count > 0).ToArray()
            : preview.Containers.SelectMany(allocation => Enumerable.Range(0, allocation.Quantity).Select(index =>
                (Definition: options.Single(item => item.Id == allocation.ContainerDefinitionId),
                 Count: Math.Min(allocation.Capacity, allocation.AssignedTubes - index * allocation.Capacity)))).ToArray();
        foreach (var physicalPlan in physicalPlans)
        {
            var definition = physicalPlan.Definition;
            {
                var shipment = new SampleShipment($"SHP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..24].ToUpperInvariant(),
                    source.OrganizationId, source.DepartmentId, source.AuthorizationSource, source.AuthorizationSourceId,
                    source.AuthorizationReference, source.AuthorizationName, source.LabWorkOrderId, source.DestinationId);
                shipment.SelectContainer(definition.Id, SampleShippingContainerCatalogService.Snapshot(definition));
                if (requiresInventory) shipment.SetDepartureLocation(locationId ?? throw Invalid("Choose a departure delivery location."));
                var count = physicalPlan.Count;
                var itemMap = new Dictionary<Guid, SampleShipmentItem>();
                for (var tubeIndex = 0; tubeIndex < count; tubeIndex++)
                {
                    var (original, slot) = queue.Dequeue();
                    if (!itemMap.TryGetValue(original.Id, out var target))
                    {
                        target = new SampleShipmentItem(shipment.Id, original.SubmittedSpecimenId, original.SampleTypeDefinitionId,
                            original.CustomerSampleId, original.SampleName, original.Quantity, original.QuantityUnit);
                        itemMap.Add(original.Id, target);
                        shipment.Items.Add(target);
                        db.SampleShipmentItems.Add(target);
                    }
                    original.TubeSlots.Remove(slot);
                    slot.MoveTo(target.Id);
                    target.TubeSlots.Add(slot);
                }
                foreach (var item in shipment.Items) item.SetTubeQuantity(item.TubeSlots.Count);
                db.SampleShipments.Add(shipment);
                created.Add(shipment);
            }
        }
        if (requiresInventory)
            await ReserveContainersAsync(source, created, request.StockKits, locationId!.Value, tenant.Actor.Id, ct);
        foreach (var item in source.Items.ToArray())
        {
            if (item.TubeSlots.Count == 0) { source.Items.Remove(item); db.SampleShipmentItems.Remove(item); }
            else item.SetTubeQuantity(item.TubeSlots.Count);
        }
        if (source.Items.Count == 0) source.Cancel();
        db.Entry(source).Property(item => item.Version).IsModified = true;
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        var result = new List<SampleShipmentWorkflowDto>();
        foreach (var shipment in created) result.Add(await reader.ReadAsync(shipment.Id, tenant.Organization.Id, tenant.Department.Id, ct));
        if (source.Items.Count > 0) result.Add(await reader.ReadAsync(source.Id, tenant.Organization.Id, tenant.Department.Id, ct));
        return result;
    }

    private async Task<SampleShipment> LoadAsync(Guid id, Guid organizationId, Guid departmentId, CancellationToken ct)
        => await db.SampleShipments.Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Include(item => item.ReturnKit).Include(item => item.PacketRevisions)
            .SingleOrDefaultAsync(item => item.Id == id && item.OrganizationId == organizationId && item.DepartmentId == departmentId, ct) ?? throw Missing();
    private async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> OptionsAsync(SampleShipment shipment, CancellationToken ct, Guid? locationId = null)
        => await TransportationKitSupplyGuard.RequiresOrderedKitsAsync(db, shipment, ct)
            ? await TransportationKitInventory.OptionsAsync(db, shipment, await TransportationKitInventory.LocationAsync(db, shipment, locationId, ct), ct)
            : await catalog.ReadCompatibleAsync(await SampleShippingPackingData.ContextsAsync(db, shipment, ct), ct);
    private async Task<string?> PackingBlockAsync(SampleShipment shipment, CancellationToken ct)
        => SampleShippingPackingData.PackingBlock(shipment)
            ?? (await db.SampleShippingStockKits.AnyAsync(kit => kit.ReservedSampleShipmentId == shipment.Id, ct)
                ? "A physical container is already assigned. Reset the unscanned configuration before changing containers." : null);
    private async Task ReserveContainersAsync(SampleShipment source, IReadOnlyList<SampleShipment> shipments,
        IReadOnlyList<StockKitSelectionRequest>? selection, Guid locationId, Guid actorId, CancellationToken ct)
    {
        if (selection is null || selection.Count != shipments.Count || selection.Select(item => item.StockKitId).Distinct().Count() != selection.Count)
            throw Invalid("Scan one different physical container barcode for each container being prepared.");
        var ids = selection.Select(item => item.StockKitId).ToArray();
        foreach (var id in ids.Order()) await SampleShippingPackingData.LockAsync(db, $"stock-kit:{id}", ct);
        var kits = await db.SampleShippingStockKits.Where(item => ids.Contains(item.Id)).ToArrayAsync(ct);
        for (var index = 0; index < selection.Count; index++)
        {
            var selected = selection[index];
            var kit = kits.SingleOrDefault(item => item.Id == selected.StockKitId);
            if (kit is null || kit.OrganizationId != source.OrganizationId || kit.DepartmentId != source.DepartmentId || kit.CustomerDeliveryLocationId != locationId)
                throw Missing();
            await db.Entry(kit).ReloadAsync(ct);
            if (kit.Version != selected.Version || kit.ReservedSampleShipmentId.HasValue || kit.BoundSampleShipmentId.HasValue || !kit.CustomerReceivedAt.HasValue)
                throw Conflict($"Container {kit.KitNumber} changed or is no longer available. Refresh and review your selected containers.");
            if (kit.ContainerDefinitionId != shipments[index].ContainerDefinitionId || SampleShippingPackingData.TubeCount(shipments[index]) > kit.TubeCapacity)
                throw Invalid($"Container {kit.KitNumber} does not match this size or tube allocation.");
            try { kit.Reserve(shipments[index], actorId, DateTime.UtcNow); }
            catch (InvalidOperationException exception) { throw Conflict(exception.Message); }
        }
    }
    private static OrderManagementException Missing() => new("sample_shipment_not_found", "The sample shipment was not found.", 404);
    private static OrderManagementException Conflict(string message) => new("sample_packing_conflict", message, 409);
    private static OrderManagementException Invalid(string message) => new("sample_packing_invalid", message);
}
