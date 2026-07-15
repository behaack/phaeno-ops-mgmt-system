namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

using PhaenoPortal.App.Common.Persistence;
using PhaenoPortal.App.Features.Accounts.Domain;

public sealed class DataGovernanceIncident : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SourceSampleId { get; private set; }
    public SourceSample SourceSample { get; private set; } = null!;
    public DataGovernanceConcernCategory Category { get; private set; }
    public DataGovernanceIncidentStatus Status { get; private set; } = DataGovernanceIncidentStatus.Open;
    public string Reason { get; private set; } = null!;
    public string ExternalGuidance { get; private set; } = null!;
    public string InternalNotes { get; private set; } = null!;
    public DateTime AttestationDueAt { get; private set; }
    public DateTime? ResolvedAt { get; private set; }
    public Guid? ResolvedByUserId { get; private set; }
    public string? Resolution { get; private set; }
    public ICollection<DataGovernanceAffectedVersion> AffectedVersions { get; } = [];
    public ICollection<DataGovernanceAffectedOrganization> AffectedOrganizations { get; } = [];
    public ICollection<DataGovernanceFollowUp> FollowUps { get; } = [];
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private DataGovernanceIncident()
    {
    }

    public DataGovernanceIncident(
        SourceSample sourceSample,
        DataGovernanceConcernCategory category,
        string reason,
        string externalGuidance,
        string internalNotes,
        DateTime attestationDueAt)
    {
        SourceSampleId = sourceSample.Id;
        SourceSample = sourceSample;
        Category = category;
        Reason = reason.Trim();
        ExternalGuidance = externalGuidance.Trim();
        InternalNotes = internalNotes.Trim();
        AttestationDueAt = attestationDueAt;
    }

    public void Clear(string resolution, Guid actorUserId, DateTime resolvedAt)
    {
        EnsureOpen();
        Status = DataGovernanceIncidentStatus.Cleared;
        Resolution = resolution.Trim();
        ResolvedByUserId = actorUserId;
        ResolvedAt = resolvedAt;
    }

    public void ConfirmUnsafe(string resolution, Guid actorUserId, DateTime resolvedAt)
    {
        EnsureOpen();
        Status = DataGovernanceIncidentStatus.ConfirmedUnsafe;
        Resolution = resolution.Trim();
        ResolvedByUserId = actorUserId;
        ResolvedAt = resolvedAt;
    }

    private void EnsureOpen()
    {
        if (Status != DataGovernanceIncidentStatus.Open)
        {
            throw new InvalidOperationException("Only an open governance incident can be resolved.");
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

public sealed class DataGovernanceAffectedVersion
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid IncidentId { get; private set; }
    public DataGovernanceIncident Incident { get; private set; } = null!;
    public Guid CuratedDatasetVersionId { get; private set; }
    public CuratedDatasetVersion CuratedDatasetVersion { get; private set; } = null!;
    public CuratedDatasetVersionStatus PriorStatus { get; private set; }

    private DataGovernanceAffectedVersion()
    {
    }

    public DataGovernanceAffectedVersion(
        Guid incidentId,
        CuratedDatasetVersion version,
        CuratedDatasetVersionStatus priorStatus)
    {
        IncidentId = incidentId;
        CuratedDatasetVersionId = version.Id;
        CuratedDatasetVersion = version;
        PriorStatus = priorStatus;
    }
}

public sealed class DataGovernanceAffectedOrganization : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid IncidentId { get; private set; }
    public DataGovernanceIncident Incident { get; private set; } = null!;
    public Guid OrganizationId { get; private set; }
    public Organization Organization { get; private set; } = null!;
    public AffectedOrganizationStatus Status { get; private set; } = AffectedOrganizationStatus.Blocked;
    public int AffectedGrantCount { get; private set; }
    public int ReminderCount { get; private set; }
    public DateTime? LastRemindedAt { get; private set; }
    public DateTime? AttestedAt { get; private set; }
    public Guid? AttestedByUserId { get; private set; }
    public AttestationSource? AttestationSource { get; private set; }
    public string? OrganizationContact { get; private set; }
    public string? EvidenceSource { get; private set; }
    public string? AttestationNotes { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private DataGovernanceAffectedOrganization()
    {
    }

    public DataGovernanceAffectedOrganization(
        Guid incidentId,
        Organization organization,
        int affectedGrantCount)
    {
        IncidentId = incidentId;
        OrganizationId = organization.Id;
        Organization = organization;
        AffectedGrantCount = affectedGrantCount;
    }

    public void MarkResumed() => Status = AffectedOrganizationStatus.Resumed;

    public void MarkInactive() => Status = AffectedOrganizationStatus.Inactive;

    public void RequireAttestation() => Status = AffectedOrganizationStatus.AwaitingAttestation;

    public void RecordReminder(DateTime remindedAt)
    {
        if (Status != AffectedOrganizationStatus.AwaitingAttestation)
        {
            throw new InvalidOperationException("Only an outstanding attestation can be reminded.");
        }

        ReminderCount++;
        LastRemindedAt = remindedAt;
    }

    public void Attest(
        Guid actorUserId,
        AttestationSource source,
        string organizationContact,
        string evidenceSource,
        string notes,
        DateTime attestedAt)
    {
        if (Status != AffectedOrganizationStatus.AwaitingAttestation)
        {
            throw new InvalidOperationException("This organization does not have an outstanding attestation.");
        }

        Status = AffectedOrganizationStatus.Attested;
        AttestedByUserId = actorUserId;
        AttestationSource = source;
        OrganizationContact = organizationContact.Trim();
        EvidenceSource = evidenceSource.Trim();
        AttestationNotes = notes.Trim();
        AttestedAt = attestedAt;
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

public sealed class DataGovernanceFollowUp
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid IncidentId { get; private set; }
    public DataGovernanceIncident Incident { get; private set; } = null!;
    public Guid? OrganizationId { get; private set; }
    public string Kind { get; private set; } = null!;
    public string Notes { get; private set; } = null!;
    public Guid ActorUserId { get; private set; }
    public DateTime OccurredAt { get; private set; }

    private DataGovernanceFollowUp()
    {
    }

    public DataGovernanceFollowUp(
        Guid incidentId,
        Guid? organizationId,
        string kind,
        string notes,
        Guid actorUserId,
        DateTime occurredAt)
    {
        IncidentId = incidentId;
        OrganizationId = organizationId;
        Kind = kind.Trim();
        Notes = notes.Trim();
        ActorUserId = actorUserId;
        OccurredAt = occurredAt;
    }
}
