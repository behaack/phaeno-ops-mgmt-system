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
data. Search, contact, non-binding order, database-ping, public-document, and
reCAPTCHA flows consume the versioned anonymous Website API. Changes to that
contract must be planned and verified across both the Website and backend.

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

## Design, content, and search

Read `src/styles/design-system.css` and the current layout and component
patterns before changing the visual system. The Website should make Phaeno's
scientific evidence clear and credible, use established semantic tokens, and
meet WCAG 2.2 AA.

Searchable pages need meaningful titles, descriptions, `phaeno:document-type`
metadata, and stable heading IDs. Route, metadata, heading, content, sitemap,
and RSS changes should be checked together because the Portal-owned crawler
indexes the deployed public site.

The content collections under `src/content/` hold blog posts, events, jobs,
news, press releases, scientific papers, and white papers. Keep content schema
and route behavior aligned when adding or changing entries.

### Adding a PDF-backed white paper

White papers use their content entry ID as the stable slug. A new entry named
`example-white-paper.mdx` therefore requires these matching public assets:

- `public/white-papers/example-white-paper.pdf`
- `public/images/media/white-papers/example-white-paper.{png|jpg|jpeg|svg|webp}`

Do not add a PDF link to front matter. The shared publication helper derives
the landing page and PDF URLs and fails the build when either required asset is
missing or does not follow the convention. Supply title, summary, at least one
author, publication date, the local image path, the PDF's current positive page
count, at least one visible topic, and at least one search keyword. Use optional
`dateModified` only when it is not earlier than `date`, and optional `version`
only when the publisher assigns one.

Keep the MDX landing content concise and useful under `Abstract`, `Key topics`,
and `Contents` headings. The complete publication remains in the PDF; do not
copy the full body, artificial page breaks, invisible keyword blocks, or
private review notes into the landing page.

## Environment configuration

The browser-visible build currently expects:

- `PUBLIC_API_BASE_URL`: base URL for the versioned anonymous Website API
- `PUBLIC_RECAPTCHA_SITE_ID`: public reCAPTCHA site identifier

Keep local values in ignored environment files or the deployment platform.
Never place secrets in a `PUBLIC_` variable because Astro includes those values
in browser assets.

## Commands

Use pnpm and run commands from `website/`:

| Command | Action |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start the Astro development server at `localhost:4321` |
| `pnpm build` | Build the static production site to `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm astro -- --help` | Show Astro CLI help |

For route, content, metadata, style, or component changes, run `pnpm build` and
inspect the affected generated HTML, sitemap, and RSS output when applicable.
For documentation-only changes, validate links and paths and run
`git diff --check`; an application build is normally unnecessary.

## Working rules

Read `AGENTS.md` in this directory in addition to the repository-level
`../AGENTS.md`. Do not add dependencies, change the public API contract,
deploy, stage, or commit without the scope and approval required by those
guides.
