namespace PhaenoPortal.App.Infrastructure.Api;

public sealed record ApiError(
    string type,
    string code,
    string message,
    object? details = null,
    string? param = null
);
