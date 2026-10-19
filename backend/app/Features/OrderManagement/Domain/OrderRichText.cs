namespace PhaenoPortal.App.Features.OrderManagement.Domain;

using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;

/// <summary>Small, attribute-free formatting vocabulary for employee-authored order notes.</summary>
public static class OrderRichText
{
    public const int MaximumMarkupLength = 16000;
    public const int MaximumTextLength = 2000;

    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (value.Length > MaximumMarkupLength) throw new ArgumentException("Each notes field allows up to 16,000 characters including formatting.");
        var parser = new HtmlParser();
        var document = parser.ParseDocument("");
        var nodes = parser.ParseFragment(value, document.CreateElement("div"));
        var output = new StringBuilder();
        var text = new StringBuilder();
        foreach (var node in nodes) Append(node, output, text, 0);
        if (text.Length > MaximumTextLength) throw new ArgumentException("Each notes field allows up to 2,000 text characters.");
        if (output.Length > MaximumMarkupLength) throw new ArgumentException("Notes formatting is too long. Simplify the formatting and try again.");
        return string.IsNullOrWhiteSpace(text.ToString()) ? null : output.ToString();
    }

    private static void Append(INode node, StringBuilder output, StringBuilder text, int depth)
    {
        if (depth > 32) throw new ArgumentException("Notes formatting is nested too deeply.");
        if (node is IText content)
        {
            output.Append(WebUtility.HtmlEncode(content.Data));
            text.Append(content.Data);
            return;
        }
        if (node is not IElement element) return;
        var tag = element.LocalName switch { "b" => "strong", "i" => "em", "div" => "p", var name => name };
        if (tag is "script" or "style" or "iframe" or "object" or "svg" or "math" or "template") return;
        var allowed = tag is "p" or "br" or "strong" or "em" or "u" or "ul" or "ol" or "li";
        if (allowed) output.Append('<').Append(tag).Append('>');
        foreach (var child in element.ChildNodes) Append(child, output, text, depth + 1);
        if (allowed && tag != "br") output.Append("</").Append(tag).Append('>');
    }

    // Revision snapshots predate the private/public split. Their old jobNotes value
    // must not bypass the current customer projection. Preserve the stored audit copy.
    public static string CustomerSnapshot(string snapshot, bool internallyPlaced = true)
    {
        var value = JsonNode.Parse(snapshot);
        Redact(value, internallyPlaced);
        return value?.ToJsonString() ?? "{}";
    }

    private static void Redact(JsonNode? node, bool internallyPlaced)
    {
        if (node is JsonObject obj)
        {
            foreach (var key in obj.Select(pair => pair.Key).ToArray())
                if (key.Equals("privateNotes", StringComparison.OrdinalIgnoreCase)
                    || internallyPlaced && key.Equals("jobNotes", StringComparison.OrdinalIgnoreCase)) obj.Remove(key);
                else Redact(obj[key], internallyPlaced);
        }
        else if (node is JsonArray array) foreach (var item in array) Redact(item, internallyPlaced);
    }
}
