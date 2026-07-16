namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;
using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class ManagedOperationalFile : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public string WorkflowType { get; private set; } = null!;
    public Guid WorkflowId { get; private set; }
    public Guid? ParentRecordId { get; private set; }
    public OperationalFilePurpose Purpose { get; private set; }
    public string FileName { get; private set; } = null!;
    public string FileKind { get; private set; } = null!;
    public string ContentType { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public string Sha256 { get; private set; } = null!;
    public string StorageKey { get; private set; } = null!;
    public OperationalFileScanStatus ScanStatus { get; private set; } = OperationalFileScanStatus.Pending;
    public string? ScanMessage { get; private set; }
    public FileReleaseStatus ReleaseStatus { get; private set; } = FileReleaseStatus.Internal;
    public DateTime? ReleasedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private ManagedOperationalFile() { }

    public ManagedOperationalFile(
        Guid organizationId,
        string workflowType,
        Guid workflowId,
        Guid? parentRecordId,
        OperationalFilePurpose purpose,
        string fileName,
        string fileKind,
        string contentType,
        long sizeBytes,
        string sha256,
        string storageKey)
    {
        OrganizationId = organizationId;
        WorkflowType = OrderText.Required(workflowType, nameof(workflowType), 100);
        WorkflowId = workflowId;
        ParentRecordId = parentRecordId;
        Purpose = purpose;
        FileName = OrderText.Required(Path.GetFileName(fileName), nameof(fileName), 512);
        FileKind = OrderText.Required(fileKind, nameof(fileKind), 100);
        ContentType = OrderText.Required(contentType, nameof(contentType), 255);
        if (sizeBytes < 0) throw new ArgumentOutOfRangeException(nameof(sizeBytes));
        SizeBytes = sizeBytes;
        Sha256 = OrderText.Required(sha256, nameof(sha256), 64);
        StorageKey = OrderText.Required(storageKey, nameof(storageKey), 1000);
    }

    public void RecordScan(OperationalFileScanStatus status, string? message)
    {
        ScanStatus = status;
        ScanMessage = OrderText.Optional(message, 2000);
    }

    public void AttachToParent(Guid parentRecordId)
    {
        if (ParentRecordId.HasValue && ParentRecordId != parentRecordId && ReleaseStatus != FileReleaseStatus.Internal)
            throw new InvalidOperationException("A released managed file cannot be attached to another immutable record.");
        ParentRecordId = parentRecordId;
    }

    public void MarkReady() => ReleaseStatus = FileReleaseStatus.Ready;
    public void HoldForPayment() => ReleaseStatus = FileReleaseStatus.PaymentHold;

    public void Release(DateTime utcNow)
    {
        if (ScanStatus != OperationalFileScanStatus.Clean)
            throw new InvalidOperationException("Only clean files can be released.");
        ReleaseStatus = FileReleaseStatus.Released;
        ReleasedAt = utcNow;
    }

    public void Withdraw() => ReleaseStatus = FileReleaseStatus.Withdrawn;

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class OperationalFileDownload
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ManagedOperationalFileId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime DownloadedAt { get; private set; }
    public string? RemoteAddress { get; private set; }
    public string? UserAgent { get; private set; }

    private OperationalFileDownload() { }

    public OperationalFileDownload(
        Guid managedOperationalFileId,
        Guid organizationId,
        Guid userId,
        DateTime downloadedAt,
        string? remoteAddress,
        string? userAgent)
    {
        ManagedOperationalFileId = managedOperationalFileId;
        OrganizationId = organizationId;
        UserId = userId;
        DownloadedAt = downloadedAt;
        RemoteAddress = OrderText.Optional(remoteAddress, 100);
        UserAgent = OrderText.Optional(userAgent, 1000);
    }
}
