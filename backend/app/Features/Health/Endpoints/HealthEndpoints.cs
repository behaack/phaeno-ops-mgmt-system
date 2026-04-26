using PhaenoPortal.App.Features.Health.DTOs;
using PhaenoPortal.App.Infrastructure.Api;

namespace PhaenoPortal.App.Features.Health.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", (HttpContext context) =>
                Results.Ok(ApiResponse<HealthStatusDto>.Ok(
                    HealthMetadata.Current,
                    ApiMetaFactory.Create(context))))
            .WithName("GetHealth");

        return app;
    }
}

public static class HealthMetadata
{
    public static readonly HealthStatusDto Current = new("Phaeno Portal API", "healthy");
}
