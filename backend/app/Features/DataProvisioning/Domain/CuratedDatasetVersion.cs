namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CuratedDatasetVersion : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid CuratedDatasetId { get; private set; }

    public CuratedDataset CuratedDataset { get; private set; } = null!;

    public int VersionNumber { get; private set; }

    public CuratedDatasetVersionStatus Status { get; private set; } = CuratedDatasetVersionStatus.Draft;

    public Guid SourceSampleId { get; private set; }

    public int SourceRevision { get; private set; }

    public DateTime SourceSnapshotAt { get; private set; }

    public bool IsSynthetic { get; private set; }

    public string SampleLabel { get; private set; } = null!;

    public string Description { get; private set; } = null!;

    public string BiologicalContext { get; private set; } = null!;

    public string AssayContext { get; private set; } = null!;

    public string AnalysisSummary { get; private set; } = null!;

    public string QcStatus { get; private set; } = null!;

    public string Provenance { get; private set; } = null!;

    public string OwnershipBasis { get; private set; } = null!;

    public string? OwnershipEvidenceReference { get; private set; }

    public Guid OwnershipConfirmedByUserId { get; private set; }

    public DateTime OwnershipConfirmedAt { get; private set; }

    public string DeidentificationMethod { get; private set; } = null!;

    public string? DeidentificationNotes { get; private set; }

    public Guid DeidentificationConfirmedByUserId { get; private set; }

    public DateTime DeidentificationConfirmedAt { get; private set; }

    public string ReleaseNotes { get; private set; } = null!;

    public string ManifestJson { get; private set; } = "{}";

    public string ContentChecksum { get; private set; } = null!;

    public DateTime? PublishedAt { get; private set; }

    public Guid? PublishedByUserId { get; private set; }

    public ICollection<CuratedDatasetVersionFile> Files { get; } = [];

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? CreatedByUserId { get; private set; }

    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; private set; }

    public long Version { get; private set; } = 1;

    private CuratedDatasetVersion()
    {
    }

    public CuratedDatasetVersion(
        Guid curatedDatasetId,
        int versionNumber,
        SourceSample source,
        string releaseNotes,
        DateTime snapshotAt)
    {
        if (source.Status != SourceSampleStatus.Ready)
        {
            throw new InvalidOperationException("Only a ready source revision can be curated.");
        }

        CuratedDatasetId = curatedDatasetId;
        VersionNumber = versionNumber;
        SourceSampleId = source.Id;
        SourceRevision = source.Revision;
        SourceSnapshotAt = snapshotAt;
        IsSynthetic = source.IsSynthetic;
        SampleLabel = source.Label;
        Description = source.Description!;
        BiologicalContext = source.BiologicalContext!;
        AssayContext = source.AssayContext!;
        AnalysisSummary = source.AnalysisSummary!;
        QcStatus = source.QcStatus!;
        Provenance = source.Provenance!;
        OwnershipBasis = source.OwnershipBasis!;
        OwnershipEvidenceReference = source.OwnershipEvidenceReference;
        OwnershipConfirmedByUserId = source.OwnershipConfirmedByUserId!.Value;
        OwnershipConfirmedAt = source.OwnershipConfirmedAt!.Value;
        DeidentificationMethod = source.DeidentificationMethod!;
        DeidentificationNotes = source.DeidentificationNotes;
        DeidentificationConfirmedByUserId = source.DeidentificationConfirmedByUserId!.Value;
        DeidentificationConfirmedAt = source.DeidentificationConfirmedAt!.Value;
        ReleaseNotes = releaseNotes.Trim();
    }

    public void SetManifest(string manifestJson, string contentChecksum)
    {
        EnsureDraft();
        ManifestJson = manifestJson;
        ContentChecksum = contentChecksum;
    }

    public void Publish(Guid actorUserId, DateTime publishedAt)
    {
        EnsureDraft();
        Status = CuratedDatasetVersionStatus.Published;
        PublishedByUserId = actorUserId;
        PublishedAt = publishedAt;
    }

    public void Retire()
    {
        if (Status != CuratedDatasetVersionStatus.Published)
        {
            throw new InvalidOperationException("Only a published dataset version can be retired.");
        }

        Status = CuratedDatasetVersionStatus.Retired;
    }

    public CuratedDatasetVersionStatus Quarantine()
    {
        if (Status is not (CuratedDatasetVersionStatus.Published or CuratedDatasetVersionStatus.Retired))
        {
            throw new InvalidOperationException("Only a published or retired dataset version can be quarantined.");
        }

        var priorStatus = Status;
        Status = CuratedDatasetVersionStatus.Quarantined;
        return priorStatus;
    }

    public void ClearQuarantine(CuratedDatasetVersionStatus priorStatus)
    {
        if (Status != CuratedDatasetVersionStatus.Quarantined
            || priorStatus is not (CuratedDatasetVersionStatus.Published or CuratedDatasetVersionStatus.Retired))
        {
            throw new InvalidOperationException("The quarantined version cannot be restored to the requested status.");
        }

        Status = priorStatus;
    }

    public void Withdraw()
    {
        if (Status != CuratedDatasetVersionStatus.Quarantined)
        {
            throw new InvalidOperationException("Only a quarantined dataset version can be permanently withdrawn.");
        }

        Status = CuratedDatasetVersionStatus.Withdrawn;
    }

    private void EnsureDraft()
    {
        if (Status != CuratedDatasetVersionStatus.Draft)
        {
            throw new InvalidOperationException("A published dataset version is immutable.");
        }
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
