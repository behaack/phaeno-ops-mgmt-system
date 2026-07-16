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
  workflows; approved next direction adds configured-price standard sales,
  Partner specimen processing, and HubSpot committed-sale publication.
- `docs/plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md`: approved future end-to-end
  HubSpot relationship, evaluation, onboarding, service-entitlement, direct and
  Sales-assisted sale, relationship-change, and offboarding lifecycle. No CRM
  integration is implemented.
- `docs/plans/LAB-OPERATIONS-PLAN.md`: approved future separation of Commercial
  Operations from a fit-for-purpose internal Lab Operations module, including
  versioned protocols, reagent and library preparation, outsourced NGS, and a
  replaceable provider boundary. Its companion
  `docs/plans/LAB-OPERATIONS-INVENTORY.md` records the completed current-state
  inventory and target ownership classification;
  `docs/plans/LAB-OPERATIONS-CONTRACT.md` defines the planned version 1
  Commercial-to-Lab contract; and
  `docs/plans/PSEQ-OPERATIONS-MIGRATION-PLAN.md` defines the approved clean
  development database/migration reset and restructuring sequence. The
  solution/project shells and single-context schema target are restructured,
  and the Accounts, Relationships, and Data Provisioning domain/application
  slices are extracted into Commercial. Commercial Order Management
  extraction, the destructive development reset, clean initial migration, and
  Lab module are not implemented. The automated
  data pipeline and scientific file-management boundary is an explicit major
  TBD.
- `docs/plans/PROSPECT-TRIAL-PROJECT-PLAN.md`: approved future no-charge,
  closed-ended Prospect Trial Project requested from HubSpot and governed in
  the Portal. It is not implemented.
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

- `docs/crm-integration-strategy.md`: approved HubSpot/Portal/QuickBooks system
  ownership and data-boundary guidance; implementation state remains in the
  owning lifecycle plan.
- `docs/lims-integration-strategy.md`: durable provider-neutral boundary for the
  planned internal Lab Operations provider and any future third-party LIMS
  replacement; implementation state remains in the Lab Operations plan.
- `docs/user-documentation.md`: authoring, audience, privacy, portability, and future search rules for the in-portal help system.
- `docs/operations-readiness.md`: current runtime, configuration ownership,
  durable delivery, migration handling, and explicit production-activation gates.

## Maintenance rule

Update the owning plan when work starts, decisions change, tests are added, or scope is intentionally deferred. Update the affected audience guide when user-visible behavior changes. Do not add speculative roadmap items here. Add a new plan only when the work has a real owner and a defined decision boundary.
