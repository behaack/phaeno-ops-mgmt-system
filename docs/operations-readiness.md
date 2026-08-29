# Operations and production-readiness boundary

## PSeq order-to-cash rollout boundary (2026-08-29)

The repository now contains additive, feature-flagged foundations for durable
invitation delivery, derived readiness, internal order staging, business roles,
audit-only/enforced dual control, governed PSeq final-result packages, POMS
accounts receivable, and owned attention queues. This is local implementation
state until the authorized 2026-08-29 additive release completes. The Product
Owner authorized commit, push, encrypted-backup migration, and production
deployment; the new feature flags and dual-control enforcement remain disabled
pending the activation gates below.

Production activation requires a dedicated-staging acceptance run with
Commercial, Lab Operations, Scientific, Finance, security, and accessibility
signoff. It also requires Postmark sender and webhook-secret validation, final
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
| Database | PostgreSQL through one EF Core `PSeqOperationsDbContext`. The current model maps 72 Commercial/current-flow and Lab-projection tables to `commercial_ops`, 27 Laboratory execution tables to `lab_ops`, two public Website intake tables to `website`, and migration history to `public`; the new order-to-cash migration has not been applied to a shared environment. |
| Authentication | Clerk-issued bearer JWTs; application authorization comes from internal users, active memberships, and capabilities. |
| Lab Operations | Feature-complete internal provider with additive Phaeno roles, operator APIs/workspace, receipt and accession, controlled execution, traceability, outsourced NGS sendouts, exceptions, scientific approval, and customer-safe Commercial projections. Production validation and activation remain incomplete. |
| Curated-data files | `IManagedFileStorage` adapts to the shared `IFileStorage` contract. Development uses local filesystem storage. Production currently selects a non-persisting `Disabled` adapter, so the API starts but file operations return HTTP 503. The S3 adapter is implemented but not configured or live-validated. |
| Order files | `IOperationalFileStorage` adapts to the shared `IFileStorage` contract. Development uses local filesystem storage. Production currently selects a non-persisting `Disabled` adapter, so the API starts but file operations return HTTP 503. The S3 adapter is implemented but not configured or live-validated. |
| File scanning | Environment scanner abstractions. Development can trust configured fixture files; production defaults do not. |
| PSeq accounts receivable | POMS-owned Customer billing/tax/terms snapshots, immutable invoice/PDF issue at job completion, receipt/import/allocation, aging, adjustments, and independently approved reconciliation behind `NativePSeqAccountsReceivable`. QuickBooks remains legacy/non-PSeq context only. |
| Relationship CRM | Not implemented. HubSpot is selected for the approved future lifecycle in `docs/plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md`. |
| Email and notices | Portal invitations use durable Postmark attempts plus authenticated, idempotent delivery/bounce webhooks behind `InvitationDelivery`. Production rejects incomplete Postmark, sender, public URL, or webhook credentials; logging invitation delivery is Development/Test only. Public Website contact/order templates use Mailgun when configured. |
| Public Website API | Anonymous `/api/v1/web-ops` search, database ping, contact, and order endpoints plus `/public` document hosting are implemented in Portal. Historical data and public traffic have not been cut over. |
| Background work | Hosted dispatchers retry invitation delivery, order integrations, order notifications, data-provisioning notices, and Lab-to-Commercial projection delivery. Result retention automatically records warning, cutoff, grace, and deletion evidence. A hosted Website crawler rebuilds the Lucene index on its configured interval. |
| Help | Browser-bundled MDX with Customer/Partner locale metadata and Phaeno US-English content. Backend search is not implemented. |
| Organization/user administration UI | Invitation acceptance and Phaeno organization list/detail, request, entitlement, invitation, membership, conversion, lifecycle, and User management workspaces use durable APIs. Invitations retain the person’s name and intended membership role. Phaeno invitations and user edits consolidate Platform administrator and additive Laboratory roles; pending Laboratory-role intent activates only on acceptance, while external administration remains organization-scoped. |

Phaeno Portal is the operational source of truth. QuickBooks Online is authoritative only for the commercial facts defined in `docs/business-rules.md`. No ERP, third-party LIMS, or CRM is connected to the running application; Laboratory execution is owned by the internal Lab Operations provider.

## Health and basic verification

- API health: `GET /api/health` returns the standard API envelope with service name and `healthy` status. This is application dial tone, not proof that PostgreSQL, Clerk, QuickBooks, Postmark, Mailgun, reCAPTCHA, Website search/documents, storage, scanning, or background delivery is fully ready.
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
| `Clerk` | JWT authority/audience, Clerk API access, authentication branding, MFA, and recovery | Production Clerk instance and secrets; HTTPS metadata validation enabled; Phaeno branding and paid-plan vendor-badge removal verified; required authenticator-app MFA and one-time backup codes enabled; SMS disabled; Phaeno-admin identity verification, MFA reset, active-session revocation, and re-enrollment recovery owned and tested. |
| `Bootstrap` | One-time bootstrap link inputs | Disabled or cleared after the initial administrator is linked. |
| `Invitations` | Token lifetime, resend cooldown, public URL | Production deployment pins the public URL to `https://portal.phaenobiotech.com`; expiry and resend policy approved. |
| `Postmark` | Transactional sender and invitation delivery/bounce webhooks | Protected `PORTAL_POSTMARK_SERVER_TOKEN` and `PORTAL_POSTMARK_WEBHOOK_SECRET`, non-secret Postmark-verified `PORTAL_POSTMARK_FROM_EMAIL`, `outbound` stream, `X-Phaeno-Postmark-Secret` webhook header, delivery and failure monitoring. Deployment preflight and API startup both fail closed when these values are absent or malformed. |
| `PSeqOrderToCash` | Independent rollout flags, service-authenticated result pipeline, object-storage transfer targets, retention offsets, and dual-control audit/enforcement | Enable additive slices independently. Keep dual control audit-only until staffing evidence; require a rotated service secret, approved storage/scanner endpoint, explicit retention schedule, and no production default or placeholder values. |
| `WebsiteApi`, `GoogleAuthSettings`, and `EmailServiceSettings` | Public origins/documents, technical brief, Google reCAPTCHA Enterprise, and Mailgun templates | Existing production credentials and document volume transferred through the secret/storage platform; CORS, rejection, templates, and PDF delivery verified. |
| `WebCrawlerSettings`, `WebSearchSettings`, and `ChronJobs:IndexWebsite` | Public-site crawl target, Lucene index path, and rebuild schedule | Durable writable index storage, successful initial crawl, monitoring, and representative search verified. |
| `WebsitePreviewSearch` | Protected branch crawl target, dedicated Preview Lucene path, Vercel automation bypass, proxy key, and rebuild schedule | Disabled by default; when activated, secrets remain server-side, the index uses its dedicated volume, direct unauthenticated access is denied, and production search remains unchanged. |
| `FileStorage` | Provider selection, local development root, and S3 bucket, region, key prefix, optional service URL, and path-style setting | Temporary state: `Provider=Disabled`, which permits startup but no file operations. Activation state: `Provider=S3`; bucket and prefix approved; SDK default credential chain uses a least-privilege identity or protected access keys; encryption, lifecycle, permissions, monitoring, and representative upload/download/delete behavior verified. Production refuses the Local provider. |
| `DataProvisioning` | Upload limit, synthetic policy, scanner, allowed kinds | Synthetic fixtures rejected; real file policy and trusted scanner approved. |
| `OrderManagement` | Upload limit, scanner, allowed kinds | Trusted scanner and real Customer/Partner file policy approved. |
| `QuickBooks` | Environment, company/realm, OAuth, API, webhook verifier | Correct company, least-privilege credentials, webhook validation, sandbox journey, reconciliation, and rotation process approved. |
| Planned `HubSpot` | Account/app identifiers, OAuth or private-app credentials, API, webhook verifier, and property mapping | Not present today. Before activation: least-privilege scopes, non-production proof, webhook validation, reconciliation, monitoring, and rotation approved. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend Clerk instance | Matches the API's production Clerk configuration. |
| `VITE_API_BASE_URL` | Frontend API base URL | Points to the approved API origin or reverse proxy. |
| `VITE_USE_MOCK_SESSION` | Development mock session | Must not enable mock access in production. |

Never copy local passwords, Clerk secrets, QuickBooks credentials, Postmark tokens, webhook tokens, or connection strings into documentation, logs, audit events, support messages, or committed configuration. Rotate any credential that is accidentally shared.

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

## Durable delivery and recovery

- QuickBooks commands, payment reconciliation, notifications, provisioning notices, and Lab projection events use durable records and hosted dispatchers.
- A failed delivery remains visible with its error and retry state. Retry the existing record after correcting configuration or connectivity; do not recreate the order, grant, notification, estimate, or invoice to force delivery.
- Repeated delivery must remain idempotent. Reconciliation should repair missed external events without rewriting immutable local commercial or scientific snapshots.
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
- QuickBooks sandbox end-to-end validation, production company connection, webhook verification, payment reconciliation, duplicate prevention, and credential rotation;
- when the approved CRM plan enters scope, HubSpot non-production validation,
  Company/Contact/Deal/Order mapping, webhook verification, duplicate
  prevention, reconciliation, least-privilege credentials, Sales layouts, and
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
- HubSpot integration until the approved lifecycle plan is explicitly
  implemented and production-validated.
- A third-party LIMS adapter and ownership cutover unless an approved future
  workflow establishes the need.
- Exceptional curated-package purge and any automated retention deletion workflow.
