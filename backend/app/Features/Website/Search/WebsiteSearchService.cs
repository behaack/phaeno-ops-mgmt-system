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
    {
        if (string.IsNullOrWhiteSpace(options.Value.SearchIndexLocation))
        {
            throw new InvalidOperationException(
                "WebSearchSettings:SearchIndexLocation is required.");
        }

        var indexPath = Path.IsPathRooted(options.Value.SearchIndexLocation)
            ? options.Value.SearchIndexLocation
            : Path.Combine(
                hostEnvironment.ContentRootPath,
                options.Value.SearchIndexLocation);
        System.IO.Directory.CreateDirectory(indexPath);
        directory = FSDirectory.Open(indexPath);
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

    public IReadOnlyList<IndexedPage> Search(string queryText)
    {
        const int hitCount = 30;
        if (string.IsNullOrWhiteSpace(queryText))
        {
            return [];
        }

        var stemmedTerms = Regex.Matches(queryText, "\\b[\\w']+\\b")
            .Cast<Match>()
            .Select(match => NormalizeAndStem(match.Value))
            .Where(term => !string.IsNullOrWhiteSpace(term))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (stemmedTerms.Count == 0)
        {
            return [];
        }

        var query = new BooleanQuery();
        foreach (var term in stemmedTerms)
        {
            query.Add(new TermQuery(new Term("stemmedText", term)), Occur.MUST);
        }

        try
        {
            using var reader = DirectoryReader.Open(directory);
            var searcher = new IndexSearcher(reader);
            var hits = searcher.Search(query, hitCount);

            return hits.ScoreDocs
                .Select(hit => MapResult(searcher.Doc(hit.Doc), hit.Score, stemmedTerms))
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
        IReadOnlyList<string> stemmedTerms)
    {
        var fullText = document.Get("text") ?? string.Empty;
        var pageTitle = document.Get("pageTitle") ?? string.Empty;
        var pageDisplayTitle = document.Get("pageDisplayTitle") ?? pageTitle;
        var anchorTitle = document.Get("anchorTitle") ?? string.Empty;
        var description = document.Get("description") ?? string.Empty;
        var visibleText = JoinVisibleSearchText(
            fullText,
            description,
            anchorTitle,
            pageDisplayTitle,
            pageTitle);

        var snippet = ExtractSnippet(fullText, stemmedTerms);
        if (string.IsNullOrWhiteSpace(snippet))
        {
            snippet = ExtractSnippet(description, stemmedTerms);
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
            PageTitle = pageTitle,
            PageDisplayTitle = pageDisplayTitle,
            Anchor = document.Get("anchor") ?? string.Empty,
            AnchorTitle = anchorTitle,
            Text = fullText,
            Description = description,
            DocumentType = document.Get("documentType") ?? string.Empty,
            Snippet = snippet,
            Score = score,
            Count = CountStemmedMatches(visibleText, stemmedTerms),
            IndexedAt = indexedAtTicks > 0
                ? new DateTime(indexedAtTicks, DateTimeKind.Utc)
                : DateTime.UtcNow
        };
    }

    private static Document PrepareDocument(IndexedPage page)
    {
        var document = new Document();
        var searchableText = string.Join(" ", new[]
        {
            page.PageTitle,
            page.PageDisplayTitle,
            page.AnchorTitle,
            page.Description,
            page.SearchKeywords,
            page.Text
        }.Where(value => !string.IsNullOrWhiteSpace(value)));
        var stemmedText = string.Join(
            " ",
            Regex.Matches(searchableText, "\\b[\\w']+\\b")
                .Cast<Match>()
                .Select(match => NormalizeAndStem(match.Value))
                .Where(term => !string.IsNullOrWhiteSpace(term))
                .Distinct(StringComparer.OrdinalIgnoreCase));

        document.Add(new StringField("id", page.Id, Field.Store.YES));
        document.Add(new StringField("url", page.Url, Field.Store.YES));
        document.Add(new TextField("pageTitle", page.PageTitle, Field.Store.YES));
        document.Add(new TextField(
            "pageDisplayTitle",
            string.IsNullOrWhiteSpace(page.PageDisplayTitle)
                ? page.PageTitle
                : page.PageDisplayTitle,
            Field.Store.YES));
        document.Add(new TextField("text", page.Text, Field.Store.YES));
        document.Add(new TextField("anchor", page.Anchor, Field.Store.YES));
        document.Add(new TextField("anchorTitle", page.AnchorTitle, Field.Store.YES));
        document.Add(new TextField("stemmedText", stemmedText, Field.Store.NO));
        document.Add(new StoredField("description", page.Description));
        document.Add(new StoredField("documentType", page.DocumentType));
        document.Add(new StoredField("searchKeywords", page.SearchKeywords));
        document.Add(new StoredField("indexedAt", page.IndexedAt.Ticks.ToString()));
        return document;
    }

    private static int CountStemmedMatches(
        string text,
        IReadOnlyList<string> stemmedTerms) =>
        Regex.Matches(text, "\\b[\\w']+\\b")
            .Cast<Match>()
            .Select(match => NormalizeAndStem(match.Value))
            .Count(normalized => stemmedTerms.Contains(
                normalized,
                StringComparer.OrdinalIgnoreCase));

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
        var matches = Regex.Matches(text, "\\b[\\w']+\\b")
            .Cast<Match>()
            .Where(match => querySet.Contains(
                NormalizeAndStem(match.Value).ToLowerInvariant()))
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

    private static string NormalizeAndStem(string word)
    {
        word = RemoveAccents(word.ToLowerInvariant());
        word = Regex.Replace(word, "'s\\b", string.Empty);
        word = Regex.Replace(word, "[^\\w\\s]", string.Empty);
        word = word.Replace("-", " ");
        if (Regex.IsMatch(word, @"\d{3,}")
            || !Regex.IsMatch(word, @"[a-zA-Z]"))
        {
            return string.Empty;
        }

        var stemmer = new EnglishStemmer();
        stemmer.SetCurrent(word);
        stemmer.Stem();
        return stemmer.Current;
    }
}
