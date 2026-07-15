# Playwright E2E Test Plan

Keep this file updated as Playwright e2e tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

## Created Tests

- [x] `frontend/e2e/home.spec.ts` - `loads the portal starter dashboard`.
- [x] `frontend/e2e/data-provisioning.spec.ts` - Phaeno mock context exposes the
  source registry, curated catalog, organization-grant, and governance surfaces.
- [x] `frontend/e2e/data-provisioning.spec.ts` - Prospect mock context exposes
  the Data Library without exposing connected data in mock mode.

## Deferred Tests

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

## Requested Execution Log

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
