namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

public enum SourceSampleStatus
{
    Draft = 1,
    Ready = 2,
    Archived = 3
}

public enum ManagedFileScanStatus
{
    Pending = 1,
    Clean = 2,
    Rejected = 3,
    Unavailable = 4
}

public enum CuratedDatasetVersionStatus
{
    Draft = 1,
    Published = 2,
    Quarantined = 3,
    Withdrawn = 4,
    Retired = 5
}

public enum OrganizationDatasetGrantStatus
{
    Active = 1,
    Revoked = 2,
    Superseded = 3
}

public enum ProvisioningRunStatus
{
    Pending = 1,
    Succeeded = 2,
    Failed = 3
}

public enum ProvisioningRunKind
{
    Grant = 1,
    Upgrade = 2,
    BulkRevocation = 3,
    OrganizationCreationGrant = 4
}

public enum DataGovernanceConcernCategory
{
    Deidentification = 1,
    Ownership = 2,
    SharingRights = 3,
    Other = 4
}

public enum DataGovernanceIncidentStatus
{
    Open = 1,
    Cleared = 2,
    ConfirmedUnsafe = 3
}

public enum AffectedOrganizationStatus
{
    Blocked = 1,
    Resumed = 2,
    AwaitingAttestation = 3,
    Attested = 4,
    Inactive = 5
}

public enum AttestationSource
{
    SubmittedInPortal = 1,
    RecordedByPhaeno = 2
}

public enum DataProvisioningNoticeKind
{
    Grant = 1,
    Upgrade = 2,
    Revocation = 3,
    Quarantine = 4,
    QuarantineCleared = 5,
    Withdrawal = 6,
    AttestationReminder = 7
}

public enum DataProvisioningNoticeStatus
{
    Pending = 1,
    Delivered = 2,
    Failed = 3
}

public enum DatasetDownloadKind
{
    File = 1,
    Archive = 2
}
