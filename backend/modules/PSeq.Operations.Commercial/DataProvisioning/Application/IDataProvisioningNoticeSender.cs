namespace PSeq.Operations.Commercial.DataProvisioning.Application;

public sealed record DataProvisioningNoticeMessage(
    string Email,
    string Subject,
    string Body);

public interface IDataProvisioningNoticeSender
{
    Task SendAsync(
        DataProvisioningNoticeMessage message,
        CancellationToken cancellationToken);
}
