# User documentation standard

The portal help system is authenticated product documentation. It explains current behavior in the context where a user works, and it is maintained with the feature code it describes.

## Audiences

| Audience | Purpose | Visibility |
| --- | --- | --- |
| Prospect | Review and download explicitly granted curated data, understand governance actions, and manage Prospect access. | Users working in a Prospect organization. |
| Customer | Request laboratory services, track samples, receive results, use assigned data, and manage the customer organization. | Users working in a Customer organization. |
| Partner | Order reagents, request data assembly, use assigned data, and manage the partner organization. | Users working in a Partner organization. |
| Phaeno | Operate customer and partner work, provision data, configure commercial workflows, and support users. | Users working in the Phaeno organization. Phaeno users may also view Prospect, Customer, and Partner guides for support. |

## Current coverage baseline

Each supported audience has six maintained guides. The corpus covers the implemented product as follows:

| Audience | Onboarding and access | Primary workflows | Data and commercial rules | Status and recovery |
| --- | --- | --- | --- | --- |
| Prospect | Getting started; account and access | Data Library review and exact-version downloads | Version-specific grants, download history, governance, membership, and relationship transition | Grant, package, quarantine, retirement, checksum, organization, and access troubleshooting |
| Customer | Getting started; account and access | Laboratory requests, samples, quotes, and cancellations | Results, billing, credit/payment release, Data Library, and membership | Job, sample, quote, scan, payment, and result troubleshooting |
| Partner | Getting started; account and access | Reagent ordering and data assembly | Negotiated reagent pricing, job quotes, QuickBooks documents, Data Library, and membership | Reagent, shipment, assembly, scan, payment, and output troubleshooting |
| Phaeno | Operations orientation; organization and user administration | Data provisioning, governance, Customer lab, Partner reagent, and Partner assembly operations | Scientific and commercial configuration, QuickBooks synchronization, credit, quotes, and release rules | Queue triage and safe integration, file, release, notification, and access recovery |

This is the documentation baseline for currently implemented workflows. A feature is not documentation-complete when its behavior, permissions, status transitions, business rules, failure states, or support path have changed without a corresponding guide update. Production deployment procedures and confidential incident runbooks remain separate operational artifacts; browser-bundled help must not contain secrets or restricted evidence.

## Source and routes

- Prospect content: `frontend/src/content/docs/{locale}/prospect/*.mdx`
- Customer content: `frontend/src/content/docs/{locale}/customer/*.mdx`
- Partner content: `frontend/src/content/docs/{locale}/partner/*.mdx`
- Phaeno content: `frontend/src/content/docs/phaeno/*.mdx`
- Document metadata and indexable identity: `frontend/src/features/documentation/documentation-registry.ts`
- Help landing page: `/docs`
- Guide pages: `/docs/{audience}/{slug}`

The current organization determines the default and permitted audience. Prospect, Customer, and Partner users cannot use a direct URL to view another audience's guide. Phaeno users can switch among all four audience guide sets to support portal users.

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

Phaeno documentation is a system-owner-only surface and may remain US English. Phaeno staff viewing Prospect, Customer, or Partner guides see the localized external corpus and must not treat an unreviewed machine translation as authoritative.

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

## Future search

Help search is intentionally deferred. When introduced, the backend will index the MDX corpus and registry metadata rather than relying on a browser-only search index. Search results must be filtered by the caller's authenticated selected-organization audience before results or excerpts are returned.

The stable search identity is `{audience}/{locale}/{slug}` for Prospect, Customer, and Partner guides and `{audience}/{slug}` for US-English-only Phaeno guides. The initial indexable fields are locale, audience, slug, title, summary, section, review date, headings, and rendered plain text. The backend indexer should ignore code used for rendering and must not index unpublished plans, repository notes, or secrets.

The frontend should consume a tenant-safe search API, filter Prospect, Customer, and Partner results to the requested supported locale, and link results back to the canonical guide route. Search ranking, locale fallback, typo tolerance, synonyms, analytics, and re-indexing policy remain future implementation decisions.
