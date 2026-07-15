# Roadmap index

`docs/plans/` is the roadmap source of truth. This file is a stable index, not a second backlog.

## Product plans

- `docs/plans/AUTH-USER-SYSTEM-PLAN.md`: account, invitation, authorization, bootstrap, and audit direction.
- `docs/plans/FILE-MANAGEMENT-PLAN.md`: storage abstraction, folders, versions, retention, and download audit.
- `docs/plans/ORDER-MANAGEMENT-PLAN.md`: Customer lab service and sample tracking, Partner reagent ordering, and Partner data assembly direction.
- `docs/plans/ORGANIZATION-DATA-PROVISIONING-PLAN.md`: Phaeno source-sample registry,
  curated package governance, Prospect/Customer/Partner grants, and tenant
  access. The recommended first slice and EF migration are implemented, and the
  migration is applied to the configured development database. Its rollback-safe
  PostgreSQL reference journey passes; actual production data/profile approval
  remains a deployment-content step.

## Living test plans

- `docs/plans/BACKEND-TEST-PLAN.md`
- `docs/plans/FRONTEND-TEST-PLAN.md`
- `docs/plans/E2E-TEST-PLAN.md`

## Maintenance rule

Update the owning plan when work starts, decisions change, tests are added, or scope is intentionally deferred. Do not add speculative roadmap items here. Add a new plan only when the work has a real owner and a defined decision boundary.
