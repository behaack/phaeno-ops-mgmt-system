using Microsoft.Extensions.Options;

namespace PhaenoPortal.App.Features.Website;

public sealed class WebsitePreviewSearchOptionsValidator
    : IValidateOptions<WebsitePreviewSearchOptions>
{
    public ValidateOptionsResult Validate(
        string? name,
        WebsitePreviewSearchOptions options)
    {
        if (!options.Enabled)
        {
            return ValidateOptionsResult.Success;
        }

        var failures = new List<string>();
        if (!Uri.TryCreate(options.Url, UriKind.Absolute, out var source)
            || source.Scheme != Uri.UriSchemeHttps)
        {
            failures.Add(
                "WebsitePreviewSearch:Url must be an absolute HTTPS URL when preview search is enabled.");
        }
        if (string.IsNullOrWhiteSpace(options.SiteMap))
        {
            failures.Add(
                "WebsitePreviewSearch:SiteMap is required when preview search is enabled.");
        }
        if (string.IsNullOrWhiteSpace(options.SearchIndexLocation))
        {
            failures.Add(
                "WebsitePreviewSearch:SearchIndexLocation is required when preview search is enabled.");
        }
        if (string.IsNullOrWhiteSpace(options.VercelProtectionBypassSecret))
        {
            failures.Add(
                "WebsitePreviewSearch:VercelProtectionBypassSecret is required when preview search is enabled.");
        }
        if (options.ProxyApiKey.Length < 32)
        {
            failures.Add(
                "WebsitePreviewSearch:ProxyApiKey must contain at least 32 characters when preview search is enabled.");
        }
        if (options.IntervalHours < 1)
        {
            failures.Add(
                "WebsitePreviewSearch:IntervalHours must be at least 1.");
        }
        if (options.MaxDocumentBytes < 1
            || options.MaxExtractedCharacters < 1
            || options.DocumentTimeoutSeconds < 1)
        {
            failures.Add(
                "WebsitePreviewSearch document limits and timeout must be positive.");
        }

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }
}
