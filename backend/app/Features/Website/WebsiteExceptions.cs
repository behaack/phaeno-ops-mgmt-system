using PhaenoPortal.App.Common.Exceptions;

namespace PhaenoPortal.App.Features.Website;

public sealed class WebsiteContactAlreadyExistsException()
    : DomainException("This email is already on file.")
{
    public override string ErrorCode => "email_already_in_use";
}

public sealed class WebsiteRecaptchaRejectedException()
    : DomainException("The reCAPTCHA verification failed.")
{
    public override int StatusCode => StatusCodes.Status403Forbidden;

    public override string ErrorType => "forbidden";

    public override string ErrorCode => "recaptcha_rejected";
}

public sealed class WebsiteOperationsAccessException(
    string message,
    int statusCode,
    string errorCode)
    : DomainException(message)
{
    public override int StatusCode => statusCode;

    public override string ErrorType =>
        statusCode == StatusCodes.Status401Unauthorized
            ? "unauthorized"
            : "forbidden";

    public override string ErrorCode => errorCode;
}
