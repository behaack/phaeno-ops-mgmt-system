# Frontend Test Plan

Keep this file updated as frontend tests are created, changed, or intentionally deferred.

Do not execute this test plan unless explicitly requested.

## Created Tests

- [x] `frontend/tests/invite-schema.test.ts` - `inviteSchema` accepts a valid invite payload.
- [x] `frontend/tests/invite-schema.test.ts` - `inviteSchema` rejects invalid email addresses.

## Deferred Tests

- [ ] Auth shell - cover missing Clerk config, signed-out prompt, local unauthorized state, disabled state, no-active-memberships state, and ready state.
- [ ] Organization switcher - cover auto-selecting one active membership, persisting selected organization, changing selected organization, and sending `X-Organization-Id`.
- [ ] Invite acceptance page - cover token capture, URL scrubbing, authenticated accept, authenticated decline, and cleared token storage.

## Requested Execution Log

- No requested frontend test-plan executions recorded yet.
