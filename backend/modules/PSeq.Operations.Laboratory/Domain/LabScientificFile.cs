namespace PSeq.Operations.Laboratory.Domain;

/// <summary>Immutable receipt for verified, scanned bytes owned by POMS.</summary>
public sealed class LabScientificFile
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public string FileName { get; private set; } = null!;
    public string StorageKey { get; private set; } = null!;
    public string Sha256 { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }
    private LabScientificFile() { }
    public LabScientificFile(Guid workId, Guid specimenId, string fileName, string storageKey,
        string sha256, long sizeBytes, Guid actorId, DateTime now)
    {
        if (workId == Guid.Empty || specimenId == Guid.Empty || actorId == Guid.Empty || sizeBytes <= 0)
            throw new ArgumentException("A scientific file requires a sample, recorder and nonempty content.");
        LabWorkOrderId = workId; LabSpecimenId = specimenId;
        FileName = LabLineageText.Required(fileName, 255);
        StorageKey = LabLineageText.Required(storageKey, 1000);
        Sha256 = LabLineageText.Hash(sha256)!;
        SizeBytes = sizeBytes; RecordedByUserId = actorId; RecordedAtUtc = now;
    }
}
