using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website.Crawler;
using PhaenoPortal.App.Features.Website.Crawler.Documents;
using PhaenoPortal.App.Features.Website.Notifications;
using PhaenoPortal.App.Features.Website.Search;
using PhaenoPortal.App.Features.Website.Services;

namespace PhaenoPortal.App.Features.Website;

public static class WebsiteServiceCollectionExtensions
{
    public const string CorsPolicyName = "Website";
    public const string PreviewCrawlerHttpClientName = "WebsitePreviewCrawler";

    public static IServiceCollection AddWebsiteApi(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        services.Configure<WebsiteApiOptions>(
            configuration.GetSection(WebsiteApiOptions.SectionName));
        services.Configure<WebsiteRecaptchaOptions>(
            configuration.GetSection(WebsiteRecaptchaOptions.SectionName));
        services.Configure<WebsiteEmailOptions>(
            configuration.GetSection(WebsiteEmailOptions.SectionName));
        services.Configure<WebsiteCrawlerOptions>(
            configuration.GetSection(WebsiteCrawlerOptions.SectionName));
        services.Configure<WebsiteSearchOptions>(
            configuration.GetSection(WebsiteSearchOptions.SectionName));
        services.Configure<WebsiteIndexingOptions>(
            configuration.GetSection(WebsiteIndexingOptions.SectionName));
        services
            .AddOptions<WebsitePreviewSearchOptions>()
            .Bind(configuration.GetSection(WebsitePreviewSearchOptions.SectionName))
            .ValidateOnStart();
        services.AddSingleton<
            IValidateOptions<WebsitePreviewSearchOptions>,
            WebsitePreviewSearchOptionsValidator>();

        var websiteOptions = configuration
            .GetSection(WebsiteApiOptions.SectionName)
            .Get<WebsiteApiOptions>()
            ?? new WebsiteApiOptions();
        var allowedOrigins = websiteOptions.AllowedOrigins
            .Select(origin => origin.TrimEnd('/'))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        services.AddCors(options =>
        {
            options.AddPolicy(CorsPolicyName, policy =>
            {
                policy
                    .SetIsOriginAllowed(origin =>
                    {
                        if (allowedOrigins.Contains(origin.TrimEnd('/')))
                        {
                            return true;
                        }

                        return environment.IsDevelopment()
                            && Uri.TryCreate(origin, UriKind.Absolute, out var uri)
                            && uri.IsLoopback;
                    })
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        services.AddScoped<WebsiteService>();
        services.AddScoped<WebsiteNotificationDispatcher>();
        services.AddScoped<WebsiteNotificationRecoveryService>();
        services.AddScoped<WebsiteNotificationProcessingService>();
        services.AddHostedService<WebsiteNotificationBackgroundService>();
        services.AddSingleton<WebsiteNotificationQueueMonitor>();
        services.AddHostedService<WebsiteNotificationMonitoringBackgroundService>();
        services.AddScoped<IWebsiteRecaptchaVerifier, GoogleWebsiteRecaptchaVerifier>();
        services.AddScoped<LoggingWebsiteNotificationSender>();
        services.AddHttpClient<MailgunWebsiteNotificationSender>();
        services.AddScoped<IWebsiteNotificationSender>(serviceProvider =>
            serviceProvider.GetRequiredService<IOptions<WebsiteEmailOptions>>()
                .Value
                .IsConfigured
                ? serviceProvider.GetRequiredService<MailgunWebsiteNotificationSender>()
                : serviceProvider.GetRequiredService<LoggingWebsiteNotificationSender>());
        services.AddSingleton<IWebsiteSearchService, WebsiteSearchService>();
        services.AddSingleton<WebsitePreviewSearchService>();
        services.AddSingleton<IWebsiteDocumentTextExtractor, PdfWebsiteDocumentTextExtractor>();
        services
            .AddHttpClient<IWebsiteCrawler, WebsiteCrawler>()
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
            {
                AllowAutoRedirect = false
            });
        services
            .AddHttpClient(
                PreviewCrawlerHttpClientName,
                (serviceProvider, httpClient) =>
                {
                    var previewOptions = serviceProvider
                        .GetRequiredService<IOptions<WebsitePreviewSearchOptions>>()
                        .Value;
                    if (!string.IsNullOrWhiteSpace(
                        previewOptions.VercelProtectionBypassSecret))
                    {
                        httpClient.DefaultRequestHeaders.TryAddWithoutValidation(
                            "x-vercel-protection-bypass",
                            previewOptions.VercelProtectionBypassSecret);
                    }
                })
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
            {
                AllowAutoRedirect = false
            });
        services.AddHostedService<WebsiteIndexingBackgroundService>();
        services.AddHostedService<WebsitePreviewIndexingBackgroundService>();

        return services;
    }

    public static WebApplication UseWebsitePublicDocuments(
        this WebApplication app)
    {
        var options = app.Services
            .GetRequiredService<IOptions<WebsiteApiOptions>>()
            .Value;
        if (string.IsNullOrWhiteSpace(options.PublicDocumentsPath))
        {
            throw new InvalidOperationException(
                "WebsiteApi:PublicDocumentsPath is required.");
        }

        var documentsPath = Path.IsPathRooted(options.PublicDocumentsPath)
            ? options.PublicDocumentsPath
            : Path.Combine(
                app.Environment.ContentRootPath,
                options.PublicDocumentsPath);
        Directory.CreateDirectory(documentsPath);
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(documentsPath),
            RequestPath = "/public"
        });
        return app;
    }
}
