namespace PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class OperationalFileDownload
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ManagedOperationalFileId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime DownloadedAt { get; private set; }
    public string? RemoteAddress { get; private set; }
    public string? UserAgent { get; private set; }

    private OperationalFileDownload() { }

    public OperationalFileDownload(
        Guid managedOperationalFileId,
        Guid organizationId,
        Guid userId,
        DateTime downloadedAt,
        string? remoteAddress,
        string? userAgent)
    {
        ManagedOperationalFileId = managedOperationalFileId;
        OrganizationId = organizationId;
        UserId = userId;
        DownloadedAt = downloadedAt;
        RemoteAddress = OrderText.Optional(remoteAddress, 100);
        UserAgent = OrderText.Optional(userAgent, 1000);
    }
}
