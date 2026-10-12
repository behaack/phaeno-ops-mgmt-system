namespace PhaenoPortal.App.Features.WorkAttention;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed partial class WorkAttentionReader
{
    private async Task<IReadOnlyList<WorkItem>> ReadExternalShippingAsync(CancellationToken token)
    {
        var organizationId = session.SelectedOrganization!.OrganizationId;
        var departmentId = session.SelectedDepartment!.DepartmentId;
        var orders = await db.LabServiceOrders.AsNoTracking().AsSplitQuery().Include(order => order.Phases).Include(order => order.Samples)
            .Where(order => order.OrganizationId == organizationId && order.DepartmentId == departmentId
                && !order.IsDiscarded && order.CommercialDraftJson == null && order.Status == LabServiceOrderStatus.PlacedAwaitingSamples).ToArrayAsync(token);
        if (orders.Length == 0) return [];
        var orderIds = orders.Select(order => order.Id).ToArray();
        var phaseIds = orders.SelectMany(order => order.Phases).Select(phase => phase.Id).ToArray();
        var shipments = (await db.SampleShipments.AsNoTracking().AsSplitQuery().Include(shipment => shipment.Items)
            .Where(shipment => shipment.OrganizationId == organizationId && shipment.DepartmentId == departmentId
                && shipment.AuthorizationSource == SampleShipmentAuthorizationSource.CustomerLabServiceOrder
                && orderIds.Contains(shipment.AuthorizationSourceId) && shipment.Status != SampleShipmentStatus.Cancelled && !shipment.IsPackingPool)
            .ToArrayAsync(token)).ToLookup(shipment => shipment.AuthorizationSourceId);
        var pendingCancellations = (await db.Set<LabPhaseCancellationRequest>().AsNoTracking()
            .Where(request => phaseIds.Contains(request.LabJobPhaseId) && request.Status == "Pending")
            .Select(request => request.LabJobPhaseId).ToArrayAsync(token)).ToHashSet();
        var requests = await db.TransportationKitRequests.AsNoTracking().AsSplitQuery().Include(request => request.Lines)
            .Where(request => request.OrganizationId == organizationId && request.DepartmentId == departmentId
                && orderIds.Contains(request.LabServiceOrderId) && request.Status != TransportationKitRequestStatus.Cancelled).ToArrayAsync(token);
        var requestsByOrder = requests.ToLookup(request => request.LabServiceOrderId);
        var selections = await db.LabSampleTubeKitSelections.AsNoTracking()
            .Where(selection => selection.OrganizationId == organizationId && selection.DepartmentId == departmentId
                && orderIds.Contains(selection.LabServiceOrderId)).ToArrayAsync(token);
        var selectionsByPhase = selections.ToLookup(selection => (selection.LabServiceOrderId, selection.LabJobPhaseId));
        var selectedKitIds = selections.Select(selection => selection.StockKitId).ToArray();
        var lineIds = requests.SelectMany(request => request.Lines).Select(line => line.Id).ToArray();
        var stock = await db.SampleShippingStockKits.AsNoTracking().AsSplitQuery().Include(kit => kit.Tubes)
            .Where(kit => kit.OrganizationId == organizationId && kit.DepartmentId == departmentId && !kit.WithdrawnAt.HasValue
                && (selectedKitIds.Contains(kit.Id) || kit.TransportationKitRequestLineId.HasValue && lineIds.Contains(kit.TransportationKitRequestLineId.Value)))
            .ToArrayAsync(token);
        var stockById = stock.ToDictionary(kit => kit.Id);
        var stockIds = stock.Select(kit => kit.Id).ToArray();
        var claimsByStock = (await db.LabSampleTubeKitSelections.AsNoTracking().Where(selection => selection.OrganizationId == organizationId
                && selection.DepartmentId == departmentId && stockIds.Contains(selection.StockKitId))
            .Select(selection => new { selection.StockKitId, selection.LabServiceOrderId, selection.LabJobPhaseId, selection.FinishedAt })
            .ToArrayAsync(token)).ToLookup(selection => selection.StockKitId);
        var stockByLine = stock.Where(kit => kit.TransportationKitRequestLineId.HasValue).ToLookup(kit => kit.TransportationKitRequestLineId!.Value);
        var pairsByPhase = (await db.LabSampleTubePairs.AsNoTracking().Where(pair => pair.OrganizationId == organizationId && pair.DepartmentId == departmentId
                && orderIds.Contains(pair.LabServiceOrderId)).Select(pair => new { pair.LabServiceOrderId, pair.LabJobPhaseId, pair.StockKitId })
            .ToArrayAsync(token)).ToLookup(pair => (pair.LabServiceOrderId, pair.LabJobPhaseId));
        var items = new List<WorkItem>();
        foreach (var order in orders)
        {
            var phaseId = LabPhaseShippingSequence.CurrentPhaseId(order, shipments[order.Id].ToArray());
            if (phaseId is null) continue;
            var phase = order.Phases.Single(phase => phase.Id == phaseId);
            var phaseRequests = requestsByOrder[order.Id].Where(request => request.LabJobPhaseId == phase.Id || request.LabJobPhaseId == null).ToArray();
            var dispatched = phaseRequests.SelectMany(request => request.Lines).SelectMany(line => stockByLine[line.Id])
                .Where(kit => kit.FulfilledAt.HasValue).ToArray();
            var phaseSelections = selectionsByPhase[(order.Id, phase.Id)].ToArray();
            var readySelected = phaseSelections.Where(selection => stockById.TryGetValue(selection.StockKitId, out var kit)
                && !kit.BoundSampleShipmentId.HasValue && !kit.ReservedSampleShipmentId.HasValue
                && TransportationKitInventory.IsReadyForSamplePreparation(kit, now)).ToArray();
            var readyDispatched = dispatched.Any(kit => !kit.BoundSampleShipmentId.HasValue && !kit.ReservedSampleShipmentId.HasValue
                && TransportationKitInventory.IsReadyForSamplePreparation(kit, now)
                && !claimsByStock[kit.Id].Any(selection => selection.LabServiceOrderId != order.Id || selection.LabJobPhaseId != phase.Id || selection.FinishedAt.HasValue));
            var phasePairs = pairsByPhase[(order.Id, phase.Id)].ToArray();
            var allPairsReady = phasePairs.Length >= phase.SampleCount && phasePairs.Length > 0
                && phasePairs.Select(pair => pair.StockKitId).Distinct().All(id => readySelected.Any(selection => selection.StockKitId == id));
            var canPrepare = readySelected.Any(selection => !selection.FinishedAt.HasValue) || readyDispatched || allPairsReady;
            var receive = dispatched.Any(kit => !kit.CustomerReceivedAt.HasValue);
            var waiting = !receive && !canPrepare && phaseRequests.Any(request => request.Status is TransportationKitRequestStatus.Pending or TransportationKitRequestStatus.PartiallyDispatched);
            var pendingCancellation = pendingCancellations.Contains(phase.Id);
            var blocked = TransportationKitRequestService.JobBlock(order) is not null || phase.SampleCount <= 0;
            var message = pendingCancellation ? "orders.phaseHold" : blocked ? "orders.shippingBlocked"
                : phase.PreparationCompletedAtUtc.HasValue ? "orders.sendSamples" : receive ? "orders.receiveKits"
                : canPrepare ? "orders.prepareSamples" : waiting ? "orders.waitKits" : "orders.requestKits";
            items.Add(new WorkItem { SourceId = phase.Id, TargetId = order.Id, SourceType = "PhaseShipping", Domain = "shipping", RecordLabel = order.OrderNumber,
                Destination = "/lab-services/", MessageKey = message,
                Kind = pendingCancellation || blocked || waiting && !phase.PreparationCompletedAtUtc.HasValue || !Caps.CanManageSampleShipping ? "waiting" : "action",
                CreatedAtUtc = phase.CreatedAt, Priority = 3 });
        }
        return items;
    }
}
