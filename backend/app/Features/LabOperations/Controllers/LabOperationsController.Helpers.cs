namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Commercial.LabOperations.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    private async Task<LabWorkOrder> RequireWorkOrderAsync(Guid workOrderId, CancellationToken cancellationToken) =>
        await dbContext.LabWorkOrders.SingleOrDefaultAsync(item => item.Id == workOrderId, cancellationToken) ?? throw Missing();

    private async Task<LabSpecimen> RequireSpecimenAsync(Guid workOrderId, Guid specimenId, CancellationToken cancellationToken) =>
        await dbContext.LabSpecimens.SingleOrDefaultAsync(item => item.Id == specimenId
            && item.LabWorkOrderId == workOrderId, cancellationToken) ?? throw Missing();

    private async Task<LabMaterialDefinition> ResolveMaterialDefinitionAsync(
        LabMaterialLotKind kind, Guid? existingId, string? newName,
        CancellationToken cancellationToken)
    {
        if (existingId.HasValue == !string.IsNullOrWhiteSpace(newName))
            throw Invalid("material_definition_selection_invalid",
                "Select an existing material or enter a new material name.");

        if (existingId.HasValue)
        {
            return await dbContext.LabMaterialDefinitions.SingleOrDefaultAsync(
                item => item.Id == existingId.Value && item.IsActive && item.Kind == kind,
                cancellationToken)
                ?? throw Invalid("material_definition_invalid",
                    "The selected active material does not match the lot kind.");
        }

        var normalizedName = newName!.Trim();
        if (await dbContext.LabMaterialDefinitions.AsNoTracking().AnyAsync(
            item => item.Kind == kind && item.Name.ToUpper() == normalizedName.ToUpper(),
            cancellationToken))
            throw Conflict("material_definition_exists",
                "A material with this name already exists. Select it from the list.");
        var key = await LabIdentifierService.AllocateMaterialKeyAsync(
            dbContext, normalizedName, cancellationToken);
        var definition = new LabMaterialDefinition(key, normalizedName, kind);
        dbContext.LabMaterialDefinitions.Add(definition);
        return definition;
    }

    private async Task<LabSupplier> ResolveSupplierAsync(
        Guid? existingId, string? newName, CancellationToken cancellationToken)
    {
        if (existingId.HasValue == !string.IsNullOrWhiteSpace(newName))
            throw Invalid("material_supplier_selection_invalid",
                "Select an existing supplier or enter a new supplier name.");
        if (existingId.HasValue)
        {
            return await dbContext.LabSuppliers.SingleOrDefaultAsync(
                item => item.Id == existingId.Value && item.IsActive, cancellationToken)
                ?? throw Invalid("material_supplier_invalid", "The selected supplier is not active.");
        }

        var candidate = new LabSupplier(newName!);
        var existing = await dbContext.LabSuppliers.SingleOrDefaultAsync(
            item => item.NormalizedName == candidate.NormalizedName, cancellationToken);
        if (existing is not null)
        {
            if (!existing.IsActive)
                throw Conflict("material_supplier_inactive",
                    "This supplier is retired and must be reactivated before use.");
            return existing;
        }
        dbContext.LabSuppliers.Add(candidate);
        return candidate;
    }

    private async Task<LabStorageLocation> ResolveStorageLocationAsync(
        Guid? existingId, string? newName, CancellationToken cancellationToken)
    {
        if (existingId.HasValue == !string.IsNullOrWhiteSpace(newName))
            throw Invalid("material_storage_selection_invalid",
                "Select an existing storage location or enter a new location name.");
        if (existingId.HasValue)
        {
            return await dbContext.LabStorageLocations.SingleOrDefaultAsync(
                item => item.Id == existingId.Value && item.IsActive, cancellationToken)
                ?? throw Invalid("material_storage_invalid", "The selected storage location is not active.");
        }

        var candidate = new LabStorageLocation(newName!);
        var existing = await dbContext.LabStorageLocations.SingleOrDefaultAsync(
            item => item.NormalizedName == candidate.NormalizedName, cancellationToken);
        if (existing is not null)
        {
            if (!existing.IsActive)
                throw Conflict("material_storage_inactive",
                    "This storage location is retired and must be reactivated before use.");
            return existing;
        }
        dbContext.LabStorageLocations.Add(candidate);
        return candidate;
    }

    private async Task EmitProjectionAsync(LabWorkOrder work, Guid actorUserId,
        string eventType, CancellationToken cancellationToken, DateTime? expectedCompletionAtUtc = null,
        string? permittedQcProjectionJson = null)
    {
        var persisted = await dbContext.LabExceptions.AsNoTracking()
            .Where(item => item.LabWorkOrderId == work.Id)
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        foreach (var entry in dbContext.ChangeTracker.Entries<LabException>()
            .Where(entry => entry.Entity.LabWorkOrderId == work.Id))
        {
            if (entry.State == EntityState.Deleted) persisted.Remove(entry.Entity.Id);
            else persisted[entry.Entity.Id] = entry.Entity;
        }
        var customerActions = persisted.Values.Where(item => item.Status == LabExceptionStatus.Open
            && item.Audience == PSeq.Operations.Laboratory.Domain.LabExceptionAudience.CustomerActionRequired).ToList();
        var hasBlockingException = persisted.Values.Any(item => item.Status == LabExceptionStatus.Open && item.IsBlocking);
        var milestone = MapMilestone(work.Status);
        var scheduleHealth = work.Status is LabWorkOrderStatus.ReadyForRelease or LabWorkOrderStatus.Cancelled
            ? LabScheduleHealth.Complete
            : hasBlockingException ? LabScheduleHealth.Delayed
            : work.Status == LabWorkOrderStatus.OnHold ? LabScheduleHealth.AtRisk
            : LabScheduleHealth.OnTrack;
        var customerSummary = customerActions.OrderBy(item => item.CreatedAt)
            .Select(item => item.CustomerSafeSummary).FirstOrDefault();
        var payload = JsonSerializer.Serialize(new
        {
            authorizationVersion = work.CurrentAuthorizationVersion,
            milestone = milestone.ToString(),
            scheduleHealth = scheduleHealth.ToString(),
            currentExpectedCompletionAtUtc = expectedCompletionAtUtc,
            activeCustomerActionCount = customerActions.Count,
            customerSafeSummary = customerSummary,
            permittedQcProjectionJson
        }, JsonOptions);
        dbContext.LabOperationsOutboxEvents.Add(new LabOperationsOutboxEvent(
            Guid.NewGuid(), work.AuthorizationId, work.Id, work.ProjectionVersion,
            eventType, payload, DateTime.UtcNow));
        dbContext.LabWorkEvents.Add(new LabWorkEvent(work.Id, null, eventType,
            DateTime.UtcNow, actorUserId, payload));
    }

    private async Task<List<LabProtocolDto>> ReadProtocolsAsync(CancellationToken cancellationToken)
    {
        var protocols = await dbContext.LabProtocols.AsNoTracking().OrderBy(item => item.Name).ToListAsync(cancellationToken);
        var versions = await dbContext.LabProtocolVersions.AsNoTracking()
            .OrderBy(item => item.ProtocolVersion).ToListAsync(cancellationToken);
        var versionsByProtocol = versions.GroupBy(item => item.LabProtocolId)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<LabProtocolVersionDto>)group.Select(MapProtocolVersion).ToList());
        return protocols.Select(protocol => MapProtocol(protocol,
            versionsByProtocol.GetValueOrDefault(protocol.Id) ?? [])).ToList();
    }

    private async Task<List<LabBatchDto>> ReadBatchesAsync(CancellationToken cancellationToken)
    {
        var batches = await dbContext.LabOperationalBatches.AsNoTracking()
            .OrderByDescending(item => item.CreatedAt).ToListAsync(cancellationToken);
        var counts = await dbContext.LabBatchMembers.AsNoTracking().GroupBy(item => item.LabOperationalBatchId)
            .Select(group => new { Id = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.Id, item => item.Count, cancellationToken);
        var sendouts = await dbContext.LabNgsSendouts.AsNoTracking()
            .ToDictionaryAsync(item => item.LabOperationalBatchId, cancellationToken);
        return batches.Select(batch =>
        {
            sendouts.TryGetValue(batch.Id, out var sendout);
            return MapBatch(batch, counts.GetValueOrDefault(batch.Id), sendout?.Status.ToString(), sendout?.Id, sendout?.Version);
        }).ToList();
    }

    private async Task<List<LabMaterialLotDto>> ReadMaterialLotsAsync(
        CancellationToken cancellationToken)
    {
        var lots = await dbContext.LabMaterialLots.AsNoTracking().ToListAsync(cancellationToken);
        var definitions = await dbContext.LabMaterialDefinitions.AsNoTracking()
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        var suppliers = await dbContext.LabSuppliers.AsNoTracking()
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        var storageLocations = await dbContext.LabStorageLocations.AsNoTracking()
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        var components = await dbContext.LabPreparedReagentComponents.AsNoTracking()
            .OrderBy(item => item.Id)
            .ToListAsync(cancellationToken);
        var componentsByPreparedLot = components
            .GroupBy(item => item.PreparedMaterialLotId)
            .ToDictionary(group => group.Key, group => group.ToList());
        var lotsById = lots.ToDictionary(item => item.Id);

        return lots.Select(lot =>
        {
            var definition = definitions[lot.MaterialDefinitionId];
            suppliers.TryGetValue(lot.SupplierId ?? Guid.Empty, out var supplier);
            var storageLocation = storageLocations[lot.StorageLocationId];
            var componentDtos = componentsByPreparedLot.GetValueOrDefault(lot.Id)?
                .Select(component =>
                {
                    var componentLot = lotsById[component.ComponentMaterialLotId];
                    var componentDefinition = definitions[componentLot.MaterialDefinitionId];
                    return new LabPreparedReagentComponentDto(
                        component.Id, component.ComponentMaterialLotId,
                        componentDefinition.Key, componentDefinition.Name,
                        componentLot.LotNumber, component.Quantity, component.QuantityUnit);
                })
                .ToList() ?? [];

            return new LabMaterialLotDto(
                lot.Id, lot.Kind.ToString(), definition.Id, definition.Key, definition.Name,
                lot.LotNumber, supplier?.Id, supplier?.Name, lot.ExpirationOrRetestDate,
                storageLocation.Id, storageLocation.Name, lot.AvailableQuantity,
                lot.QuantityUnit, lot.QcDisposition.ToString(), lot.QcPerformedOn,
                lot.QcFailureReason, componentDtos, lot.Version);
        })
        .OrderBy(item => item.Name)
        .ThenBy(item => item.LotNumber)
        .ToList();
    }

    private async Task<List<LabRoleAssignmentDto>> ReadRoleAssignmentsAsync(CancellationToken cancellationToken)
    {
        var assignments = await dbContext.LabRoleAssignments.AsNoTracking()
            .OrderBy(item => item.UserId).ThenBy(item => item.Role).ToListAsync(cancellationToken);
        var userIds = assignments.Select(item => item.UserId).Distinct().ToList();
        var users = await dbContext.Users.AsNoTracking().Where(item => userIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, cancellationToken);
        return assignments.Select(item =>
        {
            users.TryGetValue(item.UserId, out var user);
            return new LabRoleAssignmentDto(item.Id, item.UserId,
                user is null ? "Unknown user" : $"{user.FirstName} {user.LastName}".Trim(),
                user?.Email ?? string.Empty, item.Role.ToString(), item.IsActive, item.Version);
        }).ToList();
    }

    private static LabWorkOrderSummaryDto MapWorkOrder(
        LabWorkOrder work,
        IReadOnlyDictionary<Guid, CommercialLabAuthorization> authorizations,
        IReadOnlyDictionary<Guid, LabServiceOrder> commercialOrders,
        int specimenCount,
        int openExceptionCount)
    {
        authorizations.TryGetValue(work.AuthorizationId, out var authorization);
        LabServiceOrder? commercialOrder = null;
        if (authorization is not null) commercialOrders.TryGetValue(authorization.CommercialOrderId, out commercialOrder);
        return new LabWorkOrderSummaryDto(work.Id, work.AuthorizationId,
            authorization?.CommercialOrderId, commercialOrder?.OrderNumber,
            work.SubmittingOrganizationId, work.ServiceKey, work.Status.ToString(),
            specimenCount, openExceptionCount, work.UpdatedAt, work.Version);
    }

    private static LabProtocolDto MapProtocol(LabProtocol protocol, IReadOnlyList<LabProtocolVersionDto> versions) =>
        new(protocol.Id, protocol.Key, protocol.Name, protocol.Description,
            protocol.LatestVersion, versions, protocol.Version);

    private static LabProtocolVersionDto MapProtocolVersion(LabProtocolVersion version) =>
        new(version.Id, version.ProtocolVersion, version.Status.ToString(), version.DefinitionJson,
            version.AuthoredByUserId, version.AuthoredAtUtc, version.ApprovedByUserId, version.ApprovedAtUtc);

    private static LabEquipmentDto MapEquipment(LabEquipment item) =>
        new(item.Id, item.AssetCode, item.Name, item.EquipmentType, item.Location,
            item.Status.ToString(), item.LastCalibrationOn, item.CalibrationDueOn, item.Version);

    private static LabBatchDto MapBatch(LabOperationalBatch item, int memberCount, string? sendoutStatus,
        Guid? sendoutId = null, long? sendoutVersion = null) =>
        new(item.Id, item.BatchNumber, item.Name, item.BatchType, item.Status.ToString(),
            item.StartedAtUtc, item.CompletedAtUtc, item.Notes,
            memberCount, sendoutId, sendoutStatus, sendoutVersion, item.Version);

    private static LabContainerDto MapContainer(LabContainer item) =>
        new(item.Id, item.LabSpecimenId, item.ParentContainerId, item.Kind.ToString(), item.Barcode,
            item.Label, item.LabelPrintCount, item.Location, item.Quantity, item.QuantityUnit,
            item.Status.ToString(), item.RetainUntilUtc, item.Version);

    private static LabExecutionDto MapExecution(LabProtocolExecution item) =>
        new(item.Id, item.LabSpecimenId, item.LabProtocolVersionId, item.AssignedToUserId,
            item.Status.ToString(), item.CapturedResultsJson, item.DeviationNote,
            item.StartedAtUtc, item.CompletedAtUtc, item.Version);

    private static LabLibraryDto MapLibrary(LabLibrary item) =>
        new(item.Id, item.LabSpecimenId, item.SourceContainerId, item.LibraryContainerId,
            item.PreparationExecutionId, item.LibraryKey, item.Status.ToString(),
            item.QcResultsJson, item.Version);

    private static LabExceptionDto MapException(LabException item) =>
        new(item.Id, item.LabSpecimenId, item.LabProtocolExecutionId, item.Audience.ToString(),
            item.CategoryCode, item.Title, item.InternalDescription, item.CustomerSafeSummary,
            item.IsBlocking, item.Status.ToString(), item.ResponseDueAtUtc, item.ResolvedAtUtc, item.Version);

    private static LabWorkMilestone MapMilestone(LabWorkOrderStatus status) => status switch
    {
        LabWorkOrderStatus.AwaitingSpecimens => LabWorkMilestone.AwaitingSpecimens,
        LabWorkOrderStatus.Received => LabWorkMilestone.Received,
        LabWorkOrderStatus.OnHold => LabWorkMilestone.OnHold,
        LabWorkOrderStatus.Processing => LabWorkMilestone.Processing,
        LabWorkOrderStatus.AwaitingExternalSequencing => LabWorkMilestone.AwaitingExternalSequencing,
        LabWorkOrderStatus.DataProcessing => LabWorkMilestone.DataProcessing,
        LabWorkOrderStatus.ScientificReview => LabWorkMilestone.ScientificReview,
        LabWorkOrderStatus.ReadyForRelease => LabWorkMilestone.ReadyForRelease,
        LabWorkOrderStatus.Cancelled => LabWorkMilestone.Cancelled,
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    private static string NormalizeJson(string value, string errorCode)
    {
        try
        {
            using var document = JsonDocument.Parse(value);
            return document.RootElement.GetRawText();
        }
        catch (JsonException)
        {
            throw Invalid(errorCode, "The supplied JSON is invalid.");
        }
    }

    private static string? NormalizeOptionalJson(string? value, string errorCode) =>
        string.IsNullOrWhiteSpace(value) ? null : NormalizeJson(value, errorCode);

    private static void EnsureVersion(long actual, long? expected)
    {
        if (!expected.HasValue) return;
        if (actual != expected.Value) throw Conflict("concurrency_conflict", "This record changed. Refresh and try again.");
    }

    private void MarkProtocolCandidateChanged(LabProtocol protocol) =>
        dbContext.Entry(protocol).Property(item => item.UpdatedAt).IsModified = true;

    private static void Execute(Action action)
    {
        try { action(); }
        catch (ArgumentException exception) { throw Invalid("lab_validation_failed", exception.Message); }
        catch (InvalidOperationException exception) { throw Conflict("lab_transition_not_allowed", exception.Message); }
    }

    private static OrderManagementException Invalid(string code, string message) => new(code, message);
    private static OrderManagementException Conflict(string code, string message) =>
        new(code, message, StatusCodes.Status409Conflict);
    private static OrderManagementException Missing() =>
        new("lab_record_not_found", "The requested laboratory record was not found.", StatusCodes.Status404NotFound);
}
