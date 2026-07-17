using PhaenoPortal.App.Features.Website.Entities;

namespace PhaenoPortal.App.Features.Website.Notifications;

public interface IWebsiteNotificationSender
{
    Task SendContactAsync(
        WebContact contact,
        CancellationToken cancellationToken = default);

    Task SendTechnicalBriefAsync(
        WebContact contact,
        CancellationToken cancellationToken = default);

    Task SendOrderAsync(
        WebOrder order,
        CancellationToken cancellationToken = default);
}
