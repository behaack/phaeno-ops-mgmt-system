# Public Website internationalization plan

- Status: proposed; planning only
- Owner: Product Owner
- Technical owner: Codex
- Last updated: 2026-08-07

## Authorization boundary

This document does not authorize implementation. It does not authorize a dependency change, Website or backend code change, translation purchase or publication, Vercel configuration change, search reindex, deployment, or test execution. Each implementation phase requires an explicit request and must preserve the no-disruption contract below.

## Outcome

Add reviewed, static localized versions of the public Astro Website while keeping the current `en-US` Website, URLs, generated assets, forms, search, feeds, SEO behavior, and deployment behavior intact.

The Website will eventually support:

| Product request | Canonical locale | URL prefix | Direction | Proposed language scope |
| --- | --- | --- | --- | --- |
| US English | `en-US` | none | LTR | Existing source and default locale |
| UK English | `en-GB` | `/en-gb` | LTR | UK spelling and terminology; use `en-GB`, not nonstandard `en-UK` |
| Spanish | `es` | `/es` | LTR | Neutral international Spanish unless a target market requires a regional locale |
| German | `de` | `/de` | LTR | Standard German |
| Japanese | `ja` | `/ja` | LTR | Use `ja`, not country code `jp` |
| Chinese | `zh-Hans` | `/zh-hans` | LTR | Simplified Chinese as the initial proposed Chinese locale |
| Arabic | `ar` | `/ar` | RTL | Modern Standard Arabic as the initial proposed Arabic locale |

Locale identifiers will use BCP 47 language tags. URL segments will be lowercase and stable. Traditional Chinese (`zh-Hant`) is a distinct future product locale, not an alias of Simplified Chinese.

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

Use an ICU MessageFormat-compatible catalog implementation when implementation is authorized so pluralization, parameters, and Arabic grammar are modeled rather than assembled from fragments. Adding that implementation is a dependency decision and therefore requires explicit approval at implementation time.

Use native `Intl` APIs with an explicit active locale for dates and numbers. Preserve the present `en-US` output in default mode. Product names, Phaeno and PSeq marks, gene symbols, transcript/accession identifiers, units, user-entered data, URLs, and code-like values are not translated unless the content glossary explicitly says otherwise.

### Content collections and translation identity

Existing content files remain `en-US` source records with their current slugs. Extend the content schema additively with:

- `locale`, defaulting current records to `en-US`;
- a stable `translationKey` shared by all language versions;
- translation status (`draft`, `review`, or `published`);
- source revision or source-content hash;
- reviewer and review date; and
- optional PDF/file-language metadata.

Localized content may live beneath locale-specific subdirectories while preserving the source slug. Build-time validation must reject duplicate locale/translation-key pairs and must exclude drafts from production.

Fallback to English is allowed in authoring preview, never as unlabeled mixed-language production content. When English source content changes, its translations become stale until reviewed against the new source revision. Stale required content blocks that locale's publication.

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
- Confirm the proposed market variants (`es`, `zh-Hans`, and Modern Standard `ar`).

Exit: the current Website has a reproducible no-disruption baseline, with no runtime change.

### Phase 1 — inert `en-US` foundation

- Add typed locale configuration, route helpers, catalog interfaces, and default locale context.
- Make layout, metadata, date formatting, shared chrome, and shared controls accept an explicit locale while continuing to render the current values.
- Add a build/publication manifest with only `en-US` enabled.
- Keep the selector and detection prompt absent.

Exit: generated default output matches the Phase 0 baseline; there are no new public routes or redirects.

### Phase 2 — preview and content workflow

- Add preview-only pseudolocales and hardcoded-string detection.
- Add translation identity, status, source-revision, and review metadata.
- Establish glossary and review workflow.
- Exercise text expansion and RTL without publishing a locale.

Exit: a reviewer can inspect a complete preview locale without it leaking into production discovery.

### Phase 3 — localized search and metadata infrastructure

- Implement locale-aware crawl/index/search behavior additively.
- Add localized metadata, canonical/alternate helpers, sitemap validation, and structured-data validation.
- Prove English compatibility and isolated locale reindexing.

Exit: `en-US` behavior remains intact and a preview locale is independently searchable.

### Phase 4 — `en-GB` pilot

- Translate and review the complete required route set in UK English.
- Verify same-path switching, SEO alternates, forms, search, accessibility, and analytics.
- Publish the selector only when `en-GB` is complete.

Exit: `en-GB` is the first production alternate without changing any existing English-US URL.

### Phase 5 — auto-detection and explicit preference

- Add browser-language negotiation and the non-blocking first-visit suggestion.
- Add explicit preference storage and dismissal behavior.
- Validate bots, cache behavior, privacy documentation, and analytics.
- Optionally evaluate root-only cookie redirect middleware as a separately approved enhancement.

Exit: detection helps visitors without forcing navigation or destabilizing cached static content.

### Phase 6 — one locale at a time

Recommended technical risk order is `es`, `de`, `ja`, `zh-Hans`, then `ar`; commercial priority may change the order. Each locale repeats translation, scientific/legal/marketing review, search, SEO, accessibility, performance, and rollback gates. Arabic launches last in this risk-based order because it validates the complete RTL capability.

Exit per locale: all launch gates pass independently; a failure does not delay fixes or alter already published locales.

### Phase 7 — ongoing operations

- Block or withdraw stale localized routes when required source changes have not been reviewed.
- Monitor search quality, missing translations, broken alternate sets, conversions, errors, and performance by locale.
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
| Content | Required-route coverage, translation-key uniqueness, source-revision status, glossary and reviewer evidence |
| Browser | Direct URLs, selector, suggestion/dismissal, stored preference, history/back behavior, no-script behavior, keyboard, mobile, zoom, and RTL |
| HTTP/cache | Representative `Accept-Language`, cookie, bot, asset, deep-link, and root requests; no loops or cache leakage |
| SEO/AEO | Canonical, reciprocal `hreflang`, `x-default`, sitemap, Open Graph, JSON-LD, RSS, robots, and unchanged English `llms.txt` |
| Search | Locale-isolated crawl/index/query, language analyzers, zero-result checks, English API compatibility, and safe reindex rollback |
| Forms | Localized client validation, API errors, success states, accessibility announcements, and unchanged request payloads |
| Visual | Pseudolocalization, text expansion, CJK fonts/line breaks, Arabic bidi/RTL, dark/light themes, and responsive layouts |
| Operations | Preview isolation, per-locale enable/disable, analytics, privacy inventory, deployment rollback, and production smoke checks |

Implementation verification should be batched at phase checkpoints. Adding Website test or i18n dependencies requires explicit approval because `website/` is an independent package root.

## Product decisions to confirm before Phase 1 implementation

These defaults are recommended so planning can proceed without asking the Product Owner to choose technical mechanics:

1. Use neutral international Spanish (`es`) until a specific country market justifies `es-ES`, `es-MX`, or another regional variant.
2. Launch Simplified Chinese (`zh-Hans`) first. Treat Traditional Chinese (`zh-Hant`) as a separate future translation and review commitment.
3. Use Modern Standard Arabic (`ar`) for shared marketing content; introduce a regional Arabic locale only for a demonstrated market need.
4. Keep first-party PDFs in their source language until separately translated and reviewed; clearly disclose file language on localized landing pages.
5. Use `en-GB` as the low-risk first locale, followed by commercial-priority rollout constrained by the per-locale launch gates.

Before implementation, the Product Owner needs to confirm only the market/language scope and translation-review ownership. Astro routing, catalog design, middleware boundaries, search architecture, testing, and deployment mechanics remain engineering decisions.

## Primary technical references

- [Astro internationalization routing](https://docs.astro.build/en/guides/internationalization/)
- [Astro sitemap internationalization](https://docs.astro.build/en/guides/integrations-guide/sitemap/#i18n)
- [Google: managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google: localized versions and `hreflang`](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Vercel Routing Middleware](https://vercel.com/docs/routing-middleware)
