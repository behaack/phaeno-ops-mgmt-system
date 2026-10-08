namespace PhaenoPortal.Test;

using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PhaenoPortal.App.Infrastructure.Api;
using PhaenoPortal.App.Middleware;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.Documentation.Search;
using PhaenoPortal.App.Features.Website;
using PhaenoPortal.App.Features.Website.Crawler.Support;
using PhaenoPortal.App.Features.Website.Search;
using PSeq.Operations.Commercial.Accounts.Domain;

public sealed class DocumentationSearchTests(Xunit.Abstractions.ITestOutputHelper output)
{
    [Fact]
    public async Task PublishedCorpusLoadsWithoutFrontendAndReusesCompatibleIndexOnRestart()
    {
        using var fixture = await Fixture.Create();
        Assert.NotEmpty(fixture.Corpus.Guides);
        Assert.True(fixture.Search.Status.Ready);
        var generation = fixture.Search.Status.Generation;
        var builtAt = fixture.Search.Status.LastSuccessfulBuild;
        Assert.True(fixture.Search.Status.LastBuildDurationMs > 0);
        output.WriteLine($"Initial index build: {fixture.Search.Status.LastBuildDurationMs:F2} ms.");
        fixture.Search.Dispose();
        fixture.Search = fixture.NewService();
        await fixture.Search.RebuildAsync(default, false);
        Assert.Equal(generation, fixture.Search.Status.Generation);
        Assert.Equal(builtAt, fixture.Search.Status.LastSuccessfulBuild);
        Assert.NotEmpty(fixture.Query("customer", "samples").Items);
    }

    [Theory]
    [InlineData("prospect", "Trial acceptance", "trial-projects")]
    [InlineData("customer", "sample shipping", "sample-shipping")]
    [InlineData("customer", "Department administrator", "account-and-access")]
    [InlineData("prospect", "download grace", "data-governance-and-downloads")]
    [InlineData("phaeno", "scientific approval", "lab-scientific-approval")]
    [InlineData("partner", "data assembly", "data-assembly")]
    public async Task RepresentativeTasksFindExpectedGuide(string audience, string query, string slug)
    {
        using var fixture = await Fixture.Create();
        Assert.Contains(fixture.Query(audience, query).Items.Take(3), item => item.Slug == slug);
    }

    [Fact]
    public async Task AudienceFiltersApplyBeforeResultsCountsFacetsAndExcerpts()
    {
        using var fixture = await Fixture.Create(sentinels: true);
        var customer = fixture.Query("customer", "documentationcustomerunique");
        Assert.Single(customer.Items);
        Assert.Equal(1, customer.Metadata.Total);
        Assert.Equal("customer/en-US/getting-started", customer.Items[0].Id);
        var partner = fixture.Query("partner", "documentationcustomerunique");
        Assert.Empty(partner.Items); Assert.Equal(0, partner.Metadata.Total); Assert.Empty(partner.Metadata.Topics);
        Assert.Empty(partner.Metadata.Workflows); Assert.Empty(partner.Metadata.ContentTypes);
        Assert.DoesNotContain("documentationcustomerunique", JsonSerializer.Serialize(partner));
        Assert.Equal(customer.Items.Length, customer.Items.Select(item => item.Id).Distinct().Count());
    }

    [Fact]
    public async Task WebsitePublicAndPreviewIndexesRemainIndependentThroughRebuildAndDocumentationFailure()
    {
        using var fixture = await Fixture.Create(sentinels: true);
        using var website = new WebsiteSearchService(null!, Options.Create(new WebsiteSearchOptions { SearchIndexLocation = fixture.WebsiteRoot }));
        using var preview = new WebsiteSearchService(null!, Options.Create(new WebsiteSearchOptions { SearchIndexLocation = fixture.PreviewRoot }));
        static IndexedPage Page(string token) => new() { Id = token, Url = "https://example.invalid/" + token, PageTitle = token, Text = token, Description = token };
        website.RebuildIndex([Page("websitepublicunique")]);
        preview.RebuildIndex([Page("websitepreviewunique")]);
        Assert.Empty(fixture.Query("customer", "websitepublicunique").Items);
        Assert.Empty(fixture.Query("customer", "websitepreviewunique").Items);
        Assert.Empty(website.Search("documentationcustomerunique"));
        Assert.Empty(preview.Search("documentationcustomerunique"));
        var hashes = Hashes(fixture.WebsiteRoot).Concat(Hashes(fixture.PreviewRoot)).ToArray();
        await fixture.Search.RebuildAsync(default);
        Assert.Equal(hashes, Hashes(fixture.WebsiteRoot).Concat(Hashes(fixture.PreviewRoot)));
        var generation = fixture.Search.Status.Generation;
        website.RebuildIndex([Page("websitechangedunique")]);
        Assert.Equal(generation, fixture.Search.Status.Generation);
        Assert.Single(fixture.Query("customer", "documentationcustomerunique").Items);
        await File.WriteAllTextAsync(fixture.Manifest, "corrupt");
        using var failed = fixture.NewService();
        await Assert.ThrowsAsync<DocumentationSearchException>(() => failed.RebuildAsync(default, false));
        Assert.NotEmpty(website.Search("websitechangedunique"));
        Assert.NotEmpty(preview.Search("websitepreviewunique"));
    }

    [Fact]
    public async Task MetadataFiltersBrowseDeduplicateAndCountAllMatchingGuides()
    {
        using var fixture = await Fixture.Create();
        var expected = fixture.Corpus.Guides.Where(guide => guide.Audience == "phaeno" && guide.WorkflowIds.Contains("lab-operations")).ToArray();
        var result = fixture.Search.Search("phaeno", new(Workflow: "lab-operations", PageSize: 2, CorpusVersion: fixture.Corpus.CorpusHash));
        Assert.Equal(expected.Length, result.Metadata.Total);
        Assert.Equal(2, result.Items.Length);
        Assert.Equal(expected.Length, result.Metadata.Workflows.Single(facet => facet.Id == "lab-operations").Count);
        Assert.NotEqual(result.Items[0].Id, result.Items[1].Id);
    }

    [Theory]
    [InlineData("x", "en-US", 1, 10, "documentation_query_invalid")]
    [InlineData("sample", "fr-FR", 1, 10, "documentation_query_invalid")]
    [InlineData("sample", "en-US", -1, 10, "documentation_query_invalid")]
    [InlineData("sample", "en-US", 1, 100, "documentation_query_invalid")]
    public async Task InvalidInputHasStableFailure(string q, string locale, int page, int pageSize, string code)
    {
        using var fixture = await Fixture.Create();
        Assert.Equal(code, Assert.Throws<DocumentationSearchException>(() => fixture.Search.Search("customer", new(q, locale, page, pageSize, CorpusVersion: fixture.Corpus.CorpusHash))).ErrorCode);
    }

    [Fact]
    public async Task CorpusMismatchAndUnavailableIndexDifferFromNoMatchesAndSyntaxIsLiteral()
    {
        using var fixture = await Fixture.Create();
        Assert.Equal("documentation_corpus_changed", Assert.Throws<DocumentationSearchException>(() => fixture.Search.Search("customer", new("shipping", CorpusVersion: "old"))).ErrorCode);
        Assert.Empty(fixture.Query("customer", "noresultuniqueterm").Items);
        Assert.Empty(fixture.Query("customer", "audience:phaeno *:*").Items);
        Assert.NotEmpty(fixture.Query("phaeno", "QC").Items);
        using var missing = new DocumentationSearchService(fixture.IndexRoot + "-missing", fixture.Manifest, [fixture.WebsiteRoot], NullLogger<DocumentationSearchService>.Instance);
        Assert.Equal("documentation_search_unavailable", Assert.Throws<DocumentationSearchException>(() => missing.Search("customer", new("sample", CorpusVersion: fixture.Corpus.CorpusHash))).ErrorCode);
    }

    [Fact]
    public void IndexRootsRejectEqualAndNestedPaths()
    {
        var root = Path.Combine(Path.GetTempPath(), "documentation-path-test");
        Assert.Throws<IOException>(() => DocumentationIndexPaths.Validate(root, [root]));
        Assert.Throws<IOException>(() => DocumentationIndexPaths.Validate(root, [Path.Combine(root, "website")]));
        Assert.Throws<IOException>(() => DocumentationIndexPaths.Validate(Path.Combine(root, "docs"), [root]));
        DocumentationIndexPaths.Validate(root + "-docs", [root + "-website", root + "-preview"]);
    }

    [Fact]
    public void AudienceRequiresAnActiveUserAndMembershipInTheSelectedOrganization()
    {
        var user = new User("docs@example.invalid", "Docs", "Reader"); user.Activate();
        var organization = new Organization("Docs Customer", OrganizationKind.Customer);
        var membership = new OrganizationMembership(user.Id, organization.Id, false);
        typeof(OrganizationMembership).GetProperty(nameof(OrganizationMembership.Organization))!.SetValue(membership, organization);
        user.Memberships.Add(membership);
        Assert.Equal("customer", DocumentationAccess.ResolveAudience(user, organization.Id.ToString()));
        Assert.Throws<DocumentationSearchException>(() => DocumentationAccess.ResolveAudience(user, Guid.NewGuid().ToString()));
        Assert.Throws<DocumentationSearchException>(() => DocumentationAccess.ResolveAudience(null, organization.Id.ToString()));
        membership.Deactivate();
        Assert.Throws<DocumentationSearchException>(() => DocumentationAccess.ResolveAudience(user, organization.Id.ToString()));
        user.Deactivate();
        Assert.Equal(401, Assert.Throws<DocumentationSearchException>(() => DocumentationAccess.ResolveAudience(user, organization.Id.ToString())).StatusCode);
        Assert.NotNull(typeof(DocumentationSearchController).GetCustomAttribute<AuthorizeAttribute>());
        Assert.NotNull(typeof(DocumentationSearchOperationsController).GetCustomAttribute<AuthorizeAttribute>());
    }

    [Fact]
    public async Task WarmSearchMeetsDocumentedLatencyTarget()
    {
        using var fixture = await Fixture.Create();
        fixture.Query("phaeno", "scientific approval");
        var measurements = Enumerable.Range(0, 100).Select(_ =>
        {
            var start = Stopwatch.GetTimestamp(); fixture.Query("phaeno", "scientific approval");
            return Stopwatch.GetElapsedTime(start).TotalMilliseconds;
        }).Order().ToArray();
        output.WriteLine($"{fixture.Corpus.Guides.Length} guides; 100 sequential warm searches; p95={measurements[94]:F2} ms.");
        Assert.True(measurements[94] <= 300, $"55-guide corpus, sequential warm queries: p95={measurements[94]:F2}ms");
    }

    [Fact]
    public async Task CorruptGenerationRecoversAndRemovingAGuideChangesTheCorpus()
    {
        using var fixture = await Fixture.Create(sentinels: true);
        var oldGeneration = fixture.Search.Status.Generation;
        fixture.Search.Dispose();
        var segments = Directory.GetFiles(Path.Combine(fixture.IndexRoot, oldGeneration!), "segments_*").Single();
        await File.WriteAllBytesAsync(segments, [0, 1, 2]);
        fixture.Search = fixture.NewService();
        await fixture.Search.RebuildAsync(default, false);
        Assert.True(fixture.Search.Status.Ready);
        Assert.NotEqual(oldGeneration, fixture.Search.Status.Generation);
        var oldHash = fixture.Corpus.CorpusHash;
        var source = JsonNode.Parse(await File.ReadAllTextAsync(fixture.Manifest))!.AsObject();
        var guides = source["guides"]!.AsArray();
        guides.Remove(guides.Single(guide => (string?)guide!["id"] == "customer/en-US/getting-started"));
        source.Remove("corpusHash");
        source["corpusHash"] = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(source.ToJsonString(new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping }))));
        await File.WriteAllTextAsync(fixture.Manifest, source.ToJsonString(new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping }));
        await fixture.Search.RebuildAsync(default, false);
        var newHash = fixture.Search.Status.CorpusHash;
        Assert.NotEqual(oldHash, newHash);
        Assert.Equal("documentation_corpus_changed", Assert.Throws<DocumentationSearchException>(() => fixture.Query("customer", "documentationcustomerunique")).ErrorCode);
        Assert.Empty(fixture.Search.Search("customer", new("documentationcustomerunique", CorpusVersion: newHash)).Items);
    }

    [Fact]
    public async Task SeparateProcessLockAndCooldownProtectRebuildsWithoutChangingActiveReaders()
    {
        using var fixture = await Fixture.Create();
        var generation = fixture.Search.Status.Generation;
        await using (var lease = new FileStream(Path.Combine(fixture.IndexRoot, ".rebuild.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None))
        using (var competitor = fixture.NewService())
        {
            await Assert.ThrowsAsync<DocumentationSearchException>(() => competitor.RebuildAsync(default, false));
            Assert.NotEmpty(fixture.Query("customer", "sample shipping").Items);
            Assert.Equal(generation, fixture.Search.Status.Generation);
        }
        await fixture.Search.RebuildAsync(default);
        Assert.Equal("documentation_rebuild_busy", (await Assert.ThrowsAsync<DocumentationSearchException>(() => fixture.Search.RebuildAsync(default))).ErrorCode);
        Assert.True(fixture.Search.Status.Ready);
    }

    [Fact]
    public async Task InvalidOrAliasedPathsFailOnlyDocumentationReadiness()
    {
        using var fixture = await Fixture.Create();
        using var same = new DocumentationSearchService(fixture.WebsiteRoot, fixture.Manifest, [fixture.WebsiteRoot], NullLogger<DocumentationSearchService>.Instance);
        await Assert.ThrowsAsync<DocumentationSearchException>(() => same.RebuildAsync(default, false));
        Assert.False(same.Status.Ready);
        Assert.False(Directory.Exists(fixture.WebsiteRoot));
        using var malformed = new DocumentationSearchService("\0", fixture.Manifest, [fixture.WebsiteRoot], NullLogger<DocumentationSearchService>.Instance, contentRoot: fixture.Root);
        await Assert.ThrowsAsync<DocumentationSearchException>(() => malformed.RebuildAsync(default, false));
        Assert.NotEmpty(fixture.Query("customer", "shipping").Items);
    }

    [Fact]
    public async Task HttpContractBindsQueriesEnvelopesResultsAndRejectsUnauthorizedScope()
    {
        using var fixture = await Fixture.Create();
        var organization = new Organization("Documentation HTTP", OrganizationKind.Customer);
        var actor = new User("http-docs@example.invalid", "HTTP", "Reader"); actor.Activate();
        var membership = new OrganizationMembership(actor.Id, organization.Id, false);
        typeof(OrganizationMembership).GetProperty(nameof(OrganizationMembership.Organization))!.SetValue(membership, organization);
        actor.Memberships.Add(membership);
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { ContentRootPath = fixture.Root, EnvironmentName = "Test" });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Services.AddAuthentication("DocumentationTest").AddScheme<AuthenticationSchemeOptions, DocumentationTestAuthentication>("DocumentationTest", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddSingleton<IDocumentationAccess>(new HttpAccess(actor));
        builder.Services.AddSingleton<IDocumentationSearchService>(fixture.Search);
        builder.Services.AddControllers(options => options.Filters.Add<ApiResponseEnvelopeFilter>()).AddApplicationPart(typeof(DocumentationSearchController).Assembly);
        await using var app = builder.Build();
        app.UseMiddleware<ApiExceptionMiddleware>(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        await app.StartAsync();
        using var http = new HttpClient { BaseAddress = new Uri(app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single()) };
        var query = "/api/documentation/search?q=sample%20shipping&corpusVersion=" + fixture.Corpus.CorpusHash;
        Assert.Equal(HttpStatusCode.Unauthorized, (await http.GetAsync(query)).StatusCode);
        http.DefaultRequestHeaders.Add("Authorization", "DocumentationTest reader");
        http.DefaultRequestHeaders.Add("X-Organization-Id", organization.Id.ToString());
        var response = await http.GetAsync(query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        var envelope = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(envelope.GetProperty("success").GetBoolean());
        Assert.Equal("customer/en-US/sample-shipping", envelope.GetProperty("data").GetProperty("items")[0].GetProperty("id").GetString());
        Assert.Equal(fixture.Corpus.CorpusHash, envelope.GetProperty("data").GetProperty("metadata").GetProperty("corpusHash").GetString());
        Assert.True(envelope.GetProperty("meta").TryGetProperty("requestId", out _));
        Assert.Equal(HttpStatusCode.BadRequest, (await http.GetAsync(query + "&audience=phaeno")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await http.GetAsync(query + "&indexPath=website")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await http.PostAsync("/api/platform/documentation-search/rebuild", null)).StatusCode);
        http.DefaultRequestHeaders.Remove("X-Organization-Id");
        http.DefaultRequestHeaders.Add("X-Organization-Id", Guid.NewGuid().ToString());
        var denied = await http.GetAsync(query);
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        Assert.DoesNotContain("sample-shipping", await denied.Content.ReadAsStringAsync());
        await app.StopAsync();
    }

    private sealed class HttpAccess(User actor) : IDocumentationAccess
    {
        public Task<string> RequireAudienceAsync(HttpContext context, CancellationToken cancellationToken) =>
            Task.FromResult(DocumentationAccess.ResolveAudience(actor, context.Request.Headers["X-Organization-Id"].ToString()));
        public Task<Guid> RequirePlatformAdminAsync(HttpContext context, CancellationToken cancellationToken) =>
            throw new DocumentationSearchException("platform_admin_required", "A platform administrator is required.", 403);
    }

    private sealed class DocumentationTestAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync() => Task.FromResult(
            Request.Headers.Authorization.ToString() == "DocumentationTest reader"
                ? AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", "documentation-test-reader")], Scheme.Name)), Scheme.Name))
                : AuthenticateResult.NoResult());
    }

    private static string[] Hashes(string root) => Directory.GetFiles(root).Where(path => !path.EndsWith("write.lock"))
        .Order().Select(path => Path.GetFileName(path) + ":" + Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)))).ToArray();

    private sealed class Fixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), $"phaeno-doc-search-{Guid.NewGuid():N}");
        public string Manifest => Path.Combine(Root, "corpus.json");
        public string IndexRoot => Path.Combine(Root, "documentation");
        public string WebsiteRoot => Path.Combine(Root, "website");
        public string PreviewRoot => Path.Combine(Root, "preview");
        public DocumentationSearchService Search { get; set; } = null!;
        public DocumentationCorpus Corpus { get; private set; } = null!;
        public DocumentationSearchService NewService() => new(IndexRoot, Manifest, [WebsiteRoot, PreviewRoot], NullLogger<DocumentationSearchService>.Instance);
        public DocumentationSearchResponse Query(string audience, string q) => Search.Search(audience, new(q, CorpusVersion: Corpus.CorpusHash));

        public static async Task<Fixture> Create(bool sentinels = false)
        {
            var fixture = new Fixture(); Directory.CreateDirectory(fixture.Root);
            var packaged = Path.Combine(AppContext.BaseDirectory, "Documentation", "corpus.json");
            var source = JsonNode.Parse(await File.ReadAllTextAsync(packaged))!;
            if (sentinels)
            {
                var guide = source["guides"]!.AsArray().Single(guide => (string?)guide!["id"] == "customer/en-US/getting-started")!;
                guide["sections"]![0]!["text"] = "documentationcustomerunique safe body";
                source.AsObject().Remove("corpusHash");
                var compact = source.ToJsonString(new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
                source["corpusHash"] = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(compact)));
            }
            await File.WriteAllTextAsync(fixture.Manifest, source.ToJsonString(new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping }));
            fixture.Corpus = await DocumentationSearchService.ReadCorpusAsync(fixture.Manifest, default);
            fixture.Search = fixture.NewService();
            await fixture.Search.RebuildAsync(default, false);
            return fixture;
        }

        public void Dispose()
        {
            Search?.Dispose();
            if (Directory.Exists(Root)) Directory.Delete(Root, true);
        }
    }
}
