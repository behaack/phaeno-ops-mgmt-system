namespace PhaenoPortal.Test;

using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging.Abstractions;
using PhaenoPortal.App.Features.FileManagement.Services;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task LocationInventoryEffectiveCancellationReleasesOnlyUnusedReservationsAndPreservesFulfillment()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var origin = await scope.CreateTransportationShipmentAsync(8);
        var consuming = await scope.CreateTransportationShipmentAsync(1, origin);
        var size = await scope.CreateContainerAsync(origin, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var request = await scope.KitCustomer().Create(origin.Shipment.Id, new(origin.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var kit = await scope.ReadyTransportationKitAsync(size);
        var dispatched = await scope.KitStaff().Dispatch(request.Id, new(request.Version, [kit.Id], "Carrier", "PRESERVE-FULFILLMENT", DateTime.UtcNow), default);
        await scope.KitCustomer().Receive(request.Id, new(dispatched.Request.Version, [kit.Id]), default);
        kit = await scope.StockController().Read(kit.Id, default);
        var receipt = kit.CustomerReceivedAt; var fulfillment = kit.FulfilledAt;
        var prepared = Assert.Single(await scope.PackingController().Confirm(consuming.Shipment.Id,
            new(consuming.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default));
        var pending = await scope.StartInventoryCancellationAsync(consuming.Shipment.AuthorizationSourceId);
        Assert.Equal(prepared.Id, (await scope.StockController().Read(kit.Id, default)).ReservedSampleShipmentId);
        await scope.InventoryCancellationStaff().DecideCancellation(consuming.Shipment.AuthorizationSourceId, pending.Id,
            new(pending.Version, "Declined", "Continue this work"), default);
        scope.ClearTrackedState();
        Assert.Equal(prepared.Id, (await scope.StockController().Read(kit.Id, default)).ReservedSampleShipmentId);
        pending = await scope.StartInventoryCancellationAsync(consuming.Shipment.AuthorizationSourceId);
        await scope.InventoryCancellationStaff().DecideCancellation(consuming.Shipment.AuthorizationSourceId, pending.Id,
            new(pending.Version, "Approved", "Unused reservation is released"), default);
        scope.ClearTrackedState();
        kit = await scope.StockController().Read(kit.Id, default);
        Assert.Equal("Available", kit.Status); Assert.Null(kit.ReservedSampleShipmentId);
        Assert.Equal(receipt, kit.CustomerReceivedAt); Assert.Equal(fulfillment, kit.FulfilledAt);
        Assert.Equal(origin.Shipment.AuthorizationSourceId, kit.OriginatingJobId);
        Assert.Equal("Received", (await scope.KitCustomer().Read(request.Id, default)).Status);
        var subsequent = await scope.CreateTransportationShipmentAsync(1, origin);
        var next = Assert.Single(await scope.PackingController().Confirm(subsequent.Shipment.Id,
            new(subsequent.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default));
        var row = Assert.Single(next.Crosswalk);
        await scope.CreateCustomerWorkflowController().AssignTube(next.Id, row.ShipmentItemId, new(kit.Tubes[0].SupplierBarcode, null, row.Version, row.TubeSlotId), default);
        scope.ClearTrackedState();
        pending = await scope.StartInventoryCancellationAsync(subsequent.Shipment.AuthorizationSourceId);
        await scope.InventoryCancellationStaff().DecideCancellation(subsequent.Shipment.AuthorizationSourceId, pending.Id,
            new(pending.Version, "Approved", "Preserve the used container's lineage"), default);
        scope.ClearTrackedState();
        kit = await scope.StockController().Read(kit.Id, default);
        Assert.Equal("InUse", kit.Status); Assert.Equal(next.Id, kit.BoundSampleShipmentId);
        Assert.Equal(receipt, kit.CustomerReceivedAt); Assert.Equal(fulfillment, kit.FulfilledAt);
        Assert.Equal(1, await scope.DbContext.OrderNotifications.CountAsync(item => item.WorkflowId == request.Id && item.EventType == "transportation-kits-dispatched"));
    }

    [PostgreSqlReferenceFact]
    public async Task LocationInventoryReceiptSurvivesOriginCancellationAndReservesForAnotherJob()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var origin = await scope.CreateTransportationShipmentAsync(18);
        var consuming = await scope.CreateTransportationShipmentAsync(8, origin);
        var size = await scope.CreateContainerAsync(origin, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var request = await scope.KitCustomer().Create(origin.Shipment.Id, new(origin.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var kit = await scope.ReadyTransportationKitAsync(size);
        kit = await scope.StockController().Dispatch(kit.Id, new(null, kit.Version, "Carrier", "LOCATION-STOCK", DateTime.UtcNow, location.Id, request.Id), default);
        Assert.Equal("OnTheWay", kit.Status);
        var job = await scope.DbContext.LabServiceOrders.SingleAsync(item => item.Id == origin.Shipment.AuthorizationSourceId);
        job.RequestCancellation(); job.ResolveCancellation(true, "Origin no longer needed", null);
        await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        Assert.Equal(request.Id, (await scope.KitCustomer().Read(request.Id, default)).Id);
        var received = await scope.InventoryCustomer().Receive(location.Id, new([new(kit.Id, kit.Version)]), default);
        Assert.Equal("Received", Assert.Single(received.Requests).Status);
        Assert.Equal("Available", Assert.Single(received.Kits).Status);
        var replay = await scope.InventoryCustomer().Receive(location.Id, new([new(kit.Id, kit.Version)]), default);
        Assert.Equal(Assert.Single(received.Kits).Version, Assert.Single(replay.Kits).Version);
        var context = await scope.PackingController().Read(consuming.Shipment.Id, default, location.Id);
        Assert.True(context.CanPack);
        var current = Assert.Single(context.AvailableKits!);
        var packed = Assert.Single(await scope.PackingController().Confirm(consuming.Shipment.Id,
            new(consuming.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, current.Version)]), default));
        Assert.Equal(location.Id, packed.DepartureDeliveryLocationId);
        Assert.Equal("Assigned", packed.AssignedContainer!.Status);
        Assert.Equal(origin.Shipment.AuthorizationSourceId, packed.AssignedContainer.OriginatingJobId);
        Assert.Equal(consuming.Shipment.AuthorizationSourceId, packed.AssignedContainer.AssignedJobId);
        Assert.Null(packed.AssignedContainer.BoundShipmentId);
        Assert.Empty((await scope.PackingController().Read(origin.Shipment.Id, default, location.Id)).AvailableKits!);
        Assert.Equal(1, await scope.DbContext.OrderStatusEvents.CountAsync(item => item.WorkflowId == request.Id && item.ToStatus == "CustomerReceived"));
    }

    [PostgreSqlReferenceFact]
    public async Task LocationInventoryConcurrentJobsClaimOneContainerExactlyOnce()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var firstJob = await scope.CreateTransportationShipmentAsync(8);
        var secondJob = await scope.CreateTransportationShipmentAsync(8, firstJob);
        var size = await scope.CreateContainerAsync(firstJob, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var kit = await scope.ReceivedLocationKitAsync(size, location);
        await using var first = scope.CreateAdditionalContext();
        await using var second = scope.CreateAdditionalContext();
        var results = await Task.WhenAll(
            CaptureAsync(() => scope.PackingController(dbOverride: first).Confirm(firstJob.Shipment.Id,
                new(firstJob.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default)),
            CaptureAsync(() => scope.PackingController(dbOverride: second).Confirm(secondJob.Shipment.Id,
                new(secondJob.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default)));
        Assert.Single(results, item => item is null);
        Assert.IsType<OrderManagementException>(Assert.Single(results, item => item is not null));
        scope.ClearTrackedState();
        var persisted = await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == kit.Id);
        Assert.NotNull(persisted.ReservedSampleShipmentId);
        Assert.Null(persisted.BoundSampleShipmentId);
        Assert.Equal(1, await scope.DbContext.SampleShipments.CountAsync(item => item.Id == persisted.ReservedSampleShipmentId));
        var jobIds = new[] { firstJob.Shipment.AuthorizationSourceId, secondJob.Shipment.AuthorizationSourceId };
        Assert.Equal(16, await scope.DbContext.SampleShipmentTubeSlots.CountAsync(slot => scope.DbContext.SampleShipmentItems.Any(item => item.Id == slot.SampleShipmentItemId
            && scope.DbContext.SampleShipments.Any(shipment => shipment.Id == item.SampleShipmentId && jobIds.Contains(shipment.AuthorizationSourceId)))));
    }

    [PostgreSqlReferenceFact]
    public async Task LocationInventoryResetReleasesReservationButFirstTubeScanLocksItAndFreezesBarcode()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(1);
        var item = await scope.DbContext.SampleShipmentItems.SingleAsync(value => value.Id == fixture.Item.Id);
        scope.DbContext.Entry(item).Property(value => value.Quantity).CurrentValue = 20;
        scope.DbContext.Entry(item).Property(value => value.QuantityUnit).CurrentValue = "uL";
        await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var size = await scope.CreateContainerAsync(fixture, 5);
        var location = await scope.CreateTransportationLocationAsync();
        var kit = await scope.ReceivedLocationKitAsync(size, location);
        var wrongKit = await scope.ReceivedLocationKitAsync(size, location);
        var prepared = Assert.Single(await scope.PackingController().Confirm(fixture.Shipment.Id,
            new(fixture.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default));
        var review = await scope.PackingController().ReadReset(prepared.Id, default);
        Assert.True(review.CanReset);
        var pool = await scope.PackingController().Reset(prepared.Id, new(review.Shipments), default);
        scope.ClearTrackedState();
        kit = await scope.StockController().Read(kit.Id, default);
        Assert.Equal("Available", kit.Status);
        Assert.Equal("Cancelled", (await scope.CreateCustomerWorkflowController().Shipment(prepared.Id, default)).Status);
        var replacement = Assert.Single(await scope.PackingController().Confirm(pool.Id,
            new(pool.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default));
        var row = Assert.Single(replacement.Crosswalk);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateCustomerWorkflowController().AssignTube(replacement.Id, row.ShipmentItemId,
            new(wrongKit.Tubes[0].SupplierBarcode, null, row.Version, row.TubeSlotId), default));
        scope.ClearTrackedState();
        Assert.Null((await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(value => value.Id == kit.Id)).BoundSampleShipmentId);
        var scanned = await scope.CreateCustomerWorkflowController().AssignTube(replacement.Id, row.ShipmentItemId,
            new(kit.Tubes[0].SupplierBarcode, null, row.Version, row.TubeSlotId), default);
        Assert.Equal("InUse", scanned.AssignedContainer!.Status);
        var blocked = await scope.PackingController().ReadReset(replacement.Id, default);
        Assert.False(blocked.CanReset);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Reset(replacement.Id, new(blocked.Shipments), default));
        scope.ClearTrackedState();
        var packet = await scope.CreateCustomerWorkflowController().IssuePacket(replacement.Id, new(scanned.Version, null), default);
        var frozen = await scope.CreateCustomerWorkflowController().Packet(replacement.Id, default);
        using var json = System.Text.Json.JsonDocument.Parse(frozen.ManifestSnapshotJson);
        Assert.Equal(kit.KitNumber, json.RootElement.GetProperty("containerKit").GetProperty("barcode").GetString());
        Assert.Equal(kit.Id, json.RootElement.GetProperty("containerKit").GetProperty("id").GetGuid());
        Assert.NotNull(packet.CurrentPacket);
    }

    [PostgreSqlReferenceFact]
    public async Task LocationInventoryEnforcesReceiptTenantDepartmentLocationAndMemberBoundaries()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(8);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var wrong = new CustomerDeliveryLocation(location.OrganizationId, location.DepartmentId, "Other", "Recipient", "2 Way", null, "City", "WA", "98101", "US", null, null, false);
        scope.DbContext.CustomerDeliveryLocations.Add(wrong); await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var kit = await scope.ReadyTransportationKitAsync(size);
        kit = await scope.StockController().Dispatch(kit.Id, new(null, kit.Version, "Carrier", "IN-TRANSIT", DateTime.UtcNow, location.Id), default);
        Assert.False((await scope.PackingController().Read(fixture.Shipment.Id, default, location.Id)).CanPack);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Confirm(fixture.Shipment.Id,
            new(fixture.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default));
        scope.ClearTrackedState();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.InventoryCustomer(otherTenant: true).Read(location.Id, default))).StatusCode);
        await scope.InventoryCustomer().Receive(location.Id, new([new(kit.Id, kit.Version)]), default);
        Assert.Empty((await scope.PackingController().Read(fixture.Shipment.Id, default, wrong.Id)).AvailableKits!);
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(value => value.UserId == scope.CustomerUser.Id && value.OrganizationId == scope.CustomerOrganization.Id);
        membership.SetOrganizationAdmin(false);
        scope.DbContext.OrganizationDepartmentMemberships.Add(new OrganizationDepartmentMembership(membership.Id, location.DepartmentId));
        await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var read = await scope.InventoryCustomer().Read(location.Id, default);
        Assert.False(read.CanManageInventory); Assert.Single(read.Kits);
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.InventoryCustomer().Receive(location.Id,
            new([new(kit.Id, kit.Version)]), default))).StatusCode);
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Confirm(fixture.Shipment.Id,
            new(fixture.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default))).StatusCode);
    }

    [PostgreSqlReferenceFact]
    public async Task LocationInventoryOrdinarySuccessorPreservesExistingPhysicalStockButWithdrawalBlocksIt()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(8);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var request = await scope.KitCustomer().Create(fixture.Shipment.Id, new(fixture.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var kit = await scope.ReadyTransportationKitAsync(size);
        await scope.ContainerCatalog().ReviseAsync(size.Id, new(size.Version, "Updated wording", 20, DateTime.UtcNow.AddMinutes(-1), size.Compatibilities, IsActive: true), default);
        scope.ClearTrackedState();
        var dispatched = await scope.KitStaff().Dispatch(request.Id, new(request.Version, [kit.Id], "Carrier", "OLD-REVISION", DateTime.UtcNow), default);
        await scope.KitCustomer().Receive(request.Id, new(dispatched.Request.Version, [kit.Id]), default);
        var packing = await scope.PackingController().Read(fixture.Shipment.Id, default, location.Id);
        Assert.Equal(size.Id, Assert.Single(packing.ContainerTypes).Id);
        Assert.Single(packing.AvailableKits!);
        var original = await scope.ContainerCatalog().ReadAsync(size.Id, default);
        await scope.ContainerCatalog().DeactivateAsync(size.Id, original.Version, default);
        scope.ClearTrackedState();
        var blocked = await scope.PackingController().Read(fixture.Shipment.Id, default, location.Id);
        Assert.False(blocked.CanPack); Assert.Empty(blocked.AvailableKits!);
        Assert.Null((await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(value => value.Id == kit.Id)).ReservedSampleShipmentId);
    }

    private sealed partial class ShippingTestScope
    {
        public PlatformLabServiceOrdersController InventoryCancellationStaff() => new(DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(platformIdentity)), new OrderIdempotencyService(DbContext),
            null!, null!, Options.Create(new OrderManagementOptions()), Options.Create(new PSeqOrderToCashOptions()),
            new InternalLabOperationsProvider(DbContext), new ReleasedDeliverableRetentionSnapshotService(DbContext),
            NullLogger<PlatformLabServiceOrdersController>.Instance)
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        public async Task<(Guid Id, long Version)> StartInventoryCancellationAsync(Guid jobId)
        {
            ClearTrackedState();
            var job = await DbContext.LabServiceOrders.SingleAsync(item => item.Id == jobId);
            job.RequestCancellation();
            var request = new OrderCancellationRequest(job.OrganizationId, OrderWorkflowTypes.LabService, jobId, CustomerUser.Id, "Review cancellation", "{}");
            DbContext.OrderCancellationRequests.Add(request); await DbContext.SaveChangesAsync();
            var version = job.Version; ClearTrackedState(); return (request.Id, version);
        }
        public TransportationKitInventoryController InventoryCustomer(bool otherTenant = false, PSeqOperationsDbContext? dbOverride = null)
        {
            var db = dbOverride ?? DbContext;
            var http = new DefaultHttpContext(); http.Request.Headers["X-Organization-Id"] = (otherTenant ? OtherCustomerOrganization.Id : CustomerOrganization.Id).ToString();
            http.Request.Headers["Idempotency-Key"] = Guid.NewGuid().ToString("N");
            return new(new OrderRequestContext(db, new FixedIdentityContext(otherTenant ? otherCustomerIdentity : customerIdentity)), new OrderIdempotencyService(db),
                new TransportationKitRequestService(db, new SampleShippingContainerCatalogService(db), Options.Create(new BootstrapOptions { PhaenoOrganizationName = PlatformOrganization.Name })))
                { ControllerContext = new() { HttpContext = http } };
        }
        public async Task<StockKitDto> ReceivedLocationKitAsync(SampleShippingContainerDefinitionDto size, CustomerDeliveryLocation location)
        {
            var kit = await ReadyTransportationKitAsync(size);
            kit = await StockController().Dispatch(kit.Id, new(null, kit.Version, "Carrier", $"STOCK-{kit.Id:N}", DateTime.UtcNow, location.Id), default);
            await InventoryCustomer().Receive(location.Id, new([new(kit.Id, kit.Version)]), default);
            ClearTrackedState(); return await StockController().Read(kit.Id, default);
        }
    }
}
