namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class OrganizationDatasetGrant : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid OrganizationId { get; private set; }

    public Organization Organization { get; private set; } = null!;

    public Guid CuratedDatasetId { get; private set; }

    public CuratedDataset CuratedDataset { get; private set; } = null!;

    public Guid CuratedDatasetVersionId { get; private set; }

    public CuratedDatasetVersion CuratedDatasetVersion { get; private set; } = null!;

    public OrganizationDatasetGrantStatus Status { get; private set; } = OrganizationDatasetGrantStatus.Active;

    public DateTime GrantedAt { get; private set; }

    public Guid GrantedByUserId { get; private set; }

    public DateTime? RevokedAt { get; private set; }

    public Guid? RevokedByUserId { get; private set; }

    public string? RevocationReason { get; private set; }

    public DateTime? SupersededAt { get; private set; }

    public Guid? SupersededByUserId { get; private set; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? CreatedByUserId { get; private set; }

    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; private set; }

    public long Version { get; private set; } = 1;

    private OrganizationDatasetGrant()
    {
    }

    public OrganizationDatasetGrant(
        Organization organization,
        CuratedDataset curatedDataset,
        CuratedDatasetVersion curatedDatasetVersion,
        Guid actorUserId,
        DateTime grantedAt)
    {
        OrganizationId = organization.Id;
        Organization = organization;
        CuratedDatasetId = curatedDataset.Id;
        CuratedDataset = curatedDataset;
        CuratedDatasetVersionId = curatedDatasetVersion.Id;
        CuratedDatasetVersion = curatedDatasetVersion;
        GrantedByUserId = actorUserId;
        GrantedAt = grantedAt;
    }

    public void Revoke(string reason, Guid actorUserId, DateTime revokedAt)
    {
        if (Status != OrganizationDatasetGrantStatus.Active)
        {
            throw new InvalidOperationException("Only an active grant can be revoked.");
        }

        Status = OrganizationDatasetGrantStatus.Revoked;
        RevocationReason = reason.Trim();
        RevokedByUserId = actorUserId;
        RevokedAt = revokedAt;
    }

    public void Supersede(Guid actorUserId, DateTime supersededAt)
    {
        if (Status != OrganizationDatasetGrantStatus.Active)
        {
            throw new InvalidOperationException("Only an active grant can be superseded.");
        }

        Status = OrganizationDatasetGrantStatus.Superseded;
        SupersededByUserId = actorUserId;
        SupersededAt = supersededAt;
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
