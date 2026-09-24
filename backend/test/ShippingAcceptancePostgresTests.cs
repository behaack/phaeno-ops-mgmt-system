namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Application;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ShippingAcceptanceNoticeFailureRetriesSameRequestWithCurrentRecipientsOnly()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var request = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var notification = await scope.DbContext.OrderNotifications.SingleAsync(item => item.WorkflowId == request.Id);
        var originalId = notification.Id;
        var originalBody = notification.Body;
        var sender = new ShippingAcceptanceSender();
        notification.BeginAttempt(DateTime.UtcNow.AddMinutes(1)); await scope.DbContext.SaveChangesAsync();
        await OrderNotificationDispatcher.DeliverAsync(scope.DbContext, sender, notification.Id, notification.Version, NullLogger.Instance, default);
        scope.ClearTrackedState();
        notification = await scope.DbContext.OrderNotifications.SingleAsync(item => item.Id == originalId);
        Assert.Equal(OrderNotificationStatus.Failed, notification.Status);
        Assert.Null(notification.SentAt);
        Assert.Equal(1, notification.AttemptCount);
        Assert.Equal(scope.PlatformUser.Email, Assert.Single(Assert.Single(sender.Attempts)));
        Assert.Equal("Pending", (await scope.KitStaff().Read(request.Id, default)).Request.Status);

        // Delivery routing is recomputed; a disabled administrator must not receive a retry.
        var oldAdmin = await scope.DbContext.Users.SingleAsync(item => item.Id == scope.PlatformUser.Id);
        oldAdmin.Deactivate();
        var replacement = new PSeq.Operations.Commercial.Accounts.Domain.User($"replacement-{scope.Suffix}@example.test", "SIMULATED", "Fulfillment");
        replacement.Activate();
        var membership = new PSeq.Operations.Commercial.Accounts.Domain.OrganizationMembership(replacement.Id, scope.PlatformOrganization.Id, true);
        scope.DbContext.AddRange(replacement, membership); await scope.DbContext.SaveChangesAsync();
        sender.Fail = false;
        notification.BeginAttempt(DateTime.UtcNow.AddMinutes(5)); await scope.DbContext.SaveChangesAsync();
        await OrderNotificationDispatcher.DeliverAsync(scope.DbContext, sender, notification.Id, notification.Version, NullLogger.Instance, default);
        scope.ClearTrackedState();
        notification = await scope.DbContext.OrderNotifications.SingleAsync(item => item.Id == originalId);
        Assert.Equal(OrderNotificationStatus.Sent, notification.Status);
        Assert.NotNull(notification.SentAt);
        Assert.Equal(2, notification.AttemptCount);
        Assert.Equal(originalBody, notification.Body);
        Assert.Equal(replacement.Email, Assert.Single(sender.Attempts[1]));
        Assert.DoesNotContain(scope.CustomerUser.Email, sender.Attempts.SelectMany(item => item));
        await OrderNotificationDispatcher.DeliverAsync(scope.DbContext, sender, notification.Id, notification.Version, NullLogger.Instance, default);
        Assert.Equal(2, sender.Attempts.Count);
        Assert.Single(await scope.DbContext.OrderNotifications.Where(item => item.WorkflowId == request.Id).ToListAsync());
        await scope.DbContext.OrganizationMemberships.Where(item => item.Id == membership.Id).ExecuteDeleteAsync();
        await scope.DbContext.Users.Where(item => item.Id == replacement.Id).ExecuteDeleteAsync();
    }

    [PostgreSqlReferenceFact]
    public async Task ShippingAcceptanceStockRegistrationRejectsIncompleteDuplicateExcessAndUsedTubeIdentities()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        var size = await scope.CreateContainerAsync(fixture, 20);
        var location = await scope.CreateTransportationLocationAsync();
        var request = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, location.Id, location.Version, [new(size.Id, 1)]), default);
        var stock = scope.StockController();
        var catalog = await scope.CatalogKitRequestAsync(size.Id, "TEST lot");
        var kit = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>((await stock.Create(
            catalog, default)).Result).Value);
        var codes = Enumerable.Range(1, 20).Select(i => $"SIM-{scope.Suffix}-{i:00}").ToArray();
        kit = await stock.Register(kit.Id, new(codes.Take(19).ToArray(), kit.Version), default);
        Assert.Equal(19, kit.Tubes.Count);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.KitStaff().Dispatch(request.Id,
            new(request.Version, [kit.Id], "SIMULATED", "OUT-INCOMPLETE", DateTime.UtcNow), default));
        scope.ClearTrackedState();
        Assert.Equal(0, (await scope.KitStaff().Read(request.Id, default)).Request.Lines.Sum(item => item.DispatchedQuantity));
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Register(kit.Id, new([codes[0]], kit.Version), default));
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Register(kit.Id, new([codes[19], $"SIM-{scope.Suffix}-EXCESS"], kit.Version), default));
        scope.ClearTrackedState();
        Assert.Equal(19, (await stock.Read(kit.Id, default)).Tubes.Count);
        kit = await stock.Register(kit.Id, new([codes[19]], kit.Version), default);
        Assert.Equal(20, kit.Tubes.Count);
        Assert.Equal("Preparing", kit.Status); // Registration alone does not record dispatch.
        Assert.Null(kit.CustomerReceivedAt);
        Assert.Null(kit.BoundSampleShipmentId);
        Assert.Equal("Pending", (await scope.KitStaff().Read(request.Id, default)).Request.Status);
        var other = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>((await stock.Create(
            catalog, default)).Result).Value);
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Register(other.Id, new([codes[0]], other.Version), default));
        var sent = await scope.KitStaff().Dispatch(request.Id, new(request.Version, [kit.Id], "SIMULATED carrier", "SIM-OUTBOUND", DateTime.UtcNow), default);
        await scope.KitCustomer().Receive(request.Id, new(sent.Request.Version, [kit.Id]), default);
        kit = await stock.Read(kit.Id, default);
        var packed = Assert.Single(await scope.PackingController().Confirm(fixture.Shipment.Id,
            new(fixture.Shipment.Version, [new(size.Id, 1)], DeliveryLocationId: location.Id, StockKits: [new(kit.Id, kit.Version)]), default));
        var row = packed.Crosswalk.First();
        await scope.CreateCustomerWorkflowController().AssignTube(packed.Id, row.ShipmentItemId, new(codes[0], null, row.Version, row.TubeSlotId, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => stock.Register(other.Id, new([codes[0]], other.Version), default));
        Assert.Empty((await stock.Read(other.Id, default)).Tubes);
        var used = await stock.Read(kit.Id, default);
        Assert.Equal("InUse", used.Status);
        Assert.Equal(packed.Id, used.BoundSampleShipmentId);
        Assert.Equal(20, used.Tubes.Count);
        Assert.Equal(18, packed.Crosswalk.Count);
    }

    [PostgreSqlReferenceFact]
    public async Task ShippingAcceptanceSplitPacketsDispatchReceiptAccessionAndLabelHistoryRetainOneLineage()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateTransportationShipmentAsync(18);
        // This manual-service fixture needs a staff deadline before scientific acceptance.
        var acceptingWork = await scope.DbContext.LabWorkOrders.SingleAsync(w => w.Id == fixture.WorkOrder.Id);
        acceptingWork.AdjustDeliveryDueDate(DateTime.UtcNow.AddDays(14));
        await scope.DbContext.SaveChangesAsync();
        var size = await scope.CreateContainerAsync(fixture, 10);
        var packetType = await scope.DbContext.SampleTypeDefinitions.SingleAsync(item => item.Id == fixture.SampleType.Id);
        scope.DbContext.Entry(packetType).Property(item => item.QuantityUnit).CurrentValue = "tubes";
        await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var location = await scope.CreateTransportationLocationAsync();
        var request = await scope.KitCustomer().Create(fixture.Shipment.Id,
            new(fixture.Shipment.Version, location.Id, location.Version, [new(size.Id, 2)]), default);
        var kits = new[] { await scope.ReadyTransportationKitAsync(size), await scope.ReadyTransportationKitAsync(size) };
        var sent = await scope.KitStaff().Dispatch(request.Id, new(request.Version, kits.Select(item => item.Id).ToArray(), "SIMULATED outbound", "SUPPLY-ONLY", DateTime.UtcNow), default);
        await scope.KitCustomer().Receive(request.Id, new(sent.Request.Version, kits.Select(item => item.Id).ToArray()), default);
        for (var i = 0; i < kits.Length; i++) kits[i] = await scope.StockController().Read(kits[i].Id, default);
        var customer = scope.CreateCustomerWorkflowController();
        var lab = scope.CreateLabController();
        var shipments = (await scope.PackingController().Confirm(fixture.Shipment.Id,
            new(fixture.Shipment.Version, [new(size.Id, 2)], ContainerTubeCounts: [9, 9], DeliveryLocationId: location.Id,
                StockKits: kits.Select(item => new StockKitSelectionRequest(item.Id, item.Version)).ToArray()), default)).ToArray();
        Assert.Equal(2, shipments.Length);
        var frozenQuote = await QuoteSnapshot();
        var originalSlots = shipments.SelectMany(item => item.Crosswalk).Select(item => item.TubeSlotId).Order().ToArray();
        var barcodes = new Dictionary<Guid, string[]>();
        for (var i = 0; i < shipments.Length; i++)
        {
            var current = shipments[i];
            var reservedKit = await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(k => k.ReservedSampleShipmentId == current.Id);
            var kit = kits.Single(item => item.Id == reservedKit.Id);
            await Assert.ThrowsAsync<OrderManagementException>(() => customer.RecordShipment(current.Id, new("SIMULATED", "TOO-EARLY", DateTime.UtcNow, current.Version), default));
            scope.ClearTrackedState();
            var rows = current.Crosswalk.OrderBy(item => item.TubeOrdinal).ToArray();
            var codes = kit.Tubes.Take(9).Select(item => item.SupplierBarcode).ToArray();
            for (var n = 0; n < rows.Length; n++)
            {
                current = await customer.AssignTube(current.Id, rows[n].ShipmentItemId, new(codes[n], null, rows[n].Version, rows[n].TubeSlotId, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default);
                scope.ClearTrackedState();
            }
            var firstPacketRequest = new IssueSampleShippingPacketRequest(current.Version, null);
            current = await customer.IssuePacket(current.Id, firstPacketRequest, default);
            var firstPacket = current.CurrentPacket!;
            await Assert.ThrowsAsync<OrderManagementException>(() => customer.IssuePacket(current.Id, firstPacketRequest, default));
            var replay = await customer.Shipment(current.Id, default);
            Assert.Equal(firstPacket.Id, replay.CurrentPacket!.Id);
            using (var manifest = JsonDocument.Parse((await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking().SingleAsync(item => item.Id == firstPacket.Id)).ManifestSnapshotJson))
            {
                var samples = manifest.RootElement.GetProperty("samples").EnumerateArray().ToArray();
                Assert.Equal(9, samples.Length);
                Assert.All(samples, sample => { Assert.Equal(18, sample.GetProperty("totalSampleTubeCount").GetInt32()); Assert.Equal(9, sample.GetProperty("tubeCount").GetInt32()); Assert.Equal(9, sample.GetProperty("otherShipments")[0].GetProperty("tubeCount").GetInt32()); });
            }
            if (i == 0)
            {
                var row = current.Crosswalk.Single(item => item.TubeSlotId == rows[0].TubeSlotId);
                var spare = kit.Tubes[9].SupplierBarcode;
                await Assert.ThrowsAsync<OrderManagementException>(() => customer.AssignTube(current.Id, row.ShipmentItemId, new(spare, null, row.Version, row.TubeSlotId, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default));
                scope.ClearTrackedState();
                current = await customer.AssignTube(current.Id, row.ShipmentItemId, new(spare, "SIMULATED pre-dispatch correction", row.Version, row.TubeSlotId, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default);
                Assert.NotEqual(firstPacket.Id, current.CurrentPacket!.Id);
                Assert.Equal(2, current.CurrentPacket.Revision);
                var voided = await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking().SingleAsync(item => item.Id == firstPacket.Id);
                Assert.True(voided.IsVoided);
                Assert.Equal(current.CurrentPacket.Id, voided.ReplacedByPacketRevisionId);
                await Assert.ThrowsAsync<OrderManagementException>(() => lab.ReceiveShipment(new(firstPacket.Barcode), default));
                codes[0] = spare;
            }
            barcodes[current.Id] = codes;
            shipments[i] = current;
        }
        for (var i = 0; i < shipments.Length; i++)
        {
            var current = shipments[i];
            current = await customer.RecordShipment(current.Id, new("SIMULATED return", $"RETURN-{i + 1}", DateTime.UtcNow, current.Version), default);
            scope.ClearTrackedState();
            Assert.Equal($"RETURN-{i + 1}", current.TrackingNumber);
            Assert.Equal("Shipped", current.Status);
            if (i == 0) Assert.Equal("ReadyToShip", (await customer.Shipment(shipments[1].Id, default)).Status);
            shipments[i] = current;
        }
        Assert.Equal(frozenQuote, await QuoteSnapshot());
        var total = 0;
        Guid? sourceContainerId = null;
        string? accessionNumber = null;
        foreach (var shipment in shipments)
        {
            var packet = shipment.CurrentPacket!;
            var receipt = await lab.ReceiveShipment(new(packet.Barcode), default);
            scope.ClearTrackedState();
            var replay = await lab.ReceiveShipment(new(packet.Barcode), default);
            Assert.True(replay.AlreadyReceived);
            AssertUtcWithinDatabasePrecision(receipt.ReceivedAt, replay.ReceivedAt);
            foreach (var barcode in barcodes[shipment.Id])
            {
                var before = await scope.CreatePlatformWorkflowController().ScanTube(packet.Barcode, barcode, default);
                Assert.False(before.IsReceived);
                var work = await lab.AccessionShipmentTube(fixture.WorkOrder.Id, shipment.Id,
                    new(packet.Barcode, barcode, "SIMULATED-BOX-A"), default);
                scope.ClearTrackedState();
                var tube = work.Containers.Single(item => item.Barcode == barcode);
                sourceContainerId ??= tube.Id;
                accessionNumber ??= work.Specimens.Single().AccessionNumber;
                Assert.Equal(accessionNumber, work.Specimens.Single().AccessionNumber);
                Assert.Equal("RegisteredSupplier", tube.BarcodeSource);
                Assert.Equal("SIMULATED-BOX-A", tube.Location);
                await lab.AccessionShipmentTube(fixture.WorkOrder.Id, shipment.Id, new(packet.Barcode, barcode, "SIMULATED-BOX-A"), default);
                scope.ClearTrackedState();
                total++;
                var saved = await customer.Shipment(shipment.Id, default);
                Assert.Equal(total, saved.OrderReceivedTubeCount);
                Assert.Equal(18, saved.OrderExpectedTubeCount);
                Assert.Equal(total, await scope.DbContext.LabContainers.CountAsync(item => item.LabWorkOrderId == fixture.WorkOrder.Id));
            }
            var labWork = await scope.DbContext.LabWorkOrders.Include(item => item.Specimens).SingleAsync(item => item.Id == fixture.WorkOrder.Id);
            var progress = await LabIntakeProgress.ReadAsync(scope.DbContext, labWork, default);
            if (total == 9) Assert.Null(Assert.Single(progress.Specimens).AccessionNumber);
            else Assert.Equal(accessionNumber, Assert.Single(progress.Specimens).AccessionNumber);
        }
        var complete = await customer.Shipments(default, sourceId: fixture.Shipment.AuthorizationSourceId);
        Assert.Equal(originalSlots, complete.SelectMany(item => item.Crosswalk).Select(item => item.TubeSlotId).Order());
        Assert.Equal(2, complete.Count(item => item.Status == "Received"));
        var retiredPool = Assert.Single(complete, item => item.Status == "Cancelled");
        Assert.True(retiredPool.IsPackingPool);
        Assert.Empty(retiredPool.Crosswalk);
        Assert.Equal(2, await scope.DbContext.LabWorkEvents.CountAsync(item => item.LabWorkOrderId == fixture.WorkOrder.Id && item.EventCode == "ShipmentReceived"));
        Assert.Equal(frozenQuote, await QuoteSnapshot());
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.PrintContainerLabel(sourceContainerId!.Value, new("SIMULATED", "Succeeded", null), default));
        var child = await lab.CreateContainer(fixture.WorkOrder.Id, new(fixture.Specimen.Id, sourceContainerId, "Aliquot", "SIMULATED derived tube", "SIMULATED-BOX-B", 1, "uL", null), default);
        Assert.NotEqual(sourceContainerId, child.Id);
        Assert.Equal(sourceContainerId, child.ParentContainerId);
        Assert.Equal(0, child.LabelPrintCount);
        Assert.Equal("LabelPending", child.Status);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.PrintContainerLabel(child.Id, new("SIMULATED failed", "Failed", null), default));
        var failedPrint = await lab.PrintContainerLabel(child.Id, new("SIMULATED failed", "Failed", "SIMULATED offline printer"), default);
        Assert.Equal(0, failedPrint.Container.LabelPrintCount);
        Assert.Equal("LabelPending", failedPrint.Container.Status);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.PrintContainerLabel(child.Id,
            new("SIMULATED missing scan", "Succeeded", null), default));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.PrintContainerLabel(child.Id,
            new("SIMULATED wrong physical label", "Succeeded", null, "PH-A-WRONG"), default));
        var printed = await lab.PrintContainerLabel(child.Id, new("SIMULATED initial confirmation", "Succeeded", null, child.Barcode), default);
        Assert.Equal(1, printed.Container.LabelPrintCount);
        Assert.Equal("Available", printed.Container.Status);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.PrintContainerLabel(child.Id, new("", "Succeeded", null), default));
        var reprinted = await lab.PrintContainerLabel(child.Id, new("SIMULATED damaged label replacement", "Succeeded", null, child.Barcode), default);
        Assert.Equal(2, reprinted.Container.LabelPrintCount);
        Assert.Equal(3, reprinted.PrintHistory.Count);
        var scanned = await lab.ScanContainer(child.Barcode, default);
        Assert.Equal(child.Id, scanned.Container.Id);
        Assert.NotNull(scanned.ParentBarcode);
        Assert.Equal("SIMULATED-BOX-B", scanned.Container.Location);
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.ScanContainer(child.Barcode + "X", default));
        await Assert.ThrowsAsync<OrderManagementException>(() => lab.ScanContainer("SIMULATED-UNKNOWN-BARCODE", default));

        async Task<string> QuoteSnapshot()
        {
            var quote = await scope.DbContext.LabServiceQuotes.AsNoTracking().SingleAsync(item => item.LabServiceOrderId == fixture.Shipment.AuthorizationSourceId);
            return JsonSerializer.Serialize(new { quote.Id, quote.Version, quote.Status, quote.AcceptedAt, quote.Total });
        }
    }

    private sealed class ShippingAcceptanceSender : IOrderNotificationSender
    {
        public bool Fail { get; set; } = true;
        public List<string[]> Attempts { get; } = [];
        public Task SendAsync(IReadOnlyList<string> recipients, string subject, string body, CancellationToken ct)
        {
            Attempts.Add(recipients.ToArray());
            if (Fail) throw new HttpRequestException("SIMULATED transport failure");
            return Task.CompletedTask;
        }
    }
}
