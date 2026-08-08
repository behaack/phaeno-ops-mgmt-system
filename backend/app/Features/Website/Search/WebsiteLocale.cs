namespace PhaenoPortal.App.Features.Website.Search;

public static class WebsiteLocale
{
    public const string Default = "en-US";
    public const string Arabic = "ar";
    public const string French = "fr";

    public static string Normalize(string? locale)
    {
        if (string.IsNullOrWhiteSpace(locale))
        {
            return Default;
        }

        var normalized = locale.Trim();
        if (normalized.Equals(Arabic, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("ar-", StringComparison.OrdinalIgnoreCase))
        {
            return Arabic;
        }

        return normalized.Equals(French, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("fr-", StringComparison.OrdinalIgnoreCase)
                ? French
                : Default;
    }
}
