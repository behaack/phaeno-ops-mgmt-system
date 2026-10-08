namespace PhaenoPortal.App.Features.Documentation.Search;

using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Lucene.Net.Analysis;
using Lucene.Net.Analysis.En;
using Lucene.Net.Analysis.TokenAttributes;
using Lucene.Net.Documents;
using Lucene.Net.Index;
using Lucene.Net.Search;
using Lucene.Net.Store;
using Lucene.Net.Util;
using Microsoft.Extensions.Options;

public sealed class DocumentationSearchService : IDocumentationSearchService, IDisposable
{
    private const string IndexSchema = "documentation-1-english-3";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly Regex Words = new(@"[\p{L}\p{N}]+", RegexOptions.Compiled);
    private static readonly Meter Meter = new("PhaenoPortal.DocumentationSearch");
    private static readonly Histogram<double> QueryDuration = Meter.CreateHistogram<double>("documentation.search.duration", "ms");
    private static readonly Counter<long> ZeroResults = Meter.CreateCounter<long>("documentation.search.zero_results");
    private static readonly Histogram<double> BuildDuration = Meter.CreateHistogram<double>("documentation.index.build_duration", "ms");
    private static readonly Counter<long> BuildFailures = Meter.CreateCounter<long>("documentation.index.failures");
    private string root;
    private string manifestPath;
    private string[] websiteRoots;
    private readonly bool enabled;
    private readonly string? contentRoot;
    private readonly ILogger<DocumentationSearchService> logger;
    private readonly Analyzer analyzer = new EnglishAnalyzer(LuceneVersion.LUCENE_48);
    private readonly SemaphoreSlim rebuild = new(1, 1);
    private readonly ReaderWriterLockSlim readers = new();
    private DirectoryReader? reader;
    private FSDirectory? directory;
    private DocumentationCorpus? corpus;
    private DocumentationIndexStatus status = new(false, false, null, null, null, 0, 0, null);
    private DateTimeOffset lastForcedBuild = DateTimeOffset.MinValue;
    public DocumentationIndexStatus Status => Volatile.Read(ref status);

    public DocumentationSearchService(IWebHostEnvironment environment, IOptions<DocumentationSearchOptions> options,
        IConfiguration configuration, ILogger<DocumentationSearchService> logger)
        : this(options.Value.IndexPath,
            options.Value.ManifestPath,
            new[] { configuration["WebSearchSettings:SearchIndexLocation"], configuration["WebsitePreviewSearch:SearchIndexLocation"] }
                .Where(path => !string.IsNullOrWhiteSpace(path))
                .Select(path => path!).ToArray(),
            logger, options.Value.Enabled, environment.ContentRootPath) { }

    internal DocumentationSearchService(string root, string manifestPath, string[] websiteRoots,
        ILogger<DocumentationSearchService> logger, bool enabled = true, string? contentRoot = null)
    {
        this.root = root;
        this.manifestPath = manifestPath;
        this.websiteRoots = websiteRoots;
        this.logger = logger;
        this.enabled = enabled;
        this.contentRoot = contentRoot;
    }

    public async Task RebuildAsync(CancellationToken cancellationToken, bool force = true)
    {
        if (!enabled) { status = Status with { Failure = "documentation_search_disabled" }; return; }
        if (!await rebuild.WaitAsync(0, cancellationToken))
            throw new DocumentationSearchException("documentation_rebuild_busy", "Documentation search is already rebuilding.", 409);
        status = Status with { Rebuilding = true };
        var started = Stopwatch.GetTimestamp();
        var built = false;
        try
        {
            if (force && DateTimeOffset.UtcNow - lastForcedBuild < TimeSpan.FromSeconds(30))
                throw new DocumentationSearchException("documentation_rebuild_busy", "Wait briefly before rebuilding documentation search again.", 409);
            if (force) lastForcedBuild = DateTimeOffset.UtcNow;
            if (string.IsNullOrWhiteSpace(root) || string.IsNullOrWhiteSpace(manifestPath)) throw new IOException("Documentation paths are required.");
            if (contentRoot is not null)
            {
                root = DocumentationIndexPaths.Resolve(contentRoot, root);
                manifestPath = DocumentationIndexPaths.Resolve(contentRoot, manifestPath);
                websiteRoots = websiteRoots.Select(path => DocumentationIndexPaths.Resolve(contentRoot, path)).ToArray();
            }
            DocumentationIndexPaths.Validate(root, websiteRoots);
            var nextCorpus = await ReadCorpusAsync(manifestPath, cancellationToken);
            if (corpus is not null && corpus.CorpusHash != nextCorpus.CorpusHash)
                status = Status with { Ready = false };
            System.IO.Directory.CreateDirectory(root);
            // A separate file lock also excludes a second process sharing this documentation volume.
            await using var lease = new FileStream(Path.Combine(root, ".rebuild.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            if (!force && await TryOpenCurrent(nextCorpus, cancellationToken)) return;
            var generation = $"generation-{Guid.NewGuid():N}";
            var generationPath = Path.Combine(root, generation);
            var builtAt = DateTimeOffset.UtcNow;
            using (var target = FSDirectory.Open(generationPath))
            using (var writer = new IndexWriter(target, new IndexWriterConfig(LuceneVersion.LUCENE_48, analyzer) { OpenMode = OpenMode.CREATE }))
            {
                foreach (var guide in nextCorpus.Guides)
                foreach (var section in guide.Sections)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var document = new Document
                    {
                        new StringField("id", guide.Id, Field.Store.YES),
                        new StringField("audience", guide.Audience, Field.Store.NO),
                        new StringField("locale", guide.Locale ?? "en-US", Field.Store.NO),
                        new StringField("contentType", guide.ContentType, Field.Store.NO),
                        new StringField("anchor", section.Anchor, Field.Store.YES),
                        new TextField("title", guide.Title, Field.Store.NO),
                        new TextField("heading", section.Heading, Field.Store.YES),
                        new TextField("summary", guide.Summary, Field.Store.NO),
                        new TextField("body", section.Text, Field.Store.YES),
                        new TextField("keywords", string.Join(' ', guide.TaskKeywords.Concat(guide.Aliases)
                            .Concat(guide.TopicIds.Select(id => nextCorpus.Taxonomy["topics"][id]["en-US"]))
                            .Concat(guide.WorkflowIds.Select(id => nextCorpus.Taxonomy["workflows"][id]["en-US"]))), Field.Store.NO)
                    };
                    foreach (var topic in guide.TopicIds) document.Add(new StringField("topic", topic, Field.Store.NO));
                    foreach (var workflow in guide.WorkflowIds) document.Add(new StringField("workflow", workflow, Field.Store.NO));
                    writer.AddDocument(document);
                }
                writer.SetCommitData(new Dictionary<string, string> { ["corpus"] = nextCorpus.CorpusHash, ["schema"] = IndexSchema, ["builtAtUtc"] = builtAt.ToString("O") });
                writer.Commit();
            }
            var nextDirectory = FSDirectory.Open(generationPath);
            DirectoryReader nextReader;
            try { nextReader = DirectoryReader.Open(nextDirectory); }
            catch { nextDirectory.Dispose(); throw; }
            var pointer = Path.Combine(root, "current.json");
            var temporaryPointer = Path.Combine(root, "current.tmp");
            try
            {
                await File.WriteAllTextAsync(temporaryPointer, JsonSerializer.Serialize(generation), cancellationToken);
                File.Move(temporaryPointer, pointer, true);
                Publish(nextCorpus, generation, nextDirectory, nextReader, builtAt);
                built = true;
            }
            catch { nextReader.Dispose(); nextDirectory.Dispose(); throw; }
            logger.LogInformation("Documentation index published. Corpus {CorpusHash}; guides {Count}.", nextCorpus.CorpusHash, nextCorpus.Guides.Length);
            Cleanup(generation);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (DocumentationSearchException) { throw; }
        catch (Exception exception)
        {
            BuildFailures.Add(1);
            status = Status with { Failure = "documentation_index_unavailable" };
            logger.LogError("Documentation index rebuild failed ({FailureType}).", exception.GetType().Name);
            throw new DocumentationSearchException("documentation_search_unavailable", "Documentation search is temporarily unavailable.", 503);
        }
        finally
        {
            if (built)
            {
                var elapsed = Stopwatch.GetElapsedTime(started).TotalMilliseconds;
                BuildDuration.Record(elapsed);
                status = Status with { LastBuildDurationMs = elapsed };
            }
            status = Status with { Rebuilding = false };
            rebuild.Release();
        }
    }

    private async Task<bool> TryOpenCurrent(DocumentationCorpus nextCorpus, CancellationToken cancellationToken)
    {
        var pointer = Path.Combine(root, "current.json");
        if (!File.Exists(pointer)) return false;
        FSDirectory? nextDirectory = null;
        DirectoryReader? nextReader = null;
        try
        {
            var generation = JsonSerializer.Deserialize<string>(await File.ReadAllTextAsync(pointer, cancellationToken));
            if (generation is null || !Regex.IsMatch(generation, "^generation-[a-f0-9]{32}$")) return false;
            var candidate = Path.Combine(root, generation);
            if (new DirectoryInfo(candidate).LinkTarget is not null) return false;
            nextDirectory = FSDirectory.Open(candidate);
            nextReader = DirectoryReader.Open(nextDirectory);
            var metadata = nextReader.IndexCommit.UserData;
            if (!metadata.TryGetValue("corpus", out var storedCorpus) || storedCorpus != nextCorpus.CorpusHash || !metadata.TryGetValue("schema", out var storedSchema) || storedSchema != IndexSchema) return false;
            if (!metadata.TryGetValue("builtAtUtc", out var builtAtText) || !DateTimeOffset.TryParse(builtAtText, out var builtAt)) return false;
            Publish(nextCorpus, generation, nextDirectory, nextReader, builtAt);
            nextDirectory = null; nextReader = null;
            return true;
        }
        catch (Exception exception) when (exception is IOException or JsonException) { return false; }
        finally { nextReader?.Dispose(); nextDirectory?.Dispose(); }
    }

    private void Publish(DocumentationCorpus nextCorpus, string generation, FSDirectory nextDirectory, DirectoryReader nextReader, DateTimeOffset builtAt)
    {
        readers.EnterWriteLock();
        try
        {
            reader?.Dispose(); directory?.Dispose();
            reader = nextReader; directory = nextDirectory; corpus = nextCorpus;
            status = new(true, true, corpus.CorpusHash, generation, builtAt, corpus.Guides.Length, reader.NumDocs, null);
        }
        finally { readers.ExitWriteLock(); }
    }

    private void Cleanup(string activeGeneration)
    {
        // Only our generated, non-linked children are eligible; keep one previous generation.
        var old = new DirectoryInfo(root).EnumerateDirectories("generation-*")
            .Where(item => item.Name != activeGeneration && Regex.IsMatch(item.Name, "^generation-[a-f0-9]{32}$") && item.LinkTarget is null)
            .OrderByDescending(item => item.LastWriteTimeUtc).Skip(1);
        foreach (var item in old)
        {
            try
            {
                if (item.EnumerateFileSystemInfos("*", SearchOption.AllDirectories).Any(child => child.LinkTarget is not null)) continue;
                item.Delete(true);
            }
            catch (IOException) { logger.LogWarning("A previous documentation index generation is still in use."); }
        }
    }

    public DocumentationSearchResponse Search(string audience, DocumentationSearchRequest request)
    {
        var started = Stopwatch.GetTimestamp();
        readers.EnterReadLock();
        try
        {
            if (reader is null || corpus is null || !Status.Ready)
                throw new DocumentationSearchException("documentation_search_unavailable", "Documentation search is temporarily unavailable.", 503);
            ValidateRequest(audience, request, corpus);
            var terms = Tokens(request.Q ?? "").Distinct().ToArray();
            var query = new BooleanQuery
            {
                { new TermQuery(new Term("audience", audience)), Occur.MUST },
                { new TermQuery(new Term("locale", "en-US")), Occur.MUST }
            };
            foreach (var (field, value) in new[] { ("topic", request.Topic), ("workflow", request.Workflow), ("contentType", request.ContentType) })
                if (!string.IsNullOrWhiteSpace(value)) query.Add(new TermQuery(new Term(field, value)), Occur.MUST);
            for (var i = 0; i < terms.Length; i++)
            {
                var matches = new BooleanQuery();
                foreach (var (field, boost) in new[] { ("title", 8F), ("heading", 6F), ("summary", 4F), ("keywords", 2F), ("body", 1F) })
                {
                    matches.Add(new TermQuery(new Term(field, terms[i])) { Boost = boost }, Occur.SHOULD);
                    if (i == terms.Length - 1 && terms[i].Length >= 2)
                        matches.Add(new PrefixQuery(new Term(field, terms[i])) { Boost = boost * 0.5F }, Occur.SHOULD);
                }
                query.Add(matches, Occur.MUST);
            }
            if (terms.Length > 1)
            {
                var phrase = new PhraseQuery { Boost = 12F };
                foreach (var term in terms) phrase.Add(new Term("title", term));
                query.Add(phrase, Occur.SHOULD);
            }
            var searcher = new IndexSearcher(reader);
            var hits = terms.Length == 0 && !string.IsNullOrWhiteSpace(request.Q)
                ? [] : searcher.Search(query, Math.Max(reader.NumDocs, 1)).ScoreDocs;
            var guides = corpus.Guides.ToDictionary(guide => guide.Id);
            var matchesByGuide = hits.Select(hit => (Document: searcher.Doc(hit.Doc), hit.Score))
                .GroupBy(hit => hit.Document.Get("id"))
                .Select(group => group.OrderByDescending(hit => hit.Score).ThenBy(hit => hit.Document.Get("anchor"), StringComparer.Ordinal).First())
                .OrderByDescending(hit => hit.Score).ThenBy(hit => hit.Document.Get("id"), StringComparer.Ordinal).ToArray();
            var matchedGuides = matchesByGuide.Select(hit => guides[hit.Document.Get("id")]).ToArray();
            var items = matchesByGuide.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).Select(hit =>
            {
                var doc = hit.Document;
                var guide = guides[doc.Get("id")];
                return new DocumentationResult(guide.Id, guide.Slug, guide.Route, guide.Title,
                    doc.Get("heading"), doc.Get("anchor"), Excerpt(doc.Get("body"), guide.Summary, terms),
                    Label("contentTypes", guide.ContentType), guide.TopicIds.Select(id => Label("topics", id)).ToArray(),
                    guide.WorkflowIds.Select(id => Label("workflows", id)).ToArray(), guide.ReviewedAt);
            }).ToArray();
            if (matchedGuides.Length == 0) ZeroResults.Add(1);
            return new(items, new(corpus.CorpusHash, matchedGuides.Length, request.Page, request.PageSize,
                Facets(matchedGuides, guide => guide.TopicIds, "topics"),
                Facets(matchedGuides, guide => guide.WorkflowIds, "workflows"),
                Facets(matchedGuides, guide => [guide.ContentType], "contentTypes")));
        }
        catch (Exception exception) when (exception is IOException or InvalidOperationException)
        {
            status = Status with { Ready = false, Failure = "documentation_index_unavailable" };
            throw new DocumentationSearchException("documentation_search_unavailable", "Documentation search is temporarily unavailable.", 503);
        }
        finally { readers.ExitReadLock(); QueryDuration.Record(Stopwatch.GetElapsedTime(started).TotalMilliseconds); }
    }

    private string Label(string group, string id) => corpus!.Taxonomy[group][id]["en-US"];
    private DocumentationFacet[] Facets(DocumentationGuide[] guides, Func<DocumentationGuide, string[]> select, string group) =>
        guides.SelectMany(guide => select(guide).Distinct()).GroupBy(id => id)
            .Select(values => new DocumentationFacet(values.Key, Label(group, values.Key), values.Count()))
            .OrderBy(value => value.Label, StringComparer.Ordinal).ToArray();

    internal static void ValidateRequest(string audience, DocumentationSearchRequest request, DocumentationCorpus corpus)
    {
        if (!new[] { "prospect", "customer", "partner", "phaeno" }.Contains(audience))
            throw new DocumentationSearchException("documentation_scope_unavailable", "Documentation is unavailable for this organization.", 403);
        if (request.CorpusVersion != corpus.CorpusHash)
            throw new DocumentationSearchException("documentation_corpus_changed", "Documentation was updated. Refresh the page and try again.", 409);
        var q = request.Q?.Trim() ?? "";
        if (request.Locale != "en-US" || q.Length > 200 || (q.Length == 1) || Words.Matches(q).Count > 20
            || (q.Length == 0 && string.IsNullOrEmpty(request.Topic) && string.IsNullOrEmpty(request.Workflow) && string.IsNullOrEmpty(request.ContentType))
            || request.Page is < 1 or > 10000 || request.PageSize is < 1 or > 20)
            throw new DocumentationSearchException("documentation_query_invalid", "Use 2 to 200 characters or select a documentation filter.");
        foreach (var (group, value) in new[] { ("topics", request.Topic), ("workflows", request.Workflow), ("contentTypes", request.ContentType) })
            if (value is not null && (value.Length > 80 || !corpus.Taxonomy[group].ContainsKey(value)))
                throw new DocumentationSearchException("documentation_query_invalid", "Select a valid documentation filter.");
    }

    private string[] Tokens(string value)
    {
        using var stream = analyzer.GetTokenStream("body", new StringReader(value.Normalize(NormalizationForm.FormKC)));
        var term = stream.AddAttribute<ICharTermAttribute>();
        var tokens = new List<string>();
        stream.Reset();
        while (stream.IncrementToken()) tokens.Add(term.ToString());
        stream.End();
        return tokens.ToArray();
    }

    private DocumentationMatch[] Excerpt(string body, string summary, string[] terms)
    {
        var text = string.IsNullOrWhiteSpace(body) ? summary : body;
        bool IsMatch(string word) => Tokens(word).Any(token => terms.Any(term => token == term || token.StartsWith(term, StringComparison.Ordinal)));
        var first = Words.Matches(text).FirstOrDefault(match => IsMatch(match.Value));
        var start = Math.Max(0, (first?.Index ?? 0) - 70);
        if (start > 0) { var boundary = text.IndexOf(' ', start); if (boundary >= 0 && boundary < start + 40) start = boundary + 1; }
        var length = Math.Min(260, text.Length - start);
        var excerpt = (start > 0 ? "…" : "") + text.Substring(start, length) + (start + length < text.Length ? "…" : "");
        var segments = new List<DocumentationMatch>();
        var offset = 0;
        foreach (Match match in Words.Matches(excerpt))
        {
            if (!IsMatch(match.Value)) continue;
            if (match.Index > offset) segments.Add(new(excerpt[offset..match.Index], false));
            segments.Add(new(match.Value, true)); offset = match.Index + match.Length;
        }
        if (offset < excerpt.Length) segments.Add(new(excerpt[offset..], false));
        return segments.ToArray();
    }

    internal static async Task<DocumentationCorpus> ReadCorpusAsync(string path, CancellationToken cancellationToken)
    {
        var text = await File.ReadAllTextAsync(path, cancellationToken);
        using var document = JsonDocument.Parse(text);
        using var buffer = new MemoryStream();
        using (var writer = new Utf8JsonWriter(buffer, new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping }))
        {
            writer.WriteStartObject();
            foreach (var property in document.RootElement.EnumerateObject()) if (property.Name != "corpusHash") property.WriteTo(writer);
            writer.WriteEndObject();
        }
        var value = JsonSerializer.Deserialize<DocumentationCorpus>(text, Json) ?? throw new IOException("Missing documentation corpus.");
        if (value.SchemaVersion != 1 || value.CorpusHash != Convert.ToHexStringLower(SHA256.HashData(buffer.ToArray()))
            || value.Guides.Length is < 1 or > 2000 || value.Guides.Sum(guide => guide.Sections.Length) > 20000
            || value.Guides.Select(guide => guide.Id).Distinct().Count() != value.Guides.Length)
            throw new IOException("Invalid documentation corpus.");
        foreach (var guide in value.Guides)
        {
            var identity = guide.Audience == "phaeno" ? $"phaeno/{guide.Slug}" : $"{guide.Audience}/en-US/{guide.Slug}";
            if (!new[] { "prospect", "customer", "partner", "phaeno" }.Contains(guide.Audience)
                || guide.Locale != (guide.Audience == "phaeno" ? null : "en-US") || guide.Id != identity
                || guide.PublicationStatus != "published" || !Regex.IsMatch(guide.Slug, "^[a-z0-9]+(?:-[a-z0-9]+)*$")
                || guide.Route != $"/docs/{guide.Audience}/{guide.Slug}" || guide.Sections.Length == 0
                || guide.Sections.Select(section => section.Anchor).Distinct().Count() != guide.Sections.Length)
                throw new IOException("Invalid documentation guide scope.");
        }
        return value;
    }

    private int disposed;

    public void Dispose()
    {
        if (Interlocked.Exchange(ref disposed, 1) != 0) return;
        readers.EnterWriteLock();
        try { reader?.Dispose(); directory?.Dispose(); analyzer.Dispose(); }
        finally { readers.ExitWriteLock(); }
        readers.Dispose(); rebuild.Dispose();
    }
}
