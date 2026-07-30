# Phaeno Website agent guide

This guide applies to work under `website/` and supplements the repository
rules in `../AGENTS.md`.

## Product and deployment boundary

`website/` is the public Phaeno company Website copied from the former
standalone `phaeno-website` project. It serves prospects, customers, partners,
investors, candidates, and the scientific community. Keep the Product Owner
focused on audience, positioning, scientific and commercial messaging, brand
voice, claims, conversion goals, and customer journeys. Codex owns Astro,
component composition, responsive behavior, accessibility mechanics, metadata,
search, SEO, and other implementation details.

The Website is an Astro static application deployed independently to Vercel.
It is not part of the authenticated Portal frontend under `../frontend/`.
Anonymous Website API behavior is owned by
`../backend/app/Features/Website`; the Website must not acquire direct database
access or private Portal credentials.

## Start here

- Read `../AGENTS.md` and `../ai/README.md`.
- Read `README.md` for the local architecture, setup, and API boundary.
- Read `src/styles/design-system.css` and the existing layout/component
  patterns before changing visual design, typography, color, spacing,
  responsive behavior, or interaction.
- Read `../docs/plans/WEBSITE-API-CONSOLIDATION-PLAN.md` before changing the
  public API contract, public documents, search/crawler behavior, reCAPTCHA,
  Mailgun, contact/order intake, or deployment ownership.
- Read `../docs/plans/PUBLICATION-SEARCH-INDEXING-PLAN.md` before changing
  white papers, PDF-backed publications, publication routes, `llms.txt`,
  answer-engine optimization, sitemap participation, or PDF indexing policy.
- Prefer current source and generated output over older prose, and record any
  disagreement rather than silently choosing a new direction.

## Working rules

- Keep diffs narrow and reuse existing Astro page, layout, component, content
  collection, metadata, API-consumer, and style patterns.
- Treat `dist/`, `.astro/`, and `node_modules/` as generated or installed
  content, not source. Do not edit them to implement a feature.
- Use pnpm as the package manager. Do not add or update dependencies without
  the explicit scope required by the root guide.
- Use established semantic design tokens. Avoid one-off hard-coded brand
  colors or a second design system.
- Meet WCAG 2.2 AA, including keyboard access, focus visibility, semantic
  structure, names, contrast, target sizes, errors, and reduced motion.
- Keep pages responsive and preserve a clear reading order on narrow screens.
- Give every searchable page a meaningful title, description, and document
  type. Preserve stable heading IDs and the Markdown/MDX heading-processing
  behavior used by Website search.
- Treat hidden search titles, summaries, and keywords as presentation and
  ranking metadata, not destination evidence. An ordinary result must be
  supported by every query term in its visible heading or section text;
  approved first-party document source text is the only exception and must be
  labeled in the result.
- Keep scientific and commercial claims supportable. Escalate changes that
  alter the message, evidence, regulatory risk, or customer promise.
- Keep secrets out of source. Values prefixed with `PUBLIC_` are compiled into
  browser-visible assets and must never contain credentials.
- Preserve the public API envelope and versioned route contract. A contract
  change requires a short cross-app plan and corresponding backend and Website
  verification.
- Do not apply authenticated Portal record-management patterns to marketing
  pages unless the product need genuinely matches them.
- Do not stage, commit, deploy, or otherwise mutate Git unless explicitly
  asked.

## SEO and answer-engine optimization

Treat answer-engine optimization (AEO) as an extension of sound SEO and
accessible publishing, not as a separate content channel. Optimize for an
authoritative, useful public page that a person, search crawler, or retrieval
system can understand and cite without relying on hidden text, keyword
stuffing, or unsupported claims.

### Public discovery contract

- Use one indexable, self-canonical HTML landing page as the primary discovery
  and citation URL for each publication. Keep its title, summary, visible
  headings, topics, dates, representative image, internal links, Open Graph
  metadata, and JSON-LD accurate and mutually consistent.
- Put enough visible information on the landing page to answer what the
  publication covers and why it is relevant. For white papers, retain a useful
  abstract, key topics, contents, page count, and a descriptive link to the
  complete PDF. Do not copy the full PDF into hidden or duplicative HTML.
- Describe PDF-backed publications with truthful structured data that ties the
  Article to its landing page, stable Phaeno Website and Organization entities,
  and PDF `MediaObject`. Do not emit facts or full `articleBody` text that are
  not visible on the HTML page.
- Keep public canonical HTML landing pages in the XML sitemap. Under the
  landing-page-first policy, keep raw PDFs out of both the sitemap and
  `llms.txt`; the landing page exposes the PDF through a visible link,
  structured data, and the internal crawler's source metadata.
- Keep held content in underscore-prefixed Astro page directories. Do not
  rename a held directory, add navigation, deploy, submit for indexing, or
  otherwise publish it without explicit release approval.

### `llms.txt`

- Treat `/llms.txt` as an emerging, advisory discovery file, not a standardized
  crawler-control mechanism or a guarantee of ingestion, ranking, citation, or
  model training. It complements rather than replaces the sitemap,
  `robots.txt`, canonical links, structured data, and useful page content.
- Generate `dist/llms.txt` through `src/integrations/llmsTxt.ts` from the built
  public sitemap and each page's built title and description. Never hand-edit
  `dist/llms.txt`, create a competing `public/llms.txt`, or maintain a separate
  publication list.
- Do not add `llms.txt` itself to the XML sitemap. Only indexable canonical HTML
  routes belong in the generated file; redirects, `noindex` pages, unpublished
  routes, and static PDFs remain excluded.
- A published route must enter the sitemap and `llms.txt` through the normal
  production build. If those artifacts disagree, fix the route, metadata, or
  generator rather than patching generated output.

### Crawler and PDF policy

- Separate search visibility from model-training permission. `OAI-SearchBot`
  and comparable search crawlers support retrieval visibility; `GPTBot` and
  other training crawlers represent a different policy decision. Do not change
  crawler-specific access or training policy merely as an AEO tactic.
- Keep approved public landing pages and first-party publication PDFs
  crawlable through `robots.txt` and reachable without authentication,
  JavaScript challenges, or bot-mitigation failures. Crawler access does not
  guarantee that any external provider will ingest or cite a PDF.
- Serve `/white-papers/*.pdf` with the configured `X-Robots-Tag: noindex` while
  the HTML landing page remains the preferred external result. Do not also
  disallow those PDFs in `robots.txt`, because compliant crawlers must retrieve
  a resource to observe its HTTP indexing rule.
- Publish text-based, accessible PDFs with selectable text, an accurate
  document title, subject, keywords, language, logical reading order, tags,
  and bookmarks for major sections. Image-only PDFs require an explicit OCR
  decision and must not be assumed searchable.
- Preserve the internal one-result behavior: the Website crawler may extract
  bounded text from the first-party PDF, but Website search returns and ranks
  the HTML landing page rather than a second raw-PDF result. PDF extraction
  failure must degrade to landing-page-only indexing.
- Never claim that an LLM "reads the site" automatically. State precisely
  whether a crawler can retrieve the page or PDF, whether indexing/reindexing
  completed, and whether a particular answer system actually surfaced it.

## Verification

- Documentation only: validate links and paths and run `git diff --check`; an
  application build is normally unnecessary.
- Website route, content, metadata, style, or component change: from
  `website/`, run `pnpm build`.
- Search-sensitive change: inspect generated HTML, metadata, heading anchors,
  sitemap entries, and RSS output as applicable.
- AEO or publication release: also inspect generated `llms.txt`, canonical and
  structured-data identity, landing-page/PDF links, and the absence of raw PDF
  URLs from the sitemap and `llms.txt`.
- Verify deployed behavior separately from a successful local build. Confirm
  the landing page returns `200`, is indexable and self-canonical; the PDF
  returns `200` with `application/pdf` and the intended `X-Robots-Tag`; and
  `robots.txt`, the CDN, WAF, and rate limiting do not block approved search
  crawlers. Treat `403` and `429` responses as release failures to investigate.
- After an approved publication release, verify a completed Website reindex
  and representative abstract, topic, and PDF-only searches. Do not infer
  indexing from deployment health or crawler access alone.
- Public API consumer change: verify the Website request and the matching
  anonymous endpoint under `../backend/app/Features/Website`.
