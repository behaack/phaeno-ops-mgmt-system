# Public Website internationalization plan

- Status: implementation in progress; seven localized review previews implemented locally, production publication blocked on review
- Owner: Product Owner
- Technical owner: Codex
- Last updated: 2026-08-08

## Authorization boundary

Implementation was authorized by the Product Owner on 2026-08-07. That authorization covers the additive Website and backend code in this plan without a new dependency. It does not authorize publication of unreviewed translation, translation purchase, Vercel configuration, search reindex, deployment, or production activation. The Arabic, French, Spanish, Simplified Chinese, Japanese, German (Germany), and Italian implementations remain review-gated and must preserve the no-disruption contract below.

## Current implementation checkpoint

Implemented locally through 2026-08-08:

- the default build remains unprefixed `en-US` and generates no draft localized route, selector, suggestion, or localized sitemap entry;
- private team review mode enables complete 19-pair review route sets for Arabic, French, Spanish, Simplified Chinese, Japanese, German (Germany), and Italian by default, while locale-specific mode variables may explicitly focus the review build;
- all current public English routes have explicit equivalents in every review locale. The four white-paper families use explicit localized draft slugs, and the three phased-sequencing blog articles use stable locale-prefixed routes; both are connected by `translationKey`;
- all 133 localized route pairs carry page-by-page draft translations. Principal static pages render through the same Astro presentation as their English sources, localized white-paper landing pages include the complete Abstract, Key topics, Contents, and applicable objective callout while identifying their PDF assets as English, and each localized blog article preserves the complete MDX body, structured callouts, comparison tables, and series navigation;
- locale-aware layout, `lang`, `dir`, navigation, footer, search controls, contact/demo forms, validation messages, date formatting, sharing text, and logical CSS support both French LTR and Arabic RTL;
- client-side browser-language detection offers enabled translations without redirecting, and explicit accept/dismiss or selector choices use first-party functional cookies;
- localized review HTML has localized metadata, self-canonicals, reciprocal `hreflang`, `x-default`, and sitemap alternates; the review build remains `noindex` and omits `llms.txt`;
- content schemas now carry additive translation identity/status/revision/reviewer and publication-asset language fields;
- localized blog listings, article routes, same-article language switching, series links, social metadata, and three-item review feeds are implemented for all seven review locales; all 21 machine-assisted articles remain `draft` and require native linguistic and scientific review before publication;
- the Website crawler reads document language, the search API accepts an optional `locale` while defaulting to `en-US`, Lucene partitions records by locale, Arabic Unicode normalization/search is implemented, and French uses French stemming;
- an Arabic landing page does not index text from its linked English PDF, and the UI/metadata disclose the asset language; and
- the normal Website build (20 pages), eight-language review build (153 pages), and isolated backend Release build succeed. Focused backend tests were added but not executed because the repository requires a separate explicit test request.
- a dependency-free generated-HTML parity check verifies all 133 localized route pairs for route output, document metadata, core semantic structures, and script-appropriate minimum content coverage, and rejects the obsolete condensed Arabic home page.
- fixed marketing-page copy now uses symmetric, contract-checked
  locale-owned files under `pageCatalogs/`
  selected through one locale lookup; page templates no longer embed locale
  copy branches, and locale-owned publication files contain only white-paper
  editorial records; and
- canonical product marks now live outside the locale catalogs in
  `website/src/i18n/brandTerms.ts`. `PSeq Clear-Signal Architecture™` remains
  unchanged in every locale, localized copy supplies only the surrounding
  grammar or an unmarked explanation, and RTL presentation isolates the Latin
  mark so its word and symbol order remain intact; and
- the multi-omics introduction now allows translated thesis headings to wrap,
  reduces the display scale for expanding LTR locales, gives Japanese an
  intentional four-line headline, and stacks the introduction before its
  columns become too narrow. Local browser checks at 1392 px confirm no title,
  copy, or card overlap for Spanish, French, German, Italian, and Japanese; a
  1024 px check confirms stacked content without horizontal overflow.

Implementation note: the pilot uses one typed route-pair registry and one
static catch-all route per localized locale instead of enabling Astro's framework-level
redirect/fallback behavior. This keeps the existing route tree and redirects
inert, supports explicit editorial slugs, and still produces ordinary static
HTML. Native Astro i18n routing may be reconsidered only if it can be proven
not to change the established unprefixed Website behavior.

Still required before production publication:

- named language, scientific, marketing, privacy/legal, and accessibility reviewers for every locale proposed for publication;
- human review and acceptance of every draft string and page, with source revisions and review dates recorded;
- browser/device, assistive-technology, visual, form, and deployed Preview acceptance;
- execution of the focused backend tests and an isolated Preview search reindex;
- production Vercel configuration, deployment, search reindex, and post-deploy SEO/search smoke checks; and
- changing a localized release status from `draft` to `published` only after every gate above passes for that locale.

## Outcome

Add reviewed, static localized versions of the public Astro Website while keeping the current `en-US` Website, URLs, generated assets, forms, search, feeds, SEO behavior, and deployment behavior intact.

The Website will eventually support:

| Product request | Canonical locale | URL prefix | Direction | Proposed language scope |
| --- | --- | --- | --- | --- |
| US English | `en-US` | none | LTR | Existing source and default locale |
| UK English | `en-GB` | `/en-gb` | LTR | UK spelling and terminology; use `en-GB`, not nonstandard `en-UK` |
| Spanish | `es` | `/es` | LTR | Neutral international Spanish unless a target market requires a regional locale |
| German | `de-DE` | `/de-de` | LTR | German for Germany |
| Japanese | `ja` | `/ja` | LTR | Use `ja`, not country code `jp` |
| Chinese | `zh-Hans` | `/zh-hans` | LTR | Simplified Chinese as the initial proposed Chinese locale |
| Arabic | `ar` | `/ar` | RTL | Modern Standard Arabic; confirmed as the first production translation and pilot locale |
| French | `fr` | `/fr` | LTR | Neutral French draft; added as the second review locale before production publication |
| Italian | `it` | `/it` | LTR | Standard Italian |

Locale identifiers will use BCP 47 language tags. URL segments will be lowercase and stable. Traditional Chinese (`zh-Hant`) is a distinct future product locale, not an alias of Simplified Chinese.

The Product Owner has selected Modern Standard Arabic (`ar`) as the first
translation. This intentionally front-loads the most demanding layout and
language boundary so the first production alternate proves the RTL architecture
rather than postponing it. French is now an additional draft review locale;
Arabic remains the first production pilot, and `en-GB` remains planned.

## No-disruption contract

The following requirements are release blockers:

1. Every existing unprefixed public URL remains the canonical `en-US` URL. The project must not move the current Website to `/en-us`, change existing slugs, or require a redirect for an existing URL.
2. With localization disabled, the built route set, status behavior, redirects, canonicals, sitemap, RSS feeds, `robots.txt`, `llms.txt`, forms, search, structured data, and visible content remain equivalent to the current production Website.
3. A browser language header alone never silently moves a visitor away from a URL they requested. Initial automatic detection offers the matching complete locale; it does not force a redirect.
4. An explicit visitor choice always wins over browser detection. A locale-prefixed URL always wins over both a stored preference and browser detection.
5. A locale is absent from production routes, navigation, `hreflang`, sitemap entries, search, and automatic suggestions until its required pages and shared user interface are translated, reviewed, and accepted.
6. The language selector remains hidden until at least one non-`en-US` locale is production-ready.
7. Draft or stale translations cannot cause a mixed-language production page. If a localized equivalent is unavailable, the selector may link to the English source with an explicit English label; it must not pretend the page is translated.
8. Held Website content under underscore-prefixed route or content locations remains held. Localization must not publish it indirectly.
9. The public Website remains a separately built and deployed static Astro application. Portal frontend conventions and dependencies do not cross into `website/` merely for reuse.

## Current baseline and risk inventory

The Website currently has these relevant characteristics:

- Astro 7 generates a static site with `trailingSlash: "never"` and a separate Vercel deployment.
- The current page tree, content collections, header, footer, forms, search interface, metadata, RSS feeds, and `llms.txt` assume one US-English locale.
- The root layout declares `lang="en-US"`; structured data and feeds also identify `en-US`.
- Navigation labels, validation messages, status messages, search text, date formatting, and page prose are embedded in components or English content files.
- The Website sitemap is also the input to the backend Website crawler.
- The backend Website search index has no locale field and currently uses English token filtering and stemming. Publishing Japanese, Chinese, Arabic, German, or Spanish pages before locale-aware indexing would mix languages and make several locales effectively unsearchable.
- White-paper PDFs are first-party publication assets but are not necessarily translated with their landing pages.

Before the first implementation change, capture a baseline manifest of all current public output, including:

- URL and status/redirect behavior;
- canonical, title, description, Open Graph, and structured-data fields;
- sitemap, RSS, `robots.txt`, and `llms.txt` output;
- public form fields, validation, success, and failure behavior;
- search requests and representative English search results;
- currently held routes and content that must remain absent; and
- a production-sized build duration and generated-output size.

The baseline becomes a regression fixture for the inert `en-US` phase and future locale releases.

## Target architecture

### Static locale routing

Use Astro's native i18n routing configuration and statically generate every published localized route. Keep `en-US` as the unprefixed default. A localized page has a separate stable URL, such as:

```text
/technology/pseq-discovery        en-US source and x-default
/en-gb/technology/pseq-discovery  en-GB
/es/technology/pseq-discovery     es
```

The implementation should introduce a typed locale registry under `website/src/i18n/` containing, at minimum:

- canonical locale tag and URL prefix;
- display name in the locale itself and an accessible English administrative name;
- text direction;
- publication state;
- fallback locale for authoring/preview only;
- date/number formatting locale; and
- search availability.

Use shared route helpers for localized URLs and alternate links. Do not concatenate locale prefixes independently across components.

The current route files remain the `en-US` entry points. Page presentation should be extracted incrementally into shared components or typed page models so the existing route and a localized static route render the same structure. Do not copy the entire route tree for each locale as the long-term architecture.

### Messages and fixed page content

Separate two kinds of translatable material:

1. Shared user-interface messages: navigation, footer, search, form labels, validation, feedback, accessibility text, and common actions. Store these in typed locale catalogs.
2. Page and publication content: headings, prose, metadata, calls to action, and editorial content. Keep these in content files or typed page data suited to editorial review.

The shared-interface catalog boundary is `website/src/i18n/catalogs/`: each
locale has its own file and must satisfy the shared `WebsiteMessages` contract.
Shared components retrieve the active catalog with `getMessages(locale)` and
must not contain parallel translated string literals. Fixed marketing-page
copy uses the parallel `website/src/i18n/pageCatalogs/{locale}.ts` files, which
must satisfy one `WebsitePageCatalog` contract and are selected through
`getPageCatalog(locale)`. Publication landing-page data and translation
workflow metadata remain separate editorial content; Arabic white-paper
preview records currently remain in `arabicPages.ts` pending their move into
the localized content-collection workflow.

The dependency-free implementation uses named placeholders and native
`Intl.PluralRules` behind catalog helpers. An ICU MessageFormat-compatible
library remains a future option if more complex grammar requires it; adding
that library remains a dependency decision requiring explicit approval.

Use native `Intl` APIs with an explicit active locale for dates and numbers. Preserve the present `en-US` output in default mode. Product names, Phaeno and PSeq marks, gene symbols, transcript/accession identifiers, units, user-entered data, URLs, and code-like values are not translated unless the content glossary explicitly says otherwise. Canonical marks are rendered from the shared brand-term registry; translators may localize their surrounding grammar or add a separate unmarked explanatory gloss, but must not translate, reorder, inflect, or move the trademark symbol within the mark.

### Content collections and translation identity

Existing content files remain `en-US` source records with their current slugs. Extend the content schema additively with:

- `locale`, defaulting current records to `en-US`;
- a stable `translationKey` shared by all language versions;
- translation status (`not_started`, `draft`, `review`, `published`, `stale`,
  or `withdrawn`);
- source revision or source-content hash;
- reviewer and review date; and
- optional PDF/file-language metadata.

Localized content may live beneath locale-specific subdirectories. Existing
`en-US` slugs remain unchanged; other locales may define an explicit reviewed
localized slug. Build-time validation must reject duplicate
locale/translation-key pairs and must exclude drafts from production.

Fallback to English is allowed in authoring preview, never as unlabeled mixed-language production content. When English source content changes, its translations become stale until reviewed against the new source revision. Stale required content blocks that locale's publication.

### Editorial content language management

Internationalization applies to every editorial/content collection, not only
fixed Website pages. The same model must cover:

- blog posts;
- white-paper landing pages and their downloadable files;
- press/media items;
- job openings;
- publication metadata, categories, tags, authorship, and related-content
  links; and
- future collection-driven Website content.

Treat one subject or publication as a content family and each language version
as a separately managed member of that family. A stable `translationKey`
connects the members; URLs or slugs do not establish translation identity.
Existing content families begin with `en-US` as their source locale, but the
model must permit future original content to be authored in another supported
locale.

Each content-language record needs independently reviewable fields for:

- locale and source locale;
- localized title, summary/excerpt, body, calls to action, and SEO/social
  metadata;
- explicit, stable localized slug;
- translation status (`not_started`, `draft`, `review`, `published`, `stale`,
  or `withdrawn`);
- editorial publication status and publication date;
- source revision/hash and translated-from revision/hash;
- translator/reviewer identity and review date;
- localized categories, tags, image alternative text, captions, and author
  biography where applicable; and
- linked asset language, version, checksum, media type, and review status.

The current English slugs must never change. A translated item may use a
reviewed localized slug, but that slug is stored explicitly and remains stable.
Language switching and related-content resolution use `translationKey`, not a
guessed slug. If a published localized slug changes, preserve its redirect
history.

Content publication and translation publication are separate decisions. A
source article may be published while one or more translations remain draft or
stale. A locale's blog, white-paper, media, or jobs listing shows only content
published for that locale. It must not silently insert English cards into a
German or Arabic listing. An optional, clearly labelled “Available in English”
section is a future product choice, not the default fallback.

Not every historical article must be translated before a locale launches.
Define a required launch corpus per locale, including conversion-critical and
evergreen content. Items outside that corpus may remain available only at their
source-language URL. Coverage reports must distinguish:

- complete and current translations;
- translations awaiting review;
- stale translations;
- source-only content; and
- content deliberately excluded from that locale.

#### Blog and news behavior

- Locale listing and archive pages contain only that locale's published posts.
- A translated post retains the content family's original publication date and
  may also record a translation publication/update date. The displayed policy
  must be consistent within a locale.
- Author identity is shared; author biography and role text may be localized.
- Related-post links select a published translation in the active locale. If
  none exists, omit the link rather than silently switching languages.
- Categories, tags, pagination labels, empty states, dates, and structured data
  use the active locale.
- Locale-specific feeds include only posts published in that locale.

#### White papers and downloadable assets

Manage the landing-page translation separately from the downloadable file:

- A translated landing page may temporarily link to an English PDF only when
  the download action clearly states the file language, for example “Download
  PDF (English).”
- A translated landing page must not imply that an English PDF is translated.
- A translated PDF is a distinct versioned asset with its own language,
  checksum, review state, and download metadata.
- Scientific, legal, regulatory, figure, table, caption, and accessibility
  content inside a translated PDF requires the same human review gate as the
  landing page.
- Updating the source PDF marks dependent translations stale until the
  translated assets are reviewed against the new source version.
- `hreflang` connects equivalent HTML landing pages. It must not advertise a
  translated PDF that does not exist.
- Download analytics record the requested landing-page locale and actual asset
  language so English-file fallback remains visible operationally.

#### Editorial workflow

The repository-backed content workflow, and any future CMS, must support this
sequence:

1. Create or update the source content and assign its content-family
   `translationKey` and source revision.
2. Select the locales requested for that content; absence from a locale is an
   explicit state, not an accidental missing file.
3. Create translation drafts without publishing routes, feeds, sitemap entries,
   alternate links, related-content links, or search documents.
4. Complete language, scientific, marketing, legal/privacy, and asset review as
   applicable.
5. Run build-time completeness, revision, slug, asset-language, metadata, and
   reciprocal-link validation.
6. Publish each approved language independently.
7. Mark dependent translations stale automatically when translatable source
   content or an attached source asset changes.
8. Support withdrawing one translation without removing the source or other
   translations, and withdrawing the entire content family when required.

Generate a build-time content-language matrix for reviewers. Production builds
must fail when a record marked `published` lacks required localized metadata,
references a missing asset, claims an incorrect asset language, or points to a
stale source revision.

### Auto-detection and visitor choice

Detection precedence is:

1. locale in the requested URL;
2. explicit stored visitor preference;
3. the browser's ordered language preferences;
4. `en-US` default.

Map regional variants to the closest supported locale using explicit rules; for example, `en-CA` falls back to `en-US`, `en-GB` selects UK English, `zh-CN` maps to `zh-Hans`, and unsupported languages fall back to `en-US`.

The safe initial experience is:

- on a visitor's first unprefixed visit, client-side detection may display a small accessible suggestion such as “View this site in Español?” only when that locale is fully published;
- accepting the suggestion or choosing a language in the selector navigates to the same localized route when available and stores a first-party functional preference cookie such as `phaeno_locale`;
- dismissing the suggestion is remembered so it is not repeatedly intrusive;
- declining or ignoring the suggestion leaves the requested page untouched; and
- crawlers receive deterministic content and are never redirected from browser-language inference.

After the suggestion flow has proven safe, a narrowly scoped Vercel Routing Middleware enhancement may redirect only a request for `/` when a valid explicit preference cookie already exists. It must not redirect deep links, act solely on `Accept-Language`, override a prefixed URL, or run broadly on assets/API paths. The middleware phase is optional and separately authorized.

The selector uses language names, not country flags. It must be keyboard accessible and must communicate when the equivalent page is unavailable.

## SEO, AEO, and discovery

Each published localized page must have:

- a self-referencing canonical URL;
- reciprocal `hreflang` links for every complete alternate;
- an `x-default` link to the existing unprefixed `en-US` page;
- correct document `lang` and `dir`;
- localized title, description, Open Graph values, and visible share text;
- `og:locale` and appropriate locale alternates;
- localized JSON-LD with the correct `inLanguage`; and
- a localized sitemap entry only when the route is actually published.

The Website sitemap should use Astro's i18n alternate-link support or an equivalently validated generator. Every locale variant must list itself and the same complete set of alternates. A partial translation must not appear as an alternate.

Preserve the existing root RSS feeds as `en-US`. Add a locale-specific feed only after that locale has a meaningful publication corpus and an editorial commitment to keep it current. Keep the current `/llms.txt` English-only initially; localized LLM-discovery files require a separate AEO decision so the present file and category logic do not change accidentally.

An English-only PDF does not become a localized document because its landing page is translated. The landing page must disclose the file language, and no nonexistent translated PDF may be advertised through alternate metadata.

No locale may launch until representative pages pass Google Search Console or equivalent preproduction inspection for canonical and `hreflang` correctness.

## Locale-aware Website search

Locale-aware search is a prerequisite for publishing non-English pages because the current crawler and English analyzer cannot safely index all planned languages.

The backend and crawler plan is additive:

1. Add locale metadata to generated HTML and carry it through crawling into each indexed page.
2. Add locale to the indexed-page persistence model and its uniqueness/scoping rules.
3. Add an optional locale parameter to the public search API. Omitting it must preserve current `en-US` behavior for compatibility.
4. Restrict results to the active locale by default. Do not merge duplicate translations into one result list.
5. Retain an English analyzer for English, add suitable analyzers for Spanish and German, and use tokenization/analyzers designed for Japanese, Simplified Chinese, and Arabic rather than forcing those languages through Latin-letter filtering.
6. Localize search controls, empty states, errors, result language, dates, and accessibility announcements.
7. Reindex and validate each locale independently. A failed localized reindex must not replace or corrupt the active English index.

If locale-aware search is not ready when a locale otherwise qualifies, that locale remains preview-only. Hiding search on the localized site is an exception requiring an explicit product decision and documentation; it is not the default shortcut.

## Arabic and layout resilience

Arabic support is a full right-to-left product capability, not only translated strings:

- set `dir="rtl"` at the document boundary for Arabic;
- migrate affected layout rules to logical CSS properties where needed;
- mirror directional navigation cues only when their meaning is directional;
- preserve non-directional scientific diagrams, product marks, numbers, gene symbols, and code-like content appropriately;
- verify bidirectional runs containing Latin scientific terminology;
- provide a font stack with complete Arabic glyph coverage without harming current Latin or CJK rendering; and
- test navigation, forms, validation, search, dialogs, focus order, mobile reflow, zoom, reduced motion, and screen readers in RTL.

Use preview-only pseudolocales during implementation:

- `en-XA` for expansion, truncation, and hardcoded-string detection; and
- `ar-XB` for bidirectional layout stress.

Pseudolocales must never appear in the production selector, sitemap, alternate links, analytics locale reporting, or search index.

## Translation and review governance

Before publishing any non-English locale:

- establish a glossary and do-not-translate list for company, platform, scientific, commercial, privacy, and legal terminology;
- identify a qualified human reviewer for the locale;
- require scientific review for scientific claims and terminology;
- require legal/privacy review for privacy, data-policy, cookie, and terms content;
- require marketing review for brand voice, calls to action, and metadata;
- record reviewer, review date, and source revision; and
- define ownership for keeping that locale current after launch.

Machine or AI translation may create a draft but must never publish automatically. Japanese, Chinese, and Arabic typography and line-breaking require native-language visual review. A language must not be advertised as supported while critical navigation, forms, validation, privacy/data-policy content, or core conversion pages remain unreviewed.

## Analytics and privacy

Track only the minimum needed to assess the rollout:

- requested locale, resolved locale, and locale source (`url`, `preference`, `browser`, or `default`);
- suggestion shown, accepted, or dismissed;
- selector use and unavailable-translation events;
- localized search usage and zero-result rate; and
- localized conversion/error rates compared with the English baseline.

Do not collect a browser's complete language list as analytics data. Treat the stored locale as a first-party functional preference and document its purpose and retention in the Website's privacy/cookie inventory before launch.

## Phased delivery

### Phase 0 — baseline and release guardrails

- Capture the current output and behavior manifest.
- Add explicit acceptance fixtures for held content and current redirects.
- Define per-locale required-route coverage and translation review owners.
- Define the required Arabic route/editorial launch corpus and Arabic review
  owners. Other locale variants do not block the Arabic foundation.

Exit: the current Website has a reproducible no-disruption baseline, with no runtime change.

### Phase 1 — inert `en-US` foundation

Implementation status: complete locally.

- Add typed locale configuration, route helpers, catalog interfaces, and default locale context.
- Keep shared UI copy in per-locale typed catalog files; components consume the
  catalog and never select translated strings themselves.
- Make layout, metadata, date formatting, shared chrome, and shared controls accept an explicit locale while continuing to render the current values.
- Add a build/publication manifest with only `en-US` enabled.
- Keep the selector and detection prompt absent.

Exit: generated default output matches the Phase 0 baseline; there are no new public routes or redirects.

### Phase 2 — preview and content workflow

Implementation status: partial. Review-only Arabic routes and additive content metadata are implemented; the reviewer-owned content matrix, glossary, and stale-source automation remain.

- Add preview-only pseudolocales and hardcoded-string detection.
- Add translation identity, status, source-revision, and review metadata.
- Add the content-language matrix and preview workflow for blogs, white papers,
  media, jobs, and linked assets.
- Establish glossary and review workflow.
- Exercise text expansion and RTL without publishing a locale.

Exit: a reviewer can inspect a complete preview locale without it leaking into production discovery.

### Phase 3 — localized search and metadata infrastructure

Implementation status: implemented locally and compile-verified. Focused tests and Preview reindex proof remain pending authorization.

- Implement locale-aware crawl/index/search behavior additively.
- Add localized metadata, canonical/alternate helpers, sitemap validation, and structured-data validation.
- Prove English compatibility and isolated locale reindexing.

Exit: `en-US` behavior remains intact and a preview locale is independently searchable.

### Phase 4 — Modern Standard Arabic pilot and RTL proof

Implementation status: draft preview implemented. Human translation/scientific/legal review, browser/accessibility acceptance, and production publication remain open.

- Translate and review the complete required route set in Modern Standard
  Arabic.
- Translate and review the approved Arabic editorial launch corpus and verify
  locale-scoped listings, feeds, assets, and related-content links.
- Verify Arabic tokenization/search, same-path switching, SEO alternates, forms,
  scientific bidirectional text, accessibility, mobile behavior, analytics, and
  the complete RTL acceptance criteria.
- Publish the selector only when Arabic is complete.

Exit: `ar` is the first production alternate, the complete RTL capability is
proven, and no existing English-US URL or behavior has changed.

### Phase 5 — auto-detection and explicit preference

Implementation status: the client-side suggestion and explicit preference are implemented for all seven enabled review locales. Browser acceptance remains; middleware is intentionally deferred.

- Add browser-language negotiation and the non-blocking first-visit suggestion.
- Add explicit preference storage and dismissal behavior.
- Validate bots, cache behavior, privacy documentation, and analytics.
- Optionally evaluate root-only cookie redirect middleware as a separately approved enhancement.

Exit: detection helps visitors without forcing navigation or destabilizing cached static content.

### Phase 6 — one locale at a time

French, Spanish, Simplified Chinese, Japanese, German (Germany), and Italian
have been added early as draft review locales by Product Owner request. After
the Arabic pilot, publication order remains a commercial decision. Each locale repeats
translation, scientific/legal/marketing review, search, SEO, accessibility,
performance, and rollback gates. The Arabic-first decision deliberately proves
the highest-risk directional layout boundary before the simpler LTR locales.

Exit per locale: all launch gates pass independently; a failure does not delay fixes or alter already published locales.

### Phase 7 — ongoing operations

- Block or withdraw stale localized routes when required source changes have not been reviewed.
- Monitor search quality, missing translations, broken alternate sets, conversions, errors, and performance by locale.
- Monitor editorial translation coverage, stale source revisions, missing
  locale assets, and source-only content by collection.
- Establish an emergency disable switch per locale that leaves `en-US` untouched.
- Review the glossary, translation freshness, legal pages, and locale ownership on a scheduled cadence.

## Acceptance criteria

### Default-site preservation

- All current unprefixed URLs, redirects, status codes, and held-content boundaries are unchanged.
- The `en-US` visible output and functional behavior are unchanged except for an explicitly accepted selector/suggestion addition after a second locale is complete.
- Existing external links and bookmarks require no migration.
- Root sitemap, RSS, `robots.txt`, `llms.txt`, forms, and English search remain valid.

### Locale behavior

- Direct prefixed links render deterministically without relying on a cookie or JavaScript redirect.
- URL locale, explicit preference, browser preference, and default precedence match the documented rules.
- Detection never redirects solely from `Accept-Language`.
- The selector switches to the equivalent page when one exists and handles an absent translation honestly.
- Unsupported or malformed locales fail safely to the normal Website behavior, without redirect loops.

### Translation completeness

- Required navigation, footer, forms, validation, accessibility text, privacy/data-policy content, metadata, search, and core pages are human-reviewed.
- No production page contains an accidental mix of fallback UI and localized content.
- Source revisions invalidate stale translations and build gates enforce their status.
- Blog, white-paper, media, job, and future collection listings contain only
  content published for the active locale.
- Every localized content item resolves through a stable `translationKey`, has
  complete localized metadata, and accurately declares linked asset language.
- Updating source prose or a source PDF makes dependent translations visibly
  stale and prevents accidental republication until review.
- Withdrawing one translation removes only that locale's routes, feeds, search
  records, alternates, and related-content links unless the entire content
  family is withdrawn.

### SEO and discovery

- Every localized page is indexable at one stable URL with a self-canonical.
- Alternate sets are reciprocal, self-inclusive, and include `x-default`.
- Sitemap, HTML metadata, Open Graph, JSON-LD, and declared language agree.
- Unpublished and pseudolocales are absent from all discovery surfaces.

### Accessibility and layout

- Locale selection and suggestion are operable and understandable by keyboard and screen reader.
- All locales pass WCAG 2.2 AA checks appropriate to the changed surfaces.
- Long German text, CJK line-breaking, Arabic bidirectional content, 200% zoom, mobile reflow, and reduced motion are verified.
- Arabic has end-to-end RTL acceptance rather than isolated screenshot approval.

### Search and forms

- Search is scoped to the requested locale and uses a suitable analyzer/tokenizer.
- Omitting the API locale retains current `en-US` compatibility.
- Contact/order forms localize labels, validation, status, and accessible announcements while preserving payload contracts.
- Backend error handling does not expose untranslated internal messages as localized user interface.

### Operations

- Each locale can be disabled without changing or redeploying English content beyond the normal static release process.
- A failed locale release has a documented rollback to the prior generated site.
- Cache keys and middleware rules cannot serve one locale at another locale's URL.
- Build duration, generated size, page performance, and error rates remain within agreed budgets.

## Verification matrix for implementation

| Layer | Required evidence |
| --- | --- |
| Build | Static build succeeds; default-route/output manifest comparison passes; no draft/held/pseudolocale route is generated |
| Unit | Locale parsing, negotiation precedence, regional mapping, route helpers, catalog completeness, translation freshness, and formatting |
| Content | Required-route and editorial-corpus coverage, translation-key uniqueness, source-revision status, per-locale listing/feed membership, asset-language accuracy, glossary, and reviewer evidence |
| Browser | Direct URLs, selector, suggestion/dismissal, stored preference, history/back behavior, no-script behavior, keyboard, mobile, zoom, and RTL |
| HTTP/cache | Representative `Accept-Language`, cookie, bot, asset, deep-link, and root requests; no loops or cache leakage |
| SEO/AEO | Canonical, reciprocal `hreflang`, `x-default`, sitemap, Open Graph, JSON-LD, RSS, robots, and unchanged English `llms.txt` |
| Search | Locale-isolated crawl/index/query, language analyzers, zero-result checks, English API compatibility, and safe reindex rollback |
| Forms | Localized client validation, API errors, success states, accessibility announcements, and unchanged request payloads |
| Visual | Pseudolocalization, text expansion, CJK fonts/line breaks, Arabic bidi/RTL, dark/light themes, and responsive layouts |
| Operations | Preview isolation, per-locale enable/disable, analytics, privacy inventory, deployment rollback, and production smoke checks |

Implementation verification should be batched at phase checkpoints. Adding Website test or i18n dependencies requires explicit approval because `website/` is an independent package root.

## Settled product decisions and remaining confirmations

Settled:

- Modern Standard Arabic (`ar`) is the first translation and production pilot.
- The Arabic pilot must prove complete RTL behavior, not only translated prose.
- French (`fr`) is the second implemented review locale but remains a draft.
- Spanish (`es`), Simplified Chinese (`zh-Hans`), Japanese (`ja`), German for
  Germany (`de-DE`), and Italian (`it`) are implemented as machine-assisted
  drafts for private review only.
- `en-GB` remains supported but will not be the first alternate.

The following defaults remain recommended and may be confirmed without asking
the Product Owner to choose technical mechanics:

1. Use neutral international Spanish (`es`) until a specific country market justifies `es-ES`, `es-MX`, or another regional variant.
2. Launch Simplified Chinese (`zh-Hans`) first. Treat Traditional Chinese (`zh-Hant`) as a separate future translation and review commitment.
3. Introduce a regional Arabic locale only for a demonstrated market need;
   shared Arabic content uses Modern Standard Arabic.
4. Keep first-party PDFs in their source language until separately translated
   and reviewed; clearly disclose file language on localized landing pages.
5. After the Arabic pilot, use `en-GB` as the next low-risk not-yet-implemented
   locale unless commercial priority selects another language.
6. Permit historical blogs and white papers to remain source-language-only
   unless they are included in a locale's approved launch corpus; never mix
   them silently into localized listings.

The review corpus for each of the seven localized locales is every currently
public static page, all four current white-paper landing pages, and all three
articles in the phased-sequencing blog series. Job listings remain empty
because no source items are currently public. Localized blog feeds and listing
membership are review-only until the article drafts pass the publication gates.
Translation-review ownership still must be assigned before publication. The
seven locale drafts require native linguistic, scientific, marketing,
privacy/legal, accessibility, and visual review; generated draft copy is not
publication-ready. Decisions for later locales may remain open without
blocking current review. Astro routing,
catalog design, middleware boundaries, search architecture, testing, and
deployment mechanics remain engineering decisions.

## Primary technical references

- [Astro internationalization routing](https://docs.astro.build/en/guides/internationalization/)
- [Astro sitemap internationalization](https://docs.astro.build/en/guides/integrations-guide/sitemap/#i18n)
- [Google: managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google: localized versions and `hreflang`](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Vercel Routing Middleware](https://vercel.com/docs/routing-middleware)
