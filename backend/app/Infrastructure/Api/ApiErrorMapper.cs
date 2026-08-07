using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Common.Exceptions;
using PhaenoPortal.App.Infrastructure.Storage;

namespace PhaenoPortal.App.Infrastructure.Api;

public static class ApiErrorMapper
{
    public static (int StatusCode, ApiError Error) Map(Exception exception)
    {
        if (exception is FileStorageUnavailableException)
        {
            return (
                StatusCodes.Status503ServiceUnavailable,
                new ApiError(
                    type: "service_unavailable",
                    code: "file_storage_unavailable",
                    message: "File storage is temporarily unavailable."
                )
            );
        }

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
                domain.StatusCode,
                new ApiError(
                    type: domain.ErrorType,
                    code: domain.ErrorCode,
                    message: domain.Message,
                    details: domain.Details
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
