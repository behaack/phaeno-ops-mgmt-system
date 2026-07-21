using System.Text;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace PhaenoPortal.App.Features.Website.Crawler.Documents;

public sealed class PdfWebsiteDocumentTextExtractor : IWebsiteDocumentTextExtractor
{
    public Task<WebsiteDocumentText> ExtractAsync(
        Stream document,
        int maxCharacters,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);
        if (!document.CanRead)
        {
            throw new ArgumentException("The document stream must be readable.", nameof(document));
        }
        if (maxCharacters <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(maxCharacters));
        }

        return Task.Run(
            () => Extract(document, maxCharacters, cancellationToken),
            cancellationToken);
    }

    private static WebsiteDocumentText Extract(
        Stream source,
        int maxCharacters,
        CancellationToken cancellationToken)
    {
        try
        {
            using var document = PdfDocument.Open(source);
            var text = new StringBuilder();

            foreach (var page in document.GetPages())
            {
                cancellationToken.ThrowIfCancellationRequested();
                var pageText = NormalizePageText(ContentOrderTextExtractor.GetText(page));
                if (string.IsNullOrWhiteSpace(pageText))
                {
                    continue;
                }

                var separatorLength = text.Length == 0 ? 0 : 2;
                if (pageText.Length > maxCharacters - text.Length - separatorLength)
                {
                    throw new WebsiteDocumentTextExtractionException(
                        "extracted_text_too_large",
                        $"Extracted document text exceeds {maxCharacters} characters.");
                }

                if (text.Length > 0)
                {
                    text.AppendLine();
                    text.AppendLine();
                }
                text.Append(pageText);
            }

            return new WebsiteDocumentText(text.ToString(), document.NumberOfPages);
        }
        catch (WebsiteDocumentTextExtractionException)
        {
            throw;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            throw new WebsiteDocumentTextExtractionException(
                "pdf_extraction_failed",
                "The PDF could not be parsed for Website search.",
                exception);
        }
    }

    private static string NormalizePageText(string text)
    {
        var clean = new StringBuilder(text.Length);
        foreach (var character in text)
        {
            if (character == '\r')
            {
                continue;
            }

            clean.Append(
                character == '\n' || character == '\t' || !char.IsControl(character)
                    ? character
                    : ' ');
        }

        var normalizedLines = clean
            .ToString()
            .Split('\n')
            .Select(line => Regex.Replace(line, @"[\t ]+", " ").Trim())
            .ToList();
        var result = new StringBuilder();
        var previousLineWasBlank = true;
        foreach (var line in normalizedLines)
        {
            if (line.Length == 0)
            {
                if (!previousLineWasBlank && result.Length > 0)
                {
                    result.AppendLine();
                    result.AppendLine();
                }
                previousLineWasBlank = true;
                continue;
            }

            if (result.Length > 0 && !previousLineWasBlank)
            {
                result.Append(' ');
            }
            result.Append(line);
            previousLineWasBlank = false;
        }

        return result.ToString().Trim();
    }
}
