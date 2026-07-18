# Architecture

## System shape

This repository contains three independently built applications: the Portal
frontend, the Portal/API backend, and the public Phaeno company Website. The
Portal frontend and API share the account and tenant model; the public Website
is anonymous and uses only the explicitly public Website API contract.

```text
Browser
  -> React/TanStack frontend (`frontend`)
  -> Clerk authentication and bearer token
  -> ASP.NET Core API (`backend/app`)
Public Phaeno Website (`website`)
  -> Astro static site deployed independently to Vercel
  -> anonymous `/api/v1/web-ops` endpoints in the same ASP.NET Core API
  -> PostgreSQL through EF Core
  -> local managed-file storage in the current development implementation
  -> QuickBooks Online, Postmark, Mailgun, and Google reCAPTCHA through configured adapters
```

The Portal frontend, API, and public Website are separate build units. The root
`package.json` delegates common Portal frontend commands; the backend solution
lives at `backend/PSeq.Operations.slnx`; Website commands run from `website/`.

## Backend

The backend targets .NET 10 as a modular monolith:

- `modules/PSeq.Operations.Commercial/Accounts`: users, organizations,
  memberships, invitations, pure authorization policy, invitation-token logic,
  and the invitation-delivery port.
- `modules/PSeq.Operations.Commercial/Relationships`: Portal integration
  requests, organization service entitlements, and service-eligibility policy.
- `modules/PSeq.Operations.Commercial/DataProvisioning`: Phaeno source samples,
  managed-file metadata, immutable curated versions, exact-version grants,
  governance records, environment-neutral policy, deterministic manifest
  construction, and file/scanner/notification ports.
- `modules/PSeq.Operations.Commercial/OrderManagement`: QuickBooks catalog and
  commercial configuration records, Partner kit ordering and fulfillment,
  immutable request revisions and quotes, external download audit, commercial
  workflow/outbox/notification records, and environment-neutral QuickBooks and
  notification ports.
- `app/Features/Accounts`: HTTP endpoints/contracts, authenticated-actor lookup,
  EF-backed orchestration, Clerk/Postmark adapters, and bootstrap composition.
- `app/Features/RelationshipManagement`: HTTP contracts, EF mapping and
  orchestration, authenticated-actor enforcement, and API error translation.
- `app/Features/DataProvisioning`: HTTP contracts, EF mapping/orchestration,
  tenant authorization, environment configuration, local file storage,
  scanner implementation, Postmark adapter, and notification dispatch.
- `app/Features/OrderManagement`: HTTP/EF orchestration, QuickBooks/Postmark and
  hosted-dispatch adapters, plus the Commercial-owned customer lab-service,
  data-assembly, operational-file, and release records.
- `modules/PSeq.Operations.Commercial/LabOperations`: the Commercial-owned v1
  outbound Lab Operations contract. Its transport-neutral command,
  acknowledgment, projection, event-envelope, and provider-port types do not
  reference API infrastructure, EF, Laboratory entities, vendors, or the
  unresolved pipeline/file domain.
- `modules/PSeq.Operations.Laboratory/Domain`: Laboratory-owned work order,
  immutable authorization version, roles, specimen/accession and physical
  lineage, controlled protocols and execution, materials and equipment,
  libraries and batches, NGS sendouts/custody, exceptions, append-only events,
  scientific approval, and durable command-receipt/outbox records. Their EF
  mappings are explicit and have only intra-`lab_ops` foreign keys.
- `app/Features/LabOperations`: the API composition adapter implementing the
  Commercial-owned provider port over Laboratory entities. Identical command
  retries replay their durable outcome; unsafe amendments and cancellations
  require manual review rather than rewriting received or active work. The
  role-aware operator API and hosted outbox dispatcher compose Lab writes with
  Commercial-owned authorization, milestone, exception, timing, and permitted-
  QC projections without adding module references.
- `app/Features/Website`: the anonymous Phaeno Website contract, shared-context
  intake persistence, reCAPTCHA, Mailgun templates, public documents, sitemap
  crawler, scheduled index rebuild, and Lucene search.
- `Features/Health`: health endpoint.
- `Infrastructure/Api`: response envelope, metadata, error mapping, and response filter.
- `Infrastructure/Persistence`: the single `PSeqOperationsDbContext`, mappings, save interceptors, and PostgreSQL configuration.
- `Middleware`: API exception handling.

All `/api` failures should use the existing error envelope. Persistence applies auditing and optimistic concurrency centrally rather than in individual endpoints.

The API references Commercial, while Commercial does not reference the API or
Laboratory. Extracted account, relationship, data-provisioning, commercial
configuration, Partner kit, request-revision, quote, workflow, integration, and
notification rules, ports, and external download audit therefore remain usable
independently of the current HTTP, EF, Clerk, QuickBooks, and Postmark adapters.
The Lab Operations provider port follows the same dependency direction. Quote
acceptance creates the Commercial authorization and invokes the internal
provider in one serializable database transaction. Approved cancellation also
reaches Lab before Commercial commits the decision. Lab writes produce durable,
versioned events; the hosted dispatcher applies idempotent Commercial
projections and receipts. Ready for release and reviewer-permitted QC cross this
boundary, but no Lab transition creates or publishes a file.

The approved internal Lab Operations application scope is feature-complete in
the repository. That statement does not mean production-ready: representative
bench workflow, label/scanner and degraded-mode validation, database-backed Lab
journeys, external NGS operating details, deployment, and operational content
approval remain activation gates.

## Identity and authorization

Clerk is the external identity provider in the current code. The API validates Clerk JWTs and resolves provider plus subject to an internal `User`. Product authorization comes from active internal organization memberships; external identity claims do not replace tenant checks.

The current organization kinds are `Phaeno`, `Prospect`, `Customer`, and
`Partner`. A Prospect is a tenant phase that can convert in place to Customer or
Partner while retaining its organization id, memberships, and curated-data
grants. `Distributor` is not a separate product term.

Phaeno laboratory permissions are additive role assignments stored in
`lab_ops`: Operator, Supervisor, Protocol Administrator, Scientific Reviewer,
and Lab Operations Administrator. Platform administrators retain bootstrap
access. Customers and Partners never receive direct Lab workspace access;
their APIs read only Commercial-owned projections.

The first organization-data-provisioning slice includes a minimal Phaeno-only
source-sample registry. The registry holds internal sample metadata,
approved managed data attachments, ownership evidence, de-identification
evidence, and curation readiness. It is not a Customer lab accessioning system
or Partner data-assembly workflow.
Approved source files are uploaded directly through the portal's managed file
storage abstraction; the initial release has no external file-reference or
import integration. A complete ready source revision is immutable and is the
only revision eligible for a curated snapshot.

Implementation does not depend on a real sample artifact. Development and tests
use an explicitly synthetic fixture plus test-only file-kind policy. Production
rejects synthetic sources and starts without speculative approved scientific
file kinds; Phaeno must configure actual profile/file policy before publishing
real packages.

The EF mappings for this slice are included in the clean
`20260716220428_InitialPSeqOperations` baseline applied to the configured
Development database on 2026-07-16. Other environments retain their normal
explicit deployment and migration boundary.

`backend/tools/PSeq.Operations.ReferenceJourney` verifies the first slice against
PostgreSQL with authenticated application identities, request-scope tracking
resets, transaction rollback, and isolated temporary managed storage. Curated
manifests are stored as `jsonb`; publication therefore compares manifest JSON
semantically and separately verifies the deterministic SHA-256 checksum.

## Order management and commercial integration

Phaeno Portal is the operational source of truth for Customer laboratory work,
Partner reagent fulfillment, and Partner data assembly. There is no external
ERP or LIMS in the implemented architecture. QuickBooks Online is the only
commercial system and remains authoritative for billable items, estimates,
invoices, adjustments, tax, freight, discounts, balances, payment status, and
hosted payment links.

Order aggregates retain immutable input, quote, price, profile, result/output,
shipment, and commercial snapshots. Operational state, QuickBooks sync state,
payment state, and file-release state remain separate. Durable integration and
notification records are dispatched by hosted services and retried without
recreating the local order or duplicating the intended external document.

The current development implementation uses local operational file storage and
an environment scanner abstraction. Real production storage, malware scanning,
scientific analysis definitions, assembly profiles, Partner shipping rules,
QuickBooks credentials/webhooks, and notification configuration remain explicit
production-activation inputs rather than source-controlled defaults.

## Frontend

The frontend uses TanStack file routing with responsibility-based folders:

- `src/routes`: thin route modules.
- `src/features`: feature UI and workflow logic.
- `src/api`: HTTP clients and API integration.
- `src/components`: shared layout and reusable controls.
- `src/integrations`: framework and library setup.
- `src/lib`: small shared utilities.

TanStack Query owns server state. Axios is the HTTP transport. React Hook Form
and Zod own forms and validation. Implemented routes include the dashboard,
organization administration, Phaeno users, invitation acceptance, Phaeno data
provisioning and source workspaces, tenant Data Library, Customer lab services,
Partner reagent ordering, Partner data assembly, Phaeno order operations and
configuration, dedicated Phaeno Lab operations list/detail workspaces, and the
in-portal documentation system.

Invitation acceptance and the scientific, provisioning, order, and organization
administration workflows use connected API clients. The standalone user
administration screen still uses session-only mock data; it demonstrates the
intended authorization and UI boundary but is not a durable administration
client. Organization workspaces use the backend account APIs for durable
organization, request, entitlement, membership, and invitation changes.

User documentation is authored as portable MDX. Prospect, Customer, and Partner
content is stored by locale, with `en-US` as the only current locale;
Phaeno-only content may remain US English. The frontend registry owns audience,
locale, slug, parent topic, overview label, summary, section, order, and review
metadata. Phaeno Data Provisioning, Order Ops, and Lab Ops guides use one
expandable navigation level backed by independently routed MDX pages. The current
organization is the exclusive audience boundary for the offered guide set;
cross-audience routes are not exposed. Because the current corpus is compiled into
browser assets, it contains no confidential procedures. Future help search will
use a backend index with authenticated audience and locale filtering.

## Public Website

The public company Website is an Astro 7 static application under `website/`.
It uses React 19 islands, Tailwind 4, MDX/content collections, generated sitemap
and RSS routes, and the Phaeno design tokens and component rules in
`website/src/styles/design-system.css`. It is deployed to Vercel independently
from both the Portal frontend and the ASP.NET Core API.

The Website has no private tenant or database access. Browser-side search,
contact, non-binding order, reCAPTCHA, public-document, and database-ping flows
use the anonymous contract owned by `backend/app/Features/Website`. Any change
to that shared contract must be planned and verified across both directories.
Generated `dist`, `.astro`, and `node_modules` content is not canonical source.

## Configuration and deployment

- Backend database: `ConnectionStrings:DefaultConnection` /
  `ConnectionStrings__DefaultConnection`; the verified local Development
  database is `phaeno_ops`.
- PostgreSQL business schemas: Commercial/current-flow and Lab projection
  entities target `commercial_ops`; Laboratory execution entities target
  `lab_ops`; Website intake entities target `website`; no default schema is
  used.
- EF migration history: `public.__ef_migrations_history`.
- Migration checkpoint: the disposable Development database was rebuilt on
  2026-07-16 from `20260716220428_InitialPSeqOperations`, renamed to
  `phaeno_ops`, and extended by `20260716223048_AddLabOperationsFoundation`,
  `20260716225818_AddLabProviderCommandReceipts`,
  `20260716234233_CompleteLabOperations`,
  `20260716235343_AddLabQcProjection`, and
  `20260717000026_EnforceLabLibraryLineage`; `AddWebsiteApi` is generated but
  has not been applied as part of the code-consolidation work. The model
  contains no `portal` schema.
- External identity: `Clerk` configuration.
- Invitation delivery: Postmark when configured; logging sender otherwise.
- Data provisioning: `DataProvisioning` storage root, size limit, environment
  approved-file-kind map, synthetic-fixture policy, and scanner mode. Production
  defaults block synthetic content and configure no approved scientific kinds
  or trusted scanner.
- Order management: `OrderManagement` storage root, file-size limit,
  approved-file-kind map, and scanner mode.
- Commercial integration: `QuickBooks` environment, company/realm, OAuth, API,
  and webhook-verification settings. The HTTP adapter is used only when the
  required company and OAuth settings are present; otherwise local development
  uses the logging adapter.
- Public Website API: `WebsiteApi`, `GoogleAuthSettings`,
  `EmailServiceSettings`, `WebCrawlerSettings`, `WebSearchSettings`, and
  `ChronJobs:IndexWebsite`; production cutover also requires the public
  document volume, writable private index path, and the existing reCAPTCHA and
  Mailgun secrets.
- Frontend authentication and API routing: `VITE_CLERK_PUBLISHABLE_KEY`,
  `VITE_API_BASE_URL`, and the development-only `VITE_USE_MOCK_SESSION` switch.
- Portal frontend hosting output: the Vite build uses Nitro. Local production
  builds emit `.output`, while Vercel builds emit Build Output API assets,
  routing, and the SSR function under `.vercel/output`; `frontend/vercel.json`
  records the TanStack Start framework preset.
- Public Website API routing and reCAPTCHA: `PUBLIC_API_BASE_URL` and
  `PUBLIC_RECAPTCHA_SITE_ID`. These values are compiled into the public static
  site and must never contain secrets.
- Public Website deployment: the static output under `website/` is a separate
  Vercel deployment unit; adding it to this repository does not merge it into
  the Portal frontend deployment.
- Deployment is not yet an established production path. Current operational and
  activation boundaries are recorded in `docs/operations-readiness.md`; do not
  infer a target from the Phaeno Website or another repository.

## Authoritative references

- `AGENTS.md`: canonical repository working rules.
- `README.md`: setup, API envelope, and persistence overview.
- `website/AGENTS.md` and `website/README.md`: scoped public Website rules,
  setup, and API boundary.
- `docs/plans/AUTH-USER-SYSTEM-PLAN.md`: account-system decisions and remaining work.
- `docs/user-documentation.md`: help authoring, audience, locale, and search rules.
- `docs/operations-readiness.md`: current runtime and production-activation boundary.
- Current source and tests: final authority for implemented behavior.
