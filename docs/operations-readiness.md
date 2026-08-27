# Operations and production-readiness boundary

This document records how the application operates in the current repository and what remains required before production activation. It is not a deployment runbook and does not select a hosting provider or production topology.

## Current runtime

| Component | Current implementation |
| --- | --- |
| Frontend | React 19 and TanStack Start, served by Vite in development and built as client plus SSR assets. |
| API | .NET 10 ASP.NET Core application. |
| Database | PostgreSQL through one EF Core `PSeqOperationsDbContext`. The current model maps 85 Commercial/current-flow and Lab-projection tables to `commercial_ops`, 27 Laboratory execution tables to `lab_ops`, two public Website intake tables to `website`, and migration history to `public`; the latest migrations have been applied only to the configured local development database. |
| Authentication | Clerk-issued bearer JWTs; application authorization comes from internal users, active memberships, and capabilities. |
| Lab Operations | Feature-complete internal provider with additive Phaeno roles, operator APIs/workspace, receipt and accession, controlled execution, traceability, outsourced NGS sendouts, exceptions, scientific approval, and customer-safe Commercial projections. Production validation and activation remain incomplete. |
| Curated-data files | `IManagedFileStorage` adapts to the shared `IFileStorage` contract. Development uses local filesystem storage. Production currently selects a non-persisting `Disabled` adapter, so the API starts but file operations return HTTP 503. The S3 adapter is implemented but not configured or live-validated. |
| Order files | `IOperationalFileStorage` adapts to the shared `IFileStorage` contract. Development uses local filesystem storage. Production currently selects a non-persisting `Disabled` adapter, so the API starts but file operations return HTTP 503. The S3 adapter is implemented but not configured or live-validated. |
| File scanning | Environment scanner abstractions. Development can trust configured fixture files; production defaults do not. |
| Commercial accounting | POMS-owned catalog, immediate quotes, stable billing source records, and a Phaeno-only date-filtered CSV for manual journal-entry preparation. QuickBooks integration is deferred. |
| Relationship CRM | A standalone first-party POMS CRM is implemented for Companies, Contacts, Leads, Opportunities, pipelines, Activities, Tasks, reporting, administration, and controlled Portal handoffs. HubSpot is absent from the runtime and deferred as a possible optional adapter. |
| Email and notices | Portal transactional flows use Postmark when configured. Public Website contact/order templates use Mailgun when configured; logging senders are the local fallback. |
| Public Website API | Anonymous `/api/v1/web-ops` search, database ping, contact, and order endpoints plus `/public` document hosting are implemented in Portal. Historical data and public traffic have not been cut over. |
| Background work | Hosted dispatchers retry order notifications, data-provisioning notices, and Lab-to-Commercial projection delivery. A hosted Website crawler rebuilds the Lucene index on its configured interval. The QuickBooks dispatcher is disabled. |
| Help | Browser-bundled MDX with Customer/Partner locale metadata and Phaeno US-English content. Backend search is not implemented. |
| Organization/user administration UI | Invitation acceptance and Phaeno organization list/detail, request, entitlement, invitation, membership, conversion, lifecycle, and User management workspaces use durable APIs. Invitations retain the person’s name and intended membership role. Phaeno invitations and user edits consolidate Platform administrator and additive Laboratory roles; pending Laboratory-role intent activates only on acceptance, while external administration remains organization-scoped. |

Phaeno Portal is the operational and commercial-source system of record. Its first-party CRM owns relationship and pipeline records, and its order workflows own the manual catalog, quotes, credit rules, and accounting source records. No ERP, accounting provider, third-party LIMS, or external CRM is connected to the running application; Laboratory execution is owned by the internal Lab Operations provider.

## Health and basic verification

- API health: `GET /api/health` returns the standard API envelope with service name and `healthy` status. This is application dial tone, not proof that PostgreSQL, Clerk, Postmark, Mailgun, reCAPTCHA, Website search/documents, storage, scanning, manual accounting operations, or background delivery is fully ready.
- Backend build and tests: `dotnet build backend/PSeq.Operations.slnx` and `dotnet test backend/PSeq.Operations.slnx`.
- Frontend checks from `frontend/`: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, and `pnpm run test:e2e` when full browser verification is requested.
- PostgreSQL reference journey: `backend/tools/PSeq.Operations.ReferenceJourney` exercises the curated-data baseline with rollback and isolated temporary storage.

The living backend, frontend, and E2E coverage boundaries are maintained in `docs/plans/BACKEND-TEST-PLAN.md`, `docs/plans/FRONTEND-TEST-PLAN.md`, and `docs/plans/E2E-TEST-PLAN.md`.

## Configuration ownership

Keep environment-specific values outside source control. `appsettings.Development.json`, `.env`, and `.env.*` are ignored local configuration files. Prefer environment variables, ASP.NET Core user secrets for local work, and the selected deployment platform's secret store for shared environments.

| Section or variable | Purpose | Production expectation |
| --- | --- | --- |
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection | Managed as a secret; TLS, backup, restore, and connection limits approved. |
| `Persistence` | Commercial, Laboratory, Website, and migration-history schemas plus the history table | Stable before migration execution; business schemas must be distinct from each other and from `public`. |
| `Clerk` | JWT authority/audience, Clerk API access, authentication branding, MFA, and recovery | Production API accepts only a Clerk Production issuer and `sk_live_` secret. Local development remains on Clerk Development. HTTPS metadata validation, Phaeno branding, paid-plan vendor-badge removal, required authenticator-app MFA and one-time backup codes, disabled SMS, and the Phaeno-admin recovery procedure must be verified in the production instance. |
| `Bootstrap` | One-time bootstrap link inputs | Disabled or cleared after the initial administrator is linked. |
| `Invitations` | Token lifetime, resend cooldown, public URL | Public URL and expiry policy approved. |
| `Postmark` | Transactional sender | Verified sender/domain, production token, stream, delivery and failure monitoring. |
| `WebsiteApi`, `GoogleAuthSettings`, and `EmailServiceSettings` | Public origins/documents, locale-specific technical briefs, Google reCAPTCHA Enterprise, and Mailgun templates | Existing production credentials and document volume transferred through the secret/storage platform; CORS and rejection verified; every enabled locale's `fulfill-web-technical-brief-request.{locale}` template exists in Mailgun; every configured localized PDF URL returns the intended document; and representative localized delivery is verified. |
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

Never copy local passwords, Clerk secrets, Postmark tokens, webhook tokens, or connection strings into documentation, logs, audit events, support messages, or committed configuration. Rotate any credential that is accidentally shared.

The one-time `--cutover-clerk-bootstrap-identity` maintenance command exists
only for the initial production-instance transition. It runs before the API is
replaced, requires the exact previous subject identifier, refuses to proceed
unless exactly one Portal user is linked and that user is the configured
bootstrap administrator, verifies the replacement Clerk user's primary email,
and records the relink. It must not be used for routine user migration.

## Database migrations

Committed migrations currently cover:

1. `InitialPSeqOperations`, the clean Commercial/current-flow baseline.
2. `AddLabOperationsFoundation`.
3. `AddLabProviderCommandReceipts`.
4. `CompleteLabOperations`.
5. `AddLabQcProjection`.
6. `EnforceLabLibraryLineage`.
7. Subsequent additive Website, invitation, Lab, shipping, retention, and Job
   workflow migrations through `BackfillJobPricingProfiles`.
8. `AddCrmCompanyFoundation`, `CompleteCoreCrm`, and
   `AllowRepeatCrmCompanyContactHistory`, applied to the configured local
   development database only.

Use the repository-local EF tool manifest and commands documented in `README.md`. A migration committed or applied to one developer database is not proof that it ran in another environment. Before a shared-environment migration, record the target, backup/restore point, expected duration, application compatibility, verification query or smoke test, and rollback/forward-fix decision. Never apply a migration to shared, staging, or production data without explicit authorization.

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
- Postmark sender/domain verification, template review, delivery/bounce monitoring, and retry ownership;
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
- Backend-indexed help search and additional Customer/Partner locales.
- Any external CRM integration until a fresh adapter plan is explicitly
  approved, implemented, and production-validated.
- A third-party LIMS adapter and ownership cutover unless an approved future
  workflow establishes the need.
- Exceptional curated-package purge and any automated retention deletion workflow.
