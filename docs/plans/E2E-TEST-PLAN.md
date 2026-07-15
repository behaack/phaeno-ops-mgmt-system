# Playwright E2E Test Plan

Keep this file updated as Playwright e2e tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

## Created Tests

- [x] `frontend/e2e/home.spec.ts` - `loads the portal starter dashboard`.
- [x] `frontend/e2e/home.spec.ts` - desktop keeps frequent workspace routes in
  the toolbar, desktop and mobile expose grouped administration/resources in
  the user menu, and the three display choices share one compact row directly
  after user identification with a brand-accent selected treatment distinct
  from active navigation and a separate focus-ring treatment;
  organization search
  participates in Arrow Up/Down menu navigation while preserving keyboard
  control of its suggestions, and Escape closes suggestions before a second
  Escape closes the menu; the open menu locks background scrolling.
- [x] `frontend/e2e/home.spec.ts` - shared modal dialogs lock background page
  scrolling and restore it when closed.
- [x] `frontend/e2e/data-provisioning.spec.ts` - Phaeno mock context exposes the
  source registry, curated catalog, organization-grant, and governance surfaces.
- [x] `frontend/e2e/data-provisioning.spec.ts` - Prospect mock context exposes
  the Data Library without exposing connected data in mock mode.
- [x] `frontend/e2e/order-management.spec.ts` - Customer mock context exposes
  laboratory services and request creation.
- [x] `frontend/e2e/order-management.spec.ts` - Partner mock context exposes
  reagent ordering and data assembly.
- [x] `frontend/e2e/order-management.spec.ts` - Phaeno mock context exposes
  operational queues and order configuration.
- [x] `frontend/e2e/documentation.spec.ts` - Customer and Partner contexts are
  offered their own guide set and cross-audience routes are denied, Phaeno can
  switch among all three audience guides, MDX content renders on guide routes,
  and Prospect direct access is denied.
- [x] `frontend/e2e/customers.spec.ts` - desktop and mobile organization
  administration use accessible consequence dialogs for organization,
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

## Deferred Tests

- [ ] HubSpot-to-Portal lifecycle journey - cover HubSpot-only company with no
  Portal access, approved evaluation to Portal Prospect, Closed Won to pending
  direct Customer/Partner onboarding, designated-admin invitation, selective
  Partner services, existing-organization service change, Customer/Partner
  reclassification, pending offboarding, webhook replay, retry, and HubSpot outage.
- [ ] Direct/custom sales and HubSpot visibility journey - cover configured-price
  Customer and Partner specimen placement, Partner reagent and assembly sales,
  ineligible work routed to Sales, Closed Won operational handoff, one HubSpot
  Order per commitment with payment summary, no routine Deal, no scientific or
  downstream-customer data in HubSpot, and two-tenant isolation.
- [ ] Prospect Trial Project journey - cover HubSpot-originated request, commercial
  and scientific approval, Prospect invitation and acceptance, bounded sample
  submission of up to five extracted-RNA samples, sixth-sample and wrong-type
  denial, Phaeno receipt/processing, standard FASTQ/FASTA/BAM result release,
  the three-month access default and an approved override both beginning only
  with complete-package release, completion, explicit Customer or Partner
  conversion, normal-order denial before conversion, and two-tenant isolation
  for project metadata, samples, files, and results.
- [ ] Database-backed organization and user administration journey - verify
  Phaeno and external administrator scope, invitation delivery and acceptance,
  resend/revoke, role and membership lifecycle, Prospect conversion with stable
  identity, readiness, request review without implicit provisioning,
  pre-organization request association, action-dialog close behavior,
  service-entitlement boundaries, global disable/reactivation, refresh
  persistence, and cross-tenant denial.
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

## Requested Execution Log

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
