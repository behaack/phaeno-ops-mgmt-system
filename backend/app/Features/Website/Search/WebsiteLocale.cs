namespace PhaenoPortal.App.Features.Website.Search;

public static class WebsiteLocale
{
    public const string Default = "en-US";
    public const string Arabic = "ar";
    public const string French = "fr";
    public const string Spanish = "es";
    public const string SimplifiedChinese = "zh-Hans";
    public const string TraditionalChinese = "zh-Hant";
    public const string Japanese = "ja";
    public const string German = "de-DE";
    public const string Italian = "it";

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

        if (normalized.Equals(French, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("fr-", StringComparison.OrdinalIgnoreCase))
        {
            return French;
        }

        if (normalized.Equals(Spanish, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("es-", StringComparison.OrdinalIgnoreCase))
        {
            return Spanish;
        }

        if (normalized.Equals("zh", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("zh-CN", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("zh-SG", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals(SimplifiedChinese, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("zh-Hans-", StringComparison.OrdinalIgnoreCase))
        {
            return SimplifiedChinese;
        }

        if (normalized.Equals("zh-TW", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("zh-HK", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("zh-MO", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals(TraditionalChinese, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("zh-Hant-", StringComparison.OrdinalIgnoreCase))
        {
            return TraditionalChinese;
        }

        if (normalized.Equals(Japanese, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("ja-", StringComparison.OrdinalIgnoreCase))
        {
            return Japanese;
        }

        if (normalized.Equals("de", StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("de-", StringComparison.OrdinalIgnoreCase))
        {
            return German;
        }

        if (normalized.Equals(Italian, StringComparison.OrdinalIgnoreCase)
            || normalized.StartsWith("it-", StringComparison.OrdinalIgnoreCase))
        {
            return Italian;
        }

        return Default;
    }
}
