namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.FileManagement.Domain;

public enum ResultOutputPackageState
{
    Uploading,
    Scanning,
    ReadyForReview,
    ScientificallyApproved,
    ReadyForRelease,
    Released,
    Failed,
    Withdrawn
}

public sealed class ResultOutputPackage : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid? LabServiceOrderId { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid? LabSampleId { get; private set; }
    public Guid? TrialProjectId { get; private set; }
    public Guid? TrialSampleId { get; private set; }
    public int PackageVersion { get; private set; }
    public Guid? CorrectsPackageId { get; private set; }
    public string PipelineProviderKey { get; private set; } = null!;
    public string PipelineSubmissionId { get; private set; } = null!;
    public string IdempotencyKey { get; private set; } = null!;
    public string ManifestJson { get; private set; } = null!;
    public string ManifestSha256 { get; private set; } = null!;
    public int ExpectedArtifactCount { get; private set; }
    public ResultOutputPackageState State { get; private set; } = ResultOutputPackageState.Uploading;
    public Guid? ScientificApprovalId { get; private set; }
    public Guid? ScientificallyApprovedByUserId { get; private set; }
    public DateTime? ScientificallyApprovedAtUtc { get; private set; }
    public Guid? ReleasedByUserId { get; private set; }
    public DateTime? ReleasedAtUtc { get; private set; }
    public string? FailureCode { get; private set; }
    public string? FailureDetail { get; private set; }
    public Guid? WithdrawnByUserId { get; private set; }
    public DateTime? WithdrawnAtUtc { get; private set; }
    public string? WithdrawalReason { get; private set; }

    private ResultOutputPackage() { }

    public ResultOutputPackage(Guid organizationId, Guid? labServiceOrderId,
        Guid labWorkOrderId, Guid? labSampleId, int packageVersion,
        Guid? correctsPackageId, string pipelineProviderKey,
        string pipelineSubmissionId, string idempotencyKey, string manifestJson,
        string manifestSha256, int expectedArtifactCount, Guid? trialProjectId = null, Guid? trialSampleId = null)
    {
        if (organizationId == Guid.Empty || labServiceOrderId == Guid.Empty || trialProjectId == Guid.Empty || trialSampleId == Guid.Empty
            || labWorkOrderId == Guid.Empty || labSampleId == Guid.Empty
            || !((labServiceOrderId.HasValue && labSampleId.HasValue && !trialProjectId.HasValue && !trialSampleId.HasValue)
                || (!labServiceOrderId.HasValue && !labSampleId.HasValue && trialProjectId.HasValue && trialSampleId.HasValue)))
            throw new ArgumentException("Organization, order, work-order, and sample identifiers are required.");
        if (packageVersion < 1 || expectedArtifactCount < 1)
            throw new ArgumentOutOfRangeException(nameof(packageVersion));
        OrganizationId = organizationId;
        LabServiceOrderId = labServiceOrderId;
        LabWorkOrderId = labWorkOrderId;
        LabSampleId = labSampleId;
        TrialProjectId = trialProjectId; TrialSampleId = trialSampleId;
        PackageVersion = packageVersion;
        CorrectsPackageId = correctsPackageId;
        PipelineProviderKey = Required(pipelineProviderKey, nameof(pipelineProviderKey), 100);
        PipelineSubmissionId = Required(pipelineSubmissionId, nameof(pipelineSubmissionId), 255);
        IdempotencyKey = Required(idempotencyKey, nameof(idempotencyKey), 255);
        ManifestJson = OrderText.Json(manifestJson);
        ManifestSha256 = Required(manifestSha256, nameof(manifestSha256), 64).ToUpperInvariant();
        ExpectedArtifactCount = expectedArtifactCount;
    }

    public void BeginScanning()
    {
        if (State != ResultOutputPackageState.Uploading)
            throw new InvalidOperationException("Only a fully transferred package can begin scanning.");
        State = ResultOutputPackageState.Scanning;
    }

    public void MarkReadyForReview(int actualArtifactCount, bool allChecksumsMatch, bool allMalwareClean)
    {
        if (State != ResultOutputPackageState.Scanning)
            throw new InvalidOperationException("Only a scanning package can become ready for review.");
        if (actualArtifactCount != ExpectedArtifactCount)
            throw new InvalidOperationException("The output package manifest is incomplete.");
        if (!allChecksumsMatch)
            throw new InvalidOperationException("Every artifact checksum must match the registered manifest.");
        if (!allMalwareClean)
            throw new InvalidOperationException("Every artifact must have a clean malware-scan result.");
        State = ResultOutputPackageState.ReadyForReview;
        FailureCode = null;
        FailureDetail = null;
    }

    public void RecordScientificApproval(Guid approvalId, Guid actorUserId, DateTime utcNow)
    {
        if (State != ResultOutputPackageState.ReadyForReview)
            throw new InvalidOperationException("Only a complete, checksummed, malware-clean package can be scientifically approved.");
        if (approvalId == Guid.Empty || actorUserId == Guid.Empty)
            throw new ArgumentException("Approval and actor identifiers are required.");
        State = ResultOutputPackageState.ScientificallyApproved;
        ScientificApprovalId = approvalId;
        ScientificallyApprovedByUserId = actorUserId;
        ScientificallyApprovedAtUtc = utcNow;
    }

    public void MarkReadyForRelease(Guid approvalId)
    {
        if (State != ResultOutputPackageState.ScientificallyApproved
            || ScientificApprovalId != approvalId)
            throw new InvalidOperationException("The pinned scientific approval does not match this package.");
        State = ResultOutputPackageState.ReadyForRelease;
    }

    public void Release(Guid actorUserId, DateTime utcNow)
    {
        if (State != ResultOutputPackageState.ReadyForRelease)
            throw new InvalidOperationException("Only an approved release candidate can be released.");
        State = ResultOutputPackageState.Released;
        ReleasedByUserId = actorUserId != Guid.Empty ? actorUserId : throw new ArgumentException("A release actor is required.");
        ReleasedAtUtc = utcNow;
    }

    public void Fail(string code, string detail)
    {
        if (State is ResultOutputPackageState.Released or ResultOutputPackageState.Withdrawn)
            throw new InvalidOperationException("A released or withdrawn package cannot fail in place.");
        State = ResultOutputPackageState.Failed;
        FailureCode = Required(code, nameof(code), 100);
        FailureDetail = Required(detail, nameof(detail), 2000);
    }

    public void Withdraw(Guid actorUserId, DateTime utcNow, string reason)
    {
        if (State == ResultOutputPackageState.Withdrawn)
            throw new InvalidOperationException("The package is already withdrawn.");
        State = ResultOutputPackageState.Withdrawn;
        WithdrawnByUserId = actorUserId != Guid.Empty ? actorUserId : throw new ArgumentException("An actor is required.");
        WithdrawnAtUtc = utcNow;
        WithdrawalReason = Required(reason, nameof(reason), 2000);
    }
}

public enum ResultArtifactScanState
{
    Pending,
    Scanning,
    Clean,
    Rejected,
    Failed
}

public sealed class ResultArtifact : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ResultOutputPackageId { get; private set; }
    public string LogicalRole { get; private set; } = null!;
    public string FileName { get; private set; } = null!;
    public string ContentType { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public string Sha256 { get; private set; } = null!;
    public string ObjectStorageKey { get; private set; } = null!;
    public ResultArtifactScanState ScanState { get; private set; } = ResultArtifactScanState.Pending;
    public DateTime? ScanCompletedAtUtc { get; private set; }
    public string? ScanDetail { get; private set; }
    public DateTime? DeletedAtUtc { get; private set; }

    private ResultArtifact() { }

    public ResultArtifact(Guid packageId, string logicalRole, string fileName,
        string contentType, long sizeBytes, string sha256, string objectStorageKey)
    {
        if (packageId == Guid.Empty) throw new ArgumentException("A package is required.");
        if (sizeBytes <= 0) throw new ArgumentOutOfRangeException(nameof(sizeBytes));
        ResultOutputPackageId = packageId;
        LogicalRole = Required(logicalRole, nameof(logicalRole), 100);
        FileName = Required(fileName, nameof(fileName), 255);
        ContentType = Required(contentType, nameof(contentType), 255);
        SizeBytes = sizeBytes;
        Sha256 = Required(sha256, nameof(sha256), 64).ToUpperInvariant();
        ObjectStorageKey = Required(objectStorageKey, nameof(objectStorageKey), 1000);
    }

    public void BeginScan()
    {
        if (ScanState != ResultArtifactScanState.Pending)
            throw new InvalidOperationException("Only a pending artifact can begin scanning.");
        ScanState = ResultArtifactScanState.Scanning;
    }

    public void CompleteScan(bool clean, string? detail, DateTime utcNow)
    {
        if (ScanState != ResultArtifactScanState.Scanning)
            throw new InvalidOperationException("Only a scanning artifact can complete scanning.");
        ScanState = clean ? ResultArtifactScanState.Clean : ResultArtifactScanState.Rejected;
        ScanDetail = Optional(detail, 2000);
        ScanCompletedAtUtc = utcNow;
    }

    public void MarkDeleted(DateTime utcNow)
    {
        if (DeletedAtUtc.HasValue) return;
        DeletedAtUtc = utcNow;
    }
}

public enum ResultDeliveryEvidenceKind
{
    Notification,
    Download,
    RetentionWarning,
    Cutoff,
    GraceStarted,
    Deleted,
    Reissued,
    Withdrawn
}

public sealed class ResultDeliveryEvidence
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ResultOutputPackageId { get; private set; }
    public Guid? ResultArtifactId { get; private set; }
    public ResultDeliveryEvidenceKind Kind { get; private set; }
    public Guid? ActorUserId { get; private set; }
    public DateTime OccurredAtUtc { get; private set; }
    public string DetailsJson { get; private set; } = "{}";

    private ResultDeliveryEvidence() { }

    public ResultDeliveryEvidence(Guid packageId, Guid? artifactId,
        ResultDeliveryEvidenceKind kind, Guid? actorUserId, DateTime occurredAtUtc,
        string detailsJson)
    {
        ResultOutputPackageId = packageId != Guid.Empty ? packageId : throw new ArgumentException("A package is required.");
        ResultArtifactId = artifactId;
        Kind = kind;
        ActorUserId = actorUserId;
        OccurredAtUtc = occurredAtUtc;
        DetailsJson = OrderText.Json(detailsJson);
    }
}

public enum ResultRetentionState
{
    Active,
    WarningDue,
    Cutoff,
    Grace,
    Deleted,
    Reissued
}

public sealed class ResultRetentionSchedule : CommercialReceivableEntity
{
    public Guid? RetentionSnapshotId { get; private set; }
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ResultOutputPackageId { get; private set; }
    public DateTime WarningAtUtc { get; private set; }
    public DateTime CutoffAtUtc { get; private set; }
    public DateTime GraceEndsAtUtc { get; private set; }
    public DateTime DeleteAtUtc { get; private set; }
    public ResultRetentionState State { get; private set; } = ResultRetentionState.Active;
    public DateTime? LastProcessedAtUtc { get; private set; }

    private ResultRetentionSchedule() { }

    public ResultRetentionSchedule(Guid packageId, DateTime warningAtUtc,
        DateTime cutoffAtUtc, DateTime graceEndsAtUtc, DateTime deleteAtUtc)
    {
        if (packageId == Guid.Empty) throw new ArgumentException("A package is required.");
        if (!(warningAtUtc < cutoffAtUtc && cutoffAtUtc < graceEndsAtUtc && graceEndsAtUtc <= deleteAtUtc))
            throw new ArgumentException("Retention dates must be ordered warning, cutoff, grace, deletion.");
        ResultOutputPackageId = packageId;
        WarningAtUtc = warningAtUtc;
        CutoffAtUtc = cutoffAtUtc;
        GraceEndsAtUtc = graceEndsAtUtc;
        DeleteAtUtc = deleteAtUtc;
    }

    public ResultRetentionSchedule(Guid packageId, ReleasedDeliverableRetentionSnapshot snapshot)
        : this(packageId, snapshot.WarningAtUtc, snapshot.StandardDeletionAtUtc,
            snapshot.PotentialFinalDeletionAtUtc, snapshot.PotentialFinalDeletionAtUtc)
    {
        if (!snapshot.LabResultReleaseId.HasValue)
            throw new ArgumentException("A laboratory release snapshot is required.", nameof(snapshot));
        RetentionSnapshotId = snapshot.Id;
    }

    public bool AllowsLegacyDownload(DateTime utcNow) => !RetentionSnapshotId.HasValue
        && utcNow < CutoffAtUtc && State is ResultRetentionState.Active or ResultRetentionState.WarningDue;

    public ResultDeliveryEvidenceKind? Advance(DateTime utcNow)
    {
        if (RetentionSnapshotId.HasValue)
            throw new InvalidOperationException("Snapshot-backed retention must use the shared completion-aware policy.");
        LastProcessedAtUtc = utcNow;
        if (State != ResultRetentionState.Deleted && utcNow >= DeleteAtUtc)
        {
            State = ResultRetentionState.Deleted;
            return ResultDeliveryEvidenceKind.Deleted;
        }
        if (State is ResultRetentionState.Active or ResultRetentionState.WarningDue or ResultRetentionState.Cutoff
            && utcNow >= GraceEndsAtUtc)
        {
            State = ResultRetentionState.Grace;
            return ResultDeliveryEvidenceKind.GraceStarted;
        }
        if (State is ResultRetentionState.Active or ResultRetentionState.WarningDue
            && utcNow >= CutoffAtUtc)
        {
            State = ResultRetentionState.Cutoff;
            return ResultDeliveryEvidenceKind.Cutoff;
        }
        if (State == ResultRetentionState.Active && utcNow >= WarningAtUtc)
        {
            State = ResultRetentionState.WarningDue;
            return ResultDeliveryEvidenceKind.RetentionWarning;
        }
        return null;
    }

    public void Reissue()
    {
        if (State != ResultRetentionState.Deleted)
            throw new InvalidOperationException("Only a deleted package can be reissued.");
        State = ResultRetentionState.Reissued;
    }
}
