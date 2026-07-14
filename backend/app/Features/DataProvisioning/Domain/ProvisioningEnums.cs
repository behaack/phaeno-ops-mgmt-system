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

public enum DatasetDownloadKind
{
    File = 1,
    Archive = 2
}
