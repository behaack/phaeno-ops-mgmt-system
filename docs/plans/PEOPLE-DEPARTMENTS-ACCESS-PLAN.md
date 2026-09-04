# People and Department Access Plan

Keep this file current as POMS unifies relationship people with Portal access
and introduces department-scoped configuration and authorization.

Do not execute this plan unless explicitly requested. Shared-database
migrations, authentication-provider changes, deployment, Git operations, and
test execution retain their normal approval boundaries.

## Status

- Product direction approved for local implementation on 2026-09-04.
- The CRM information architecture, linked-person identity, Department access
  model, selected-Department context, and primary operational scoping are
  implemented locally.
- Local migrations `20260904171125_AddPeopleAndDepartmentAccess`,
  `20260904172710_ScopeServiceEntitlementsByDepartment`, and
  `20260904173717_ScopeDatasetGrantsByDepartment` are applied to the configured
  development database.
- Existing organizations, memberships, and operational records must continue
  to behave as they do today through an automatically provisioned **General**
  department until an organization deliberately adds another department.

## Product decisions

### People and Portal access

- **People** is the Company-level experience for CRM Contacts, pending Portal
  invitees, and Portal users. Users should not have to reconcile separate
  Contact and User lists to understand who works with a Company or who can sign
  in.
- The underlying records remain distinct:
  - a CRM Contact records a person and the person's commercial relationship;
  - a User records an authenticated identity;
  - an Organization membership grants tenant access;
  - a Department membership limits that access to one or more operational
    units.
- Linking a Contact to a User is explicit and audited. POMS must never link
  identities silently from an email match.
- **Invite to Portal** starts from an eligible Contact. The invitation carries
  the Contact and selected Department intent, and successful acceptance creates
  the reviewed Contact/User link and Department memberships.
- Portal users without a linked Contact remain visible in People as **Unlinked
  Portal user** so staff can resolve the relationship deliberately.
- Phaeno staff who own or sell to an account remain owners and assignees. They
  are not represented as Company Contacts unless they independently have a real
  external relationship to that Company.

### CRM information architecture

The Company workspace uses these focused sections:

1. Overview
2. People
3. Sales
4. Departments & services
5. Requests
6. Activity

People owns Contacts, access state, invitation state, and department access.
Sales owns Opportunities. Requests owns commercial handoffs and intake.
Departments & services owns tenant readiness, department structure, user
access administration, and service/configuration scope.

### Department boundary

- Company remains the canonical commercial customer identity.
- Organization remains the tenant and parent authorization boundary.
- Department is a subordinate operational, security, and configuration scope.
- Every Organization has exactly one default Department. Existing
  Organizations receive a default active **General** department.
- Every active Organization membership must have at least one active Department
  membership. Existing memberships are backfilled into General.
- Organization administrators can see and manage every Department in their
  Organization. Department administrators can manage only the Departments to
  which they are assigned. Members can access only explicitly assigned
  Departments.
- A User may belong to multiple Departments within an Organization.
- Creating, renaming, activating, deactivating, and assigning Departments are
  audited and use optimistic concurrency.
- POMS fails closed when a selected Department is absent, inactive, belongs to
  another Organization, or is not available to the current User.

### Separate Organization versus Department

Use a separate Organization when the unit has separate contracting, tax, legal,
data-ownership, or retention obligations; when one unit must not know another
exists; or when no parent administrator may govern both. Use a Department when
one customer/legal identity shares parent governance but needs different
operational rules or restricted staff access.

### Configuration inheritance

Target configuration precedence (not every layer is implemented yet):

1. POMS system default
2. Organization default
3. Department override
4. Immutable quote/order snapshot

Initial Department-aware settings include service availability, pricing and
billing/PO routing, shipping and result destinations, notifications, and data
package access. Operational records store the selected Department and the
resolved commercial/configuration facts needed to preserve historical meaning.

Current implementation is narrower: Department service entitlements and data
grants, PO requirement (system default: not required), billing email (commercial
profile fallback), shipping instructions (system fallback), notification email,
and snapshotted result-delivery instructions. There is no general Organization
configuration editor, Department pricing schedule, or automatic Department
storage-destination routing. Those capabilities remain planned, not shipped.

## Delivery slices

### 1. Company information architecture

- Split the current Company **People & sales** section into **People** and
  **Sales**.
- Rename the global CRM Contacts destination to **People** while keeping the
  existing route compatible.
- Move Opportunities and commercial handoffs to Sales.

### 2. Unified People identity

- Add an audited Contact/User link.
- Add a Company-scoped People projection containing Contact, Portal User,
  invitation, organization-membership, and department-membership state.
- Add explicit link/unlink and Contact-originated invitation actions.
- Show unlinked users and actionable identity conflicts without automatic
  email linking.

### 3. Department foundation

- Add Department and Department membership entities, constraints, lifecycle,
  administration endpoints, and Company UI.
- Create General for existing and newly created Organizations.
- Backfill existing Organization memberships into General.
- Add Department intent to invitations and apply it on acceptance.

### 4. Selected Department and authorization

- Include available Departments in session state.
- Persist and send the selected Department with authenticated requests.
- Validate selected Organization plus Department server-side.
- Keep General selected automatically for single-Department Organizations so
  existing workflows remain uninterrupted.

### 5. Configuration and operational scoping

- Add typed Organization defaults and Department overrides rather than an
  unstructured rule blob.
- Add Department ownership to customer operational roots and inherit it to
  samples, files, results, notifications, searches, counts, and exports.
- Enforce Department isolation in backend reads and writes before enabling a
  second Department for a customer.
- Snapshot resolved configuration at quote/order commitment boundaries.

### 6. Documentation and verification

- Update the CRM, authentication, architecture, business-rule, database ERD,
  user-guide, backend-test, frontend-test, and E2E-test documents.
- Cover migration/backfill, link acceptance, multi-department membership,
  selected-context validation, cross-department denial, and no-leakage paths.
- Complete security-focused signed-in acceptance before enabling
  multi-department customer use outside local development.

## Local implementation record

- Company navigation now separates People, Sales, Departments & services,
  Requests, and Activity. The global CRM destination is labeled People while
  preserving `/crm/contacts` compatibility.
- The People projection unifies CRM Contacts, Portal invitations, Users, and
  Department access without collapsing their underlying records. Link and
  unlink actions are explicit and audited; an email match is only a review
  suggestion.
- Every Organization has an active default General Department. Existing
  memberships, invitations, and operational roots were backfilled locally;
  new invitations carry Department intent through acceptance.
- Session state and authenticated API requests carry a selected Department.
  The API independently validates Organization membership, Department access,
  lifecycle, and Department-admin authority.
- Department administrators can review download history for their selected
  Department, but organization-wide governance attestations remain restricted
  to Organization administrators.
- Lab Service, data assembly, reagent ordering, shipping, results, customer
  notices, service entitlements, and curated-data grants now carry or resolve
  Department scope. Organization-wide service/data defaults remain possible;
  Department-specific service rules take precedence.
- Lab quote acceptance snapshots the selected Department, PO value, and typed
  Department routing configuration. Department shipping instructions are
  frozen when the Lab Service order is created, billing email overrides are
  frozen into issued commercial terms, and Department notification addresses
  participate in scoped delivery.
- The follow-up review authorized local verification. See the review record
  below for executed tests; signed-in multi-Department acceptance is still a
  separate release gate.

## Drift and usability review - 2026-09-04

- Corrected People API envelope handling, which previously crashed the People
  section; historical associations no longer duplicate the same person.
- Closed wrong-Organization Department-member lookup and cross-Department
  invoice PDF/result-download paths. No active Department fails closed.
- Department service precedence now resolves overrides before testing Ready;
  staff initiation, staging, and quote issue check the chosen Department.
- Invitations fail closed when Department intent or the Contact relationship is
  no longer valid. Reissue replaces intent deliberately; no General fallback.
- Default changes use ordered writes in one transaction to respect the immediate
  unique index. Deactivation cannot strand active members; reactivation does not
  silently restore assignments. Quote responses no longer duplicate EF-fixed-up
  quote entries.
- Request scope is captured before delayed authentication; context switches
  remount workspace state and clear non-session query data.
- Department forms now use RHF/Zod, matching field limits, accessible errors,
  unsaved-change confirmation, pending guards, focus restoration, and 409
  recovery preserving entries. Lifecycle/member changes require review.
- Staff-created Customer Jobs expose Department selection. Single-department
  organizations keep the default automatically.
- Reviewed responsive desktop/light and mobile/dark dialogs using the existing
  Playwright tooling after the optional agent-browser CLI was unavailable.
  Browser mocks verify UI contracts; rollback-backed PostgreSQL tests verify
  actual enforcement. These are not a substitute for signed-in acceptance.
- Corrected stale unit-test labels/async assertions, schema-index assertions,
  and database-fixture cleanup for the new Department foreign keys.
- Final local checkpoint: backend build passed with no warnings; frontend lint
  and typecheck passed; 243 non-reference backend tests passed, 42 focused
  database/security/quote tests passed with no skips, 140 frontend unit tests
  passed, and 10 desktop/mobile CRM and People/Department browser cases passed.
  The focused backend set overlaps the non-reference set; counts are not additive.
  Remaining opt-in backend and signed-in browser cases are still deferred.

### Remaining product and release gaps

- Department administration UI currently lives in the Phaeno Company workspace.
  Dedicated external Department-admin self-service and Department selection in
  the legacy organization-user invitation form remain unfinished. The latter
  still defaults to General; use reviewed Company People invitations for scoped
  intent.
- Configuration capabilities listed as planned above remain incomplete.
- Complete signed-in two-department tests for grant/download history, notices,
  identity link acceptance, in-flight switching, and all secondary operational
  exports before enabling multi-department customer use outside local development.

## Acceptance criteria

- A Company operator can understand contacts and Portal-access state from one
  People section.
- A Contact becomes a Portal user only after an explicit invite/link workflow.
- Sales records no longer share the Company People surface.
- Every Organization and membership has a safe General department after
  migration without changing existing access.
- Authorized administrators can manage Departments and assignments without
  granting unintended Organization access.
- Users can operate only in an active Department available through their active
  Organization membership.
- Customer data cannot leak across Departments through detail pages, lists,
  search, counts, exports, downloads, audit views, or notifications.
- Quotes and committed orders retain the Department and resolved commercial
  configuration that governed them.

## Release gates

- Additive local migration and backfill verified against the configured local
  database.
- Backend build and frontend lint/typecheck complete.
- Local automated verification is recorded in the living test plans. Remaining
  signed-in and shared-environment gates are not marked complete by local tests.
- No shared migration, commit, push, deployment, or customer enablement occurs
  without separate authorization.
