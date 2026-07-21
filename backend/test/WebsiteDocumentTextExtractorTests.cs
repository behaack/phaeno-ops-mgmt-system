namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.Website.Crawler.Documents;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

public sealed class WebsiteDocumentTextExtractorTests
{
    [Fact]
    public async Task PdfExtractorReturnsTextInPageOrder()
    {
        await using var pdf = CreatePdf(
            "First publication page",
            "Second publication page");
        var extractor = new PdfWebsiteDocumentTextExtractor();

        var result = await extractor.ExtractAsync(pdf, 10_000);

        Assert.Equal(2, result.PageCount);
        Assert.True(
            result.Text.IndexOf("First publication page", StringComparison.Ordinal)
            < result.Text.IndexOf("Second publication page", StringComparison.Ordinal));
    }

    [Fact]
    public async Task PdfExtractorRejectsExcessiveExtractedText()
    {
        await using var pdf = CreatePdf("This text exceeds the configured limit.");
        var extractor = new PdfWebsiteDocumentTextExtractor();

        var exception = await Assert.ThrowsAsync<WebsiteDocumentTextExtractionException>(
            () => extractor.ExtractAsync(pdf, 10));

        Assert.Equal("extracted_text_too_large", exception.Reason);
    }

    [Fact]
    public async Task PdfExtractorRejectsMalformedContent()
    {
        await using var malformed = new MemoryStream("not a PDF"u8.ToArray());
        var extractor = new PdfWebsiteDocumentTextExtractor();

        var exception = await Assert.ThrowsAsync<WebsiteDocumentTextExtractionException>(
            () => extractor.ExtractAsync(malformed, 1_000));

        Assert.Equal("pdf_extraction_failed", exception.Reason);
    }

    private static MemoryStream CreatePdf(params string[] pages)
    {
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        foreach (var text in pages)
        {
            var page = builder.AddPage(PageSize.Letter);
            page.AddText(text, 12, new PdfPoint(50, 700), font);
        }

        return new MemoryStream(builder.Build(), writable: false);
    }
}
