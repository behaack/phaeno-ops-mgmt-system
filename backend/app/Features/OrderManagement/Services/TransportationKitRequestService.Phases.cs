namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed partial class TransportationKitRequestService
{
    public async Task<LabOrderKitWorkspaceDto> PhaseWorkspaceAsync(LabServiceOrder order, bool canManage,
        Guid? locationId, CancellationToken ct)
    {
        var locations = (await db.CustomerDeliveryLocations.AsNoTracking().Where(l =>
            l.OrganizationId == order.OrganizationId && l.DepartmentId == order.DepartmentId && l.IsActive)
            .OrderByDescending(l => l.IsDefault).ThenBy(l => l.Label).ToArrayAsync(ct)).Select(l => l.ToDto()).ToArray();
        locationId ??= locations.FirstOrDefault(l => l.IsDefault)?.Id ?? (locations.Length == 1 ? locations[0].Id : null);
        if (locationId.HasValue && !locations.Any(l => l.Id == locationId)) throw Missing();
        var requests = await db.TransportationKitRequests.AsNoTracking().Include(r => r.Lines)
            .Where(r => r.LabServiceOrderId == order.Id && r.OrganizationId == order.OrganizationId && r.DepartmentId == order.DepartmentId)
            .OrderByDescending(r => r.RequestedAt).ToArrayAsync(ct);
        var phases = new List<LabPhaseKitSupplyDto>();
        var currentPhaseId = await LabPhaseShippingSequence.CurrentPhaseIdAsync(db, order, ct);
        var cancellationPending = await db.Set<LabPhaseCancellationRequest>().AnyAsync(r => r.LabJobPhaseId == currentPhaseId && r.Status == "Pending", ct);
        foreach (var phase in order.Phases.Where(p => p.SupersededAtUtc == null && p.CancelledAtUtc == null).OrderBy(p => p.Position))
            phases.Add((await PhaseSupplyAsync(order, phase, requests, locationId, canManage, currentPhaseId, cancellationPending, ct)).Supply);
        return new(await MapManyAsync(requests, canManage, false, ct), phases, locations);
    }

    private async Task<(LabPhaseKitSupplyDto Supply, IReadOnlyList<SampleShippingStockKit> Stock,
        ContainerPackingPreviewDto StockPlan)> PhaseSupplyAsync(LabServiceOrder order, LabJobPhase phase,
        IReadOnlyList<TransportationKitRequest> requests, Guid? locationId, bool canManage, Guid? currentPhaseId, bool cancellationPending, CancellationToken ct)
    {
        var contexts = order.SampleTypeDefinitionId.HasValue
            ? new[] { new ContainerSampleTypeContext(order.SampleTypeDefinitionId.Value) } : [];
        var selections = await db.LabSampleTubeKitSelections.AsNoTracking().Where(s => s.LabServiceOrderId == order.Id
            && s.LabJobPhaseId == phase.Id).ToArrayAsync(ct);
        var selectionIds = selections.Select(s => s.StockKitId).ToArray();
        var allocated = await db.SampleShippingStockKits.AsNoTracking().Include(k => k.Tubes).Where(k => selectionIds.Contains(k.Id)).ToArrayAsync(ct);
        var pairs = await db.LabSampleTubePairs.AsNoTracking().Where(p => p.LabServiceOrderId == order.Id
            && p.LabJobPhaseId == phase.Id).ToArrayAsync(ct);
        var otherPhaseLineIds = await db.TransportationKitRequestLines.AsNoTracking()
            .Join(db.TransportationKitRequests, l => l.TransportationKitRequestId, r => r.Id, (l, r) => new { l.Id, r.LabJobPhaseId, r.Status })
            .Where(r => r.LabJobPhaseId.HasValue && r.LabJobPhaseId != phase.Id && r.Status != TransportationKitRequestStatus.Cancelled)
            .Select(r => r.Id).ToArrayAsync(ct);
        var stock = await db.SampleShippingStockKits.AsNoTracking().Include(k => k.Tubes).Where(k => locationId.HasValue
            && k.CustomerDeliveryLocationId == locationId && k.OrganizationId == order.OrganizationId && k.DepartmentId == order.DepartmentId
            && k.CustomerReceivedAt.HasValue && !k.ReservedSampleShipmentId.HasValue && !k.BoundSampleShipmentId.HasValue
            && !k.WithdrawnAt.HasValue && (!k.TransportationKitRequestLineId.HasValue || !otherPhaseLineIds.Contains(k.TransportationKitRequestLineId.Value))
            && !db.LabSampleTubeKitSelections.Any(s => s.StockKitId == k.Id && (s.LabServiceOrderId != order.Id || s.LabJobPhaseId.HasValue))
            && !db.LabSampleTubePairs.Any(p => p.StockKitId == k.Id && p.LabJobPhaseId != phase.Id)).OrderBy(k => k.KitNumber).ToArrayAsync(ct);
        var stockDefinitions = await catalog.ReadStockCompatibleAsync(contexts, stock.Select(k => k.ContainerDefinitionId).Distinct().ToArray(), ct);
        stock = stock.Where(k => TransportationKitInventory.IsPhysicallyUsable(k, DateTime.UtcNow)
            && TransportationKitInventory.HasPreparedTubeRoster(k) && stockDefinitions.Any(d => d.Id == k.ContainerDefinitionId)).ToArray();
        var covered = allocated.Where(k => k.CustomerReceivedAt.HasValue && TransportationKitInventory.HasPreparedTubeRoster(k)
                && TransportationKitInventory.IsPhysicallyUsable(k, DateTime.UtcNow))
            .Sum(k => selections.Single(s => s.StockKitId == k.Id).FinishedAt.HasValue
                ? pairs.Count(p => p.StockKitId == k.Id) : k.TubeCapacity);
        var remaining = Math.Max(0, phase.SampleCount - covered);
        var stockPlan = SampleShippingContainerPacker.Preview(stockDefinitions, remaining,
            stockDefinitions.Select(d => new ContainerQuantityRequest(d.Id, stock.Count(k => k.ContainerDefinitionId == d.Id))).ToArray());
        var definitions = (await catalog.ReadCompatibleAsync(contexts, ct)).Where(d => d.AssemblyWorkflowReady == true).ToArray();
        var recommendation = SampleShippingContainerPacker.Preview(definitions, stockPlan.UnallocatedTubes);
        var open = requests.Any(r => r.LabJobPhaseId == phase.Id && r.ClosedAt == null);
        var unassignedOpen = requests.Any(r => r.LabJobPhaseId == null && r.ClosedAt == null);
        var otherLocationLines = requests.Where(r => r.LabJobPhaseId == phase.Id && r.Status == TransportationKitRequestStatus.Received
            && r.DeliveryLocationId != locationId).SelectMany(r => r.Lines).Select(l => l.Id).ToArray();
        var otherLocationKits = await db.SampleShippingStockKits.AsNoTracking().Where(k => k.TransportationKitRequestLineId.HasValue
            && otherLocationLines.Contains(k.TransportationKitRequestLineId.Value) && k.CustomerReceivedAt.HasValue
            && !k.BoundSampleShipmentId.HasValue && !k.ReservedSampleShipmentId.HasValue && !k.WithdrawnAt.HasValue).ToArrayAsync(ct);
        var otherLocation = otherLocationKits.Any(k => TransportationKitInventory.IsPhysicallyUsable(k, DateTime.UtcNow));
        var reason = !canManage ? "An organization or department administrator can request transportation kits."
            : JobBlock(order) ?? PhaseBlock(phase)
            ?? (phase.Id != currentPhaseId ? "Record every required shipment from the preceding phases before requesting kits for this phase."
                : cancellationPending ? "Resolve this phase's cancellation request before continuing its shipping steps."
                : phase.PreparationCompletedAtUtc.HasValue ? "Sample preparation is already confirmed for this phase."
                : open ? "A kit order is already open for this phase."
                : unassignedOpen ? "Review the earlier whole-Job kit order first. Confirm its physical arrivals or cancel it before dispatch; then allocate the received kits to phases."
                : otherLocation ? "This phase's kits were delivered to another address. Select that delivery address to use them."
                : !locationId.HasValue ? "Choose a delivery address."
                : remaining == 0 ? "Allocated kits cover this phase."
                : !recommendation.IsComplete ? "No approved compatible kit can cover this phase. Ask Phaeno to review kit setup." : null);
        return (new(phase.Id, phase.Name, phase.SampleCount, locationId, recommendation,
            stock.Select(k => new AvailableTransportationStockKitDto(k.Id, k.KitNumber, k.ContainerDefinitionId,
                stockDefinitions.Single(d => d.Id == k.ContainerDefinitionId).Sku,
                stockDefinitions.Single(d => d.Id == k.ContainerDefinitionId).CommonName, k.TubeCapacity, k.Version)).ToArray(), reason is null, reason), stock, stockPlan);
    }

    public async Task RequestPhasesAsync(LabServiceOrder order, Guid actorId, RequestLabPhaseKitsRequest body, CancellationToken ct)
    {
        Version(order.Version, body.OrderVersion);
        if (JobBlock(order) is { } blocked) throw Conflict(blocked);
        if (body.PhaseIds is null || body.PhaseIds.Count != 1)
            throw Invalid("Request transportation kits for the current phase only.");
        var currentPhase = order.Phases.SingleOrDefault(p => p.Id == body.PhaseIds[0]) ?? throw Missing();
        await LabPhaseShippingSequence.RequireCurrentAsync(db, order, currentPhase, ct);
        var location = await db.CustomerDeliveryLocations.AsNoTracking().SingleOrDefaultAsync(l =>
            l.Id == body.DeliveryLocationId && l.OrganizationId == order.OrganizationId && l.DepartmentId == order.DepartmentId && l.IsActive, ct) ?? throw Missing();
        Version(location.Version, body.DeliveryLocationVersion);
        order.EnablePairedPreparation();
        foreach (var phaseId in body.PhaseIds.Order())
        {
            var phase = order.Phases.SingleOrDefault(p => p.Id == phaseId) ?? throw Missing();
            var requests = await db.TransportationKitRequests.AsNoTracking().Include(r => r.Lines).Where(r => r.LabServiceOrderId == order.Id).ToArrayAsync(ct);
            var supply = await PhaseSupplyAsync(order, phase, requests, location.Id, true, currentPhase.Id, false, ct);
            if (!supply.Supply.CanRequest) throw Conflict(supply.Supply.BlockedReason!);
            foreach (var allocation in supply.StockPlan.Containers)
            foreach (var candidate in supply.Stock.Where(k => k.ContainerDefinitionId == allocation.ContainerDefinitionId).Take(allocation.Quantity))
            {
                await SampleShippingPackingData.LockAsync(db, $"stock-kit:{candidate.Id}", ct);
                var stock = await db.SampleShippingStockKits.AsNoTracking().SingleAsync(k => k.Id == candidate.Id, ct);
                if (!stock.CustomerReceivedAt.HasValue || stock.ReservedSampleShipmentId.HasValue || stock.BoundSampleShipmentId.HasValue
                    || !TransportationKitInventory.IsPhysicallyUsable(stock, DateTime.UtcNow)
                    || await db.LabSampleTubeKitSelections.AnyAsync(s => s.StockKitId == stock.Id && (s.LabServiceOrderId != order.Id || s.LabJobPhaseId.HasValue), ct))
                    throw Conflict("Available stock changed. Review the kit requirement and try again.");
                var selection = await db.LabSampleTubeKitSelections.SingleOrDefaultAsync(s => s.StockKitId == stock.Id, ct);
                if (selection is null) db.LabSampleTubeKitSelections.Add(new(order.Id, order.OrganizationId, order.DepartmentId, stock.Id, phase.Id));
                else selection.AssignPhase(phase.Id);
            }
            if (supply.Supply.Recommendation.ContainerCount > 0)
            {
                var definitions = await catalog.ReadCompatibleAsync([new ContainerSampleTypeContext(order.SampleTypeDefinitionId!.Value)], ct);
                var request = new TransportationKitRequest(order.Id, order.OrganizationId, order.DepartmentId,
                    location.Id, JsonSerializer.Serialize(location.ToDto(), Json), actorId, DateTime.UtcNow, phase.Id, phase.SampleCount);
                foreach (var allocation in supply.Supply.Recommendation.Containers)
                {
                    var definition = definitions.Single(d => d.Id == allocation.ContainerDefinitionId);
                    request.Lines.Add(new(request.Id, definition.Id, SampleShippingContainerCatalogService.Snapshot(definition), allocation.Quantity));
                }
                db.TransportationKitRequests.Add(request);
                AddEvent(request, actorId, "Created", $"Customer requested transportation kits for {phase.Name} ({phase.SampleCount} samples).");
                await NotifyFulfillmentAsync(request, order.OrderNumber, ct);
            }
            order.MarkUpdated(DateTime.UtcNow, actorId);
            db.OrderStatusEvents.Add(new(order.OrganizationId, OrderWorkflowTypes.LabService, order.Id, phase.Id,
                order.Status.ToString(), order.Status.ToString(),
                $"Transportation kit supply requested for {phase.Name}; received stock allocated only to this phase.", null, actorId, DateTime.UtcNow));
            await db.SaveChangesAsync(ct);
        }
    }

    private static string? PhaseBlock(LabJobPhase? phase, TransportationKitRequest? request = null) => phase is null ? null
        : phase.CancelledAtUtc.HasValue || phase.SupersededAtUtc.HasValue ? "This phase is cancelled or superseded. Review its kit request."
        : request?.PhaseSampleCount.HasValue == true && request.PhaseSampleCount != phase.SampleCount ? "The phase sample count changed. Review the kit request before dispatch." : null;

    private async Task<LabJobPhase> ShipmentPhaseAsync(SampleShipment shipment, LabServiceOrder job, CancellationToken ct)
    {
        var specimenIds = shipment.Items.Select(i => i.SubmittedSpecimenId).ToArray();
        var phases = await db.LabSamples.AsNoTracking().Where(s => s.LabServiceOrderId == job.Id && specimenIds.Contains(s.Id))
            .Select(s => s.LabJobPhaseId).Distinct().ToArrayAsync(ct);
        if (phases.Length != 1 || !phases[0].HasValue)
            throw Conflict("A transportation kit must cover samples from exactly one phase. Review this shipment.");
        return job.Phases.Single(p => p.Id == phases[0]);
    }
}
