using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Lucene.Net.Analysis;
using Lucene.Net.Documents;
using Lucene.Net.Index;
using Lucene.Net.Search;
using Lucene.Net.Store;
using Lucene.Net.Util;
using Lucene.Net.Tartarus.Snowball.Ext;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Website.Search.Support;
using Directory = Lucene.Net.Store.Directory;

namespace PhaenoPortal.App.Features.Website.Search;

public sealed class WebsiteSearchService : IWebsiteSearchService, IDisposable
{
    private static readonly LuceneVersion AppLuceneVersion = LuceneVersion.LUCENE_48;
    private readonly Directory directory;
    private readonly Analyzer analyzer = new StemmingAnalyzer();

    public WebsiteSearchService(
        IWebHostEnvironment hostEnvironment,
        IOptions<WebsiteSearchOptions> options)
        : this(ResolveIndexPath(
            hostEnvironment,
            options.Value.SearchIndexLocation))
    {
    }

    internal WebsiteSearchService(string indexPath)
    {
        System.IO.Directory.CreateDirectory(indexPath);
        directory = FSDirectory.Open(indexPath);
    }

    internal static string ResolveIndexPath(
        IWebHostEnvironment hostEnvironment,
        string configuredPath,
        string configurationName = "WebSearchSettings:SearchIndexLocation")
    {
        if (string.IsNullOrWhiteSpace(configuredPath))
        {
            throw new InvalidOperationException(
                $"{configurationName} is required.");
        }

        return Path.GetFullPath(
            Path.IsPathRooted(configuredPath)
                ? configuredPath
                : Path.Combine(hostEnvironment.ContentRootPath, configuredPath));
    }

    public void RebuildIndex(IEnumerable<IndexedPage> pages)
    {
        using var writer = new IndexWriter(
            directory,
            new IndexWriterConfig(AppLuceneVersion, analyzer)
            {
                OpenMode = OpenMode.CREATE
            });

        foreach (var page in pages.Where(page =>
            !string.Equals(page.DocumentType, "List", StringComparison.OrdinalIgnoreCase)))
        {
            writer.AddDocument(PrepareDocument(page));
        }

        writer.Commit();
    }

    public IReadOnlyList<IndexedPage> Search(
        string queryText,
        string locale = WebsiteLocale.Default)
    {
        const int hitCount = 30;
        if (string.IsNullOrWhiteSpace(queryText))
        {
            return [];
        }

        var normalizedLocale = WebsiteLocale.Normalize(locale);
        var stemmedTerms = Regex.Matches(queryText, "[\\p{L}\\p{N}_']+")
            .Cast<Match>()
            .Select(match => NormalizeAndStem(match.Value, normalizedLocale))
            .Where(term => !string.IsNullOrWhiteSpace(term))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (stemmedTerms.Count == 0)
        {
            return [];
        }

        var query = new BooleanQuery();
        query.Add(
            new TermQuery(new Term("locale", normalizedLocale)),
            Occur.MUST);
        foreach (var term in stemmedTerms)
        {
            var termQuery = new BooleanQuery
            {
                MinimumNumberShouldMatch = 1
            };
            termQuery.Add(
                new TermQuery(new Term("titleStemmedText", term)) { Boost = 6F },
                Occur.SHOULD);
            termQuery.Add(
                new TermQuery(new Term("primaryStemmedText", term)) { Boost = 4F },
                Occur.SHOULD);
            termQuery.Add(
                new TermQuery(new Term("sourceStemmedText", term)) { Boost = 1F },
                Occur.SHOULD);
            termQuery.Add(
                new TermQuery(new Term("keywordStemmedText", term)) { Boost = 0.25F },
                Occur.SHOULD);
            query.Add(termQuery, Occur.MUST);
        }

        try
        {
            using var reader = DirectoryReader.Open(directory);
            var searcher = new IndexSearcher(reader);
            var hits = searcher.Search(query, hitCount);

            return hits.ScoreDocs
                .Select(hit => MapResult(
                    searcher.Doc(hit.Doc),
                    hit.Score,
                    stemmedTerms,
                    normalizedLocale))
                .Where(result => result.Count > 0)
                .GroupBy(result =>
                    string.IsNullOrWhiteSpace(result.PageDisplayTitle)
                        ? result.PageTitle
                        : result.PageDisplayTitle)
                .OrderByDescending(group => group.Sum(result => result.Count ?? 0))
                .ThenByDescending(group => group.Max(result => result.Score ?? 0))
                .ThenBy(group => group.Key)
                .SelectMany(group => group
                    .OrderByDescending(result => result.Count ?? 0)
                    .ThenByDescending(result => result.Score)
                    .ThenBy(result => result.AnchorTitle))
                .ToList();
        }
        catch (IndexNotFoundException)
        {
            return [];
        }
    }

    public void Dispose()
    {
        analyzer.Dispose();
        directory.Dispose();
    }

    public static string RemoveAccents(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return input;
        }

        var normalized = input.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character)
                != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(character);
            }
        }

        return builder.ToString().Normalize(NormalizationForm.FormC);
    }

    private static IndexedPage MapResult(
        Document document,
        float score,
        IReadOnlyList<string> stemmedTerms,
        string locale)
    {
        var fullText = document.Get("text") ?? string.Empty;
        var sourceText = document.Get("sourceText") ?? string.Empty;
        var pageTitle = document.Get("pageTitle") ?? string.Empty;
        var pageDisplayTitle = document.Get("pageDisplayTitle") ?? pageTitle;
        var anchorTitle = document.Get("anchorTitle") ?? string.Empty;
        var description = document.Get("description") ?? string.Empty;
        var destinationText = JoinVisibleSearchText(fullText, sourceText);
        var hasVisiblePageMatch = ContainsAllStemmedTerms(
            fullText,
            stemmedTerms,
            locale);
        var hasDestinationMatch = ContainsAllStemmedTerms(
            destinationText,
            stemmedTerms,
            locale);

        var snippet = ExtractSnippet(fullText, stemmedTerms, locale);
        if (string.IsNullOrWhiteSpace(snippet))
        {
            snippet = ExtractSnippet(sourceText, stemmedTerms, locale);
        }
        if (string.IsNullOrWhiteSpace(snippet))
        {
            snippet = ExtractSnippet(description, stemmedTerms, locale);
        }
        if (string.IsNullOrWhiteSpace(snippet))
        {
            snippet = TruncateSnippet(description, 200);
        }

        _ = long.TryParse(document.Get("indexedAt"), out var indexedAtTicks);
        return new IndexedPage
        {
            Id = document.Get("id") ?? string.Empty,
            Url = document.Get("url") ?? string.Empty,
            Locale = document.Get("locale") ?? WebsiteLocale.Default,
            PageTitle = pageTitle,
            PageDisplayTitle = pageDisplayTitle,
            Anchor = document.Get("anchor") ?? string.Empty,
            AnchorTitle = anchorTitle,
            Text = fullText,
            SourceText = sourceText,
            Description = description,
            DocumentType = document.Get("documentType") ?? string.Empty,
            Snippet = snippet,
            Score = score,
            Count = hasDestinationMatch
                ? CountStemmedMatches(destinationText, stemmedTerms, locale)
                : 0,
            MatchedInDocumentSource = hasDestinationMatch
                && !hasVisiblePageMatch,
            IndexedAt = indexedAtTicks > 0
                ? new DateTime(indexedAtTicks, DateTimeKind.Utc)
                : DateTime.UtcNow
        };
    }

    private static Document PrepareDocument(IndexedPage page)
    {
        var document = new Document();
        var locale = WebsiteLocale.Normalize(page.Locale);
        var titleText = string.Join(" ", new[]
        {
            page.PageTitle,
            page.PageDisplayTitle,
            page.AnchorTitle,
            page.Description
        }.Where(value => !string.IsNullOrWhiteSpace(value)));
        var primaryText = JoinVisibleSearchText(page.Text, page.Description);

        document.Add(new StringField("id", page.Id, Field.Store.YES));
        document.Add(new StringField("url", page.Url, Field.Store.YES));
        document.Add(new StringField("locale", locale, Field.Store.YES));
        document.Add(new TextField("pageTitle", page.PageTitle, Field.Store.YES));
        document.Add(new TextField(
            "pageDisplayTitle",
            string.IsNullOrWhiteSpace(page.PageDisplayTitle)
                ? page.PageTitle
                : page.PageDisplayTitle,
            Field.Store.YES));
        document.Add(new TextField("text", page.Text, Field.Store.YES));
        document.Add(new StoredField("sourceText", page.SourceText));
        document.Add(new TextField("anchor", page.Anchor, Field.Store.YES));
        document.Add(new TextField("anchorTitle", page.AnchorTitle, Field.Store.YES));
        document.Add(new TextField(
            "titleStemmedText",
            StemSearchText(titleText, locale),
            Field.Store.NO));
        document.Add(new TextField(
            "primaryStemmedText",
            StemSearchText(primaryText, locale),
            Field.Store.NO));
        document.Add(new TextField(
            "sourceStemmedText",
            StemSearchText(page.SourceText, locale),
            Field.Store.NO));
        document.Add(new TextField(
            "keywordStemmedText",
            StemSearchText(page.SearchKeywords, locale),
            Field.Store.NO));
        document.Add(new StoredField("description", page.Description));
        document.Add(new StoredField("documentType", page.DocumentType));
        document.Add(new StoredField("searchKeywords", page.SearchKeywords));
        document.Add(new StoredField("indexedAt", page.IndexedAt.Ticks.ToString()));
        return document;
    }

    private static string StemSearchText(string text, string locale) =>
        string.Join(
            " ",
            Regex.Matches(text, "[\\p{L}\\p{N}_']+")
                .Cast<Match>()
                .Select(match => NormalizeAndStem(match.Value, locale))
                .Where(term => !string.IsNullOrWhiteSpace(term))
                .Distinct(StringComparer.OrdinalIgnoreCase));

    private static int CountStemmedMatches(
        string text,
        IReadOnlyList<string> stemmedTerms,
        string locale) =>
        Regex.Matches(text, "[\\p{L}\\p{N}_']+")
            .Cast<Match>()
            .Select(match => NormalizeAndStem(match.Value, locale))
            .Count(normalized => stemmedTerms.Contains(
                normalized,
                StringComparer.OrdinalIgnoreCase));

    private static bool ContainsAllStemmedTerms(
        string text,
        IReadOnlyList<string> stemmedTerms,
        string locale)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return false;
        }

        var textTerms = Regex.Matches(text, "[\\p{L}\\p{N}_']+")
            .Cast<Match>()
            .Select(match => NormalizeAndStem(match.Value, locale))
            .Where(term => !string.IsNullOrWhiteSpace(term))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return stemmedTerms.All(textTerms.Contains);
    }

    private static string JoinVisibleSearchText(params string[] values)
    {
        var fragments = new List<string>();
        foreach (var value in values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim()))
        {
            if (fragments.Any(fragment =>
                fragment.Contains(value, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            fragments.RemoveAll(fragment =>
                value.Contains(fragment, StringComparison.OrdinalIgnoreCase));
            fragments.Add(value);
        }

        return string.Join(" ", fragments);
    }

    private static string ExtractSnippet(
        string text,
        IReadOnlyList<string> stemmedTerms,
        string locale,
        int maxLength = 200,
        int windowSize = 100)
    {
        if (string.IsNullOrWhiteSpace(text) || stemmedTerms.Count == 0)
        {
            return string.Empty;
        }

        var querySet = stemmedTerms
            .Select(term => term.ToLowerInvariant())
            .ToHashSet();
        var matches = Regex.Matches(text, "[\\p{L}\\p{N}_']+")
            .Cast<Match>()
            .Where(match => querySet.Contains(
                NormalizeAndStem(match.Value, locale).ToLowerInvariant()))
            .Select(match => (Start: match.Index, End: match.Index + match.Length))
            .ToList();
        if (matches.Count == 0)
        {
            return string.Empty;
        }

        var firstMatch = matches[0];
        var snippetStart = Math.Max(0, firstMatch.Start - windowSize);
        var previousSpace = text.LastIndexOf(' ', snippetStart);
        snippetStart = previousSpace < 0 ? 0 : previousSpace + 1;
        var snippetEnd = Math.Min(text.Length, firstMatch.End + windowSize);
        var nextSpace = text.IndexOf(' ', snippetEnd);
        snippetEnd = nextSpace < 0 ? text.Length : nextSpace;
        var snippet = text[snippetStart..snippetEnd];

        var highlighted = new StringBuilder(snippet);
        foreach (var match in matches
            .Where(match => match.Start >= snippetStart && match.End <= snippetEnd)
            .OrderByDescending(match => match.Start))
        {
            var relativeStart = match.Start - snippetStart;
            highlighted.Insert(relativeStart + match.End - match.Start, "}}");
            highlighted.Insert(relativeStart, "{{");
        }

        return TruncateSnippet(highlighted.ToString(), maxLength);
    }

    private static string TruncateSnippet(string snippet, int maxLength)
    {
        if (snippet.Length <= maxLength)
        {
            return snippet;
        }

        var lastSpace = snippet.LastIndexOf(' ', maxLength);
        return $"{snippet[..(lastSpace > 0 ? lastSpace : maxLength)]}...";
    }

    private static string NormalizeAndStem(string word, string locale)
    {
        var normalizedLocale = WebsiteLocale.Normalize(locale);
        word = RemoveAccents(word.ToLowerInvariant())
            .Replace("ـ", string.Empty, StringComparison.Ordinal);
        if (normalizedLocale == WebsiteLocale.Arabic)
        {
            word = word
                .Replace('أ', 'ا')
                .Replace('إ', 'ا')
                .Replace('آ', 'ا')
                .Replace('ٱ', 'ا')
                .Replace('ى', 'ي');
        }
        else
        {
            word = Regex.Replace(word, "'s\\b", string.Empty);
        }
        word = Regex.Replace(word, "[^\\p{L}\\p{N}_\\s]", string.Empty);
        word = word.Replace("-", " ");
        if (Regex.IsMatch(word, @"\d{3,}")
            || (normalizedLocale == WebsiteLocale.Arabic
                ? !Regex.IsMatch(word, "[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF]")
                : !Regex.IsMatch(word, @"[a-zA-Z]")))
        {
            return string.Empty;
        }

        if (normalizedLocale == WebsiteLocale.Arabic)
        {
            return word;
        }

        if (normalizedLocale == WebsiteLocale.French)
        {
            var frenchStemmer = new FrenchStemmer();
            frenchStemmer.SetCurrent(word);
            frenchStemmer.Stem();
            return frenchStemmer.Current;
        }

        var englishStemmer = new EnglishStemmer();
        englishStemmer.SetCurrent(word);
        englishStemmer.Stem();
        return englishStemmer.Current;
    }
}
