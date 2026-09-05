# User documentation standard

The portal help system is authenticated product documentation. It explains current behavior in the context where a user works, and it is maintained with the feature code it describes.

## Audiences

| Audience | Purpose | Visibility |
| --- | --- | --- |
| Prospect | Review and download explicitly granted curated data, understand governance actions, and manage Prospect access. | Users working in a Prospect organization. |
| Customer | Request laboratory services, track samples, receive results, use assigned data, and manage the customer organization. | Users working in a Customer organization. |
| Partner | Order reagents, request data assembly, use assigned data, and manage the partner organization. | Users working in a Partner organization. |
| Phaeno | Operate customer and partner work, provision data, configure commercial workflows, and support users. | Users working in the Phaeno organization. |

## Current coverage baseline

Each supported audience has a maintained guide set. The corpus covers the implemented product as follows:

| Audience | Onboarding and access | Primary workflows | Data and commercial rules | Status and recovery |
| --- | --- | --- | --- | --- |
| Prospect | Getting started; account and access | Data Library review and exact-version downloads | Version-specific grants, download history, governance, membership, and relationship transition | Grant, package, quarantine, retirement, checksum, organization, and access troubleshooting |
| Customer | Getting started; account and access | Laboratory requests, samples, quotes, and cancellations | Results, billing, credit/payment release, Data Library, and membership | Job, sample, quote, scan, payment, and result troubleshooting |
| Partner | Getting started; account and access | Reagent ordering and data assembly | Negotiated reagent pricing, POMS job quotes, commercial source records, Data Library, and membership | Reagent, shipment, assembly, scan, payment-hold, and output troubleshooting |
| Phaeno | Operations orientation; organization and user administration | Commercial order intake and management; Data provisioning and governance; Lab receipt, accession, PSeq kit fulfillment, data assembly, and scientific execution | Laboratory roles, protocol control, lineage, materials, equipment, sequencing sendouts, scientific readiness, commercial catalog, manual accounting report, released-deliverable retention configuration, credit, quotes, and release rules | Queue triage and safe accounting, projection, file, release, notification, and access recovery |

This is the documentation baseline for currently implemented workflows. A feature is not documentation-complete when its behavior, permissions, status transitions, business rules, failure states, or support path have changed without a corresponding guide update. Production deployment procedures and confidential incident runbooks remain separate operational artifacts; browser-bundled help must not contain secrets or restricted evidence.

The current Phaeno corpus documents the feature-complete internal Lab
Operations workflow and its Commercial release boundary. It is application
help, not a validated laboratory SOP, label/scanner qualification record,
external NGS provider runbook, or evidence of production activation.

## Source and routes

- Prospect content: `frontend/src/content/docs/{locale}/prospect/*.mdx`
- Customer content: `frontend/src/content/docs/{locale}/customer/*.mdx`
- Partner content: `frontend/src/content/docs/{locale}/partner/*.mdx`
- Phaeno content: `frontend/src/content/docs/phaeno/*.mdx`
- Canonical metadata and taxonomy: `frontend/src/features/documentation/documentation-catalog.json`
- Typed metadata and component mapping: `frontend/src/features/documentation/documentation-metadata.ts` and `documentation-registry.ts`
- Help landing page: `/docs`
- Guide pages: `/docs/{audience}/{slug}`

The current organization determines the only permitted audience. Prospect, Customer, Partner, and Phaeno users cannot use a direct URL to view another audience's guide.

Customer, Partner, and Prospect guides call the application **Portal**. Phaeno
guides call the internal application **POMS**, meaning **Phaeno Operations
Management System**. Do not use the retired shared UI name "Phaeno Portal" in
audience-facing help.

**Docs** is a primary menu-bar destination on wide screens and moves into the user menu with other primary navigation on narrow screens. The help shell places the current organization's guide navigation in the shared far-left sidebar beneath the primary toolbar. It does not provide an audience selector or a redundant audience heading. Each guide link has a topic-specific icon.

Phaeno operational guides use one expandable level for **Data provisioning**, **Order operations**, and **Laboratory operations**. Each group contains an overview plus substantive workflow-specific guide pages. The active group opens automatically, and users may expand or collapse a group with its labeled disclosure button. Opening a group collapses the previously open group so only one documentation subject is expanded at a time. Do not add a second nesting level.

The sidebar is pinned by default on wide screens and can be unpinned to an edge tab; pin controls are omitted on narrow screens. Fine-pointer users may preview a wide, unpinned rail by approaching the left edge. Keyboard, click, and touch users open the same non-modal rail from the tab. On narrow or coarse-pointer layouts it stays open until the user chooses a guide, toggles the tab, or presses Escape; choosing a guide moves through normal route navigation.

The current MDX corpus is compiled into browser assets, so route and navigation filtering is a product-experience boundary, not a confidentiality control. Every bundled guide, including Phaeno guidance, must be safe to distribute and must never contain secrets or restricted internal evidence. If future Phaeno procedures require confidentiality, serve that content through an authenticated, backend-authorized endpoint rather than a public static asset.

## Authoring profile

MDX is used as a portable Markdown-compatible source format. Content files should contain headings, paragraphs, lists, links, tables, block quotes, and inline or fenced code only when code is genuinely useful to the user.

Keep the following outside MDX:

- imports, exports, JSX, and one-off components;
- API calls, feature flags, permissions, or other application logic;
- routing, layout, styling, and navigation behavior;
- document title, audience, slug, summary, section, order, and review date;
- secrets, credentials, tokens, connection details, or production-only identifiers;
- customer-confidential information, protected health information, and internal incident or investigation notes.

This profile keeps the content portable to another MDX renderer or a future standalone documentation site without coupling the help corpus to the current frontend framework.

## Internationalization

Prospect, Customer, and Partner documentation is internationalization-enabled. `en-US` is the only initially published locale, and the language selector remains hidden until another locale is complete, reviewed, and tested. The content path and registry locale distinguish translated documents without putting locale-specific metadata in MDX.

Translate the entire guide set and shared help-shell messages for an external audience before advertising a locale. Use locale-aware date formatting, design for text expansion, and include pseudolocalization and long-text checks. Scientific, clinical, financial, and regulatory translations require human review before publication.

Phaeno documentation is a system-owner-only surface and may remain US English. Prospect, Customer, and Partner contexts use the localized external corpus and must not treat an unreviewed machine translation as authoritative.

## Maintenance workflow

For every user-visible change:

1. Identify whether Prospect, Customer, Partner, or Phaeno behavior changed.
2. Update each affected guide in the same change as the feature.
3. Describe only behavior that is implemented and available to that audience.
4. Keep permissions and commercial rules explicit. Do not imply that every member can perform administrator actions.
5. Update the registry review date for every materially revised guide.
6. Verify links, audience access, keyboard navigation, narrow layouts, and light/dark themes when the help UI changes.
7. Update `docs/plans/FRONTEND-TEST-PLAN.md` and `docs/plans/E2E-TEST-PLAN.md` when coverage changes.

For every new workflow, confirm that the affected audience can answer all of these questions from help:

- Who can perform the action, and in which selected organization?
- What information is required, and what information must not be submitted?
- What are the normal steps, approvals, and immutable business records?
- Which operational, commercial, scan, and release statuses can appear?
- What can the user correct or retry, and what requires Phaeno support?
- What references are safe and useful when requesting support?
- Does the Prospect, Customer, or Partner content require translation before a new locale is considered complete?

Phaeno operational documentation may describe roles, queues, configuration, recovery steps, and safe support workflows. While it is browser-bundled, it must not become a credential store or contain confidential internal information.

## Future visual documentation

Add screenshots to workflow guides after the corresponding screens and
responsive behavior have stabilized. Screenshots should clarify spatial,
state-dependent, or multi-step interactions; they should not be added merely
to repeat labels already stated in the guide.

The future implementation should:

- capture the current Portal UI from deterministic seeded scenarios rather
  than customer, production, or confidential operational data;
- use a documented canonical viewport and theme, with additional narrow-screen
  or alternate-theme images only when the workflow materially differs;
- crop to the smallest useful region and use restrained callouts when the
  relevant control or status is not otherwise clear;
- provide meaningful Markdown alternative text and an adjacent caption, while
  keeping every instruction understandable without the image;
- keep localized external-audience screenshots aligned with the guide locale
  when the visible UI contains translatable text;
- store image assets beside the documentation corpus under a predictable
  audience, locale, guide, and screen-state naming convention;
- record the source route, scenario, viewport, theme, and capture date so an
  image can be reproduced rather than manually approximated;
- refresh or remove an image whenever the documented workflow, visible labels,
  permissions, status presentation, or responsive layout changes; and
- verify referenced assets, image loading, captions, alternative text, narrow
  layouts, and light/dark readability as part of documentation coverage.

Begin with the mature Data Provisioning, Order Operations, and Laboratory
Operations guides. Prioritize overview, queue triage, detail workspace, and
exception-recovery screens that benefit from visual orientation. Do not block
documentation completeness on a screenshot while a screen is still changing;
accurate prose remains the required source of truth.

## Documentation search and metadata

The help center uses a dedicated authenticated backend search endpoint at
`GET /api/documentation/search`. Its corpus, Lucene index, options, rebuilds and
operational endpoints are separate from both public and preview Website search.
The active internal user and selected organization's active membership determine
the only permitted audience. Audience/locale filters apply before ranking,
excerpts, totals and facets. Browser-bundled guides remain distribution-safe;
metadata is not a confidentiality boundary.

Maintain `frontend/src/features/documentation/documentation-catalog.json` alongside
the MDX files. Each guide retains its audience, locale, slug, title, summary,
navigation group, parent, order and review date, and adds controlled topics,
workflows, content type, task keywords, aliases, related guide identities and
publication status. Stable taxonomy IDs have localized labels. Optional role
labels describe procedures and never grant rights. Related guides stay in the
same audience and locale. Existing one-level sidebar groups remain intact.

The stable identity is `{audience}/{locale}/{slug}` for external guides and
`{audience}/{slug}` for Phaeno. Phaeno's source locale remains null; its index uses
US English. Only published registered guides are indexed. Unknown taxonomy,
duplicate identities, invalid dates, broken relationships, deeper/cyclic parents,
source escapes and executable MDX fail publication validation.

When adding a guide, also register its MDX component against its canonical
identity in `documentation-registry.ts`; generation validates this mapping.

After guide or catalog edits, run `pnpm docs:generate` from `frontend/`. This emits
the reviewed `backend/app/Documentation/corpus.json` and frontend corpus version.
Keep both generated artifacts with the source change. `pnpm docs:check` verifies
that they are current. Frontend production builds regenerate their version;
API release preparation independently validates the entire artifact before
packaging it. The API needs neither Node nor frontend files at runtime.

Rendering and extraction share `frontend/scripts/documentation-markdown.mjs` for
heading anchors. Search matches title, heading, summary, body, taxonomy labels and
authored terminology. It returns one result per guide with a matching section,
escaped highlights and distinct-guide facet counts. Two-character abbreviations
such as QC work; broad fuzzy matching and AI answers are not included.

Users can browse topics, filter by workflow/guide type and follow related guides.
Search text, filters and page are preserved in `/docs/search` URLs. Organization
or department changes cancel previous requests and clear prior-context results.
An index outage is shown separately from no matches; corpus mismatch offers a
refresh and guide browsing. See [the operations runbook](documentation-search-operations.md)
and [the owning plan](plans/PORTAL-DOCUMENTATION-SEARCH-PLAN.md) for release and
verification boundaries.
