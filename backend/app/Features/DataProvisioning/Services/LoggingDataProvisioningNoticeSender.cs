namespace PhaenoPortal.App.Features.DataProvisioning.Services;

public sealed class LoggingDataProvisioningNoticeSender(
    ILogger<LoggingDataProvisioningNoticeSender> logger)
    : IDataProvisioningNoticeSender
{
    public Task SendAsync(
        DataProvisioningNoticeMessage message,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Data-provisioning administrator notice for {Email}: {Subject}",
            message.Email,
            message.Subject);
        return Task.CompletedTask;
    }
}
