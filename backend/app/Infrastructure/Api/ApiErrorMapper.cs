using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Common.Exceptions;

namespace PhaenoPortal.App.Infrastructure.Api;

public static class ApiErrorMapper
{
    public static (int StatusCode, ApiError Error) Map(Exception exception)
    {
        if (exception is DbUpdateConcurrencyException)
        {
            return (
                StatusCodes.Status409Conflict,
                new ApiError(
                    type: "conflict",
                    code: "concurrency_conflict",
                    message: "The record was changed by another request. Reload it and try again."
                )
            );
        }

        if (exception is DomainException domain)
        {
            return (
                StatusCodes.Status400BadRequest,
                new ApiError(
                    type: "invalid_request",
                    code: domain.ErrorCode,
                    message: domain.Message
                )
            );
        }

        return (
            StatusCodes.Status500InternalServerError,
            new ApiError(
                type: "api_error",
                code: "internal_error",
                message: "An unexpected error occurred."
            )
        );
    }
}
