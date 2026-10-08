namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Net;
using System.Text;
using System.Text.Json;
using PSeq.Operations.Laboratory.Domain;

public static class LabInvestigationReportRenderer
{
    public static string Html(LabInvestigationReport report)
    {
        using var body = JsonDocument.Parse(report.BodyJson);
        var result = new StringBuilder("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'\"><title>Sample investigation report</title><style>body{font:14px/1.5 system-ui,sans-serif;color:#172f46;margin:2rem;max-width:80rem}h1{font-size:24px}dt{font-weight:600}dd{margin:0 0 12px 16px;overflow-wrap:anywhere;white-space:pre-wrap}dl{border-left:1px solid #cbd5e1;padding-left:12px}ol{padding-left:24px}li{margin-bottom:12px}h2{background:#eef3f8;padding:12px}.meta{overflow-wrap:anywhere;color:#425466}@media print{body{margin:0;font-size:10pt}h1,h2,dt{break-after:avoid}li{break-inside:avoid}}</style></head><body><h1>Sample investigation report</h1>");
        result.Append("<p>Internal investigation evidence. Recorded evidence does not certify scientific validity. Use your browser’s Print command to print or save this report.</p>");
        result.Append("<p class=\"meta\">Evidence manifest SHA-256: ").Append(WebUtility.HtmlEncode(report.Sha256)).Append("</p>");
        Render(result, body.RootElement, 0);
        return result.Append("</body></html>").ToString();
    }

    private static void Render(StringBuilder html, JsonElement value, int depth)
    {
        if (depth < 30 && value.ValueKind == JsonValueKind.Object)
        {
            html.Append("<dl>");
            foreach (var property in value.EnumerateObject())
            {
                html.Append("<dt>").Append(WebUtility.HtmlEncode(Label(property.Name))).Append("</dt><dd>");
                Render(html, property.Value, depth + 1);
                html.Append("</dd>");
            }
            html.Append("</dl>");
        }
        else if (depth < 30 && value.ValueKind == JsonValueKind.Array)
        {
            if (value.GetArrayLength() == 0) { html.Append("No records"); return; }
            html.Append("<ol>");
            foreach (var item in value.EnumerateArray()) { html.Append("<li>"); Render(html, item, depth + 1); html.Append("</li>"); }
            html.Append("</ol>");
        }
        else
        {
            var text = value.ValueKind == JsonValueKind.String ? value.GetString()! : value.ValueKind == JsonValueKind.Null ? "Not recorded" : value.ToString();
            if (depth < 30 && (text.StartsWith('{') || text.StartsWith('[')))
            {
                try { using var nested = JsonDocument.Parse(text); Render(html, nested.RootElement, depth + 1); return; }
                catch (JsonException) { /* Preserve unstructured historical text. */ }
            }
            html.Append(WebUtility.HtmlEncode(text));
        }
    }

    private static string Label(string name)
    {
        var result = new StringBuilder();
        for (var i = 0; i < name.Length; i++)
        {
            if (i > 0 && char.IsUpper(name[i]) && char.IsLower(name[i - 1])) result.Append(' ');
            result.Append(i == 0 ? char.ToUpperInvariant(name[i]) : name[i] == '_' ? ' ' : name[i]);
        }
        return result.ToString();
    }
}
