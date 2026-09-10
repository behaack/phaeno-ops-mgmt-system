namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.OrderManagement.Services;
using UglyToad.PdfPig;

public class QuotePdfRendererTests
{
    [Fact]
    public void IssuedQuoteHasBrandingSavedAmountsAndNoInventedTaxOrBillingTerms()
    {
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(Example()));
        var page = pdf.GetPage(1);
        Assert.Equal(1, pdf.NumberOfPages);
        Assert.Equal(1, page.NumberOfImages);
        Assert.Contains("Johns Hopkins University", page.Text);
        Assert.Contains("Department: General", page.Text);
        Assert.Contains("HS5Y7DB7", page.Text);
        Assert.Contains("Test 1-2-3", page.Text);
        Assert.Contains("Revision 1 | Issued", page.Text);
        Assert.Contains("Sep 4, 2026", page.Text);
        Assert.Contains("Oct 4, 2026", page.Text);
        Assert.Contains("PSeq Lab Service", page.Text);
        Assert.Contains("$100.00", page.Text);
        Assert.Contains("$900.00", page.Text);
        Assert.Contains("Currency: USD", page.Text);
        Assert.Contains("Pre-tax total", page.Text);
        Assert.Contains("Applicable tax will be calculated at invoicing.", page.Text);
        Assert.Contains("Phaeno Inc.", page.Text);
        Assert.Contains("Page 1 of 1", page.Text);
        Assert.DoesNotContain("Payment terms", page.Text);
        Assert.DoesNotContain("BILLING DETAILS", page.Text);
        Assert.DoesNotContain("linesJson", page.Text);
        Assert.DoesNotContain("pricingDecidedByUserId", page.Text);
        Assert.DoesNotMatch(@"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", page.Text);
    }

    [Fact]
    public void DeterminedTaxAndAcceptedSnapshotKeepStoredTotalsAndDecimalPrecision()
    {
        var document = Example() with
        {
            Status = "Accepted",
            AcceptedAt = new DateTime(2026, 9, 8, 12, 0, 0, DateTimeKind.Utc),
            TaxDetermined = true,
            Lines = [new("Isoform analysis - precision pricing", 1.25m, 80.125m)],
            Subtotal = 100.16m,
            Tax = 8.26m,
            Total = 108.42m,
            BillingContactName = "Zoë Dvořák",
            BillingContactEmail = "billing@example.invalid",
            BillingAddress = ["12 Research Way", "Montréal, QC H1A 1A1", "Canada"],
            PaymentTermsDays = 30
        };
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(document));
        var text = pdf.GetPage(1).Text;
        Assert.Contains("Revision 1 | Accepted", text);
        Assert.Contains("Accepted: Sep 8, 2026", text);
        Assert.Contains("$80.125", text);
        Assert.DoesNotContain("$100.15625", text);
        Assert.Contains("$100.16", text);
        Assert.Contains("$8.26", text);
        Assert.Contains("$108.42", text);
        Assert.Contains("Zoë Dvořák", text);
        Assert.Contains("Montréal", text);
        Assert.Contains("billing@example.invalid", text);
        Assert.Contains("Payment terms: Net 30 days.", text);
        Assert.DoesNotContain("Pre-tax total", text);
        Assert.DoesNotContain("Applicable tax will be calculated", text);
    }

    [Theory]
    [InlineData("Expired")]
    [InlineData("Superseded")]
    public void HistoricalStatusIsVisible(string status)
    {
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(Example() with { Status = status }));
        Assert.Contains($"Revision 1 | {status}", pdf.GetPage(1).Text);
    }

    [Fact]
    public void LongDescriptionsAndManyLinesPaginateWithRepeatedHeadersAndNoClippedText()
    {
        var lines = Enumerable.Range(1, 64)
            .Select(index => new QuotePdfLine($"Analysis {index}: " + string.Join(" ", Enumerable.Repeat("Transcript and isoform quantification for research samples", 5)), index, 12.345m))
            .ToList();
        lines.Insert(2, new QuotePdfLine(string.Join(" ", Enumerable.Repeat("Very long research scope with detailed interpretation", 160)) + " END OF LONG SCOPE", 2, 10));
        var document = Example() with
        {
            OrganizationName = "Université de Montréal - Institute for Molecular Research and Translational Science",
            DepartmentName = "Biochemistry and Molecular Biology - Core Sequencing Facility",
            JobName = "RNA isoform characterization across longitudinal research cohorts and sample preparation conditions",
            Lines = lines,
            Subtotal = 25_698.40m,
            Total = 25_698.40m
        };
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(document));
        Assert.True(pdf.NumberOfPages > 3);
        var pages = pdf.GetPages().ToArray();
        var text = string.Join(" ", pages.Select(page => page.Text));
        Assert.Contains("Université de Montréal", text);
        Assert.Contains("ENDOFLONGSCOPE", string.Concat(text.Where(character => !char.IsWhiteSpace(character))));
        Assert.Contains("Analysis 64:", text);
        Assert.Contains("$25,698.40", text);
        foreach (var page in pages)
        {
            Assert.Equal(1, page.NumberOfImages);
            Assert.Contains($"Page {page.Number} of {pdf.NumberOfPages}", page.Text);
            if (page.Text.Contains("Analysis", StringComparison.Ordinal) || page.Text.Contains("Very long", StringComparison.Ordinal))
            {
                Assert.Contains("Description", page.Text);
                Assert.Contains("Unit price", page.Text);
            }
            Assert.All(page.Letters, letter =>
            {
                Assert.InRange(letter.BoundingBox.Left, 47, 565);
                Assert.InRange(letter.BoundingBox.Right, 47, 565);
                Assert.InRange(letter.BoundingBox.Bottom, 30, 758);
                Assert.InRange(letter.BoundingBox.Top, 30, 758);
            });
        }
    }

    [Fact]
    public void SampleScopeShowsBiologicalSourcesAndCountsAlongsideSavedPrices()
    {
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(Example() with
        {
            SampleScope = new(7, [new("Heart - adfgadgsdfg", 4), new("sdfghsfghdfgh", 3)]),
            Lines = [new("PSeq Lab Service", 7, 100)], Subtotal = 700, Total = 700
        }));
        Assert.Equal(1, pdf.NumberOfPages);
        var text = pdf.GetPage(1).Text;
        Assert.Contains("Sample scope · 7 samples", text);
        Assert.Contains("Biological source", text);
        Assert.Contains("Samples", text);
        Assert.Contains("Heart - adfgadgsdfg4", text);
        Assert.Contains("sdfghsfghdfgh3", text);
        Assert.Contains("$700.00", text);
    }

    [Fact]
    public void ManySourcesAndAnOversizedSourceWrapAndRepeatScopeHeadersWithoutClipping()
    {
        var sources = Enumerable.Range(1, 48).Select(index => new QuotePdfSource($"Biological source {index}", index)).ToList();
        sources.Insert(2, new(string.Join(" ", Enumerable.Repeat("Long biological source description", 180)) + " END OF SOURCE", 4));
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(Example() with
        {
            SampleScope = new(sources.Sum(source => source.SpecimenCount), sources)
        }));
        Assert.True(pdf.NumberOfPages > 2);
        var text = string.Join(" ", pdf.GetPages().Select(page => page.Text));
        Assert.Contains("Biological source 48", text);
        Assert.Contains("ENDOFSOURCE", string.Concat(text.Where(character => !char.IsWhiteSpace(character))));
        Assert.Contains("$900.00", text);
        foreach (var page in pdf.GetPages())
        {
            if (page.Text.Contains("biological source", StringComparison.OrdinalIgnoreCase))
            {
                Assert.Contains("Sample scope ·", page.Text);
                Assert.Contains("Samples", page.Text);
            }
            Assert.All(page.Letters, letter =>
            {
                Assert.InRange(letter.BoundingBox.Left, 47, 565);
                Assert.InRange(letter.BoundingBox.Right, 47, 565);
                Assert.InRange(letter.BoundingBox.Bottom, 30, 758);
                Assert.InRange(letter.BoundingBox.Top, 30, 758);
            });
        }
    }

    [Fact]
    public void UnsupportedCharactersFailClearlyInsteadOfChangingTheCustomerName()
    {
        var exception = Assert.Throws<InvalidOperationException>(() => QuotePdfRenderer.Render(Example() with { OrganizationName = "研究所" }));
        Assert.Contains("characters that the document font cannot display", exception.Message);
        Assert.DoesNotContain("研究所", exception.Message);
    }

    private static QuotePdfDocument Example() => new(
        "HS5Y7DB7", "Test 1-2-3", "Johns Hopkins University", "General", 1, "Issued", "Initial",
        new DateTime(2026, 9, 4, 14, 22, 25, DateTimeKind.Utc),
        new DateTime(2026, 10, 4, 14, 22, 25, DateTimeKind.Utc), null,
        [new("PSeq Lab Service", 9, 100)], 900, 0, 900, "USD", false,
        null, null, [], null);
}
