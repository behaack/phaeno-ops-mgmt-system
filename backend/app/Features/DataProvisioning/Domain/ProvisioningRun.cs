namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public sealed class ProvisioningRun : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid OrganizationId { get; private set; }

    public Organization Organization { get; private set; } = null!;

    public Guid CuratedDatasetVersionId { get; private set; }

    public CuratedDatasetVersion CuratedDatasetVersion { get; private set; } = null!;

    public string IdempotencyKey { get; private set; } = null!;

    public ProvisioningRunStatus Status { get; private set; } = ProvisioningRunStatus.Pending;

    public ProvisioningRunKind Kind { get; private set; } = ProvisioningRunKind.Grant;

    public Guid RequestedByUserId { get; private set; }

    public DateTime RequestedAt { get; private set; }

    public DateTime? CompletedAt { get; private set; }

    public Guid? OrganizationDatasetGrantId { get; private set; }

    public OrganizationDatasetGrant? OrganizationDatasetGrant { get; private set; }

    public Guid? PreviousOrganizationDatasetGrantId { get; private set; }

    public string? FailureCode { get; private set; }

    public string? FailureMessage { get; private set; }

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? CreatedByUserId { get; private set; }

    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; private set; }

    public long Version { get; private set; } = 1;

    private ProvisioningRun()
    {
    }

    public ProvisioningRun(
        Organization organization,
        CuratedDatasetVersion curatedDatasetVersion,
        string idempotencyKey,
        Guid requestedByUserId,
        DateTime requestedAt,
        ProvisioningRunKind kind = ProvisioningRunKind.Grant,
        Guid? previousOrganizationDatasetGrantId = null)
    {
        OrganizationId = organization.Id;
        Organization = organization;
        CuratedDatasetVersionId = curatedDatasetVersion.Id;
        CuratedDatasetVersion = curatedDatasetVersion;
        IdempotencyKey = idempotencyKey.Trim();
        RequestedByUserId = requestedByUserId;
        RequestedAt = requestedAt;
        Kind = kind;
        PreviousOrganizationDatasetGrantId = previousOrganizationDatasetGrantId;
    }

    public void Succeed(Guid organizationDatasetGrantId, DateTime completedAt)
    {
        Status = ProvisioningRunStatus.Succeeded;
        OrganizationDatasetGrantId = organizationDatasetGrantId;
        CompletedAt = completedAt;
        FailureCode = null;
        FailureMessage = null;
    }

    public void Fail(string failureCode, string failureMessage, DateTime completedAt)
    {
        Status = ProvisioningRunStatus.Failed;
        FailureCode = failureCode;
        FailureMessage = failureMessage;
        CompletedAt = completedAt;
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
