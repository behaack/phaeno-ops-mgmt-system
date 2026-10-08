namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using PSeq.Operations.Commercial.DataProvisioning.Application;

public sealed class LoggingDataProvisioningNoticeSender(
    ILogger<LoggingDataProvisioningNoticeSender> logger)
    : IDataProvisioningNoticeSender
{
    public Task SendAsync(
        DataProvisioningNoticeMessage message,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        logger.LogWarning("Data-provisioning email delivery is not configured; the notice remains available for recovery.");
        return Task.FromException(new InvalidOperationException("Data-provisioning email delivery is not configured."));
    }
}
