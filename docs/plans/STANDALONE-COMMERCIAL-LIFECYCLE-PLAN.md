# Standalone Commercial Lifecycle Plan

Keep this file updated as POMS account, prospect, commercial-intake, and
relationship-lifecycle workflows are implemented.

Do not execute this plan unless explicitly requested. Database migrations,
dependency changes, authentication changes, deployment, and test execution
retain their normal approval boundaries.

## Status

- Product direction changed on 2026-08-26: develop POMS as a complete
  standalone application without a HubSpot runtime integration.
- POMS must support its core Customer, Prospect, Partner, Trial Project,
  standard-order, custom-work, relationship-change, and offboarding workflows
  without CRM credentials, CRM identifiers, webhooks, CRM availability, or
  manual work in another system.
- POMS will include a first-party CRM. That CRM is the standalone relationship
  and sales system of record and is part of the intended product, not a thin
  placeholder for HubSpot.
- The standalone CRM v1 was implemented locally on 2026-08-26. It provides
  first-party relationship, qualification, pipeline, activity, task, reporting,
  data-quality, import/export, and administration workflows while keeping CRM
  records separate from Portal accounts, access, entitlements, and work.
- A later external CRM integration remains a permitted future enhancement, not
  a current dependency or delivery phase. HubSpot is a possible future
  migration or synchronization adapter, not the foundation of the current
  product.
- The former Phase 0 HubSpot developer shell is historical proof only. Its
  simulation endpoints and controls have been removed. Historical
  HubSpot-sourced requests remain readable, but no runtime integration or
  HubSpot-specific identifier is required by an active workflow.
- POMS already owns durable organizations, requests, approvals, memberships,
  entitlements, operational work, results, and audit history. Preserve those
  boundaries and extend them instead of adding a parallel commercial system.
- QuickBooks Online integration is deferred. POMS owns the active commercial
  catalog, immutable quote and billing-source facts, credit/release state, and
  the Phaeno-only manual journal-entry source report. Finance prepares and
  posts journal entries and invoices outside POMS under a separately approved
  reconciliation procedure. Dormant QuickBooks adapter and compatibility types
  are not active runtime dependencies and do not establish payment state.

## Product Need

Phaeno staff need to manage the commercial relationship and operate the
scientific product from one application. POMS therefore includes a full
first-party CRM as well as the Portal account and operational workflows. A
missing external CRM must not prevent staff from managing companies, contacts,
opportunities, pipelines, activities, tasks, follow-up, reporting, onboarding,
Prospect evaluations, custom work, or authorized operations.

`CRM-PLAN.md` owns the first-party CRM capability and phased delivery. This
plan owns the controlled transition from CRM relationship and sales records
into Portal accounts, Trial Projects, custom work, orders, relationship
changes, and offboarding.

## Users And Outcomes

### Authorized Phaeno user

- creates and manages CRM companies, contacts, leads, opportunities, pipeline
  stages, activities, tasks, notes, and follow-up inside POMS
- searches and reports on commercial relationships without creating a Portal
  tenant for every CRM record
- creates a proposed Prospect, Customer, or Partner account in POMS
- records the primary relationship contact, Phaeno owner, business objective,
  commercial justification, requested services, and intended relationship
- submits the proposal into the existing review boundary rather than granting
  access directly
- reviews, approves, returns, declines, applies, or closes requests according
  to existing authorization and concurrency rules
- invites the designated Portal administrator only after the account decision
- chooses the default-on Customer ordering authorization during account
  creation, then configures readiness and any other service entitlements in
  their owning account surfaces
- records custom-work, Trial Project, relationship-change, and
  offboarding requests inside POMS
- records commercial follow-up and final outcome when those facts are required
  by the owning workflow

### External organization administrator

- receives access only through the existing Phaeno-controlled invitation flow
- manages permitted organization users and performs only the ordering,
  submission, or Trial Project actions allowed by the organization's kind,
  readiness, entitlements, and project-specific authorization

### External organization member

- receives only the view, progress, and released-output capabilities granted by
  the owning workflow
- cannot create accounts, approve commercial requests, grant entitlements, or
  gain access from a relationship record alone

## Authoritative Product Boundary

POMS owns all state required to operate the standalone product:

- CRM companies, contacts, associations, ownership, leads, opportunities,
  pipelines, stages, activities, notes, tasks, follow-up, and commercial
  reporting
- Prospect, Customer, and Partner organizations
- Portal users, invitations, memberships, roles, and access decisions
- primary operational and relationship contacts used by POMS workflows
- requested and enabled services
- onboarding, evaluation, custom-work, relationship-change, and offboarding
  requests
- Trial Project commercial context, scientific scope, approvals, operational
  state, commercial follow-up, and final disposition
- direct and sales-assisted order handoffs
- readiness, entitlements, projects, samples, laboratory work, results, and
  audit history
- committed-sale records and the approved manual-accounting boundary

A CRM company or contact is not a Portal organization or Portal user. Only an
explicit approved transition creates or links a Portal account, and only the
invitation flow creates access.

A future external CRM may import, export, or synchronize approved
relationship-safe facts through an adapter. It may not be required to use any
POMS business record, grant Portal access, activate a service, create
executable scientific work, or overwrite POMS-owned operational state.

## Confirmed Product Rules

1. A CRM company, contact, or lead is not automatically a Portal account.
2. A Portal Prospect is an approved evaluation tenant, not a CRM lead or
   opportunity stage.
3. An account proposal begins as a request. Creation or approval alone grants
   no invitation, membership, service entitlement, order, or laboratory work.
4. A company already approved to buy may be created directly as a pending
   Customer or Partner; it need not pass through Prospect.
5. Prospect conversion is an explicit, authorized POMS action and preserves
   the stable organization identity, users, Trial Projects, results, grants,
   retention dates, and audit history.
6. Standard configured work may be placed directly in POMS. Unsupported or
   negotiated scope creates a POMS custom-work request for internal commercial
   handling and later operational validation.
7. A Trial Project request and its commercial outcome are entered and managed
   in POMS for the standalone release. Trial completion never causes automatic
   Customer or Partner conversion.
8. Partner specimen work belongs to the Partner. POMS does not require or infer
   the Partner's downstream-customer identity.
9. Scientific, laboratory, file, patient, and protected data remain outside any
   future CRM boundary.
10. Integration delivery state is never a business status. A future sync
    failure cannot roll back or block an authoritative POMS transaction.

## Standalone Workflows

### Account proposal and onboarding

1. An authorized Phaeno user opens the CRM Company and selects **Create
   handoff**.
2. POMS captures the proposed organization kind, linked Opportunity when
   applicable, requested services, business purpose, and safe internal notes.
3. POMS creates a pending request with its own stable request identifier and
   records the actor and time.
4. An authorized reviewer approves, returns, or declines the request using the
   existing review queue and optimistic-concurrency rules.
5. Approval atomically creates and associates the pending organization when one
   does not already exist. For a Customer, the reviewer also sees an explicit
   **Ordering authorized** choice that defaults on. On creates a current,
   `Ready` PSeq Lab Service entitlement in the same transaction; off creates
   the account without ordering access. Neither choice grants user access or
   creates an order.
6. Staff complete readiness, review or add any remaining approved services,
   and invite the designated organization administrator through explicit
   actions.
7. Staff mark the request complete only after the owning setup checks pass.

### Trial Project request

1. An authorized Phaeno user creates a commercial-only Trial Project request in
   POMS with the Prospect, primary contact, Phaeno owner, intended relationship,
   business objective, and commercial justification.
2. Authorized Phaeno users define all scientific and operational scope in POMS.
3. The owning Trial Project plan controls dual approval, Prospect acceptance,
   submission, processing, result release, retention, and closure.
4. POMS records an owned and dated follow-up or one final commercial outcome:
   conversion to Customer, conversion to Partner, or closed without conversion
   with a reason.
5. Conversion remains a separate authorized POMS action.

### Custom or sales-assisted work

1. Standard configured work remains in the direct-order path.
2. Ineligible or negotiated scope creates a POMS custom-work request linked to
   the organization and Phaeno owner.
3. Staff record scoping, commercial decision, and the accepted commercial
   snapshot in POMS using the owning order plan's boundaries.
4. Pre-entitlement discovery, negotiation, and estimates remain CRM custom-work
   facts rather than Customer Jobs. Before a sales-assisted request can become
   an Order Management Job, the Customer must have an effective, `Ready` PSeq
   Lab Service entitlement and active offering. An approved exception grants an
   explicit, audited, and, when appropriate, time-bounded entitlement rather
   than bypassing eligibility.
5. Acceptance creates a pending operational handoff. It never silently creates
   active laboratory work. Ending an entitlement later blocks new orders but
   does not silently discard accepted work; that work follows its owning hold
   or cancellation workflow.
6. For the implemented Customer PSeq Lab Service slice, a Won Opportunity or
   Company-level custom-work decision creates a pending `SalesAssistedOrder`
   request. After Portal account review approves the Customer, service, and
   ordering prerequisites, authorized staff can start one Order Management Job
   from that request. Order creation and the request's Applied transition are
   atomic. The immutable source request links the order back to its CRM Company
   and optional Opportunity; reopening the Opportunity does not mutate the
   accepted order.
6. For the implemented Customer PSeq Lab Service slice, a Won Opportunity or
   Company-level custom-work decision creates a pending `SalesAssistedOrder`
   request. After Portal account review approves the Customer, service, and
   ordering prerequisites, authorized staff can start one Order Management Job
   from that request. Order creation and the request's Applied transition are
   atomic. The immutable source request links the order back to its CRM Company
   and optional Opportunity; reopening the Opportunity does not mutate the
   accepted order.

### Relationship change and offboarding

1. Authorized staff submit the proposed relationship or lifecycle change in
   POMS with its reason and effective intent.
2. The review surface shows current and proposed values and their consequences.
3. Approval changes only the explicitly approved relationship state.
4. Access, active work, files, retention, billing, and service entitlements are
   reviewed through their owning workflows and never silently discarded.

## Experience Direction

- CRM is a first-class POMS workspace for companies, contacts, opportunities,
  pipelines, activities, tasks, and relationship reporting.
- Portal accounts is a separate POMS-owned Portal account directory and review
  workspace, not a disconnected-integration status page.
- The Administration menu, dashboard selector, workspace heading, and return
  links consistently label this destination **Portal accounts** so it cannot be
  mistaken for the CRM Companies directory.
- The list remains a form-free discovery surface. A bounded create action opens
  a modal and submits a request; selecting the organization opens its dedicated
  detail workspace.
- CRM Companies and Portal Accounts use distinct labels, routes, and records.
  The CRM company workspace exposes an explicit, authorized action to propose
  or link a Portal account when the relationship reaches the right point.
- Production-authorized manual entry replaces development-only HubSpot
  simulation. The Portal accounts review queue exposes **New Portal account
  request** only as a restricted migration or recovery path; it submits into
  the same audited review boundary and does not directly activate users or
  services. Users do not enter HubSpot Company or Deal identifiers.
- Order Operations presents POMS intake and review queues. It does not describe
  pending work as HubSpot handoffs.
- Internal screens may show Phaeno owner, primary contact, business purpose,
  commercial decision, and audit context. External users never see internal
  notes or internal commercial review details.
- A future connected CRM summary may be added as an optional internal panel.
  The core workspace remains complete and understandable when that panel is
  absent or unavailable.

## Future Integration Seams

Future-proofing means preserving clean boundaries now; it does not mean adding
an unused HubSpot dependency.

### Domain and persistence

- Use POMS identifiers as business identifiers.
- Keep first-party CRM identities independent from Portal organization,
  request, order, and Trial Project identities; connect them with explicit
  internal links and audited transitions.
- Represent external origin as a provider-neutral concept such as `Internal`
  or `ExternalIntegration`; retain legacy HubSpot values only as historical
  data.
- Store future external links in integration metadata keyed by provider,
  external object type, and external identifier. Do not add vendor identifiers
  to core business aggregates.
- Enforce uniqueness and idempotency at the integration boundary so retries
  cannot duplicate organizations, requests, orders, invitations, or
  entitlements.
- Keep business status separate from integration delivery, retry, and
  reconciliation state.

### Application contracts

- Route first-party CRM actions and future inbound adapters through the same
  CRM application services and authorization policies.
- Route CRM-to-Portal transitions through provider-neutral commercial
  application commands so a future external CRM does not call operational
  aggregates directly.
- Publish versioned provider-neutral integration events after authoritative
  commits through a durable outbox. With no provider configured, no outbound
  delivery is attempted and no user-visible warning is created.
- Keep provider models, authentication, webhook validation, property mapping,
  retry, and rate-limit behavior outside the Commercial domain.
- A future adapter must be feature-gated, disabled by default, and removable
  without changing the standalone workflows.

### Security and privacy

- Exchange only the minimum relationship-safe fields authorized by an owning
  plan.
- Never send sample identifiers, scientific results, raw files, QC details,
  custody details, patient data, PHI, internal notes, or credentials to a CRM.
- Authenticate and replay-protect future inbound events; audit mapping and
  publication without logging secrets or sensitive payloads.

## Implementation Slices

The first-party CRM is implemented through `CRM-PLAN.md`. The slices below
integrate that CRM with existing Accounts and operational boundaries.

### Slice 1: First-party CRM foundation and standalone Accounts entry — completed

- Implement the first CRM foundation slice from `CRM-PLAN.md`.
- Replace the development-only HubSpot account simulator with an authorized,
  production-safe **Propose Portal account** flow from a CRM Company. Keep a
  restricted direct proposal path for authorized migration and recovery.
- Remove required HubSpot Company and Deal identifiers from the user workflow.
- Create a provider-neutral internal request through the existing durable
  review and approval boundary.
- Preserve atomic approval-plus-account creation, pending readiness, the
  default-on but explicit Customer ordering-authorization choice, separate
  invitation handling, recovery behavior, and request completion.
- Update Accounts help and focused backend, frontend, and E2E coverage.

### Slice 2: CRM-owned commercial intake — completed

- Replace the development-only HubSpot handoff simulator with authorized POMS
  CRM entry for Trial Project and sales-assisted/custom-work requests.
- Rename queue labels and messages around POMS requests and operational review.
- Preserve replay protection through POMS idempotency keys and existing
  organization/service validation.
- Do not create executable Trial Project or order work from intake alone.

### Slice 3: Provider-neutral contract cleanup — completed for active paths

- Add the approved internal request origin and migrate active UI/API behavior
  away from HubSpot-specific DTO, endpoint, error, and source names.
- Preserve any historical HubSpot-sourced rows and their audit meaning.
- Introduce provider-neutral external-link and integration-delivery structures
  only when an authorized implementation needs them; update the database ERD
  with any persisted-model change.
- Keep any future provider adapter outside the core CRM domain and introduce it
  only under fresh explicit scope.

### Slice 4: Complete CRM and standalone operational journeys — CRM boundary completed

- The complete first-party CRM and its reviewed handoff boundary are
  implemented. Trial Project, configured direct-order, custom-work,
  relationship-change, and offboarding execution after review remain governed
  by their owning plans.
- Local builds and tests verify that the CRM has no external CRM configuration
  dependency. Shared-environment and signed-in Product Owner acceptance remain
  release activities and were not performed by this local implementation.

### Deferred: CRM adapter

- Re-evaluate the commercial need, provider, fields, data ownership, privacy,
  account tier, and operating cost before implementation.
- Add a provider adapter only under fresh explicit scope.
- Treat `HUBSPOT-PORTAL-LIFECYCLE-PLAN.md` and
  `docs/crm-integration-strategy.md` as future-integration references, subject
  to this standalone-first authority.

## Acceptance Criteria

- POMS starts and operates with no external CRM credentials or configuration.
- Authorized staff can manage companies, contacts, opportunities, pipelines,
  activities, tasks, and commercial reporting inside POMS.
- Authorized staff can create and resolve Prospect, Customer, and Partner
  Portal account proposals from the first-party CRM entirely in POMS.
- No standalone account or commercial-intake form requires a CRM record or
  external identifier.
- Approval and account creation remain atomic. Customer ordering authorization
  is an explicit, audited choice on that operation and defaults on; invitation,
  readiness completion, and executable work remain separate and auditable.
- Authorized staff can create Trial Project and custom-work requests entirely
  in POMS without creating active work prematurely.
- External users receive only the capabilities granted by organization kind,
  readiness, membership, entitlement, and project-specific authorization.
- Core screens contain no false "HubSpot disconnected" blockers or instructions
  to complete required work in HubSpot.
- All core records remain usable when no external link exists.
- Future adapter code can call the same application commands and consume the
  same post-commit events without changing core domain records or UI workflows.
- A configured future integration failure is visible and retryable to
  authorized staff but never changes a successful POMS business transaction.
- Scientific and protected data never cross the future CRM boundary.

## Success Measures

- 100% of core account and commercial-intake journeys can be completed in POMS.
- 100% of planned CRM relationship and sales workflows can be completed without
  HubSpot.
- 0 required CRM identifiers in standalone workflows.
- 0 runtime external CRM calls when no provider is configured.
- 0 access grants or executable work items created implicitly by commercial
  intake.
- 0 duplicate business records from retried commands or future integration
  delivery.
- 0 scientific, patient, or protected-data disclosures through integration
  payloads.

## Deferred And Out Of Scope

- live HubSpot authentication, scopes, webhooks, synchronization, or production
  connection
- automatic account access, entitlement, order, Trial Project, conversion, or
  offboarding from a future CRM stage change
- bidirectional synchronization without an explicit field owner and conflict
  rule
- another CRM provider without a separately confirmed product need
