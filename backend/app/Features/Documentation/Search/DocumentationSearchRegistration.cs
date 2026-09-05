namespace PhaenoPortal.App.Features.Documentation.Search;

public static class DocumentationSearchRegistration
{
    public static IServiceCollection AddDocumentationSearch(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<DocumentationSearchOptions>(configuration.GetSection("DocumentationSearch"));
        services.AddScoped<IDocumentationAccess, DocumentationAccess>();
        services.AddSingleton<IDocumentationSearchService, DocumentationSearchService>();
        services.AddHostedService<DocumentationIndexStartup>();
        return services;
    }
}

internal sealed class DocumentationIndexStartup(IDocumentationSearchService search) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try { await search.RebuildAsync(stoppingToken, force: false); return; }
            catch (DocumentationSearchException) when (!stoppingToken.IsCancellationRequested)
            {
                if (attempt < 2) await Task.Delay(TimeSpan.FromSeconds(5 * (attempt + 1)), stoppingToken);
            }
        }
    }
}
