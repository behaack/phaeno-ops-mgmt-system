namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task RejectedShipmentTubeNeedsNoStorageAndBatchAcceptancePreservesExceptionsAtomically()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(3);
        var admin = scope.CreatePlatformWorkflowController();
        var customer = scope.CreateCustomerWorkflowController();
        var lab = scope.CreateLabController();
        var codes = Enumerable.Range(1, 3).Select(i => $"BATCH-{scope.Suffix}-{i}").ToArray();
        await admin.CreateReturnKit(fixture.Shipment.Id, new CreateSampleReturnKitRequest(3,
            "Test supplier", "Test tube", null, "Test shipper", "Test product"), default);
        scope.ClearTrackedState();
        var kit = await scope.DbContext.SampleReturnKits.AsNoTracking().SingleAsync(k => k.SampleShipmentId == fixture.Shipment.Id);
        var registered = await admin.RegisterTubes(kit.Id, new RegisterSampleTubesRequest(codes, kit.Version), default);
        scope.ClearTrackedState();
        var shipment = await admin.FulfillReturnKit(kit.Id, new FulfillSampleReturnKitRequest(
            "Test carrier", "TEST-TRACKING", DateTime.UtcNow, registered.ReturnKit!.Version), default);
        scope.ClearTrackedState();
        for (var i = 0; i < codes.Length; i++)
        {
            var row = shipment.Crosswalk.OrderBy(r => r.TubeOrdinal).ElementAt(i);
            shipment = await customer.AssignTube(fixture.Shipment.Id, fixture.Item.Id,
                new AssignSampleTubeRequest(codes[i], null, row.Version, row.TubeSlotId), default);
            scope.ClearTrackedState();
        }
        shipment = await customer.IssuePacket(fixture.Shipment.Id, new(shipment.Version, null), default);
        var packet = shipment.CurrentPacket!;
        scope.ClearTrackedState();
        await lab.ReceiveShipment(new LabShipmentReceiptRequest(packet.Barcode), default);
        scope.ClearTrackedState();
        var rejected = await lab.AccessionShipmentTube(fixture.WorkOrder.Id, fixture.Shipment.Id,
            new ShipmentTubeAccessionRequest(packet.Barcode, codes[0], null, "Rejected", "damaged_container", "Destroyed on arrival"), default);
        scope.ClearTrackedState();
        var receipt = Assert.Single(rejected.Containers);
        Assert.Null(receipt.Location);
        Assert.Null(receipt.Quantity);
        Assert.Equal("Rejected", receipt.Status);
        Assert.Equal("Rejected", receipt.IntakeDisposition);
        Assert.NotNull(receipt.ExternalBarcodeReferenceId);
        var registeredRejection = await scope.DbContext.RegisteredSampleTubes.AsNoTracking().SingleAsync(t => t.SupplierBarcode == codes[0]);
        Assert.NotNull(registeredRejection.ReceivedAt);
        Assert.NotNull(registeredRejection.AccessionedAt);
        var request = new AcceptRemainingTubesRequest(Guid.NewGuid(), packet.Barcode, rejected.WorkOrder.Version, true,
            [new(codes[1], "REAL-BOX-1"), new(codes[2], "REAL-BOX-2")]);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AcceptRemainingTubes(fixture.WorkOrder.Id, fixture.Shipment.Id,
            request with { InspectionConfirmed = false }, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AcceptRemainingTubes(fixture.WorkOrder.Id, fixture.Shipment.Id,
            request with { Tubes = [new(codes[1], "REAL-BOX-1"), new(codes[0], "FAKE")] }, default));
        scope.ClearTrackedState();
        Assert.Equal(1, await scope.DbContext.LabContainers.CountAsync(t => t.LabWorkOrderId == fixture.WorkOrder.Id));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AcceptRemainingTubes(fixture.WorkOrder.Id, fixture.Shipment.Id,
            request with { Tubes = [new(codes[1], "REAL-BOX-1"), new(codes[2], " ")] }, default));
        scope.ClearTrackedState();
        Assert.Equal(1, await scope.DbContext.LabContainers.CountAsync(t => t.LabWorkOrderId == fixture.WorkOrder.Id));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AcceptRemainingTubes(fixture.WorkOrder.Id, fixture.Shipment.Id,
            request with { WorkOrderVersion = request.WorkOrderVersion - 1 }, default));
        scope.ClearTrackedState();
        var accepted = await lab.AcceptRemainingTubes(fixture.WorkOrder.Id, fixture.Shipment.Id, request, default);
        scope.ClearTrackedState();
        var replay = await lab.AcceptRemainingTubes(fixture.WorkOrder.Id, fixture.Shipment.Id, request, default);
        Assert.Equal(3, replay.Containers.Count);
        Assert.Equal(2, replay.Containers.Count(t => t.IntakeDisposition == "Accepted"));
        Assert.Null(replay.Containers.Single(t => t.Barcode == codes[0]).Location);
        Assert.Equal(accepted.WorkOrder.Version, replay.WorkOrder.Version);
        Assert.Equal(1, await scope.DbContext.LabWorkEvents.CountAsync(e => e.LabWorkOrderId == fixture.WorkOrder.Id && e.EventCode == "TubeBatchAccepted"));
        Assert.Equal(3, await scope.DbContext.LabWorkEvents.CountAsync(e => e.LabWorkOrderId == fixture.WorkOrder.Id && e.EventCode == "TubeIntakeReviewed"));
        Assert.DoesNotContain(await lab.ShipmentQueue(default, received: true), s => s.Id == fixture.Shipment.Id);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AcceptRemainingTubes(fixture.WorkOrder.Id, fixture.Shipment.Id,
            request with { Tubes = [new(codes[1], "DIFFERENT-BOX")] }, default));
    }
}
