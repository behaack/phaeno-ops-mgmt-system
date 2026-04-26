namespace PhaenoPortal.App.Infrastructure.Api;

public static class ApiMetaFactory
{
    public static ApiMeta Create(HttpContext context)
    {
        return new ApiMeta(
            requestId: context.TraceIdentifier,
            timestampUtc: DateTimeOffset.UtcNow
        );
    }
}
