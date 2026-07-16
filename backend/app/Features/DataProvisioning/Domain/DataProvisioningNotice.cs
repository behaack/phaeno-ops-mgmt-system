namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;

public sealed class DataProvisioningNotice
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Organization Organization { get; private set; } = null!;
    public Guid? IncidentId { get; private set; }
    public DataGovernanceIncident? Incident { get; private set; }
    public Guid? OrganizationDatasetGrantId { get; private set; }
    public DataProvisioningNoticeKind Kind { get; private set; }
    public DataProvisioningNoticeStatus Status { get; private set; } = DataProvisioningNoticeStatus.Pending;
    public string Subject { get; private set; } = null!;
    public string Body { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }
    public DateTime? DeliveredAt { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTime? NextAttemptAt { get; private set; }
    public string? LastError { get; private set; }

    private DataProvisioningNotice()
    {
    }

    public DataProvisioningNotice(
        Organization organization,
        DataProvisioningNoticeKind kind,
        string subject,
        string body,
        DateTime createdAt,
        Guid? incidentId = null,
        Guid? organizationDatasetGrantId = null)
    {
        OrganizationId = organization.Id;
        Organization = organization;
        Kind = kind;
        Subject = subject.Trim();
        Body = body.Trim();
        CreatedAt = createdAt;
        IncidentId = incidentId;
        OrganizationDatasetGrantId = organizationDatasetGrantId;
    }

    public void Delivered(DateTime deliveredAt)
    {
        Status = DataProvisioningNoticeStatus.Delivered;
        DeliveredAt = deliveredAt;
        AttemptCount++;
        NextAttemptAt = null;
        LastError = null;
    }

    public void Failed(string error, DateTime nextAttemptAt)
    {
        Status = DataProvisioningNoticeStatus.Failed;
        AttemptCount++;
        NextAttemptAt = nextAttemptAt;
        LastError = error.Length <= 2000 ? error : error[..2000];
    }
}
