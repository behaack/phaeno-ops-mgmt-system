# Operations and production-readiness boundary

## PSeq order-to-cash rollout boundary (2026-08-29)

The repository now contains additive, feature-flagged foundations for durable
invitation delivery, derived readiness, internal order staging, business roles,
audit-only/enforced dual control, governed PSeq final-result packages, POMS
accounts receivable, and owned attention queues. The owning plan records the
2026-08-29 additive release as complete. That dated release evidence is separate
from feature activation; the activation gates below remain open. The 2026-09-04
plan reconciliation did not redeploy or reverify production flag state.

Production activation requires a dedicated-staging acceptance run with
Commercial, Lab Operations, Scientific, Finance, security, and accessibility
signoff. It also requires Mailgun sender and webhook-signature validation, final
object-storage/scanner/retention configuration, adequate dual-control staffing,
restored-production-like migration plus forward-fix proof, backup/restore proof,
exact frontend/API source-SHA alignment, authenticated smoke testing, and an
approved rollback or forward-fix procedure. Result release is never
payment-gated.

This document records how the application operates in the current repository and what remains required before production activation. It is not a deployment runbook and does not select a hosting provider or production topology.

## Current runtime

| Component | Current implementation |
| --- | --- |
| Frontend | React 19 and TanStack Start, served by Vite in development and built as client plus SSR assets. |
| API | .NET 10 ASP.NET Core application. |
| Database | PostgreSQL through one EF Core `PSeqOperationsDbContext`. The current model maps 112 Commercial/current-flow and Lab-projection tables to `commercial_ops`, 30 Laboratory execution tables to `lab_ops`, two public Website intake tables to `website`, and migration history to `public`; applied migration state remains an environment-specific release check. |
| Authentication | Clerk-issued bearer JWTs; application authorization comes from internal users, active memberships, and capabilities. |
| Lab Operations | Feature-complete internal provider with additive Phaeno roles, operator APIs/workspace, receipt and accession, controlled execution, traceability, outsourced NGS sendouts, exceptions, scientific approval, and customer-safe Commercial projections. Production validation and activation remain incomplete. |
| Curated-data files | `IManagedFileStorage` adapts to the shared `IFileStorage` contract. Development uses local filesystem storage. Production currently selects a non-persisting `Disabled` adapter, so the API starts but file operations return HTTP 503. The S3 adapter is implemented but not configured or live-validated. |
| Order files | `IOperationalFileStorage` adapts to the shared `IFileStorage` contract. Development uses local filesystem storage. Production currently selects a non-persisting `Disabled` adapter, so the API starts but file operations return HTTP 503. The S3 adapter is implemented but not configured or live-validated. |
| File scanning | Environment scanner abstractions. Development can trust configured fixture files; production defaults do not. |
| PSeq accounts receivable | POMS-owned Customer billing/tax/terms snapshots, immutable invoice/PDF issue at job completion, receipt/import/allocation, aging, adjustments, and independently approved reconciliation behind `NativePSeqAccountsReceivable`. QuickBooks remains legacy/non-PSeq context only. |
| Relationship CRM | Not implemented. HubSpot is selected for the approved future lifecycle in `docs/plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md`. |
| Email and notices | Portal invitations use durable Mailgun attempts plus signed, idempotent delivery/permanent-failure webhooks behind `InvitationDelivery`. Production rejects incomplete Mailgun API/sender, public URL, or webhook-signing configuration; logging invitation delivery is Development/Test only. Invitation HTML and text are embedded, locale-named templates. Public Website contact/order templates use the same configured Mailgun account. |
| Public Website API | Anonymous `/api/v1/web-ops` search, database ping, contact, and order endpoints plus `/public` document hosting are implemented in Portal. Historical data and public traffic have not been cut over. |
| Background work | Hosted dispatchers retry invitation delivery, order integrations, order notifications, data-provisioning notices, and Lab-to-Commercial projection delivery. The historical governed PSeq worker processes only schedules without a policy snapshot. New governed releases use shared policy/completion-aware deadline admission; snapshot-backed warning/grace outboxes, concurrent checkpoints, stream revocation, general execution, and deletion activation remain incomplete. A hosted Website crawler rebuilds the Lucene index on its configured interval. |
| Help | Browser-bundled, audience-specific MDX and a validated metadata catalog. Dedicated authenticated documentation search and an independent Lucene volume are implemented locally, with packaged corpus validation and scoped facets. Deployment and hosted acceptance remain pending; see `docs/documentation-search-operations.md`. |
| Organization/user administration UI | Invitation acceptance and Phaeno organization list/detail, request, entitlement, invitation, membership, conversion, lifecycle, and User management workspaces use durable APIs. Invitations retain the person’s name and intended membership role. Phaeno invitations and user edits consolidate Platform administrator and additive Laboratory roles; pending Laboratory-role intent activates only on acceptance, while external administration remains organization-scoped. |

Phaeno Portal is the operational and commercial-source system of record. Its first-party CRM owns relationship and pipeline records, and its order workflows own the manual catalog, quotes, credit rules, and accounting source records. No ERP, accounting provider, third-party LIMS, or external CRM is connected to the running application; Laboratory execution is owned by the internal Lab Operations provider.

## Health and basic verification

- API health: `GET /api/health` returns the standard API envelope with service name and `healthy` status. This is application dial tone, not proof that PostgreSQL, Clerk, QuickBooks, Mailgun, reCAPTCHA, Website search/documents, storage, scanning, or background delivery is fully ready.
- Backend build and tests: `dotnet build backend/PSeq.Operations.slnx` and `dotnet test backend/PSeq.Operations.slnx`.
- Frontend checks from `frontend/`: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, and `pnpm run test:e2e` when full browser verification is requested.
- PostgreSQL reference journey: `backend/tools/PSeq.Operations.ReferenceJourney` exercises the curated-data baseline with rollback and isolated temporary storage.

The living backend, frontend, and E2E coverage boundaries are maintained in `docs/plans/BACKEND-TEST-PLAN.md`, `docs/plans/FRONTEND-TEST-PLAN.md`, and `docs/plans/E2E-TEST-PLAN.md`.

Local 2026-08-29 evidence: 13 focused order-to-cash backend tests and the full
backend suite (169 passed, 10 opt-in PostgreSQL tests skipped) passed; 8 focused
frontend tests, the zero-warning Release backend build, lint, type validation,
and the client/SSR/Nitro build passed; EF reported no model drift after the new
migration; and the staging operator script parsed successfully. The full
frontend suite has 54 passes plus four reproducible failures in the unchanged
Web Operations Radix-tab test. These local results do not satisfy restored-
database, provider, authenticated browser, dedicated-staging, or cross-
functional production-activation gates.

## Configuration ownership

Keep environment-specific values outside source control. `appsettings.Development.json`, `.env`, and `.env.*` are ignored local configuration files. Prefer environment variables, ASP.NET Core user secrets for local work, and the selected deployment platform's secret store for shared environments.

| Section or variable | Purpose | Production expectation |
| --- | --- | --- |
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection | Managed as a secret; TLS, backup, restore, and connection limits approved. |
| `Persistence` | Commercial, Laboratory, Website, and migration-history schemas plus the history table | Stable before migration execution; business schemas must be distinct from each other and from `public`. |
| `Clerk` | JWT authority/audience, Clerk API access, authentication branding, MFA, and recovery | Production API accepts only a Clerk Production issuer and `sk_live_` secret. Local development remains on Clerk Development. HTTPS metadata validation, Phaeno branding, paid-plan vendor-badge removal, required authenticator-app MFA and one-time backup codes, disabled SMS, and the Phaeno-admin recovery procedure must be verified in the production instance. |
| `Bootstrap` | One-time bootstrap link inputs | Disabled or cleared after the initial administrator is linked. |
| `Invitations` | Token lifetime, resend cooldown, public URL | Production deployment pins the public URL to `https://portal.phaenobiotech.com`; expiry and resend policy approved. |
| `EmailServiceSettings` | Mailgun transactional sender and signed invitation delivery/permanent-failure webhooks | Existing protected Mailgun domain sending key and verified sender/domain, official US or EU Mailgun API URL, `messages` resource, protected `PORTAL_MAILGUN_WEBHOOK_SIGNING_KEY`, delivery and failure monitoring. Before deployment, verify in the authenticated Mailgun dashboard that `delivered` and `permanent_fail` target the exact Portal invitation webhook URL. Deployment validates the existing runtime sending settings and atomically installs the signing key. API startup fails closed when these values are absent or malformed. |
| `PSeqOrderToCash` | Independent rollout flags, service-authenticated result pipeline, object-storage transfer targets, legacy retention-offset compatibility, and dual-control audit/enforcement | Enable additive slices independently. Keep dual control audit-only until staffing evidence; require a rotated service secret, approved storage/scanner endpoint, an active versioned File Management retention policy, and no production placeholder values. New releases no longer read the legacy four offsets. |
| `WebsiteApi`, `GoogleAuthSettings`, and `EmailServiceSettings` | Public origins/documents, technical brief, Google reCAPTCHA Enterprise, and Mailgun templates | Existing production credentials and document volume transferred through the secret/storage platform; CORS, rejection, templates, and PDF delivery verified. |
| `WebCrawlerSettings`, `WebSearchSettings`, and `ChronJobs:IndexWebsite` | Public-site crawl target, Lucene index path, and rebuild schedule | Durable writable index storage, successful initial crawl, monitoring, and representative search verified. |
| `WebsitePreviewSearch` | Protected branch crawl target, dedicated Preview Lucene path, Vercel automation bypass, proxy key, and rebuild schedule | Disabled by default; when activated, secrets remain server-side, the index uses its dedicated volume, direct unauthenticated access is denied, and production search remains unchanged. |
| `FileStorage` | Provider selection, local development root, and S3 bucket, region, key prefix, optional service URL, and path-style setting | Temporary state: `Provider=Disabled`, which permits startup but no file operations. Activation state: `Provider=S3`; bucket and prefix approved; SDK default credential chain uses a least-privilege identity or protected access keys; encryption, lifecycle, permissions, monitoring, and representative upload/download/delete behavior verified. Production refuses the Local provider. |
| `DataProvisioning` | Upload limit, synthetic policy, scanner, allowed kinds | Synthetic fixtures rejected; real file policy and trusted scanner approved. |
| `OrderManagement` | Upload limit, scanner, allowed kinds | Trusted scanner and real Customer/Partner file policy approved. |
| Manual accounting | POMS commercial catalog plus `/api/platform/order-accounting/journal-entries` and CSV export | Catalog ownership, date-range reconciliation, stable source-ID handling, general-ledger account mapping, tax treatment, posting procedure, duplicate prevention, and Finance ownership approved. |
| Future external CRM adapter | Provider/account identifiers, credentials, API, webhook verifier, and field mapping | Not present or required today. Before any activation: fresh product scope, field ownership, least-privilege access, non-production proof, webhook validation, reconciliation, monitoring, and rotation approved. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend Clerk instance | Vercel Preview uses the development `pk_test_` value. Vercel Production uses the `pk_live_` value matching the API's production Clerk configuration. |
| `VITE_API_BASE_URL` | Frontend API base URL | Points to the approved API origin or reverse proxy. |
| `VITE_USE_MOCK_SESSION` | Development mock session | Must not enable mock access in production. |

Never copy local passwords, Clerk secrets, QuickBooks credentials, Mailgun API or webhook-signing keys, webhook tokens, or connection strings into documentation, logs, audit events, support messages, or committed configuration. Rotate any credential that is accidentally shared.

## Database migrations

Committed migrations currently cover:

1. `InitialPSeqOperations`, the clean Commercial/current-flow baseline.
2. `AddLabOperationsFoundation`.
3. `AddLabProviderCommandReceipts`.
4. `CompleteLabOperations`.
5. `AddLabQcProjection`.
6. `EnforceLabLibraryLineage`.
7. `AddWebsiteApi`, generated for the `website` schema and not applied to a
   shared environment by the consolidation work.
8. `AddPSeqOrderToCashGapClosure`, additive invitation, readiness, roles,
   governed-result, native-AR, reconciliation, retention, and attention
   structures with historical-state backfills; not applied to a shared
   environment.

Use the repository-local EF tool manifest and commands documented in `README.md`. A migration committed or applied to one developer database is not proof that it ran in another environment. Before a shared-environment migration, record the target, backup/restore point, expected duration, application compatibility, verification query or smoke test, and rollback/forward-fix decision. Never apply a migration to shared, staging, or production data without explicit authorization.

## Governed retention processing activation

`PSeqOrderToCash:GovernedRetentionProcessing` defaults to false. It gates both the
new minute-interval checkpoint worker and dispatch of its queued notices. Enable
it only with governed results and Operations attention available. It does not
enable physical deletion. `Invitations:PublicBaseUrl` supplies the HTTPS Portal
origin for normal authenticated result-detail links; it must contain no credentials,
query, or fragment. Notices resolve current active Organization admins at dispatch,
without Department routing aliases. Review **Retention notices** in Operations and
retry failed records in the existing notification workspace after recovery.

Governed-results activation requires PostgreSQL `track_commit_timestamp=on`
before any governed download transactions begin. Startup refuses governed results
when this prerequisite is absent; admission also checks it before recording a
lease. This server setting requires a separately approved restart/configuration
change in a shared environment. It was tested on an isolated local cluster; the
existing development server remains unchanged with tracking off.

Admissions and successful completions retain their full transaction identity in
the same transaction as the source event. After commit, the API copies the actual
commit time into durable evidence. It verifies admission before opening storage;
completion commit time controls standard-deadline eligibility. Read paths and a
30-second reconciler recover observations lost after commit. Monitor errors for
`retention_commit_tracking_unavailable`, `retention_commit_evidence_unavailable`,
and the evidence identifier; these are backend recovery errors, not Retention
notices queue items. Check tracking, migration state, database logs, and the source
transaction promptly. PostgreSQL does not retain commit history indefinitely.
If the source proof is no longer available, escalate for an approved recovery;
do not substitute request timestamps, recreate a release, or change deadlines.
Cached verified evidence is preserved; missing historical evidence is not backfilled.

Local tests hold actual commits across standard/final cutoffs and verify recovery,
rollback, and denied admission before storage opens. Hosted startup, process
restart, database restart/failover, retention-history availability, configured
lease limits, browser/proxy streaming, mailbox delivery, provider cleanup, and
authenticated acceptance remain separate gates. Provider retry may repeat a
delivered email after an ambiguous acknowledgement; the database prevents
duplicate scheduled outbox rows.

## General Lab/Assembly retention enforcement

`OrderManagement:ReleasedDeliverableRetentionEnforcement` defaults to false.
Enable only after the commit-tracking, recovery, restored-database, and hosted
acceptance gates above are satisfied. The API requires commit tracking at startup
when either this switch or governed PSeq results is enabled. This switch enforces
individual and ZIP admission/completion plus active revocation; it does not
activate scheduled notices, physical cleanup, storage, or payment confirmation.

Snapshot-backed general releases use their original frozen dates. Previously
successful attempts without verified commit evidence cause controlled timing
unavailability; inventory those cases before activation and resolve them through
approved recovery. Historical releases without snapshots gain no new dates.
The observer and safe-error support process above apply to general downloads too.
General cutoff errors use `released_deliverable_retention_cutoff_reached`;
current-authority failures use `released_deliverable_access_unavailable`.

Validate both current Customer Lab and Partner Assembly file/ZIP paths through
the real browser/proxy/storage provider. Include a large ZIP revoked from another
serving instance, interrupted requests, real lease expiration, deadline crossing,
Partner payment hold, two Departments, and process/database restart recovery.
Local fixtures verify source behavior but do not close these hosted gates.

`OrderManagement:ReleasedDeliverableRetentionProcessing` separately enables the
minute-based general checkpoint worker and dispatch of its warning/grace outbox
rows. It defaults to false and requires general retention enforcement plus
`PSeqOrderToCash:AttentionOperations`; startup rejects incomplete activation.
Governed PSeq projections are excluded from this worker and retain their own
processing gate. Disabling either family's processing gate pauses its pending,
failed, and expired-claim dispatch while ordinary notifications continue.

Use the same HTTPS Portal-link and current Organization-admin recipient rules
above. General Lab links open the laboratory job; Assembly links open the assembly
request. Missing admins and failed provider delivery use the existing urgent
Retention notices queue and notification retry workspace, including interrupted
final delivery claims. Retry the original notice after correcting access or
delivery; no retry changes a frozen deadline or creates a new scheduled notice.
Late polling skips obsolete warnings and retains conditional grace and cutoff.
Queued notices describe their original deadline; the linked page shows current
availability. Mailbox/provider retry can duplicate delivery after an ambiguous
acknowledgement, even though scheduled outbox rows are de-duplicated.

Before shared activation, verify both families independently with actual admins,
a Department-only member, an inactive admin, both workflow links, and a provider
failure/retry. Confirm disabling general processing leaves governed notices and
ordinary notifications under their existing gates. Local fixtures use a fake
sender only; they do not establish mailbox delivery or hosted recovery.

## Durable delivery and recovery

- Notifications, provisioning notices, and Lab projection events use durable records and hosted dispatchers.
- A failed delivery remains visible with its error and retry state. Retry the existing record after correcting configuration or connectivity; do not recreate the order, grant, or notification to force delivery.
- Manual accounting source records are created transactionally with their billing boundary and keep stable IDs across repeated report downloads. Reconciliation must not rewrite immutable commercial or scientific snapshots.
- Tenant-safe timelines and messages must remain separate from internal retry details and investigation notes.

## Production activation gates

Production is not ready until all applicable gates are evidenced:

- hosting, domain, TLS, reverse-proxy, and network design;
- managed PostgreSQL sizing, encryption, backup, restore test, retention, and monitoring;
- approved deployment, migration, rollback or forward-fix, and release verification runbooks;
- production Clerk tenant, invitation URL, bootstrap closure, and authentication policy;
- connected, tenant-safe organization and user administration UI for durable invitation, membership, role, conversion, and lifecycle operations;
- production S3 bucket/configuration, least-privilege credentials, encryption,
  monitoring, representative API-proxied upload/download/delete proof, and
  malware scanning for curated-data and order files;
- approved scientific file kinds, Customer analyses, Partner assembly profiles, reagent offerings/prices, shipping rules, credit decisions, and quote validity;
- representative PSeq bench validation of Lab receipt, accession, protocol,
  material/equipment, library/batch, sendout, exception, review, and correction
  workflows, including approved minimum fields and operator responsibilities;
- validated barcode labels, printers, scanners, reprint controls, and degraded-
  mode procedures;
- approved external NGS provider services, identifiers, manifest/status
  exchange, custody expectations, returned-output handshake, and support
  ownership;
- Finance-approved manual journal-entry and invoice procedure, catalog ownership, date-range reconciliation, stable source-ID duplicate prevention, tax/account mapping, and operator acceptance;
- production migration and authenticated validation of the first-party CRM for
  Companies, Contacts, Leads, Opportunities, pipelines, Activities, Tasks,
  reporting, CRM-to-Portal handoffs, duplicate prevention, authorization, and
  operational ownership;
- Mailgun sender/domain and HMAC signature verification, locale-template review,
  delivery/permanent-failure monitoring, and retry ownership;
- Website historical-row copy with count/hash comparison, reCAPTCHA and
  Mailgun secret transfer, public-document/index mounts, CORS, search,
  technical-brief delivery, API-base/DNS or reverse-proxy switch, rollback
  window, and standalone API retirement;
- background-dispatcher monitoring and alerting for stale, failed, or repeatedly retried work;
- tenant-isolation, file-download, payment-release, accessibility, narrow-viewport, and authenticated database-backed browser journeys;
- successful execution of the opt-in PostgreSQL Lab provider/projection and
  Commercial-to-Lab handoff suites plus the remaining Lab API, frontend, and
  database-backed browser coverage in the living test plans;
- production data/content approval with no synthetic fixture or test-only file policy enabled;
- incident response, support escalation, audit access, privacy handling, and responsible operational owners.

Until these gates are complete, a passing local build or test suite demonstrates application behavior only; it does not authorize production activation.

## Still intentionally deferred

- A general shared-folder and file-version product outside the feature-owned file boundaries.
- A confidential Phaeno runbook delivery system; browser-bundled help must remain distributable.
- Deployment and hosted acceptance of documentation search; additional external guide locales.
- Any external CRM integration until a fresh adapter plan is explicitly
  approved, implemented, and production-validated.
- A third-party LIMS adapter and ownership cutover unless an approved future
  workflow establishes the need.
- Exceptional curated-package purge and general versioned-policy retention deletion. New governed PSeq releases use the shared frozen policy and now have durable checkpoints/outboxes plus independently verified access-revocation monitoring. Actual commit-time deadline ordering is verified locally. Hosted commit-tracking recovery, general notice mailbox acceptance, authenticated acceptance, and dedicated-staging deletion evidence remain open.

## Released-package cleanup and retained receipts

`OrderManagement:ReleasedDeliverableByteDeletion` defaults to false and remains
held in production with FileStorage disabled. Code deployment does not authorize
storage/scanner activation or physical deletion. Cleanup selects only enabled
retention families, takes the package lock used by admission, waits for active
leases, rechecks exact file ownership/scan state, and defers shared objects and
preservation/quarantine holds. Partial provider failures retain durable retry
state and retry the same immutable keys. Metadata and evidence are retained.

Phaeno platform administrators manage holds and link freshly approved reissues
from `/released-deliverables`; external receipts enforce active organization and
Department scope. Downloader audit is Organization-admin-only externally; hold
and reissue reasons stay Phaeno-only. New Lab snapshot lineage is frozen at
release; historical missing lineage is reported rather than backfilled. Assembly
receipts describe project-level output without inventing sample mapping.

Before cleanup activation, verify actual provider deletion/retry behavior,
reference/lease protection, quarantine stream termination, mailbox delivery and
hosted restart recovery in dedicated staging. A recorded local test or deployed
flag-off worker does not satisfy these activation gates.
