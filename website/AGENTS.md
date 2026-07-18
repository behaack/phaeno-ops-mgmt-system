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

## Verification

- Documentation only: validate links and paths and run `git diff --check`; an
  application build is normally unnecessary.
- Website route, content, metadata, style, or component change: from
  `website/`, run `pnpm build`.
- Search-sensitive change: inspect generated HTML, metadata, heading anchors,
  sitemap entries, and RSS output as applicable.
- Public API consumer change: verify the Website request and the matching
  anonymous endpoint under `../backend/app/Features/Website`.
