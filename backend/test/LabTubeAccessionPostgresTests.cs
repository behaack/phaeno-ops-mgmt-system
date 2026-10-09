namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
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
        Assert.Empty((await lab.AccessionedSamples(search: fixture.Item.CustomerSampleId)).Items);
        var pending = Assert.Single((await lab.AccessionedSamples(search: fixture.Item.CustomerSampleId, includePending: true, scope: "Active")).Items);
        Assert.Equal(fixture.Specimen.Id, pending.Id);
        Assert.Null(pending.AccessionNumber);
        Assert.False(pending.Historical);
        Assert.Empty((await lab.AccessionedSamples(search: fixture.Item.CustomerSampleId, includePending: true, scope: "Historical")).Items);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AccessionedSamples(includePending: true, scope: "Unknown"));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AccessionedSamples(includePending: true, processingStatus: "999"));
        var codes = Enumerable.Range(1, 3).Select(i => $"BATCH-{scope.Suffix}-{i}").ToArray();
        await admin.CreateReturnKit(fixture.Shipment.Id, await scope.CatalogReturnKitRequestAsync(new CreateSampleReturnKitRequest(3,
            "Test supplier", "Test tube", null, "Test shipper", "Test product")), default);
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
                new AssignSampleTubeRequest(codes[i], null, row.Version, row.TubeSlotId, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default);
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
        var directory = await lab.AccessionedSamples(search: codes[1].ToLowerInvariant(), intakeStatus: "Accepted", page: int.MaxValue, pageSize: 1);
        Assert.Equal(1, directory.Page);
        Assert.Equal(1, directory.TotalCount);
        var sample = Assert.Single(directory.Items);
        Assert.Equal(fixture.Specimen.Id, sample.Id);
        Assert.Equal(fixture.Item.CustomerSampleId, sample.CustomerSampleId);
        Assert.Equal("NotUsed", sample.UseStatus);
        Assert.All(sample.Tubes, tube => Assert.Equal("NotUsed", tube.UseStatus));
        Assert.Equal(3, sample.Tubes.Count);
        Assert.Null(sample.Tubes.Single(tube => tube.Barcode == codes[0]).Location);
        Assert.Equal("Rejected", sample.Tubes.Single(tube => tube.Barcode == codes[0]).IntakeDisposition);
        Assert.Equal("REAL-BOX-1", sample.Tubes.Single(tube => tube.Barcode == codes[1]).Location);
        Assert.Contains((await lab.AccessionedSamples(search: "real-box-2", intakeStatus: "Accepted")).Items, item => item.Id == fixture.Specimen.Id);
        Assert.Empty((await lab.AccessionedSamples(search: codes[0], intakeStatus: "Rejected")).Items);
        Assert.Empty((await lab.AccessionedSamples(search: "NO-ACCESSION-MATCH")).Items);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AccessionedSamples(intakeStatus: "4"));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AccessionedSamples(search: new string('x', 256)));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AccessionedSamples(useStatus: "Selected"));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.AcceptRemainingTubes(fixture.WorkOrder.Id, fixture.Shipment.Id,
            request with { Tubes = [new(codes[1], "DIFFERENT-BOX")] }, default));
        scope.ClearTrackedState();
        var scientificOrder = new LabServiceOrder(scope.CustomerOrganization.Id,
            scope.CustomerOrganization.Departments.Single(department => department.IsDefault).Id,
            OrderNumberGenerator.Lab(), "TEST ONLY sample use", null, 1, false, "Synthetic", "Frozen", "No hazards", "Ship cold");
        scientificOrder.Phases.Clear();
        scope.DbContext.Entry(scientificOrder).Property(order => order.Id).CurrentValue = fixture.WorkOrder.AuthorizationSourceId;
        var scientificPhase = new LabJobPhase(scientificOrder.Id, 1, "Phase 1", 1);
        scientificOrder.Phases.Add(scientificPhase);
        var scientificSample = new LabSample(scientificOrder.Id, "TEST-SAMPLE", "RNA", "Synthetic", 20, "uL", "Frozen", "No hazards", null, null, null, "[]");
        scientificSample.AssignPhase(scientificPhase.Id);
        scope.DbContext.Entry(scientificSample).Property(entry => entry.Id).CurrentValue = fixture.Specimen.SubmittedSpecimenId;
        scientificOrder.Samples.Add(scientificSample);
        scope.DbContext.Add(scientificOrder);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var workflow = new LabServiceWorkflow($"use-{scope.Suffix}", "TEST ONLY use evidence", null);
        var workflowVersion = new LabServiceWorkflowVersion(workflow.Id, 1, scope.PlatformUser.Id, DateTime.UtcNow);
        var attempt = new LabSpecimenAttempt(fixture.WorkOrder.Id, fixture.Specimen.Id,
            sample.Tubes.Single(tube => tube.Barcode == codes[1]).Id, workflowVersion.Id, 1, null);
        try
        {
            scope.DbContext.AddRange(workflow, workflowVersion, attempt);
            await scope.DbContext.SaveChangesAsync();
            scope.ClearTrackedState();
            Assert.Empty((await lab.AccessionedSamples(search: codes[1], useStatus: "Used")).Items);
            Assert.Equal("NotUsed", Assert.Single((await lab.AccessionedSamples(search: codes[1], useStatus: "NotUsed")).Items).UseStatus);
            attempt = await scope.DbContext.LabSpecimenAttempts.SingleAsync(item => item.Id == attempt.Id);
            attempt.Cancel("TEST ONLY cancelled selection", scope.PlatformUser.Id, DateTime.UtcNow);
            await scope.DbContext.SaveChangesAsync();
            scope.ClearTrackedState();
            Assert.Empty((await lab.AccessionedSamples(search: codes[1], useStatus: "Used")).Items);
            var started = new LabSpecimenAttempt(fixture.WorkOrder.Id, fixture.Specimen.Id, attempt.SourceContainerId, workflowVersion.Id, 2, attempt.Id);
            started.Start(codes[1], codes[1], DateTime.UtcNow);
            scope.DbContext.Add(started);
            await scope.DbContext.SaveChangesAsync();
            scope.ClearTrackedState();
            var used = Assert.Single((await lab.AccessionedSamples(search: codes[1], intakeStatus: "Accepted", useStatus: "Used", pageSize: 1)).Items);
            Assert.Equal("Used", used.UseStatus);
            Assert.Equal("Used", used.Tubes.Single(tube => tube.Barcode == codes[1]).UseStatus);
            Assert.Equal("NotUsed", used.Tubes.Single(tube => tube.Barcode == codes[2]).UseStatus);
            Assert.Empty((await lab.AccessionedSamples(search: codes[1], useStatus: "NotUsed")).Items);
        }
        finally
        {
            scope.ClearTrackedState();
            await scope.DbContext.LabSpecimenAttempts.Where(item => item.LabServiceWorkflowVersionId == workflowVersion.Id).ExecuteDeleteAsync();
            await scope.DbContext.LabServiceWorkflowVersions.Where(item => item.Id == workflowVersion.Id).ExecuteDeleteAsync();
            await scope.DbContext.LabServiceWorkflows.Where(item => item.Id == workflow.Id).ExecuteDeleteAsync();
            await scope.DbContext.LabSamples.Where(item => item.LabServiceOrderId == scientificOrder.Id).ExecuteDeleteAsync();
            await scope.DbContext.Set<LabJobPhase>().Where(item => item.LabServiceOrderId == scientificOrder.Id).ExecuteDeleteAsync();
            await scope.DbContext.LabServiceOrders.Where(item => item.Id == scientificOrder.Id).ExecuteDeleteAsync();
        }
    }
}
