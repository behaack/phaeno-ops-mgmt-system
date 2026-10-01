namespace PhaenoPortal.App.Features.OrderManagement.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabServiceOrdersController
{
    private async Task CreatePairedShipmentsAsync(LabServiceOrder order,
        IReadOnlyList<LabSampleTubePair> pairs, IReadOnlyDictionary<Guid, SampleShippingStockKit> kits,
        IReadOnlyList<LabSample> samples, Guid sampleTypeId, string sampleTypeQuantityUnit,
        Guid labWorkOrderId, Guid destinationId,
        Guid actorId, DateTime now, CancellationToken ct)
    {
        var locationId = PairedKitLocation(order);
        var samplesById = samples.ToDictionary(item => item.CustomerSampleId, StringComparer.OrdinalIgnoreCase);
        foreach (var group in pairs.GroupBy(item => item.StockKitId))
        {
            var stock = kits[group.Key];
            var shipment = new SampleShipment(
                ($"SHP-{now:yyyyMMdd}-{Guid.NewGuid():N}")[..24].ToUpperInvariant(),
                order.OrganizationId, order.DepartmentId, SampleShipmentAuthorizationSource.CustomerLabServiceOrder,
                order.Id, order.OrderNumber, order.CustomerReference, labWorkOrderId, destinationId);
            shipment.SetDepartureLocation(locationId);
            shipment.SelectContainer(stock.ContainerDefinitionId, stock.ContainerSnapshotJson);
            foreach (var pair in group)
            {
                var sample = samplesById[pair.CustomerSampleId];
                var item = new SampleShipmentItem(shipment.Id, sample.Id, sampleTypeId,
                    sample.CustomerSampleId, sample.CustomerSampleId, 1, sampleTypeQuantityUnit);
                item.TubeSlots.Add(new SampleShipmentTubeSlot(item.Id, 1));
                shipment.Items.Add(item);
            }
            dbContext.SampleShipments.Add(shipment);
            Execute(() => stock.Reserve(shipment, actorId, now));
            // Binding uses the registered physical stock row; flush the reservation inside the
            // surrounding idempotency transaction before resolving the tube roster.
            await dbContext.SaveChangesAsync(ct);
            var returnKit = await SampleShippingPackingData.BindStockAsync(dbContext, shipment,
                group.First().SupplierTubeBarcode, ct);
            foreach (var pair in group)
            {
                var item = shipment.Items.Single(value => value.CustomerSampleId == pair.CustomerSampleId);
                var slot = item.TubeSlots.Single();
                var tube = returnKit.Tubes.Single(value => value.SourceStockTubeId == pair.StockTubeId
                    && value.SupplierBarcode == pair.SupplierTubeBarcode);
                Execute(() =>
                {
                    tube.MarkAssigned(now);
                    tube.DeclareMaterial(pair.DeclaredQuantity, pair.DeclaredQuantityUnit, actorId, now);
                    slot.AssignTube(tube.Id, now);
                });
                dbContext.SampleTubeAssignmentEvents.Add(new SampleTubeAssignmentEvent(shipment.Id,
                    item.Id, slot.Id, tube.Id, item.CustomerSampleId, tube.SupplierBarcode,
                    SampleTubeAssignmentAction.Assigned, null, actorId, now,
                    pair.DeclaredQuantity, pair.DeclaredQuantityUnit));
            }
        }
    }

    private static Guid PairedKitLocation(LabServiceOrder order)
    {
        if (string.IsNullOrWhiteSpace(order.PlacementSnapshotJson))
            throw Conflict("kit_delivery_address_missing", "This Job has no confirmed kit delivery address. Ask Phaeno to review its historical order setup.");
        using var document = JsonDocument.Parse(order.PlacementSnapshotJson);
        if (!document.RootElement.TryGetProperty("kitDeliveryAddress", out var address)
            || address.ValueKind != JsonValueKind.Object
            || !address.TryGetProperty("id", out var id)
            || !id.TryGetGuid(out var locationId))
            throw Conflict("kit_delivery_address_missing", "This Job has no confirmed kit delivery address. Ask Phaeno to review its historical order setup.");
        return locationId;
    }

    [HttpGet("{orderId:guid}/sample-tube-pairs")]
    public async Task<LabSampleTubeWorkspaceDto> ReadSampleTubePairs(Guid orderId, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, false, cancellationToken);
        var order = await ReadOrderAsync(orderId, tenant, cancellationToken);
        var pairs = await dbContext.LabSampleTubePairs.AsNoTracking()
            .Where(item => item.LabServiceOrderId == order.Id && item.OrganizationId == tenant.Organization.Id
                && item.DepartmentId == tenant.Department.Id)
            .OrderBy(item => item.CreatedAt).ThenBy(item => item.Id).ToArrayAsync(cancellationToken);
        var selections = await dbContext.LabSampleTubeKitSelections.AsNoTracking()
            .Where(item => item.LabServiceOrderId == order.Id && item.OrganizationId == tenant.Organization.Id
                && item.DepartmentId == tenant.Department.Id)
            .OrderBy(item => item.CreatedAt).ThenBy(item => item.Id)
            .ToArrayAsync(cancellationToken);
        var selectedKitIds = selections.Select(item => item.StockKitId).ToArray();
        var locationId = PairedKitLocation(order);
        var stock = await dbContext.SampleShippingStockKits.AsNoTracking().Include(item => item.Tubes)
            .Where(item => item.OrganizationId == order.OrganizationId && item.DepartmentId == order.DepartmentId
                && item.CustomerDeliveryLocationId == locationId && selectedKitIds.Contains(item.Id))
            .ToArrayAsync(cancellationToken);
        var sampleType = await ReadShippingSampleTypeAsync(order, cancellationToken);
        var tubeProductIds = stock.Where(item => item.TubeSupplierProductId.HasValue)
            .Select(item => item.TubeSupplierProductId!.Value).Distinct().ToArray();
        var tubeProducts = await dbContext.LabSupplierProducts.AsNoTracking()
            .Where(item => tubeProductIds.Contains(item.Id)).ToDictionaryAsync(item => item.Id, cancellationToken);
        var names = stock.ToDictionary(item => item.Id, item => item.KitNumber);
        var usedIds = pairs.Select(item => item.StockTubeId).ToHashSet();
        var preparation = order.ReadPreparationScope();
        return new LabSampleTubeWorkspaceDto(
            pairs.Select(item => new LabSampleTubePairDto(item.Id, item.CustomerSampleId, item.BiologicalSource,
                item.StockKitId, names.GetValueOrDefault(item.StockKitId) ?? "Historical kit",
                item.SupplierTubeBarcode, item.DeclaredQuantity, item.DeclaredQuantityUnit,
                item.SequencingRunCount, item.Version, item.LabJobPhaseId)).ToArray(),
            selections.Where(item => names.ContainsKey(item.StockKitId)).Select(selection =>
            {
                var item = stock.Single(kit => kit.Id == selection.StockKitId);
                var product = item.TubeSupplierProductId.HasValue
                    ? tubeProducts.GetValueOrDefault(item.TubeSupplierProductId.Value) : null;
                return new LabSampleTubeKitOptionDto(item.Id, item.KitNumber, item.TubeCapacity,
                    item.Tubes.Count(tube => !usedIds.Contains(tube.Id)), selection.FinishedAt,
                    product?.MaximumSampleAmount, product?.SampleAmountUnit);
            }).ToArray(),
            preparation.Sources.Sum(s => s.SpecimenCount), preparation.SequencingRunCount,
            order.SampleRosterFinalizedAt.HasValue, preparation.Sources,
            order.Phases.Where(p => p.SupersededAtUtc == null && p.CancelledAtUtc == null).Select(p => p.Id).ToArray(),
            sampleType.MinimumSampleAmount, sampleType.SampleAmountUnit);
    }

    [HttpPost("{orderId:guid}/sample-tube-pairs/kits")]
    public async Task<LabSampleTubeWorkspaceDto> SaveSampleTubeKit(Guid orderId,
        [FromBody] SaveLabSampleTubeKitRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, cancellationToken);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"sample-shipping:{orderId}", cancellationToken);
        var order = await ReadLockedRosterAsync(orderId, tenant, cancellationToken);
        Execute(order.EnsureSampleRosterEditable);
        if (order.Samples.Count > 0 || order.SampleRosterFinalizedAt.HasValue)
            throw Conflict("paired_preparation_unavailable", "This Job already has a confirmed sample list.");
        var kitNumber = request.KitNumber?.Trim();
        if (string.IsNullOrWhiteSpace(kitNumber) || kitNumber.Length > 100)
            throw Invalid("kit_barcode_invalid", "Scan the complete physical kit barcode.");
        var locationId = PairedKitLocation(order);
        var kitId = await dbContext.SampleShippingStockKits.AsNoTracking()
            .Where(item => item.KitNumber == kitNumber && item.OrganizationId == order.OrganizationId
                && item.DepartmentId == order.DepartmentId && item.CustomerDeliveryLocationId == locationId)
            .Select(item => (Guid?)item.Id).SingleOrDefaultAsync(cancellationToken);
        if (!kitId.HasValue)
            throw Invalid("kit_not_at_location", "This kit barcode is not a received kit at this Job's delivery location.");
        await SampleShippingPackingData.LockAsync(dbContext, $"stock-kit:{kitId.Value}", cancellationToken);
        var kit = await dbContext.SampleShippingStockKits.AsNoTracking().Include(item => item.Tubes)
            .SingleAsync(item => item.Id == kitId.Value, cancellationToken);
        if (!kit.CustomerReceivedAt.HasValue || kit.BoundSampleShipmentId.HasValue || kit.ReservedSampleShipmentId.HasValue
            || kit.Tubes.Count != kit.TubeCapacity || !kit.TubesVerifiedAt.HasValue
            || !TransportationKitInventory.IsPhysicallyUsable(kit, DateTime.UtcNow))
            throw Conflict("kit_unavailable", "This physical kit is not received and available for sample preparation.");
        var alreadySelected = await dbContext.LabSampleTubeKitSelections.AsNoTracking()
            .SingleOrDefaultAsync(item => item.StockKitId == kit.Id, cancellationToken);
        if (alreadySelected is not null)
        {
            if (alreadySelected.LabServiceOrderId != order.Id)
                throw Conflict("kit_claimed_by_another_job", "This physical kit is already selected for another Job.");
            if (transaction is not null) await transaction.CommitAsync(cancellationToken);
            return await ReadSampleTubePairs(orderId, cancellationToken);
        }
        var selections = await dbContext.LabSampleTubeKitSelections.AsNoTracking()
            .Where(item => item.LabServiceOrderId == order.Id)
            .OrderBy(item => item.CreatedAt).ThenBy(item => item.Id)
            .ToArrayAsync(cancellationToken);
        if (selections.Any(item => !item.FinishedAt.HasValue))
            throw Conflict("current_kit_not_finished", "Finish the current kit before scanning another kit.");
        if (await dbContext.LabSampleTubePairs.AsNoTracking()
            .CountAsync(item => item.LabServiceOrderId == order.Id, cancellationToken) >= order.RequestedSpecimenCount)
            throw Conflict("all_samples_paired", "Every accepted sample already has a saved tube pair.");
        if (await dbContext.LabSampleTubePairs.AsNoTracking().AnyAsync(item =>
            item.StockKitId == kit.Id && item.LabServiceOrderId != order.Id, cancellationToken))
            throw Conflict("kit_claimed_by_another_job", "This physical kit is already in another Job's sample preparation.");
        var compatible = await new SampleShippingContainerCatalogService(dbContext).ReadStockCompatibleAsync(
            [new ContainerSampleTypeContext(order.SampleTypeDefinitionId!.Value)], [kit.ContainerDefinitionId], cancellationToken);
        if (!compatible.Any(item => item.Id == kit.ContainerDefinitionId))
            throw Conflict("kit_sample_type_mismatch", "This kit is not compatible with the confirmed Sample type.");
        EnsureVersion(order.Version, request.OrderVersion);
        dbContext.LabSampleTubeKitSelections.Add(new LabSampleTubeKitSelection(order.Id,
            order.OrganizationId, order.DepartmentId, kit.Id));
        order.MarkUpdated(DateTime.UtcNow, tenant.Actor.Id);
        dbContext.OrderStatusEvents.Add(NewEvent(order, order.Status.ToString(), order.Status.ToString(), tenant.Actor.Id,
            $"Physical kit {kit.KitNumber} scanned and fixed for sample preparation."));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return await ReadSampleTubePairs(orderId, cancellationToken);
    }

    [HttpPost("{orderId:guid}/sample-tube-pairs/kits/{kitId:guid}/finish")]
    public async Task<LabSampleTubeWorkspaceDto> FinishSampleTubeKit(Guid orderId, Guid kitId,
        [FromBody] FinishLabSampleTubeKitRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, cancellationToken);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"sample-shipping:{orderId}", cancellationToken);
        var order = await ReadLockedRosterAsync(orderId, tenant, cancellationToken);
        EnsureVersion(order.Version, request.OrderVersion);
        Execute(order.EnsureSampleRosterEditable);
        if (order.Samples.Count > 0 || order.SampleRosterFinalizedAt.HasValue)
            throw Conflict("paired_preparation_unavailable", "This Job already has a confirmed sample list.");
        var selections = await dbContext.LabSampleTubeKitSelections
            .Where(item => item.LabServiceOrderId == order.Id && item.OrganizationId == tenant.Organization.Id
                && item.DepartmentId == tenant.Department.Id)
            .OrderBy(item => item.CreatedAt).ThenBy(item => item.Id).ToArrayAsync(cancellationToken);
        var selection = selections.FirstOrDefault(item => !item.FinishedAt.HasValue);
        if (selection is null || selection.StockKitId != kitId)
            throw Conflict("kit_not_active", "Finish the current saved kit before moving to another.");
        var pairCount = await dbContext.LabSampleTubePairs.AsNoTracking()
            .CountAsync(item => item.LabServiceOrderId == order.Id && item.StockKitId == kitId,
                cancellationToken);
        if (pairCount == 0)
            throw Conflict("kit_has_no_pairs", "Save at least one sample and tube pair before finishing this kit.");
        var capacity = await dbContext.SampleShippingStockKits.AsNoTracking()
            .Where(item => item.Id == kitId).Select(item => item.TubeCapacity)
            .SingleAsync(cancellationToken);
        var now = DateTime.UtcNow;
        selection.Finish(tenant.Actor.Id, now);
        order.MarkUpdated(now, tenant.Actor.Id);
        dbContext.OrderStatusEvents.Add(NewEvent(order, order.Status.ToString(), order.Status.ToString(), tenant.Actor.Id,
            $"Physical kit {kitId} finished for sample preparation with {pairCount} pairs and {capacity - pairCount} unused tubes."));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await ReadSampleTubePairs(orderId, cancellationToken);
    }

    [HttpPost("{orderId:guid}/sample-tube-pairs")]
    public async Task<LabSampleTubeWorkspaceDto> AddSampleTubePair(Guid orderId,
        [FromBody] AddLabSampleTubePairRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, cancellationToken);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"sample-shipping:{orderId}", cancellationToken);
        var order = await ReadLockedRosterAsync(orderId, tenant, cancellationToken);
        EnsureVersion(order.Version, request.OrderVersion);
        Execute(order.EnsureSampleRosterEditable);
        if (order.Samples.Count > 0 || order.SampleRosterFinalizedAt.HasValue)
            throw Conflict("paired_preparation_unavailable", "This Job already has a sample list. Review its saved preparation instead.");
        var sampleType = await ReadShippingSampleTypeAsync(order, cancellationToken);
        var locationId = PairedKitLocation(order);
        var saved = await dbContext.LabSampleTubePairs.Where(item => item.LabServiceOrderId == orderId).ToArrayAsync(cancellationToken);
        var preparation = order.ReadPreparationScope();
        var activePairs = saved.Where(p => order.RequiresPreparation(p.LabJobPhaseId)).ToArray();
        if (activePairs.Length >= preparation.Sources.Sum(s => s.SpecimenCount))
            throw Conflict("paired_sample_count_exceeded", "Every accepted sample already has a saved tube pair.");
        if (saved.Any(item => string.Equals(item.CustomerSampleId, request.CustomerSampleId?.Trim(), StringComparison.OrdinalIgnoreCase)))
            throw Conflict("duplicate_customer_sample_id", "Choose a distinct Sample ID for each physical tube.");
        var source = ResolveRosterSource(order, request.BiologicalSource);
        var phase = LabPhaseScopeRules.Resolve(order, request.PhaseId);
        LabPhaseScopeRules.Validate(phase, source, request.SequencingRunCount, saved.Where(p => p.LabJobPhaseId == phase.Id).Select(p => (p.BiologicalSource, p.SequencingRunCount)));
        var sourceLimit = preparation.Sources.SingleOrDefault(item => LabServiceSourceGroup.Normalize(item.BiologicalSource) == LabServiceSourceGroup.Normalize(source))?.SpecimenCount ?? 0;
        if (activePairs.Count(item => LabServiceSourceGroup.Normalize(item.BiologicalSource) == LabServiceSourceGroup.Normalize(source)) >= sourceLimit)
            throw Conflict("biological_source_count_exceeded", "This biological source already has its accepted number of samples.");
        var selections = await dbContext.LabSampleTubeKitSelections.AsNoTracking()
            .Where(item => item.LabServiceOrderId == order.Id
                && item.OrganizationId == tenant.Organization.Id && item.DepartmentId == tenant.Department.Id)
            .OrderBy(item => item.CreatedAt).ThenBy(item => item.Id)
            .ToArrayAsync(cancellationToken);
        var selectedKitIds = selections.Select(item => item.StockKitId).ToArray();
        if (!selectedKitIds.Contains(request.StockKitId))
            throw Conflict("kit_not_saved", "Scan and save this physical kit before entering its sample tubes.");
        var activeKitId = selections.FirstOrDefault(item => !item.FinishedAt.HasValue)?.StockKitId;
        if (activeKitId != request.StockKitId)
            throw Conflict("kit_not_active", "Finish entering the active physical kit before using another kit's tubes.");
        Execute(() => order.EnsureSampleRunCountMatchesPricing(request.SequencingRunCount));
        if (activePairs.Sum(item => item.SequencingRunCount) + request.SequencingRunCount > preparation.SequencingRunCount)
            throw Conflict("sequencing_run_count_exceeded", "The saved pairs cannot exceed the accepted sample-sequencing runs.");
        if (!SupplierTubeBarcode.TryNormalize(request.SupplierTubeBarcode, out var barcode))
            throw Invalid("supplier_tube_barcode_invalid", "Scan the complete barcode printed on one tube.");
        await SampleShippingPackingData.LockAsync(dbContext, $"stock-kit:{request.StockKitId}", cancellationToken);
        await SampleShippingPackingData.LockAsync(dbContext, $"supplier-tube:{barcode}", cancellationToken);
        var kit = await dbContext.SampleShippingStockKits.AsNoTracking().Include(item => item.Tubes)
            .SingleOrDefaultAsync(item => item.Id == request.StockKitId && item.OrganizationId == order.OrganizationId
                && item.DepartmentId == order.DepartmentId && item.CustomerDeliveryLocationId == locationId,
                cancellationToken) ?? throw Conflict("kit_not_for_order", "Select a received kit at this Job's confirmed delivery location.");
        if (!kit.CustomerReceivedAt.HasValue || kit.BoundSampleShipmentId.HasValue || kit.ReservedSampleShipmentId.HasValue
            || !TransportationKitInventory.IsPhysicallyUsable(kit, DateTime.UtcNow))
            throw Conflict("kit_unavailable", "This kit is not physically received and available for this Job.");
        var compatible = await new SampleShippingContainerCatalogService(dbContext).ReadStockCompatibleAsync(
            [new ContainerSampleTypeContext(order.SampleTypeDefinitionId!.Value)], [kit.ContainerDefinitionId], cancellationToken);
        if (!compatible.Any(item => item.Id == kit.ContainerDefinitionId))
            throw Conflict("kit_sample_type_mismatch", "This kit is not compatible with the confirmed Sample type.");
        var tube = kit.Tubes.SingleOrDefault(item => item.SupplierBarcode == barcode)
            ?? throw Conflict("tube_not_in_selected_kit", "The scanned tube is not in the selected physical kit.");
        var tubeProduct = kit.TubeSupplierProductId.HasValue
            ? await dbContext.LabSupplierProducts.AsNoTracking().SingleOrDefaultAsync(
                item => item.Id == kit.TubeSupplierProductId.Value, cancellationToken)
            : null;
        if (!sampleType.MinimumSampleAmount.HasValue || string.IsNullOrWhiteSpace(sampleType.SampleAmountUnit)
            || tubeProduct?.MaximumSampleAmount is null || string.IsNullOrWhiteSpace(tubeProduct.SampleAmountUnit))
            throw Conflict("sample_amount_configuration_required",
                "Phaeno must configure the minimum sample amount and this tube product's maximum amount before a pair can be saved.");
        if (!string.Equals(sampleType.SampleAmountUnit, tubeProduct.SampleAmountUnit, StringComparison.Ordinal)
            || sampleType.MinimumSampleAmount > tubeProduct.MaximumSampleAmount)
            throw Conflict("sample_amount_configuration_mismatch",
                "The Sample type minimum and tube maximum must use the same unit, with the minimum no greater than the maximum. Ask Phaeno to review this configuration.");
        if (!string.Equals(request.DeclaredQuantityUnit, sampleType.SampleAmountUnit, StringComparison.Ordinal))
            throw Invalid("sample_amount_unit_mismatch",
                $"Enter the sample amount in {sampleType.SampleAmountUnit}.");
        if (request.DeclaredQuantity < sampleType.MinimumSampleAmount
            || request.DeclaredQuantity > tubeProduct.MaximumSampleAmount)
            throw Invalid("sample_amount_out_of_range",
                $"Enter an amount from {sampleType.MinimumSampleAmount} to {tubeProduct.MaximumSampleAmount} {sampleType.SampleAmountUnit}.");
        if (await dbContext.LabSampleTubePairs.AsNoTracking().AnyAsync(item =>
            item.StockKitId == kit.Id && item.LabServiceOrderId != order.Id, cancellationToken))
            throw Conflict("kit_claimed_by_another_job", "Another Job is preparing this physical kit. Select an unused kit.");
        if (saved.Any(item => item.StockTubeId == tube.Id)
            || await dbContext.RegisteredSampleTubes.AsNoTracking().AnyAsync(item => item.SourceStockTubeId == tube.Id, cancellationToken))
            throw Conflict("tube_already_used", "This tube is already paired with a sample or used in another shipment.");
        if (saved.Count(item => item.StockKitId == kit.Id) >= kit.TubeCapacity)
            throw Conflict("kit_capacity_exceeded", "This kit has no remaining tubes for this Job.");
        LabSampleTubePair pair;
        try { pair = new(order.Id, order.OrganizationId, order.DepartmentId, kit.Id, tube.Id,
            request.CustomerSampleId, source, barcode, request.DeclaredQuantity,
            request.DeclaredQuantityUnit, request.SequencingRunCount, phase.Id); }
        catch (ArgumentException error) { throw Invalid("sample_tube_pair_invalid", error.Message); }
        dbContext.LabSampleTubePairs.Add(pair);
        order.MarkUpdated(DateTime.UtcNow, tenant.Actor.Id);
        dbContext.OrderStatusEvents.Add(NewEvent(order, order.Status.ToString(), order.Status.ToString(), tenant.Actor.Id,
            $"Sample/tube pair saved for {pair.CustomerSampleId} in kit {kit.KitNumber}."));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        Response.StatusCode = StatusCodes.Status201Created;
        return await ReadSampleTubePairs(orderId, cancellationToken);
    }

    [HttpDelete("{orderId:guid}/sample-tube-pairs/{pairId:guid}")]
    public async Task<LabSampleTubeWorkspaceDto> RemoveSampleTubePair(Guid orderId, Guid pairId,
        [FromBody] RemoveLabSampleTubePairRequest request, CancellationToken cancellationToken)
    {
        var tenant = await requestContext.RequireLabServiceTenantAsync(HttpContext, true, cancellationToken);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"sample-shipping:{orderId}", cancellationToken);
        var order = await ReadLockedRosterAsync(orderId, tenant, cancellationToken);
        Execute(order.EnsureSampleRosterEditable);
        if (order.SampleRosterFinalizedAt.HasValue) throw Conflict("paired_preparation_locked", "Finalized sample/tube pairs cannot be removed.");
        var pair = await dbContext.LabSampleTubePairs.SingleOrDefaultAsync(item => item.Id == pairId
            && item.LabServiceOrderId == orderId && item.OrganizationId == tenant.Organization.Id
            && item.DepartmentId == tenant.Department.Id, cancellationToken) ?? throw Missing();
        EnsureVersion(pair.Version, request.Version);
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw Invalid("pair_correction_reason_required", "Enter a reason for removing this saved sample/tube pair.");
        var selection = await dbContext.LabSampleTubeKitSelections.SingleAsync(item =>
            item.LabServiceOrderId == order.Id && item.StockKitId == pair.StockKitId,
            cancellationToken);
        var reopened = selection.FinishedAt.HasValue;
        if (reopened) selection.ReopenForCorrection();
        dbContext.LabSampleTubePairs.Remove(pair);
        order.MarkUpdated(DateTime.UtcNow, tenant.Actor.Id);
        dbContext.OrderStatusEvents.Add(NewEvent(order, order.Status.ToString(), order.Status.ToString(), tenant.Actor.Id,
            $"Sample/tube pair for {pair.CustomerSampleId} removed{(reopened ? "; kit reopened" : "")}: {request.Reason.Trim()}"));
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return await ReadSampleTubePairs(orderId, cancellationToken);
    }
}
