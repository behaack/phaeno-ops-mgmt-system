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
    public async Task ContainerCatalogRequiresPhaenoConfigurationAccessAndExactCompatibilityPairs()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var denied = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ContainerAdminController(customer: true).List(default));
        Assert.Equal(StatusCodes.Status403Forbidden, denied.StatusCode);
        var pairs = await scope.ContainerContextsAsync(fixture);
        var mismatch = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ContainerCatalog().CreateAsync(new(
            $"PACK-{scope.Suffix}-INVALID", "Invalid pairing", 20, DateTime.UtcNow.AddDays(-2),
            [new(Guid.NewGuid(), pairs[0].InstructionRuleId)]), default));
        Assert.Equal("shipping_container_invalid", mismatch.ErrorCode);
        var empty = await Assert.ThrowsAsync<OrderManagementException>(() => scope.ContainerCatalog().ReadCompatibleAsync([], default));
        Assert.Equal("shipping_container_invalid", empty.ErrorCode);
        var original = await scope.DbContext.SampleShippingInstructionRules.AsNoTracking().SingleAsync(item => item.Id == pairs[0].InstructionRuleId);
        var next = await scope.CreateConfigurationController().CreateInstructionRule(scope.RuleRequest(fixture.Destination.Id,
            fixture.SampleType.Id, DateTime.UtcNow.AddHours(1), original.Id, original.Version), default);
        scope.ClearTrackedState();
        var both = new[] { pairs[0], new ContainerCompatibilityRequest(fixture.SampleType.Id, next.Id) };
        await scope.ContainerCatalog().CreateAsync(new($"PACK-{scope.Suffix}-20", "One context", 20,
            DateTime.UtcNow.AddDays(-2), pairs, IsActive: true), default);
        var compatible = await scope.ContainerCatalog().CreateAsync(new($"PACK-{scope.Suffix}-BOTH", "Both contexts", 10,
            DateTime.UtcNow.AddDays(-2), both, IsActive: true), default);
        scope.ClearTrackedState();
        Assert.Equal(compatible.Id, Assert.Single(await scope.ContainerCatalog().ReadCompatibleAsync(both, default)).Id);
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
    public async Task ContainerCatalogDraftPreviewRevisionsAndDeactivationPreserveFrozenShipmentFacts()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var catalog = scope.ContainerCatalog();
        var pairs = await scope.ContainerContextsAsync(fixture);
        var draft = await scope.CreateContainerAsync(fixture, 20, false);
        Assert.False(draft.IsActive);
        Assert.Empty(await catalog.ReadCompatibleAsync(pairs, default));
        Assert.Equal(draft.Id, Assert.Single(await catalog.ReadCompatibleAsync(pairs, default, draft.Id)).Id);
        var duplicate = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.CreateAsync(new(
            draft.Sku.ToLowerInvariant(), "Duplicate SKU", 20, DateTime.UtcNow.AddDays(-2), pairs), default));
        Assert.Equal("shipping_container_conflict", duplicate.ErrorCode);
        scope.ClearTrackedState();
        var live = await catalog.ReviseAsync(draft.Id, new(draft.Version, "Twenty tubes", 20,
            DateTime.UtcNow.AddDays(-1), pairs, IsActive: true), default);
        scope.ClearTrackedState();
        await Assert.ThrowsAsync<OrderManagementException>(() => catalog.ReadCompatibleAsync(pairs, default, live.Id));
        var source = await scope.DbContext.SampleShipments.SingleAsync(item => item.Id == fixture.Shipment.Id);
        source.SelectContainer(live.Id, SampleShippingContainerCatalogService.Snapshot(live));
        await scope.DbContext.SaveChangesAsync();
        scope.ClearTrackedState();
        var revision = await catalog.ReviseAsync(live.Id, new(live.Version, "Revised container", 25,
            DateTime.UtcNow.AddHours(-1), pairs, IsActive: true), default);
        scope.ClearTrackedState();
        Assert.Equal(revision.Id, Assert.Single(await catalog.ReadCompatibleAsync(pairs, default)).Id);
        Assert.Equal(20, (await catalog.ReadAsync(live.Id, default)).TubeCapacity);
        Assert.NotNull((await catalog.ReadAsync(live.Id, default)).EffectiveTo);
        var stored = await scope.DbContext.SampleShipments.AsNoTracking().SingleAsync(item => item.Id == source.Id);
        Assert.Equal(live.Id, stored.ContainerDefinitionId);
        using var frozen = JsonDocument.Parse(stored.ContainerSnapshotJson!);
        Assert.Equal(20, frozen.RootElement.GetProperty("tubeCapacity").GetInt32());
        var deactivated = await catalog.DeactivateAsync(revision.Id, revision.Version, default);
        Assert.NotNull(deactivated.DeactivatedAt);
        Assert.False(deactivated.IsActive);
        scope.ClearTrackedState();
        Assert.Empty(await catalog.ReadCompatibleAsync(pairs, default));
        await Assert.ThrowsAsync<OrderManagementException>(() => catalog.ReadCompatibleAsync(pairs, default, revision.Id));
        Assert.Equal(3, (await catalog.ReadRevisionsAsync(revision.Id, default)).Count);
        var stale = await Assert.ThrowsAsync<OrderManagementException>(() => catalog.DeactivateAsync(revision.Id, revision.Version, default));
        Assert.Equal("shipping_container_conflict", stale.ErrorCode);
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
        var createdResult = await stock.Create(new(definition.Id, "Supplier", "T-1", null, "Shipper", "B-1"), default);
        var created = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(createdResult.Result).Value);
        scope.ClearTrackedState();
        var codes = Enumerable.Range(1, 20).Select(index => $"STK-{scope.Suffix}-{index:00}").ToArray();
        var registered = await stock.Register(created.Id, new(codes, created.Version), default);
        scope.ClearTrackedState();
        var dispatched = await stock.Dispatch(created.Id, new(fixture.Shipment.Id, registered.Version, "Reference carrier", "TEST-OUTBOUND", DateTime.UtcNow), default);
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
        await scope.CreateCustomerWorkflowController().AssignTube(partial.Id, row.Id, new(codes[0], null, slot.Version, TubeSlotId: slot.Id), default);
        scope.ClearTrackedState();
        var bound = await stock.Read(created.Id, default);
        Assert.Equal("InUse", bound.Status); Assert.Equal(partial.Id, bound.BoundSampleShipmentId);
        var legacyKit = await scope.DbContext.SampleReturnKits.AsNoTracking().Include(item => item.Tubes).SingleAsync(item => item.SampleShipmentId == partial.Id);
        Assert.Equal(SampleReturnKitStatus.Fulfilled, legacyKit.Status);
        Assert.Equal(20, legacyKit.Tubes.Count);
        Assert.Equal(1, legacyKit.Tubes.Count(item => item.Status == RegisteredSampleTubeStatus.Assigned));
        var otherRow = Assert.Single(other.Items); var otherSlot = otherRow.TubeSlots.First();
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.CreateCustomerWorkflowController().AssignTube(other.Id, otherRow.Id,
            new(codes[1], null, otherSlot.Version, TubeSlotId: otherSlot.Id), default));
        scope.ClearTrackedState();
        var orderedSlots = row.TubeSlots.OrderBy(item => item.Ordinal).ToArray();
        for (var index = 1; index < orderedSlots.Length; index++)
        {
            await scope.CreateCustomerWorkflowController().AssignTube(partial.Id, row.Id,
                new(codes[index], null, orderedSlots[index].Version, orderedSlots[index].Id), default);
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
    public async Task ContainerStockConcurrentScansBindOnePhysicalKitToOnlyOneShipment()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var stock = scope.StockController();
        var createdResult = await stock.Create(new(definition.Id, "Supplier", "T-1", null, "Shipper", "B-1"), default);
        var kit = Assert.IsType<StockKitDto>(Assert.IsType<CreatedResult>(createdResult.Result).Value);
        scope.ClearTrackedState();
        var codes = Enumerable.Range(1, 20).Select(index => $"RACE-{scope.Suffix}-{index:00}").ToArray();
        kit = await stock.Register(kit.Id, new(codes, kit.Version), default);
        scope.ClearTrackedState();
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
            return await CaptureAsync(() => scope.CustomerWorkflowFor(db).AssignTube(shipment.Id, row.Id, new(code, null, slot.Version, slot.Id), default));
        }
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
        public async Task<IReadOnlyList<ContainerCompatibilityRequest>> ContainerContextsAsync(ShippingFixture fixture)
        {
            var rule = await DbContext.SampleShippingInstructionRules.AsNoTracking().SingleAsync(item => item.SampleTypeDefinitionId == fixture.SampleType.Id);
            return [new(fixture.SampleType.Id, rule.Id)];
        }
        public async Task<SampleShippingContainerDefinitionDto> CreateContainerAsync(ShippingFixture fixture, int capacity, bool active = true)
        {
            var result = await ContainerCatalog().CreateAsync(new($"PACK-{Suffix}-{capacity}", $"Reference {capacity} tubes", capacity,
                DateTime.UtcNow.AddDays(-2), await ContainerContextsAsync(fixture), IsActive: active), default);
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

        private async Task CleanupContainerStockAsync()
        {
            var typeIds = await DbContext.SampleShippingContainerTypes.Where(item => item.Sku.StartsWith($"PACK-{Suffix}-")).Select(item => item.Id).ToArrayAsync();
            var definitionIds = await DbContext.SampleShippingContainerDefinitions.Where(item => typeIds.Contains(item.ContainerTypeId)).Select(item => item.Id).ToArrayAsync();
            var stockIds = await DbContext.SampleShippingStockKits.Where(item => definitionIds.Contains(item.ContainerDefinitionId)).Select(item => item.Id).ToArrayAsync();
            await DbContext.SampleShippingStockTubes.Where(item => stockIds.Contains(item.SampleShippingStockKitId)).ExecuteDeleteAsync();
            await DbContext.SampleShippingStockKits.Where(item => stockIds.Contains(item.Id)).ExecuteDeleteAsync();
        }
        private async Task CleanupContainerDefinitionsAsync()
        {
            var typeIds = await DbContext.SampleShippingContainerTypes.Where(item => item.Sku.StartsWith($"PACK-{Suffix}-")).Select(item => item.Id).ToArrayAsync();
            var definitions = await DbContext.SampleShippingContainerDefinitions.Where(item => typeIds.Contains(item.ContainerTypeId)).OrderByDescending(item => item.Revision).ToArrayAsync();
            var ids = definitions.Select(item => item.Id).ToArray();
            await DbContext.SampleShippingContainerCompatibilities.Where(item => ids.Contains(item.ContainerDefinitionId)).ExecuteDeleteAsync();
            foreach (var definition in definitions) await DbContext.SampleShippingContainerDefinitions.Where(item => item.Id == definition.Id).ExecuteDeleteAsync();
            await DbContext.SampleShippingContainerTypes.Where(item => typeIds.Contains(item.Id)).ExecuteDeleteAsync();
        }
    }
}
