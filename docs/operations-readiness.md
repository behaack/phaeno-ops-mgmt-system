# Operations and production-readiness boundary

## Repository implementation and rollout evidence

The repository implements first-party CRM, durable invitation delivery, derived
readiness, internal order staging, business roles, dual-control review, governed
PSeq final-result packages, POMS accounts receivable, Trial Projects, and owned
attention queues. Independent runtime flags and configuration govern activation
of the applicable order and retention features. Implementation, local verification,
historical deployment evidence, and current hosted acceptance are separate facts.

The [PSeq order-to-cash plan](plans/PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md)
records its 2026-08-29 additive release. The
[Website consolidation plan](plans/WEBSITE-API-CONSOLIDATION-PLAN.md#phase-4-observe-and-retire)
records the completed July public cutover and standalone-runtime retirement.
The [September review closure](plans/REVIEW-GAP-CLOSURE-2026-09-05.md) records
local implementation, migrations, and verification for the later recovery work.
This document reconciliation performs no deployment, shared migration, live
provider delivery, or current production flag/configuration verification.

Production activation requires a dedicated-staging acceptance run with
Commercial, Lab Operations, Scientific, Finance, security, and accessibility
signoff. It also requires Mailgun sender and webhook-signature validation, final
object-storage/scanner/retention configuration, adequate dual-control staffing,
restored-production-like migration plus forward-fix proof, backup/restore proof,
exact frontend/API source-SHA alignment, authenticated smoke testing, and an
approved rollback or forward-fix procedure. Governed PSeq and Trial scientific
result release is independent of invoice balance, credit and payment; Partner
workflows retain their separate commercial rules.

This document records current repository behavior and the evidence required for
the feature being activated. It complements the owning plans and release tooling;
it does not replace an approved environment-specific deployment or incident runbook.

## Current runtime

| Component | Current implementation |
| --- | --- |
| Frontend | React 19 and TanStack Start, served by Vite in development and built as client plus SSR assets. |
| API | .NET 10 ASP.NET Core application. |
| Database | PostgreSQL through one EF Core `PSeqOperationsDbContext`, with Commercial/current-flow and Lab projections in `commercial_ops`, Laboratory execution in `lab_ops`, Website intake/delivery/control in `website`, and migration history in `public`. Use the complete [database ERD](database-erd.md) and [EF snapshot](../backend/app/Migrations/PSeqOperationsDbContextModelSnapshot.cs) for current entities, fields, keys and relationships; applied migration state is environment-specific. |
| Authentication | Clerk-issued bearer JWTs; application authorization comes from internal users, active memberships, and capabilities. |
| Lab Operations | Feature-complete internal provider with additive Phaeno roles, operator APIs/workspace, receipt and accession, controlled execution, traceability, outsourced NGS sendouts, exceptions, scientific approval, and customer-safe Commercial projections. Production validation and activation remain incomplete. |
| Curated-data files | `IManagedFileStorage` adapts to shared `IFileStorage`, with Local development, Disabled, and S3 providers implemented. Production rejects Local. The recorded production hold uses Disabled, which permits startup but returns HTTP 503 for file operations; inspect the target's current configuration before rollout. S3 provisioning and hosted provider acceptance remain separate gates. |
| Order files | `IOperationalFileStorage` uses the same provider contract and environment boundary, while retaining its own file ownership, scanning, authorization and release rules. A healthy API with Disabled storage is not evidence of usable file delivery. |
| File scanning | Environment scanner abstractions. Development can trust configured fixture files; production defaults do not. |
| PSeq accounts receivable | POMS-owned Customer billing/tax/terms snapshots, immutable invoice/PDF issue at job completion, receipt/import/allocation, aging, adjustments, and independently approved reconciliation behind `NativePSeqAccountsReceivable`. QuickBooks remains legacy/non-PSeq context only. |
| Relationship CRM | Implemented first-party Companies, Contacts, Leads, Opportunities, pipelines, Activities, Tasks, reporting, administration, and controlled Company requests. CRM is standalone-first; HubSpot runtime integration is not implemented or required. See [CRM](plans/CRM-PLAN.md) and [standalone commercial lifecycle](plans/STANDALONE-COMMERCIAL-LIFECYCLE-PLAN.md). |
| Email and notices | Portal invitations use durable Mailgun attempts plus signed, idempotent delivery/permanent-failure webhooks behind `InvitationDelivery`. Production rejects incomplete invitation Mailgun/sender, public URL or webhook-signing configuration. Website notices use their own transactional intent, leased attempts, bounded retries and administrator recovery with the configured Mailgun templates. Website provider acceptance is not inbox-delivery confirmation and does not consume invitation webhook events. |
| Public Website API | Portal owns anonymous `/api/v1/web-ops` search, database ping, contact and order endpoints and `/public` documents. Public traffic/data cutover and old-runtime retirement are recorded as completed historical operations; the new durable Website notification schema and controls still require their own authorized target rollout. |
| Background work | Hosted workers dispatch invitation, Website, order and provisioning notices and Lab-to-Commercial projections. Governed and general released-package retention have implemented snapshot checkpoints, notice outboxes, verified commit evidence, stream revocation, cleanup retries, holds and reissue lineage. Processing, enforcement and physical deletion retain independent activation gates described below. Public and protected-preview Website crawlers have separate index configuration and schedules. |
| Help | Browser-bundled, audience-specific MDX and a validated metadata catalog. Dedicated authenticated documentation search and an independent Lucene volume are implemented locally, with packaged corpus validation and scoped facets. Deployment and hosted acceptance remain pending; see `docs/documentation-search-operations.md`. |
| Organization/user administration UI | Invitation acceptance and Phaeno organization list/detail, request, entitlement, invitation, membership, conversion, lifecycle, and User management workspaces use durable APIs. Invitations retain the person’s name and intended membership role. Phaeno invitations and user edits consolidate Platform administrator and additive Laboratory roles; pending Laboratory-role intent activates only on acceptance, while external administration remains organization-scoped. |

Phaeno Portal is the operational and commercial-source system of record. Its
first-party CRM owns relationship and pipeline records, and its order workflows
own the commercial catalog, quotes, credit rules, native PSeq AR and accounting
source records. The repository's implemented workflows require no connected ERP,
accounting provider, third-party LIMS or external CRM; Laboratory execution uses
the internal Lab Operations provider.

## Health and basic verification

- API health: `GET /api/health` returns the standard API envelope with service name and `healthy` status. This is application dial tone, not proof that PostgreSQL, Clerk, Mailgun, reCAPTCHA, Website search/documents, storage, scanning, or background delivery is fully ready.
- Backend build and tests: `dotnet build backend/PSeq.Operations.slnx` and `dotnet test backend/PSeq.Operations.slnx`.
- Frontend checks from `frontend/`: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, and `pnpm run test:e2e` when full browser verification is requested.
- PostgreSQL reference journey: `backend/tools/PSeq.Operations.ReferenceJourney` exercises the curated-data baseline with rollback and isolated temporary storage.

The living backend, frontend, and E2E coverage boundaries are maintained in `docs/plans/BACKEND-TEST-PLAN.md`, `docs/plans/FRONTEND-TEST-PLAN.md`, and `docs/plans/E2E-TEST-PLAN.md`.

Historical local 2026-08-29 evidence: 13 focused order-to-cash backend tests and the full
backend suite (169 passed, 10 opt-in PostgreSQL tests skipped) passed; 8 focused
frontend tests, the zero-warning Release backend build, lint, type validation,
and the client/SSR/Nitro build passed; EF reported no model drift after the new
migration; and the staging operator script parsed successfully. The full
frontend suite at that checkpoint had 54 passes plus four reproducible failures
in the then-unchanged Web Operations Radix-tab test. This is a dated checkpoint,
not the current test status. Later focused and full-suite results, browser/Axe
evidence and local migration checks are recorded in the
[September review closure](plans/REVIEW-GAP-CLOSURE-2026-09-05.md#local-evidence)
and the living test plans. Local results do not satisfy restored-
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
| Website email processing control | Database-backed pause/resume state, version, actor, timestamp and required reason | Apply the control migration before the new API. The initial state is running (`IsPaused=false`); an administrator can pause durably across API instances/restarts. This is an operational control, not an environment secret or a substitute for rollout approval. |
| `WebCrawlerSettings`, `WebSearchSettings`, and `ChronJobs:IndexWebsite` | Public-site crawl target, Lucene index path, and rebuild schedule | Durable writable index storage, successful initial crawl, monitoring, and representative search verified. |
| `WebsitePreviewSearch` | Protected branch crawl target, dedicated Preview Lucene path, Vercel automation bypass, proxy key, and rebuild schedule | Disabled by default; when activated, secrets remain server-side, the index uses its dedicated volume, direct unauthenticated access is denied, and production search remains unchanged. |
| `FileStorage` | Provider selection, local development root, and S3 bucket, region, key prefix, optional service URL, and path-style setting | Recorded activation hold: `Provider=Disabled`, which permits startup but no file operations. Verify actual target state. S3 activation requires approved bucket/prefix, a least-privilege identity or protected access keys, encryption, lifecycle, permissions, monitoring and representative upload/download/delete proof. Production refuses Local. |
| `DataProvisioning` | Upload limit, synthetic policy, scanner, allowed kinds | Synthetic fixtures rejected; real file policy and trusted scanner approved. |
| `OrderManagement` | Upload limit, scanner, allowed kinds | Trusted scanner and real Customer/Partner file policy approved. |
| Manual accounting | POMS commercial catalog plus `/api/platform/order-accounting/journal-entries` and CSV export | Catalog ownership, date-range reconciliation, stable source-ID handling, general-ledger account mapping, tax treatment, posting procedure, duplicate prevention, and Finance ownership approved. |
| Future external CRM adapter | Provider/account identifiers, credentials, API, webhook verifier, and field mapping | Not present or required today. Before any activation: fresh product scope, field ownership, least-privilege access, non-production proof, webhook validation, reconciliation, monitoring, and rotation approved. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend Clerk instance | Vercel Preview uses the development `pk_test_` value. Vercel Production uses the `pk_live_` value matching the API's production Clerk configuration. |
| `VITE_API_BASE_URL` | Frontend API base URL | Points to the approved API origin or reverse proxy. |
| `VITE_USE_MOCK_SESSION` | Development mock session | Must not enable mock access in production. |

Never copy local passwords, Clerk secrets, QuickBooks credentials, Mailgun API or webhook-signing keys, webhook tokens, or connection strings into documentation, logs, audit events, support messages, or committed configuration. Rotate any credential that is accidentally shared.

## Database migrations

The authoritative migration inventory is [backend/app/Migrations](../backend/app/Migrations),
with the current model in its snapshot and [database ERD](database-erd.md).
The earlier eight-item inventory described a July/August checkpoint and omitted
later CRM, department, retention, Trial and Website work; it must not be used to
decide that a target database is current. The chain begins with
`20260716220428_InitialPSeqOperations`; `AddWebsiteApi` was applied during the
historical public cutover rather than remaining universally unapplied.

Recent named boundaries include `20260905114659_RecordGovernedDownloadCommitEvidence`,
`20260905135247_CloseReleasedDeliverableLifecycle`,
`20260905140916_FreezeReleasedDeliverableReceiptLineage`,
`20260905172646_AddTrialProjectIntegration`,
`20260905213944_AddWebsiteNotificationRecovery`, and
`20260905222201_AddWebsiteNotificationProcessingControl`. This is context, not an
exhaustive or permanently latest list. Compare the full release artifact with the
target's `public` EF history.

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
change in a shared environment. It was tested on an isolated local cluster;
read the setting on each target rather than inferring it from another database's
verification or an older environment note.

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

## Website public runtime and email recovery

The consolidation plan's dated **Phase 4: observe and retire** record supersedes
its earlier observation-window descriptions: public traffic moved to Portal and
the temporary bridge and standalone Website API/database were retired on
2026-07-18 UTC after reconciliation and backup verification. Treat the old
loopback listeners and bridge rollback instructions as historical evidence,
not currently available rollback infrastructure. Current API routing, DNS/TLS,
document/index mounts and deployed source revisions require fresh target checks;
they were not reverified by this documentation update.

Website contacts and demo inquiries save their requested notification intent in
the same database transaction. Intake succeeds once the record and queue entry
persist; it does not wait for Mailgun. The public contact form says a requested
brief is queued, retains entries on failure and distinguishes duplicate signup
from validation/reCAPTCHA/throttling failures. An existing signup cannot be used
to trigger repeated public sends.

The Website worker processes durable rows outside public requests. Dispatch uses
a five-minute claim lease, a 45-second provider timeout and optimistic ownership
checks; interrupted leases are recoverable. Each automatic recovery cycle is
bounded to five attempts, including interrupted claims. Failed attempts retain
safe error information and retry with increasing delay. Final failure remains
available for staff attention. An unconfigured logging sender is recorded as a
delivery failure, never provider acceptance.

An accepted HTTP response records **Accepted by email provider**. It does not
prove inbox delivery. If a process loses the acknowledgement, a later attempt
can duplicate an email already accepted by Mailgun. Retained attempts explain
interruption; operators must review the recipient and history before resending.
The invitation webhook contract does not add delivery/permanent-failure state
to these Website rows.

Phaeno platform administrators use **Web Operations → Email delivery** to inspect
notification state, retained attempts and intake identity. **Queue resend** uses
the current version, active-target eligibility and a five-minute cooldown;
successful recovery retains an immutable actor/time/target audit event. A legacy
active signup that requested a brief can be explicitly queued when it has no
delivery record; its historical email status remains unknown. Unsubscribed
contacts and completed demo requests are rejected for recovery and checked again
by the worker before sending. Retiring intake cancels queued and failed work
while preserving attempts. In-flight work may finish; interrupted or late-failing
attempts resolve without leaving retired intake in the attention queue.
Expanded attempt history refreshes while open.

### Pause, resume and attention

The singleton `website.web_notification_processing_controls` record makes pause
state durable across process restarts and serving instances. Its initial state is
running (`IsPaused=false`). Platform administrators read
`GET /api/web-ops/notifications/summary` and change processing through
`POST /api/web-ops/notifications/processing`, supplying the current GUID version,
the requested `isPaused` value and a required reason of at most 500 characters.
The change records `ProcessingPaused` or `ProcessingResumed` with actor and time.
A stale version requires refreshing and reviewing the current setting.

Pause acknowledgement and new claims serialize on the control row. Pausing stops
new claims after acknowledgement; already-claimed or in-flight messages may finish.
Public intake and explicit recovery still persist queued work. Resuming releases
that backlog under the existing lease/retry rules without resetting attempt counts.
These controls affect Website email only; they do not pause invitations, general
order notices, retention processing, Website intake or crawling.

The summary reports queued, processing, failed and expired-processing counts,
the oldest queued creation time, and the last processing-control change.
The API processing count includes expired leases; the expired count is its subset
rather than an additional independent population. The UI subtracts expired
leases from **Sending** and labels those rows **Interrupted**. The attention filter
`GET /api/web-ops/notifications?attentionOnly=true` selects failed messages and
processing messages with expired leases. Ordinary queued work remains visible
in the complete list. A paused queue can therefore have both legitimate backlog
and separate failures requiring review.

### Monitoring and response

`WebsiteNotificationMonitoringBackgroundService` observes the database every
30 seconds in its own loop, including while sending is paused or a provider call
is slow. Its count-only logs exclude intake names, email addresses and operator
reasons:

| Event | Meaning and response |
| --- | --- |
| `5410 WebsiteNotificationAttentionRequired` | Failed rows or expired processing leases exist. Emitted when the attention state changes and as a reminder every 15 minutes while attention persists. Review **Email delivery**, the pause state, recipient/attempt history and provider configuration. |
| `5411 WebsiteNotificationAttentionCleared` | The previously observed failed/expired population has cleared. This does not prove inbox delivery or that the ordinary queue is empty. |
| `5412 WebsiteNotificationMonitoringFailed` | Queue state is unknown because observation failed. Check database connectivity, migration state and the worker logs; do not interpret the last gauges as a current healthy result. |

The `PhaenoPortal.Website.Notifications` .NET meter exposes gauges
`website.notifications.pending`, `website.notifications.processing`,
`website.notifications.failed`, `website.notifications.expired_processing` and
`website.notifications.paused` (1 when paused, otherwise 0). They represent the
last successful observation. Configure the deployment's log collection, metric
export/collection and alert destination explicitly; defining a meter does not
provision an external monitoring service or notification route. Alert on failed
or expired work and monitoring failure; use oldest-queued time from the summary
to investigate backlog separately. Keep alerts active while processing is paused.

Operator recovery starts by reviewing the current queue/control state and saved
attempt outcome. Correct provider or database configuration, then retry an
eligible existing message or resume processing with a reason. Do not recreate
the signup, erase attempts or assume that an interrupted send was undelivered.

Before rollout, back up the target database and record restore verification,
prior API/frontend revisions, migrations to apply, provider settings and the
observation/forward-fix decision. Apply the additive delivery/control schema
before starting the new API worker or using the new recovery UI. Preserve intent,
attempt and audit rows during rollback; reverting source does not undo accepted
email or safely justify deleting queue history. A pre-recovery API version sends
inline and does not honor the durable queue/control, so a code rollback requires
an explicit delivery-containment decision. Pausing processing is the appropriate
way to retain intake while investigating the new worker.

Verify production Mailgun account/domain/templates, technical-brief URL, current
recipients and cooldown/permission behavior in an explicitly authorized hosted
acceptance run. Use synthetic intake and fake providers for local verification.
Do not infer mailbox delivery, successful provider configuration or production
rollout from local tests, an application health response, or historical cutover
acceptance.

## Production activation gates

Before a release or feature activation, collect current evidence for the
applicable gates. Historical completion in an owning plan is useful context but
does not establish present provider configuration or grant new rollout authority:

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
- Finance acceptance of POMS native PSeq invoice, receipt/allocation and
  reconciliation behavior; separate legacy/non-PSeq journal export and manual
  posting procedures where applicable, with stable source IDs, tax/account
  mapping and duplicate prevention;
- production migration and authenticated validation of the first-party CRM for
  Companies, Contacts, Leads, Opportunities, pipelines, Activities, Tasks,
  reporting, CRM-to-Portal handoffs, duplicate prevention, authorization, and
  operational ownership;
- Mailgun sender/domain and HMAC signature verification, locale-template review,
  delivery/permanent-failure monitoring, and retry ownership;
- Website current route/source alignment, reCAPTCHA, document/index mounts,
  CORS/search and Mailgun acceptance; delivery/control migration, paused and
  resumed intake/dispatch, recovery/audit, monitoring and rollback/forward-fix
  acceptance for this release. The completed historical data copy, traffic
  switch and old-runtime retirement are not pending new work;
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
- Exceptional curated-package purge outside the implemented released-deliverable
  lifecycle. Governed/general released-package checkpoints, notice outboxes,
  commit-time evidence, revocation, cleanup retries, holds and reissue are
  implemented; production deletion/provider activation, hosted recovery,
  mailbox acceptance and authenticated acceptance remain separate gates in
  [File Management](plans/FILE-MANAGEMENT-PLAN.md#lifecycle-implementation-checkpoint-2026-09-05).

## Released-package cleanup and retained receipts

`OrderManagement:ReleasedDeliverableByteDeletion` defaults to false. The owning
plan records a production storage/deletion hold; verify its current target state
before changing it. Code deployment does not authorize
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
flag-off worker does not satisfy these activation gates. Trial complete releases
now participate in the shared lifecycle through the distinct Trial workflow;
partial Trial releases do not start the complete-package retention clock. See
[Trial integration closeout](plans/TRIAL-INTEGRATION-CLOSEOUT.md) for its own
scientific, storage and hosted-acceptance boundaries.
