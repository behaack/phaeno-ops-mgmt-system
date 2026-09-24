namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    [HttpPost("material-lots")]
    public async Task<LabMaterialLotDto> CreateMaterialLot([FromBody] CreateMaterialLotRequest request,
        CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        if (!Enum.TryParse<LabMaterialLotKind>(request.Kind, true, out var kind))
            throw Invalid("material_lot_kind_invalid", "The material lot kind is invalid.");
        if (kind == LabMaterialLotKind.PreparedReagent)
            throw Invalid("reagent_manufacturing_run_required",
                "Start a reagent manufacturing run to create a Phaeno reagent lot.");
        if (request.AvailableQuantity < 0)
            throw Invalid("material_quantity_invalid", "Available quantity cannot be negative.");
        if (request.ExpirationOrRetestDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw Invalid("material_expiration_invalid", "Expiration or retest date cannot be in the past.");

        var componentRequests = request.Components ?? [];
        if (kind == LabMaterialLotKind.SupplierLot && componentRequests.Count > 0)
            throw Invalid("material_components_not_allowed", "Supplier lots cannot have prepared-reagent components.");
        if (kind == LabMaterialLotKind.PreparedReagent && componentRequests.Count == 0)
            throw Invalid("material_components_required", "A prepared reagent requires at least one component lot.");
        if (componentRequests.Select(item => item.ComponentMaterialLotId).Distinct().Count() != componentRequests.Count)
            throw Invalid("material_component_duplicate", "Each component lot may be selected only once.");

        await using var transaction = dbContext.Database.CurrentTransaction is null
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;
        var supplier = kind == LabMaterialLotKind.SupplierLot
            ? await ResolveSupplierAsync(request.SupplierId, request.NewSupplierName, cancellationToken)
            : null;
        if (request.SupplierProductId is Guid productId)
            await SampleShippingPackingData.LockAsync(dbContext,
                $"supplier-product:{productId}", cancellationToken);
        if (kind == LabMaterialLotKind.PreparedReagent
            && (request.SupplierId.HasValue || !string.IsNullOrWhiteSpace(request.NewSupplierName)))
            throw Invalid("material_supplier_not_allowed", "A prepared reagent cannot have a supplier.");
        if (kind == LabMaterialLotKind.PreparedReagent && request.SupplierProductId.HasValue)
            throw Invalid("material_product_not_allowed", "Prepared reagents use a material definition, not a supplier product.");
        var product = kind == LabMaterialLotKind.SupplierLot
            ? await RequireLotProductAsync(request.SupplierProductId, supplier!.Id, cancellationToken) : null;
        if (product is not null && string.IsNullOrWhiteSpace(product.DefaultQuantityUnit))
            throw Conflict("material_product_unit_unconfigured",
                "Set this product's inventory unit in Suppliers & products before receiving a lot.");
        if (product?.DefaultQuantityUnit is string productUnit
            && !string.Equals(productUnit, request.QuantityUnit?.Trim(), StringComparison.OrdinalIgnoreCase))
            throw Invalid("material_product_unit_mismatch",
                $"This product is tracked in {productUnit}. Enter the lot quantity in that unit.");
        var internalProducer = kind == LabMaterialLotKind.PreparedReagent
            ? await RequirePhaenoProducerAsync(cancellationToken) : null;
        // A purchased product supplies the inventory identity. Staff do not need to
        // classify the same purchased lot against a second, unrelated material.
        var definition = product is not null && !request.MaterialDefinitionId.HasValue
            && string.IsNullOrWhiteSpace(request.NewMaterialName)
            ? await ResolveProductMaterialDefinitionAsync(product, cancellationToken)
            : await ResolveMaterialDefinitionAsync(kind, request.MaterialDefinitionId,
                request.NewMaterialName, cancellationToken);
        if (product?.CanExpire == true && request.ExpirationOrRetestDate is null)
            throw Invalid("material_expiration_required", "This product can expire. Enter its expiration date when recording the inventory lot.");
        if (product is not null) dbContext.Entry(product).Property(p => p.UpdatedAt).IsModified = true;
        var storageLocation = await ResolveStorageLocationAsync(
            request.StorageLocationId, request.NewStorageLocationName, cancellationToken);

        var sourceLots = componentRequests.Count == 0
            ? []
            : await dbContext.LabMaterialLots
                .Where(item => componentRequests.Select(component => component.ComponentMaterialLotId).Contains(item.Id))
                .ToListAsync(cancellationToken);
        if (sourceLots.Count != componentRequests.Count)
            throw Invalid("material_component_invalid", "One or more component lots could not be found.");

        var lot = new LabMaterialLot(kind, definition.Id, request.LotNumber, supplier?.Id,
            request.ExpirationOrRetestDate, storageLocation.Id,
            request.AvailableQuantity, product?.DefaultQuantityUnit ?? request.QuantityUnit
                ?? throw Invalid("material_unit_invalid", "Enter a material inventory unit."));
        if (product is not null) lot.AssignProduct(product.Id, product.SupplierId);
        if (internalProducer is not null) lot.AssignInternalProducer(internalProducer.Id);
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        foreach (var componentRequest in componentRequests)
        {
            var sourceLot = sourceLots.Single(item => item.Id == componentRequest.ComponentMaterialLotId);
            if (componentRequest.MaterialExhausted && componentRequest.LotVersion is null)
                throw Invalid("component_version_required", "Refresh the source lot before confirming material exhausted.");
            if (componentRequest.LotVersion.HasValue) EnsureVersion(sourceLot.Version, componentRequest.LotVersion.Value);
            if (sourceLot.QcDisposition is not (LabQcDisposition.Passed or LabQcDisposition.ApprovedException))
                throw Conflict("material_component_qc_required", "Every component lot must pass QC before preparation.");
            if (sourceLot.ExpirationOrRetestDate < today)
                throw Conflict("material_component_expired", "An expired component lot cannot be used.");
            if (!string.Equals(sourceLot.QuantityUnit, componentRequest.QuantityUnit, StringComparison.OrdinalIgnoreCase))
                throw Invalid("material_component_unit_mismatch", "Each component must use its source lot's tracked unit.");
            try
            {
                sourceLot.Consume(componentRequest.Quantity, componentRequest.MaterialExhausted, lot.Id, actor.User.Id, now);
            }
            catch (InvalidOperationException exception)
            {
                throw Conflict("material_component_quantity_unavailable", exception.Message);
            }
        }

        dbContext.LabMaterialLots.Add(lot);
        foreach (var componentRequest in componentRequests)
        {
            dbContext.LabPreparedReagentComponents.Add(new LabPreparedReagentComponent(
                lot.Id, componentRequest.ComponentMaterialLotId,
                componentRequest.Quantity, componentRequest.QuantityUnit));
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
            await transaction.CommitAsync(cancellationToken);
        return (await ReadMaterialLotsAsync(cancellationToken)).Single(item => item.Id == lot.Id);
    }

    [HttpGet("material-lots/products")]
    public async Task<IReadOnlyList<SupplierCatalogEntryDto>> ReadLotProducts(CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        return await PreparationMaterialCatalogAsync(ct);
    }

    [HttpPost("material-lots/{lotId:guid}/product")]
    public async Task<LabMaterialLotDto> AssignLotProduct(Guid lotId, [FromBody] AssignMaterialLotProductRequest request, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext,
            $"material-lot:{lotId}", ct);
        await SampleShippingPackingData.LockAsync(dbContext,
            $"supplier-product:{request.SupplierProductId}", ct);
        var lot = await dbContext.LabMaterialLots.SingleOrDefaultAsync(l => l.Id == lotId, ct) ?? throw Missing();
        EnsureVersion(lot.Version, request.Version);
        if (lot.Kind != LabMaterialLotKind.SupplierLot || lot.SupplierId is not Guid supplierId)
            throw Invalid("material_product_not_allowed", "Only purchased lots can be assigned a catalog product.");
        if (lot.SupplierProductId.HasValue)
            throw Conflict("material_product_already_assigned", "The lot already has a product assignment. Refresh its details.");
        var product = await RequireLotProductAsync(request.SupplierProductId, supplierId, ct);
        if (product.DefaultQuantityUnit is string productUnit
            && !string.Equals(productUnit, lot.QuantityUnit, StringComparison.OrdinalIgnoreCase))
            throw Invalid("material_product_unit_mismatch",
                $"This product is tracked in {productUnit}. The historical lot uses {lot.QuantityUnit}.");
        lot.AssignProduct(product.Id, product.SupplierId);
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return (await ReadMaterialLotsAsync(ct)).Single(l => l.Id == lot.Id);
    }

    private async Task<LabSupplierProduct> RequireLotProductAsync(Guid? productId, Guid supplierId, CancellationToken ct)
    {
        var product = await dbContext.LabSupplierProducts.SingleOrDefaultAsync(p => p.Id == productId && p.SupplierId == supplierId && p.IsActive, ct)
            ?? throw Invalid("material_product_invalid", "Select an active product from the lot's supplier.");
        if (!await dbContext.LabSuppliers.AnyAsync(s => s.Id == supplierId && s.IsActive, ct)
            || !await dbContext.LabProductTypes.AnyAsync(t => t.Id == product.ProductTypeId && t.IsActive, ct))
            throw Invalid("material_product_unavailable", "Select a product with an active supplier and product type.");
        return product;
    }

    private async Task<LabMaterialDefinition> ResolveProductMaterialDefinitionAsync(
        LabSupplierProduct product, CancellationToken ct)
    {
        // The product UUID is stable even when its display name is corrected. Serialize
        // the first creation so concurrent receipts reuse the same definition.
        await SampleShippingPackingData.LockAsync(dbContext, $"material-product:{product.Id}", ct);
        var key = $"product-{product.Id:N}";
        var definition = await dbContext.LabMaterialDefinitions.SingleOrDefaultAsync(
            item => item.Key == key, ct);
        if (definition is not null) return definition;
        definition = new LabMaterialDefinition(key, product.ProductNumber, LabMaterialLotKind.SupplierLot);
        dbContext.LabMaterialDefinitions.Add(definition);
        return definition;
    }

    private async Task<LabSupplier> RequirePhaenoProducerAsync(CancellationToken ct) =>
        await dbContext.LabSuppliers.SingleOrDefaultAsync(
            supplier => supplier.IsInternalProducer && supplier.IsActive, ct)
        ?? throw Conflict("phaeno_producer_unavailable",
            "The internal Phaeno producer is unavailable. Apply the supplier seed migration before preparing a reagent.");

    [HttpPost("material-lots/{lotId:guid}/reconcile-quantity")]
    public async Task<LabMaterialLotDto> ReconcileMaterialQuantity(Guid lotId, [FromBody] ReconcileMaterialQuantityRequest request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var lot = await dbContext.LabMaterialLots.SingleOrDefaultAsync(l => l.Id == lotId, ct) ?? throw Missing();
        EnsureVersion(lot.Version, request.Version);
        try { lot.ReconcileQuantity(request.CountedQuantity, request.Reason, actor.User.Id, DateTime.UtcNow); }
        catch (ArgumentException e) { throw Invalid("material_reconciliation_invalid", e.Message); }
        catch (InvalidOperationException e) { throw Conflict("material_reconciliation_unavailable", e.Message); }
        await dbContext.SaveChangesAsync(ct);
        return (await ReadMaterialLotsAsync(ct)).Single(l => l.Id == lot.Id);
    }

    [HttpPost("material-lots/{lotId:guid}/qc")]
    public async Task<LabMaterialLotDto> RecordMaterialQc(Guid lotId,
        [FromBody] MaterialQcRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        if (!Enum.TryParse<LabQcDisposition>(request.Disposition, true, out var disposition))
            throw Invalid("material_qc_invalid", "The material QC disposition is invalid.");
        var lot = await dbContext.LabMaterialLots.SingleOrDefaultAsync(item => item.Id == lotId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(lot.Version, request.Version);
        if (await dbContext.LabReagentManufacturingRuns.AnyAsync(item =>
            item.MaterialLotId == lotId && item.Status != LabReagentRunStatus.Completed,
            cancellationToken))
            throw Conflict("reagent_run_not_complete",
                "Complete the reagent manufacturing run before recording its lot QC.");
        try
        {
            lot.RecordQc(disposition, request.PerformedOn, request.FailureReason,
                NormalizeJson(request.ResultsJson, "material_qc_results_invalid"),
                actor.User.Id, DateTime.UtcNow);
        }
        catch (ArgumentException exception)
        {
            throw Invalid("material_qc_details_invalid", exception.Message);
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadMaterialLotsAsync(cancellationToken)).Single(item => item.Id == lot.Id);
    }

    [HttpPost("executions/{executionId:guid}/material-consumptions")]
    public async Task<LabExecutionDto> ConsumeMaterial(Guid executionId,
        [FromBody] ConsumeMaterialRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var execution = await dbContext.LabProtocolExecutions.SingleOrDefaultAsync(item => item.Id == executionId, cancellationToken)
            ?? throw Missing();
        if (execution.Status is not (LabExecutionStatus.InProgress or LabExecutionStatus.Blocked))
            throw Conflict("execution_not_active", "Materials can be consumed only during active execution.");
        await RequireOpenExecutionWorkAsync(execution.LabWorkOrderId, cancellationToken);
        var attempt = await RequireExecutionAttemptAsync(execution, cancellationToken);
        var lot = await dbContext.LabMaterialLots.SingleOrDefaultAsync(item => item.Id == request.LabMaterialLotId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(lot.Version, request.LotVersion);
        if (lot.QcDisposition is not (LabQcDisposition.Passed or LabQcDisposition.ApprovedException))
            throw Conflict("material_qc_required", "The material lot must pass QC before use.");
        if (lot.ExpirationOrRetestDate < DateOnly.FromDateTime(DateTime.UtcNow))
            throw Conflict("material_expired", "The material lot is expired.");
        if (!string.Equals(lot.QuantityUnit, request.QuantityUnit, StringComparison.OrdinalIgnoreCase))
            throw Invalid("material_unit_mismatch", "Consumption must use the lot's tracked quantity unit.");
        if (request.OutputContainerId.HasValue && !await dbContext.LabContainers
            .AnyAsync(item => item.Id == request.OutputContainerId
                && item.LabWorkOrderId == execution.LabWorkOrderId, cancellationToken))
            throw Invalid("output_container_invalid", "The output container must belong to this work order.");
        if (attempt is not null && request.OutputContainerId.HasValue)
            await RequireAttemptLineageAsync(request.OutputContainerId.Value, attempt, cancellationToken);
        if (request.Quantity <= 0) throw Conflict("material_quantity_unavailable", "Enter a positive actual amount used.");
        var consumedAt = DateTime.UtcNow;
        var consumption = new LabMaterialConsumption(execution.Id, lot.Id,
            request.OutputContainerId, request.Quantity, request.QuantityUnit, actor.User.Id, consumedAt,
            resourceSnapshotJson: await Services.LabResourceSnapshot.MaterialAsync(dbContext, lot, cancellationToken));
        try
        {
            lot.Consume(request.Quantity, request.MaterialExhausted, consumption.Id, actor.User.Id, consumedAt);
        }
        catch (InvalidOperationException exception)
        {
            throw Conflict("material_quantity_unavailable", exception.Message);
        }
        dbContext.LabMaterialConsumptions.Add(consumption);
        dbContext.Entry(execution).Property(item => item.UpdatedAt).IsModified = true;
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapExecution(execution);
    }

    [HttpPost("equipment")]
    public async Task<LabEquipmentDto> CreateEquipment([FromBody] CreateEquipmentRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        if (request.LastCalibrationOn > DateOnly.FromDateTime(DateTime.UtcNow))
            throw Invalid("equipment_calibration_date_invalid", "The last calibration date cannot be in the future.");

        var assetCode = await LabIdentifierService.AllocateEquipmentAssetCodeAsync(
            dbContext, DateTime.UtcNow, cancellationToken);
        LabEquipment equipment;
        try
        {
            equipment = new LabEquipment(assetCode, request.Name, request.EquipmentType,
                request.Location, request.LastCalibrationOn, request.CalibrationDueOn);
        }
        catch (ArgumentException exception)
        {
            throw Invalid("equipment_details_invalid", exception.Message);
        }
        dbContext.LabEquipment.Add(equipment);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapEquipment(equipment);
    }

    [HttpPost("equipment/{equipmentId:guid}/retire")]
    public async Task<LabEquipmentDto> RetireEquipment(Guid equipmentId,
        [FromBody] RetireEquipmentRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        var equipment = await dbContext.LabEquipment.SingleOrDefaultAsync(item => item.Id == equipmentId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(equipment.Version, request.Version);
        if (equipment.Status == LabEquipmentStatus.Retired)
            throw Conflict("equipment_already_retired", "The equipment is already retired.");
        try { equipment.Retire(request.Reason, actor.User.Id, DateTime.UtcNow); }
        catch (ArgumentException exception) { throw Invalid("equipment_retirement_invalid", exception.Message); }
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapEquipment(equipment);
    }

    [HttpPost("executions/{executionId:guid}/equipment-usages")]
    public async Task<LabExecutionDto> RecordEquipmentUsage(Guid executionId,
        [FromBody] RecordEquipmentUsageRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var execution = await dbContext.LabProtocolExecutions.SingleOrDefaultAsync(item => item.Id == executionId, cancellationToken)
            ?? throw Missing();
        if (execution.Status is not (LabExecutionStatus.InProgress or LabExecutionStatus.Blocked))
            throw Conflict("execution_not_active", "Equipment use can be recorded only during active execution.");
        await RequireOpenExecutionWorkAsync(execution.LabWorkOrderId, cancellationToken);
        var attempt = await RequireExecutionAttemptAsync(execution, cancellationToken);
        var equipment = await dbContext.LabEquipment
            .SingleOrDefaultAsync(item => item.Id == request.LabEquipmentId, cancellationToken) ?? throw Missing();
        if (!equipment.CanRecordUsage(DateOnly.FromDateTime(request.UsedAtUtc)))
            throw Conflict("equipment_unavailable", "The equipment is retired, out of service, or calibration is overdue.");
        // Save usage and the equipment version atomically against concurrent retirement.
        dbContext.Entry(equipment).Property(item => item.UpdatedAt).IsModified = true;
        dbContext.LabEquipmentUsages.Add(new LabEquipmentUsage(execution.Id, equipment.Id,
            request.UsedAtUtc, actor.User.Id, request.RunReference,
            resourceSnapshotJson: Services.LabResourceSnapshot.Equipment(equipment)));
        dbContext.Entry(execution).Property(item => item.UpdatedAt).IsModified = true;
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapExecution(execution);
    }

    [HttpPost("work-orders/{workOrderId:guid}/libraries")]
    public async Task<LabLibraryDto> CreateLibrary(Guid workOrderId,
        [FromBody] CreateLibraryRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await RequireSpecimenAsync(workOrderId, request.LabSpecimenId, cancellationToken);
        var execution = await dbContext.LabProtocolExecutions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.PreparationExecutionId
                && item.LabWorkOrderId == workOrderId && item.Status == LabExecutionStatus.Completed, cancellationToken)
            ?? throw Conflict("library_execution_required", "A completed preparation execution is required.");
        var containerIds = new[] { request.SourceContainerId, request.LibraryContainerId };
        if (execution.LabSpecimenAttemptId.HasValue) await RequireOutsidePreparationAsync(execution.LabSpecimenAttemptId.Value, cancellationToken);
        var containers = await dbContext.LabContainers.AsNoTracking()
            .Where(item => containerIds.Contains(item.Id) && item.LabWorkOrderId == workOrderId)
            .ToListAsync(cancellationToken);
        if (containers.Count != 2)
            throw Invalid("library_lineage_invalid", "Both source and library containers must belong to this work order.");
        var libraryContainer = containers.Single(item => item.Id == request.LibraryContainerId);
        if (libraryContainer.Kind != LabContainerKind.Library)
            throw Invalid("library_container_invalid", "The library container must be a Phaeno library container.");
        var library = new LabLibrary(workOrderId, request.LabSpecimenId, request.SourceContainerId,
            request.LibraryContainerId, execution.Id, libraryContainer.Barcode);
        await RequireLibraryAttemptAsync(library, cancellationToken, requireSuccess: false);
        dbContext.LabLibraries.Add(library);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapLibrary(library);
    }

    [HttpPost("libraries/{libraryId:guid}/qc")]
    public async Task<LabLibraryDto> RecordLibraryQc(Guid libraryId,
        [FromBody] LibraryQcRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var library = await dbContext.LabLibraries.SingleOrDefaultAsync(item => item.Id == libraryId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(library.Version, request.Version);
        if (await dbContext.LabPreparationMembers.AnyAsync(m => m.LabLibraryId == library.Id, cancellationToken))
            throw Conflict("preparation_qc_authoritative", "This library uses its preparation QC evidence. Open its preparation batch; a second QC entry is not required.");
        await RequireLibraryAttemptAsync(library, cancellationToken, requireSuccess: false);
        library.RecordQc(request.Passed, NormalizeJson(request.ResultsJson, "library_qc_results_invalid"));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapLibrary(library);
    }

    [HttpPost("batches")]
    public async Task<LabBatchDto> CreateBatch([FromBody] CreateBatchRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var batchNumber = await LabIdentifierService.AllocateBatchNumberAsync(
            dbContext, DateTime.UtcNow, cancellationToken);
        var batch = new LabOperationalBatch(batchNumber, request.Name, request.Notes);
        dbContext.LabOperationalBatches.Add(batch);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapBatch(batch, 0, null);
    }

    [HttpPost("batches/{batchId:guid}/members")]
    public async Task<LabBatchDto> AddBatchMember(Guid batchId,
        [FromBody] AddBatchMemberRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await PhaenoPortal.App.Features.OrderManagement.Services.SampleShippingPackingData.BeginAsync(dbContext, $"lab-sequencing-batch:{batchId}", cancellationToken);
        var batch = await dbContext.LabOperationalBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing();
        if (batch.Status != LabBatchStatus.Draft) throw Conflict("batch_locked", "Only a draft batch can accept libraries.");
        var library = await dbContext.LabLibraries.SingleOrDefaultAsync(item => item.Id == request.LabLibraryId
            && item.LabWorkOrderId == request.LabWorkOrderId, cancellationToken) ?? throw Missing();
        if (await dbContext.LabBatchMembers.AsNoTracking().AnyAsync(
            item => item.LabOperationalBatchId == batch.Id
                && item.LabLibraryId == library.Id,
            cancellationToken))
            throw Conflict("batch_member_duplicate", "This library is already in the selected batch.");
        await RequireLibraryAttemptAsync(library, cancellationToken);
        var libraryContainer = await dbContext.LabContainers.SingleAsync(c => c.Id == library.LibraryContainerId, cancellationToken);
        if (libraryContainer.Status != LabContainerStatus.Available)
            throw Conflict("library_material_unavailable", "Confirm the library's physical availability before adding it to a sequencing batch.");
        dbContext.Entry(libraryContainer).Property(c => c.UpdatedAt).IsModified = true;
        if (library.Status != LabLibraryStatus.QcPassed)
        {
            var specimen = await RequireSpecimenAsync(library.LabWorkOrderId, library.LabSpecimenId, cancellationToken);
            var required = (await ReadSequencingRunAllocationsAsync(library.LabWorkOrderId, cancellationToken)).GetValueOrDefault(specimen.SubmittedSpecimenId, 1);
            var approved = (await new LabSequencingRunProgress(dbContext).ApprovedCountsAsync(library.LabWorkOrderId, cancellationToken)).GetValueOrDefault(specimen.SubmittedSpecimenId);
            if (library.Status is not (LabLibraryStatus.Batched or LabLibraryStatus.Complete or LabLibraryStatus.SentForSequencing)
                || required <= 1 || approved >= required)
                throw Conflict("library_qc_required", "Use a QC-passed library with outstanding authorized sequencing runs.");
            if (await (from member in dbContext.LabBatchMembers join previousBatch in dbContext.LabOperationalBatches on member.LabOperationalBatchId equals previousBatch.Id
                where member.LabLibraryId == library.Id && previousBatch.Status != LabBatchStatus.Complete select member.Id).AnyAsync(cancellationToken)
                || await (from member in dbContext.LabBatchMembers join sendout in dbContext.LabNgsSendouts on member.LabOperationalBatchId equals sendout.LabOperationalBatchId
                where member.LabLibraryId == library.Id && sendout.Status != LabNgsSendoutStatus.Complete select sendout.Id).AnyAsync(cancellationToken))
                throw Conflict("library_sequencing_active", "Complete this library's previous sequencing batch and sendout before reusing it in another batch.");
        }
        dbContext.LabBatchMembers.Add(new LabBatchMember(batch.Id, request.LabWorkOrderId, library.Id, DateTime.UtcNow));
        library.SetStatus(LabLibraryStatus.Batched);
        dbContext.Entry(batch).Property(b => b.UpdatedAt).IsModified = true;
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return (await ReadBatchesAsync(cancellationToken)).Single(item => item.Id == batch.Id);
    }

    [HttpPost("batches/{batchId:guid}/transition")]
    public async Task<LabBatchDto> TransitionBatch(Guid batchId,
        [FromBody] BatchTransitionRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        await using var transaction = await PhaenoPortal.App.Features.OrderManagement.Services.SampleShippingPackingData.BeginAsync(dbContext, $"lab-sequencing-batch:{batchId}", cancellationToken);
        var batch = await dbContext.LabOperationalBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(batch.Version, request.Version);
        var occurredAtUtc = request.OccurredAtUtc?.ToUniversalTime() ?? DateTime.UtcNow;
        await RequireBatchAttemptReadinessAsync(batch.Id, cancellationToken);
        switch (request.Action.Trim().ToLowerInvariant())
        {
            case "start": batch.Start(occurredAtUtc); break;
            case "complete": batch.Complete(occurredAtUtc); break;
            default: throw Invalid("batch_transition_invalid", "The batch transition is invalid.");
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return (await ReadBatchesAsync(cancellationToken)).Single(item => item.Id == batch.Id);
    }
}
