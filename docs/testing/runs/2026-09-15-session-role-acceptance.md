# ACC-06 session and role acceptance continuation — September 15, 2026

## Disposition

**ACC-06 remains Blocked for live provider/browser acceptance.** This continuation completes targeted software evidence; it does not count mocked MFA enrollment as a completed authenticator setup. The ledger remains **56/81 closed (69.1%), with 25 remaining**.

Baseline: local source `7df0ccbef62252732ceae877abb4fe7bb9a721dc` plus existing workspace changes and two new test files. No product behavior changed. PostgreSQL evidence uses newly created `pseq_invite_test_<random>` databases; identity/provider states are simulated. UI evidence uses actual React components under a test renderer, not a signed-in browser or screenshots.

## Required-step crosswalk

| ACC-06 step | Completed evidence | Remaining acceptance |
| --- | --- | --- |
| 1 — Signed-out root and protected deep link | Actual `PhaenoSessionProvider` and `AuthGate` hide protected content during authentication initialization and session bootstrap. Signed-out state renders the existing provider SignIn component with root fallback and invitation-only configuration. Failed access checks remain closed. | Execute the root/deep-link sequence in a live browser against the chosen UI/API release. |
| 2 — Required MFA | Simulated provider pending/signed-out state makes no session request and reveals no protected content. Actual MFA wrapper renders the provider task with root continuation. | Complete required authenticator setup privately and prove that the configured provider blocks full access until enrollment completes. The mocked task does not prove provider enforcement, codes, enrollment or completion. |
| 3 — Expired session and unsaved form | Actual Company association form receives a simulated Axios 401. It shows the supplied error, retains the entered Contact and job-title draft, remains retryable, and sends no automatic retry or false success. Confirmed sign-out unmounts the workspace; signing back in opens an empty form. Separate PostgreSQL controller evidence rejects an unauthenticated association attempt, independently reads no association, then saves the intended association once with an authorized identity and rejects duplicate submission. | Expire a real controlled browser session with this form open; confirm the actual authentication response/recovery copy and record draft behavior. The controller's direct guard returns `crm_access_forbidden` (403); the component's 401 is simulated. HTTP bearer expiry/middleware behavior was not exercised. |
| 4 — Pending and accepted additive roles | Actual invitation endpoint stores Operator and ProtocolAdministrator intent without an invited User or Lab role assignments. Pending session/admission has no Lab access. Verified simulated acceptance enables exactly the two capabilities; supervisor, scientific reviewer, access management and platform administration remain denied. | Perform invitation/acceptance in live separate identities and inspect the pending/accepted administration screens. Real sending/provider enrollment remains open. |
| 5 — Role edit and fresh authorization | Actual role-update endpoint denies self-escalation by the narrowly scoped employee and requests without a session. Platform administrator removes Operator, adds ScientificReviewer and retains ProtocolAdministrator. Fresh session and Lab request admission enforce the changes. Removed assignment identity/history and accepted invitation remain; stale-version replay is rejected. A "Scientific Reviewer" display name and provider `role`, `job_title` and `org_role` claims do not grant reviewer or administrator permission. | Perform the matching active-role edit through the signed-in administration screen and compare fresh protected requests. |

The observed draft behavior is explicit: a rejected save keeps the in-memory draft while the workspace remains mounted; confirmed sign-out discards it. This run does not establish durable draft recovery across authentication.

## Verification

- **17 backend checks passed, zero failures/skips:** two new disposable-database journeys, four external-identity checks and eleven session-access checks. Evidence: `tmp/session-role-results/session-role-final.trx`.
- **7 component checks passed, zero failures/skips:** four new session/form acceptance checks plus three retained Department/session persistence checks. Evidence: `tmp/session-role-results/components-final.json`.
- Frontend TypeScript and scoped ESLint passed. No E2E/browser suite or application build was needed for these test-only additions.

Initial test compilation used the wrong exception property and request constructor; these were corrected. The component test initially clicked a still-disabled loading action and now waits for readiness. All four component tests then passed, but the JSON reporter could not create/write its output through the Node process. The final successful run captured the JSON reporter's standard output through the shell; its report records success and seven passes. No application fix resulted from these test-harness corrections.

## Cleanup and next checkpoint

Both committed database journeys dropped their disposable databases. Independent database inspection found zero remaining `pseq_invite_test_*` databases. Existing UAT identities, invitations, orders, shipments and laboratory work were not modified. No real messages, identity-provider changes, shared migrations, Git mutations or deployment occurred.

Resume ACC-06 at the live root/deep-link and privately completed MFA flow, then the controlled expired-session form and administration role screens above. Reuse this software evidence; do not repeat completed operational writes. Until those gates are satisfied, retain ACC-06 as Blocked and the 56/81 total.
