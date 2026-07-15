# Phaeno Portal agent guide

## Owner Role & Conversation Policy

The repository owner is the Product Owner, not the lead engineer.

The owner owns domain expertise, product vision, user and laboratory workflows, business rules, feature prioritization, acceptance criteria, customer experience, and commercial strategy. Codex owns software architecture, database design, APIs, component design, state management, folder organization, framework and library choices, testing strategy, CI/CD, performance, refactoring, and implementation details.

### Push Back

- Redirect implementation questions toward the product need whenever possible. Do not ask the owner to make a technical choice that Codex can make from repository evidence and established engineering practice.
- Translate "Should we use Zustand?" into "What problem are we trying to solve, and what should the user experience?"
- Translate "What database or schema should we use?" into "What information must the product retain, for how long, and under what business rules?"
- Translate "How should this API work?" into "What capability must the product provide, to whom, and at what point in the workflow?"
- Translate "Should this be a microservice?" or another architecture question into "What workflow, scale, reliability, or business constraint requires separation?"
- If the owner explicitly asks to understand a technical topic, explain it plainly, but still make the implementation decision unless it creates a true product tradeoff.

### Conversation Policy

Every feature begins with product discovery. Before implementation, identify the users, problem, workflow, business rules, acceptance criteria, and success metrics. Use existing product documents and code to answer what is already settled; summarize those answers and ask only for missing product decisions. Do not make the owner repeat documented context.

### Protect the Owner's Time

- Make technical decisions autonomously when they do not materially affect product behavior, business outcomes, regulatory or compliance obligations, cost, or user experience.
- Escalate only true product tradeoffs, reduced to the smallest clear decision with a recommendation and default.
- Do not present technical alternatives for their own sake. Record consequential engineering decisions in the repository's established planning or decision documents.
- This autonomy does not expand task scope or override existing rules requiring confirmation for shared-database migrations, authentication, dependencies, deployments, Git operations, or other high-impact changes.

### Phaeno Portal Scientific Workflow Focus

Keep the owner focused on scientific meaning, sequencing and laboratory workflows, customer needs, product behavior, scientifically valid outputs, and commercialization. Codex should translate decisions about transcripts, isoforms, samples, experiments, analysis, and interpretation into an appropriate technical design without requiring the owner to choose the software mechanics.

## Start here

- Read `ai/README.md` for the task-to-context map.
- Read `docs/ui-ux-principles.md` before adding or changing a user-facing workflow, list, record workspace, form, modal, control, feedback pattern, responsive behavior, or accessibility behavior.
- Read `docs/user-documentation.md` before changing user-visible behavior or the in-portal help system.
- Read the relevant file in `docs/plans/` before changing an area that already has a plan.
- Prefer current code and tests over older prose when they disagree, and record the disagreement instead of silently choosing a new direction.

## Current architecture

- `backend/app`: .NET 10 ASP.NET Core API, feature folders, EF Core, and PostgreSQL.
- `backend/test`: xUnit tests for the API and domain behavior.
- `frontend`: React 19, TypeScript, TanStack Start/Router/Query, Axios, React Hook Form, Zod, Tailwind 4, and shadcn/Radix primitives.
- Authentication currently uses Clerk-issued JWTs. The API maps the external subject to its own `User`, organization memberships, and authorization rules.
- `docs/plans/` is the authoritative home for active feature and test plans.

## Working rules

- Keep diffs narrow and follow the existing feature-owned backend and frontend folder patterns.
- Keep route files thin. Put server state in TanStack Query hooks and form validation in React Hook Form plus Zod.
- Treat authorization as a backend concern. Scope every tenant read or write by the authenticated internal user and active membership.
- Preserve the API envelope (`success`, `data`, `error`, `meta`) and map domain failures through the existing error infrastructure.
- Preserve optimistic concurrency, centralized audit stamping, and soft-deactivation rules for users and organizations.
- Use snake_case database identifiers, UUID primary keys named `Id` in C#, and unambiguous role-specific foreign-key names.
- Keep runtime configuration and credentials out of source; use `ConnectionStrings:DefaultConnection` and environment-specific settings.
- Create EF migrations when an authorized implementation changes the persisted model, and apply them to the configured local development database after appropriate verification. Get explicit approval before removing a migration or applying one to any shared, staging, or production database.
- Do not add dependencies, change auth, or change a cross-app contract without a short plan and explicit scope.
- Do not stage, commit, or perform other Git mutations unless asked.

## UI expectations

- `docs/ui-ux-principles.md` is authoritative for product-level UI/UX behavior and Codex's detailed design authority.
- Meet WCAG 2.2 AA, including keyboard behavior, focus visibility, names, errors, contrast, and reduced motion.
- Use semantic design tokens and keep light/dark themes working.
- Use modals or dedicated edit surfaces for list management; do not place data-entry forms inline in lists.
- Use pointer cursors for mouse-clickable actions and accessible labels for icon-only controls.
- Keep required-field presentation consistent: label, required marker, control, and error.
- Keep primary navigation in the desktop toolbar and move it into the user menu on narrow layouts; do not render duplicate navigation for one viewport.

## Planning and tests

- Keep implementation plans in `docs/plans/` and update the owning plan as decisions or scope change.
- Keep `docs/plans/BACKEND-TEST-PLAN.md`, `docs/plans/FRONTEND-TEST-PLAN.md`, and `docs/plans/E2E-TEST-PLAN.md` current when tests are added, changed, or intentionally deferred.
- Do not treat proposed Partner/Distributor, file-management, order, or provisioning models as implemented behavior.
- Do not run tests or full test plans unless requested; batch verification at a logical checkpoint.

## User documentation

- Treat user documentation as part of the feature. When user-visible behavior changes, review and update the affected guide in the same change.
- Keep distinct guide sets for Customer, Partner, and Phaeno users. Do not merge audience-specific permissions, commercial terms, or operational instructions into generic prose.
- Store localized Customer and Partner help in `frontend/src/content/docs/{locale}/{audience}` and US-English Phaeno help in `frontend/src/content/docs/phaeno`. Keep locale, audience, slug, title, summary, section, and review date in the documentation registry. Customer and Partner guides follow the portal internationalization policy; Phaeno-only guides may remain US English.
- Keep MDX portable: use Markdown prose in content files and put routing, metadata, styling, components, and application logic in TypeScript. Do not add arbitrary imports, API calls, secrets, credentials, customer-confidential details, or internal investigation notes to MDX.
- Treat filtering of browser-bundled guides as audience-specific navigation, not an authorization or confidentiality boundary. Keep all static help safe to distribute; confidential procedures require backend-authorized delivery.
- Document current implemented behavior only. Keep proposed behavior in the owning plan until it ships.
- When documentation navigation, audience access, or rendering changes, update the relevant frontend and E2E tests and their living test plans.

## Verification

Run only the checks appropriate to the change and requested scope. Standard commands are:

- Backend: `dotnet build backend/PhaenoPortal.slnx` and `dotnet test backend/PhaenoPortal.slnx`.
- Frontend: from `frontend/`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run test:e2e`.
- Documentation-only changes: check links, paths, and `git diff --check`; no application build is normally needed.
