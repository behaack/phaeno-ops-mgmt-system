namespace PSeq.Operations.Commercial.OrderToCash.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum ResultOutputPackageStatus
{
    Uploading = 1,
    Scanning = 2,
    ReadyForReview = 3,
    ScientificallyApproved = 4,
    ReadyForRelease = 5,
    Released = 6,
    Failed = 7,
    Withdrawn = 8
}

public enum ResultArtifactScanStatus
{
    Pending = 1,
    Clean = 2,
    Infected = 3,
    Failed = 4
}

public enum ResultDeliveryEvidenceKind
{
    NotificationQueued = 1,
    NotificationDelivered = 2,
    NotificationFailed = 3,
    DownloadStarted = 4,
    DownloadCompleted = 5,
    RetentionWarning = 6,
    RetentionCutoff = 7,
    RetentionGraceStarted = 8,
    Deleted = 9,
    Reissued = 10,
    Withdrawn = 11
}

public sealed class ResultOutputPackage : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid LabServiceOrderId { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid? LabSampleId { get; private set; }
    public int PackageVersion { get; private set; }
    public Guid? CorrectsPackageId { get; private set; }
    public string PipelineName { get; private set; } = null!;
    public string PipelineVersion { get; private set; } = null!;
    public string ManifestIdentity { get; private set; } = null!;
    public string ManifestSha256 { get; private set; } = null!;
    public string ManifestJson { get; private set; } = null!;
    public string StorageProvider { get; private set; } = null!;
    public string StorageObjectPrefix { get; private set; } = null!;
    public ResultOutputPackageStatus Status { get; private set; } = ResultOutputPackageStatus.Uploading;
    public string? FailureReason { get; private set; }
    public Guid? ScientificApprovalId { get; private set; }
    public Guid? ScientificallyApprovedByUserId { get; private set; }
    public DateTime? ScientificallyApprovedAtUtc { get; private set; }
    public Guid? ReleasedByUserId { get; private set; }
    public DateTime? ReleasedAtUtc { get; private set; }
    public Guid? WithdrawnByUserId { get; private set; }
    public DateTime? WithdrawnAtUtc { get; private set; }
    public string? WithdrawalReason { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;
    public ICollection<ResultArtifact> Artifacts { get; } = [];

    private ResultOutputPackage() { }

    public ResultOutputPackage(Guid organizationId, Guid labServiceOrderId,
        Guid labWorkOrderId, Guid? labSampleId, int packageVersion,
        Guid? correctsPackageId, string pipelineName, string pipelineVersion,
        string manifestIdentity, string manifestSha256, string manifestJson,
        string storageProvider, string storageObjectPrefix)
    {
        if (organizationId == Guid.Empty || labServiceOrderId == Guid.Empty || labWorkOrderId == Guid.Empty)
            throw new ArgumentException("Organization, commercial order, and Lab work-order identifiers are required.");
        if (packageVersion < 1) throw new ArgumentOutOfRangeException(nameof(packageVersion));
        OrganizationId = organizationId;
        LabServiceOrderId = labServiceOrderId;
        LabWorkOrderId = labWorkOrderId;
        LabSampleId = labSampleId;
        PackageVersion = packageVersion;
        CorrectsPackageId = correctsPackageId;
        PipelineName = ResultText.Required(pipelineName, nameof(pipelineName), 255);
        PipelineVersion = ResultText.Required(pipelineVersion, nameof(pipelineVersion), 255);
        ManifestIdentity = ResultText.Required(manifestIdentity, nameof(manifestIdentity), 255);
        ManifestSha256 = ResultText.Sha256(manifestSha256, nameof(manifestSha256));
        ManifestJson = ResultText.Json(manifestJson);
        StorageProvider = ResultText.Required(storageProvider, nameof(storageProvider), 100);
        StorageObjectPrefix = ResultText.Required(storageObjectPrefix, nameof(storageObjectPrefix), 2000);
    }

    public void BeginScanning()
    {
        EnsureStatus(ResultOutputPackageStatus.Uploading);
        if (Artifacts.Count == 0) throw new InvalidOperationException("A result package must contain at least one artifact.");
        Status = ResultOutputPackageStatus.Scanning;
    }

    public void MarkReadyForReview()
    {
        EnsureStatus(ResultOutputPackageStatus.Scanning);
        if (Artifacts.Count == 0 || Artifacts.Any(artifact => artifact.ScanStatus != ResultArtifactScanStatus.Clean))
            throw new InvalidOperationException("Every checksummed artifact must be malware-clean before scientific review.");
        Status = ResultOutputPackageStatus.ReadyForReview;
        FailureReason = null;
    }

    public void ScientificallyApprove(Guid approvalId, Guid actorUserId, DateTime utcNow)
    {
        EnsureStatus(ResultOutputPackageStatus.ReadyForReview);
        if (approvalId == Guid.Empty || actorUserId == Guid.Empty)
            throw new ArgumentException("Approval and actor identifiers are required.");
        ScientificApprovalId = approvalId;
        ScientificallyApprovedByUserId = actorUserId;
        ScientificallyApprovedAtUtc = RequireUtc(utcNow, nameof(utcNow));
        Status = ResultOutputPackageStatus.ScientificallyApproved;
    }

    public void MarkReadyForRelease(Guid approvalId)
    {
        EnsureStatus(ResultOutputPackageStatus.ScientificallyApproved);
        if (ScientificApprovalId != approvalId)
            throw new InvalidOperationException("The release candidate must pin the approved package and approval version.");
        Status = ResultOutputPackageStatus.ReadyForRelease;
    }

    public bool Release(Guid actorUserId, DateTime utcNow)
    {
        if (Status == ResultOutputPackageStatus.Released) return false;
        EnsureStatus(ResultOutputPackageStatus.ReadyForRelease);
        if (actorUserId == Guid.Empty) throw new ArgumentException("A release manager is required.", nameof(actorUserId));
        ReleasedByUserId = actorUserId;
        ReleasedAtUtc = RequireUtc(utcNow, nameof(utcNow));
        Status = ResultOutputPackageStatus.Released;
        return true;
    }

    public void Fail(string reason)
    {
        if (Status is ResultOutputPackageStatus.Released or ResultOutputPackageStatus.Withdrawn)
            throw new InvalidOperationException("A released or withdrawn package cannot fail in place.");
        FailureReason = ResultText.Required(reason, nameof(reason), 2000);
        Status = ResultOutputPackageStatus.Failed;
    }

    public void Withdraw(Guid actorUserId, DateTime utcNow, string reason)
    {
        if (Status == ResultOutputPackageStatus.Withdrawn) return;
        if (actorUserId == Guid.Empty) throw new ArgumentException("An actor is required.", nameof(actorUserId));
        WithdrawnByUserId = actorUserId;
        WithdrawnAtUtc = RequireUtc(utcNow, nameof(utcNow));
        WithdrawalReason = ResultText.Required(reason, nameof(reason), 2000);
        Status = ResultOutputPackageStatus.Withdrawn;
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;

    private void EnsureStatus(ResultOutputPackageStatus expected)
    {
        if (Status != expected) throw new InvalidOperationException($"Result package must be {expected}.");
    }

    private static DateTime RequireUtc(DateTime value, string name) => value.Kind == DateTimeKind.Utc
        ? value
        : throw new ArgumentException("A UTC timestamp is required.", name);
}

public sealed class ResultArtifact
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ResultOutputPackageId { get; private set; }
    public string ArtifactIdentity { get; private set; } = null!;
    public string FileName { get; private set; } = null!;
    public string MediaType { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public string Sha256 { get; private set; } = null!;
    public string StorageObjectKey { get; private set; } = null!;
    public ResultArtifactScanStatus ScanStatus { get; private set; } = ResultArtifactScanStatus.Pending;
    public string? ScanDetails { get; private set; }
    public DateTime RegisteredAtUtc { get; private set; }
    public DateTime? ScannedAtUtc { get; private set; }

    private ResultArtifact() { }

    public ResultArtifact(Guid packageId, string artifactIdentity, string fileName,
        string mediaType, long sizeBytes, string sha256, string storageObjectKey,
        DateTime registeredAtUtc)
    {
        if (packageId == Guid.Empty) throw new ArgumentException("A package is required.", nameof(packageId));
        if (sizeBytes < 1) throw new ArgumentOutOfRangeException(nameof(sizeBytes));
        ResultOutputPackageId = packageId;
        ArtifactIdentity = ResultText.Required(artifactIdentity, nameof(artifactIdentity), 255);
        FileName = ResultText.Required(fileName, nameof(fileName), 500);
        MediaType = ResultText.Required(mediaType, nameof(mediaType), 255);
        SizeBytes = sizeBytes;
        Sha256 = ResultText.Sha256(sha256, nameof(sha256));
        StorageObjectKey = ResultText.Required(storageObjectKey, nameof(storageObjectKey), 2000);
        RegisteredAtUtc = registeredAtUtc;
    }

    public void RecordScan(ResultArtifactScanStatus status, string? details, DateTime utcNow)
    {
        if (status == ResultArtifactScanStatus.Pending)
            throw new ArgumentException("A completed scan state is required.", nameof(status));
        ScanStatus = status;
        ScanDetails = ResultText.Optional(details, 2000);
        ScannedAtUtc = utcNow;
    }
}

public sealed class ResultDeliveryEvidence
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ResultOutputPackageId { get; private set; }
    public ResultDeliveryEvidenceKind Kind { get; private set; }
    public Guid? ActorUserId { get; private set; }
    public string EvidenceJson { get; private set; } = "{}";
    public DateTime OccurredAtUtc { get; private set; }

    private ResultDeliveryEvidence() { }

    public ResultDeliveryEvidence(Guid packageId, ResultDeliveryEvidenceKind kind,
        Guid? actorUserId, string evidenceJson, DateTime occurredAtUtc)
    {
        ResultOutputPackageId = packageId != Guid.Empty
            ? packageId
            : throw new ArgumentException("A result package is required.", nameof(packageId));
        Kind = kind;
        ActorUserId = actorUserId;
        EvidenceJson = ResultText.Json(evidenceJson);
        OccurredAtUtc = occurredAtUtc;
    }
}

internal static class ResultText
{
    public static string Required(string? value, string name, int maxLength)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("A value is required.", name)
            : value.Trim();
        return normalized.Length <= maxLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maxLength} characters.", name);
    }

    public static string? Optional(string? value, int maxLength) =>
        string.IsNullOrWhiteSpace(value) ? null : Required(value, nameof(value), maxLength);

    public static string Sha256(string value, string name)
    {
        var normalized = Required(value, name, 64).ToLowerInvariant();
        return normalized.Length == 64 && normalized.All(Uri.IsHexDigit)
            ? normalized
            : throw new ArgumentException("A hexadecimal SHA-256 is required.", name);
    }

    public static string Json(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "{}" : value.Trim();
        try { System.Text.Json.JsonDocument.Parse(normalized); }
        catch (System.Text.Json.JsonException exception)
        { throw new ArgumentException("Valid JSON is required.", nameof(value), exception); }
        return normalized;
    }
}
