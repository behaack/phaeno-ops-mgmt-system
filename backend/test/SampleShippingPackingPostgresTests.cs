namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Accounts.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ContainerCatalogRequiresPhaenoAccessAndFiltersByItsLockedSampleType()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var denied = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ContainerAdminController(customer: true).List(default));
        Assert.Equal(StatusCodes.Status403Forbidden, denied.StatusCode);

        var definition = await scope.CreateContainerAsync(fixture, 20);
        var matching = await scope.ContainerCatalog().ReadCompatibleAsync(
            [new ContainerSampleTypeContext(fixture.SampleType.Id)], default);
        Assert.Contains(matching, item => item.Id == definition.Id);

        var other = await scope.CreateConfigurationController().CreateSampleType(
            scope.SampleTypeRequest(DateTime.UtcNow.AddDays(-1), name: "Other RNA")
                with { Code = $"REF_{scope.Suffix}_OTHER" }, default);
        scope.ClearTrackedState();
        var unrelated = await scope.ContainerCatalog().ReadCompatibleAsync(
            [new ContainerSampleTypeContext(other.Id)], default);
        Assert.DoesNotContain(unrelated, item => item.Id == definition.Id);
    }
    [PostgreSqlReferenceFact]
    public async Task ContainerPackingConcurrentConfirmAllocatesEveryPhysicalTubeOnlyOnce()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        await using var first = scope.CreateAdditionalContext();
        await using var second = scope.CreateAdditionalContext();
        var request = new ConfirmShipmentPackingRequest(fixture.Shipment.Version, [new(definition.Id, 2)]);
        var results = await Task.WhenAll(CaptureAsync(() => scope.PackingController(dbOverride: first).Confirm(fixture.Shipment.Id, request, default)),
            CaptureAsync(() => scope.PackingController(dbOverride: second).Confirm(fixture.Shipment.Id, request, default)));
        Assert.Single(results, result => result is null);
        Assert.Single(results, result => result is OrderManagementException { StatusCode: 409 } or DbUpdateConcurrencyException);
        var shipments = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Where(item => item.AuthorizationSourceId == fixture.Shipment.AuthorizationSourceId && item.Status != SampleShipmentStatus.Cancelled).ToListAsync();
        Assert.Equal(2, shipments.Count);
        Assert.Equal(Enumerable.Range(1, 30), shipments.SelectMany(item => item.Items).SelectMany(item => item.TubeSlots).Select(item => item.Ordinal).Order());
    }

    [PostgreSqlReferenceFact]
    public async Task KitDraftActivationAndDeactivationPreserveSelectedShipmentSnapshot()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var catalog = scope.ContainerCatalog();
        var contexts = await scope.ContainerContextsAsync(fixture);
        var draft = await scope.CreateContainerAsync(fixture, 20, false);
        Assert.False(draft.IsActive);
        Assert.Empty(await catalog.ReadCompatibleAsync(contexts, default));
        Assert.Equal(draft.Id, Assert.Single(await catalog.ReadCompatibleAsync(contexts, default, draft.Id)).Id);

        var contents = draft.KitContents!.Select(part => new ShippingKitContentRequest(part.SupplierProductId, part.Quantity)).ToArray();
        var live = await catalog.ReviseAsync(draft.Id, new(draft.Version, draft.CommonName, 20,
            DateTime.UtcNow, IsActive: true, KitContents: contents,
            AssemblyWorkflowRevisionId: draft.AssemblyWorkflowRevisionId,
            PackingInstructions: draft.PackingInstructions,
            TemperatureControlInstructions: draft.TemperatureControlInstructions), default);
        scope.ClearTrackedState();
        Assert.Equal(live.Id, Assert.Single(await catalog.ReadCompatibleAsync(contexts, default)).Id);

        var source = await scope.DbContext.SampleShipments.SingleAsync(item => item.Id == fixture.Shipment.Id);
        source.SelectContainer(live.Id, SampleShippingContainerCatalogService.Snapshot(live));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();

        var deactivated = await catalog.DeactivateAsync(live.Id, live.Version, default);
        Assert.False(deactivated.IsActive);
        Assert.Empty(await catalog.ReadCompatibleAsync(contexts, default));
        var saved = await scope.DbContext.SampleShipments.AsNoTracking().SingleAsync(item => item.Id == source.Id);
        Assert.Equal(live.Id, saved.ContainerDefinitionId);
        using var frozen = JsonDocument.Parse(saved.ContainerSnapshotJson!);
        Assert.Equal(20, frozen.RootElement.GetProperty("tubeCapacity").GetInt32());
    }
    [PostgreSqlReferenceFact]
    public async Task ContainerPackingThirtyTubesUsesTwentyAndTenAndPreservesGlobalSampleOrdinals()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var sizes = await scope.CreateStandardContainersAsync(fixture);
        var packing = scope.PackingController();
        var preview = await packing.Preview(fixture.Shipment.Id, new(), default);
        Assert.Equal(2, preview.ContainerCount); Assert.Equal(0, preview.UnusedCapacity);
        scope.ClearTrackedState();
        var result = await packing.Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version,
            preview.Containers.Select(item => new ContainerQuantityRequest(item.ContainerDefinitionId, item.Quantity)).ToArray()), default);
        Assert.Equal(2, result.Count);
        scope.ClearTrackedState();
        var shipments = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Where(item => item.AuthorizationSourceId == fixture.Shipment.AuthorizationSourceId).ToListAsync();
        var active = shipments.Where(item => item.Status != SampleShipmentStatus.Cancelled).ToArray();
        Assert.Equal(new[] { 10, 20 }, active.Select(item => item.Items.Sum(row => row.TubeSlots.Count)).Order());
        Assert.Equal(Enumerable.Range(1, 30), active.SelectMany(item => item.Items).SelectMany(item => item.TubeSlots).Select(item => item.Ordinal).Order());
        Assert.All(active.SelectMany(item => item.Items), item => Assert.Equal(fixture.Specimen.SubmittedSpecimenId, item.SubmittedSpecimenId));
        Assert.Equal(30, active.SelectMany(item => item.Items).SelectMany(item => item.TubeSlots).Select(item => item.Id).Distinct().Count());
        Assert.True(shipments.Single(item => item.Id == fixture.Shipment.Id).IsPackingPool);
        Assert.Equal(SampleShipmentStatus.Cancelled, shipments.Single(item => item.Id == fixture.Shipment.Id).Status);
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => packing.Confirm(fixture.Shipment.Id,
            new(fixture.Shipment.Version, [new(sizes[0].Id, 2)]), default));
        Assert.Equal("sample_packing_conflict", stale.ErrorCode);
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerPackingHonorsAlternateSelectionsAndLeavesShortfallExplicit()
    {
        foreach (var choice in new[] { (Capacity: 20, Quantity: 2, Remaining: 0), (Capacity: 5, Quantity: 6, Remaining: 0), (Capacity: 5, Quantity: 4, Remaining: 10) })
        {
            await using var scope = await ShippingTestScope.CreateAsync();
            var fixture = await scope.CreateShipmentAsync(30);
            var sizes = await scope.CreateStandardContainersAsync(fixture);
            var selected = sizes.Single(item => item.TubeCapacity == choice.Capacity);
            var packing = scope.PackingController();
            var preview = await packing.Preview(fixture.Shipment.Id, new(Selection: [new(selected.Id, choice.Quantity)]), default);
            Assert.Equal(choice.Remaining, preview.UnallocatedTubes);
            scope.ClearTrackedState();
            var result = await packing.Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(selected.Id, choice.Quantity)]), default);
            Assert.Equal(choice.Quantity + (choice.Remaining > 0 ? 1 : 0), result.Count);
            scope.ClearTrackedState();
            var source = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
                .SingleAsync(item => item.Id == fixture.Shipment.Id);
            Assert.Equal(choice.Remaining, source.Items.Sum(item => item.TubeSlots.Count));
            Assert.Equal(choice.Remaining == 0 ? SampleShipmentStatus.Cancelled : SampleShipmentStatus.Preparing, source.Status);
            var badTenant = await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController(otherTenant: true).Read(result[0].Id, default));
            Assert.Equal("sample_shipment_not_found", badTenant.ErrorCode);
            if (choice.Remaining > 0)
            {
                var earlierPhysicalIds = result.Where(item => item.Id != fixture.Shipment.Id).Select(item => item.Id).ToArray();
                scope.ClearTrackedState();
                await packing.Confirm(source.Id, new(source.Version, [new(selected.Id, 2)]), default);
                scope.ClearTrackedState();
                var completed = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
                    .Where(item => item.AuthorizationSourceId == fixture.Shipment.AuthorizationSourceId && item.Status != SampleShipmentStatus.Cancelled).ToArrayAsync();
                Assert.Equal(6, completed.Length);
                Assert.All(earlierPhysicalIds, id => Assert.Contains(completed, item => item.Id == id));
                Assert.Equal(Enumerable.Range(1, 30), completed.SelectMany(item => item.Items).SelectMany(item => item.TubeSlots).Select(item => item.Ordinal).Order());
                Assert.All(completed, item => Assert.False(item.IsPackingPool));
            }
        }
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerStockWholeKitBindsOnFirstScanWhilePartialFillKeepsUnusedTubesSeparate()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var stock = scope.StockController();
        var createdResult = await stock.Create(await scope.CatalogKitRequestAsync(definition.Id), default);
        var created = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(createdResult.Result).Value);
        scope.ClearTrackedState();
        var codes = Enumerable.Range(1, 20).Select(index => $"STK-{scope.Suffix}-{index:00}").ToArray();
        var registered = await stock.Register(created.Id, new(codes, created.Version), default);
        scope.ClearTrackedState();
        var verified = await stock.VerifyTubes(created.Id, new(registered.Version, codes), default);
        scope.ClearTrackedState();
        await scope.CompleteKitAssemblyAsync(created.Id);
        var assembled = await stock.Read(created.Id, default);
        var dispatched = await stock.Dispatch(created.Id, new(fixture.Shipment.Id, assembled.Version, "Reference carrier", "TEST-OUTBOUND", DateTime.UtcNow), default);
        Assert.Equal("NeedsReview", dispatched.Status);
        scope.ClearTrackedState();
        var packed = await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 2)]), default);
        scope.ClearTrackedState();
        var active = await scope.DbContext.SampleShipments.Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Where(item => packed.Select(value => value.Id).Contains(item.Id)).ToListAsync();
        var partial = active.Single(item => item.Items.Sum(row => row.TubeSlots.Count) == 10);
        var other = active.Single(item => item.Id != partial.Id);
        var row = Assert.Single(partial.Items);
        var slot = row.TubeSlots.OrderBy(item => item.Ordinal).First();
        scope.ClearTrackedState();
        await scope.CreateCustomerWorkflowController().AssignTube(partial.Id, row.Id, new(codes[0], null, slot.Version, TubeSlotId: slot.Id, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default);
        scope.ClearTrackedState();
        var bound = await stock.Read(created.Id, default);
        Assert.Equal("InUse", bound.Status); Assert.Equal(partial.Id, bound.BoundSampleShipmentId);
        var legacyKit = await scope.DbContext.SampleReturnKits.AsNoTracking().Include(item => item.Tubes).SingleAsync(item => item.SampleShipmentId == partial.Id);
        Assert.Equal(SampleReturnKitStatus.Fulfilled, legacyKit.Status);
        Assert.Equal(20, legacyKit.Tubes.Count);
        Assert.Equal(1, legacyKit.Tubes.Count(item => item.Status == RegisteredSampleTubeStatus.Assigned));
        var otherRow = Assert.Single(other.Items); var otherSlot = otherRow.TubeSlots.First();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateCustomerWorkflowController().AssignTube(other.Id, otherRow.Id,
            new(codes[1], null, otherSlot.Version, TubeSlotId: otherSlot.Id, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default));
        scope.ClearTrackedState();
        var orderedSlots = row.TubeSlots.OrderBy(item => item.Ordinal).ToArray();
        for (var index = 1; index < orderedSlots.Length; index++)
        {
            await scope.CreateCustomerWorkflowController().AssignTube(partial.Id, row.Id,
                new(codes[index], null, orderedSlots[index].Version, orderedSlots[index].Id, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default);
            scope.ClearTrackedState();
        }
        var beforePacket = await scope.CreateCustomerWorkflowController().Shipment(partial.Id, default);
        await scope.CreateCustomerWorkflowController().IssuePacket(partial.Id, new(beforePacket.Version, null), default);
        scope.ClearTrackedState();
        var packet = await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking().SingleAsync(item => item.SampleShipmentId == partial.Id && !item.VoidedAt.HasValue);
        var oldBarcode = packet.Barcode;
        var firstPacketShipment = await scope.CreateCustomerWorkflowController().Shipment(partial.Id, default);
        await scope.CreateCustomerWorkflowController().IssuePacket(partial.Id, new(firstPacketShipment.Version, "Reference manifest replacement"), default);
        scope.ClearTrackedState();
        packet = await scope.DbContext.SampleShippingPacketRevisions.AsNoTracking().SingleAsync(item => item.SampleShipmentId == partial.Id && !item.VoidedAt.HasValue);
        Assert.Equal(2, packet.Revision);
        Assert.Equal("PacketVoided", (await scope.CreatePlatformWorkflowController().ScanTube(oldBarcode, codes[0], default)).Outcome);
        var rejectedOldPacket = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateLabController().ReceiveSpecimen(fixture.WorkOrder.Id,
            fixture.Specimen.Id, new(DateTime.UtcNow, "Frozen", "Intake", fixture.Specimen.Version, oldBarcode, codes[0]), default));
        Assert.Equal("sample_shipping_packet_voided", rejectedOldPacket.ErrorCode);
        scope.ClearTrackedState();
        Assert.Equal(2, (await scope.IdentityController().Scan(SampleShippingIdentity.Order(fixture.Shipment.AuthorizationSourceId), default)).Shipments.Count);
        Assert.Equal(2, (await scope.IdentityController().Scan(SampleShippingIdentity.Sample(fixture.Specimen.SubmittedSpecimenId), default)).Shipments.Count);
        Assert.Equal(partial.Id, Assert.Single((await scope.IdentityController().Scan(SampleShippingIdentity.Shipment(partial.Id), default)).Shipments).Id);
        using (var manifest = JsonDocument.Parse(packet.ManifestSnapshotJson))
        {
            Assert.Equal(SampleShippingIdentity.Order(fixture.Shipment.AuthorizationSourceId), manifest.RootElement.GetProperty("orderBarcode").GetString());
            Assert.Equal(SampleShippingIdentity.Shipment(partial.Id), manifest.RootElement.GetProperty("shipmentBarcode").GetString());
            Assert.Equal(definition.Sku, manifest.RootElement.GetProperty("container").GetProperty("sku").GetString());
            var samples = manifest.RootElement.GetProperty("samples").EnumerateArray().ToArray();
            Assert.Equal(10, samples.Length);
            Assert.All(samples, sample =>
            {
                Assert.Equal(30, sample.GetProperty("totalSampleTubeCount").GetInt32());
                Assert.Equal(10, sample.GetProperty("tubeCount").GetInt32());
                Assert.Equal(SampleShippingIdentity.Sample(fixture.Specimen.SubmittedSpecimenId), sample.GetProperty("sampleBarcode").GetString());
                Assert.Equal(20, sample.GetProperty("otherShipments")[0].GetProperty("tubeCount").GetInt32());
            });
        }
        var version = fixture.Specimen.Version;
        var unpaired = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateLabController().ReceiveSpecimen(fixture.WorkOrder.Id, fixture.Specimen.Id,
            new SpecimenReceiptRequest(DateTime.UtcNow, "Frozen", "Intake", version), default));
        Assert.Equal("physical_tube_receipt_required", unpaired.ErrorCode);
        scope.ClearTrackedState();
        var spare = await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateLabController().ReceiveSpecimen(fixture.WorkOrder.Id, fixture.Specimen.Id,
            new SpecimenReceiptRequest(DateTime.UtcNow, "Frozen", "Intake", version, packet.Barcode, codes[15]), default));
        Assert.Equal("supplier_tube_sample_mismatch", spare.ErrorCode);
        scope.ClearTrackedState();
        for (var index = 0; index < 10; index++)
        {
            var received = index == 9
                ? await scope.CreateLabController().AccessionSpecimen(fixture.WorkOrder.Id, fixture.Specimen.Id,
                    new SpecimenAccessionRequest("ACC-PARTIAL-REFERENCE", row.CustomerSampleId, "Intake", row.Quantity, row.QuantityUnit,
                        null, version, packet.Barcode, codes[index]), default)
                : await scope.CreateLabController().ReceiveSpecimen(fixture.WorkOrder.Id, fixture.Specimen.Id,
                    new SpecimenReceiptRequest(DateTime.UtcNow, "Frozen and intact", "Intake", version,
                        index == 0 ? SampleShippingIdentity.Shipment(partial.Id) : packet.Barcode, codes[index]), default);
            version = received.Specimens.Single(item => item.Id == fixture.Specimen.Id).Version;
            scope.ClearTrackedState();
            var progress = await scope.CreateCustomerWorkflowController().Shipment(partial.Id, default);
            Assert.Equal(index + 1, progress.ReceivedTubeCount);
            Assert.Equal(index + 1, progress.OrderReceivedTubeCount);
            Assert.Equal(30, progress.OrderExpectedTubeCount);
            Assert.All(progress.Crosswalk, item => Assert.Equal(index + 1, item.ReceivedTubeCount));
            Assert.True((await scope.CreatePlatformWorkflowController().ScanTube(packet.Barcode, codes[index], default)).IsReceived);
            Assert.Equal(index == 9 ? "Received" : "ReadyToShip", progress.Status);
            Assert.Null(progress.ShippedAt);
            Assert.Null(progress.Carrier);
            Assert.Null(progress.TrackingNumber);
        }
        var otherProgress = await scope.CreateCustomerWorkflowController().Shipment(other.Id, default);
        Assert.Equal(0, otherProgress.ReceivedTubeCount);
        Assert.Equal(10, otherProgress.OrderReceivedTubeCount);
        Assert.Equal(30, otherProgress.OrderExpectedTubeCount);
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerShipmentSourceListingIncludesAllPackagesAndRetainsMemberReadOnlyScope()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync();
        var packages = new List<SampleShipment>();
        for (var index = 2; index <= 261; index++)
        {
            var shipment = new SampleShipment($"LIST-{scope.Suffix}-{index}", fixture.Shipment.OrganizationId, fixture.Shipment.DepartmentId,
                fixture.Shipment.AuthorizationSource, fixture.Shipment.AuthorizationSourceId, fixture.Shipment.AuthorizationReference,
                fixture.Shipment.AuthorizationName, fixture.WorkOrder.Id, fixture.Destination.Id);
            var item = new SampleShipmentItem(shipment.Id, fixture.Specimen.SubmittedSpecimenId, fixture.SampleType.Id,
                fixture.Item.CustomerSampleId, fixture.Item.SampleName, fixture.Item.Quantity, fixture.Item.QuantityUnit);
            item.TubeSlots.Add(new SampleShipmentTubeSlot(item.Id, index));
            shipment.Items.Add(item); packages.Add(shipment);
        }
        scope.DbContext.SampleShipments.AddRange(packages);
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        Assert.Equal(250, (await scope.CreateCustomerWorkflowController().Shipments(default)).Count);
        Assert.Equal(261, (await scope.CreateCustomerWorkflowController().Shipments(default, fixture.Shipment.AuthorizationSourceId)).Count);
        Assert.Equal(261, (await scope.CreatePlatformWorkflowController().Shipments(default, fixture.Shipment.AuthorizationSourceId)).Count);
        Assert.Empty(await scope.CreateOtherCustomerWorkflowController().Shipments(default, fixture.Shipment.AuthorizationSourceId));
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(item => item.UserId == scope.CustomerUser.Id && item.OrganizationId == scope.CustomerOrganization.Id);
        membership.SetOrganizationAdmin(false);
        scope.DbContext.OrganizationDepartmentMemberships.Add(new OrganizationDepartmentMembership(membership.Id, fixture.Shipment.DepartmentId));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        Assert.Equal(261, (await scope.CreateCustomerWorkflowController().Shipments(default, fixture.Shipment.AuthorizationSourceId)).Count);
        Assert.False((await scope.PackingController().Read(fixture.Shipment.Id, default)).CanPack);
        var blocked = await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Confirm(fixture.Shipment.Id,
            new(fixture.Shipment.Version, [new(Guid.NewGuid(), 1)]), default));
        Assert.Equal("department_admin_required", blocked.ErrorCode);
    }

    [PostgreSqlReferenceFact]
    public async Task BoundKitWithSharedPrintedValueDoesNotBlockAvailableManufacturerKit()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(1);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var db = scope.DbContext;
        var target = await db.SampleShipments.Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .SingleAsync(item => item.Id == fixture.Shipment.Id);
        target.SelectContainer(definition.Id, "{}");
        var previous = new SampleShipment($"PREVIOUS-{scope.Suffix}", target.OrganizationId, target.DepartmentId,
            target.AuthorizationSource, target.AuthorizationSourceId, target.AuthorizationReference,
            target.AuthorizationName, target.LabWorkOrderId, target.DestinationId);
        previous.SelectContainer(definition.Id, "{}");
        var barcode = $"SHARED-{scope.Suffix}";
        async Task<SampleShippingStockKit> Kit(string number)
        {
            var catalog = await scope.CatalogKitRequestAsync(Guid.NewGuid());
            var supplierId = (await db.LabSupplierProducts.AsNoTracking()
                .SingleAsync(item => item.Id == catalog.TubeSupplierProductId)).SupplierId;
            var barcodeNamespace = SupplierTubeBarcode.NamespaceForSupplier(supplierId);
            var kit = new SampleShippingStockKit(number, definition.Id, "{}", 1,
                "Tube maker", "TUBE", null, "Shipper maker", "SHIPPER",
                tubeSupplierProductId: catalog.TubeSupplierProductId,
                shipperSupplierProductId: catalog.ShipperSupplierProductId,
                productExpirySnapshotJson: "[]",
                tubeBarcodeNamespace: barcodeNamespace);
            kit.Tubes.Add(new SampleShippingStockTube(kit.Id, barcode, barcodeNamespace, catalog.TubeSupplierProductId));
            kit.VerifyTubeRoster(scope.PlatformUser.Id, [barcode], DateTime.UtcNow);
            kit.Dispatch(target, "TEST carrier", "TEST tracking", DateTime.UtcNow);
            return kit;
        }
        var used = await Kit($"USED-{scope.Suffix}");
        var available = await Kit($"READY-{scope.Suffix}");
        used.Bind(previous);
        db.AddRange(previous, used, available);
        await db.SaveChangesAsync();

        var bound = await SampleShippingPackingData.BindStockAsync(db, target, barcode, default);

        Assert.Equal(available.KitNumber, bound.KitNumber);
        Assert.Equal(available.TubeBarcodeNamespace, bound.TubeBarcodeNamespace);
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerStockConcurrentScansBindOnePhysicalKitToOnlyOneShipment()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var stock = scope.StockController();
        var createdResult = await stock.Create(await scope.CatalogKitRequestAsync(definition.Id), default);
        var kit = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(createdResult.Result).Value);
        scope.ClearTrackedState();
        var codes = Enumerable.Range(1, 20).Select(index => $"RACE-{scope.Suffix}-{index:00}").ToArray();
        kit = await stock.Register(kit.Id, new(codes, kit.Version), default);
        scope.ClearTrackedState();
        kit = await stock.VerifyTubes(kit.Id, new(kit.Version, codes), default);
        scope.ClearTrackedState();
        await scope.CompleteKitAssemblyAsync(kit.Id);
        kit = await stock.Read(kit.Id, default);
        await stock.Dispatch(kit.Id, new(fixture.Shipment.Id, kit.Version, "Reference carrier", "TEST-OUTBOUND", DateTime.UtcNow), default);
        scope.ClearTrackedState();
        var packed = await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 2)]), default);
        scope.ClearTrackedState();
        var shipmentIds = packed.Select(item => item.Id).ToArray();
        var shipments = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Where(item => shipmentIds.Contains(item.Id)).OrderBy(item => item.Id).ToArrayAsync();
        await using var first = scope.CreateAdditionalContext();
        await using var second = scope.CreateAdditionalContext();
        var results = await Task.WhenAll(Scan(first, shipments[0], codes[0]), Scan(second, shipments[1], codes[1]));
        Assert.Single(results, item => item is null);
        Assert.Single(results, item => item is OrderManagementException { StatusCode: 409 } or DbUpdateConcurrencyException);
        var stored = await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == kit.Id);
        Assert.Contains(stored.BoundSampleShipmentId!.Value, shipmentIds);
        Assert.Equal(1, await scope.DbContext.SampleReturnKits.CountAsync(item => shipmentIds.Contains(item.SampleShipmentId)));
        Assert.Equal(20, await scope.DbContext.RegisteredSampleTubes.CountAsync(item => codes.Contains(item.SupplierBarcode)));

        async Task<Exception?> Scan(PSeqOperationsDbContext db, SampleShipment shipment, string code)
        {
            var row = Assert.Single(shipment.Items); var slot = row.TubeSlots.First();
            return await CaptureAsync(() => scope.CustomerWorkflowFor(db).AssignTube(shipment.Id, row.Id, new(code, null, slot.Version, slot.Id, CustomerDeclaredQuantity: 20m, CustomerDeclaredQuantityUnit: "µL"), default));
        }
    }

    [PostgreSqlReferenceFact]
    public async Task PreparedKitRequiresExactPhysicalRescanAndRetainsCorrectionHistory()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(2);
        var definition = await scope.CreateContainerAsync(fixture, 2);
        var stock = scope.StockController();
        var result = await stock.Create(await scope.CatalogKitRequestAsync(definition.Id), default);
        var kit = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(result.Result).Value);
        scope.ClearTrackedState();
        var first = $"VERIFY-{scope.Suffix}-1";
        var second = $"VERIFY-{scope.Suffix}-2";
        var replacement = $"VERIFY-{scope.Suffix}-3";
        kit = await stock.Register(kit.Id, new([first, second], kit.Version), default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() =>
            stock.VerifyTubes(kit.Id, new(kit.Version, [first, replacement]), default));
        kit = await stock.VerifyTubes(kit.Id, new(kit.Version, [second, first]), default);
        Assert.NotNull(kit.TubesVerifiedAt);
        scope.ClearTrackedState();
        kit = await stock.CorrectTube(kit.Id, new(kit.Version, second, replacement, "Wrong physical tube scanned"), default);
        Assert.Null(kit.TubesVerifiedAt);
        Assert.Equal(replacement, Assert.Single(kit.TubeCorrections!).ReplacementBarcode);
        scope.ClearTrackedState();
        kit = await stock.VerifyTubes(kit.Id, new(kit.Version, [first, replacement]), default);
        Assert.NotNull(kit.TubesVerifiedAt);
        Assert.Equal(2, await scope.DbContext.SampleShippingStockTubes.CountAsync(tube => tube.SampleShippingStockKitId == kit.Id));
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerPackingCustomCountsSupportEvenSplitsAndSkipEmptyExtras()
    {
        foreach (var counts in new[] { new[] { 15, 15 }, new[] { 10, 10, 10 }, new[] { 15, 0, 15 } })
        {
            await using var scope = await ShippingTestScope.CreateAsync();
            var fixture = await scope.CreateShipmentAsync(30);
            var definition = await scope.CreateContainerAsync(fixture, 20);
            var result = await scope.PackingController().Confirm(fixture.Shipment.Id,
                new(fixture.Shipment.Version, [new(definition.Id, counts.Length)], ContainerTubeCounts: counts), default);
            Assert.Equal(counts.Count(count => count > 0), result.Count);
            Assert.Equal(counts.Where(count => count > 0), result.Select(item => item.ExpectedTubeCount));
            var persisted = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
                .Where(item => item.AuthorizationSourceId == fixture.Shipment.AuthorizationSourceId && item.Status != SampleShipmentStatus.Cancelled).ToListAsync();
            Assert.Equal(Enumerable.Range(1, 30), persisted.SelectMany(item => item.Items).SelectMany(item => item.TubeSlots).Select(item => item.Ordinal).Order());
        }
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerPackingRejectsInvalidCustomCountsWithoutChangingTheSource()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        foreach (var counts in new[] { new[] { 30 }, new[] { 21, 9 }, new[] { -1, 31 }, new[] { 10, 10 } })
        {
            var exception = await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Confirm(fixture.Shipment.Id,
                new(fixture.Shipment.Version, [new(definition.Id, 2)], ContainerTubeCounts: counts), default));
            Assert.Equal("sample_packing_invalid", exception.ErrorCode);
            scope.ClearTrackedState();
            var source = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
                .SingleAsync(item => item.Id == fixture.Shipment.Id);
            Assert.False(source.IsPackingPool);
            Assert.Equal(30, source.Items.Sum(item => item.TubeSlots.Count));
            Assert.Equal(fixture.Shipment.Version, source.Version);
        }
    }

    private sealed partial class ShippingTestScope
    {
        public SampleShippingContainerCatalogService ContainerCatalog() => new(DbContext);
        public Task<IReadOnlyList<ContainerSampleTypeContext>> ContainerContextsAsync(ShippingFixture fixture)
            => Task.FromResult<IReadOnlyList<ContainerSampleTypeContext>>([new(fixture.SampleType.Id)]);
        public async Task<SampleShippingContainerDefinitionDto> CreateContainerAsync(ShippingFixture fixture, int capacity, bool active = true)
        {
            var sku = $"PACK-{Suffix}-{capacity}-{Guid.NewGuid():N}";
            var internalSupplier = await DbContext.LabSuppliers.SingleAsync(item => item.IsInternalProducer);
            var product = new PSeq.Operations.Laboratory.Domain.LabSupplierProduct(internalSupplier.Id, sku,
                $"Reference {capacity} tubes", PSeq.Operations.Laboratory.Domain.LabProductType.TransportationKitId);
            DbContext.LabSupplierProducts.Add(product);
            var contents = await KitContentsAsync(capacity);
            var componentProductIds = contents.Select(part => part.SupplierProductId).ToArray();
            var componentProducts = await DbContext.LabSupplierProducts.AsNoTracking()
                .Where(item => componentProductIds.Contains(item.Id)).ToArrayAsync();
            var workflow = new PSeq.Operations.Laboratory.Domain.LabKitAssemblyWorkflow(product.Id);
            var now = DateTime.UtcNow;
            var step = new PSeq.Operations.Laboratory.Domain.LabStep($"PACK-{Suffix}-{Guid.NewGuid():N}",
                $"Reference kit assembly {sku}", null);
            step.RecordVersion(1);
            var stepVersion = new PSeq.Operations.Laboratory.Domain.LabStepVersion(step.Id, 1,
                LabStepTests.Definition().ToJson(), PlatformUser.Id, now);
            stepVersion.ApproveWithOverride(PlatformUser.Id, now, "Reference fixture");
            stepVersion.Activate(PlatformUser.Id);
            var revision = new PSeq.Operations.Laboratory.Domain.LabKitAssemblyWorkflowRevision(workflow.Id, 1,
                [new(stepVersion.Id, "Pack reference kit", "Use the approved bill of materials.")], PlatformUser.Id, now);
            for (var position = 0; position < contents.Count; position++)
            {
                var part = contents[position];
                var componentProduct = componentProducts.Single(item => item.Id == part.SupplierProductId);
                var kind = componentProduct.ProductTypeId == PSeq.Operations.Laboratory.Domain.LabProductType.TubeId
                    ? "Tube" : "ShippingContainer";
                revision.Components.Add(new(revision.Id, part.SupplierProductId, part.Quantity, kind, position));
            }
            revision.Approve(PlatformUser.Id, now, "Reference fixture", true);
            DbContext.AddRange(step, stepVersion, workflow, revision);
            await DbContext.SaveChangesAsync();
            ClearTrackedState();
            var draft = await ContainerCatalog().CreateAsync(new(sku, product.Description, capacity,
                now.AddDays(-1), IsActive: false, KitContents: contents, FinishedKitProductId: product.Id,
                AssemblyWorkflowRevisionId: revision.Id, PackingInstructions: "Pack the approved tubes in sealed secondary containment.",
                TemperatureControlInstructions: "Keep this container frozen in transit."), default);
            ClearTrackedState();
            var linked = await ContainerCatalog().LinkSampleTypeAsync(draft.Id, fixture.SampleType.Id,
                draft.Version, PlatformUser.Id, default);
            ClearTrackedState();
            var result = active
                ? await ContainerCatalog().ReviseAsync(draft.Id, new(linked.Version, product.Description, capacity,
                    now, IsActive: true, KitContents: contents, AssemblyWorkflowRevisionId: revision.Id,
                    PackingInstructions: "Pack the approved tubes in sealed secondary containment.",
                    TemperatureControlInstructions: "Keep this container frozen in transit."), default)
                : linked;
            ClearTrackedState();
            return result;
        }
        public async Task<IReadOnlyList<SampleShippingContainerDefinitionDto>> CreateStandardContainersAsync(ShippingFixture fixture)
        {
            var result = new List<SampleShippingContainerDefinitionDto>();
            foreach (var capacity in new[] { 20, 10, 5 }) result.Add(await CreateContainerAsync(fixture, capacity));
            return result;
        }
        public SampleShipmentPackingController PackingController(bool otherTenant = false, PSeqOperationsDbContext? dbOverride = null)
        {
            var db = dbOverride ?? DbContext;
            var http = new DefaultHttpContext();
            http.Request.Headers["X-Organization-Id"] = (otherTenant ? OtherCustomerOrganization.Id : CustomerOrganization.Id).ToString();
            return new(db, new OrderRequestContext(db, new FixedIdentityContext(otherTenant ? otherCustomerIdentity : customerIdentity)),
                new SampleShippingContainerCatalogService(db), new SampleShippingWorkflowReader(db)) { ControllerContext = new() { HttpContext = http } };
        }
        public SampleShippingContainersAdminController ContainerAdminController(bool customer = false) => new(
            new OrderRequestContext(DbContext, new FixedIdentityContext(customer ? customerIdentity : platformIdentity)), ContainerCatalog())
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        public SampleShippingStockKitsController StockController(PSeqOperationsDbContext? dbOverride = null) => new(dbOverride ?? DbContext,
            new OrderRequestContext(dbOverride ?? DbContext, new FixedIdentityContext(platformIdentity)),
            new SampleShippingContainerCatalogService(dbOverride ?? DbContext),
            new TransportationKitRequestService(dbOverride ?? DbContext, new SampleShippingContainerCatalogService(dbOverride ?? DbContext),
                Microsoft.Extensions.Options.Options.Create(new PhaenoPortal.App.Features.Accounts.Services.BootstrapOptions { PhaenoOrganizationName = PlatformOrganization.Name })))
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        public SampleShippingIdentityController IdentityController() => new(DbContext,
            new OrderRequestContext(DbContext, new FixedIdentityContext(platformIdentity)), new SampleShippingWorkflowReader(DbContext))
            { ControllerContext = new() { HttpContext = new DefaultHttpContext() } };
        public SampleShippingWorkflowController CustomerWorkflowFor(PSeqOperationsDbContext db)
        {
            var http = new DefaultHttpContext(); http.Request.Headers["X-Organization-Id"] = CustomerOrganization.Id.ToString();
            return new(db, new OrderRequestContext(db, new FixedIdentityContext(customerIdentity)), new SampleShippingPacketService(db),
                new SampleShippingWorkflowReader(db)) { ControllerContext = new() { HttpContext = http } };
        }

        public async Task<IReadOnlyList<ShippingKitContentRequest>> KitContentsAsync(int capacity)
        {
            var products = await CatalogKitRequestAsync(Guid.NewGuid());
            return [new(products.ShipperSupplierProductId, 1), new(products.TubeSupplierProductId, capacity)];
        }

        public async Task<CreateStockKitRequest> CatalogKitRequestAsync(Guid definitionId, string? lot = null)
        {
            var approvedParts = await DbContext.Set<ShippingKitContent>().AsNoTracking()
                .Where(item => item.ContainerDefinitionId == definitionId).ToArrayAsync();
            if (approvedParts.Length > 0)
            {
                var tubePart = approvedParts.Single(item => item.Kind == ShippingKitContentKind.Tube);
                var shipperPart = approvedParts.Single(item => item.Kind == ShippingKitContentKind.ShippingContainer);
                return new(definitionId, tubePart.SupplierProductId, shipperPart.SupplierProductId, lot);
            }
            var supplier = new PSeq.Operations.Laboratory.Domain.LabSupplier($"TEST-CATALOG-{Suffix}-{Guid.NewGuid():N}");
            var tube = new PSeq.Operations.Laboratory.Domain.LabSupplierProduct(supplier.Id, "T-1", "TEST ONLY tube", PSeq.Operations.Laboratory.Domain.LabProductType.TubeId);
            var shipper = new PSeq.Operations.Laboratory.Domain.LabSupplierProduct(supplier.Id, "B-1", "TEST ONLY shipper", PSeq.Operations.Laboratory.Domain.LabProductType.ShippingContainerId);
            tube.SetDefaultQuantityUnit("each");
            shipper.SetDefaultQuantityUnit("each");
            DbContext.AddRange(supplier, tube, shipper);
            await DbContext.SaveChangesAsync();
            return new(definitionId, tube.Id, shipper.Id, lot);
        }

        public async Task CompleteKitAssemblyAsync(Guid kitId)
        {
            ClearTrackedState();
            var lab = CreateLabController();
            var run = await lab.ReadKitAssemblyRun(kitId, default);
            foreach (var step in run.Steps.Select((value, index) => (value, index)))
                run = await lab.RecordKitAssemblyStep(kitId,
                    new(run.Version, step.index, "Reference assembly step completed."), default);
            foreach (var component in run.Components)
                run = await lab.RecordKitAssemblyUse(kitId,
                    new(run.Version, component.SupplierProductId, component.Quantity), default);
            await lab.CompleteKitAssembly(kitId, new(run.Version), default);
            ClearTrackedState();
        }

        private async Task CleanupContainerStockAsync()
        {
            var typeIds = await DbContext.SampleShippingContainerTypes.Where(item => item.Sku.StartsWith($"PACK-{Suffix}-")).Select(item => item.Id).ToArrayAsync();
            var definitionIds = await DbContext.SampleShippingContainerDefinitions.Where(item => typeIds.Contains(item.ContainerTypeId)).Select(item => item.Id).ToArrayAsync();
            var stockIds = await DbContext.SampleShippingStockKits.Where(item => definitionIds.Contains(item.ContainerDefinitionId)).Select(item => item.Id).ToArrayAsync();
            var assemblyRunIds = await DbContext.LabKitAssemblyRuns.Where(item => stockIds.Contains(item.StockKitId))
                .Select(item => item.Id).ToArrayAsync();
            await DbContext.LabKitAssemblyStepRecords.Where(item => assemblyRunIds.Contains(item.RunId)).ExecuteDeleteAsync();
            await DbContext.LabKitAssemblyUses.Where(item => assemblyRunIds.Contains(item.RunId)).ExecuteDeleteAsync();
            await DbContext.LabKitAssemblyRuns.Where(item => assemblyRunIds.Contains(item.Id)).ExecuteDeleteAsync();
            await DbContext.SampleShippingStockTubeCorrections.Where(item => stockIds.Contains(item.SampleShippingStockKitId)).ExecuteDeleteAsync();
            await DbContext.SampleShippingStockTubes.Where(item => stockIds.Contains(item.SampleShippingStockKitId)).ExecuteDeleteAsync();
            await DbContext.SampleShippingStockKits.Where(item => stockIds.Contains(item.Id)).ExecuteDeleteAsync();
            await DbContext.Set<ShippingKitContent>().Where(item => definitionIds.Contains(item.ContainerDefinitionId)).ExecuteDeleteAsync();
        }
        private async Task CleanupContainerDefinitionsAsync()
        {
            var typeIds = await DbContext.SampleShippingContainerTypes.Where(item => item.Sku.StartsWith($"PACK-{Suffix}-")).Select(item => item.Id).ToArrayAsync();
            var definitions = await DbContext.SampleShippingContainerDefinitions.Where(item => typeIds.Contains(item.ContainerTypeId)).OrderByDescending(item => item.Revision).ToArrayAsync();
            var ids = definitions.Select(item => item.Id).ToArray();
            await DbContext.Set<ShippingKitContent>().Where(item => ids.Contains(item.ContainerDefinitionId)).ExecuteDeleteAsync();
            foreach (var definition in definitions) await DbContext.SampleShippingContainerDefinitions.Where(item => item.Id == definition.Id).ExecuteDeleteAsync();
            await DbContext.SampleShippingContainerTypes.Where(item => typeIds.Contains(item.Id)).ExecuteDeleteAsync();
            var workflowIds = await DbContext.LabKitAssemblyWorkflows.Where(item => item.FinishedKitProductId != Guid.Empty
                && DbContext.LabSupplierProducts.Any(product => product.Id == item.FinishedKitProductId
                    && product.ProductNumber.StartsWith($"PACK-{Suffix}-"))).Select(item => item.Id).ToArrayAsync();
            var workflowRevisionIds = await DbContext.LabKitAssemblyWorkflowRevisions
                .Where(item => workflowIds.Contains(item.WorkflowId)).Select(item => item.Id).ToArrayAsync();
            await DbContext.LabKitAssemblyComponents.Where(item => workflowRevisionIds.Contains(item.WorkflowRevisionId)).ExecuteDeleteAsync();
            await DbContext.LabKitAssemblyWorkflowRevisions.Where(item => workflowRevisionIds.Contains(item.Id)).ExecuteDeleteAsync();
            await DbContext.LabKitAssemblyWorkflows.Where(item => workflowIds.Contains(item.Id)).ExecuteDeleteAsync();
            var stepIds = await DbContext.LabSteps.Where(item => item.Key.StartsWith($"PACK-{Suffix}-"))
                .Select(item => item.Id).ToArrayAsync();
            await DbContext.LabStepVersions.Where(item => stepIds.Contains(item.LabStepId)).ExecuteDeleteAsync();
            await DbContext.LabSteps.Where(item => stepIds.Contains(item.Id)).ExecuteDeleteAsync();
            await DbContext.LabSupplierProducts.Where(item => item.ProductNumber.StartsWith($"PACK-{Suffix}-")).ExecuteDeleteAsync();
            var supplierIds = await DbContext.LabSuppliers.Where(item => item.Name.StartsWith($"TEST-CATALOG-{Suffix}-")).Select(item => item.Id).ToArrayAsync();
            await DbContext.LabSupplierProducts.Where(item => supplierIds.Contains(item.SupplierId)).ExecuteDeleteAsync();
            await DbContext.LabSuppliers.Where(item => supplierIds.Contains(item.Id)).ExecuteDeleteAsync();
        }
    }
}
