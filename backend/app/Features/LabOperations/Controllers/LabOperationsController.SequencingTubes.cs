namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public sealed partial class LabOperationsController
{
    [HttpGet("batches/{batchId:guid}/sequencing-tubes")]
    public async Task<LabSequencingTubeWorkspaceDto> SequencingTubes(Guid batchId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        return await ReadSequencingTubesAsync(batchId, ct);
    }

    private async Task<LabSequencingTubeWorkspaceDto> ReadSequencingTubesAsync(Guid batchId, CancellationToken ct)
    {
        var batch = await dbContext.LabOperationalBatches.AsNoTracking().SingleOrDefaultAsync(b => b.Id == batchId, ct) ?? throw Missing();
        var members = await dbContext.LabBatchMembers.AsNoTracking().Where(m => m.LabOperationalBatchId == batchId).ToListAsync(ct);
        var libraryIds = members.Select(m => m.LabLibraryId).ToList();
        var libraries = await dbContext.LabLibraries.AsNoTracking().Where(l => libraryIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, ct);
        var containerIds = libraries.Values.Select(l => l.LibraryContainerId).Concat(members.Where(m => m.SequencingContainerId.HasValue).Select(m => m.SequencingContainerId!.Value)).ToList();
        var containers = await dbContext.LabContainers.AsNoTracking().Where(c => containerIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, ct);
        var memberIds = members.Select(m => m.Id).ToList();
        var transfers = await dbContext.LabBiologicalMaterialTransfers.AsNoTracking().Where(t => t.SequencingBatchMemberId.HasValue && memberIds.Contains(t.SequencingBatchMemberId.Value)).ToDictionaryAsync(t => t.Id, ct);
        return new(batch.Id, batch.Version, batch.Status.ToString(), await dbContext.LabNgsSendouts.AnyAsync(s => s.LabOperationalBatchId == batchId, ct),
            members.Select(m =>
            {
                var library = libraries[m.LabLibraryId];
                var source = containers[library.LibraryContainerId];
                var destination = m.SequencingContainerId.HasValue ? containers[m.SequencingContainerId.Value] : null;
                return new LabSequencingTubeMemberDto(m.Id, m.LabWorkOrderId, library.Id, library.LibraryKey, MapContainer(source),
                    destination is null ? null : MapContainer(destination),
                    m.MaterialTransferId.HasValue && destination is not null && transfers.TryGetValue(m.MaterialTransferId.Value, out var transfer)
                        ? MapMaterialTransfer(transfer, source.Barcode, destination.Barcode) : null);
            }).OrderBy(m => m.LibraryKey).ToList());
    }

    [HttpPost("batches/{batchId:guid}/members/{memberId:guid}/sequencing-tube")]
    public async Task<LabSequencingTubeWorkspaceDto> ApplySequencingTubeCommand(Guid batchId, Guid memberId,
        [FromBody] LabSequencingTubeCommand request, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        if (request.RequestId == Guid.Empty) throw Invalid("transfer_request_required", "A transfer command identifier is required.");
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-sequencing-batch:{batchId}", ct);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { batchId, memberId, request }, JsonOptions))));
        var member = await dbContext.LabBatchMembers.SingleOrDefaultAsync(m => m.Id == memberId && m.LabOperationalBatchId == batchId, ct) ?? throw Missing();
        var previous = await dbContext.LabAttemptCommandReceipts.AsNoTracking().SingleOrDefaultAsync(r => r.Id == request.RequestId, ct);
        if (previous is not null)
        {
            if (previous.LabWorkOrderId != member.LabWorkOrderId || previous.ActorUserId != actor.User.Id || previous.RequestHash != hash)
                throw Conflict("transfer_request_reused", "This command identifier has already been used for different work.");
            return await ReadSequencingTubesAsync(batchId, ct);
        }
        await SampleShippingPackingData.LockAsync(dbContext, $"lab-tube-receipt:{member.LabWorkOrderId}", ct);
        var batch = await dbContext.LabOperationalBatches.SingleAsync(b => b.Id == batchId, ct);
        EnsureVersion(batch.Version, request.BatchVersion);
        if (batch.Status is not (LabBatchStatus.Draft or LabBatchStatus.InProgress)
            || await dbContext.LabNgsSendouts.AnyAsync(s => s.LabOperationalBatchId == batchId, ct))
            throw Conflict("sequencing_tubes_locked", "Record sequencing transfers before the sendout is frozen.");
        await RequireOpenExecutionWorkAsync(member.LabWorkOrderId, ct);
        var library = await dbContext.LabLibraries.SingleAsync(l => l.Id == member.LabLibraryId, ct);
        await RequireLibraryAttemptAsync(library, ct);
        RequireSequencingLibraryQc(library);
        var source = await dbContext.LabContainers.SingleAsync(c => c.Id == library.LibraryContainerId, ct);
        var execution = await dbContext.LabProtocolExecutions.SingleAsync(e => e.Id == library.PreparationExecutionId, ct);
        if (!execution.LabSpecimenAttemptId.HasValue) throw Conflict("transfer_attempt_required", "The library must have an explicit successful preparation attempt.");
        var attempt = await dbContext.LabSpecimenAttempts.SingleAsync(a => a.Id == execution.LabSpecimenAttemptId.Value, ct);
        var now = DateTime.UtcNow;
        switch (request.Action)
        {
            case "allocate":
            {
                if (member.SequencingContainerId.HasValue) throw Conflict("sequencing_tube_exists", "A sequencing tube is already assigned to this library in the batch.");
                if (source.Status != LabContainerStatus.Available) throw Conflict("library_material_unavailable", "This library has no available material for a new transfer.");
                if (request.SourceVersion is null) throw Invalid("source_version_required", "Refresh the library before assigning a tube.");
                EnsureVersion(source.Version, request.SourceVersion.Value);
                if (request.BarcodeSource is not ("PhaenoGenerated" or "Manufacturer")) throw Invalid("barcode_source_invalid", "Choose a manufacturer barcode or a POMS label.");
                string barcode;
                if (request.BarcodeSource == "Manufacturer")
                {
                    if (!SupplierTubeBarcode.TryNormalize(request.Barcode, out barcode) || barcode.StartsWith("PH-", StringComparison.Ordinal))
                        throw Invalid("manufacturer_barcode_invalid", "Scan the complete manufacturer barcode; POMS identifiers cannot be registered as manufacturer labels.");
                    await SampleShippingPackingData.LockAsync(dbContext, $"supplier-tube:{barcode}", ct);
                    if (await dbContext.LabContainers.AnyAsync(c => c.Barcode == barcode, ct)
                        || await dbContext.RegisteredSampleTubes.AnyAsync(t => t.SupplierBarcode == barcode, ct)
                        || await dbContext.SampleShippingStockTubes.AnyAsync(t => t.SupplierBarcode == barcode, ct)
                        || await dbContext.LabPreparationBatches.AnyAsync(b => (b.TrayBarcode != null && b.TrayBarcode.ToUpper() == barcode) || b.Name.ToUpper() == barcode, ct))
                        throw Conflict("barcode_already_registered", "This barcode already identifies another physical tube.");
                }
                else barcode = await LabBarcodeService.AllocateAsync(dbContext, LabContainerKind.Sequencing, ct);
                var tube = new LabContainer(source.LabWorkOrderId, source.LabSpecimenId, source.Id, LabContainerKind.Sequencing,
                    barcode, $"Sequencing aliquot of {library.LibraryKey}", request.Location, null, null, null,
                    request.BarcodeSource == "Manufacturer" ? LabContainerBarcodeSource.Manufacturer : LabContainerBarcodeSource.PhaenoGenerated);
                tube.AttachAttempt(attempt);
                member.AssignSequencingTube(tube.Id);
                dbContext.LabContainers.Add(tube);
                dbContext.Entry(source).Property(c => c.UpdatedAt).IsModified = true;
                dbContext.LabWorkEvents.Add(new(member.LabWorkOrderId, source.LabSpecimenId, "SequencingTubeAllocated", now, actor.User.Id,
                    JsonSerializer.Serialize(new { batchId, memberId, sourceContainerId = source.Id, destinationContainerId = tube.Id, barcode }, JsonOptions)));
                break;
            }
            case "transfer":
            {
                if (!member.SequencingContainerId.HasValue || member.MaterialTransferId.HasValue)
                    throw Conflict("sequencing_transfer_unavailable", "Allocate an empty sequencing tube, or review the transfer already recorded.");
                var destination = await dbContext.LabContainers.SingleAsync(c => c.Id == member.SequencingContainerId.Value, ct);
                if (request.SourceVersion is null || request.DestinationVersion is null) throw Invalid("transfer_versions_required", "Refresh both tubes before recording the transfer.");
                EnsureVersion(source.Version, request.SourceVersion.Value);
                EnsureVersion(destination.Version, request.DestinationVersion.Value);
                if (!BarcodeMatches(request.ConfirmedSourceBarcode, source.Barcode) || !BarcodeMatches(request.ConfirmedDestinationBarcode, destination.Barcode))
                    throw Invalid("transfer_identity_mismatch", "Scan both the selected library and sequencing tube barcodes.");
                if (request.Quantity is null || request.Quantity <= 0 || string.IsNullOrWhiteSpace(request.QuantityUnit))
                    throw Invalid("transfer_quantity_required", "Enter the positive amount transferred and its unit.");
                if (request.Performance is null || !request.Performance.PersonallyPerformed || request.Performance.PerformedByUserId.HasValue)
                    throw Invalid("transfer_performance_required", "Confirm that you personally performed this transfer.");
                LabStepPerformance? performance = null;
                Execute(() => performance = LabStepPerformance.Capture(request.Performance, actor.User.Id, now));
                LabBiologicalMaterialTransfer? transfer = null;
                Execute(() => transfer = LabBiologicalMaterialTransfer.Record(request.RequestId, hash, source, destination, attempt,
                    request.Quantity.Value, request.QuantityUnit, request.MaterialExhausted, actor.User.Id, now,
                    sequencingBatchMemberId: member.Id, performedByUserId: performance!.PerformedByUserId, performedAtUtc: performance!.PerformedAtUtc));
                dbContext.LabBiologicalMaterialTransfers.Add(transfer!);
                member.AttachSequencingTube(destination.Id, transfer!.Id);
                dbContext.LabWorkEvents.Add(new(member.LabWorkOrderId, source.LabSpecimenId, "BiologicalMaterialTransferred", now, actor.User.Id,
                    JsonSerializer.Serialize(new { batchId, memberId, transferId = transfer.Id, performance }, JsonOptions)));
                break;
            }
            default: throw Invalid("sequencing_tube_action_invalid", "Choose Allocate tube or Record transfer.");
        }
        dbContext.Entry(batch).Property(b => b.UpdatedAt).IsModified = true;
        dbContext.LabAttemptCommandReceipts.Add(new(request.RequestId, member.LabWorkOrderId, actor.User.Id, hash, now));
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return await ReadSequencingTubesAsync(batchId, ct);
    }

    private static bool BarcodeMatches(string? scanned, string expected) =>
        (LabBarcodeService.TryNormalize(scanned, out var normalized) || SupplierTubeBarcode.TryNormalize(scanned, out normalized)) && normalized == expected;

    [HttpGet("work-orders/{workOrderId:guid}/containers/{containerId:guid}/material-transfers")]
    public async Task<IReadOnlyList<LabMaterialTransferDto>> ContainerMaterialTransfers(Guid workOrderId, Guid containerId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, Enum.GetValues<LabRole>());
        if (!await dbContext.LabContainers.AnyAsync(c => c.Id == containerId && c.LabWorkOrderId == workOrderId, ct)) throw Missing();
        return await (from transfer in dbContext.LabBiologicalMaterialTransfers.AsNoTracking()
            join source in dbContext.LabContainers.AsNoTracking() on transfer.SourceContainerId equals source.Id
            join destination in dbContext.LabContainers.AsNoTracking() on transfer.DestinationContainerId equals destination.Id
            where transfer.LabWorkOrderId == workOrderId && (transfer.SourceContainerId == containerId || transfer.DestinationContainerId == containerId)
            orderby transfer.RecordedAtUtc
            select new LabMaterialTransferDto(transfer.Id, source.Id, source.Barcode, destination.Id, destination.Barcode,
                transfer.Quantity, transfer.QuantityUnit, transfer.SourceQuantityBefore, transfer.SourceQuantityAfter, transfer.SourceQuantityBasis,
                transfer.ExhaustedOverride, transfer.BalanceAdjustmentQuantity, transfer.PerformedByUserId, transfer.PerformedAtUtc,
                transfer.RecordedByUserId, transfer.RecordedAtUtc)).ToListAsync(ct);
    }

    private static LabMaterialTransferDto MapMaterialTransfer(LabBiologicalMaterialTransfer t, string sourceBarcode, string destinationBarcode) =>
        new(t.Id, t.SourceContainerId, sourceBarcode, t.DestinationContainerId, destinationBarcode, t.Quantity, t.QuantityUnit,
            t.SourceQuantityBefore, t.SourceQuantityAfter, t.SourceQuantityBasis, t.ExhaustedOverride, t.BalanceAdjustmentQuantity,
            t.PerformedByUserId, t.PerformedAtUtc, t.RecordedByUserId, t.RecordedAtUtc);
}
