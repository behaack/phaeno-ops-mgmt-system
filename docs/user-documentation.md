# User documentation standard

The portal help system is authenticated product documentation. It explains current behavior in the context where a user works, and it is maintained with the feature code it describes.

## Audiences

| Audience | Purpose | Visibility |
| --- | --- | --- |
| Prospect | Review and accept approved no-charge Trials, submit authorized samples, download released results and granted curated data, and manage Prospect access. | Users working in a Prospect organization. |
| Customer | Review configured Lab Service prices or manual quotes, track samples, receive results, use assigned data, and manage the customer organization. | Users working in a Customer organization. |
| Partner | Order Kit bundles and prepare their included Assembly cases, use entitled Partner Lab services and assigned data, and manage the partner organization. | Users working in a Partner organization. |
| Phaeno | Operate customer and partner work, provision data, configure commercial workflows, and support users. | Users working in the Phaeno organization. |

## Current coverage baseline

Each supported audience has a maintained guide set. The corpus covers the implemented product as follows:

| Audience | Onboarding and access | Primary workflows | Data and commercial rules | Status and recovery |
| --- | --- | --- | --- | --- |
| Prospect | Getting started; organization and Department access | Approved Trial scope and acceptance, sample roster and shared shipping, result downloads; Data Library | Trial allowance, retention, RUO/no-PHI terms, exact-version grants, governance, and conversion continuity | Trial approval and submission gates, shipping, retention, grant, package, checksum, and access troubleshooting |
| Customer | Getting started; organization and Department access | Per-Job pricing, confirmed Sample type and kit delivery, physical kit receipt, one Sample ID/tube pair at a time, shipping, cancellation, and retained Trial history; earlier Jobs retain exact sample entry or CSV import | Scientifically governed results independent of payment; invoices, retention receipts, and curated Data Library | Job, changed price/scope review, custom-work requests, timing, pair/roster, invoice, release, retention, and access recovery |
| Partner | Getting started; organization and Department access | Reviewed Kit bundle purchases, independent included cases, input correction, partial shipment and replacement, entitled Lab Jobs and retained Trials | Negotiated and frozen scope, original Kit billing and Assembly credit, standard Lab pricing, curated Data Library and output retention | Draft recovery, immutable input revisions, deadline extensions, replacement lineage, timing, scan, payment-hold and output recovery; historical standalone workflows remain documented separately |
| Phaeno | Operations orientation; Company People, requests, access and Department administration | Complete CRM; per-order Intake; Trial configuration and lifecycle; native Finance; Data provisioning; Lab receipt, accession, transportation-kit assembly and inventory, reagent manufacturing, Assembly and scientific work | Staged readiness, roles, controlled protocols, supplier-product and reagent inventory units, named storage locations, lot QC, lineage, scientific approval and separate release, shipping specifications, retention, Partner credit, and immutable commercial records | Context-preserving queues, approved-request completion, invitations, Lab handoffs, receipt evidence/import recovery, release and retention, and unavailable connectors |

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

**Documentation** is available in the user menu on every screen size for Prospect, Customer, Partner, and Phaeno users. The help shell places the current organization's guide navigation in the shared far-left sidebar beneath the primary toolbar. It does not provide an audience selector or a redundant audience heading. Each guide link has a topic-specific icon.

Phaeno operational guides use one expandable level for **CRM**, **Data provisioning**, **Order operations**, and **Laboratory operations**. Each group contains an overview plus substantive workflow-specific guide pages. The active group opens automatically, and users may expand or collapse a group with its labeled disclosure button. Opening a group collapses the previously open group so only one documentation subject is expanded at a time. Do not add a second nesting level.

The sidebar is pinned by default on wide screens and can be unpinned to an edge tab; pin controls are omitted on narrow screens. Fine-pointer users may preview a wide, unpinned rail by approaching the left edge. Keyboard, click, and touch users open the same non-modal rail from the tab. On narrow or coarse-pointer layouts it stays open until the user chooses a guide, toggles the tab, or presses Escape; choosing a guide moves through normal route navigation.

The current MDX corpus is compiled into browser assets, so route and navigation filtering is a product-experience boundary, not a confidentiality control. Every bundled guide, including Phaeno guidance, must be safe to distribute and must never contain secrets or restricted internal evidence. If future Phaeno procedures require confidentiality, serve that content through an authenticated, backend-authorized endpoint rather than a public static asset.

Guide bodies load when a guide is opened, while the index, metadata and search
remain available independently. Loading displays a status message. If a guide
cannot load, **Reload guide** retries the page without removing its navigation.
This reduces initial help download size; static guides remain distributable.
Customer help labels, metadata, search feedback and access messages use the
Customer catalog. Other audiences remain US English; en-US is the only published
locale. Body translation, emails and generated-document coverage remain part of
the Customer localization inventory and are not implied by localized navigation.

The [Customer localization inventory](plans/CUSTOMER-LOCALIZATION-INVENTORY.md)
now records the complete current-English source boundary: UI/feedback, the eight
Customer MDX bodies, invitation templates, notices and printed/generated documents.
The final closure updates safe draft dismissal, assembly discovery and invoice
pagination in the affected audience guides. Additional-language body/email/document
translation and human review remain prerequisites for publishing another locale.

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

## Illustrated Phaeno task guides

Phaeno help uses short task walkthroughs alongside its reference guides. Keep
how-to guides under their owning workspace and feature them on the Phaeno help
home. Trial Projects belongs under Order operations; keep its stable direct link
and search identity without a separate Phaeno home card or Trial topic.

Use actual local UI captures with empty forms or explicitly fictional data for
screenshots. Review every pixel before adding an image to the browser-bundled
help: no credentials, personal data, real customer records, confidential details
or production identifiers. Do not generate or reconstruct a screen and describe
it as actual application behavior. Keep dated assets in
`frontend/public/docs/phaeno/screenshots/`, with capture notes in that directory.

Use normal Markdown images with descriptive alternative text and an illustrative
caption. Keep numbered, written callout explanations beside the image so the
task remains understandable without seeing it. The shared image renderer overlays
number markers using `documentation-screenshots.ts`; renderer logic, coordinates
and dimensions stay outside MDX. Keep the original captured pixels intact, check
the markers in light/dark themes and at narrow widths, and update the image and
callouts together when the UI changes. Screenshots of demonstrations do not
qualify physical workflows or scientific procedures.

Navigation, metadata and body changes alter the search corpus. Regenerate both
the packaged API corpus and UI version; release them together and refresh the
documentation index before claiming matching-version search acceptance.

## Internationalization

Customer UI messages are maintained in
`frontend/src/features/customer-i18n/customer-messages.generated.ts`; reachable
shared controls use the Customer locale context. Other audiences retain US
English. The development-only `VITE_CUSTOMER_PSEUDOLOCALE=true` review flag
expands Customer UI text without translating identifiers or entered data.
Run `node scripts/check-customer-messages.mjs` from `frontend/` after message
edits. No additional locale is published by this scaffolding or review flag.

Owner clarification, October 11, 2026: only Customer portal documentation and
its Customer-facing help shell require internationalization. `en-US` is the
only initially published locale; hide the language selector until another
Customer locale is complete, reviewed and tested. Content paths and registry
locale distinguish translated documents without putting metadata in MDX.

Translate the complete Customer guide set and Customer-facing shared shell
messages before advertising a locale. Use locale-aware date formatting, text
expansion, pseudolocalization and long-text checks. Scientific, clinical,
financial and regulatory translations require human review before publication.

Prospect, Partner and Phaeno documentation may remain US English. Preserve
existing locale-qualified Prospect/Partner paths and catalog entries; they do
not create a requirement to translate those audiences. Each audience remains
available only in its current organization context. Individual actions still
require their enforced role; access to a guide grants no permission. Never
present an unreviewed machine translation as authoritative. The Customer-only
closure scope is in [System gap closure](plans/SYSTEM-GAP-CLOSURE-PLAN.md).

## Maintenance workflow

For every user-visible change:

1. Identify whether Prospect, Customer, Partner, or Phaeno behavior changed.
2. Update each affected guide in the same change as the feature.
3. Describe only behavior that is implemented and available to that audience.
4. Keep permissions and commercial rules explicit. Do not imply that every member can perform administrator actions.
5. Update registry summaries and the review date for every guide actually reviewed. A metadata-only review is appropriate when source inspection confirms that the existing instructions remain correct.
6. Verify links, audience access, keyboard navigation, narrow layouts, and light/dark themes when the help UI changes.
7. Update `docs/plans/FRONTEND-TEST-PLAN.md` and `docs/plans/E2E-TEST-PLAN.md` when coverage changes.

For every new workflow, confirm that the affected audience can answer all of these questions from help:

- Who can perform the action, and in which selected organization and Department?
- What information is required, and what information must not be submitted?
- What are the normal steps, approvals, and immutable business records?
- Which operational, commercial, scan, and release statuses can appear?
- What can the user correct or retry, and what requires Phaeno support?
- What references are safe and useful when requesting support?
- Is Customer content and its shared shell fully translated and reviewed before a new Customer locale is considered complete?

Phaeno operational documentation may describe roles, queues, configuration, recovery steps, and safe support workflows. While it is browser-bundled, it must not become a credential store or contain confidential internal information.

## Workflow ownership and whole-corpus review

Use these owning surfaces consistently across overviews, task guides, and troubleshooting:

| User task | Owning surface |
| --- | --- |
| Public Website signups, demo inquiries and email recovery | Phaeno More → Website operations; Mailing list and Demo requests are sidebar queues. Platform administrators only. |
| External Company identity and People | CRM Company; global Contacts remains the cross-Company directory. |
| Company request decision and approved-work completion | Central CRM Requests; the Company tab links to the same records. |
| Each new Customer pricing request | Order intake → New Customer order; Customer self-service uses Lab services. |
| Reusable commercial and shipping rules | Order configuration; Company Departments & services for scope and service access; Finance for Customer billing. |
| No-charge Trial scope, approvals, and closure | Trial projects under Order ops; Trial configuration owns authorities and deliverables. |
| Exploratory research projects and experiment notebooks | R&D; shared team access requires the Researcher role or platform administration. Reference: R&D notebooks. Illustrated task guide: How to record an R&D experiment, with 14 annotated local captures. |
| Physical receipt, kit fulfillment, Assembly execution, and scientific review | Lab operations; commercial details link to the same work. |
| PSeq result publication | Result release package detail; scientific approval and file-retention authority remain distinct. |
| Customer operational results | The Job's Files and results; curated datasets remain in Data Library. |
| External packet, tube crosswalk, and dispatch | The shared shipment reached from the owning Job or Trial. |
| PSeq invoices, receipts, allocations, imports, and reconciliation | Finance; Partner manual accounting-source and Assembly-credit rules remain distinct. |

A cross-application change requires a corpus review, not only editing the guide named after the changed screen. Inspect all audience overviews, access guides, detailed procedures, statuses and recovery, related-guide summaries, and search metadata. Compare visible labels, role and Department boundaries, required fields, retained drafts, retry behavior, and terminal states against current source. An old link may redirect, but instructions should start from the current owning surface.

Document recovery only when the current interface provides the action. Distinguish retained historical records and real guarded retries from temporary administrative repair scripts, migrations, feature activation, and deployment procedures. Keep temporary repair inventories and production evidence out of user help. Do not describe a queued connector action as a completed invoice, payment, or synchronization.

After the review, validate registered identities, same-audience links and anchors, portable Markdown, summaries, and review dates. Regenerate and check the documentation corpus. Content-only edits do not require an application test suite; a help navigation or rendering change needs the scoped UI coverage described above.

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
- keep Customer screenshots aligned with the guide locale; other audiences may remain US English
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
