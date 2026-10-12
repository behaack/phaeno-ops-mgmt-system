namespace PhaenoPortal.Test;
using System.Globalization;
using PhaenoPortal.App.Features.OrderManagement.Services;
using UglyToad.PdfPig;

public sealed class InvoicePdfRendererTests
{
    [Fact]
    public void PreservesUnicodeNamesFrozenAmountsAndAllLongInvoiceLinesUnderAnotherMachineCulture()
    {
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("fr-FR");
            var lines = Enumerable.Range(1,60).Select(index => new InvoicePdfLine($"TEST ONLY line {index:000} Zoë α " + new string('W',100), 1.234567m, 10.50m, 99.99m)).ToArray();
            var bytes = InvoicePdfRenderer.Render("TEST-INVOICE", "Zoë Laboratoire α", new(2026,10,11), new(2026,11,11), lines, 123.45m, 6.78m, 130.23m, "USD");
            using var pdf = PdfDocument.Open(bytes);
            var text = string.Join("\n",pdf.GetPages().Select(page=>page.Text));
            Assert.Contains("Zoë Laboratoire α",text); Assert.Contains("Subtotal: 123.45 USD",text);
            Assert.Contains("Total: 130.23 USD",text); Assert.Contains("1.234567 x 10.50",text); Assert.Contains("line 060",text);
            Assert.True(pdf.NumberOfPages > 1);
            Assert.All(pdf.GetPages().SelectMany(page=>page.Letters),letter=>Assert.InRange(letter.BoundingBox.Right,0,570));
            var proof = Environment.GetEnvironmentVariable("PSEQ_INVOICE_VERIFICATION_OUTPUT");
            if (!string.IsNullOrWhiteSpace(proof)) File.WriteAllBytes(proof,bytes);
        }
        finally { CultureInfo.CurrentCulture = previous; }
    }
}
