using PhaenoPortal.App.Features.Website.Entities;

namespace PhaenoPortal.App.Features.Website.Notifications;

public sealed class LoggingWebsiteNotificationSender(
    ILogger<LoggingWebsiteNotificationSender> logger) : IWebsiteNotificationSender
{
    public Task SendContactAsync(
        WebContact contact,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Website contact {ContactId} accepted for {OrganizationName}.",
            contact.Id,
            contact.OrganizationName);
        return Task.CompletedTask;
    }

    public Task SendTechnicalBriefAsync(
        WebContact contact,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Website technical brief requested for contact {ContactId}.",
            contact.Id);
        return Task.CompletedTask;
    }

    public Task SendOrderAsync(
        WebOrder order,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Website order inquiry {OrderId} accepted for {OrganizationName}.",
            order.Id,
            order.OrganizationName);
        return Task.CompletedTask;
    }
}
