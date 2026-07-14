namespace PhaenoPortal.App.Features.DataProvisioning.Services;

using PhaenoPortal.App.Common.Exceptions;

public sealed class DataProvisioningException : DomainException
{
    public DataProvisioningException(
        string errorCode,
        string message,
        int statusCode = StatusCodes.Status400BadRequest,
        object? details = null) : base(message)
    {
        ErrorCode = errorCode;
        StatusCode = statusCode;
        Details = details;
    }

    public override string ErrorCode { get; }

    public override int StatusCode { get; }

    public override string ErrorType => StatusCode switch
    {
        StatusCodes.Status403Forbidden => "forbidden",
        StatusCodes.Status404NotFound => "not_found",
        StatusCodes.Status409Conflict => "conflict",
        _ => "invalid_request"
    };

    public override object? Details { get; }
}
