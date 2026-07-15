namespace PhaenoPortal.App.Features.RelationshipManagement.Services;

using PhaenoPortal.App.Common.Exceptions;

public sealed class RelationshipManagementException(
    string errorCode,
    string message,
    int statusCode = StatusCodes.Status400BadRequest,
    object? details = null) : DomainException(message)
{
    public override int StatusCode => statusCode;

    public override string ErrorType => statusCode switch
    {
        StatusCodes.Status401Unauthorized => "authentication_error",
        StatusCodes.Status403Forbidden => "authorization_error",
        StatusCodes.Status404NotFound => "not_found",
        StatusCodes.Status409Conflict => "conflict",
        _ => "invalid_request"
    };

    public override string ErrorCode => errorCode;

    public override object? Details => details;
}
