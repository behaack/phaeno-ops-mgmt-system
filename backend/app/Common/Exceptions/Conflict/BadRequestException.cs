namespace PhaenoPortal.App.Common.Exceptions.Conflict;

public sealed class BadRequestException : ConflictException
{
    private const string DefaultMessage =
        "Bad request.";

    public BadRequestException()
        : base(DefaultMessage) { }

    public BadRequestException(string message)
        : base(message) { }

    public override string ErrorCode =>
        "bad-request";
}
