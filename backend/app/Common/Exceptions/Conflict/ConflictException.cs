namespace PhaenoPortal.App.Common.Exceptions.Conflict;

using PhaenoPortal.App.Common.Exceptions;

public abstract class ConflictException : DomainException
{
    protected ConflictException(string message)
        : base(message) { }

    public override int StatusCode => StatusCodes.Status409Conflict;
    public override string ErrorType => "conflict";
}
