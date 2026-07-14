# Frontend Test Plan

Keep this file updated as frontend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

## Created Tests

- [x] `frontend/tests/invite-schema.test.ts` - `inviteSchema` accepts a valid invite payload.
- [x] `frontend/tests/invite-schema.test.ts` - `inviteSchema` rejects invalid email addresses.
- [x] `frontend/src/components/navigation.test.ts` - Phaeno context shows Data
  provisioning and hides the tenant Data Library.
- [x] `frontend/src/components/navigation.test.ts` - Prospect, Customer, and
  Partner contexts show the Data Library and hide Phaeno provisioning.
- [x] `frontend/src/features/data-provisioning/DataProvisioningPage.test.tsx` -
  mock mode exposes the three Phaeno configuration surfaces without calling the
  secured API.
- [x] `frontend/src/features/data-library/DataLibraryPage.test.tsx` - mock mode
  explains that connected tenant data is paused without presenting a false
  empty-grant state.

## Deferred Tests

- [ ] Auth shell - cover missing Clerk config, signed-out prompt, local unauthorized state, disabled state, no-active-memberships state, and ready state.
- [ ] Organization switcher - cover auto-selecting one active membership, persisting selected organization, changing selected organization, and sending `X-Organization-Id`.
- [ ] Invite acceptance page - cover token capture, URL scrubbing, authenticated accept, authenticated decline, and cleared token storage.
- [ ] Source-sample workspace - cover metadata/evidence validation, upload
  progress and scan state, complete readiness errors, immutable ready state, and
  archive confirmation with mocked API responses.
- [ ] Curated catalog - cover snapshot, publish preview, atomic validation
  errors, eligibility separation, and exact-version display.
- [ ] Organization grants - cover purposeful empty state, idempotent success,
  existing-version conflict, and immediate revocation confirmation.
- [ ] Tenant Data Library - cover granted package cards, metadata/manifest
  detail, authenticated file/archive downloads, error feedback, and
  organization-admin history isolation with mocked API responses.

## Requested Execution Log

- 2026-07-14: implementation verification ran `pnpm run test`; all 9 tests in 5
  files passed.
