namespace PhaenoPortal.App.Features.LabOperations.Services;

using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed record LabStorageLocationSnapshot(string Room, string Freezer, string Rack, string Shelf);
public sealed record LabPlacementLocation(Guid PhysicalEventId, Guid LabContainerId, Guid StorageBoxId, DateTime OccurredAtUtc,
    Guid? SourceMoveId, DateTime? LocationRecordedAtUtc, LabStorageLocationSnapshot? Location, string Availability);
public sealed record LabPhysicalHistoryResult(IReadOnlyList<LabPhysicalEvent> Events, IReadOnlyList<LabStorageBoxMove> BoxMoves,
    bool Limited, IReadOnlyList<LabPlacementLocation> Locations);
public sealed class LabPhysicalHistory(PSeqOperationsDbContext db)
{
    public async Task<LabPhysicalHistoryResult> ReadAsync(Guid[] containerIds, CancellationToken ct, int limit = 5000)
    {
        var events = await db.Set<LabPhysicalEvent>().AsNoTracking().Where(e => containerIds.Contains(e.LabContainerId))
            .OrderBy(e => e.RecordedAtUtc).ThenBy(e => e.Id).Take(limit + 1).ToListAsync(ct);
        var limited = events.Count > limit;
        if (limited) events.RemoveAt(limit);
        var boxIds = events.Where(e => e.StorageBoxId.HasValue).Select(e => e.StorageBoxId!.Value).Distinct().ToArray();
        var moves = await db.Set<LabStorageBoxMove>().AsNoTracking().Where(e => boxIds.Contains(e.LabStorageBoxId))
            .OrderBy(e => e.RecordedAtUtc).ThenBy(e => e.Id).Take(limit + 1).ToListAsync(ct);
        var movesLimited = moves.Count > limit;
        limited |= movesLimited;
        if (moves.Count > limit) moves.RemoveAt(limit);
        // Occupancy follows actual handling time. Entry time remains audit evidence and a stable
        // tie-breaker, so a late return/placement cannot invent or omit intervening box movements.
        var occupancy = events.Where(e => e.Kind is "Placed" or "Removed" or "Destroyed" or "Returned" or "Transferred")
            .OrderBy(e => e.OccurredAtUtc).ThenBy(e => e.RecordedAtUtc).ThenBy(e => e.Id).ToArray();
        var applicable = moves.Where(move => containerIds.Any(id =>
        {
            var placement = occupancy.LastOrDefault(e => e.LabContainerId == id && e.OccurredAtUtc <= move.RecordedAtUtc);
            return placement?.Kind == "Placed" && placement.StorageBoxId == move.LabStorageBoxId;
        })).ToArray();
        // A registration or earlier move supplies location context, not a claim that the tube
        // occupied the box at that earlier time. Never substitute today's mutable box location.
        var locations = events.Where(e => e.Kind == "Placed" && e.StorageBoxId.HasValue).Select(placement =>
        {
            var baseline = movesLimited ? null : moves.LastOrDefault(m => m.LabStorageBoxId == placement.StorageBoxId
                && m.RecordedAtUtc <= placement.OccurredAtUtc);
            return new LabPlacementLocation(placement.Id, placement.LabContainerId, placement.StorageBoxId!.Value,
                placement.OccurredAtUtc, baseline?.Id, baseline?.RecordedAtUtc, baseline is null ? null : ReadLocation(baseline.DetailsJson),
                movesLimited ? "Unknown: box history exceeds the supported limit."
                    : baseline is null ? "Unknown: no registered location was recorded at this placement time." : "Recorded location as of placement; earlier registration/movement is context only.");
        }).ToArray();
        return new(events, applicable, limited, locations);
    }

    private static LabStorageLocationSnapshot ReadLocation(string details)
    {
        try
        {
            using var json = JsonDocument.Parse(details);
            var destination = json.RootElement.GetProperty("destination");
            var location = JsonSerializer.Deserialize<LabStorageLocationSnapshot>(destination, JsonSerializerOptions.Web);
            if (location is null || new[] { location.Room, location.Freezer, location.Rack, location.Shelf }.Any(string.IsNullOrWhiteSpace))
                throw new JsonException();
            return location;
        }
        catch (Exception error) when (error is JsonException or KeyNotFoundException or InvalidOperationException)
        { throw new OrderManagementException("storage_history_invalid", "The saved box location could not be verified. Review the original storage history before using this evidence.", 409); }
    }
}
