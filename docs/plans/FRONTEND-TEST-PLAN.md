# Frontend Test Plan

Keep this file updated as frontend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

The Lab Operations workspace is implemented, linted, typechecked, and included
in a successful client/SSR build. Barcode encoding, scan-first lookup/batch
entry, and reasoned print-outcome behavior have focused component coverage.
The remaining connected-workspace coverage below and physical bench acceptance
remain incomplete production-activation gates.

## Created Tests

- [x] `frontend/src/features/file-management/FileManagementPage.test.tsx` -
  covers Phaeno platform-administrator authorization, the global 30/5/5
  display, and a reasoned version update.
- [x] `frontend/src/features/file-management/OrganizationRetentionPolicyPanel.test.tsx`
  - covers partial global inheritance, an organization-specific update, the
  required removal reason, and override removal.
- [x] `frontend/src/features/orders/ReleasedDeliverableRetentionNotice.test.tsx`
  - covers frozen standard-deletion and conditional-grace display, activated
  grace labeling, exact machine-readable timestamps, and omission for a
  historical release without a snapshot.
- [ ] File management follow-up coverage - cover invalid effective day
  combinations, API/concurrency recovery, connected route behavior, and
  Customer/Partner detail integration around the shared retention notice.

- [x] `frontend/tests/invite-schema.test.ts` - `inviteSchema` accepts a valid invite payload.
- [x] `frontend/tests/invite-schema.test.ts` - `inviteSchema` rejects invalid email addresses.
- [x] `frontend/src/features/organizations/OrganizationDetailPage.test.tsx` - the development sign-in-link dialog exposes the generated link and copies it with an announced status.
- [x] `frontend/src/components/navigation.test.ts` - Phaeno context shows Data
  provisioning and hides the tenant Data Library.
- [x] `frontend/src/components/navigation.test.ts` - Prospect, Customer, and
  Partner contexts show the Data Library and hide Phaeno provisioning.
- [x] `frontend/src/components/navigation.test.ts` - order navigation is scoped
  to Customer lab, Partner reagent/assembly, and Phaeno operations/configuration
  capabilities without leaking the other organization-kind surfaces.
- [x] `frontend/src/components/navigation.test.ts` - Samples & shipping appears
  for authorized Prospect and Customer contexts and remains hidden from Partner
  contexts.
- [x] `frontend/src/components/navigation.test.ts` - Docs navigation is
  available as a primary workspace destination in Prospect, Customer, Partner,
  and Phaeno organization contexts.
- [x] `frontend/src/components/navigation.test.ts` - frequent workspace routes,
  including Docs, remain in the desktop toolbar while Data provisioning and
  Accounts and other administration or resource routes move to the user
  dropdown without changing permission filtering.
- [x] `frontend/src/components/application-branding.test.ts` - the selected
  Phaeno organization resolves to POMS, external organization kinds resolve to
  Portal, and the pre-selection fallback is Portal.
- [x] `frontend/src/features/documentation/documentation-registry.test.ts` - the
  maintained Prospect, Customer, Partner, and Phaeno registries expose unique,
  ordered, backend-indexable metadata, resolve slugs only within their audience,
  and keep Phaeno operational subtopics in one valid parent level.
- [x] `frontend/src/features/data-provisioning/DataProvisioningPage.test.tsx` -
  mock mode exposes the source surface without calling the secured API and the
  edge rail exposes all four Phaeno configuration sections with the active
  section identified.
- [x] `frontend/src/components/WorkspaceSidebar.test.tsx` - the shared
  viewport-edge sidebar remembers pin choices, switches sections, opens a
  non-modal rail from pointer hover or the accessible edge tab, restores the
  pinned rail on wide layouts, and omits pin controls on narrow layouts.
- [x] `frontend/src/features/data-provisioning/SourceSampleWorkspace.test.tsx` -
  draft discard requires a reason, sends the current optimistic version, and
  returns to the source registry after success.
- [x] `frontend/src/features/data-library/DataLibraryPage.test.tsx` - mock mode
  explains that connected tenant data is paused without presenting a false
  empty-grant state.
- [x] `frontend/src/features/data-library/GovernanceNoticePanel.test.tsx` - an
  organization administrator must provide remediation details and submits the
  current affected-organization concurrency version.
- [x] `frontend/src/features/organizations/LifecycleActionDialog.test.tsx` -
  organization deactivation names its access consequence, and entitlement end
  requires and submits a retained reason.
- [x] `frontend/src/features/organizations/EntitlementDialog.test.tsx` - the
  approved source-request selector includes only requests for the current
  organization and selected service while preserving a documented manual
  exception.
- [x] `frontend/src/features/lab-operations/Code39Barcode.test.tsx` - POMS
  barcodes encode with Code 39 start/stop characters and unsupported
  characters are rejected rather than rendered ambiguously.
- [x] `frontend/src/features/lab-operations/LabBarcodeScanner.test.tsx` - exact
  container lookup presents the linked work context and scan-first batch entry
  rejects a non-library container without changing membership.
- [x] `frontend/src/features/lab-operations/LabLabelDialog.test.tsx` - the
  browser print action waits for explicit physical success confirmation, a
  failed attempt requires details, and success/failure outcomes are recorded
  separately.
- [x] `frontend/src/features/lab-operations/protocol-definition.test.ts` -
  structured definitions round-trip for resume/clone workflows, older empty
  definitions open as one editable step, and invalid JSON is rejected.
- [x] `frontend/src/features/lab-operations/MaterialLotCreateDialog.test.ts` -
  supplier-lot validation accepts date-only expiration, prepared reagents
  require structured component lots, and modal related-reference creation
  requires names.
- [x] `frontend/src/features/orders/configuration/OrderConfigurationPage.test.tsx`
  - the six Order Configuration subjects, including Sample shipping, use the shared viewport-edge
  sidebar, identify Defaults initially, and update the active subject when the
  user selects another panel.
- [x] `frontend/src/features/orders/configuration/SampleShippingConfigurationPanel.test.tsx`
  - current versioned destinations, sample types, and combination rules render;
  instruction preview submits exact revisions and presents resolved content;
  and destination changes open an immutable successor revision instead of
  editing the current record.
- [x] `frontend/src/features/dashboard/WebOpsDashboardContent.test.tsx` -
  the two-button selector shows one mailing-list or demo-request panel at a
  time; panels render their counts, contact context, technical-brief state,
  explicit mock-data identity, page-size-10 footer paginators, independent
  pagination actions, single-page paginator suppression, and isolated retryable
  API failures. Connected panels require confirmation before unsubscribe or
  demo completion, explain that original intake is retained, invoke the
  selected record action, and show contextual success feedback; mock panels do
  not expose persistence actions.

## Deferred Tests

- [ ] Customer laboratory draft workspace - cover Job details create/edit modal
  required-name and Description validation, duplicate-name feedback, and dirty-
  dismissal; redirect after empty-draft creation; Job name/Job number display;
  the zero-sample detail empty state; Add/Edit sample modal validation and
  analysis selection; confirmed sample removal including the last sample;
  optimistic-version recovery; and no-PHI submission confirmation that stays
  unavailable until at least one sample exists.
- [ ] `frontend/src/features/dashboard/ExternalDashboardContent.test.tsx` -
  cover Customer, Prospect, and Partner card selection, connected summary and
  error states, organization switching, and complete absence of internal mock
  Accounts metrics from external dashboards.
- [ ] HubSpot lifecycle components - cover pending-request queues, exact proposed
  changes, readiness review, internal-only HubSpot summary and deep links,
  service-entitlement activation, relationship/offboarding warnings, retryable
  sync failure, complete hiding of HubSpot context from external users, and the
  Order Intake development simulator's sales-assisted versus Trial Project
  fields, organization-kind filtering, validation, duplicate-Deal feedback,
  success refresh, and production hiding.
- [ ] Direct and Sales-assisted sales - cover configured prices for eligible
  Customer/Partner specimen and Partner assembly work, Partner service-specific
  action visibility, Request custom work, Request account change, no
  downstream-customer requirement, operational confirmation for Closed Won
  handoffs, and durable failure feedback.
- [ ] Global released-deliverable retention components - cover Phaeno-only
  global 30/5/5 default configuration, Customer/Partner/Prospect organization-
  level overrides with inherited-value presentation, validation, required
  reason, and audit history; release-time effective-policy and source display;
  warning, standard-deletion, conditional-grace, and final-deletion dates;
  organization-level rather than per-user download completion;
  tenant-safe undownloaded-package and grace banners; deleted bytes unavailable
  while package metadata/history remain; urgent Phaeno Operations work when no
  active organization administrator can receive a required notice; warning and
  grace emails linking to the authenticated package detail rather than directly
  to a file; suppression of a delayed stale warning before outbox creation and
  current package state when an already-queued warning link is opened; pre-grace
  warning clearance after all files are downloaded;
  activated grace remaining visible despite a later download; no daily-reminder
  state; immediate superseded-package unavailability with retained history and
  a clearly separate corrected package carrying fresh dates/download state; and
  deleted-package history with no restore action plus a separately linked
  authorized reissue when present; permanent receipt export for organization
  administrators before and after deletion; ordinary-member status without
  downloader identity; equivalent accessible Portal and printable-PDF receipt
  facts with generation time/state, labelled browser-local timestamps, UTC
  alongside local PDF timestamps, UTC fallback, and no CSV action;
  exact-deadline `Downloads closed` behavior, optional `Deletion processing`
  status without a download action, a pre-cutoff transfer's bounded `Download
  in progress` state after the cutoff with no resume/retry/range/archive action,
  and receipt start/completion timestamps and outcome identifying a successful
  post-cutoff completion as pre-cutoff authorized; higher-priority quarantine,
  withdrawal/correction, membership deactivation, and organization deactivation
  stopping an active transfer with a tenant-safe access-ended message, no retry,
  no confidential reason disclosure, and a non-counting revoked outcome;
  partial/abandoned transfers remaining undownloaded, restored access offering a
  fresh request only before cutoff, and preservation holds never displaying an
  extended or reset access deadline; and
  accessible states across supported viewports, keyboard, and screen-reader use.
  Verify clear sample-scoped customer-ID/tube-barcode/accession mapping, combined-file
  included-sample lists, and no internal derived-container identifiers.
- [ ] Prospect Trial Project components - cover Phaeno request review and dual
  approval with commercial-only HubSpot context, POMS-owned scientific scope,
  safe HubSpot milestones and deep link, CBO/COO defaults, domain-specific
  delegate designation/revocation, clear primary-versus-delegate authority,
  denial outside the assigned domain, retained reasons/dates, both decisions remaining required,
  same-person second-approval prevention with a clear different-approver
  requirement for initial and amended scope versions,
  frozen-scope preview/amendment, Prospect acceptance, prominent RUO language,
  current versioned no-PHI affirmation at project acceptance and shipment
  confirmation, safe prohibited-data feedback that does not redisplay the
  suspected value, bounded sample submission for extracted RNA, the project's
  approved allowance and deadline states,
  samples-and-shipping grouping, eligible destination selection, detailed
  instruction review, printable ship-to label/internal manifest packets,
  packet replacement and receipt/exception status, explicit sample-replacement
  approval, original-sample lineage, Phaeno-caused restored-slot status, and
  Prospect-supplied-problem exception status without a silent allowance change,
  frozen residual-material duration/disposition preview and terms, configured
  default versus project override, return destination/handling/shipping-payer
  presentation, post-shipment return denial, due-versus-operator-confirmed
  disposition, and no-reuse messaging,
  schedule-without-guaranteed-TAT messaging, configurable deliverable catalog
  and default selection with FASTQ/FASTA/BAM initially selected, approval-time
  frozen deliverable/version preview, immutable approved selections with an
  amendment path, effective global-plus-Prospect-organization retention values
  frozen only when the complete package is released rather than on a partial
  release or at project approval, no project-level override, conversion without
  new or extended deletion dates, unavailable files after byte deletion with
  retained authorized project history, continued organization access after
  package deletion, explicit Phaeno closeout
  deactivation with blocking active-trial/grant/relationship feedback and a
  required retained reason, Phaeno-only estimated retail value and anticipated
  internal cost reporting with no QuickBooks document or payment state, member
  view-only state, tenant-safe progress/results,
  complete-package-gated completion, required incomplete-close reason, distinct
  POMS operational and HubSpot commercial outcomes, owned/dated unresolved
  follow-up, explicit conversion with no automatic transition, terminal-state
  reasons, HubSpot retry visibility, and continued hiding of normal ordering
  actions.
- [ ] Remaining shared sample shipping and Customer freebie components - add
  focused component coverage for return-kit registration/fulfillment, external
  scan/manual tube assignment and correction reasons, retained CSV, packet
  confirmation, full-page print layout, record-shipped facts, packet-plus-tube
  comparison outcomes, and Lab supplier-barcode adoption without a print-label
  action. Also cover missing/incompatible setup, multi-destination and split-
  shipment behavior, packet reprint/void behavior, one-time promotional
  placement with explicit no-charge treatment, and preservation of order-
  versus-Trial terminology.
- [ ] Remaining connected organization/user administration - cover organization
  list/detail, readiness persistence through create/edit, request queue
  decisions, the development-only HubSpot account-entry simulator's
  relationship/service field rules, required Company/Deal identifiers, error
  and success feedback, production hiding and queue refresh,
  separate Account directory and Review queue tab panels, pending-only review
  filtering with an unassociated approved-request recovery exception, approve-
  and-create account confirmation, stranded account-creation recovery,
  details-page navigation, account-workspace request completion language,
  prominent user management, HubSpot-designated contact invitation messaging,
  completed-organization selection for other pre-organization requests,
  accessible request-action and Prospect-conversion dialogs that close after
  success, dated entitlement overlap validation,
  invitation create/list/resend/revoke, required invitee first/last name,
  membership role changes, unified user cards with pending-invitation status
  and accessible action menus, the connected Phaeno user list, consolidated
  invitation-time and accepted-user Platform
  administrator and additive laboratory-role editing, Platform-admin versus
  Lab Operations Administrator control visibility, profile updates,
  deactivation/reactivation, unsupported mock-role removal, Prospect
  conversion, organization lifecycle, optimistic concurrency, and durable
  refresh behavior against mocked APIs.
- [ ] Auth shell - cover missing Clerk config, the Phaeno-branded signed-out
  prompt with its brand lockup inside the sign-in container and without the
  authenticated header or Clerk vendor footer; verify Clerk initialization
  does not flash the local-access loading card before signed-out sign-in; cover
  local unauthorized state,
  disabled state, no-active-memberships state, ready state, and Clerk's pending
  required-MFA setup state. Verify the branded `setup-mfa` route does not render
  Portal navigation, does not request `/api/session` before the Clerk session
  becomes active, and returns to the dashboard after authenticator and
  backup-code enrollment.
- [ ] Organization switcher - cover auto-selecting one active membership, persisting selected organization, changing selected organization, and sending `X-Organization-Id`.
- [ ] Invite acceptance page - cover token capture, URL scrubbing, authenticated
  accept, authenticated decline, cleared token storage, the development-only
  first-time account entry, the production sign-in-only boundary, current Clerk
  email presentation, actionable API failures, and sign-out account switching
  without clearing the captured invitation. Cover the forced `/accept-invite`
  return after both Clerk sign-in and development account creation, plus the
  access-gate recovery action when a pending token is already stored and the
  post-acceptance session refresh before continuing into the application.
- [ ] Source-sample workspace - cover metadata/evidence validation, upload
  progress and scan state, complete readiness errors, immutable ready state,
  archive confirmation, and discard failure/concurrency states with mocked API
  responses.
- [ ] Curated catalog - cover snapshot, publish preview, atomic validation
  errors, eligibility separation, and exact-version display.
- [ ] Organization grants - cover purposeful empty state, idempotent success,
  existing-version conflict, exact-version upgrade, creation-flow package
  selection, retry history, and immediate revocation confirmation.
- [ ] Governance workspace - cover quarantine preview, internal/external content
  separation, investigation purpose, clear-versus-withdraw confirmation,
  affected-organization reminders, and Phaeno-recorded attestation.
- [ ] Tenant Data Library - cover granted package cards, metadata/manifest
  detail, authenticated file/archive downloads, error feedback, and
  organization-admin history isolation with mocked API responses.
- [ ] Order workflow components - cover resumable drafts, profile-driven
  metadata, quote acceptance/expiry, upload and scan feedback, payment holds,
  substitutions, backorders, immutable-document downloads, operational queue
  filters, notification recovery, and stale-version/error recovery with mocked
  APIs.
- [x] Released-download status component - cover all-files-downloaded and active
  non-counting transfer messaging without downloader identity. The focused
  component tests were created on 2026-08-19 but were not executed because test
  execution was not requested.
- [ ] Released-result download interactions - cover Customer and Partner
  individual-file and full-package ZIP actions, pending-button state, completed
  query refresh, file/package completion labels, partial state, and tenant-safe
  failure feedback with mocked APIs.
- [ ] Remaining Lab Operations workspace - cover role-specific controls,
  the five-section operational sidebar with access administration omitted,
  list/detail loading, receipt/accession, protocol lifecycle,
  the Phaeno Order Operations **Order intake** section and Open intake handoff
  for placed lab orders,
  including blocked pre-placement states and navigation to the existing work
  order,
  system-assigned protocol/library/batch identifiers, required batch names, and
  the system-owned External sequencing type, the dedicated structured
  protocol-version builder's step ordering/duplication/removal, required,
  optional, and conditional rules, typed-capture validation, materials,
  including controlled definition/supplier/storage selection, prepared-reagent
  component rows, date-only expiration, material QC modal date and
  failed-reason validation, outputs, equipment creation with a full-width name,
  generated asset-code guidance, type/location selectors, date-only calibration
  validation, QC gates,
  batch status filtering, transition timestamp modal capture, and display of
  captured start/completion times,
  generated JSON preview, clone-from-controlled
  initialization, draft resume/save/discard, approval withdrawal,
  one-open-candidate action gating, unsaved-change warning, concurrency
  recovery, and return to the Protocols section,
  execution/material/equipment capture, library and batch actions, sendout and
  custody states, internal versus customer-action exceptions, scientific
  approval, ready-for-release messaging, concurrency recovery, and mock-mode
  boundaries with mocked APIs.
- [ ] Backend-indexed help search - cover authenticated audience filtering,
  Prospect/Customer/Partner locale filtering, indexed metadata and headings,
  canonical guide links, empty/error states, and stale-index recovery when the
  future search API is implemented.
- [ ] Prospect, Customer, and Partner help localization - add pseudolocale,
  text-expansion, locale-aware review-date, complete-corpus, and
  language-fallback coverage when a second external locale is implemented.
  Phaeno-only guides remain US English.

## Requested Execution Log

- 2026-08-19: Lab Job identity and modal-form verification passed the complete
  frontend unit suite (28 files, 76 tests), `pnpm run lint:ci`, `pnpm run
  typecheck`, and the client/SSR production build. The unit gate also restored
  semantic headings and an independently addressable revision label in the
  released-deliverable policy card without changing its visual behavior.
- 2026-08-19: external dashboard isolation passed `pnpm run typecheck`, the
  repository frontend lint command, and `git diff --check`. A live Customer
  mock-session browser review confirmed that only Lab services, Samples &
  shipping, Data Library, and durable User management starting points render;
  the Phaeno Accounts metrics are absent and the browser produced no new
  errors. Frontend and Playwright test suites were not requested and were not
  run.
- 2026-07-18: one-open-protocol-candidate workflow verification passed focused
  ESLint, `pnpm run typecheck`, and the client/SSR production build. A live
  authenticated browser review confirmed that Draft v1 replaces Add version
  with Continue editing, restores its saved definition, blocks the direct new-
  version route, presents a history-preserving discard confirmation, and
  reflows at 390 pixels without horizontal overflow or browser errors. The
  confirmation was cancelled and no protocol data changed. Frontend tests were
  not requested and were not run.
- 2026-07-18: structured protocol-version authoring passed `pnpm run
  typecheck`, focused ESLint for the changed TypeScript sources, and the client
  and SSR production build. A live authenticated browser review verified
  required-field errors, the three-step library-preparation example, generated
  JSON, unsaved-change protection, return to the Protocols section, and a
  390-pixel layout without horizontal overflow. No draft was persisted during
  verification. Frontend tests were not requested and were not run.
- 2026-07-18: system-owned Lab identifier verification ran `pnpm run
  typecheck`, `pnpm exec eslint src`, and `pnpm run build`; type checking and
  source lint passed, and both client and SSR production builds completed. The
  broad `pnpm run lint` command traversed existing generated `.output` and
  `.vercel` bundles and failed on generated code; no source-tree lint failure
  remained. Frontend tests were not requested and were not run.
- 2026-07-18: Web Operations unsubscribe and demo-completion changes passed
  focused ESLint, `pnpm run typecheck`, and the client/SSR production build.
  The repository-wide lint command also traversed generated `.output` and
  `.vercel` artifacts and failed on those generated files; changed source files
  passed the focused check. Frontend tests were not requested and were not run.
- 2026-07-17: POMS dashboard sidebar and Web Operations verification ran
  `pnpm run lint` and `pnpm run typecheck`; both passed. A live mock-session
  browser review verified desktop and 390-pixel responsive layouts, sidebar
  counts and selection, Mailing List and Demo Requests content, and zero
  console errors. Frontend and Playwright test suites were not requested and
  were not run.
- 2026-07-17: the Order Operations navigation label changed from Reagents to
  PSeq kits. `pnpm run lint`, `pnpm run typecheck`, and the four-test
  documentation-registry suite passed.
- 2026-07-17: Order Configuration sidebar verification ran `pnpm run lint`,
  `pnpm run typecheck`, the focused Order Configuration component test, the
  full `pnpm run test`, and `pnpm run build`. Lint and typecheck passed, the
  focused test passed, all 42 tests in 17 files passed, and the client and SSR
  production builds completed. The existing advisory client chunk-size warning
  remains.
- 2026-08-18: the registered supplier-tube workflow passed `pnpm run lint`,
  `pnpm run typecheck`, and the client/SSR `pnpm run build`. The build retained
  only the existing advisory chunk-size warning. The completion pass then ran
  all 60 frontend tests in 22 files with no failures, including focused
  configuration, tube correction, and packet-replacement coverage. It also
  corrected narrow-layout workspace drawer persistence and the related unit
  and browser tests.
- 2026-07-16: barcode completion verification ran `pnpm run lint`, `pnpm run
  typecheck`, `pnpm run test`, and `pnpm run build`. Lint and typecheck passed,
  all 41 tests in 16 files passed, and the client and SSR production builds
  completed. The existing advisory bundle-size and plugin-timing warnings
  remain. Focused coverage verifies Code 39 encoding, scan lookup, batch
  context rejection, and explicit successful/failed physical-print outcomes.
- 2026-07-16: footer cleanup verification ran `pnpm run lint` and `pnpm run
  typecheck`; both passed. A live browser check confirmed the legal ownership
  line and temporary support/policy placeholder, and confirmed the former
  framework/vendor list is absent. Test execution was not requested and was not
  run.
- 2026-07-16: the Accounts list and detail surfaces were aligned with the
  documented HubSpot-originated intake intent. `pnpm run lint` and `pnpm run
  typecheck` passed, and a live Phaeno mock-session browser check confirmed the
  intent panel, disconnected state, Accounts terminology, and absence of
  standard direct-account/manual-request actions. Component and Playwright test
  execution were not requested and were not run.
- 2026-07-16: Accounts navigation and directory verification ran `pnpm run
  lint` and `pnpm run typecheck`; both passed. Navigation and browser scenarios
  were updated for the Accounts label and for excluding the internal Phaeno
  organization from the external-account directory. Test execution was not
  requested and was not run.
- 2026-07-16: user-menu organization-context removal verification ran
  `pnpm run lint` and `pnpm run typecheck`; both passed. A live Phaeno
  mock-session browser check confirmed the organization search and act-as
  controls are absent while the remaining menu groups, Escape dismissal, and
  scroll restoration still work. Frontend test execution was not requested and
  was not run.
- 2026-07-16: context-sensitive POMS/Portal branding and dashboard copy
  verification ran `pnpm run lint` and `pnpm run typecheck`; both passed. The
  new focused branding test was not executed because test execution was not
  requested.
- 2026-07-16: Shared workspace-sidebar verification ran `pnpm run lint`,
  `pnpm run typecheck`, and `pnpm run build`; all passed. The existing advisory
  chunk-size warning remains. Component and E2E tests were updated but were not
  executed because test execution was not requested.
- 2026-07-16: Lab Operations completion verification ran `pnpm run lint`,
  `pnpm run typecheck`, and `pnpm run build`; lint and typecheck passed, and
  both client and SSR production builds completed. The existing advisory
  chunk-size warning remains. Frontend tests were not requested and were not
  executed.
- 2026-07-16: clean-baseline verification ran `pnpm run lint`, `pnpm run
  typecheck`, `pnpm run test`, and `pnpm run build`; lint and typecheck passed,
  all 28 tests in 11 files passed, and both client and SSR production builds
  completed. Existing bundle-size and plugin-timing warnings remain advisory.
- 2026-07-15: portal hardening verification ran `pnpm run lint`, `pnpm run
  typecheck`, `pnpm run test`, and `pnpm run build`; lint and typecheck passed,
  all 28 tests in 11 files passed, and both client and SSR production builds
  completed.
- 2026-07-14: system-documentation catch-up verification ran `pnpm run
  typecheck`, focused ESLint for the documentation registry, and the registry
  Vitest file; typecheck and lint passed and all 4 registry tests passed. Static
  checks also confirmed six portable MDX guides per audience and valid relative
  Markdown links.
- 2026-07-14: documentation implementation verification ran `pnpm run lint`,
  `pnpm run typecheck`, and `pnpm run test`; lint and typecheck passed and all
  24 tests in 9 files passed. The Vite client and SSR production build also
  completed with the MDX corpus compiled successfully.
- 2026-07-14: order-management implementation verification ran `pnpm run test`;
  all 16 tests in 8 files passed. `pnpm run lint` and `pnpm run typecheck` also
  passed, and the Vite client/SSR production build completed through the
  installed Node entry point.
- 2026-07-14: completion-slice verification ran `pnpm run test`; all 11 tests
  in 7 files passed.
- 2026-07-14: implementation verification ran `pnpm run test`; all 9 tests in 5
  files passed.
