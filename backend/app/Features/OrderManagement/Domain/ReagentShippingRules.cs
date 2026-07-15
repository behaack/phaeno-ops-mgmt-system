namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using System.Text.Json;

public sealed record ReagentShippingRules(
    IReadOnlyList<string>? AllowedCountryCodes,
    IReadOnlyList<string>? BlockedCountryCodes,
    IReadOnlyList<string>? AllowedRegions,
    IReadOnlyList<string>? BlockedRegions)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static ReagentShippingRules Parse(string json)
    {
        using var document = JsonDocument.Parse(json);
        if (document.RootElement.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("Shipping restrictions must be a JSON object.", nameof(json));
        return JsonSerializer.Deserialize<ReagentShippingRules>(json, JsonOptions)
            ?? new ReagentShippingRules(null, null, null, null);
    }

    public bool Allows(string countryCode, string region)
    {
        var country = countryCode.Trim().ToUpperInvariant();
        var regionCode = region.Trim().ToUpperInvariant();
        var qualifiedRegion = $"{country}-{regionCode}";
        if (Contains(BlockedCountryCodes, country) || Contains(BlockedRegions, regionCode, qualifiedRegion)) return false;
        if (AllowedCountryCodes?.Count > 0 && !Contains(AllowedCountryCodes, country)) return false;
        return AllowedRegions?.Count is not > 0 || Contains(AllowedRegions, regionCode, qualifiedRegion);
    }

    private static bool Contains(IReadOnlyList<string>? values, params string[] candidates)
        => values?.Any(value => candidates.Contains(value.Trim(), StringComparer.OrdinalIgnoreCase)) == true;
}
