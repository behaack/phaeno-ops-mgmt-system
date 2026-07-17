# Roadmap index

`docs/plans/` is the roadmap source of truth. This file is a stable index, not a second backlog.

## Product plans

- `docs/plans/AUTH-USER-SYSTEM-PLAN.md`: implemented backend account,
  invitation, authorization, bootstrap, and audit behavior; invitation
  acceptance and the Phaeno organization list/detail, request, entitlement,
  invitation, membership, conversion, and lifecycle workspaces are connected.
  The standalone global User management screen remains a session-only preview.
- `docs/plans/FILE-MANAGEMENT-PLAN.md`: storage abstraction, folders, versions, retention, and download audit.
- `docs/plans/ORDER-MANAGEMENT-PLAN.md`: implemented Customer laboratory,
  Partner reagent, Partner data-assembly, and Phaeno operations/configuration
  workflows; approved next direction adds configured-price standard sales,
  Partner specimen processing, and HubSpot committed-sale publication.
- `docs/plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md`: approved future end-to-end
  HubSpot relationship, evaluation, onboarding, service-entitlement, direct and
  Sales-assisted sale, relationship-change, and offboarding lifecycle. No CRM
  integration is implemented.
- `docs/plans/LAB-OPERATIONS-PLAN.md`: feature-complete approved internal Lab
  Operations application, including Commercial authorization/cancellation
  handoff, additive Lab roles, receipt/accession and lineage, controlled
  protocols and execution, materials/equipment, libraries and cross-order
  batches, provider-neutral outsourced NGS sendouts/custody, exceptions,
  scientific approval, and durable customer-safe projections. Its companion
  `docs/plans/LAB-OPERATIONS-INVENTORY.md` is dated Phase 0 evidence rather than
  current architecture; `docs/plans/LAB-OPERATIONS-CONTRACT.md` governs the
  implemented version 1 Commercial-to-Lab boundary; and
  `docs/plans/PSEQ-OPERATIONS-MIGRATION-PLAN.md` records the completed clean
  Development reset and restructure. The local database is `phaeno_ops`, with
  54 tables in `commercial_ops`, 22 Laboratory tables in `lab_ops`, and EF
  history in `public`. Validation and production activation remain incomplete:
  database-backed Lab suites, representative bench/label/scanner work,
  external NGS operating details, deployment, and production content are
  gates. The automated data-pipeline and scientific file-management boundary
  remains an explicit major TBD.
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
  implemented internal Lab Operations provider and any future third-party LIMS
  replacement; implementation and activation state remains in the Lab
  Operations plan.
- `docs/user-documentation.md`: authoring, audience, privacy, portability, and future search rules for the in-portal help system.
- `docs/operations-readiness.md`: current runtime, configuration ownership,
  durable delivery, migration handling, and explicit production-activation gates.

## Maintenance rule

Update the owning plan when work starts, decisions change, tests are added, or scope is intentionally deferred. Update the affected audience guide when user-visible behavior changes. Do not add speculative roadmap items here. Add a new plan only when the work has a real owner and a defined decision boundary.
