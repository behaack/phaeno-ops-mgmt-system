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
    public void OversizedFinalServiceStartsUnderItsHeaderAndFinishesWithTotals()
    {
        var description = string.Join(" ", Enumerable.Repeat("Detailed sequencing and isoform interpretation for research samples", 80)) + " END OF SERVICE";
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(Example() with
        {
            Lines = [new(description, 10, 950)], Subtotal = 9500, Total = 9500,
            DeliveryTargetBusinessDays = 14, PaymentTermsDays = 30,
            SampleScope = new(10, [new("Research source", 10)], 10)
        }));
        Assert.Contains("Detailed sequencing", pdf.GetPage(1).Text);
        var final = pdf.GetPage(pdf.NumberOfPages);
        Assert.Contains("ENDOFSERVICE", string.Concat(final.Text.Where(character => !char.IsWhiteSpace(character))));
        Assert.Contains("$9,500.00", final.Text);
        Assert.Contains("Payment terms: Net 30 days.", final.Text);
        foreach (var page in pdf.GetPages()) AssertPageBounds(page);
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

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void TwoPhaseQuotePairsFrozenScopeAndConciseCatalogPricesWithTotalsOnOnePage(bool additionalRuns)
    {
        var document = PhasedExample(additionalRuns);
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(document));
        Assert.Equal(1, pdf.NumberOfPages);
        var page = pdf.GetPage(1);
        Assert.Contains("Service: PSeq RNA Sequencing", page.Text);
        Assert.Contains("PSeq RNA Sequencing", page.Text);
        Assert.Contains("1. Phase 1", page.Text);
        Assert.Contains("2. Phase 2", page.Text);
        Assert.Contains("Phase price:", page.Text);
        Assert.Contains("14 business days", page.Text);
        Assert.Contains("21 business days", page.Text);
        Assert.Contains("Heart tissue", page.Text);
        Assert.Contains("Brain tissue", page.Text);
        Assert.Contains("every required sample for that phase", page.Text);
        Assert.DoesNotContain("Standard sample service", page.Text);
        Assert.DoesNotContain("Phase scope and delivery targets", page.Text);
        Assert.DoesNotContain("every required tube", page.Text);
        Assert.Contains(additionalRuns ? "$10,000.00" : "$9,500.00", page.Text);
        Assert.Contains(additionalRuns ? "Pre-tax total" : "Total", page.Text);
        if (additionalRuns)
        {
            Assert.Contains("Additional sequencing runs", page.Text);
            Assert.Contains("$500.00", page.Text);
            Assert.Contains("$5,250.00", page.Text);
            Assert.Contains("Applicable tax will be calculated at invoicing.", page.Text);
            Assert.Contains("1 included + 1 additional per sample", page.Text);
            Assert.Contains("5 samples × 1 additional run/sample = 5", page.Text);
        }
        else Assert.DoesNotContain("Additional sequencing runs", page.Text);
        AssertPageBounds(page);
    }

    [Fact]
    public void FullBillingAddressAndThirtyAdditionalRunsKeepBothPhasesAndTotalsOnOnePage()
    {
        var source = PhasedExample(true);
        var first = source.Phases![0];
        var second = source.Phases[1];
        var catalog = source.Lines[0].CatalogItemId;
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(source with
        {
            BillingAddress = ["1 Research Way", "Research administration", "Baltimore, MD", "21201", "US"],
            TaxDetermined = true, Subtotal = 38750, Tax = 0, Total = 38750,
            Lines = [new("Saved sample service", 15, 1250, catalog, first.Id, "StandardSample"),
                new("Saved additional runs", 30, 250, catalog, first.Id, "AdditionalRun"),
                new("Saved sample service", 10, 1250, catalog, second.Id, "StandardSample")],
            Phases = [first with { SampleCount = 15, AcceptedSubtotal = 26250, Scope = new([new("Source A",10), new("Source B",5)],3,45) },
                second with { SampleCount = 10, AcceptedSubtotal = 12500, Scope = new([new("Source B",10)],1,10) }]
        }));
        Assert.Equal(1, pdf.NumberOfPages);
        var page = pdf.GetPage(1);
        Assert.Contains("1 included + 2 additional per sample", page.Text);
        Assert.Contains("15 samples × 2 additional runs/sample = 30", page.Text);
        Assert.Contains("$26,250.00", page.Text);
        Assert.Contains("2. Phase 2", page.Text);
        Assert.Contains("$38,750.00", page.Text);
        Assert.Contains("Research administration", page.Text);
        AssertPageBounds(page);
    }

    [Fact]
    public void InconsistentRunAllocationRetainsChargesWithoutInventingTheRunFormula()
    {
        var source = PhasedExample(true);
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(source with
        {
            Phases = [source.Phases![0], source.Phases[1] with { Scope = new([new("Brain tissue",5)],3,10) }]
        }));
        var text = string.Join(" ", pdf.GetPages().Select(page => page.Text));
        Assert.Contains("Additional sequencing runs", text);
        Assert.Contains("$500.00", text);
        Assert.DoesNotContain("additional run/sample =", text);
        Assert.DoesNotContain("1 included +", text);
    }

    [Fact]
    public void RepeatedNamesAndReorderedLinesUseExactFrozenPhaseIdentity()
    {
        var source = PhasedExample(true);
        var first = source.Phases![0] with { Name = "Cohort" };
        var second = source.Phases[1] with { Name = "Cohort" };
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(source with
        {
            Phases = [second, first], Lines = source.Lines.Reverse().ToArray()
        }));
        var page = pdf.GetPage(1);
        var heart = page.GetWords().Single(word => word.Text == "Heart");
        var brain = page.GetWords().Single(word => word.Text == "Brain");
        Assert.True(heart.BoundingBox.Top > brain.BoundingBox.Top);
        var phaseAmounts = page.GetWords().Where(word => word.Text == "$5,250.00").ToArray();
        Assert.Single(phaseAmounts);
        Assert.True(phaseAmounts[0].BoundingBox.Top < heart.BoundingBox.Bottom);
        AssertPageBounds(page);
    }

    [Fact]
    public void ManyPhasesRepeatBrandingAndKeepFinalPhaseWithItsTotals()
    {
        var source = PhasedExample();
        var phases = Enumerable.Range(1, 20).Select(index => source.Phases![0] with
        {
            Id = Guid.NewGuid(), Position = index, Name = $"Phase {index}"
        }).ToArray();
        var lines = phases.Select(phase => source.Lines[0] with { PhaseId = phase.Id }).Reverse().ToArray();
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(source with
        {
            Phases = phases, Lines = lines, Subtotal = 95000, Total = 95000,
            SampleScope = new(100, [new("Frozen phase sources", 100)], 100)
        }));
        Assert.True(pdf.NumberOfPages > 1);
        var final = pdf.GetPage(pdf.NumberOfPages);
        Assert.Contains("20. Phase 20", final.Text);
        Assert.Contains("$95,000.00", final.Text);
        foreach (var page in pdf.GetPages())
        {
            Assert.Equal(1, page.NumberOfImages);
            Assert.Contains($"Page {page.Number} of {pdf.NumberOfPages}", page.Text);
            AssertPageBounds(page);
        }
    }

    [Fact]
    public void OversizedPhaseSourceContinuesWithItsIdentityAndSourceHeadings()
    {
        var source = PhasedExample();
        var longSource = string.Join(" ", Enumerable.Repeat("Long biological source description", 180)) + " END OF PHASE SOURCE";
        var first = source.Phases![0] with { Scope = new([new(longSource, 5)], 1, 5) };
        using var pdf = PdfDocument.Open(QuotePdfRenderer.Render(source with { Phases = [first, source.Phases[1]] }));
        var text = string.Join(" ", pdf.GetPages().Select(page => page.Text));
        Assert.Contains("ENDOFPHASESOURCE", string.Concat(text.Where(character => !char.IsWhiteSpace(character))));
        Assert.Contains("Phase 1 (continued)", text);
        foreach (var page in pdf.GetPages())
        {
            if (page.Text.Contains("Phase 1 (continued)", StringComparison.Ordinal))
                Assert.Contains("Biological source", page.Text);
            AssertPageBounds(page);
        }
    }

    [Fact]
    public void UnallocatedPhaseLineFailsInsteadOfGuessingAnAssociation()
    {
        var source = PhasedExample();
        var exception = Assert.Throws<InvalidOperationException>(() => QuotePdfRenderer.Render(source with
        {
            Lines = [source.Lines[0] with { PhaseId = Guid.NewGuid() }, source.Lines[1]]
        }));
        Assert.Contains("phase identities", exception.Message);
    }

    private static void AssertPageBounds(UglyToad.PdfPig.Content.Page page) => Assert.All(page.Letters, letter =>
    {
        Assert.InRange(letter.BoundingBox.Left, 47, 565);
        Assert.InRange(letter.BoundingBox.Right, 47, 565);
        Assert.InRange(letter.BoundingBox.Bottom, 30, 758);
        Assert.InRange(letter.BoundingBox.Top, 30, 758);
    });

    private static QuotePdfDocument PhasedExample(bool additional = false)
    {
        var catalog = Guid.Parse("10000000-0000-4000-8000-000000000001");
        var first = Guid.Parse("10000000-0000-4000-8000-000000000011");
        var second = Guid.Parse("10000000-0000-4000-8000-000000000012");
        return Example() with
        {
            OrganizationName = "Example research organization", DepartmentName = "Oncology research",
            BillingContactName = "Example billing contact", BillingContactEmail = "billing@example.invalid",
            BillingAddress = ["1 Research Way", "Baltimore, MD 21201", "US"], PaymentTermsDays = 30,
            TaxDetermined = !additional, Subtotal = additional ? 10000 : 9500, Total = additional ? 10000 : 9500,
            CatalogItemNames = new Dictionary<Guid, string> { [catalog] = "PSeq RNA Sequencing" },
            SampleScope = new(10, [new("Heart tissue", 5), new("Brain tissue", 5)], additional ? 15 : 10),
            Lines = new List<QuotePdfLine> {
                new("Standard sample service with verbose recorded scope", 5, 950, catalog, first, "StandardSample"),
                new("Standard sample service with verbose recorded scope", 5, 950, catalog, second, "StandardSample")
            }.Concat(additional ? [new QuotePdfLine("Extra sequencing", 5, 100, catalog, second, "AdditionalRun")] : []).ToArray(),
            Phases = [new("Phase 1", 5, 14, 4750, new([new("Heart tissue", 5)], 1, 5), first, 1),
                new("Phase 2", 5, 21, additional ? 5250 : 4750, new([new("Brain tissue", 5)], additional ? 2 : 1, additional ? 10 : 5), second, 2)]
        };
    }

    private static QuotePdfDocument Example() => new(
        "HS5Y7DB7", "Test 1-2-3", "Johns Hopkins University", "General", 1, "Issued", "Initial",
        new DateTime(2026, 9, 4, 14, 22, 25, DateTimeKind.Utc),
        new DateTime(2026, 10, 4, 14, 22, 25, DateTimeKind.Utc), null,
        [new("PSeq Lab Service", 9, 100)], 900, 0, 900, "USD", false,
        null, null, [], null);
}
