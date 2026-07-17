namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    [HttpPost("material-lots")]
    public async Task<LabMaterialLotDto> CreateMaterialLot([FromBody] CreateMaterialLotRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        if (!Enum.TryParse<LabMaterialLotKind>(request.Kind, true, out var kind))
            throw Invalid("material_lot_kind_invalid", "The material lot kind is invalid.");
        var lot = new LabMaterialLot(kind, request.MaterialKey, request.Name, request.LotNumber,
            request.Supplier, NormalizeOptionalJson(request.ComponentsJson, "material_components_invalid"),
            request.ExpiresAtUtc, request.StorageLocation, request.AvailableQuantity, request.QuantityUnit);
        dbContext.LabMaterialLots.Add(lot);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapMaterialLot(lot);
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
        lot.RecordQc(disposition, NormalizeJson(request.ResultsJson, "material_qc_results_invalid"),
            actor.User.Id, DateTime.UtcNow);
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapMaterialLot(lot);
    }

    [HttpPost("executions/{executionId:guid}/material-consumptions")]
    public async Task<LabExecutionDto> ConsumeMaterial(Guid executionId,
        [FromBody] ConsumeMaterialRequest request, CancellationToken cancellationToken)
    {
        var actor = await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var execution = await dbContext.LabProtocolExecutions.SingleOrDefaultAsync(item => item.Id == executionId, cancellationToken)
            ?? throw Missing();
        if (execution.Status != LabExecutionStatus.InProgress)
            throw Conflict("execution_not_active", "Materials can be consumed only during active execution.");
        var lot = await dbContext.LabMaterialLots.SingleOrDefaultAsync(item => item.Id == request.LabMaterialLotId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(lot.Version, request.LotVersion);
        if (lot.QcDisposition is not (LabQcDisposition.Passed or LabQcDisposition.ApprovedException))
            throw Conflict("material_qc_required", "The material lot must pass QC before use.");
        if (lot.ExpiresAtUtc < DateTime.UtcNow)
            throw Conflict("material_expired", "The material lot is expired.");
        if (!string.Equals(lot.QuantityUnit, request.QuantityUnit, StringComparison.OrdinalIgnoreCase))
            throw Invalid("material_unit_mismatch", "Consumption must use the lot's tracked quantity unit.");
        if (request.OutputContainerId.HasValue && !await dbContext.LabContainers
            .AnyAsync(item => item.Id == request.OutputContainerId
                && item.LabWorkOrderId == execution.LabWorkOrderId, cancellationToken))
            throw Invalid("output_container_invalid", "The output container must belong to this work order.");
        lot.Consume(request.Quantity);
        dbContext.LabMaterialConsumptions.Add(new LabMaterialConsumption(execution.Id, lot.Id,
            request.OutputContainerId, request.Quantity, request.QuantityUnit, actor.User.Id, DateTime.UtcNow));
        await dbContext.SaveChangesAsync(cancellationToken);
        return MapExecution(execution);
    }

    [HttpPost("equipment")]
    public async Task<LabEquipmentDto> CreateEquipment([FromBody] CreateEquipmentRequest request,
        CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Supervisor, LabRole.OperationsAdministrator);
        var equipment = new LabEquipment(request.AssetCode, request.Name, request.EquipmentType,
            request.Location, request.LastCalibrationAtUtc, request.CalibrationDueAtUtc);
        dbContext.LabEquipment.Add(equipment);
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
        if (execution.Status != LabExecutionStatus.InProgress)
            throw Conflict("execution_not_active", "Equipment use can be recorded only during active execution.");
        var equipment = await dbContext.LabEquipment.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.LabEquipmentId, cancellationToken) ?? throw Missing();
        if (equipment.Status != LabEquipmentStatus.Active || equipment.CalibrationDueAtUtc < request.UsedAtUtc)
            throw Conflict("equipment_unavailable", "The equipment is out of service or calibration is overdue.");
        dbContext.LabEquipmentUsages.Add(new LabEquipmentUsage(execution.Id, equipment.Id,
            request.UsedAtUtc, actor.User.Id, request.RunReference));
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
        if (await dbContext.LabContainers.CountAsync(item => containerIds.Contains(item.Id)
            && item.LabWorkOrderId == workOrderId, cancellationToken) != 2)
            throw Invalid("library_lineage_invalid", "Both source and library containers must belong to this work order.");
        var library = new LabLibrary(workOrderId, request.LabSpecimenId, request.SourceContainerId,
            request.LibraryContainerId, execution.Id, request.LibraryKey);
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
        var batch = new LabOperationalBatch(request.BatchNumber, request.BatchType, request.Notes);
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
        var batch = await dbContext.LabOperationalBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing();
        if (batch.Status != LabBatchStatus.Draft) throw Conflict("batch_locked", "Only a draft batch can accept libraries.");
        var library = await dbContext.LabLibraries.SingleOrDefaultAsync(item => item.Id == request.LabLibraryId
            && item.LabWorkOrderId == request.LabWorkOrderId, cancellationToken) ?? throw Missing();
        if (library.Status != LabLibraryStatus.QcPassed)
            throw Conflict("library_qc_required", "Only a QC-passed library can be batched.");
        dbContext.LabBatchMembers.Add(new LabBatchMember(batch.Id, request.LabWorkOrderId, library.Id, DateTime.UtcNow));
        library.SetStatus(LabLibraryStatus.Batched);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadBatchesAsync(cancellationToken)).Single(item => item.Id == batch.Id);
    }

    [HttpPost("batches/{batchId:guid}/transition")]
    public async Task<LabBatchDto> TransitionBatch(Guid batchId,
        [FromBody] BatchTransitionRequest request, CancellationToken cancellationToken)
    {
        await requestContext.RequireAsync(HttpContext, cancellationToken,
            LabRole.Operator, LabRole.Supervisor, LabRole.OperationsAdministrator);
        var batch = await dbContext.LabOperationalBatches.SingleOrDefaultAsync(item => item.Id == batchId, cancellationToken)
            ?? throw Missing();
        EnsureVersion(batch.Version, request.Version);
        switch (request.Action.Trim().ToLowerInvariant())
        {
            case "start": batch.Start(); break;
            case "complete": batch.Complete(); break;
            default: throw Invalid("batch_transition_invalid", "The batch transition is invalid.");
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return (await ReadBatchesAsync(cancellationToken)).Single(item => item.Id == batch.Id);
    }
}
