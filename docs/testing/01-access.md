# 01 — Access and Departments

Use [shared prerequisites](TEST-DATA.md) and record every result in the [run record](RUN-RECORD.md).

## ACC-01 — Invitation, correct identity and first access

**Setup:** Active Company scope, controlled unregistered recipient, valid Department assignment; P-ADMIN and INVITED in separate browser profiles.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Company → People. Create/associate the test Contact, then choose Invite to Portal with Research membership. | Contact alone grants no access. Review identifies exact recipient, organization and offered access. |
| 2 | Confirm the invitation and reopen People. | One pending invitation exists; delivery state is distinct from pending acceptance. No effective membership is granted yet. |
| 3 | Open the newest link while WRONG-EMAIL is signed in. | The user cannot accept for the other email; Sign out and use invited email preserves the invitation continuation. |
| 4 | Sign in as INVITED; complete required MFA privately, review and accept. | Access is activated only for the invited identity and scope; header and permitted navigation match Research. |
| 5 | Reload and reopen the accepted link. | Membership persists; repeated continuation does not create another user or membership. |

**Handoff:** Retain the accepted Research membership for ACC-03. Record invitation/user IDs, never the private link or MFA evidence.

## ACC-02 — Resend, revocation, expiry and declined invitation

**Setup:** Four controlled pending invitations; record resend cooldown and expiry prerequisites.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Resend one eligible invitation; try the previous link, then the newest link. | Old link no longer grants access; newest link presents current offered access. Cooldown blocks premature repeat sends. |
| 2 | Revoke a second invitation with the reviewed consequence, then open its link. | It cannot be accepted; no membership is activated. History retains revocation. |
| 3 | Open the expired fixture's link; separately decline the fourth invitation. | Neither grants access; each displays its actual lifecycle state. |
| 4 | On a pending Department invite, deactivate/change the offered Department before resend/acceptance. | Invalid current access is rejected for review/reissue; stale role intent cannot grant access. |
| 5 | Review a controlled hard-bounce fixture and reissue to a corrected controlled Contact. | Recovery uses revoke/reissue; sender failure is not shown as membership acceptance. |

**Cleanup:** Revoke remaining unused invitations. Use only the controlled sender/recipients.

## ACC-03 — Department structure, membership and settings inheritance

**Setup:** C-ADMIN, C-DEPT, C-MEMBER; Research/Operations; saved historical quote/shipping snapshot.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | As C-ADMIN open Departments, create a test Department and select the default through review. | New active Department is available; historical record ownership does not move. |
| 2 | Set Organization PO default to required, Research override to waived, then blank the override. | Effective value/source changes to override then inheritance. Existing accepted snapshots stay unchanged. |
| 3 | As C-DEPT manage Research settings and find an existing member by exact email. Review and add access. | Only assigned Department settings/membership can be changed; no organization-role promotion or new-user invite authority is acquired. |
| 4 | Attempt to remove a member's final active Department or deactivate that Department. | The operation is blocked until another valid assignment exists. |
| 5 | Add alternate access, deactivate then reactivate the test Department. | History remains; revoked assignments are not silently restored. |

**Cleanup:** Restore test defaults and memberships through supported reviewed actions; preserve historical snapshots.

## ACC-04 — Tenant, Department and member permission boundaries

**Setup:** Known test record IDs in Customer A Research/Operations and Customer B; separate sessions; engineering observer for read/API checks.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | As C-MEMBER open an authorized Job and available released file. | Research records load; member-only actions match current permissions. |
| 2 | Follow a known Customer B test record URL and attempt its file request. | Server denies access without returning the other tenant's record/file content. |
| 3 | Repeat for Customer A Operations without an assignment. | Same Department boundary holds for list, detail and download; hidden navigation alone is insufficient proof. |
| 4 | As C-DEPT prepare a Job/Kit draft where entitled and attempt a new configured purchase. | Preparation is allowed within scope; placement requires Organization admin. Prospect acceptance/submission also requires Organization admin. |
| 5 | Engineering repeats an applicable protected mutation with the limited test identity and known unauthorized fixture ID. | Server rejects it; independent read confirms no unauthorized state change. Record the safe response, not session credentials. |

**Handoff:** Keep the test records for SYS-03 active-access revocation.

## ACC-05 — Deactivate and restore access without erasing history

**Setup:** Disposable accepted membership, separate disposable Company, Phaeno test employee; preserve a different platform administrator.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Deactivate the test Company through its consequence dialog; refresh the external session. | Attached tenant scope stops being usable; prior work/grants/history remain. |
| 2 | Reactivate the Company and revisit with an otherwise active member. | Scope returns subject to current membership/grant rules; no new Company is created. |
| 3 | Deactivate only the test membership. Attempt fresh requests, then restore via a fresh invitation and acceptance. | Only that relationship is removed; restoration follows consent/acceptance and retains audit history. |
| 4 | In User management deactivate another test employee, then reactivate and review roles. | Global account access is suspended/restored with history retained. A platform administrator cannot deactivate their own account. |

**Cleanup:** Restore agreed test access; retain all deactivation/reactivation records.

## ACC-06 — Sign-in, MFA, session expiry and user-role administration

**Setup:** Fresh test identity requiring MFA, expired-session fixture, P-ADMIN and narrowly scoped Lab test identity.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open Portal `/` signed out and follow sign-in; try a protected deep link before authentication completes. | Current root sign-in entry is used; no protected data appears during pending authentication/bootstrap. |
| 2 | Finish required authenticator setup privately. | Required MFA prevents full access until setup succeeds; codes/secrets are never placed in test evidence. |
| 3 | Expire the controlled session with an unsaved reversible form open, then attempt save. | Unauthorized submission cannot commit; recovery is clear and no false success is shown. Record actual draft preservation behavior. |
| 4 | P-ADMIN invites a Phaeno user with specific additive Lab roles; inspect before/after acceptance. | Pending role intent grants nothing; accepted roles enable only the intended capabilities. |
| 5 | Edit the active test user's role and compare available operations with a fresh request. | Enforced authorization changes; unsupported job-title/provider labels do not grant capabilities. |

**Cleanup:** End controlled sessions; retain only role/status evidence. MFA recovery administration is not required for this case.

**Sources:** [Account guide](../../frontend/src/content/docs/en-US/customer/account-and-access.mdx), [Phaeno administration](../../frontend/src/content/docs/phaeno/organization-and-user-administration.mdx), [account backend](../../backend/app/Features/Accounts), [session tests](../../backend/test/SessionAccessTests.cs), [Department E2E](../../frontend/e2e/department-self-service.spec.ts).
