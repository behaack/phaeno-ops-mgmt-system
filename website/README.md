# Phaeno company Website

This directory contains the public Phaeno company Website, copied from the
standalone `phaeno-website` project into the Phaeno Portal repository. It
remains a separate application and deployment unit: Astro builds the static
site, Vercel serves it, and the Portal backend owns the anonymous Website API.

## Architecture and ownership

- **Framework**: Astro 7 with static output
- **Interactive islands**: React 19
- **Styling**: Tailwind 4 and the Phaeno tokens in
  `src/styles/design-system.css`
- **Content**: Astro content collections and MDX
- **Public origin**: `https://www.phaenobiotech.com`
- **Deployment**: Vercel, independently from the Portal frontend and backend
- **Anonymous API**: `../backend/app/Features/Website`
- **Portal application**: `../frontend/`

The Website does not connect directly to PostgreSQL or use authenticated Portal
data. Search, contact, non-binding order, public-document, and reCAPTCHA flows
consume the versioned anonymous Website API. The database-ping endpoint remains
available for explicit deployment and operational smoke checks; visitor page
loads do not call it. Changes to that contract must be planned and verified
across both the Website and backend.

## Project structure

```text
website/
├── public/
│   ├── images/
│   └── robots.txt
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   │   ├── blog/
│   │   ├── events/
│   │   ├── jobs/
│   │   ├── news/
│   │   ├── press/
│   │   ├── scientific_papers/
│   │   └── white_papers/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   ├── react-hooks/
│   └── styles/
├── AGENTS.md
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

Pages use shared layouts and SEO helpers, with page-specific content inside
semantic `main` and section landmarks. Reuse existing components and content
collection patterns rather than introducing parallel structures.

Ordinary public pages emit `WebPage` or `CollectionPage` JSON-LD linked to the
site-wide Phaeno `Organization` and `WebSite` entities. Article-like content
uses the corresponding article metadata helper so authorship, dates, images,
and canonical identity remain machine-readable.

## Design, content, and search

Read `src/styles/design-system.css` and the current layout and component
patterns before changing the visual system. The Website should make Phaeno's
scientific evidence clear and credible, use established semantic tokens, and
meet WCAG 2.2 AA.

Searchable pages need meaningful titles, descriptions, `phaeno:document-type`
metadata, and stable heading IDs. Route, metadata, heading, content, sitemap,
and RSS changes should be checked together because the Portal-owned crawler
indexes the deployed public site.

For ordinary pages, hidden search titles, summaries, and keywords may improve
candidate selection, result presentation, and ranking, but they cannot create
a result unless every query term is present in the visible destination
heading or section text. Approved first-party PDF-backed publications are the
only source-text exception; results that require the linked PDF are labeled
`Match in linked PDF`.

The production build generates `dist/llms.txt` from the URLs in the generated
sitemap and each page's built title and meta description. Do not hand-edit a
copy under `public/` or `dist/`. Redirects, `noindex` pages, and routes kept
unpublished with an underscore-prefixed page directory are excluded; when an
approved route becomes public and enters the sitemap, its current metadata is
included automatically on the same build.

The content collections under `src/content/` hold blog posts, events, jobs,
news, press releases, scientific papers, and white papers. Keep content schema
and route behavior aligned when adding or changing entries.

### Adding a PDF-backed white paper

White papers use their content entry ID as the stable slug. A new entry named
`example-white-paper.mdx` therefore requires its matching PDF:

- `public/white-papers/example-white-paper.pdf`

Its front-matter `image` must reference an existing local JPEG, PNG, SVG, or
WebP under `public/`. Reuse a shared image when multiple publications use the
same representative artwork; use a publication-specific asset when the cover
is distinct.

Do not add a PDF link to front matter. The shared publication helper derives
the landing page and PDF URLs and fails the build when the PDF or declared
image is missing or invalid. Supply title, summary, publication date, the local
image path, the PDF's current positive page count, at least one visible topic,
and at least one search keyword. Use optional
`dateModified` only when it is not earlier than `date`, and optional `version`
only when the publisher assigns one.

Keep the MDX landing content concise and useful under `Abstract`, `Key topics`,
and `Contents` headings. The complete publication remains in the PDF; do not
copy the full body, artificial page breaks, invisible keyword blocks, or
private review notes into the landing page.

Article and publication metadata must keep visible authorship, publication and
modification dates, topics, canonical URLs, and JSON-LD aligned with the page.
Do not add unpublished routes to `llms.txt` manually; the build-derived file is
the release boundary.

## Environment configuration

The browser-visible build currently expects:

- `PUBLIC_API_BASE_URL`: base URL for the versioned anonymous Website API
- `PUBLIC_RECAPTCHA_SITE_ID`: public reCAPTCHA site identifier
- `PUBLIC_SITE_REVIEW_MODE`: set to `true` only for private team Preview builds
- `PUBLIC_I18N_ARABIC_MODE`: leave unset or set to `off` for the normal English-only build; use `preview` only with review mode to generate the draft Arabic route set. `published` remains build-blocked until human review changes the repository release status.

The Vercel Function that proxies private Preview search also expects these
server-only Preview variables:

- `WEBSITE_PREVIEW_SITE_URL`: the stable protected Preview origin used for
  canonical URLs and the generated sitemap;
- `WEBSITE_PREVIEW_SEARCH_API_BASE_URL`: the versioned Portal API base URL;
- `WEBSITE_PREVIEW_SEARCH_API_KEY`: the shared proxy credential configured in
  the Portal API runtime.

Keep local values in ignored environment files or the deployment platform.
Never place secrets in a `PUBLIC_` variable because Astro includes those values
in browser assets.

## Private team previews

Use a Vercel Preview deployment from a short-lived Website branch or pull
request. The Vercel project must use `website/` as its root directory, protect
Preview deployments with Vercel Authentication, and set
`PUBLIC_SITE_REVIEW_MODE=true` only for the Preview environment. When a branch
is assigned a stable custom hostname, set `WEBSITE_PREVIEW_SITE_URL` to that
HTTPS origin so its canonical URLs and sitemap remain on the hostname crawled
by Preview search.

Review mode does not add a visible banner to existing English pages. Draft
Arabic pages add an explicit translation-review notice. Review mode prevents indexing,
omits Web Analytics, routes Website search through the authenticated
same-origin Preview proxy and its separate Portal-owned index, prevents
contact and demo submissions, avoids loading reCAPTCHA, and omits the
production-facing `llms.txt` artifact. Production must leave the flag unset or
set it to `false`; production must also leave `PUBLIC_I18N_ARABIC_MODE` unset or
set it to `off` until Arabic is approved. Use `vercel dev` rather than the standalone Astro dev server
when locally exercising the server-side Preview search function.
The complete operating and verification boundary is in
`../docs/plans/WEBSITE-TEAM-PREVIEW-PLAN.md`.

Shared interface translations live in `src/i18n/catalogs/{locale}.ts` and must
satisfy the catalog contract in `src/i18n/catalogs/types.ts`. Components use
`getMessages(locale)` and route helpers; do not add locale-specific text
conditionals to components. Fixed marketing-page copy lives symmetrically in
`src/i18n/pageCatalogs/{locale}.ts`, satisfies the shared page-catalog
contract, and is selected through `getPageCatalog(locale)`. Publication prose
stays in locale-owned editorial content data; Arabic white-paper preview
records currently remain in `src/i18n/arabicPages.ts` until they move into the
localized content-collection workflow.

## Commands

Use pnpm and run commands from `website/`:

| Command | Action |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the Astro development server at `localhost:4321` |
| `pnpm build` | Build the static production site to `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm astro -- --help` | Show Astro CLI help |

To build the Arabic review surface, set both
`PUBLIC_SITE_REVIEW_MODE=true` and `PUBLIC_I18N_ARABIC_MODE=preview` for that
build. The output stays static, `noindex`, submission-disabled, and separate
from the default English-only production output.

For route, content, metadata, style, or component changes, run `pnpm build` and
inspect the affected generated HTML, sitemap, `llms.txt`, and RSS output when
applicable.
For documentation-only changes, validate links and paths and run
`git diff --check`; an application build is normally unnecessary.

## Working rules

Read `AGENTS.md` in this directory in addition to the repository-level
`../AGENTS.md`. Do not add dependencies, change the public API contract,
deploy, stage, or commit without the scope and approval required by those
guides.
