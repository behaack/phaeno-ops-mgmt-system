namespace PhaenoPortal.App.Localization;
using System.Globalization;
using System.Text.Json;

/// <summary>Current published English presentation sources. Parameters remain record data.
/// Additional languages require Customer-only routing and separate publication approval.</summary>
public static class CustomerDocumentText
{
    public const string PublishedLocale = "en-US";
    private static readonly Lazy<IReadOnlyDictionary<string,string>> Messages = new(() => {
        using var stream = typeof(CustomerDocumentText).Assembly.GetManifestResourceStream("Localization/customer-documents.en-US.json")
            ?? throw new InvalidOperationException("The Customer document message source is unavailable.");
        return JsonSerializer.Deserialize<Dictionary<string,string>>(stream)!;
    });
    public static string Format(string key, params object?[] values)
    {
        var message = Messages.Value[key];
        for (var index=0;index<values.Length;index++) message=message.Replace("{p"+index+"}",Convert.ToString(values[index],CultureInfo.InvariantCulture)??"",StringComparison.Ordinal);
        return message;
    }
}
