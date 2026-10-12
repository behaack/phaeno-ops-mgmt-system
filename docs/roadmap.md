# Roadmap index

`docs/plans/` is the roadmap source of truth. This file is a stable index, not a second backlog.

## Product plans

- `docs/plans/SYSTEM-GAP-CLOSURE-PLAN.md`: October 11 authorized implementation/closure
  register for correctness, complete record discovery, shared UI recovery,
  documentation reconciliation, Customer-only localization and production/
  bench acceptance. It distinguishes current-offering gaps from deferred scope.
- `docs/plans/WORK-DASHBOARD-AND-NOTIFICATIONS-PLAN.md`: Owner-confirmed
  direction for a useful work dashboard plus header bell backed by one
  authorized actionable-work list. Phaeno staff default to assigned plus
  eligible unassigned work. Local implementation and requested regression
  verification are recorded; complete source/actor acceptance remains open.
- `docs/plans/AUTH-USER-SYSTEM-PLAN.md`: implemented backend account,
  invitation, authorization, bootstrap, and audit behavior; invitation
  acceptance and the Phaeno organization list/detail, request, entitlement,
  invitation, membership, conversion, lifecycle, and consolidated User
  management workspaces are connected to durable APIs.
- `docs/plans/FILE-MANAGEMENT-PLAN.md`: storage abstraction, folders, versions, retention, and download audit.
- `docs/plans/ORDER-MANAGEMENT-PLAN.md`: implemented Customer laboratory,
  Partner reagent, Partner data-assembly, and Phaeno operations/configuration
  workflows, configured-price standard sales, Partner specimen processing,
  Kit-linked cases and first-party committed-sale summaries. Multi-service
  ordering remains future scope.
- `docs/plans/CRM-PLAN.md`: approved full first-party CRM for Companies,
  Contacts, Leads, Opportunities, pipelines, Activities, Tasks, reporting, data
  quality, and CRM-to-POMS commercial handoffs. The standalone version 1 is
  implemented locally; connected communications, marketing automation, and any
  external CRM adapter remain future work.
- `docs/plans/STANDALONE-COMMERCIAL-LIFECYCLE-PLAN.md`: approved standalone
  CRM-to-Portal account, evaluation, onboarding, service-entitlement, direct and
  sales-assisted sale, relationship-change, and offboarding lifecycle.
- `docs/plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md`: superseded historical HubSpot
  design retained only for a possible future adapter.
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
  Development reset and restructure. Current baseline/subsequent migrations
  separate `commercial_ops`, `lab_ops` and `website`, with EF history in `public`;
  the complete model is in the ERD. Commercial acceptance remains incomplete:
  database-backed Lab suites, representative bench/label/scanner work,
  external NGS operating details, deployment, and production content are
  gates. Scientific file custody is implemented; real processing acceptance is
  separately tracked in the processing contract plans.
- `docs/plans/PROSPECT-TRIAL-PROJECT-PLAN.md`: implemented no-charge,
  closed-ended Trials with direct Company/Department creation, leadership
  approval, Prospect acceptance and shared Lab/shipping/results. Operational
  and scientific acceptance remain separate gates.
- `docs/plans/SAMPLE-SHIPPING-AND-INTAKE-PLAN.md`: approved shared direction
  for shared Prospect Trial Project and Customer promotional freebie sample
  shipping, including multiple controlled destinations and sample types,
  detailed versioned instructions, printable ship-to label/manifest packets,
  pre-receipt packet barcodes, and scan-first Lab intake. Shared configuration,
  return-kit and registered-tube inventory, external tube-to-sample assignment,
  retained crosswalk/print/CSV outputs, packet-plus-tube comparison scanning,
  and Lab supplier-barcode adoption are implemented. Trial parent issuance is
  connected; Customer promotional placement, physical validation and commercial
  activation remain future work.
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

- `docs/crm-integration-strategy.md`: first-party CRM and future optional
  external-CRM system ownership and data-boundary guidance; implementation
  state remains in the owning CRM and standalone lifecycle plans.
- `docs/lims-integration-strategy.md`: durable provider-neutral boundary for the
  implemented internal Lab Operations provider and any future third-party LIMS
  replacement; implementation and activation state remains in the Lab
  Operations plan.
- `docs/user-documentation.md`: authoring, audience, privacy, portability, and future search rules for the in-portal help system.
- `docs/operations-readiness.md`: current runtime, configuration ownership,
  durable delivery, migration handling, and explicit production-activation gates.

## Maintenance rule

Update the owning plan when work starts, decisions change, tests are added, or scope is intentionally deferred. Update the affected audience guide when user-visible behavior changes. Do not add speculative roadmap items here. Add a new plan only when the work has a real owner and a defined decision boundary.
