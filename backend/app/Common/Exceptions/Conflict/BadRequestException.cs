namespace PhaenoPortal.App.Common.Exceptions.Conflict;

using PhaenoPortal.App.Common.Exceptions;

public sealed class BadRequestException : DomainException
{
    private const string DefaultMessage =
        "Bad request.";

    public BadRequestException()
        : base(DefaultMessage) { }

    public BadRequestException(string message)
        : base(message) { }

    public override string ErrorCode =>
        "bad-request";

    public override string ErrorType => "invalid_request";
}
