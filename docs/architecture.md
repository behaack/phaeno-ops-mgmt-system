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
- `Features/Health`: health endpoint.
- `Infrastructure/Api`: response envelope, metadata, error mapping, and response filter.
- `Infrastructure/Persistence`: `AppDbContext`, mappings, save interceptors, and PostgreSQL configuration.
- `Middleware`: API exception handling.

All `/api` failures should use the existing error envelope. Persistence applies auditing and optimistic concurrency centrally rather than in individual endpoints.

## Identity and authorization

Clerk is the external identity provider in the current code. The API validates Clerk JWTs and resolves provider plus subject to an internal `User`. Product authorization comes from active internal organization memberships; external identity claims do not replace tenant checks.

The current persisted organization kinds are `Phaeno` and `Customer`. A partner/distributor model is described in older guidance and newer plans but is not represented by the current `OrganizationKind` enum. Treat that as planned domain work, not implemented architecture.

## Frontend

The frontend uses TanStack file routing with responsibility-based folders:

- `src/routes`: thin route modules.
- `src/features`: feature UI and workflow logic.
- `src/api`: HTTP clients and API integration.
- `src/components`: shared layout and reusable controls.
- `src/integrations`: framework and library setup.
- `src/lib`: small shared utilities.

TanStack Query owns server state. Axios is the HTTP transport. React Hook Form and Zod own forms and validation. The current implemented routes cover dashboard, customers, customer detail, Phaeno users, and invitation acceptance.

## Configuration and deployment

- Backend database: `ConnectionStrings:DefaultConnection` / `ConnectionStrings__DefaultConnection`.
- Default PostgreSQL schema: `portal`.
- External identity: `Clerk` configuration.
- Invitation delivery: Postmark when configured; logging sender otherwise.
- Deployment is not yet documented as an established production path. Do not infer a target from the Phaeno Website or another repository.

## Authoritative references

- `AGENTS.md`: canonical repository working rules.
- `README.md`: setup, API envelope, and persistence overview.
- `PLANS/AUTH-USER-SYSTEM-PLAN.md`: account-system decisions and remaining work.
- Current source and tests: final authority for implemented behavior.
