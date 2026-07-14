namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

using PhaenoPortal.App.Common.Persistence;

public sealed class CuratedDataset : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public string Name { get; private set; } = null!;

    public string Description { get; private set; } = null!;

    public bool IsActive { get; private set; } = true;

    public Guid? EligibleVersionId { get; private set; }

    public DateTime? EligibilityApprovedAt { get; private set; }

    public Guid? EligibilityApprovedByUserId { get; private set; }

    public ICollection<CuratedDatasetVersion> Versions { get; } = [];

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? CreatedByUserId { get; private set; }

    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; private set; }

    public long Version { get; private set; } = 1;

    private CuratedDataset()
    {
    }

    public CuratedDataset(string name, string description)
    {
        Name = name.Trim();
        Description = description.Trim();
    }

    public void Update(string name, string description)
    {
        Name = name.Trim();
        Description = description.Trim();
    }

    public void SetEligibleVersion(
        CuratedDatasetVersion datasetVersion,
        Guid actorUserId,
        DateTime approvedAt)
    {
        if (datasetVersion.CuratedDatasetId != Id)
        {
            throw new InvalidOperationException("The version does not belong to this dataset.");
        }

        if (datasetVersion.Status != CuratedDatasetVersionStatus.Published)
        {
            throw new InvalidOperationException("Only a published version can be externally eligible.");
        }

        EligibleVersionId = datasetVersion.Id;
        EligibilityApprovedByUserId = actorUserId;
        EligibilityApprovedAt = approvedAt;
    }

    public void RemoveEligibility()
    {
        EligibleVersionId = null;
        EligibilityApprovedByUserId = null;
        EligibilityApprovedAt = null;
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
