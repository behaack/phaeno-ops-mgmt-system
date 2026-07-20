# Operations and production-readiness boundary

This document records how the application operates in the current repository and what remains required before production activation. It is not a deployment runbook and does not select a hosting provider or production topology.

## Current runtime

| Component | Current implementation |
| --- | --- |
| Frontend | React 19 and TanStack Start, served by Vite in development and built as client plus SSR assets. |
| API | .NET 10 ASP.NET Core application. |
| Database | PostgreSQL through one EF Core `PSeqOperationsDbContext`. The current model maps 54 Commercial/current-flow and Lab-projection tables to `commercial_ops`, 22 Laboratory execution tables to `lab_ops`, two public Website intake tables to `website`, and migration history to `public`; `AddWebsiteApi` has not been applied to a shared environment. |
| Authentication | Clerk-issued bearer JWTs; application authorization comes from internal users, active memberships, and capabilities. |
| Lab Operations | Feature-complete internal provider with additive Phaeno roles, operator APIs/workspace, receipt and accession, controlled execution, traceability, outsourced NGS sendouts, exceptions, scientific approval, and customer-safe Commercial projections. Production validation and activation remain incomplete. |
| Curated-data files | Feature-owned local filesystem storage through `IManagedFileStorage`. |
| Order files | Feature-owned local filesystem storage through `IOperationalFileStorage`. |
| File scanning | Environment scanner abstractions. Development can trust configured fixture files; production defaults do not. |
| Commercial integration | QuickBooks Online adapter. A logging gateway is used when the required QuickBooks configuration is absent. |
| Relationship CRM | Not implemented. HubSpot is selected for the approved future lifecycle in `docs/plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md`. |
| Email and notices | Portal transactional flows use Postmark when configured. Public Website contact/order templates use Mailgun when configured; logging senders are the local fallback. |
| Public Website API | Anonymous `/api/v1/web-ops` search, database ping, contact, and order endpoints plus `/public` document hosting are implemented in Portal. Historical data and public traffic have not been cut over. |
| Background work | Hosted dispatchers retry order integrations, order notifications, data-provisioning notices, and Lab-to-Commercial projection delivery. A hosted Website crawler rebuilds the Lucene index on its configured interval. |
| Help | Browser-bundled MDX with Customer/Partner locale metadata and Phaeno US-English content. Backend search is not implemented. |
| Organization/user administration UI | Invitation acceptance and Phaeno organization list/detail, request, entitlement, invitation, membership, conversion, lifecycle, and User management workspaces use durable APIs. Invitations retain the person’s name and intended membership role. Phaeno invitations and user edits consolidate Platform administrator and additive Laboratory roles; pending Laboratory-role intent activates only on acceptance, while external administration remains organization-scoped. |

Phaeno Portal is the operational source of truth. QuickBooks Online is authoritative only for the commercial facts defined in `docs/business-rules.md`. No ERP, third-party LIMS, or CRM is connected to the running application; Laboratory execution is owned by the internal Lab Operations provider.

## Health and basic verification

- API health: `GET /api/health` returns the standard API envelope with service name and `healthy` status. This is application dial tone, not proof that PostgreSQL, Clerk, QuickBooks, Postmark, Mailgun, reCAPTCHA, Website search/documents, storage, scanning, or background delivery is fully ready.
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
| `Clerk` | JWT authority/audience and Clerk API access | Production Clerk instance and secrets; HTTPS metadata validation enabled. |
| `Bootstrap` | One-time bootstrap link inputs | Disabled or cleared after the initial administrator is linked. |
| `Invitations` | Token lifetime, resend cooldown, public URL | Public URL and expiry policy approved. |
| `Postmark` | Transactional sender | Verified sender/domain, production token, stream, delivery and failure monitoring. |
| `WebsiteApi`, `GoogleAuthSettings`, and `EmailServiceSettings` | Public origins/documents, technical brief, Google reCAPTCHA Enterprise, and Mailgun templates | Existing production credentials and document volume transferred through the secret/storage platform; CORS, rejection, templates, and PDF delivery verified. |
| `WebCrawlerSettings`, `WebSearchSettings`, and `ChronJobs:IndexWebsite` | Public-site crawl target, Lucene index path, and rebuild schedule | Durable writable index storage, successful initial crawl, monitoring, and representative search verified. |
| `DataProvisioning` | Storage root, upload limit, synthetic policy, scanner, allowed kinds | Synthetic fixtures rejected; real file policy, durable storage, and trusted scanner approved. |
| `OrderManagement` | Operational storage root, upload limit, scanner, allowed kinds | Durable storage, trusted scanner, and real Customer/Partner file policy approved. |
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
- production storage and malware scanning for curated-data and order files;
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
