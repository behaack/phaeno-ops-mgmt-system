# Playwright E2E Test Plan

Keep this file updated as Playwright e2e tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

The internal Lab Operations journey is implemented in the application but its
database-backed browser proof remains deferred below. Feature completion does
not satisfy this production-activation gate.

Public Website PDF-backed publication search has focused backend coverage and
static Website build verification. Browser proof remains intentionally deferred
until an authorized Website/API release because acceptance requires the
deployed landing page, Vercel PDF headers, durable scheduled index rebuild, and
public search endpoint together. That future proof must cover desktop and
narrow landing layouts, abstract and PDF-only queries returning one landing
result, the `Match in linked PDF` source label, rejection of ordinary-page
hidden-metadata-only matches, result navigation, and the PDF action opening the
derived asset.

Private team Preview search browser proof is also deferred until its authorized
API and Vercel Preview deployments. That proof must show Vercel Authentication
denying an anonymous visitor, an authenticated team member searching newly
available Media content through the same-origin proxy, direct API denial
without the proxy key, Preview-origin result navigation, and unchanged
production search results.

Arabic Website browser proof is authorized for the protected Preview deployment
as of 2026-08-07. Automated generated-HTML parity now covers all 19 route pairs,
including RTL document metadata, core semantic structures, minimum translated
content coverage, and the corrected home-page source alignment. Deployed proof must
cover direct `/ar` deep links, `lang="ar"` and `dir="rtl"`, desktop and narrow
navigation, keyboard/focus behavior, browser-language suggestion and dismissal,
stored explicit preference, equivalent-route switching, Arabic form labels and
validation, English-PDF disclosure, reciprocal alternates, Arabic-only search
results, bidirectional scientific text, zoom, reduced motion, and unchanged
English URLs and behavior.

Spanish, Simplified Chinese, Japanese, German (Germany), Italian, and French
now have complete protected-Preview route sets and generated-HTML parity
coverage. Their browser proof remains deferred and must include native-language
copy review, CJK and long-German line breaking, responsive navigation and
all three localized blog articles, locale-scoped listings and feeds,
same-article language switching, localized series navigation,
language-picker fit, keyboard/focus behavior, locale-isolated search, and
unchanged English production output before any locale is published.
Local browser regression checks on 2026-08-08 cover the multi-omics
introduction at 1392 px for Spanish, French, German, Italian, and Japanese:
the headline and copy columns do not overlap, and the principle-card heading
and paragraph remain contained. Spanish also stacks at 1024 px without
horizontal overflow. This is component-level evidence only and does not replace
the protected deployed-Preview acceptance above.

## Created Tests

- [ ] Released-deliverable retention configuration - cover Phaeno-only global
  policy navigation and editing plus Customer, Partner, and Prospect account
  override creation, partial inheritance, history, and removal. The UI is
  implemented; connected browser coverage remains to be added.
- [ ] Released-package deadline details - cover an authorized Customer result
  and Partner assembly output showing the frozen standard deletion time with a
  browser-local zone label and the later date clearly marked as conditional;
  prove a historical release without a snapshot does not receive invented
  dates, and prove cross-tenant order/output routes remain denied.

- [x] `frontend/e2e/home.spec.ts` - internal Phaeno context uses POMS in the
  browser title, header, and dashboard while external organization context uses
  Portal; both contexts retain the Phaeno Inc. legal footer and omit framework
  vendor promotion; the POMS dashboard exposes a keyboard-operable
  viewport-edge sidebar for Order Operations, Lab Operations, Accounts, and
  Web Operations mock intake with a two-button selector showing one
  mailing-list or demo-request panel at a time, independent page-size-10 footer
  pagination, no persistence controls on mock records, and one dashboard
  section visible at a time while external contexts omit it.
- [x] `frontend/e2e/home.spec.ts` - desktop keeps frequent workspace routes in
  the toolbar, including Docs, while Data provisioning appears under Resources;
  desktop and mobile expose Accounts and the remaining grouped
  administration/resources in the user menu,
  and the three display choices share one compact row directly
  after user identification with a brand-accent selected treatment distinct
  from active navigation and a separate focus-ring treatment;
  the user menu omits organization-context search and act-as controls, Arrow
  Up/Down traverses the remaining menu items, Escape closes the menu, and the
  open menu locks background scrolling.
- [x] `frontend/e2e/home.spec.ts` - shared modal dialogs lock background page
  scrolling and restore it when closed.
- [x] `frontend/e2e/data-provisioning.spec.ts` - Phaeno mock context exposes the
  source registry, curated catalog, organization-grant, and governance surfaces
  through the pinned wide-screen rail or accessible edge tab on narrow screens.
- [x] `frontend/e2e/data-provisioning.spec.ts` - Prospect mock context exposes
  the Data Library without exposing connected data in mock mode.
- [x] `frontend/e2e/order-management.spec.ts` - Customer mock context exposes
  laboratory services and request creation.
- [x] `frontend/e2e/order-management.spec.ts` - Partner mock context exposes
  reagent ordering and data assembly.
- [x] `frontend/e2e/order-management.spec.ts` - Phaeno mock context exposes
  Lab, PSeq kits, Assembly, and Integrations operational queues through the
  pinned wide-screen rail or accessible edge tab on narrow screens; Order
  Configuration uses the same rail for Defaults, Analyses, PSeq kits,
  Assembly, and Credit & QBO instead of an in-page tab row.
- [x] `frontend/e2e/documentation.spec.ts` - Prospect, Customer, and Partner
  contexts are offered their own guide set, Phaeno is offered only Phaeno
  guides, the sidebar omits redundant audience controls and headings, every
  topic has an icon, Data Provisioning, Order Ops, and Lab Ops expose one
  keyboard-operable accordion subtopic level that auto-opens for the active
  guide and keeps only one subject expanded, cross-audience routes are denied
  for every context, and substantive MDX content renders on guide routes.
- [x] `frontend/e2e/customers.spec.ts` - desktop and mobile organization
  administration is titled Accounts, excludes the internal Phaeno organization,
  identifies HubSpot intake as not connected, omits standard direct-account and
  manual-request actions from list/detail surfaces, and uses accessible
  consequence dialogs for organization,
  membership, and entitlement lifecycle actions; focus returns to the invoking
  control, ended entitlements retain their reason, and the entitlement source
  selector excludes an approved onboarding request that did not request the
  selected service. Serious and critical Axe violations are checked in the
  dialogs.

## Manual Acceptance Evidence

- 2026-07-15: a real-Clerk local browser journey proved manual request review,
  creation and readiness persistence, designated-administrator invitation,
  Prospect-to-Customer conversion with the organization identifier preserved,
  association and application of the original request, and one usable PSeq Lab
  Service entitlement. The rollback-only PostgreSQL reference journey now also
  automates the service-source and entitlement-end integrity rules; the full
  authenticated HTTP/browser journey remains deferred.
- 2026-07-16: a rollback-isolated controller/PostgreSQL journey passed the
  database-backed Lab workflow from accepted Customer quote through assigned
  roles, accession, protocol execution, resources, library/batch/sendout,
  exception resolution, scientific approval, customer-safe projection, and
  proof of no file publication. Barcode completion additionally proved
  automatic submitted/derived identifiers, normalized exact lookup, reasoned
  initial/reprint/failure history, and duplicate-safe scan-first batch entry.
  This is API/controller/database evidence; it does not exercise Clerk
  middleware, HTTP hosting, a real browser, or physical hardware.

## Deferred Tests

- [ ] Real-Clerk authentication policy journey - verify the Phaeno-branded,
  invite-only sign-in surface without Clerk vendor branding in the paid
  instance; password recovery; required authenticator-app enrollment for a new
  and an existing invited user; one-time backup-code display and sign-in; no SMS
  option; incomplete MFA setup remaining outside Portal navigation and APIs;
  and Phaeno-admin reset, active-session revocation, and required re-enrollment
  when both authenticator and backup codes are lost.
- [ ] HubSpot-to-Portal lifecycle journey - cover HubSpot-only company with no
  Portal access, approved evaluation to Portal Prospect, Closed Won to pending
  direct Customer/Partner onboarding, designated-admin invitation, selective
  Partner services, existing-organization service change, Customer/Partner
  reclassification, pending offboarding, webhook replay, retry, and HubSpot
  outage. In local development, prove that Accounts can simulate a new
  Prospect/Customer/Partner account request and that Order Intake can simulate
  both the sales-assisted and Trial Project inbound request shapes without
  contacting HubSpot or creating an account or executable work.
- [ ] Direct/custom sales and HubSpot visibility journey - cover configured-price
  Customer and Partner specimen placement, Partner reagent and assembly sales,
  ineligible work routed to Sales, Closed Won operational handoff, one HubSpot
  Order per commitment with payment summary, no routine Deal, no scientific or
  downstream-customer data in HubSpot, and two-tenant isolation.
- [ ] Released-deliverable retention journeys - cover the global 30/5/5
  defaults, authorized Customer/Partner/Prospect organization override and
  partial inheritance, release-time effective-policy snapshot, and a later
  default or override change affecting only future releases; exact 24-hour UTC
  calculations without midnight rounding across a daylight-saving boundary;
  labelled browser-local display with UTC fallback; and local plus UTC values
  in the PDF. Prove the all-
  downloaded path has no warning and closes access plus queues package-byte
  deletion at the standard deadline; the partially or never-downloaded path
  sends the advance warning to all active organization administrators, activates
  and announces the full grace period at the standard deadline, and closes
  access plus queues atomic package-byte deletion at the final deadline;
  download authorization closes at the exact applicable deadline even when
  asynchronous byte deletion is delayed or fails, Operations receives the
  failure, and the receipt preserves both timestamps; a file and complete-
  archive transfer started under valid pre-cutoff authorization may finish
  within its bounded timeout and counts only after successful completion while
  every request whose lease would commit exactly at/after cutoff, including a
  new, retry, range-resume, or archive request, is denied; partial file/archive,
  failed, cancelled, disconnected, timed-out, and restart-abandoned streams do
  not count or gain resume authority; an incomplete standard-deadline lease
  activates grace despite later completion; deletion waits for all simultaneous
  eligible leases only until they complete or reach their unchanged original
  expiries, without reopening access or changing grace/final dates; a lease-
  duration configuration change affects only newly issued leases; the receipt
  preserves lease start/completion/outcome and
  identifies a post-cutoff success as pre-cutoff authorized; emergency
  quarantine, withdrawal/correction, membership deactivation, and organization
  deactivation each stop a matching active response stream, record a non-
  counting revoked attempt, expose only a tenant-safe access-ended state, and
  cannot recall bytes already delivered; concurrent completion/revocation uses
  the first durable terminal transition rather than client time, and restored
  access allows only a fresh pre-deadline request; a complete archive counts
  every file while individual downloads count only their files; one
  authorized member's download satisfies the
  organization without requiring every member to download, and a later
  membership change preserves that history; a grace-period download does not
  shorten grace; holds preserve bytes without extending access or resetting the
  clock/notices, and releasing an overdue hold immediately queues deletion; no
  active administrator produces urgent
  Phaeno Operations work without changing a deadline; warning and grace links
  require sign-in and current tenant authorization at the package page and never
  grant direct file access; exactly two scheduled emails are possible with no
  daily reminders; delayed processing suppresses a stale warning before outbox
  creation, while an already-queued message remains and opens current state;
  the pre-grace warning clears after complete download while activated grace
  remains visible through deletion; a correction immediately withdraws the old
  package and creates a new release with a fresh effective-policy snapshot,
  full clock, independent download tracking and notices while old-package bytes
  follow their prior policy/hold; deletion exposes no customer restore action;
  an authorized regeneration, when source material exists, creates a new linked
  immutable reissue with fresh policy/dates/download state while the deleted
  release remains unchanged; and metadata, notification, download, and deletion
  history remain after bytes are unavailable, including a permanent tenant-safe
  receipt with member-level download details for organization administrators,
  status-only visibility for ordinary members, prohibited-field exclusion, and
  matching Portal/PDF facts with generation time and represented state, no CSV
  receipt action, sample-scoped non-PHI Customer-ID/original-tube-barcode/
  accession mapping, complete included-sample lists for combined files, no
  derived-container leakage, and two-tenant denial across Trial, Customer, and
  Partner flows.
- [ ] Prospect Trial Project journey - cover a commercial-only HubSpot-originated
  request, POMS-owned scientific scoping, relationship-safe HubSpot milestones
  and deep link, commercial and scientific/operations approval using default and
  delegated coverage, delegate revocation and wrong-domain denial, actual
  approver and authority-source audit, rejection when one dual-authorized user attempts both
  approvals, successful two-person approval for initial and amended scope
  versions, both decisions remaining required, Prospect invitation and
  acceptance of versioned RUO/no-PHI terms, shipment-confirmation affirmation,
  non-PHI sample identifiers, prominent RUO result labeling, prohibited-data
  rejection or restricted quarantine without propagation followed by authorized
  disposition, bounded sample submission through the project's approved
  extracted-RNA sample allowance,
  over-allowance and wrong-type
  denial, eligible destination and detailed-instruction resolution, Phaeno
  return-kit preparation with an exact registered-tube inventory, Prospect
  tube-to-sample assignment/correction and retained CSV, printable frozen
  shipment packet/crosswalk and barcode, Phaeno packet-plus-tube comparison
  scan without implicit receipt, matched receipt/accession that adopts the
  permanent supplier barcode without a second label, derived-container POMS
  label verification, an approved replacement linked to the original sample,
  exactly one restored slot after a Phaeno-caused processing failure, no
  automatic restored slot for a Prospect-supplied sample problem, and an
  explicit Phaeno exception path that does not rewrite the frozen allowance,
  the configurable 30-day residual-material default and a project override,
  frozen destruction versus pre-first-shipment return with identified shipping
  payer, post-shipment return denial, retain-until work without automatic
  disposition, operator-confirmed destruction or separate tracked return, and
  no reuse without separate written authorization,
  Phaeno processing, configurable FASTQ/FASTA/BAM default selection, exact
  deliverable/version snapshot at approval, a later configuration change that
  affects only future projects, and amendment/reapproval for changing an
  approved project's deliverables,
  the effective global-plus-Prospect-organization retention policy beginning
  only with release of the project's complete frozen package and no project-
  level override, POMS `Completed`
  versus reason-required `Closed incomplete`, final Customer conversion,
  Partner conversion, and closed-without-conversion HubSpot outcomes,
  nonterminal follow-up with an owner and date, explicit Customer or Partner
  conversion without an automatic transition or a reset or extension of the
  frozen Trial package deletion dates, byte deletion with preserved project and
  audit history, continued organization access for a non-converting Prospect,
  blocked deactivation while another active Trial Project, grant, or commercial
  relationship exists, explicit audited Phaeno closeout deactivation, normal-
  order denial before conversion, retained POMS estimated retail value and
  anticipated internal cost, no QuickBooks transaction or payment gate even
  during a QuickBooks outage, and two-tenant isolation for project metadata,
  samples, files, and results.
- [ ] Customer promotional freebie and shared shipping journey - cover a named
  Customer's one-time no-charge placement, zero amount due without a payment
  gate, the same return-kit/tube-crosswalk/packet/comparison-scan/Lab-adoption
  path, multiple active destinations, compatible multi-type grouping,
  mandatory incompatible split shipments, immutable reprint/replacement
  behavior, and two-tenant non-discovery.
- [ ] Database-backed organization and user administration journey - verify
  Phaeno and external administrator scope, invitation delivery and acceptance,
  unified active and pending-invitation user cards, accessible action menus,
  required invited names, invitation-time Phaeno role intent with no pre-accept
  access, atomic role activation on acceptance, resend/revoke, role and
  membership lifecycle, Prospect conversion with stable
  identity, readiness, request review without implicit provisioning,
  approved simulated HubSpot account creation and details-page navigation,
  Phaeno-controlled designated-contact invitation and membership management,
  consolidated Phaeno profile, Platform administrator, and additive
  laboratory-role editing on one durable User management record rather than a
  separate Lab access panel or the Lab Operations sidebar,
  other pre-organization request association, action-dialog close behavior,
  service-entitlement boundaries, global disable/reactivation, refresh
  persistence, and cross-tenant denial.
- [ ] Database-backed Web Operations lifecycle journey - verify platform-admin
  authorization, unsubscribe and demo-completion confirmations, pending and
  durable error feedback, actor/time audit persistence, immediate count and
  page refresh, removal from active queues after reload, retained original
  Website intake, and external/non-admin denial.
- [ ] Automated WCAG AA accessibility check on the dashboard.
- [ ] Mobile primary navigation moves into the user menu.
- [ ] Source-sample draft discard - verify destructive confirmation, required
  reason, managed-file cleanup, registry return, and stale-version conflict
  through the authenticated browser/API path.
- [ ] Database-backed synthetic reference journey - upload, ready, snapshot,
  publish, eligibility, explicit Prospect grant, tenant list/detail, file and
  archive download, download history, cross-tenant denial, and revocation. The
  controller/PostgreSQL journey now passes; this remaining item is the full
  browser, Clerk authentication middleware, and HTTP API-host path.
- [ ] Database-backed advanced provisioning and governance journey - exact
  version upgrade, retirement with preserved access, catalog removal, optional
  creation grant, quarantine denial, unchanged clearance, unsafe withdrawal,
  administrator notice/activity, and tenant attestation.
- [ ] Database-backed order-management journeys - execute the approved Customer
  admin/member, Partner admin/member, Prospect denial, Phaeno operations,
  payment hold, QuickBooks failure, two-tenant isolation, keyboard, and narrow
  viewport scenarios through real authentication and API persistence.
- [ ] Database-backed Lab Operations journey - accept a Customer quote, prove
  the visible Phaeno Order Operations **Order intake** section and Open intake
  handoff to the already-linked
  work order, then prove the already-passing controller/PostgreSQL workflow
  through real Clerk
  authentication, the hosted HTTP API, and a browser. Include equipment
  registration with no manual asset-code input, full-width name entry,
  type/location selectors with focused missing-value creation, and date-only
  last-calibration/due-date validation. The controller/database
  portion already proves atomic Lab authorization, additive Lab roles,
  receipt/accession, barcode allocation/scan/print-outcome history,
  system-assigned protocol/library/batch identifiers, named batches with a
  system-owned External sequencing type, structured protocol
  authoring from protocol identity through ordered steps, typed captures,
  resources, QC gates, draft creation and resume, parallel-candidate rejection,
  discard history, approval withdrawal, controlled-definition cloning, approval
  and activation, active protocol execution with controlled material identity,
  supplier/storage references, date-only expiration/retest, structured
  prepared-reagent component lineage, QC-approved material and calibrated
  equipment, scan-first library batching with status filtering and transition
  timestamp modal capture, sendout/custody, exception resolution, scientific approval, the
  Customer-safe projection, and no file publication at Ready for release.
  Physical printer/scanner qualification remains a manual bench gate.
- [ ] Released-package completion-aware download journey - through authenticated
  Customer and Partner sessions, download one full file and one full-package
  ZIP, confirm package/file state refresh, interrupt a transfer and confirm it
  remains undownloaded, allow a synthetic short lease to expire, and prove a
  different tenant cannot discover or download the release. Retention warnings,
  cutoff, and byte deletion remain outside this journey until their worker is
  implemented.

## Requested Execution Log

- 2026-07-18: a live authenticated browser review verified the material-lot QC
  workflow without recording a decision. Pending rows show `QC: Pending` and
  one `Record QC` action. The modal identifies the lot, defaults the required QC
  date to today, prevents future picker dates, explains Pass and Fail outcomes,
  and reveals a required failure reason only for Fail QC. Empty failure
  validation cleared as the reason was entered, Cancel restored focus to the
  invoking row action, the refreshed migration-aware API loaded successfully,
  and no browser errors were produced. The Playwright suite was not requested
  or run.
- 2026-07-18: a live authenticated browser review verified clearer list
  hierarchy in the Lab Operations Protocols and Materials sections. Each
  section title, description, and create action now occupy a muted header band
  with a divider; protocol and material records render as separately bordered
  rows on the content surface. The distinction remained visible in light and
  dark themes, actions stayed associated with the correct record, and no
  browser errors were produced. The Playwright suite was not requested or run.
- 2026-07-18: a live authenticated browser review verified the redesigned
  material-lot form without submitting data. Supplier lots expose controlled
  material, supplier, and storage selections with related-record modal creation,
  omit manual material-key entry, and use a date-only expiration/retest field.
  Supplier and storage selectors span the form width. Prepared reagents hide
  supplier, expose structured component-lot rows, and explain when no
  QC-approved source lot is available. New material, supplier, and storage
  names are collected in a focused modal and returned as the selected option in
  the parent form without submitting data. The parent dialog stayed within a
  390-pixel viewport with no horizontal overflow, and the desktop related-record
  modal review produced no browser errors. The Playwright suite was not
  requested or run.
- 2026-07-18: a live authenticated browser review verified the open-candidate
  protocol lifecycle without changing data: Draft v1 exposed Continue editing,
  omitted Add version, restored the saved structured definition, and blocked a
  direct new-version URL. The history-preserving discard confirmation opened
  and was cancelled. The Protocols surface had no horizontal overflow at 390
  pixels and produced no browser errors. The Playwright suite was not requested
  or run.
- 2026-07-18: a live authenticated browser review covered the structured
  protocol-version builder on desktop and at 390 pixels, including blank-form
  validation, loading the three-step example, inspecting generated JSON,
  confirming the discard-changes dialog, and returning to the addressable
  Protocols section. No draft was persisted. The database-backed approval and
  activation journey remains deferred, and Playwright tests were not requested
  or run.
- 2026-07-18: a local production preview reached the expected
  authentication-not-configured boundary because the preview had no Clerk
  publishable key; the active port-3000 development listener returned an empty
  response. The connected protocol, library, and batch dialogs therefore
  remain covered by the deferred authenticated Lab Operations browser journey.
  Playwright tests were not requested and were not run.
- 2026-07-17: the POMS home scenario was updated for the shared dashboard
  sidebar and Web Operations mock intake. A live in-app browser review verified
  the desktop and 390-pixel layouts, sidebar selection, visible counts, bounded
  Mailing List and Demo Requests panels, and zero browser console errors. The
  Playwright suite was not executed because E2E execution was not separately
  requested.
- 2026-07-17: the Phaeno Order Operations mock scenario now requires the PSeq
  kits sidebar label. The Playwright suite was not executed because E2E
  execution was not separately requested.
- 2026-07-17: the Phaeno Order Configuration mock scenario was extended to
  require the five shared-sidebar subjects and Defaults as the initial active
  selection. The Playwright suite was not executed because E2E execution was
  not separately requested.
- 2026-08-18: the registered supplier-tube workflow was implemented and its
  browser coverage plan was expanded. The completion pass ran the existing
  mock-session Playwright suite on an isolated port with the required test-only
  session setting: all 30 desktop/mobile tests passed. This suite verifies the
  surrounding responsive/navigation baseline; it does not substantiate the
  still-unimplemented authenticated Trial Project or Customer promotional
  shipping journey, nor physical tube/shipper/scanner acceptance.
- 2026-07-16: the barcode software slice passed its full 41-test frontend
  regression suite and 113-test backend/database suite. No mock Playwright
  scenario can substantiate an authenticated hosted scan or physical
  printer/scanner outcome, so the database-backed browser and hardware
  journeys remain explicitly deferred above.
- 2026-07-16: the home scenario was updated for the shared `Copyright © [year]
  Phaeno Inc.` footer, the temporary support/policy placeholder, and removal of
  framework/vendor promotion. A live browser check confirmed the rendered
  footer; the Playwright suite was not executed because E2E execution was not
  requested.
- 2026-07-16: the Accounts scenarios were updated for the HubSpot-originated
  intake posture, explicit disconnected state, external-account-only directory,
  and removal of direct account/manual request entry points from the standard
  list and detail pages. The Playwright suite was not executed because E2E
  execution was not requested.
- 2026-07-16: the home and account-administration scenarios were updated for
  the Accounts menu/page label and to prove that the internal Phaeno
  organization is absent from the external-account directory. The Playwright
  suite was not executed because E2E execution was not requested.
- 2026-07-16: the home scenario was updated to prove that the user menu omits
  organization-context search and act-as controls while preserving keyboard
  traversal, Escape dismissal, and scroll locking. A live Phaeno mock-session
  browser check confirmed the simplified menu and scroll restoration. The
  Playwright suite was not executed because E2E execution was not requested.
- 2026-07-16: the POMS home scenario was updated for the mock Order Operations /
  Lab Operations / Accounts panel selector, single-panel visibility, and
  external-context omission. The Playwright suite was not executed because E2E
  execution was not requested.
- 2026-07-16: the home scenario was updated for POMS in the Phaeno context and
  Portal in external contexts. A live mock-session browser check verified the
  title, header, dashboard, and footer while switching from Phaeno to a
  Customer organization; the Playwright suite was not executed because E2E
  execution was not requested.
- 2026-07-16: Phaeno documentation topic groups were changed to an accordion
  that collapses the open subject when another subject expands. The browser
  scenario now covers the transition. The suite was not executed because E2E
  execution was not requested.
- 2026-07-16: Phaeno documentation scenarios were updated for expandable Data
  Provisioning, Order Ops, and Lab Ops subtopics with independently routed guide
  pages. The suite was not executed because E2E execution was not requested.
- 2026-07-16: Documentation scenarios were updated for automatic
  current-organization audience filtering and topic icons. The suite was not
  executed because E2E execution was not requested.
- 2026-07-16: Data provisioning, Order operations, and Documentation scenarios
  were updated for the shared pinned/edge sidebar on desktop and narrow
  layouts. The suite was not executed because E2E execution was not requested.
- 2026-07-16: Lab Operations browser scenarios and their production-activation
  gates were added to this plan. E2E execution was not requested and was not
  run for the completion slice.
- 2026-07-16: the first clean-baseline run inherited the developer's real-Clerk
  local setting (`VITE_USE_MOCK_SESSION=false`) and correctly failed the suite's
  mock-session precondition. The test-only rerun used
  `VITE_USE_MOCK_SESSION=true` and `PLAYWRIGHT_PORT=3100`; all 28 desktop/mobile
  Chromium scenarios passed. The pre-existing `AcceptInvitePage` route-export
  warning remains unchanged.
- 2026-07-15: portal hardening verification ran `PLAYWRIGHT_PORT=3100 pnpm
  run test:e2e`; all 28 desktop/mobile Chromium scenarios passed. The connected
  organization cases exercised keyboard activation, focus return, narrow
  layout, light/dark themes, and serious/critical Axe checks. The pre-existing
  `AcceptInvitePage` route-export warning remains unchanged.
- 2026-07-14: documentation verification ran `PLAYWRIGHT_PORT=3100 pnpm run
  test:e2e -- documentation.spec.ts`; all 8 desktop/mobile Chromium scenarios
  passed. A separate Playwright gut-check loaded the Customer help landing page
  with meaningful content, 11 links, no Vite error overlay, and no console or
  page errors. The pre-existing `AcceptInvitePage` route-export warning remains
  unchanged.
- 2026-07-14: order-management implementation verification ran
  `PLAYWRIGHT_PORT=3100 pnpm run test:e2e`; all 12 desktop/mobile Chromium tests
  passed. A separate Playwright gut-check loaded `/order-operations` with HTTP
  200, meaningful content, 19 interactive controls, no Vite error overlay, and
  no console errors. The pre-existing `AcceptInvitePage` route-export warning
  remains unchanged.
- 2026-07-14: completion-slice verification ran `PLAYWRIGHT_PORT=3100 pnpm
  run test:e2e`; all 6 Chromium and mobile-Chromium tests passed. The existing
  TanStack warning about the exported `AcceptInvitePage` route component remains
  unchanged.
- 2026-07-14: implementation verification ran `PLAYWRIGHT_PORT=3100 pnpm
  run test:e2e` to avoid an unrelated local port-3000 process; all 6 Chromium
  and mobile-Chromium tests passed. The existing TanStack warning about the
  exported `AcceptInvitePage` route component remains unchanged.
- 2026-06-01: User ran `pnpm test:e2e`; Playwright could not launch because Chromium was not installed locally.
- 2026-06-01: User ran `pnpm test:e2e`; mobile navigation test failed because the user menu did not open after `tap()`. Updated the test to activate the menu with `click()` and wait for the menu before asserting menu items.
- 2026-06-01: User ran `pnpm test:e2e`; dashboard accessibility test failed on light-theme color contrast, and the mobile user menu still did not open reliably. Darkened light-theme muted and primary colors, and made the user menu open state controlled.
- 2026-06-01: User ran `pnpm test:e2e`; muted foreground contrast was still just below AA at 4.48, and mobile menu activation still did not open the menu. Darkened muted foreground further and added an explicit touch-end open fallback to the user menu trigger.
- 2026-06-01: User ran `pnpm test:e2e`; mobile menu still did not open. Replaced the touch-end fallback with a controlled touch pointer-down toggle to avoid the follow-up click closing the menu.
- 2026-06-01: User ran `pnpm test:e2e`; mobile menu still did not open through the emulated tap path. Restored Radix native menu state and changed the e2e test to use keyboard activation before asserting mobile menu items.
- 2026-06-01: User requested environment setup only. Reduced e2e coverage to one smoke test and moved the accessibility and mobile navigation checks to deferred tests.
- 2026-06-01: User requested no Playwright HTML report server. Set Playwright reporter to terminal `list` only.
