# Roadmap index

`docs/plans/` is the roadmap source of truth. This file is a stable index, not a second backlog.

## Product plans

- `docs/plans/AUTH-USER-SYSTEM-PLAN.md`: implemented backend account,
  invitation, authorization, bootstrap, and audit behavior; invitation
  acceptance is connected, while the organization/user administration screens
  remain mock-backed pending a durable frontend client.
- `docs/plans/FILE-MANAGEMENT-PLAN.md`: storage abstraction, folders, versions, retention, and download audit.
- `docs/plans/ORDER-MANAGEMENT-PLAN.md`: implemented Customer laboratory,
  Partner reagent, Partner data-assembly, and Phaeno operations/configuration
  workflows; remaining items are explicit production-activation and expanded
  integration-test gates.
- `docs/plans/ORGANIZATION-DATA-PROVISIONING-PLAN.md`: Phaeno source-sample registry,
  curated package governance, Prospect/Customer/Partner grants, and tenant
  access. The confirmed baseline and completion/governance slices are
  implemented, their migrations are applied to the configured development
  database, and the rollback-safe PostgreSQL reference journey passes. Actual
  production data/profile approval remains a deployment-content step.

## Living test plans

- `docs/plans/BACKEND-TEST-PLAN.md`
- `docs/plans/FRONTEND-TEST-PLAN.md`
- `docs/plans/E2E-TEST-PLAN.md`

## Durable product guidance

- `docs/user-documentation.md`: authoring, audience, privacy, portability, and future search rules for the in-portal help system.
- `docs/operations-readiness.md`: current runtime, configuration ownership,
  durable delivery, migration handling, and explicit production-activation gates.

## Unapproved future references

- `docs/crm-integration-strategy.md` and `docs/lims-integration-strategy.md` are
  evaluation references only. They are not roadmap commitments, no provider is
  selected, and neither integration exists. QuickBooks Online is the only
  implemented external business system.

## Maintenance rule

Update the owning plan when work starts, decisions change, tests are added, or scope is intentionally deferred. Update the affected audience guide when user-visible behavior changes. Do not add speculative roadmap items here. Add a new plan only when the work has a real owner and a defined decision boundary.
