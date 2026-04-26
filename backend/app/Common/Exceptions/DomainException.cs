namespace PhaenoPortal.App.Common.Exceptions;

public abstract class DomainException : Exception
{
    protected DomainException(string message) : base(message) { }

    protected DomainException(string message, Exception inner)
        : base(message, inner) { }

    public virtual int StatusCode => StatusCodes.Status400BadRequest;
    public virtual string ErrorType => "domain_error";
    public virtual string ErrorCode => "domain_error";
    public virtual object? Details => null;
}
