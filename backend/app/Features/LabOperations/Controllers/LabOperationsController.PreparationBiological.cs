namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class LabOperationsController
{
    private async Task AllocatePreparationLibraryTubeAsync(LabPreparationBatch batch, LabPreparationMember member,
        LabSpecimenAttempt attempt, LabPreparationCommand request, CancellationToken ct)
    {
        if (batch.Status is not (LabBatchStatus.Draft or LabBatchStatus.InProgress)) throw new InvalidOperationException("Closed preparation batches cannot allocate new tubes.");
        if (attempt.State is not (LabSpecimenAttemptState.Planned or LabSpecimenAttemptState.InProgress) || attempt.HoldReason is not null)
            throw new InvalidOperationException("Resolve this attempt's hold before identifying its library tube.");
        batch.RequireTray();
        await RequireAttemptSourceAsync(attempt, ct);
        if (member.LibraryTubeContainerId.HasValue || member.OutputContainerId.HasValue) throw new InvalidOperationException("This member already has its library tube. Open that tube rather than allocating another.");
        var barcodeSource = request.BarcodeSource switch
        {
            "PhaenoGenerated" => LabContainerBarcodeSource.PhaenoGenerated,
            "Manufacturer" => LabContainerBarcodeSource.Manufacturer,
            _ => throw new ArgumentException("Choose a manufacturer barcode or a POMS-generated label.")
        };
        string barcode;
        if (barcodeSource == LabContainerBarcodeSource.PhaenoGenerated)
        {
            if (!string.IsNullOrWhiteSpace(request.Barcode)) throw new ArgumentException("POMS allocates the generated tube barcode.");
            barcode = await LabBarcodeService.AllocateAsync(dbContext, LabContainerKind.Library, ct);
        }
        else
        {
            if (!SupplierTubeBarcode.TryNormalize(request.Barcode, out barcode)) throw new ArgumentException("Scan the full manufacturer tube barcode.");
            if (barcode.StartsWith("PH-", StringComparison.Ordinal)) throw new ArgumentException("A POMS barcode must be allocated by POMS.");
        }
        await SampleShippingPackingData.LockAsync(dbContext, $"supplier-tube:{barcode}", ct);
        if (await dbContext.LabContainers.AnyAsync(c => c.Barcode == barcode, ct)
            || await dbContext.RegisteredSampleTubes.AnyAsync(t => t.SupplierBarcode == barcode, ct)
            || await dbContext.SampleShippingStockTubes.AnyAsync(t => t.SupplierBarcode == barcode, ct)
            || await dbContext.LabPreparationBatches.AnyAsync(b => (b.TrayBarcode != null && b.TrayBarcode.ToUpper() == barcode) || b.Name.ToUpper() == barcode, ct))
            throw new InvalidOperationException("This barcode is already assigned to another tube, inventory record or tray.");
        var tube = new LabContainer(attempt.LabWorkOrderId, attempt.LabSpecimenId, attempt.SourceContainerId,
            LabContainerKind.Library, barcode, $"Library tube · {member.Position}", $"Tray {batch.TrayBarcode} · {member.Position}", null, null, null, barcodeSource);
        tube.AttachAttempt(attempt);
        dbContext.LabContainers.Add(tube);
        member.AssignLibraryTube(tube.Id);
    }

    private async Task<string?> RecordPreparationBiologicalMaterialAsync(LabProtocolCaptureDefinition field,
        LabPreparationResourceFieldInput? entry, LabPreparationMember member, LabSpecimenAttempt attempt,
        LabPreparationStepInput input, LabPreparationCommand request, Guid actorId, CancellationToken ct)
    {
        if (entry is null)
        {
            if (!member.MaterialTransferId.HasValue) return null;
            var recorded = await dbContext.LabBiologicalMaterialTransfers.AsNoTracking().SingleAsync(t => t.Id == member.MaterialTransferId, ct);
            return $"Recorded transfer {recorded.Id} · {recorded.Quantity} {recorded.QuantityUnit} · Library tube {recorded.DestinationContainerId}";
        }
        attempt.RequireOpen();
        RequireFieldQuantity(entry, field.Label);
        if (entry.ProductId.HasValue || entry.Name is not null || entry.Vendor is not null || entry.RunReference is not null || entry.Location is not null)
            throw new ArgumentException("Biological material uses the selected specimen source and allocated library tube.");
        if (!string.IsNullOrWhiteSpace(field.Unit) && field.Unit.Trim() != entry.QuantityUnit?.Trim())
            throw new ArgumentException($"{field.Label}: use the configured unit ({field.Unit}).");
        if (!member.LibraryTubeContainerId.HasValue || member.OutputContainerId.HasValue)
            throw new InvalidOperationException("Identify the library tube before pipetting; prepared yield must not already be recorded.");
        var source = await RequireAttemptSourceAsync(attempt, ct);
        if (entry.ResourceId != source.Id) throw new ArgumentException("Transfer from this attempt's selected specimen tube.");
        if (!SupplierTubeBarcode.TryNormalize(entry.SourceBarcode, out var scannedSource) || scannedSource != source.Barcode)
            throw new ArgumentException("Scan the selected source tube barcode to confirm the physical material withdrawn.");
        EnsureVersion(source.Version, entry.ResourceVersion ?? -1);
        var destination = await dbContext.LabContainers.SingleAsync(c => c.Id == member.LibraryTubeContainerId, ct);
        var scanned = entry.Barcode?.Trim();
        if (!SupplierTubeBarcode.TryNormalize(scanned, out var normalized) || normalized != destination.Barcode)
            throw new ArgumentException("Scan the allocated library tube barcode to confirm the physical destination.");
        var now = LabEvidenceTime.UtcNow;
        var performance = LabStepPerformance.Capture(input.Performance ?? throw new ArgumentException("Record who performed the physical transfer and when."), actorId, now);
        var transfer = LabBiologicalMaterialTransfer.Record(request.RequestId, PreparationHash(new { request, member.Id, field.Key }), source, destination, attempt,
            entry.Quantity!.Value, entry.QuantityUnit!.Trim(), entry.MaterialExhausted, actorId, now, preparationMemberId: member.Id,
            performedByUserId: performance.PerformedByUserId, performedAtUtc: performance.PerformedAtUtc, exhaustionReason: entry.ExhaustionReason);
        dbContext.LabBiologicalMaterialTransfers.Add(transfer);
        member.RecordMaterialTransfer(transfer.Id);
        return $"{source.Barcode} → {destination.Barcode} · {transfer.Quantity} {transfer.QuantityUnit} · Transfer {transfer.Id}"
            + (transfer.ExhaustedOverride ? " · Material exhausted (operator override)" : "")
            + $" · Source remaining: {(source.Quantity.HasValue ? source.Quantity.Value.ToString(System.Globalization.CultureInfo.InvariantCulture) : "unknown")} {source.QuantityUnit}";
    }
}
