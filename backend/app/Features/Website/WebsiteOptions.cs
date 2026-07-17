namespace PhaenoPortal.App.Features.Website;

public sealed class WebsiteApiOptions
{
    public const string SectionName = "WebsiteApi";

    public List<string> AllowedOrigins { get; init; } = [];

    public string PublicDocumentsPath { get; init; } = "__DOCUMENTS/public";

    public string TechnicalBriefUrl { get; init; } = string.Empty;
}

public sealed class WebsiteRecaptchaOptions
{
    public const string SectionName = "GoogleAuthSettings";

    public string RecaptchaProjectId { get; init; } = string.Empty;

    public string RecaptchaSecretKey { get; init; } = string.Empty;

    public string? RecaptchaServiceAccountKeyPath { get; init; }

    public string? RecaptchaServiceAccountKeyJson { get; init; }

    public float RecaptchaThreshold { get; init; } = 0.6F;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(RecaptchaProjectId)
        && !string.IsNullOrWhiteSpace(RecaptchaSecretKey)
        && (!string.IsNullOrWhiteSpace(RecaptchaServiceAccountKeyJson)
            || !string.IsNullOrWhiteSpace(RecaptchaServiceAccountKeyPath));
}

public sealed class WebsiteEmailOptions
{
    public const string SectionName = "EmailServiceSettings";

    public string Url { get; init; } = string.Empty;

    public string Resource { get; init; } = string.Empty;

    public string ApiKey { get; init; } = string.Empty;

    public string AccountFrom { get; init; } = string.Empty;

    public string AccountTo { get; init; } = string.Empty;

    public string PhaenoAccountName { get; init; } = "Phaeno";

    public bool IsConfigured =>
        Uri.TryCreate(Url, UriKind.Absolute, out _)
        && !string.IsNullOrWhiteSpace(Resource)
        && !string.IsNullOrWhiteSpace(ApiKey)
        && !string.IsNullOrWhiteSpace(AccountFrom)
        && !string.IsNullOrWhiteSpace(AccountTo);
}

public sealed class WebsiteCrawlerOptions
{
    public const string SectionName = "WebCrawlerSettings";

    public string Url { get; init; } = string.Empty;

    public string SiteMap { get; init; } = string.Empty;
}

public sealed class WebsiteSearchOptions
{
    public const string SectionName = "WebSearchSettings";

    public string SearchIndexLocation { get; init; } = string.Empty;
}

public sealed class WebsiteIndexingOptions
{
    public const string SectionName = "ChronJobs:IndexWebsite";

    public int IntervalHours { get; init; } = 24;

    public bool RunOnStartup { get; init; } = true;
}
