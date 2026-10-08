namespace PSeq.Operations.Laboratory.Domain;

using System.Text.Json;

/// <summary>An immutable snapshot of one saved vendor result.</summary>
public sealed class LabVendorResultsVersion
{
    public Guid Id { get; private set; }
    public Guid LabNgsSendoutId { get; private set; }
    public int ResultVersion { get; private set; }
    public string SnapshotJson { get; private set; } = null!;
    public string? Note { get; private set; }
    public Guid RecordedByUserId { get; private set; }
    public string RecordedByName { get; private set; } = null!;
    public DateTime RecordedAtUtc { get; private set; }

    private LabVendorResultsVersion() { }

    public LabVendorResultsVersion(Guid id, Guid sendoutId, int version, string snapshotJson,
        string? note, Guid actorId, string actorName, DateTime recordedAtUtc)
    {
        if (id == Guid.Empty || sendoutId == Guid.Empty || actorId == Guid.Empty || version < 1)
            throw new ArgumentException("A result version requires its identity, sendout, actor and positive version number.");
        if (recordedAtUtc.Kind != DateTimeKind.Utc || recordedAtUtc > DateTime.UtcNow)
            throw new ArgumentException("Record the result version in UTC, no later than now.");
        if (string.IsNullOrWhiteSpace(actorName) || actorName.Trim().Length > 255 || note?.Trim().Length > 4000
            || version > 1 && string.IsNullOrWhiteSpace(note))
            throw new ArgumentException("Later result versions require a note explaining the change.");
        using var snapshot = JsonDocument.Parse(snapshotJson);
        if (snapshot.RootElement.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("A complete result snapshot is required.");
        Id = id; LabNgsSendoutId = sendoutId; ResultVersion = version; SnapshotJson = snapshotJson;
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(); RecordedByUserId = actorId;
        RecordedByName = actorName.Trim(); RecordedAtUtc = recordedAtUtc;
    }
}
