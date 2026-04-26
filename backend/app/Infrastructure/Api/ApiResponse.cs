namespace PhaenoPortal.App.Infrastructure.Api;

public sealed record ApiResponse<T>(
    bool Success,
    T? Data,
    ApiError? Error,
    ApiMeta Meta)
{
    public static ApiResponse<T> Ok(T data, ApiMeta meta) =>
        new(
            Success: true,
            Data: data,
            Error: null,
            Meta: meta
        );

    public static ApiResponse<T> Fail(ApiError error, ApiMeta meta) =>
        new(
            Success: false,
            Data: default,
            Error: error,
            Meta: meta
        );
}
