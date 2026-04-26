namespace PhaenoPortal.App.Infrastructure.Api;

public sealed record ApiMeta(
    string requestId,
    DateTimeOffset timestampUtc
);
