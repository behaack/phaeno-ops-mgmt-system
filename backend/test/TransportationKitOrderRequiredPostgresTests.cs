namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task TransportationKitDirectAndRequestDispatchSynchronizeOnceUnderConcurrentRequests()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var request = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var kit = await scope.ReadyTransportationKitAsync(size);
        var when = DateTime.UtcNow;
        var body = new DispatchStockKitRequest(fixture.Shipment.Id, kit.Version, "Carrier", "SHARED-DISPATCH", when);
        await using var first = scope.CreateAdditionalContext();
        await using var second = scope.CreateAdditionalContext();
        var outcomes = await Task.WhenAll(
            CaptureAsync(() => scope.StockController(first).Dispatch(kit.Id, body, default)),
            CaptureAsync(() => scope.KitStaff(dbOverride: second).Dispatch(request.Id,
                new(request.Version, [kit.Id], body.OutboundCarrier, body.OutboundTrackingNumber, when), default)));
        Assert.Contains(outcomes, item => item is null);
        Assert.All(outcomes.Where(item => item is not null), item => Assert.IsType<OrderManagementException>(item));
        scope.ClearTrackedState();
        var replay = await scope.StockController().Dispatch(kit.Id, body, default);
        var detail = await scope.KitStaff().Read(request.Id, default);
        Assert.Equal("Dispatched", detail.Request.Status);
        Assert.Equal(1, Assert.Single(detail.Request.Lines).DispatchedQuantity);
        Assert.Equal(kit.Id, Assert.Single(detail.Request.Kits).StockKitId);
        Assert.Null(replay.BoundSampleShipmentId);
        Assert.Equal(1, await scope.DbContext.OrderNotifications.CountAsync(item => item.WorkflowId == request.Id && item.EventType == "transportation-kits-dispatched"));
        Assert.Equal(1, await scope.DbContext.OrderStatusEvents.CountAsync(item => item.WorkflowId == request.Id && item.ToStatus == "Dispatched"));
        var extra = await scope.ReadyTransportationKitAsync(size);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.StockController().Dispatch(extra.Id,
            body with { Version = extra.Version }, default));
        scope.ClearTrackedState();
        Assert.Null((await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == extra.Id)).FulfilledAt);
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitRecordedDispatchReconcilesWithoutRewritingFactsOrDuplicatingNotices()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var request = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var ready = await scope.ReadyTransportationKitAsync(size);
        var original = await scope.DbContext.SampleShippingStockKits.Include(item => item.Tubes).SingleAsync(item => item.Id == ready.Id);
        original.Dispatch(fixture.Shipment, "Saved carrier", "SAVED-TRACK", DateTime.UtcNow);
        await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        original = await scope.DbContext.SampleShippingStockKits.AsNoTracking().Include(item => item.Tubes).SingleAsync(item => item.Id == ready.Id);
        var body = new DispatchStockKitRequest(fixture.Shipment.Id, original.Version, original.OutboundCarrier!, original.OutboundTrackingNumber!, original.FulfilledAt!.Value);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.StockController().Dispatch(ready.Id,
            body with { OutboundTrackingNumber = "CHANGED" }, default));
        scope.ClearTrackedState();
        Assert.Null((await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == ready.Id)).TransportationKitRequestLineId);
        var reconciled = await scope.StockController().Dispatch(ready.Id, body, default);
        scope.ClearTrackedState();
        var replay = await scope.StockController().Dispatch(ready.Id, body, default);
        Assert.Equal(reconciled.Version, replay.Version);
        var saved = await scope.DbContext.SampleShippingStockKits.AsNoTracking().Include(item => item.Tubes).SingleAsync(item => item.Id == ready.Id);
        Assert.Equal(original.FulfilledAt, saved.FulfilledAt);
        Assert.Equal(original.OutboundCarrier, saved.OutboundCarrier);
        Assert.Equal(original.OutboundTrackingNumber, saved.OutboundTrackingNumber);
        Assert.Equal(original.AuthorizationSourceId, saved.AuthorizationSourceId);
        Assert.Equal(original.Tubes.OrderBy(item => item.Id).Select(item => (item.Id, item.SupplierBarcode)), saved.Tubes.OrderBy(item => item.Id).Select(item => (item.Id, item.SupplierBarcode)));
        Assert.Equal(location.Id, saved.CustomerDeliveryLocationId);
        Assert.Equal(Assert.Single(request.Lines).Id, saved.TransportationKitRequestLineId);
        Assert.Null(saved.CustomerReceivedAt); Assert.Null(saved.BoundSampleShipmentId);
        var detail = await scope.KitStaff().Read(request.Id, default);
        Assert.Equal("Dispatched", detail.Request.Status);
        Assert.Equal(0, Assert.Single(detail.Request.Lines).ReceivedQuantity);
        Assert.Equal(1, await scope.DbContext.OrderNotifications.CountAsync(item => item.WorkflowId == request.Id && item.EventType == "transportation-kits-dispatched"));
        Assert.Equal(1, await scope.DbContext.OrderStatusEvents.CountAsync(item => item.WorkflowId == request.Id && item.ToStatus == "Dispatched"));
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitMissingOrCancelledOrderBlocksUnboundPreparationWithoutBlockingOrdering()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var shipment = await scope.DbContext.SampleShipments.SingleAsync(item => item.Id == fixture.Shipment.Id);
        shipment.SelectContainer(size.Id, SampleShippingContainerCatalogService.Snapshot(size));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var initial = await scope.DbContext.SampleShipments.AsNoTracking().SingleAsync(item => item.Id == shipment.Id);
        var slot = fixture.Item.TubeSlots.First();
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var supply = await scope.KitCustomer().Supply(shipment.Id, location.Id, default);
            Assert.True(supply.CanRequestKits);
            Assert.False(supply.CanPrepareSamples);
            Assert.Equal(size.Id, Assert.Single(supply.Recommendation.Containers).ContainerDefinitionId);
            Assert.Contains("Order transportation kits", supply.PreparationBlockedReason);
            Assert.False((await scope.PackingController().Read(shipment.Id, default)).CanPack);
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Preview(shipment.Id, new(), default));
            scope.ClearTrackedState();
            Assert.Equal("transportation_kit_order_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
                scope.PackingController().Confirm(shipment.Id, new(initial.Version, [new(size.Id, 1)]), default))).ErrorCode);
            scope.ClearTrackedState();
            Assert.Equal("transportation_kit_order_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
                scope.CreateCustomerWorkflowController().AssignTube(shipment.Id, fixture.Item.Id,
                    new("TEST-UNORDERED-TUBE", null, slot.Version, slot.Id), default))).ErrorCode);
            scope.ClearTrackedState();
            Assert.Equal("transportation_kit_order_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
                scope.CreateCustomerWorkflowController().IssuePacket(shipment.Id, new(initial.Version, null), default))).ErrorCode);
            scope.ClearTrackedState();
            Assert.Equal("transportation_kit_order_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
                scope.CreateCustomerWorkflowController().RecordShipment(shipment.Id, new("Carrier", "TRACK", DateTime.UtcNow, initial.Version), default))).ErrorCode);
            scope.ClearTrackedState();
            var unchanged = await scope.DbContext.SampleShipments.AsNoTracking().SingleAsync(item => item.Id == shipment.Id);
            Assert.Equal(initial.Version, unchanged.Version);
            Assert.Equal(initial.Status, unchanged.Status);
            Assert.Equal(18, await scope.DbContext.SampleShipmentTubeSlots.CountAsync(item => item.SampleShipmentItemId == fixture.Item.Id));
            Assert.False(await scope.DbContext.SampleReturnKits.AnyAsync(item => item.SampleShipmentId == shipment.Id));
            Assert.False(await scope.DbContext.SampleTubeAssignmentEvents.AnyAsync(item => item.SampleShipmentId == shipment.Id));
            Assert.False(await scope.DbContext.SampleShippingPacketRevisions.AnyAsync(item => item.SampleShipmentId == shipment.Id));
            if (attempt == 0)
            {
                var request = await scope.KitCustomer().Create(shipment.Id,
                    new(initial.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
                await scope.KitCustomer().Cancel(request.Id, new(request.Version, "Reference cancellation"), default);
                scope.ClearTrackedState();
            }
        }
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitReceivedOrderCannotBeBypassedWithUnorderedStockOrLegacyDispatch()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var shipment = await scope.DbContext.SampleShipments.SingleAsync(item => item.Id == fixture.Shipment.Id);
        shipment.SelectContainer(size.Id, SampleShippingContainerCatalogService.Snapshot(size));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var unlinked = await scope.ReadyTransportationKitAsync(size);
        Assert.Equal("transportation_kit_order_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.StockController().Dispatch(unlinked.Id, new(shipment.Id, unlinked.Version, "Carrier", "LEGACY", DateTime.UtcNow), default))).ErrorCode);
        scope.ClearTrackedState();
        Assert.Equal("transportation_kit_order_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.CreatePlatformWorkflowController().CreateReturnKit(shipment.Id,
                new(18, "Supplier", "T-1", null, "Shipper", "B-1"), default))).ErrorCode);
        scope.ClearTrackedState();
        var legacyStock = await scope.DbContext.SampleShippingStockKits.Include(item => item.Tubes).SingleAsync(item => item.Id == unlinked.Id);
        Assert.Null(legacyStock.FulfilledAt);
        Assert.Null(legacyStock.AuthorizationSourceId);
        Assert.False(await scope.DbContext.SampleReturnKits.AnyAsync(item => item.SampleShipmentId == shipment.Id));
        // Represent stock dispatched before the order-only rule, without inventing a request link.
        legacyStock.Dispatch(shipment, "Old carrier", "OLD-STOCK", DateTime.UtcNow);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var supply = await scope.KitCustomer().Supply(shipment.Id, location.Id, default);
        var request = await scope.KitCustomer().Create(shipment.Id,
            new(supply.ShipmentVersion, location.Id, location.Version, [new(size.Id, 1)]), default);
        var ordered = await scope.ReadyTransportationKitAsync(size);
        var dispatched = await scope.KitStaff().Dispatch(request.Id, new(request.Version, [ordered.Id], "Carrier", "ORDERED", DateTime.UtcNow), default);
        scope.ClearTrackedState();
        await scope.KitCustomer().Receive(request.Id, new(dispatched.Request.Version, [ordered.Id]), default);
        scope.ClearTrackedState();
        Assert.True((await scope.KitCustomer().Supply(shipment.Id, location.Id, default)).CanPrepareSamples);
        var slot = fixture.Item.TubeSlots.First();
        Assert.Equal("transportation_kit_order_required", (await Assert.ThrowsAsync<OrderManagementException>(() =>
            scope.CreateCustomerWorkflowController().AssignTube(shipment.Id, fixture.Item.Id,
                new(unlinked.Tubes[0].SupplierBarcode, null, slot.Version, slot.Id), default))).ErrorCode);
        scope.ClearTrackedState();
        Assert.Null((await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == unlinked.Id)).BoundSampleShipmentId);
        Assert.False(await scope.DbContext.SampleReturnKits.AnyAsync(item => item.SampleShipmentId == shipment.Id));
        await scope.CreateCustomerWorkflowController().AssignTube(shipment.Id, fixture.Item.Id,
            new(ordered.Tubes[0].SupplierBarcode, null, slot.Version, slot.Id), default);
        scope.ClearTrackedState();
        Assert.Equal(shipment.Id, (await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == ordered.Id)).BoundSampleShipmentId);
        Assert.True((await scope.KitCustomer().Supply(shipment.Id, location.Id, default)).CanPrepareSamples);
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitOrderRulePreservesAlreadyBoundHistoricalCustomerShipment()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(1);
        var historicalItem = await scope.DbContext.SampleShipmentItems.SingleAsync(item => item.Id == fixture.Item.Id);
        scope.DbContext.Entry(historicalItem).Property(item => item.Quantity).CurrentValue = 20;
        scope.DbContext.Entry(historicalItem).Property(item => item.QuantityUnit).CurrentValue = "uL";
        var barcode = $"HISTORICAL-{scope.Suffix}";
        var kit = new SampleReturnKit($"HIST-{scope.Suffix}", fixture.Shipment.Id, scope.CustomerOrganization.Id,
            fixture.Shipment.AuthorizationSource, fixture.Shipment.AuthorizationSourceId,
            "Supplier", "T-1", null, "Shipper", "B-1", 1);
        kit.Tubes.Add(new(kit.Id, barcode)); kit.Fulfill("Historical carrier", "HISTORICAL", DateTime.UtcNow);
        scope.DbContext.SampleReturnKits.Add(kit);
        await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var slot = fixture.Item.TubeSlots.Single();
        await scope.CreateCustomerWorkflowController().AssignTube(fixture.Shipment.Id, fixture.Item.Id,
            new(barcode, null, slot.Version, slot.Id), default);
        scope.ClearTrackedState();
        var current = await scope.CreateCustomerWorkflowController().Shipment(fixture.Shipment.Id, default);
        var confirmed = await scope.CreateCustomerWorkflowController().IssuePacket(fixture.Shipment.Id, new(current.Version, null), default);
        scope.ClearTrackedState();
        var shipped = await scope.CreateCustomerWorkflowController().RecordShipment(fixture.Shipment.Id,
            new("Carrier", "HISTORICAL-RETURN", DateTime.UtcNow, confirmed.Version), default);
        Assert.Equal("Shipped", shipped.Status);
        Assert.False(await scope.DbContext.TransportationKitRequests.AnyAsync(item => item.LabServiceOrderId == fixture.Shipment.AuthorizationSourceId));
    }

    [PostgreSqlReferenceFact]
    public async Task TransportationKitOrderRuleRetainsPartnerTrialAndUnacceptedLegacyPreparationPolicies()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        Assert.True(await TransportationKitSupplyGuard.RequiresOrderedKitsAsync(scope.DbContext, fixture.Shipment, default));
        var organization = await scope.DbContext.Organizations.SingleAsync(item => item.Id == scope.CustomerOrganization.Id);
        organization.Update(organization.Name, OrganizationKind.Partner);
        await scope.DbContext.SaveChangesAsync();
        Assert.Null(await TransportationKitSupplyGuard.PreparationBlockAsync(scope.DbContext, fixture.Shipment, default));
        organization.Update(organization.Name, OrganizationKind.Customer);
        await scope.DbContext.SaveChangesAsync();
        var trial = new SampleShipment($"TRIAL-{scope.Suffix}", fixture.Shipment.OrganizationId, fixture.Shipment.DepartmentId,
            SampleShipmentAuthorizationSource.ProspectTrialProject, fixture.Shipment.AuthorizationSourceId,
            "Trial", "Trial", fixture.WorkOrder.Id, fixture.Destination.Id);
        Assert.Null(await TransportationKitSupplyGuard.PreparationBlockAsync(scope.DbContext, trial, default));
        var legacy = new SampleShipment($"LEGACY-{scope.Suffix}", fixture.Shipment.OrganizationId, fixture.Shipment.DepartmentId,
            SampleShipmentAuthorizationSource.CustomerLabServiceOrder, Guid.NewGuid(), "Legacy", "Legacy", fixture.WorkOrder.Id, fixture.Destination.Id);
        Assert.Null(await TransportationKitSupplyGuard.PreparationBlockAsync(scope.DbContext, legacy, default));
    }
}
