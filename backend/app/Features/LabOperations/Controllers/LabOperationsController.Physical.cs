namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record StorageBoxInput(Guid RequestId, string Barcode, string Room, string Freezer, string Rack, string Shelf, string Reason, long? Version = null);
public sealed record PhysicalContainerInput(Guid RequestId, long Version, string Kind, string ScannedBarcode, string Reason,
    string? OccurredAt = null, string? Method = null, string? Destination = null, string? TrackingReference = null,
    DateTime? RetainUntilUtc = null, string? Position = null, string? MeasuredQuantityText = null, string? MeasuredQuantityUnit = null);

public sealed partial class LabOperationsController
{
    [HttpGet("physical-retention")]
    public async Task<object> PhysicalRetention([FromQuery] string filter = "due", [FromQuery] int page = 1, CancellationToken ct = default)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        if (filter is not ("due" or "holds" or "unknown") || page < 1 || page > 100000) throw Invalid("physical_filter_invalid", "Choose due material, preservation holds or unknown retention.");
        var now = DateTime.UtcNow;
        var query = from tube in dbContext.LabContainers.AsNoTracking()
            where tube.Location != null && tube.Status != LabContainerStatus.Disposed && tube.Status != LabContainerStatus.Returned && tube.Status != LabContainerStatus.Transferred
            let trial = (from sample in dbContext.TrialSamples where sample.LabWorkOrderId == tube.LabWorkOrderId
                join project in dbContext.TrialProjects on sample.TrialProjectId equals project.Id select project).FirstOrDefault()
            let until = trial != null ? trial.ResidualRetainUntilUtc : tube.RetainUntilUtc
            let held = tube.PhysicalHoldReason != null || trial != null && trial.IsOnHold
            where filter == "due" ? until <= now : filter == "holds" ? held : until == null && trial == null
            orderby until, tube.Id
            select new { tube.Id, tube.LabWorkOrderId, tube.Barcode, tube.Location, tube.StoragePosition, tube.PhysicalHoldReason,
                trialHold = trial != null && trial.IsOnHold, retainUntilUtc = until, status = tube.Status.ToString() };
        var items = await query.Skip((page - 1) * 25).Take(26).ToListAsync(ct);
        var hasMore = items.Count > 25; if (hasMore) items.RemoveAt(25);
        return new { items, page, hasMore };
    }

    private static string PhysicalHash(object request) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request, JsonOptions)))).ToLowerInvariant();

    [HttpGet("storage-boxes")]
    public async Task<IReadOnlyList<LabStorageBox>> FindStorageBoxes([FromQuery] string barcode, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.OperationsAdministrator, LabRole.ProtocolAdministrator);
        return await dbContext.Set<LabStorageBox>().AsNoTracking().Where(b => b.Barcode == barcode.Trim()).ToListAsync(ct);
    }

    [HttpPost("storage-boxes")]
    public async Task<LabStorageBox> SaveStorageBox([FromBody] StorageBoxInput input, CancellationToken ct)
    {
        var actor = await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var hash = PhysicalHash(input);
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"storage-box:{input.Barcode.Trim()}", ct);
        var receipt = await dbContext.Set<LabStorageBoxMove>().AsNoTracking().SingleOrDefaultAsync(e => e.Id == input.RequestId, ct);
        if (receipt is not null)
        {
            if (receipt.RequestHash != hash || receipt.ActorUserId != actor.User.Id) throw Conflict("storage_request_reused", "This storage request identity has already been used.");
            return await dbContext.Set<LabStorageBox>().AsNoTracking().SingleAsync(b => b.Id == receipt.LabStorageBoxId, ct);
        }
        var box = await dbContext.Set<LabStorageBox>().SingleOrDefaultAsync(b => b.Barcode == input.Barcode.Trim(), ct);
        object? previous = box is null ? null : new { box.Room, box.Freezer, box.Rack, box.Shelf };
        if (box is null)
        {
            if (input.Version.HasValue) throw Conflict("storage_box_missing", "This box no longer matches the loaded record.");
            Execute(() => box = new(input.Barcode, input.Room, input.Freezer, input.Rack, input.Shelf));
            dbContext.Set<LabStorageBox>().Add(box!);
        }
        else
        {
            if (!input.Version.HasValue) throw Conflict("storage_box_exists", "This box is already registered. Load its location before moving it.");
            EnsureVersion(box.Version, input.Version.Value);
            Execute(() => box.Move(input.Room, input.Freezer, input.Rack, input.Shelf));
        }
        Execute(() => dbContext.Set<LabStorageBoxMove>().Add(new(input.RequestId, box!.Id, actor.User.Id, LabEvidenceTime.UtcNow, input.Reason,
            JsonSerializer.Serialize(new { previous, destination = new { box.Room, box.Freezer, box.Rack, box.Shelf } }, JsonOptions), hash)));
        await dbContext.SaveChangesAsync(ct); if (transaction is not null) await transaction.CommitAsync(ct); return box!;
    }

    [HttpGet("containers/{containerId:guid}/physical")]
    public async Task<object> PhysicalContainer(Guid containerId, CancellationToken ct)
    {
        await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor, LabRole.ScientificReviewer, LabRole.ProtocolAdministrator, LabRole.OperationsAdministrator);
        var tube = await dbContext.LabContainers.AsNoTracking().SingleOrDefaultAsync(c => c.Id == containerId, ct) ?? throw Missing();
        await RequireWorkOrderAsync(tube.LabWorkOrderId, ct);
        var history = await ReadPhysicalHistoryAsync(new[] { containerId }, ct);
        var box = tube.StorageBoxId.HasValue ? await dbContext.Set<LabStorageBox>().AsNoTracking().SingleAsync(b => b.Id == tube.StorageBoxId, ct) : null;
        var trial = await PhysicalTrialAsync(tube.LabWorkOrderId, ct);
        var terms = trial?.Scopes.SingleOrDefault(s => s.Revision == trial.ApprovedScopeRevision)?.Read();
        return new { box, tube.StoragePosition, tube.PhysicalHoldReason, retainUntilUtc = trial is null ? tube.RetainUntilUtc : trial.ResidualRetainUntilUtc,
            trialHold = trial?.IsOnHold ?? false, trialTerms = terms is null ? null : new { materialDisposition = terms.MaterialDisposition.ToString(), terms.ReturnDestination, terms.ReturnHandling, terms.ReturnShippingPayer, terms.ResidualRetentionDays }, history };
    }

    [HttpPost("containers/{containerId:guid}/physical")]
    public async Task<LabContainerDto> RecordPhysicalContainer(Guid containerId, [FromBody] PhysicalContainerInput input, CancellationToken ct)
    {
        var actor = input.Kind is "RetentionSet" or "HoldPlaced" or "HoldReleased"
            ? await requestContext.RequireAsync(HttpContext, ct, LabRole.Supervisor)
            : await requestContext.RequireAsync(HttpContext, ct, LabRole.Operator, LabRole.Supervisor);
        var initial = await dbContext.LabContainers.AsNoTracking().SingleOrDefaultAsync(c => c.Id == containerId, ct) ?? throw Missing();
        await using var transaction = await SampleShippingPackingData.BeginAsync(dbContext, $"lab-tube-receipt:{initial.LabWorkOrderId}", ct);
        await RequireWorkOrderAsync(initial.LabWorkOrderId, ct);
        var hash = PhysicalHash(new { containerId, input });
        var existing = await dbContext.Set<LabPhysicalEvent>().AsNoTracking().SingleOrDefaultAsync(e => e.Id == input.RequestId, ct);
        if (existing is not null)
        {
            if (existing.RequestHash != hash || existing.ActorUserId != actor.User.Id) throw Conflict("physical_request_reused", "This physical event identity has already been used.");
            return MapContainer(initial);
        }
        var tube = await dbContext.LabContainers.SingleAsync(c => c.Id == containerId, ct);
        EnsureVersion(tube.Version, input.Version);
        if (!SupplierTubeBarcode.TryNormalize(input.ScannedBarcode, out var scannedBarcode)
            || !await dbContext.LabContainerBarcodes.AnyAsync(b => b.LabContainerId == containerId && b.Value == scannedBarcode, ct))
            throw Invalid("physical_scan_mismatch", "Scan this physical tube before recording the action.");
        var now = LabEvidenceTime.UtcNow;
        var occurred = now;
        if (input.OccurredAt is not null)
        {
            if (!DateTimeOffset.TryParseExact(input.OccurredAt, ["yyyy-MM-dd'T'HH:mmzzz", "yyyy-MM-dd'T'HH:mm:sszzz", "yyyy-MM-dd'T'HH:mm:ss.FFFFFFzzz"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var actual)
                || actual.UtcDateTime > now || actual.UtcDateTime < new DateTime(tube.CreatedAt.Ticks - tube.CreatedAt.Ticks % TimeSpan.TicksPerMinute, DateTimeKind.Utc))
                throw Invalid("physical_time_invalid", "Enter the actual date and time with an explicit UTC offset, after this tube was registered and no later than now.");
            occurred = actual.UtcDateTime;
        }
        var before = new { tube.Status, tube.Quantity, quantityText = tube.Quantity?.ToString(CultureInfo.InvariantCulture), tube.QuantityUnit, tube.Location, tube.StorageBoxId, tube.StoragePosition, tube.RetainUntilUtc, tube.PhysicalHoldReason };
        var trial = await PhysicalTrialAsync(tube.LabWorkOrderId, ct);
        if (input.Kind is "Placed" or "Exhausted" or "Destroyed" or "Returned" or "Transferred"
            && await dbContext.Set<LabPhysicalEvent>().AnyAsync(e => e.LabContainerId == containerId
                && (e.Kind == "Placed" || e.Kind == "Removed" || e.Kind == "Exhausted" || e.Kind == "Destroyed" || e.Kind == "Returned" || e.Kind == "Transferred")
                && e.OccurredAtUtc > occurred, ct))
            throw Conflict("physical_chronology_conflict", "This actual time precedes later recorded physical handling. Review that handling; include seconds and an explicit UTC offset when actions occurred in the same minute. Current custody has not changed.");
        Guid? boxId = null;
        if (input.Kind == "Placed")
        {
            var box = await RequirePhysicalBoxAsync(input.Destination, ct);
            Execute(() => tube.PlaceInBox(box, input.Position)); boxId = box.Id;
            await EnsureBoxPositionAsync(tube, ct);
        }
        else if (input.Kind == "RetentionSet")
        {
            if (trial is not null) throw Conflict("trial_retention_frozen", "Trial retention follows its frozen terms and closure date.");
            Execute(() => tube.SetPhysicalRetention(input.RetainUntilUtc));
        }
        else if (input.Kind == "HoldPlaced") Execute(() => tube.SetPhysicalHold(input.Reason));
        else if (input.Kind == "HoldReleased")
        {
            if (tube.PhysicalHoldReason is null) throw Conflict("physical_hold_missing", "This tube has no active preservation hold.");
            tube.SetPhysicalHold(null);
        }
        else
        {
            if (input.Kind is not ("Exhausted" or "Destroyed" or "Returned" or "Transferred")) throw Invalid("physical_kind_invalid", "Choose a supported physical action.");
            if (trial is not null)
            {
                var terms = trial.Scopes.SingleOrDefault(s => s.Revision == trial.ApprovedScopeRevision)?.Read();
                if (trial.IsOnHold || !trial.IsTerminal || terms is null || trial.ClosedAtUtc is null
                    || occurred < trial.ClosedAtUtc || input.Kind == "Transferred"
                    || input.Kind == "Returned" && (terms.MaterialDisposition != TrialMaterialDisposition.Return || input.Destination?.Trim() != terms.ReturnDestination?.Trim())
                    || input.Kind == "Destroyed" && (terms.MaterialDisposition != TrialMaterialDisposition.Destroy || trial.ResidualRetainUntilUtc is null || occurred < trial.ResidualRetainUntilUtc))
                    throw Conflict("trial_material_terms", "Disposition must follow Trial closure, frozen return/destruction terms, retain-until date and holds.");
            }
            if (input.Kind == "Destroyed" && trial is null && tube.RetainUntilUtc is null)
                throw Conflict("physical_retention_unknown", "Record the retain-until date from the Job’s agreed terms before destruction.");
            if (input.Kind == "Destroyed" && tube.RetainUntilUtc.HasValue && occurred < tube.RetainUntilUtc)
                throw Conflict("physical_retention_active", "The recorded retain-until date has not passed.");
            if (await dbContext.LabSpecimenAttempts.AnyAsync(a => (a.SourceContainerId == containerId || tube.LabSpecimenAttemptId == a.Id)
                    && (a.State == LabSpecimenAttemptState.Planned || a.State == LabSpecimenAttemptState.InProgress || a.State == LabSpecimenAttemptState.OnHold), ct))
                throw Conflict("physical_work_active", "Close the tube's active processing attempt before final physical disposition.");
            if (await (from member in dbContext.LabBatchMembers
                join batch in dbContext.LabOperationalBatches on member.LabOperationalBatchId equals batch.Id
                join library in dbContext.LabLibraries on member.LabLibraryId equals library.Id
                where (member.SequencingContainerId == containerId || library.LibraryContainerId == containerId)
                    && batch.Status != LabBatchStatus.Complete && batch.Status != LabBatchStatus.Cancelled
                select member.Id).AnyAsync(ct))
                throw Conflict("physical_sequencing_active", "Resolve the tube's active sequencing batch before final physical disposition.");
            var latestPossibleOccurrence = input.OccurredAt is null ? occurred : occurred.AddMinutes(1).AddTicks(-1);
            if (await dbContext.LabBiologicalMaterialTransfers.AnyAsync(t => (t.SourceContainerId == containerId || t.DestinationContainerId == containerId) && t.PerformedAtUtc > latestPossibleOccurrence, ct))
                throw Conflict("physical_chronology_conflict", "This disposition predates a recorded physical material transfer. Review the actual time.");
            if (string.IsNullOrWhiteSpace(input.Method) || input.Method.Length > 500) throw Invalid("physical_method_required", "Record the actual disposition method (up to 500 characters).");
            if (input.MeasuredQuantityText is not null || input.MeasuredQuantityUnit is not null)
            {
                if (!decimal.TryParse(input.MeasuredQuantityText, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var measured)
                    || measured < 0 || input.Kind == "Exhausted" && measured != 0
                    || string.IsNullOrWhiteSpace(input.MeasuredQuantityUnit) || input.MeasuredQuantityUnit.Length > 50
                    || tube.QuantityUnit is not null && input.MeasuredQuantityUnit != tube.QuantityUnit)
                    throw Invalid("physical_measurement_invalid", "Enter a measured amount of zero or more in the tube's recorded unit. Exhaustion requires zero; unknown quantity remains unknown.");
            }
            if (input.Kind is "Returned" or "Transferred" && (string.IsNullOrWhiteSpace(input.Destination) || input.Destination.Length > 1000 || string.IsNullOrWhiteSpace(input.TrackingReference) || input.TrackingReference.Length > 500))
                throw Invalid("physical_return_tracking_required", "Record the destination and shipment or handover tracking reference.");
            Execute(() => tube.RecordPhysicalDisposition(input.Kind, input.Reason));
        }
        Execute(() => dbContext.Set<LabPhysicalEvent>().Add(new(input.RequestId, containerId, input.Kind, actor.User.Id, occurred, now, input.Reason,
            JsonSerializer.Serialize(new { before, input.OccurredAt, precision = input.OccurredAt is null ? "server" : input.OccurredAt.Length == 22 ? "minute" : input.OccurredAt.Contains('.') ? "fractional-second" : "second", input.Method, input.Destination, input.TrackingReference, input.RetainUntilUtc, input.Position, input.MeasuredQuantityText, input.MeasuredQuantityUnit,
                after = new { tube.Status, tube.Quantity, tube.QuantityUnit, tube.Location, tube.StorageBoxId, tube.StoragePosition, tube.PhysicalHoldReason } }, JsonOptions), hash, boxId)));
        dbContext.LabWorkEvents.Add(new(tube.LabWorkOrderId, tube.LabSpecimenId, "ContainerPhysical" + input.Kind, now, actor.User.Id,
            JsonSerializer.Serialize(new { containerId, physicalEventId = input.RequestId, occurredAtUtc = occurred }, JsonOptions)));
        await dbContext.SaveChangesAsync(ct); if (transaction is not null) await transaction.CommitAsync(ct); return MapContainer(tube);
    }

    private async Task<TrialProject?> PhysicalTrialAsync(Guid workId, CancellationToken ct)
    {
        var ids = dbContext.TrialSamples.Where(s => s.LabWorkOrderId == workId).Select(s => s.TrialProjectId);
        return await dbContext.TrialProjects.Include(p => p.Scopes).SingleOrDefaultAsync(p => ids.Contains(p.Id), ct);
    }
    private async Task<LabStorageBox> RequirePhysicalBoxAsync(string? barcode, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(barcode)) throw Invalid("storage_box_required", "Scan a registered freezer box.");
        await SampleShippingPackingData.LockAsync(dbContext, $"storage-box:{barcode.Trim()}", ct);
        return await dbContext.Set<LabStorageBox>().SingleOrDefaultAsync(b => b.Barcode == barcode.Trim(), ct)
            ?? throw Conflict("storage_box_unregistered", "Register this box's room, freezer, rack and shelf before placing tubes in it.");
    }
    private async Task EnsureBoxPositionAsync(LabContainer tube, CancellationToken ct)
    {
        if (tube.StoragePosition is not null && (await dbContext.LabContainers.AnyAsync(c => c.Id != tube.Id && c.StorageBoxId == tube.StorageBoxId && c.StoragePosition == tube.StoragePosition, ct)
            || dbContext.ChangeTracker.Entries<LabContainer>().Any(e => e.Entity.Id != tube.Id && e.Entity.StorageBoxId == tube.StorageBoxId && e.Entity.StoragePosition == tube.StoragePosition)))
            throw Conflict("storage_position_occupied", "Another tube already occupies this box position.");
    }
    private async Task<object> ReadPhysicalHistoryAsync(Guid[] containerIds, CancellationToken ct) =>
        await new PhaenoPortal.App.Features.LabOperations.Services.LabPhysicalHistory(dbContext).ReadAsync(containerIds, ct);

    private void MoveToWorkingLocation(LabContainer tube, string location, Guid actor, string reason, Guid commandId)
    {
        var before = new { tube.Location, tube.StorageBoxId, tube.StoragePosition };
        tube.Move(location);
        var now = LabEvidenceTime.UtcNow;
        dbContext.Set<LabPhysicalEvent>().Add(new(Guid.NewGuid(), tube.Id, "Removed", actor, now, now, reason,
            JsonSerializer.Serialize(new { before, destination = location, commandId }, JsonOptions), PhysicalHash(new { tube.Id, commandId, location })));
    }
}
