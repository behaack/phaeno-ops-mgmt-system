# PDF-backed publication search indexing plan

Keep this file updated as first-party PDF-backed Website publications and their
search behavior are implemented.

Do not execute this plan unless explicitly requested. This plan does not
authorize a dependency addition, test execution, deployment, production
reindex, or external search-console change.

## Status

- Product direction was approved for planning on 2026-07-21.
- The design applies to every first-party white paper and is reusable for a
  future first-party PDF-backed publication collection. It must not hardcode a
  publication title, slug, filename, page count, keyword set, or canonical URL.
- The HTML landing page is the single internal Website search result and the
  preferred external search result. The PDF remains the authoritative reading
  artifact.
- The current Website and crawler do not implement the publication metadata,
  PDF text extraction, structured-data, or PDF indexing policy described here.
- PDF text extraction requires an approved .NET dependency. Repository policy
  requires explicit approval before that dependency is added.

## Related documents

- `WEBSITE-API-CONSOLIDATION-PLAN.md` owns the deployed Website crawler,
  Lucene index, search API, scheduler, and operational cutover history.
- `BACKEND-TEST-PLAN.md` owns living backend coverage when implementation is
  authorized.
- `E2E-TEST-PLAN.md` owns browser-level search coverage when implementation is
  authorized.
- `../../website/AGENTS.md` and `../../website/README.md` own the public
  Website implementation boundary.

## Objective

Provide a repeatable publication workflow in which:

1. every publication has one useful, indexable HTML landing page;
2. the landing page carries an abstract, discovery metadata, authorship, and a
   stable link to the full PDF;
3. internal Website search can match terms found only in the PDF but returns
   one result pointing to the landing page;
4. external search engines receive consistent HTML metadata and structured
   data without creating per-publication configuration; and
5. adding a conforming publication requires content and assets, not new route,
   crawler, or hosting code.

## Product and UX decisions

- Do not paginate a publication into artificial Website pages.
- Keep the landing page concise: title, authors, publication date, image,
  abstract, key topics, compact contents list, page count, version when
  applicable, and a clear PDF action.
- The PDF is the complete publication. The landing page is the discovery and
  decision surface.
- Internal search presents one result per publication. It does not return a
  separate result for each PDF page or each landing-page heading.
- A result matched only by PDF body text still opens the landing page. Its
  snippet may quote the matching public PDF text, but the search response does
  not invent a page-number deep link that the browser PDF viewer cannot
  reliably honor.
- The empty or failed PDF-extraction path must degrade to HTML-only indexing;
  one malformed publication must not remove other Website search results.

## Scope

### Included

- a convention-driven first-party publication content contract;
- visible landing-page discovery content;
- reusable HTML metadata and JSON-LD;
- internal full-text extraction for linked first-party PDFs;
- one-result Lucene indexing and ranking behavior;
- a global external PDF indexing policy;
- build, backend, browser, deployment, reindex, and rollback verification; and
- an authoring checklist for future publications.

### Excluded

- an embedded PDF viewer;
- Website pagination for a publication;
- OCR for scanned or image-only PDFs;
- indexing third-party journal PDFs or arbitrary external URLs;
- confidential, access-controlled, embargoed, or customer-specific documents;
- changing the public search endpoint request or response envelope;
- a database migration; and
- a new manual production reindex endpoint.

## Current implementation

- `website/src/content.config.ts` defines `white_papers` with title, image,
  authors, date, summary, and a manually supplied link.
- `website/src/pages/media/white-papers/[slug].astro` emits the landing route
  and currently identifies it to the crawler as a generic `Web Page`.
- `website/src/components/meta-data-helpers/ArticleSEOMeta.astro` emits title,
  description, canonical, Open Graph, social image, and Phaeno search metadata,
  but no publication JSON-LD or source-document metadata.
- `backend/app/Features/Website/Crawler/WebsiteCrawler.cs` discovers sitemap
  HTML URLs, extracts HTML headings and sections, and does not follow or parse
  linked PDFs.
- `backend/app/Features/Website/Search/WebsiteSearchService.cs` indexes the
  crawler records in Lucene and preserves the rule that hidden keywords alone
  cannot produce a visible result.
- `website/vercel.json` has no publication-wide PDF indexing rule.
- The backend has no PDF text extraction package today.

## General publication contract

### Stable paths

Use the content entry ID as the stable publication slug:

- landing page: `/media/white-papers/{slug}`;
- PDF asset: `/white-papers/{slug}.pdf`; and
- representative image: `/images/media/white-papers/{slug}.{extension}`.

Remove the manually authored PDF link from white-paper front matter. Derive the
landing and PDF paths through one reusable publication-route helper. Existing
entries migrate to the convention once; future entries require no route or
hosting configuration.

### Front matter

Extend the collection schema with this reusable metadata:

| Field | Type | Rule | Purpose |
| --- | --- | --- | --- |
| `title` | string | required | Visible title, metadata, and result title. |
| `summary` | string | required, maximum 200 characters | Card copy and meta description; not the full abstract. |
| `authors` | string array | required, non-empty | Visible byline and one structured author object per author. |
| `date` | date | required | Original publication date. |
| `dateModified` | date | optional, not before `date` | Material revision date. |
| `image` | local Website path | required | Card, hero, Open Graph, and structured-data image. |
| `pageCount` | positive integer | required | Visible PDF-action context and publication metadata. |
| `version` | string | optional | Visible publication version when the publisher assigns one. |
| `topics` | string array | required, non-empty | Visible key-topic list and discovery context. |
| `searchKeywords` | string array | required, normalized and deduplicated | Technical synonyms and abbreviations for candidate matching. |

The MDX body must contain meaningful visible content under stable headings:

- `Abstract`;
- `Key topics` or an equivalent visible topic list; and
- `Contents` with the publication's major section names.

Do not place the complete publication body, artificial page breaks, invisible
keyword blocks, or private review notes in the MDX.

### Build validation

Add a reusable helper under `website/src/lib/` that:

- derives landing, PDF, and image URLs from an entry;
- confirms the expected PDF exists under `website/public/white-papers`;
- rejects a non-local or non-PDF publication source;
- checks that the image uses a local Website path;
- normalizes and deduplicates topics and search keywords; and
- provides absolute URLs from `Astro.site` for metadata.

The Website build must fail with the entry ID and violated rule when any
publication breaks the contract. Adding a valid entry must not require editing
the helper.

## Landing-page metadata contract

Create a publication-specific metadata component, or extend the existing
article metadata component without changing blog behavior, to emit:

- a unique title and meta description;
- a self-referencing HTML canonical URL;
- Open Graph and social-card metadata using an absolute image URL;
- `phaeno:document-type` set to `White Paper`;
- `phaeno:search-title` and normalized `phaeno:search-keywords`;
- `phaeno:search-mode` set to `document`;
- an absolute `phaeno:search-source` URL for the derived PDF;
- `phaeno:search-source-type` set to `application/pdf`;
- publication page count and version metadata when present; and
- one `Article` JSON-LD object with `headline`, `description`, separate author
  objects, `datePublished`, optional `dateModified`, representative image,
  Phaeno as publisher, `mainEntityOfPage`, and a PDF `MediaObject` encoding.

Structured data must describe visible content truthfully. It must not contain a
full `articleBody` when the full text is available only in the PDF.

Google's supported Article properties include authors, publication and
modification dates, headline, and representative images:
https://developers.google.com/search/docs/appearance/structured-data/article

## Internal search design

### Metadata-driven crawler behavior

Keep ordinary Website pages on the current heading/section path. When a page
declares `phaeno:search-mode=document`, the crawler must instead create one
page-level `IndexedPage` and optionally enrich it from the declared source.
This makes the mechanism reusable without checking a particular route, title,
or filename.

The document-mode record uses:

- the HTML landing URL as `Url`;
- the HTML title and search title as its result identity;
- the abstract summary as `Description`;
- `White Paper` as `DocumentType`;
- visible landing-page text as primary text; and
- normalized PDF text as source text.

Add an internal-only `SourceText` field to `IndexedPage`. Keep it excluded from
JSON serialization so the public API shape remains unchanged.

### Source validation and extraction

Introduce an `IWebsiteDocumentTextExtractor` abstraction and an initial PDF
implementation. The preferred implementation uses a maintained managed .NET
PDF text library, with PdfPig as the first candidate. Adding that package is a
separate explicit approval gate.

Before downloading a source, the crawler must require:

- an absolute URL resolved against the crawled page;
- the same origin as `WebCrawlerSettings:Url`;
- a path under the approved first-party publication prefix;
- an `.pdf` extension and `application/pdf` response;
- an HTTPS source outside Development;
- no redirect to a different origin; and
- robots permission for the source path.

Add crawler limits with conservative defaults:

- maximum PDF download: 25 MB;
- maximum extracted text: 1,000,000 characters;
- maximum source fetch/extraction time: 30 seconds; and
- one source document per landing page.

Read the response as a bounded stream rather than buffering an unlimited body.
Normalize page text in document order, collapse repeated whitespace, remove
control characters, and preserve paragraph boundaries where the extractor can
identify them. Do not log document text.

Encrypted, malformed, image-only, oversized, unsupported, or unavailable PDFs
produce a structured warning and HTML-only indexing for that publication. OCR
is not an automatic fallback.

### Search and ranking

Index primary HTML text and source PDF text separately. For each query term,
allow a match in either field while applying a stronger boost to title,
visible abstract, visible topics, and result heading than to PDF body text.
Search keywords may help select a candidate but remain insufficient by
themselves to return a result.

Snippet selection order is:

1. matching visible landing-page text;
2. matching PDF source text;
3. the abstract summary.

Document mode creates one Lucene document, so a matching publication produces
exactly one result. The result URL always remains the landing URL.

### Reindex and failure behavior

- Preserve the existing scheduled `IndexWebsiteJob` and `RunOnStartup`
  behavior.
- Do not add a public or anonymous reindex endpoint.
- A source failure must not abort the overall crawl or omit the HTML landing
  record.
- A complete crawl still rebuilds the existing durable Lucene index.
- Log counts for document-mode pages discovered, sources extracted, HTML-only
  fallbacks, rejected sources, extracted characters, and total duration.
- Never log extracted text, search-index contents, credentials, or query-string
  secrets.

## External search design

### Google Search signal contract

Use the following signals together without contradiction:

- include only the indexable HTML landing pages in the sitemap because those
  are the URLs Phaeno wants shown in external search results;
- give every landing page one self-referencing canonical URL and use that same
  URL in internal links, structured data, and the sitemap;
- exclude publication PDFs from the sitemap while they carry `noindex`;
- allow crawlers to request the PDF path so they can observe its HTTP
  `X-Robots-Tag`; do not block publication PDFs in `robots.txt`;
- use `noindex` only to exclude the PDF from results, not to choose between
  duplicate canonical URLs; and
- keep JSON-LD consistent with the visible landing-page content.

Google recommends including in a sitemap the URLs intended for search results
and using consistent canonical signals. Google also requires a crawler to
access a resource to observe its `noindex` rule:

- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag

### HTML policy

- Include every landing page exactly once in the generated sitemap.
- Keep the landing page self-canonical and indexable.
- Use the visible abstract, topics, and contents headings as the external
  discovery surface.
- Use descriptive PDF anchor text that includes the document type and page
  count without keyword stuffing.
- Ensure the representative image is crawlable and relevant.

### PDF policy

Use one Website-wide policy for first-party publication PDFs rather than
per-publication rules. Initially, serve `/white-papers/*.pdf` with
`X-Robots-Tag: noindex` through one wildcard rule in
`website/vercel.json`. This keeps the HTML landing page as the external search
result while leaving the public PDF available to users and retrievable by
crawlers that need to observe the header.

This global policy is deliberate: an abstract landing page is not a full-text
duplicate of its PDF, so a canonical mapping may be ignored or misrepresent the
relationship. The PDF must not declare the abstract landing page as canonical
while the two resources are not duplicate or substantially equivalent. If full
text is later published as equivalent HTML, revisit the policy and use an HTTP
`rel="canonical"` header for the non-HTML representation instead. Google
documents both non-HTML `X-Robots-Tag` controls and HTTP canonical headers:

- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls

Vercel supports path-based response headers in `vercel.json`:
https://vercel.com/docs/project-configuration/vercel-json#headers

The PDF itself must still have selectable text, a document title, authors,
subject, keywords, language, logical reading order, bookmarks for major
sections, and accessible tagging before publication. These are publication
quality and accessibility requirements even when the PDF is excluded from
external results.

## Implementation phases

### Phase 1: convention and Website metadata

- [ ] Add shared publication route and asset helpers.
- [ ] Extend the white-paper content schema with the general metadata contract.
- [ ] Derive PDF links from entry IDs and remove manually authored links.
- [ ] Add build-time asset and metadata validation.
- [ ] Update the shared landing layout to show page count and optional version.
- [ ] Emit generic document-mode crawler metadata.
- [ ] Emit Article JSON-LD without changing blog metadata.
- [ ] Add one wildcard Vercel PDF indexing header rule.
- [ ] Migrate every existing first-party white-paper entry and PDF to the
  convention; do not add a one-off compatibility branch.

Phase 1 requires no backend dependency and may ship before PDF extraction.
Internal search remains HTML-only until Phase 2.

### Phase 2: safe PDF enrichment

- [ ] Obtain explicit approval for the selected managed PDF extraction
  dependency.
- [ ] Add `IWebsiteDocumentTextExtractor` and the PDF implementation.
- [ ] Add source metadata parsing, same-origin validation, bounded fetching,
  extraction, and fallback handling to `WebsiteCrawler`.
- [ ] Add `SourceText` and separate primary/source Lucene fields.
- [ ] Add source-aware ranking and snippet selection without changing the API
  response envelope.
- [ ] Add structured crawler metrics and warnings.
- [ ] Update the implemented search contract in
  `WEBSITE-API-CONSOLIDATION-PLAN.md` after the behavior ships.

### Phase 3: verification and controlled release

- [ ] Complete the focused tests below and update the living backend and E2E
  plans with implemented or intentionally deferred coverage.
- [ ] Deploy the Website changes and verify the public landing pages, sitemap,
  PDF headers, PDFs, and structured data before deploying crawler enrichment.
- [ ] Deploy the API with the existing durable index mount intact.
- [ ] Allow `RunOnStartup` to rebuild the index or wait for the configured
  schedule; do not infer completion from API health alone.
- [ ] Verify representative visible-abstract, topic, synonym, and PDF-only
  queries against the public search endpoint and Website UI.
- [ ] Inspect crawler logs for discovered, extracted, and fallback counts.
- [ ] Submit or refresh the sitemap in the configured webmaster tooling only
  as an explicitly authorized external action.

## Verification plan

### Website build and generated output

- A conforming publication builds without per-entry route or hosting edits.
- Missing PDFs, invalid local paths, empty authors/topics/keywords, invalid
  dates, and non-positive page counts fail the build clearly.
- Generated HTML contains one canonical, unique metadata, crawler source
  metadata, and valid Article JSON-LD.
- The sitemap contains each landing route exactly once and does not list static
  PDFs.
- `robots.txt` allows both the landing and PDF URLs to be crawled so their
  HTML metadata and HTTP indexing rules can be observed.
- The PDF action shows the correct derived URL and page count.
- `pnpm build` succeeds from `website/`.

### Backend unit and integration coverage

Add focused coverage under `backend/test` using small, source-controlled,
text-based PDF fixtures with no confidential content:

- valid PDF text extraction in reading order;
- same-origin publication source acceptance;
- rejection of external origins, redirects, wrong content types, invalid
  prefixes, oversize payloads, and excessive extracted text;
- encrypted, malformed, image-only, and unavailable PDF fallback;
- HTML-only indexing when extraction fails;
- one landing result for a term appearing only in a PDF;
- preference for a visible abstract snippet over a PDF snippet;
- PDF snippet fallback when the visible page has no match;
- no result for a keyword-only unsupported match;
- no behavior change for ordinary section-indexed Website pages; and
- rebuild completion with mixed valid and invalid publication sources.

Run backend build and tests only when explicitly requested by the owner, per
repository policy.

### Browser and deployment verification

- At desktop and narrow widths, the landing page exposes title, authors,
  abstract, topics, contents, page count, and PDF action without pagination.
- Search for an abstract term returns one landing result.
- Search for a PDF-only term returns the same landing result with a supported
  snippet.
- Activating the result opens the landing page; activating the PDF action opens
  the derived PDF in a new tab.
- The deployed PDF response includes the global `X-Robots-Tag` policy and the
  expected content type.
- Google Rich Results Test accepts the Article object before production
  acceptance. Search Console or another webmaster tool is deployment evidence,
  not a local completion claim.
- After an authorized production release, URL Inspection identifies the HTML
  landing page as indexable and self-canonical, while the PDF reports exclusion
  by `noindex`; sitemap processing reports the HTML URL without the PDF URL.

## Rollout and rollback

### Rollout order

1. Merge and deploy the convention, content migrations, metadata, and global
   PDF header policy.
2. Verify every deployed landing/PDF pair and generated sitemap.
3. After explicit dependency approval, merge and deploy backend extraction.
4. Observe one complete index rebuild and representative searches.

### Rollback

- If Website metadata or headers are wrong, revert the Website deployment; the
  PDF files and current API remain independently available.
- If PDF extraction is unstable, disable source enrichment and rebuild from
  HTML only. Do not delete the durable index directory manually.
- If ranking regresses, retain source extraction but set its boost to zero or
  revert the source-aware query change, then rebuild.
- No database rollback or migration is involved.

## Risks and controls

| Risk | Control |
| --- | --- |
| Arbitrary URL fetch or SSRF | Same-origin, prefix, scheme, MIME, redirect, robots, and size validation. |
| Malformed or hostile PDF | Managed parser, bounded stream, time limit, character limit, and fallback. |
| One document breaks the crawl | Per-publication exception boundary and HTML-only fallback. |
| PDF body overwhelms ranking | Separate fields and lower PDF-source boost. |
| Duplicate results | One document-mode Lucene record keyed to the landing URL. |
| Keyword stuffing | Require support in visible HTML or public PDF text; keywords alone remain insufficient. |
| Search engines prefer raw PDFs | Global PDF `noindex` policy, crawlable PDF responses, and indexable HTML landing pages. |
| Inaccessible publication | Text-based, tagged PDF with metadata, reading order, and bookmarks as a release gate. |
| Stale search after deployment | Verify a completed scheduled/startup rebuild and representative public queries. |

## Definition of done

- A new conforming first-party white paper can be added without changing code
  or Vercel configuration.
- The landing page is useful without opening the PDF and contains approved,
  visible discovery content.
- Internal search finds abstract, topic, synonym, and PDF-only terms and returns
  exactly one landing-page result.
- External metadata, structured data, sitemap entry, and global PDF header
  policy are verified from deployed responses.
- Invalid or unavailable PDFs fall back to HTML-only indexing without aborting
  the rebuild.
- Existing non-publication Website search behavior remains covered and intact.
- Living test plans and the implemented Website search contract are updated.
- No dependency, test execution, deployment, reindex, or webmaster-tool action
  is claimed without its separate approval and evidence.
