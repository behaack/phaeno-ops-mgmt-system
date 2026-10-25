namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabStorageBox : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Barcode { get; private set; } = null!;
    public string Room { get; private set; } = null!;
    public string Freezer { get; private set; } = null!;
    public string Rack { get; private set; } = null!;
    public string Shelf { get; private set; } = null!;
    private LabStorageBox() { }
    public LabStorageBox(string barcode, string room, string freezer, string rack, string shelf)
    {
        Barcode = Required(barcode, nameof(barcode), 255);
        if (Barcode.Any(char.IsControl)) throw new ArgumentException("Scan a valid box barcode.");
        Move(room, freezer, rack, shelf);
    }
    public void Move(string room, string freezer, string rack, string shelf)
    {
        Room = Required(room, nameof(room), 100); Freezer = Required(freezer, nameof(freezer), 100);
        Rack = Required(rack, nameof(rack), 100); Shelf = Required(shelf, nameof(shelf), 100);
    }
}

// Append-only receipts. The request hash distinguishes a replay from reuse of an identity.
public sealed class LabPhysicalEvent
{
    public Guid Id { get; private set; }
    public Guid LabContainerId { get; private set; }
    public string Kind { get; private set; } = null!;
    public Guid ActorUserId { get; private set; }
    public DateTime OccurredAtUtc { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    public string Reason { get; private set; } = null!;
    public string DetailsJson { get; private set; } = null!;
    public string RequestHash { get; private set; } = null!;
    public Guid? StorageBoxId { get; private set; }
    private LabPhysicalEvent() { }
    public LabPhysicalEvent(Guid id, Guid containerId, string kind, Guid actor, DateTime occurred, DateTime recorded,
        string reason, string details, string hash, Guid? boxId = null)
    {
        if (id == Guid.Empty || containerId == Guid.Empty || actor == Guid.Empty || occurred.Kind != DateTimeKind.Utc
            || recorded.Kind != DateTimeKind.Utc || occurred > recorded) throw new ArgumentException("Identify the physical event and its actual date.");
        LabProtocolDefinition.RequiredText(reason, 2000, "Reason");
        Id = id; LabContainerId = containerId; Kind = kind; ActorUserId = actor; OccurredAtUtc = occurred;
        RecordedAtUtc = recorded; Reason = reason.Trim(); DetailsJson = details; RequestHash = hash; StorageBoxId = boxId;
    }
}

public sealed class LabStorageBoxMove
{
    public Guid Id { get; private set; }
    public Guid LabStorageBoxId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    public string Reason { get; private set; } = null!;
    public string DetailsJson { get; private set; } = null!;
    public string RequestHash { get; private set; } = null!;
    private LabStorageBoxMove() { }
    public LabStorageBoxMove(Guid id, Guid boxId, Guid actor, DateTime recorded, string reason, string details, string hash)
    {
        if (id == Guid.Empty || actor == Guid.Empty) throw new ArgumentException("Identify the storage move and operator.");
        LabProtocolDefinition.RequiredText(reason, 2000, "Movement reason");
        Id = id; LabStorageBoxId = boxId; ActorUserId = actor; RecordedAtUtc = recorded;
        Reason = reason.Trim(); DetailsJson = details; RequestHash = hash;
    }
}

public sealed class LabMasterMixPerformanceDecision
{
    public Guid Id { get; private set; }
    public Guid ReviewedByUserId { get; private set; }
    public DateTime ReviewedAtUtc { get; private set; }
    public bool Approved { get; private set; }
    public string Reason { get; private set; } = null!;
    private LabMasterMixPerformanceDecision() { }
    public LabMasterMixPerformanceDecision(Guid stepRecordId, Guid reviewer, bool approved, string reason, DateTime now)
    {
        if (reviewer == Guid.Empty) throw new ArgumentException("Identify the reviewing supervisor.");
        LabProtocolDefinition.RequiredText(reason, 2000, "Review reason");
        Id = stepRecordId; ReviewedByUserId = reviewer; Approved = approved; Reason = reason.Trim(); ReviewedAtUtc = now;
    }
}
