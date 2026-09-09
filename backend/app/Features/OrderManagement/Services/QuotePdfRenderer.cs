namespace PhaenoPortal.App.Features.OrderManagement.Services;

using System.Globalization;
using System.Text;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.TrueType;
using UglyToad.PdfPig.Fonts.TrueType.Parser;
using UglyToad.PdfPig.Writer;

public sealed record QuotePdfLine(string Description, decimal Quantity, decimal UnitPrice);

public sealed record QuotePdfDocument(
    string OrderNumber, string? JobName, string OrganizationName, string DepartmentName,
    int Revision, string Status, string Purpose, DateTime IssuedAt, DateTime ExpiresAt,
    DateTime? AcceptedAt, IReadOnlyList<QuotePdfLine> Lines, decimal Subtotal, decimal Tax,
    decimal Total, string Currency, bool TaxDetermined, string? BillingContactName,
    string? BillingContactEmail, IReadOnlyList<string> BillingAddress, int? PaymentTermsDays);

/// <summary>A downloadable presentation of the saved quote, with no commercial recalculation.</summary>
public static class QuotePdfRenderer
{
    private static readonly Lazy<byte[]> Logo = new(() => ReadResource("phaeno-logo.png"));
    private static readonly Lazy<byte[]> Regular = new(() => ReadResource("Ubuntu-Regular.ttf"));
    private static readonly Lazy<byte[]> Bold = new(() => ReadResource("Ubuntu-Bold.ttf"));
    private static readonly Lazy<TrueTypeFont> RegularMap = new(() => TrueTypeFontParser.Parse(new TrueTypeDataBytes(Regular.Value)));
    private static readonly Lazy<TrueTypeFont> BoldMap = new(() => TrueTypeFontParser.Parse(new TrueTypeDataBytes(Bold.Value)));

    public static byte[] Render(QuotePdfDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);
        using var layout = new Layout(document);
        return layout.Render();
    }

    private static byte[] ReadResource(string name)
    {
        using var stream = typeof(QuotePdfRenderer).Assembly.GetManifestResourceStream($"QuoteDocuments/{name}")
            ?? throw new InvalidOperationException("The quote document branding is unavailable.");
        using var output = new MemoryStream();
        stream.CopyTo(output);
        return output.ToArray();
    }

    private sealed class Layout : IDisposable
    {
        private const double Left = 48;
        private const double Right = 564;
        private const double Bottom = 76;
        private const double Leading = 14;
        private readonly QuotePdfDocument document;
        private readonly PdfDocumentBuilder builder = new();
        private readonly PdfDocumentBuilder.AddedFont regular;
        private readonly PdfDocumentBuilder.AddedFont bold;
        private readonly List<PdfPageBuilder> pages = [];
        private PdfPageBuilder page = null!;
        private double y;

        public Layout(QuotePdfDocument document)
        {
            this.document = document;
            regular = builder.AddTrueTypeFont(Regular.Value);
            bold = builder.AddTrueTypeFont(Bold.Value);
            builder.DocumentInformation.Title = $"Quote {document.OrderNumber} - revision {document.Revision}";
            builder.DocumentInformation.Author = "Phaeno Inc.";
            builder.DocumentInformation.Subject = "Laboratory services quote";
            builder.DocumentInformation.Creator = "Phaeno Portal";
        }

        public byte[] Render()
        {
            NewPage();
            Context();
            TableHeader();
            foreach (var line in document.Lines) TableRow(line);
            TotalsAndTerms();
            for (var index = 0; index < pages.Count; index++)
            {
                page = pages[index];
                Rule(Left, Right, 53);
                Text("Phaeno Inc. | phaenobiotech.com", Left, 36, 8, muted: true);
                RightText($"Page {index + 1} of {pages.Count}", Right, 36, 8, muted: true);
            }
            return builder.Build();
        }

        private void NewPage()
        {
            page = builder.AddPage(612, 792);
            pages.Add(page);
            page.AddPng(Logo.Value, new PdfRectangle(Left, 706, Left + 124, 746));
            RightText("QUOTE", Right, 726, 24, strong: true);
            RightText($"Revision {document.Revision} | {document.Status}", Right, 706, 10);
            page.SetStrokeColor(162, 185, 59);
            page.DrawLine(new PdfPoint(Left, 689), new PdfPoint(Right, 689), 2);
            y = 668;
            if (pages.Count > 1)
            {
                foreach (var line in Wrap($"Job {document.OrderNumber} | Quote continued", Right - Left, 9))
                {
                    Text(line, Left, y, 9, muted: true);
                    y -= Leading;
                }
                y -= 8;
            }
        }

        private void Context()
        {
            var leftLines = new List<(string Text, double Size, bool Strong, bool Muted)>
            {
                ("PREPARED FOR", 8, true, true),
                (document.OrganizationName, 13, true, false),
                ($"Department: {document.DepartmentName}", 10, false, false),
                ($"Job: {document.OrderNumber}", 10, true, false)
            };
            if (!string.IsNullOrWhiteSpace(document.JobName)) leftLines.Add((document.JobName, 10, false, false));
            var details = new List<(string Label, string Value)>
            {
                ("Issued", Date(document.IssuedAt)),
                ("Expires", Date(document.ExpiresAt)),
                ("Purpose", document.Purpose)
            };
            if (document.AcceptedAt is { } accepted) details.Add(("Accepted", Date(accepted)));
            var initialY = y;
            var leftEnd = Block(leftLines, Left, initialY, 300);
            Text("QUOTE DETAILS", 378, initialY, 8, strong: true, muted: true);
            var rightEnd = initialY - 22;
            foreach (var detail in details)
            {
                Text($"{detail.Label}: ", 378, rightEnd, 9, muted: true);
                foreach (var value in Wrap(detail.Value, 126, 10))
                {
                    Text(value, 438, rightEnd, 10);
                    rightEnd -= Leading;
                }
                rightEnd -= 6;
            }
            y = Math.Min(leftEnd, rightEnd) - 4;

            var billing = new List<string>();
            if (!string.IsNullOrWhiteSpace(document.BillingContactName)) billing.Add(document.BillingContactName);
            if (!string.IsNullOrWhiteSpace(document.BillingContactEmail)) billing.Add(document.BillingContactEmail);
            billing.AddRange(document.BillingAddress.Where(value => !string.IsNullOrWhiteSpace(value)));
            if (billing.Count > 0)
            {
                y -= 6;
                Paragraph("BILLING DETAILS", 8, strong: true, muted: true);
                y -= 3;
                foreach (var value in billing) Paragraph(value, 10);
                y -= 9;
            }
        }

        private double Block(IEnumerable<(string Text, double Size, bool Strong, bool Muted)> values, double x, double top, double width)
        {
            foreach (var value in values)
            {
                foreach (var line in Wrap(value.Text, width, value.Size, value.Strong))
                {
                    // Reject pathological context length instead of silently clipping customer details.
                    if (top < Bottom + 24)
                        throw new InvalidOperationException("The quote's customer or job details are too long for this document. Contact Phaeno for a copy.");
                    Text(line, x, top, value.Size, value.Strong, value.Muted);
                    top -= Math.Max(Leading, value.Size + 4);
                }
                top -= 3;
            }
            return top + 3;
        }

        private void TableHeader()
        {
            Ensure(65);
            page.SetTextAndFillColor(0, 48, 87);
            page.SetStrokeColor(0, 48, 87);
            page.DrawRectangle(new PdfPoint(Left, y - 24), Right - Left, 27, 0, true);
            Text("Description", Left + 10, y - 14, 9, strong: true, white: true);
            RightText("Quantity", 369, y - 14, 9, strong: true, white: true);
            RightText("Unit price", 453, y - 14, 9, strong: true, white: true);
            RightText("Amount", Right - 10, y - 14, 9, strong: true, white: true);
            y -= 43;
        }

        private void TableRow(QuotePdfLine line)
        {
            var description = Wrap(line.Description, 268, 10);
            var quantities = Wrap(Number(line.Quantity), 47, 10);
            var prices = Wrap(Money(line.UnitPrice, preservePrecision: true), 72, 10);
            var amounts = Wrap(Money(Math.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero)), 89, 10);
            var count = new[] { description.Count, quantities.Count, prices.Count, amounts.Count }.Max();
            var offset = 0;
            while (offset < count)
            {
                var available = (int)Math.Floor((y - Bottom - 14) / Leading);
                // Keep ordinary items together; only an item taller than a fresh page may split.
                if (available < Math.Min(count - offset, 36))
                {
                    NewPage();
                    TableHeader();
                    available = (int)Math.Floor((y - Bottom - 14) / Leading);
                }
                var length = Math.Min(count - offset, available);
                for (var index = offset; index < offset + length; index++)
                {
                    if (index < description.Count) Text(description[index], Left + 10, y, 10);
                    if (index < quantities.Count) RightText(quantities[index], 369, y, 10);
                    if (index < prices.Count) RightText(prices[index], 453, y, 10);
                    if (index < amounts.Count) RightText(amounts[index], Right - 10, y, 10);
                    y -= Leading;
                }
                offset += length;
                y -= 4;
                Rule(Left, Right, y);
                y -= 21;
            }
        }

        private void TotalsAndTerms()
        {
            var panelHeight = document.TaxDetermined ? 117d : 95d;
            Ensure(panelHeight + 28);
            var panelTop = y + 5;
            page.SetTextAndFillColor(242, 247, 249);
            page.SetStrokeColor(242, 247, 249);
            page.DrawRectangle(new PdfPoint(314, panelTop - panelHeight), Right - 314, panelHeight, 0, true);
            y = panelTop - 19;
            RightText($"Currency: {document.Currency}", Right - 14, y, 8, muted: true);
            y -= 23;
            TotalRow("Subtotal", document.Subtotal);
            if (document.TaxDetermined) TotalRow("Tax", document.Tax);
            Rule(328, Right - 14, y + 9);
            y -= 10;
            TotalRow(document.TaxDetermined ? "Total" : "Pre-tax total", document.Total, true);
            y = panelTop - panelHeight - 22;
            if (!document.TaxDetermined)
                Paragraph("Applicable tax will be calculated at invoicing.", 9, muted: true);
            if (document.PaymentTermsDays is { } days)
            {
                y -= 10;
                Paragraph($"Payment terms: Net {days.ToString(CultureInfo.InvariantCulture)} days.", 10);
            }
            y -= 8;
            Paragraph("Review this quote and its current status in Phaeno Portal.", 9, muted: true);
        }

        private void TotalRow(string label, decimal amount, bool strong = false)
        {
            Text(label, 328, y, strong ? 12 : 10, strong);
            var value = Money(amount);
            var size = strong ? 12d : 10d;
            while (size > 7 && Width(value, size, strong) > 132) size -= 0.5;
            RightText(value, Right - 14, y, size, strong);
            y -= strong ? 24 : 22;
        }

        private void Paragraph(string value, double size, bool strong = false, bool muted = false)
        {
            foreach (var line in Wrap(value, Right - Left, size, strong))
            {
                Ensure(Leading);
                Text(line, Left, y, size, strong, muted);
                y -= Leading;
            }
        }

        private void Ensure(double height)
        {
            if (y - height < Bottom) NewPage();
        }

        private void Rule(double start, double end, double position)
        {
            page.SetStrokeColor(200, 213, 223);
            page.DrawLine(new PdfPoint(start, position), new PdfPoint(end, position), 0.7);
        }

        private void Text(string value, double x, double baseline, double size, bool strong = false, bool muted = false, bool white = false)
        {
            value = Clean(value, strong);
            if (white) page.SetTextAndFillColor(255, 255, 255);
            else if (muted) page.SetTextAndFillColor(77, 99, 116);
            else page.SetTextAndFillColor(0, 48, 87);
            page.AddText(value, size, new PdfPoint(x, baseline), strong ? bold : regular);
        }

        private void RightText(string value, double right, double baseline, double size, bool strong = false, bool muted = false, bool white = false) =>
            Text(value, right - Width(value, size, strong), baseline, size, strong, muted, white);

        private double Width(string value, double size, bool strong = false)
        {
            var letters = page.MeasureText(Clean(value, strong), size, new PdfPoint(0, 0), strong ? bold : regular);
            return letters.Count == 0 ? 0 : letters[^1].EndBaseLine.X;
        }

        private List<string> Wrap(string value, double width, double size, bool strong = false)
        {
            value = Clean(value, strong);
            var result = new List<string>();
            foreach (var paragraph in value.Split('\n'))
            {
                var current = "";
                foreach (var word in paragraph.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                {
                    var candidate = current.Length == 0 ? word : $"{current} {word}";
                    if (Width(candidate, size, strong) <= width) { current = candidate; continue; }
                    if (current.Length > 0) { result.Add(current); current = ""; }
                    foreach (var character in word)
                    {
                        candidate = current + character;
                        if (Width(candidate, size, strong) > width && current.Length > 0)
                        {
                            result.Add(current);
                            current = character.ToString();
                        }
                        else current = candidate;
                    }
                }
                if (current.Length > 0 || paragraph.Length == 0) result.Add(current);
            }
            return result.Count == 0 ? [""] : result;
        }

        private static string Clean(string value, bool strong)
        {
            var normalized = value.Normalize(NormalizationForm.FormC).Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n').Replace('\t', ' ');
            var map = (strong ? BoldMap.Value : RegularMap.Value).TableRegister.CMapTable;
            foreach (var character in normalized)
            {
                if (character == '\n') continue;
                if (char.IsControl(character) || map is null || !map.TryGetGlyphIndex(character, out var glyph) || glyph == 0)
                    throw new InvalidOperationException("This quote contains characters that the document font cannot display. Contact Phaeno for a copy.");
            }
            return normalized;
        }

        private static string Date(DateTime value) => value.ToString("MMM d, yyyy", CultureInfo.InvariantCulture);
        private static string Number(decimal value) => value.ToString("0.############################", CultureInfo.InvariantCulture);
        private string Money(decimal value, bool preservePrecision = false) => (document.Currency.Equals("USD", StringComparison.OrdinalIgnoreCase) ? "$" : "")
            + value.ToString(preservePrecision ? "#,0.00##########################" : "#,0.00", CultureInfo.InvariantCulture);
        public void Dispose() => builder.Dispose();
    }
}
