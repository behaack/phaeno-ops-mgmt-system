namespace PhaenoPortal.App.Features.OrderManagement.Services;
using System.Globalization;
using System.Text;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.TrueType;
using UglyToad.PdfPig.Fonts.TrueType.Parser;
using UglyToad.PdfPig.Writer;
using PhaenoPortal.App.Localization;

public sealed record InvoicePdfLine(string Description, decimal Quantity, decimal UnitPrice, decimal Total);

/// <summary>Renders saved financial values without recalculation or machine-culture changes.</summary>
public static class InvoicePdfRenderer
{
    private static readonly Lazy<byte[]> FontBytes = new(() => {
        using var source = typeof(InvoicePdfRenderer).Assembly.GetManifestResourceStream("QuoteDocuments/Ubuntu-Regular.ttf")
            ?? throw new InvalidOperationException("The invoice document font is unavailable.");
        using var copy = new MemoryStream(); source.CopyTo(copy); return copy.ToArray();
    });
    private static readonly Lazy<TrueTypeFont> FontMap = new(() => TrueTypeFontParser.Parse(new TrueTypeDataBytes(FontBytes.Value)));

    public static byte[] Render(string invoiceNumber, string customerName,
        DateOnly issuedOn, DateOnly dueOn, IReadOnlyList<InvoicePdfLine> lines,
        decimal subtotal, decimal tax, decimal total, string currency)
    {
        using var builder = new PdfDocumentBuilder();
        var font = builder.AddTrueTypeFont(FontBytes.Value);
        builder.DocumentInformation.Title = $"Invoice {invoiceNumber}";
        builder.DocumentInformation.Author = "Phaeno Inc.";
        var page = builder.AddPage(612, 792);
        var y = 746d;
        var pages = new List<PdfPageBuilder> { page };
        var textLines = new List<string> { CustomerDocumentText.Format("invoice.title"),
            CustomerDocumentText.Format("invoice.number", invoiceNumber), CustomerDocumentText.Format("invoice.customer",customerName),
            CustomerDocumentText.Format("invoice.issued",issuedOn.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture)),
            CustomerDocumentText.Format("invoice.due",dueOn.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture)), "" };
        textLines.AddRange(lines.Select((line,index) => FormattableString.Invariant(
            $"{index+1}. {line.Description} | {line.Quantity:0.######} x {line.UnitPrice:0.00} | {line.Total:0.00} {currency}")));
        textLines.AddRange(["",CustomerDocumentText.Format("invoice.subtotal",subtotal.ToString("0.00",CultureInfo.InvariantCulture),currency),
            CustomerDocumentText.Format("invoice.tax",tax.ToString("0.00",CultureInfo.InvariantCulture),currency),
            CustomerDocumentText.Format("invoice.total",total.ToString("0.00",CultureInfo.InvariantCulture),currency)]);
        var map = FontMap.Value.TableRegister.CMapTable;
        foreach (var original in textLines)
        {
            var wrapped = new List<string>();
            var text = original.Normalize(NormalizationForm.FormC).Replace('\t',' ').Replace("\r", "", StringComparison.Ordinal);
            foreach (var character in text.Where(character => character != '\n'))
                if (char.IsControl(character) || map is null || !map.TryGetGlyphIndex(character, out var glyph) || glyph == 0)
                    throw new InvalidOperationException("This invoice contains characters that the document font cannot display. Contact Phaeno for a copy.");
            foreach (var paragraph in text.Split('\n'))
            {
                var current = "";
                foreach (var character in paragraph)
                {
                    var candidate = current + character;
                    var measured = page.MeasureText(candidate, 11, new PdfPoint(0,0), font);
                    if (current.Length > 0 && measured.Count > 0 && measured[^1].EndBaseLine.X > 504)
                    { wrapped.Add(current); current = character.ToString(); }
                    else current = candidate;
                }
                wrapped.Add(current);
            }
            if (wrapped.Count < 40 && y - (wrapped.Count-1)*15 < 65) NewPage();
            foreach (var line in wrapped) Write(line);
        }
        for (var index=0;index<pages.Count;index++) pages[index].AddText($"Phaeno Inc. | {index+1}/{pages.Count}", 8, new PdfPoint(54,35), font);
        return builder.Build();
        void Write(string text)
        {
            if (y < 65) NewPage();
            if (text.Length > 0) page.AddText(text,11,new PdfPoint(54,y),font);
            y-=15;
        }
        void NewPage()
        {
            page = builder.AddPage(612,792); pages.Add(page);
            page.AddText(CustomerDocumentText.Format("invoice.number",invoiceNumber),9,new PdfPoint(54,746),font);
            y=722;
        }
    }
}
