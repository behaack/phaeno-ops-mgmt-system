# Phaeno Portal agent guide

## Start here

- Read `ai/README.md` for the task-to-context map.
- Read the relevant file in `PLANS/` before changing an area that already has a plan.
- Prefer current code and tests over older prose when they disagree, and record the disagreement instead of silently choosing a new direction.

## Current architecture

- `backend/app`: .NET 10 ASP.NET Core API, feature folders, EF Core, and PostgreSQL.
- `backend/test`: xUnit tests for the API and domain behavior.
- `frontend`: React 19, TypeScript, TanStack Start/Router/Query, Axios, React Hook Form, Zod, Tailwind 4, and shadcn/Radix primitives.
- Authentication currently uses Clerk-issued JWTs. The API maps the external subject to its own `User`, organization memberships, and authorization rules.
- `PLANS/` is the authoritative home for active feature and test plans.

## Working rules

- Keep diffs narrow and follow the existing feature-owned backend and frontend folder patterns.
- Keep route files thin. Put server state in TanStack Query hooks and form validation in React Hook Form plus Zod.
- Treat authorization as a backend concern. Scope every tenant read or write by the authenticated internal user and active membership.
- Preserve the API envelope (`success`, `data`, `error`, `meta`) and map domain failures through the existing error infrastructure.
- Preserve optimistic concurrency, centralized audit stamping, and soft-deactivation rules for users and organizations.
- Use snake_case database identifiers, UUID primary keys named `Id` in C#, and unambiguous role-specific foreign-key names.
- Keep runtime configuration and credentials out of source; use `ConnectionStrings:DefaultConnection` and environment-specific settings.
- Do not create, remove, or apply EF migrations unless explicitly requested.
- Do not add dependencies, change auth, or change a cross-app contract without a short plan and explicit scope.
- Do not stage, commit, or perform other Git mutations unless asked.

## UI expectations

- Meet WCAG 2.2 AA, including keyboard behavior, focus visibility, names, errors, contrast, and reduced motion.
- Use semantic design tokens and keep light/dark themes working.
- Use modals or dedicated edit surfaces for list management; do not place data-entry forms inline in lists.
- Use pointer cursors for mouse-clickable actions and accessible labels for icon-only controls.
- Keep required-field presentation consistent: label, required marker, control, and error.
- Keep primary navigation in the desktop toolbar and move it into the user menu on narrow layouts; do not render duplicate navigation for one viewport.

## Planning and tests

- Keep implementation plans in `PLANS/` and update the owning plan as decisions or scope change.
- Keep `PLANS/BACKEND-TEST-PLAN.md`, `PLANS/FRONTEND-TEST-PLAN.md`, and `PLANS/E2E-TEST-PLAN.md` current when tests are added, changed, or intentionally deferred.
- Do not treat proposed Partner/Distributor, file-management, order, or provisioning models as implemented behavior.
- Do not run tests or full test plans unless requested; batch verification at a logical checkpoint.

## Verification

Run only the checks appropriate to the change and requested scope. Standard commands are:

- Backend: `dotnet build backend/PhaenoPortal.slnx` and `dotnet test backend/PhaenoPortal.slnx`.
- Frontend: from `frontend/`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run test:e2e`.
- Documentation-only changes: check links, paths, and `git diff --check`; no application build is normally needed.
