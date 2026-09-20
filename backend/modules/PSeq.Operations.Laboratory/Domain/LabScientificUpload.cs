namespace PSeq.Operations.Laboratory.Domain;

/// <summary>Private, untrusted upload staging. Only a completed scientific receipt is evidence.</summary>
public sealed class LabScientificUpload
{
    private LabScientificUpload() { }
    public LabScientificUpload(Guid id, Guid work, Guid specimen, Guid actor, string name, long size, string hash, DateTime now)
    {
        Id = id; LabWorkOrderId = work; LabSpecimenId = specimen; UserId = actor;
        FileName = name; SizeBytes = size; Sha256 = hash; ExpiresAtUtc = now.AddDays(1);
    }
    public Guid Id { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid UserId { get; private set; }
    public string FileName { get; private set; } = "";
    public long SizeBytes { get; private set; }
    public string Sha256 { get; private set; } = "";
    public string ChunksJson { get; private set; } = "[]";
    public Guid? CompletedFileId { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public int Version { get; private set; }
    public void RecordChunks(string json) { ChunksJson = json; Version++; }
    public void Complete(Guid file) { CompletedFileId = file; Version++; }
}
