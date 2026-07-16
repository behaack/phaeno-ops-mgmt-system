# Operations and production-readiness boundary

This document records how the application operates in the current repository and what remains required before production activation. It is not a deployment runbook and does not select a hosting provider or production topology.

## Current runtime

| Component | Current implementation |
| --- | --- |
| Frontend | React 19 and TanStack Start, served by Vite in development and built as client plus SSR assets. |
| API | .NET 10 ASP.NET Core application. |
| Database | PostgreSQL through one EF Core `PSeqOperationsDbContext`. The target model maps current business records to `commercial_ops`, reserves `lab_ops`, and stores migration history in `public`; the disposable development reset is pending. |
| Authentication | Clerk-issued bearer JWTs; application authorization comes from internal users, active memberships, and capabilities. |
| Curated-data files | Feature-owned local filesystem storage through `IManagedFileStorage`. |
| Order files | Feature-owned local filesystem storage through `IOperationalFileStorage`. |
| File scanning | Environment scanner abstractions. Development can trust configured fixture files; production defaults do not. |
| Commercial integration | QuickBooks Online adapter. A logging gateway is used when the required QuickBooks configuration is absent. |
| Relationship CRM | Not implemented. HubSpot is selected for the approved future lifecycle in `docs/plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md`. |
| Email and notices | Postmark when configured; logging senders otherwise. |
| Background work | Hosted dispatchers retry order integrations, order notifications, and data-provisioning notices from durable database records. |
| Help | Browser-bundled MDX with Customer/Partner locale metadata and Phaeno US-English content. Backend search is not implemented. |
| Organization/user administration UI | Session-only mock-backed screens. Invitation acceptance is connected, but durable organization, invitation, membership, role, and deactivation administration is not yet wired to the frontend. |

Phaeno Portal is the operational source of truth. QuickBooks Online is authoritative only for the commercial facts defined in `docs/business-rules.md`. No ERP, LIMS, or CRM is connected to the running application.

## Health and basic verification

- API health: `GET /api/health` returns the standard API envelope with service name and `healthy` status. This is application dial tone, not proof that PostgreSQL, Clerk, QuickBooks, Postmark, storage, scanning, or background delivery is fully ready.
- Backend build and tests: `dotnet build backend/PSeq.Operations.slnx` and `dotnet test backend/PSeq.Operations.slnx`.
- Frontend checks from `frontend/`: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, and `pnpm run test:e2e` when full browser verification is requested.
- PostgreSQL reference journey: `backend/tools/PSeq.Operations.ReferenceJourney` exercises the curated-data baseline with rollback and isolated temporary storage.

The living backend, frontend, and E2E coverage boundaries are maintained in `docs/plans/BACKEND-TEST-PLAN.md`, `docs/plans/FRONTEND-TEST-PLAN.md`, and `docs/plans/E2E-TEST-PLAN.md`.

## Configuration ownership

Keep environment-specific values outside source control. `appsettings.Development.json`, `.env`, and `.env.*` are ignored local configuration files. Prefer environment variables, ASP.NET Core user secrets for local work, and the selected deployment platform's secret store for shared environments.

| Section or variable | Purpose | Production expectation |
| --- | --- | --- |
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection | Managed as a secret; TLS, backup, restore, and connection limits approved. |
| `Persistence` | Commercial, Laboratory, and migration-history schemas plus the history table | Stable before migration execution; business schemas must be distinct from each other and from `public`. |
| `Clerk` | JWT authority/audience and Clerk API access | Production Clerk instance and secrets; HTTPS metadata validation enabled. |
| `Bootstrap` | One-time bootstrap link inputs | Disabled or cleared after the initial administrator is linked. |
| `Invitations` | Token lifetime, resend cooldown, public URL | Public URL and expiry policy approved. |
| `Postmark` | Transactional sender | Verified sender/domain, production token, stream, delivery and failure monitoring. |
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

1. Initial accounts and organization persistence.
2. Organization data provisioning.
3. Complete data-provisioning governance.
4. Order management.
5. Operational assignments.
6. Complete order-management snapshots.

Use the repository-local EF tool manifest and commands documented in `README.md`. A migration committed or applied to one developer database is not proof that it ran in another environment. Before a shared-environment migration, record the target, backup/restore point, expected duration, application compatibility, verification query or smoke test, and rollback/forward-fix decision. Never apply a migration to shared, staging, or production data without explicit authorization.

## Durable delivery and recovery

- QuickBooks commands, payment reconciliation, notifications, and provisioning notices use durable records and hosted dispatchers.
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
- QuickBooks sandbox end-to-end validation, production company connection, webhook verification, payment reconciliation, duplicate prevention, and credential rotation;
- when the approved CRM plan enters scope, HubSpot non-production validation,
  Company/Contact/Deal/Order mapping, webhook verification, duplicate
  prevention, reconciliation, least-privilege credentials, Sales layouts, and
  operational ownership;
- Postmark sender/domain verification, template review, delivery/bounce monitoring, and retry ownership;
- background-dispatcher monitoring and alerting for stale, failed, or repeatedly retried work;
- tenant-isolation, file-download, payment-release, accessibility, narrow-viewport, and authenticated database-backed browser journeys;
- production data/content approval with no synthetic fixture or test-only file policy enabled;
- incident response, support escalation, audit access, privacy handling, and responsible operational owners.

Until these gates are complete, a passing local build or test suite demonstrates application behavior only; it does not authorize production activation.

## Still intentionally deferred

- A general shared-folder and file-version product outside the feature-owned file boundaries.
- A confidential Phaeno runbook delivery system; browser-bundled help must remain distributable.
- Backend-indexed help search and additional Customer/Partner locales.
- HubSpot integration until the approved lifecycle plan is explicitly
  implemented and production-validated.
- LIMS integration unless an approved future workflow establishes the need.
- Exceptional curated-package purge and any automated retention deletion workflow.
