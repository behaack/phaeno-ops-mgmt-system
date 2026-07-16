namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class SourceSample : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public string Label { get; private set; } = null!;

    public string? Description { get; private set; }

    public string? BiologicalContext { get; private set; }

    public string? AssayContext { get; private set; }

    public string? AnalysisSummary { get; private set; }

    public string? QcStatus { get; private set; }

    public string? Provenance { get; private set; }

    public bool IsSynthetic { get; private set; }

    public int Revision { get; private set; } = 1;

    public SourceSampleStatus Status { get; private set; } = SourceSampleStatus.Draft;

    public string? OwnershipBasis { get; private set; }

    public string? OwnershipEvidenceReference { get; private set; }

    public Guid? OwnershipConfirmedByUserId { get; private set; }

    public DateTime? OwnershipConfirmedAt { get; private set; }

    public string? DeidentificationMethod { get; private set; }

    public string? DeidentificationNotes { get; private set; }

    public Guid? DeidentificationConfirmedByUserId { get; private set; }

    public DateTime? DeidentificationConfirmedAt { get; private set; }

    public DateTime? ReadyAt { get; private set; }

    public Guid? ReadyByUserId { get; private set; }

    public DateTime? ArchivedAt { get; private set; }

    public Guid? ArchivedByUserId { get; private set; }

    public ICollection<ManagedFile> Files { get; } = [];

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? CreatedByUserId { get; private set; }

    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; private set; }

    public long Version { get; private set; } = 1;

    private SourceSample()
    {
    }

    public SourceSample(string label, bool isSynthetic)
    {
        Label = label.Trim();
        IsSynthetic = isSynthetic;
    }

    public void UpdateMetadata(
        string label,
        string description,
        string biologicalContext,
        string assayContext,
        string analysisSummary,
        string qcStatus,
        string provenance)
    {
        EnsureDraft();
        Label = label.Trim();
        Description = description.Trim();
        BiologicalContext = biologicalContext.Trim();
        AssayContext = assayContext.Trim();
        AnalysisSummary = analysisSummary.Trim();
        QcStatus = qcStatus.Trim();
        Provenance = provenance.Trim();
    }

    public void ConfirmOwnership(
        string basis,
        string? evidenceReference,
        Guid actorUserId,
        DateTime confirmedAt)
    {
        EnsureDraft();
        OwnershipBasis = basis.Trim();
        OwnershipEvidenceReference = NullIfWhiteSpace(evidenceReference);
        OwnershipConfirmedByUserId = actorUserId;
        OwnershipConfirmedAt = confirmedAt;
    }

    public void ConfirmDeidentification(
        string method,
        string? notes,
        Guid actorUserId,
        DateTime confirmedAt)
    {
        EnsureDraft();
        DeidentificationMethod = method.Trim();
        DeidentificationNotes = NullIfWhiteSpace(notes);
        DeidentificationConfirmedByUserId = actorUserId;
        DeidentificationConfirmedAt = confirmedAt;
    }

    public void MarkReady(Guid actorUserId, DateTime readyAt)
    {
        EnsureDraft();
        Status = SourceSampleStatus.Ready;
        ReadyByUserId = actorUserId;
        ReadyAt = readyAt;
    }

    public void Archive(Guid actorUserId, DateTime archivedAt)
    {
        if (Status != SourceSampleStatus.Ready)
        {
            throw new InvalidOperationException("Only a ready source sample can be archived.");
        }

        Status = SourceSampleStatus.Archived;
        ArchivedByUserId = actorUserId;
        ArchivedAt = archivedAt;
    }

    public void EnsureDraft()
    {
        if (Status != SourceSampleStatus.Draft)
        {
            throw new InvalidOperationException("A ready or archived source revision is immutable.");
        }
    }

    private static string? NullIfWhiteSpace(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
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
