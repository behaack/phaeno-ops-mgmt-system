namespace PhaenoPortal.App.Features.DataProvisioning.Domain;

public sealed class DatasetDownloadAudit
{
    public Guid Id { get; private set; } = Guid.NewGuid();

    public Guid OrganizationId { get; private set; }

    public Guid OrganizationDatasetGrantId { get; private set; }

    public Guid CuratedDatasetVersionId { get; private set; }

    public Guid UserId { get; private set; }

    public DatasetDownloadKind Kind { get; private set; }

    public Guid? ManagedFileId { get; private set; }

    public DateTime DownloadedAt { get; private set; }

    public string? RequestId { get; private set; }

    public string? RemoteAddress { get; private set; }

    private DatasetDownloadAudit()
    {
    }

    public DatasetDownloadAudit(
        Guid organizationId,
        Guid organizationDatasetGrantId,
        Guid curatedDatasetVersionId,
        Guid userId,
        DatasetDownloadKind kind,
        Guid? managedFileId,
        DateTime downloadedAt,
        string? requestId,
        string? remoteAddress)
    {
        OrganizationId = organizationId;
        OrganizationDatasetGrantId = organizationDatasetGrantId;
        CuratedDatasetVersionId = curatedDatasetVersionId;
        UserId = userId;
        Kind = kind;
        ManagedFileId = managedFileId;
        DownloadedAt = downloadedAt;
        RequestId = requestId;
        RemoteAddress = remoteAddress;
    }
}
