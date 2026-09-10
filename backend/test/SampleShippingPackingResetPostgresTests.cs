namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task ContainerResetRestoresAllPhysicalSlotsAndRetainsRetiredContainerIdentity()
    {
        foreach (var tubeCount in new[] { 18, 30 })
        {
            await using var scope = await ShippingTestScope.CreateAsync();
            var fixture = await scope.CreateShipmentAsync(tubeCount);
            var definition = await scope.CreateContainerAsync(fixture, 20);
            var before = await scope.ResetFamilySlotsAsync(fixture);
            var specimenBefore = await scope.DbContext.LabSpecimens.AsNoTracking().SingleAsync(item => item.Id == fixture.Specimen.Id);
            var containers = await scope.PackingController().Confirm(fixture.Shipment.Id,
                new(fixture.Shipment.Version, [new(definition.Id, 2)], ContainerTubeCounts: [tubeCount / 2, tubeCount / 2]), default);
            scope.ClearTrackedState();
            var review = await scope.PackingController().ReadReset(containers[0].Id, default);
            Assert.True(review.CanReset); Assert.Equal(2, review.ContainerCount); Assert.Equal(tubeCount, review.TubeCount);
            var result = await scope.PackingController().Reset(containers[0].Id, new(review.Shipments), default);
            scope.ClearTrackedState();
            Assert.True(result.IsPackingPool); Assert.Equal(tubeCount, result.ExpectedTubeCount);
            Assert.Equal(before, await scope.ResetFamilySlotsAsync(fixture));
            var retired = await scope.DbContext.SampleShipments.AsNoTracking().Where(item => containers.Select(value => value.Id).Contains(item.Id)).ToArrayAsync();
            Assert.All(retired, item => { Assert.Equal(SampleShipmentStatus.Cancelled, item.Status); Assert.Equal(definition.Id, item.ContainerDefinitionId); Assert.NotNull(item.ContainerSnapshotJson); });
            var specimenAfter = await scope.DbContext.LabSpecimens.AsNoTracking().SingleAsync(item => item.Id == fixture.Specimen.Id);
            Assert.Equal(specimenBefore.Version, specimenAfter.Version); Assert.Equal(specimenBefore.SubmittedSpecimenId, specimenAfter.SubmittedSpecimenId);
            var retiredReview = await scope.PackingController().ReadReset(containers[0].Id, default);
            Assert.False(retiredReview.CanReset);
            Assert.Equal("This container selection is no longer active. Open a current prepared container to change the containers for this job.", retiredReview.BlockedReason);
            Assert.Equal(409, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Reset(containers[0].Id, new(review.Shipments), default))).StatusCode);
            // A retired URL cannot unwind a later replacement plan.
            var replacement = await scope.PackingController().Confirm(result.Id, new(result.Version, [new(definition.Id, 2)]), default);
            scope.ClearTrackedState();
            await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Reset(containers[0].Id, new(review.Shipments), default));
            Assert.All(replacement, item => Assert.Equal(SampleShipmentStatus.Preparing, scope.DbContext.SampleShipments.AsNoTracking().Single(value => value.Id == item.Id).Status));
        }
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerResetMergesResidualPoolAndPreservesSourceIdentifiersAndQuantities()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var before = await scope.ResetFamilySlotsAsync(fixture);
        var packed = await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 1)]), default);
        scope.ClearTrackedState();
        var physical = packed.Single(item => !item.IsPackingPool);
        var review = await scope.PackingController().ReadReset(physical.Id, default);
        Assert.Equal(2, review.Shipments.Count);
        var pool = await scope.PackingController().Reset(physical.Id, new(review.Shipments), default);
        Assert.Equal(fixture.Shipment.Id, pool.Id); Assert.Equal(30, pool.ExpectedTubeCount);
        scope.ClearTrackedState();
        var row = await scope.DbContext.SampleShipmentItems.AsNoTracking().SingleAsync(item => item.SampleShipmentId == pool.Id);
        Assert.Equal(fixture.Item.Id, row.Id); Assert.Equal(fixture.Item.SubmittedSpecimenId, row.SubmittedSpecimenId);
        Assert.Equal(fixture.Item.Quantity, row.Quantity); Assert.Equal(fixture.Item.QuantityUnit, row.QuantityUnit);
        Assert.Equal(before, await scope.ResetFamilySlotsAsync(fixture));
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerResetSeparatesDestinationContextsWithoutLosingSplitSampleOrdinals()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(18);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var first = Assert.Single(await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 1)]), default));
        scope.ClearTrackedState();
        var destination = await scope.CreateConfigurationController().CreateDestination(scope.DestinationRequest(DateTime.UtcNow.AddDays(-1))
            with { Code = $"REF_{scope.Suffix}_DEST_RESET", Name = "Other reference destination" }, default);
        scope.ClearTrackedState();
        var rule = await scope.CreateConfigurationController().CreateInstructionRule(scope.RuleRequest(destination.Id, fixture.SampleType.Id, DateTime.UtcNow.AddDays(-1)), default);
        scope.ClearTrackedState();
        var secondDefinition = await scope.ContainerCatalog().CreateAsync(new($"PACK-{scope.Suffix}-OTHER", "Other destination container", 20,
            DateTime.UtcNow.AddDays(-1), [new(fixture.SampleType.Id, rule.Id)], IsActive: true), default);
        var second = new SampleShipment($"RESET-{scope.Suffix}", fixture.Shipment.OrganizationId, fixture.Shipment.DepartmentId,
            fixture.Shipment.AuthorizationSource, fixture.Shipment.AuthorizationSourceId, fixture.Shipment.AuthorizationReference,
            fixture.Shipment.AuthorizationName, fixture.WorkOrder.Id, destination.Id);
        second.SelectContainer(secondDefinition.Id, SampleShippingContainerCatalogService.Snapshot(secondDefinition));
        var row = new SampleShipmentItem(second.Id, fixture.Item.SubmittedSpecimenId, fixture.SampleType.Id,
            fixture.Item.CustomerSampleId, fixture.Item.SampleName, fixture.Item.Quantity, fixture.Item.QuantityUnit);
        foreach (var ordinal in Enumerable.Range(19, 12)) row.TubeSlots.Add(new SampleShipmentTubeSlot(row.Id, ordinal));
        second.Items.Add(row); scope.DbContext.SampleShipments.Add(second); await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        var before = await scope.ResetFamilySlotsAsync(fixture);
        var review = await scope.PackingController().ReadReset(first.Id, default);
        var result = await scope.PackingController().Reset(first.Id, new(review.Shipments), default);
        scope.ClearTrackedState();
        var pools = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
            .Where(item => item.AuthorizationSourceId == fixture.Shipment.AuthorizationSourceId && item.Status != SampleShipmentStatus.Cancelled).ToArrayAsync();
        Assert.Equal(2, pools.Length); Assert.All(pools, item => Assert.True(item.IsPackingPool));
        Assert.Equal(fixture.Destination.Id, pools.Single(item => item.Id == result.Id).DestinationId);
        Assert.Equal(18, SampleShippingPackingData.TubeCount(pools.Single(item => item.DestinationId == fixture.Destination.Id)));
        Assert.Equal(12, SampleShippingPackingData.TubeCount(pools.Single(item => item.DestinationId == destination.Id)));
        Assert.Equal(before, await scope.ResetFamilySlotsAsync(fixture));
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerResetRetainsTenantAndAdministratorBoundariesAndRejectsStaleFamily()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var packed = await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 2)]), default);
        scope.ClearTrackedState();
        var review = await scope.PackingController().ReadReset(packed[0].Id, default);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController(otherTenant: true).ReadReset(packed[0].Id, default))).StatusCode);
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController(otherTenant: true).Reset(packed[0].Id, new(review.Shipments), default))).StatusCode);
        var membership = await scope.DbContext.OrganizationMemberships.SingleAsync(item => item.UserId == scope.CustomerUser.Id && item.OrganizationId == scope.CustomerOrganization.Id);
        membership.SetOrganizationAdmin(false);
        scope.DbContext.OrganizationDepartmentMemberships.Add(new OrganizationDepartmentMembership(membership.Id, fixture.Shipment.DepartmentId));
        await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        Assert.False((await scope.PackingController().ReadReset(packed[0].Id, default)).CanReset);
        Assert.Equal(403, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Reset(packed[0].Id, new(review.Shipments), default))).StatusCode);
        membership = await scope.DbContext.OrganizationMemberships.SingleAsync(item => item.Id == membership.Id);
        membership.SetOrganizationAdmin(true); await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
        foreach (var wrong in new[] { review.Shipments.Skip(1).ToArray(), review.Shipments.Select((item, index) => index == 0 ? item with { Version = item.Version + 1 } : item).ToArray() })
            Assert.Equal(409, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Reset(packed[0].Id, new(wrong), default))).StatusCode);
        Assert.Equal(30, (await scope.ResetFamilySlotsAsync(fixture)).Length);
        Assert.All(packed, item => Assert.Equal(SampleShipmentStatus.Preparing, scope.DbContext.SampleShipments.AsNoTracking().Single(value => value.Id == item.Id).Status));
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerResetBlocksScanningClearedMatchesCancelledHistoryAndShipmentProgress()
    {
        foreach (var evidence in new[] { "scan", "cleared", "cancelled", "kit", "voided-packet", "ready-to-ship", "shipped", "delivered", "received", "bound-stock" })
        {
            await using var scope = await ShippingTestScope.CreateAsync();
            var fixture = await scope.CreateShipmentAsync(30);
            var definition = await scope.CreateContainerAsync(fixture, 20);
            var packed = await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 2)]), default);
            scope.ClearTrackedState();
            var reviewed = await scope.PackingController().ReadReset(packed[0].Id, default);
            var changed = await scope.DbContext.SampleShipments.Include(item => item.Items).ThenInclude(item => item.TubeSlots).SingleAsync(item => item.Id == packed[1].Id);
            var packetEvidence = evidence is "voided-packet" or "ready-to-ship" or "shipped" or "delivered" or "received";
            if (packetEvidence)
            {
                var packet = new SampleShippingPacketRevision(changed.Id, 1, $"RESET-PACKET-{scope.Suffix}", SampleShippingBarcode.Create(), "{}", "{}", "{}", DateTime.UtcNow);
                changed.PacketRevisions.Add(packet); scope.DbContext.SampleShippingPacketRevisions.Add(packet);
                if (evidence == "voided-packet") packet.Void(DateTime.UtcNow, "Reference correction", null);
                else
                {
                    changed.MarkReadyToShip();
                    if (evidence != "ready-to-ship") changed.RecordShipment("Reference carrier", "REFERENCE", DateTime.UtcNow);
                    if (evidence == "delivered") changed.MarkDelivered(DateTime.UtcNow);
                    if (evidence == "received") changed.MarkReceived(DateTime.UtcNow);
                }
            }
            else if (evidence == "bound-stock")
            {
                scope.ClearTrackedState();
                var kit = await scope.ReadyTransportationKitAsync(definition);
                await scope.StockController().Dispatch(kit.Id, new(packed[1].Id, kit.Version, "Reference carrier", "OUTBOUND", DateTime.UtcNow), default);
                scope.ClearTrackedState();
                var stored = await scope.DbContext.SampleShippingStockKits.SingleAsync(item => item.Id == kit.Id);
                stored.Bind(changed);
            }
            else
            {
                var kit = new SampleReturnKit($"RESET-KIT-{scope.Suffix}", changed.Id, changed.OrganizationId, changed.AuthorizationSource,
                    changed.AuthorizationSourceId, "Supplier", "Tube", null, "Shipper", "Box", 1);
                var tube = new RegisteredSampleTube(kit.Id, $"RESET-TUBE-{scope.Suffix}"); kit.Tubes.Add(tube);
                scope.DbContext.SampleReturnKits.Add(kit);
                if (evidence != "kit")
                {
                    var item = changed.Items.First(); var slot = item.TubeSlots.First();
                    tube.MarkAssigned(DateTime.UtcNow); slot.AssignTube(tube.Id, DateTime.UtcNow);
                    scope.DbContext.SampleTubeAssignmentEvents.Add(new SampleTubeAssignmentEvent(changed.Id, item.Id, slot.Id, tube.Id,
                        item.CustomerSampleId, tube.SupplierBarcode, SampleTubeAssignmentAction.Assigned, null, scope.CustomerUser.Id, DateTime.UtcNow));
                    if (evidence is "cleared" or "cancelled") { slot.ClearTube(); tube.MarkAvailable(); }
                    if (evidence == "cancelled") changed.Cancel();
                }
            }
            await scope.DbContext.SaveChangesAsync(); scope.ClearTrackedState();
            var before = await scope.ResetFamilySlotsAsync(fixture);
            var expectedReason = packetEvidence
                ? "Containers cannot be changed because a shipping insert has already been issued for this job."
                : "Containers cannot be changed after tube scanning, kit registration or shipment preparation has started for this job.";
            var blocked = await scope.PackingController().ReadReset(packed[0].Id, default);
            Assert.False(blocked.CanReset); Assert.Equal(expectedReason, blocked.BlockedReason);
            Assert.Equal(409, (await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Reset(packed[0].Id, new(reviewed.Shipments), default))).StatusCode);
            // A current shipment past Preparing stays active and explains its lock rather than directing the user elsewhere.
            var changedReview = await scope.PackingController().ReadReset(changed.Id, default);
            var changedReason = evidence == "cancelled"
                ? "This container selection is no longer active. Open a current prepared container to change the containers for this job."
                : expectedReason;
            Assert.False(changedReview.CanReset); Assert.Equal(changedReason, changedReview.BlockedReason);
            var changedConflict = await Assert.ThrowsAsync<OrderManagementException>(() => scope.PackingController().Reset(changed.Id, new(reviewed.Shipments), default));
            Assert.Equal(409, changedConflict.StatusCode); Assert.Equal(changedReason, changedConflict.Message);
            Assert.Equal(before, await scope.ResetFamilySlotsAsync(fixture));
            Assert.Equal(SampleShipmentStatus.Preparing, (await scope.DbContext.SampleShipments.AsNoTracking().SingleAsync(item => item.Id == packed[0].Id)).Status);
        }
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerResetConcurrentRequestsCreateOnlyOneReplacementPool()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(30);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var before = await scope.ResetFamilySlotsAsync(fixture);
        var packed = await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 2)]), default);
        scope.ClearTrackedState();
        var review = await scope.PackingController().ReadReset(packed[0].Id, default);
        await using var first = scope.CreateAdditionalContext(); await using var second = scope.CreateAdditionalContext();
        var results = await Task.WhenAll(CaptureAsync(() => scope.PackingController(dbOverride: first).Reset(packed[0].Id, new(review.Shipments), default)),
            CaptureAsync(() => scope.PackingController(dbOverride: second).Reset(packed[0].Id, new(review.Shipments), default)));
        Assert.Single(results, item => item is null); Assert.Single(results, item => item is OrderManagementException { StatusCode: 409 });
        Assert.Equal(1, await scope.DbContext.SampleShipments.CountAsync(item => item.AuthorizationSourceId == fixture.Shipment.AuthorizationSourceId && item.Status != SampleShipmentStatus.Cancelled));
        Assert.Equal(before, await scope.ResetFamilySlotsAsync(fixture));
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerResetAndFirstTubeScanSerializeWithoutLosingPhysicalIdentity()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(18);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var ready = await scope.ReadyTransportationKitAsync(definition);
        await scope.StockController().Dispatch(ready.Id, new(fixture.Shipment.Id, ready.Version, "Reference carrier", "RESET-RACE", DateTime.UtcNow), default);
        scope.ClearTrackedState();
        var packed = Assert.Single(await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 1)]), default));
        scope.ClearTrackedState();
        var review = await scope.PackingController().ReadReset(packed.Id, default);
        var source = await scope.DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots).SingleAsync(item => item.Id == packed.Id);
        var row = source.Items.Single(); var slot = row.TubeSlots.First();
        var before = await scope.ResetFamilySlotsAsync(fixture);
        await using var resetDb = scope.CreateAdditionalContext(); await using var scanDb = scope.CreateAdditionalContext();
        var results = await Task.WhenAll(CaptureAsync(() => scope.PackingController(dbOverride: resetDb).Reset(packed.Id, new(review.Shipments), default)),
            CaptureAsync(() => scope.CustomerWorkflowFor(scanDb).AssignTube(source.Id, row.Id, new(ready.Tubes[0].SupplierBarcode, null, slot.Version, slot.Id), default)));
        Assert.Single(results, item => item is null); Assert.Single(results, item => item is OrderManagementException { StatusCode: 409 });
        Assert.Equal(before, await scope.ResetFamilySlotsAsync(fixture));
        var active = await scope.DbContext.SampleShipments.AsNoTracking().SingleAsync(item => item.AuthorizationSourceId == fixture.Shipment.AuthorizationSourceId && item.Status != SampleShipmentStatus.Cancelled);
        var storedKit = await scope.DbContext.SampleShippingStockKits.AsNoTracking().SingleAsync(item => item.Id == ready.Id);
        if (active.IsPackingPool) { Assert.Null(storedKit.BoundSampleShipmentId); Assert.False(await scope.DbContext.SampleTubeAssignmentEvents.AnyAsync(item => item.SampleShipmentId == packed.Id)); }
        else { Assert.Equal(packed.Id, active.Id); Assert.Equal(packed.Id, storedKit.BoundSampleShipmentId); Assert.False((await scope.PackingController().ReadReset(packed.Id, default)).CanReset); }
    }

    [PostgreSqlReferenceFact]
    public async Task ContainerResetAndLegacyKitRegistrationCannotBothCommit()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var fixture = await scope.CreateShipmentAsync(18);
        var definition = await scope.CreateContainerAsync(fixture, 20);
        var physical = Assert.Single(await scope.PackingController().Confirm(fixture.Shipment.Id, new(fixture.Shipment.Version, [new(definition.Id, 1)]), default));
        scope.ClearTrackedState();
        var review = await scope.PackingController().ReadReset(physical.Id, default);
        await using var resetDb = scope.CreateAdditionalContext(); await using var kitDb = scope.CreateAdditionalContext();
        var results = await Task.WhenAll(CaptureAsync(() => scope.PackingController(dbOverride: resetDb).Reset(physical.Id, new(review.Shipments), default)),
            CaptureAsync(() => scope.ResetPlatformWorkflowFor(kitDb).CreateReturnKit(physical.Id,
                new(18, "Supplier", "Tube", null, "Shipper", "Box"), default)));
        Assert.Single(results, item => item is null); Assert.Single(results, item => item is OrderManagementException { StatusCode: 409 });
        var retired = await scope.DbContext.SampleShipments.AsNoTracking().SingleAsync(item => item.Id == physical.Id);
        Assert.Equal(retired.Status == SampleShipmentStatus.Preparing, await scope.DbContext.SampleReturnKits.AnyAsync(item => item.SampleShipmentId == physical.Id));
        Assert.Equal(18, (await scope.ResetFamilySlotsAsync(fixture)).Length);
    }

    private sealed partial class ShippingTestScope
    {
        public SampleShippingWorkflowAdminController ResetPlatformWorkflowFor(PSeqOperationsDbContext db) => new(db,
            new OrderRequestContext(db, new FixedIdentityContext(platformIdentity)), new SampleShippingWorkflowReader(db))
            { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
        public async Task<(Guid Id, int Ordinal)[]> ResetFamilySlotsAsync(ShippingFixture fixture)
        {
            var shipments = await DbContext.SampleShipments.AsNoTracking().Include(item => item.Items).ThenInclude(item => item.TubeSlots)
                .Where(item => item.OrganizationId == CustomerOrganization.Id && item.AuthorizationSourceId == fixture.Shipment.AuthorizationSourceId).ToArrayAsync();
            return shipments.SelectMany(item => item.Items).SelectMany(item => item.TubeSlots).Select(item => (item.Id, item.Ordinal)).OrderBy(item => item.Id).ToArray();
        }
    }
}
