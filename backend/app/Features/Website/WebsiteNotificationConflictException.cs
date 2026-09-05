using PhaenoPortal.App.Common.Exceptions;

namespace PhaenoPortal.App.Features.Website;

public sealed class WebsiteNotificationConflictException(string message) : DomainException(message)
{
    public override int StatusCode => StatusCodes.Status409Conflict;
    public override string ErrorType => "conflict";
    public override string ErrorCode => "website_notification_conflict";
}
