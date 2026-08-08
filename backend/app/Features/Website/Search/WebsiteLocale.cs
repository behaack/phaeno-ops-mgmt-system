namespace PhaenoPortal.App.Features.Website.Search;

public static class WebsiteLocale
{
    public const string Default = "en-US";
    public const string Arabic = "ar";

    public static string Normalize(string? locale)
    {
        if (string.IsNullOrWhiteSpace(locale))
        {
            return Default;
        }

        var normalized = locale.Trim();
        return normalized.Equals(Arabic, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("ar-", StringComparison.OrdinalIgnoreCase)
                ? Arabic
                : Default;
    }
}
