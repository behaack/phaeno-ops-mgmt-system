namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class TransportationKitRequestService(PSeqOperationsDbContext db, SampleShippingContainerCatalogService catalog)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<SampleShipment> ShipmentAsync(Guid id, OrderTenantContext tenant, CancellationToken ct)
        => await db.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Include(item => item.ReturnKit).Include(item => item.PacketRevisions)
            .SingleOrDefaultAsync(item => item.Id == id && item.OrganizationId == tenant.Organization.Id
                && item.DepartmentId == tenant.Department.Id && item.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder, ct) ?? throw Missing();

    public async Task<LabServiceOrder> JobAsync(Guid id, Guid organizationId, Guid departmentId, CancellationToken ct)
        => await db.LabServiceOrders.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id
            && item.OrganizationId == organizationId && item.DepartmentId == departmentId && !item.IsDiscarded, ct) ?? throw Missing();

    public static string? JobBlock(LabServiceOrder job)
        => !job.AcceptedQuoteId.HasValue || !job.SampleRosterFinalizedAt.HasValue
            || job.Status is not (LabServiceOrderStatus.PlacedAwaitingSamples or LabServiceOrderStatus.InProgress)
                ? "Transportation kits can be ordered for an accepted, active laboratory Job with a finalized sample list." : null;

    public async Task<ShipmentKitSupplyDto> SupplyAsync(Guid shipmentId, OrderTenantContext tenant, Guid? locationId, CancellationToken ct)
    {
        var shipment = await ShipmentAsync(shipmentId, tenant, ct);
        var job = await JobAsync(shipment.AuthorizationSourceId, tenant.Organization.Id, tenant.Department.Id, ct);
        var locations = await db.CustomerDeliveryLocations.AsNoTracking().Where(item => item.OrganizationId == tenant.Organization.Id
            && item.DepartmentId == tenant.Department.Id && item.IsActive).OrderByDescending(item => item.IsDefault).ThenBy(item => item.Label).ToListAsync(ct);
        var request = await db.TransportationKitRequests.AsNoTracking().Include(item => item.Lines)
            .Where(item => item.LabServiceOrderId == job.Id && item.OrganizationId == tenant.Organization.Id && item.DepartmentId == tenant.Department.Id)
            .OrderBy(item => item.ClosedAt.HasValue).ThenByDescending(item => item.RequestedAt).FirstOrDefaultAsync(ct);
        locationId ??= request is { Status: not TransportationKitRequestStatus.Cancelled } && locations.Any(item => item.Id == request.DeliveryLocationId)
            ? request.DeliveryLocationId : locations.FirstOrDefault(item => item.IsDefault)?.Id ?? (locations.Count == 1 ? locations[0].Id : null);
        if (locationId.HasValue && !locations.Any(item => item.Id == locationId)) throw Missing();
        var definitions = shipment.Items.Count == 0 ? [] : await catalog.ReadCompatibleAsync(await SampleShippingPackingData.ContextsAsync(db, shipment, ct), ct);
        var stock = await StockAsync(job.Id, tenant.Organization.Id, tenant.Department.Id, locationId, ct);
        var prepared = await db.SampleShipments.AsNoTracking().Where(item => item.Id != shipment.Id
            && item.OrganizationId == tenant.Organization.Id && item.DepartmentId == tenant.Department.Id
            && item.AuthorizationSource == shipment.AuthorizationSource && item.AuthorizationSourceId == job.Id
            && item.Status == SampleShipmentStatus.Preparing && item.ContainerDefinitionId.HasValue
            && item.ReturnKit == null && item.Items.Any()).Select(item => item.ContainerDefinitionId!.Value).ToArrayAsync(ct);
        var recorded = definitions.Select(definition => new RecordedTransportationKitStockDto(definition.Id,
            Math.Max(0, stock.Count(kit => kit.ContainerDefinitionId == definition.Id && kit.CustomerReceivedAt.HasValue && !kit.BoundSampleShipmentId.HasValue)
                - prepared.Count(id => id == definition.Id)),
            stock.Count(kit => kit.ContainerDefinitionId == definition.Id && !kit.CustomerReceivedAt.HasValue))).ToArray();
        var tubeCount = SampleShippingPackingData.TubeCount(shipment);
        var coverage = SampleShippingContainerPacker.Preview(definitions, tubeCount,
            recorded.Select(item => new ContainerQuantityRequest(item.ContainerDefinitionId, item.AvailableQuantity)).ToArray());
        var recommendation = SampleShippingContainerPacker.Preview(definitions, coverage.UnallocatedTubes);
        var block = !tenant.IsDepartmentAdmin ? "An organization or department administrator can order transportation kits."
            : JobBlock(job) ?? SampleShippingPackingData.PackingBlock(shipment)
            ?? (request is { ClosedAt: null } ? "A transportation-kit order is already open for this Job."
                : locations.Count == 0 ? "Add a delivery location."
                : coverage.UnallocatedTubes == 0 ? "Recorded available kits cover these tubes."
                : !recommendation.IsComplete || recommendation.ContainerCount == 0 ? "No effective compatible transportation kit is configured." : null);
        var preparationBlock = await TransportationKitSupplyGuard.PreparationBlockAsync(db, shipment, ct);
        return new(shipment.Id, shipment.Version, job.Id, job.OrderNumber, tubeCount, locationId,
            locations.Select(item => item.ToDto()).ToArray(), recommendation, recorded, stock.Count == 0 ? "Unknown" : "RecordedForThisJob",
            request is null ? null : await MapAsync(request, tenant.IsDepartmentAdmin, false, ct), block is null, block,
            tenant.IsDepartmentAdmin && preparationBlock is null,
            !tenant.IsDepartmentAdmin ? "An organization or department administrator can prepare samples." : preparationBlock);
    }

    public async Task<TransportationKitRequestDto> CreateAsync(Guid shipmentId, OrderTenantContext tenant, CreateTransportationKitRequest body, CancellationToken ct)
    {
        var shipment = await ShipmentAsync(shipmentId, tenant, ct);
        await SampleShippingPackingData.LockAsync(db, $"sample-shipping:{shipment.AuthorizationSourceId}", ct);
        shipment = await ShipmentAsync(shipmentId, tenant, ct);
        var existing = await db.TransportationKitRequests.AsNoTracking().Include(item => item.Lines)
            .SingleOrDefaultAsync(item => item.LabServiceOrderId == shipment.AuthorizationSourceId && !item.ClosedAt.HasValue, ct);
        if (existing is not null)
        {
            if (existing.OrganizationId != tenant.Organization.Id || existing.DepartmentId != tenant.Department.Id) throw Missing();
            if (existing.DeliveryLocationId != body.DeliveryLocationId || !SameLines(existing, body.Containers))
                throw Conflict("A transportation-kit order is already open for this Job. Review it before changing the request.");
            return await MapAsync(existing, true, false, ct);
        }
        Version(shipment.Version, body.ShipmentVersion);
        var supply = await SupplyAsync(shipmentId, tenant, body.DeliveryLocationId, ct);
        if (!supply.CanRequestKits) throw Conflict(supply.RequestBlockedReason!);
        var location = await db.CustomerDeliveryLocations.AsNoTracking().SingleOrDefaultAsync(item => item.Id == body.DeliveryLocationId
            && item.OrganizationId == tenant.Organization.Id && item.DepartmentId == tenant.Department.Id && item.IsActive, ct) ?? throw Missing();
        Version(location.Version, body.DeliveryLocationVersion);
        if (body.Containers is null || body.Containers.Count == 0) throw Invalid("Choose at least one transportation kit.");
        var definitions = await catalog.ReadCompatibleAsync(await SampleShippingPackingData.ContextsAsync(db, shipment, ct), ct);
        var selected = SampleShippingContainerPacker.Preview(definitions, supply.Recommendation.TubeCount, selection: body.Containers);
        if (!selected.IsComplete || selected.ContainerCount == 0 || body.Containers.Any(item => item.Quantity <= 0)
            || selected.ContainerCount != body.Containers.Sum(item => item.Quantity))
            throw Invalid("Choose enough compatible transportation kits for the remaining tubes, without empty extras.");
        var request = new TransportationKitRequest(shipment.AuthorizationSourceId, tenant.Organization.Id, tenant.Department.Id,
            location.Id, JsonSerializer.Serialize(location.ToDto(), Json), tenant.Actor.Id, DateTime.UtcNow);
        foreach (var quantity in body.Containers)
        {
            var definition = definitions.Single(item => item.Id == quantity.ContainerDefinitionId);
            request.Lines.Add(new(request.Id, definition.Id, SampleShippingContainerCatalogService.Snapshot(definition), quantity.Quantity));
        }
        db.TransportationKitRequests.Add(request);
        AddEvent(request, tenant.Actor.Id, "Created", "Transportation kits and outbound delivery are included with the accepted laboratory order.");
        await NotifyFulfillmentAsync(request, supply.JobNumber, ct);
        await db.SaveChangesAsync(ct);
        return await MapAsync(request, true, false, ct);
    }

    public async Task<TransportationKitRequest> LoadAsync(Guid id, Guid? organizationId, Guid? departmentId, CancellationToken ct)
        => await db.TransportationKitRequests.Include(item => item.Lines).SingleOrDefaultAsync(item => item.Id == id
            && (!organizationId.HasValue || item.OrganizationId == organizationId) && (!departmentId.HasValue || item.DepartmentId == departmentId), ct) ?? throw Missing();

    public async Task<TransportationKitRequestDto> MapAsync(TransportationKitRequest request, bool customerAdmin, bool staff, CancellationToken ct)
        => (await MapManyAsync([request], customerAdmin, staff, ct))[0];

    public async Task<IReadOnlyList<TransportationKitRequestDto>> MapManyAsync(IReadOnlyList<TransportationKitRequest> requests, bool customerAdmin, bool staff, CancellationToken ct)
    {
        var lineIds = requests.SelectMany(request => request.Lines).Select(line => line.Id).ToArray();
        var allKits = await db.SampleShippingStockKits.AsNoTracking().Where(kit => kit.TransportationKitRequestLineId.HasValue
            && lineIds.Contains(kit.TransportationKitRequestLineId.Value)).OrderBy(kit => kit.FulfilledAt).ThenBy(kit => kit.KitNumber).ToListAsync(ct);
        var jobIds = requests.Select(request => request.LabServiceOrderId).Distinct().ToArray();
        var organizationIds = requests.Select(request => request.OrganizationId).Distinct().ToArray();
        var departmentIds = requests.Select(request => request.DepartmentId).Distinct().ToArray();
        var jobNames = await db.LabServiceOrders.Where(item => jobIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.OrderNumber, ct);
        var organizationNames = await db.Organizations.Where(item => organizationIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.Name, ct);
        var departmentNames = await db.OrganizationDepartments.Where(item => departmentIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, item => item.Name, ct);
        return requests.Select(request =>
        {
        var ownLineIds = request.Lines.Select(line => line.Id).ToHashSet();
        var kits = allKits.Where(kit => ownLineIds.Contains(kit.TransportationKitRequestLineId!.Value)).ToArray();
        return new TransportationKitRequestDto(request.Id, request.LabServiceOrderId, jobNames[request.LabServiceOrderId], request.OrganizationId, request.DepartmentId,
            request.DeliveryLocationId, JsonSerializer.Deserialize<CustomerDeliveryLocationDto>(request.DeliveryAddressSnapshotJson, Json)!,
            request.Status.ToString(), request.RequestedAt, request.Version, true,
            request.Lines.OrderBy(item => item.Id).Select(line =>
            {
                var definition = JsonSerializer.Deserialize<SampleShippingContainerDefinitionDto>(line.ContainerSnapshotJson, Json)!;
                return new TransportationKitRequestLineDto(line.Id, line.ContainerDefinitionId, definition.Sku, definition.CommonName,
                    definition.TubeCapacity, line.Quantity, kits.Count(kit => kit.TransportationKitRequestLineId == line.Id),
                    kits.Count(kit => kit.TransportationKitRequestLineId == line.Id && kit.CustomerReceivedAt.HasValue));
            }).ToArray(), kits.Select(kit => new TransportationKitDispatchDto(kit.Id, kit.KitNumber, kit.TransportationKitRequestLineId!.Value,
                kit.ContainerDefinitionId, kit.OutboundCarrier!, kit.OutboundTrackingNumber!, kit.FulfilledAt!.Value, kit.CustomerReceivedAt)).ToArray(),
            customerAdmin && kits.Any(kit => !kit.CustomerReceivedAt.HasValue),
            (customerAdmin || staff) && request.Status == TransportationKitRequestStatus.Pending, request.CancellationReason,
            organizationNames[request.OrganizationId], departmentNames[request.DepartmentId]);
        }).ToArray();
    }

    public async Task<TransportationKitRequestDetailDto> DetailAsync(TransportationKitRequest request, CancellationToken ct)
    {
        var job = await JobAsync(request.LabServiceOrderId, request.OrganizationId, request.DepartmentId, ct);
        var block = request.ClosedAt.HasValue || request.Status == TransportationKitRequestStatus.Dispatched
            ? "All requested kits have been dispatched or this request is closed." : JobBlock(job);
        var definitionIds = request.Lines.Select(item => item.ContainerDefinitionId).ToArray();
        var ready = block is null ? await db.SampleShippingStockKits.AsNoTracking().Where(item => !item.FulfilledAt.HasValue
            && !item.OrganizationId.HasValue && !item.TransportationKitRequestLineId.HasValue && !item.BoundSampleShipmentId.HasValue
            && definitionIds.Contains(item.ContainerDefinitionId) && item.Tubes.Count == item.TubeCapacity).OrderBy(item => item.CreatedAt).ToListAsync(ct) : [];
        return new(await MapAsync(request, false, true, ct), ready.Select(kit =>
        {
            var definition = JsonSerializer.Deserialize<SampleShippingContainerDefinitionDto>(kit.ContainerSnapshotJson, Json)!;
            return new AvailableTransportationStockKitDto(kit.Id, kit.KitNumber, kit.ContainerDefinitionId,
                definition.Sku, definition.CommonName, kit.TubeCapacity, kit.Version);
        }).ToArray(), block is null, block);
    }

    public async Task<TransportationKitRequestDetailDto> DispatchAsync(Guid id, Guid actorId, DispatchTransportationKitsRequest body, CancellationToken ct)
    {
        var request = await FreshRequestAsync(id, null, null, ct);
        Version(request.Version, body.Version);
        var job = await JobAsync(request.LabServiceOrderId, request.OrganizationId, request.DepartmentId, ct);
        if (JobBlock(job) is { } blocked) throw Conflict(blocked);
        if (request.ClosedAt.HasValue || request.Status == TransportationKitRequestStatus.Dispatched) throw Conflict("This request has no kits remaining to dispatch.");
        var kitIds = UniqueIds(body.StockKitIds);
        await SampleShippingPackingData.LockAsync(db, $"sample-shipping:{job.Id}", ct);
        foreach (var kitId in kitIds.Order()) await SampleShippingPackingData.LockAsync(db, $"stock-kit:{kitId}", ct);
        var shipments = await db.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Where(item => item.OrganizationId == request.OrganizationId && item.DepartmentId == request.DepartmentId
                && item.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder && item.AuthorizationSourceId == job.Id
                && item.Status != SampleShipmentStatus.Cancelled && item.Items.Any()).OrderBy(item => item.CreatedAt).ToListAsync(ct);
        if (shipments.Count == 0) throw Missing();
        var dispatchContexts = new Dictionary<Guid, SampleShipment>();
        foreach (var shipment in shipments)
        {
            var options = await catalog.ReadCompatibleAsync(await SampleShippingPackingData.ContextsAsync(db, shipment, ct), ct);
            foreach (var option in options) dispatchContexts.TryAdd(option.Id, shipment);
        }
        var kits = await db.SampleShippingStockKits.Include(item => item.Tubes).Where(item => kitIds.Contains(item.Id)).ToListAsync(ct);
        if (kits.Count != kitIds.Length) throw Missing();
        foreach (var kit in kits) await db.Entry(kit).ReloadAsync(ct);
        var existing = await RequestKitsAsync(request, ct);
        if (body.FulfilledAt.Kind == DateTimeKind.Unspecified) throw Invalid("Dispatch time must include a time zone.");
        foreach (var kit in kits)
        {
            var line = request.Lines.SingleOrDefault(item => item.ContainerDefinitionId == kit.ContainerDefinitionId)
                ?? throw Conflict("Each picked kit must match a requested container revision.");
            if (!dispatchContexts.TryGetValue(kit.ContainerDefinitionId, out var shipment)) throw Conflict("A requested container is no longer effective for this Job. Review the request before dispatch.");
            Execute(() => { kit.Dispatch(shipment, body.OutboundCarrier, body.OutboundTrackingNumber, body.FulfilledAt.ToUniversalTime()); kit.LinkTransportationRequest(request, line); });
        }
        Execute(() => request.Reconcile(existing.Concat(kits).ToArray(), DateTime.UtcNow));
        db.Entry(request).Property(item => item.Version).IsModified = true;
        AddEvent(request, actorId, "Dispatched", $"{kits.Count} transportation kit(s) dispatched; customer receipt is pending.");
        db.OrderNotifications.Add(new OrderNotification(request.OrganizationId, request.RequestedByUserId, "TransportationKit", request.Id,
            "transportation-kits-dispatched", $"Transportation kits dispatched for {job.OrderNumber}",
            $"{kits.Count} kit(s) are on the way via {body.OutboundCarrier}. Tracking: {body.OutboundTrackingNumber}. Confirm receipt in the Job before preparing these sample shipments.", request.DepartmentId));
        await db.SaveChangesAsync(ct);
        return await DetailAsync(request, ct);
    }

    public async Task<TransportationKitRequestDto> ReceiveAsync(Guid id, OrderTenantContext tenant, ReceiveTransportationKitsRequest body, CancellationToken ct)
    {
        var request = await FreshRequestAsync(id, tenant.Organization.Id, tenant.Department.Id, ct);
        var kitIds = UniqueIds(body.StockKitIds);
        foreach (var kitId in kitIds.Order()) await SampleShippingPackingData.LockAsync(db, $"stock-kit:{kitId}", ct);
        var kits = await RequestKitsAsync(request, ct);
        if (kitIds.Any(id => !kits.Any(kit => kit.Id == id))) throw Missing();
        if (kits.Where(kit => kitIds.Contains(kit.Id)).All(kit => kit.CustomerReceivedAt.HasValue)) return await MapAsync(request, true, false, ct);
        Version(request.Version, body.Version);
        var selected = await db.SampleShippingStockKits.Where(kit => kitIds.Contains(kit.Id)).ToListAsync(ct);
        foreach (var kit in selected)
        {
            await db.Entry(kit).ReloadAsync(ct);
            Execute(() => kit.ConfirmCustomerReceipt(tenant.Actor.Id, DateTime.UtcNow));
        }
        var merged = kits.Where(kit => !kitIds.Contains(kit.Id)).Concat(selected).ToArray();
        Execute(() => request.Reconcile(merged, DateTime.UtcNow));
        db.Entry(request).Property(item => item.Version).IsModified = true;
        AddEvent(request, tenant.Actor.Id, "CustomerReceived", $"Customer confirmed receipt of {selected.Count} transportation kit(s).");
        await db.SaveChangesAsync(ct);
        return await MapAsync(request, true, false, ct);
    }

    public async Task<TransportationKitRequestDto> CancelAsync(Guid id, Guid? organizationId, Guid? departmentId,
        Guid actorId, bool staff, CancelTransportationKitRequest body, CancellationToken ct)
    {
        var request = await FreshRequestAsync(id, organizationId, departmentId, ct);
        if (request.Status == TransportationKitRequestStatus.Cancelled) return await MapAsync(request, !staff, staff, ct);
        Version(request.Version, body.Version);
        if ((await RequestKitsAsync(request, ct)).Count > 0) throw Conflict("Dispatched kits cannot be cancelled through this action.");
        Execute(() => request.Cancel(body.Reason, DateTime.UtcNow));
        AddEvent(request, actorId, "Cancelled", body.Reason);
        await db.SaveChangesAsync(ct);
        return await MapAsync(request, !staff, staff, ct);
    }

    private async Task<TransportationKitRequest> FreshRequestAsync(Guid id, Guid? organizationId, Guid? departmentId, CancellationToken ct)
    {
        await SampleShippingPackingData.LockAsync(db, $"transportation-kit-request:{id}", ct);
        var request = await LoadAsync(id, organizationId, departmentId, ct);
        await db.Entry(request).ReloadAsync(ct);
        return request;
    }
    private async Task<List<SampleShippingStockKit>> RequestKitsAsync(TransportationKitRequest request, CancellationToken ct)
    {
        var lineIds = request.Lines.Select(line => line.Id).ToArray();
        return await db.SampleShippingStockKits.AsNoTracking().Where(kit => kit.TransportationKitRequestLineId.HasValue
            && lineIds.Contains(kit.TransportationKitRequestLineId.Value)).OrderBy(kit => kit.FulfilledAt).ThenBy(kit => kit.KitNumber).ToListAsync(ct);
    }
    private async Task<List<SampleShippingStockKit>> StockAsync(Guid jobId, Guid organizationId, Guid departmentId, Guid? locationId, CancellationToken ct)
        => !locationId.HasValue ? [] : await db.SampleShippingStockKits.AsNoTracking().Where(kit => kit.OrganizationId == organizationId
            && kit.DepartmentId == departmentId && kit.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder
            && kit.AuthorizationSourceId == jobId && kit.CustomerDeliveryLocationId == locationId && kit.TransportationKitRequestLineId.HasValue
            && kit.FulfilledAt.HasValue).ToListAsync(ct);

    private async Task NotifyFulfillmentAsync(TransportationKitRequest request, string jobNumber, CancellationToken ct)
    {
        var phaenoId = await db.Organizations.Where(item => item.IsActive && item.Kind == OrganizationKind.Phaeno)
            .Select(item => item.Id).SingleOrDefaultAsync(ct);
        if (phaenoId == Guid.Empty) throw Conflict("Phaeno fulfillment notification routing is not configured.");
        db.OrderNotifications.Add(new OrderNotification(phaenoId, null, "TransportationKit", request.Id,
            "transportation-kits-requested", $"Transportation kits requested for {jobNumber}",
            $"A Customer requested transportation kits for Job {jobNumber}. Review the delivery address, requested sizes and quantities in POMS Kit requests. Kits and outbound delivery are included with the accepted laboratory order."));
    }
    private void AddEvent(TransportationKitRequest request, Guid actorId, string status, string? reason)
        => db.OrderStatusEvents.Add(new(request.OrganizationId, "TransportationKit", request.Id, null,
            request.Status.ToString(), status, reason, null, actorId, DateTime.UtcNow));
    private static bool SameLines(TransportationKitRequest request, IReadOnlyList<ContainerQuantityRequest>? lines)
        => lines is not null && lines.Count == request.Lines.Count && lines.Select(item => item.ContainerDefinitionId).Distinct().Count() == lines.Count
            && lines.All(item => request.Lines.Any(line => line.ContainerDefinitionId == item.ContainerDefinitionId && line.Quantity == item.Quantity));
    private static Guid[] UniqueIds(IReadOnlyList<Guid>? values)
        => values is null || values.Count == 0 || values.Any(id => id == Guid.Empty) || values.Distinct().Count() != values.Count
            ? throw Invalid("Choose each dispatched kit once.") : values.ToArray();
    public static void Version(long actual, long expected) { if (actual != expected) throw Conflict("This record changed. Refresh before continuing."); }
    private static void Execute(Action action)
    {
        try { action(); } catch (ArgumentException exception) { throw Invalid(exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict(exception.Message); }
    }
    private static OrderManagementException Missing() => new("transportation_kit_not_found", "The transportation-kit record or Job was not found.", 404);
    private static OrderManagementException Invalid(string message) => new("transportation_kit_invalid", message);
    private static OrderManagementException Conflict(string message) => new("transportation_kit_conflict", message, 409);
}
