# Architecture

## System shape

Phaeno Portal is a two-application repository with a shared account and tenant model.

```text
Browser
  -> React/TanStack frontend (`frontend`)
  -> Clerk authentication and bearer token
  -> ASP.NET Core API (`backend/app`)
  -> PostgreSQL through EF Core
```

The frontend and API are separate build units. The root `package.json` delegates common frontend commands; the backend solution lives at `backend/PhaenoPortal.slnx`.

## Backend

The API targets .NET 10 and is organized by feature:

- `Features/Accounts`: users, organizations, memberships, invitations, session projection, and Clerk integration.
- `Features/DataProvisioning`: Phaeno source samples, managed-file metadata,
  immutable curated versions, exact-version organization grants, provisioning
  runs, tenant access, and download audit.
- `Features/Health`: health endpoint.
- `Infrastructure/Api`: response envelope, metadata, error mapping, and response filter.
- `Infrastructure/Persistence`: `AppDbContext`, mappings, save interceptors, and PostgreSQL configuration.
- `Middleware`: API exception handling.

All `/api` failures should use the existing error envelope. Persistence applies auditing and optimistic concurrency centrally rather than in individual endpoints.

## Identity and authorization

Clerk is the external identity provider in the current code. The API validates Clerk JWTs and resolves provider plus subject to an internal `User`. Product authorization comes from active internal organization memberships; external identity claims do not replace tenant checks.

The current organization kinds are `Phaeno`, `Prospect`, `Customer`, and
`Partner`. A Prospect is a tenant phase that can convert in place to Customer or
Partner while retaining its organization id, memberships, and curated-data
grants. `Distributor` is not a separate product term.

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

The EF mappings for this slice are implemented in migration
`20260714222254_AddOrganizationDataProvisioning`. It was applied to the
configured development database on 2026-07-14. Other environments retain their
normal explicit deployment and migration boundary.

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
organization/customer administration, Phaeno users, invitation acceptance,
Phaeno data provisioning and source workspaces, and the tenant Data Library.

## Configuration and deployment

- Backend database: `ConnectionStrings:DefaultConnection` / `ConnectionStrings__DefaultConnection`.
- Default PostgreSQL schema: `portal`.
- External identity: `Clerk` configuration.
- Invitation delivery: Postmark when configured; logging sender otherwise.
- Data provisioning: `DataProvisioning` storage root, size limit, environment
  approved-file-kind map, synthetic-fixture policy, and scanner mode. Production
  defaults block synthetic content and configure no approved scientific kinds
  or trusted scanner.
- Deployment is not yet documented as an established production path. Do not infer a target from the Phaeno Website or another repository.

## Authoritative references

- `AGENTS.md`: canonical repository working rules.
- `README.md`: setup, API envelope, and persistence overview.
- `PLANS/AUTH-USER-SYSTEM-PLAN.md`: account-system decisions and remaining work.
- Current source and tests: final authority for implemented behavior.
