namespace PSeq.Operations.Commercial.DataProvisioning.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class ManagedFile : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid SourceSampleId { get; private set; }

    public SourceSample SourceSample { get; private set; } = null!;

    public string FileName { get; private set; } = null!;

    public string FileKind { get; private set; } = null!;

    public string ContentType { get; private set; } = null!;

    public long SizeBytes { get; private set; }

    public string Sha256 { get; private set; } = null!;

    public string StorageKey { get; private set; } = null!;

    public ManagedFileScanStatus ScanStatus { get; private set; } = ManagedFileScanStatus.Pending;

    public string? ScanMessage { get; private set; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? CreatedByUserId { get; private set; }

    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; private set; }

    public long Version { get; private set; } = 1;

    private ManagedFile()
    {
    }

    public ManagedFile(
        Guid sourceSampleId,
        string fileName,
        string fileKind,
        string contentType,
        long sizeBytes,
        string sha256,
        string storageKey)
    {
        SourceSampleId = sourceSampleId;
        FileName = fileName;
        FileKind = fileKind;
        ContentType = contentType;
        SizeBytes = sizeBytes;
        Sha256 = sha256;
        StorageKey = storageKey;
    }

    public void RecordScan(ManagedFileScanStatus status, string? message)
    {
        ScanStatus = status;
        ScanMessage = message;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;
}
