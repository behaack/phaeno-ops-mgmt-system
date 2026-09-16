# ACC-05 simulated software acceptance — September 15, 2026

## Scope and disposition

Under the continuing approved simulated software scope, **ACC-05 is Pass (simulated)**. The controlling ledger is **56/81 cases closed (69.1%): 39 ordinary passes and 17 simulated passes; 25 remain**. Real identity-provider, invitation delivery and deployed browser acceptance remain separate.

The run uses the existing disposable invitation database fixture and actual Company, membership, invitation, session and employee account endpoints. No product behavior changed. New coverage is in `backend/test/AccountLifecycleAcceptancePostgresTests.cs`; the shared invitation test class is partial and now supports a selected scope and an existing-user invitation without creating another Contact/User link.

## Required-step crosswalk

| ACC-05 step | Evidence and result |
| --- | --- |
| 1 — Company deactivation | `CompanyAndMembershipRestorationRetainWorkGrantsAndIdentityWithoutRestoringAccessEarly` creates an accepted ordinary Research member, retained Lab order, synthetic dataset grant and an independent membership in another Company. The actual CRM Company lifecycle endpoint deactivates both Company and linked access Organization. A fresh session omits the suspended scope while retaining the other Company; fresh order-context admission returns 404. The original order, grant and accepted invitation IDs, versions and lifecycle facts remain unchanged. The original membership itself remains active. Company-dialog coverage identifies the all-user access consequence and retained records before confirmation; Cancel sends no confirmation. |
| 2 — Company reactivation | The same Company endpoint restores the existing Company and Organization IDs. Fresh session selection returns Research; order-context admission succeeds using the original membership. Existing order/grant/invitation snapshots remain unchanged and the Company retains both audited lifecycle updates. Dialog coverage describes restoration under existing memberships/entitlements and permits cancellation before confirmation. |
| 3 — Membership-only deactivation and restoration | The actual membership endpoint deactivates the selected relationship and its Department assignment. Fresh session/admission denies that scope while the person's other Company membership stays active. A fresh existing-user invitation is Pending and grants nothing until acceptance. Actual acceptance reactivates the original membership and Research assignment IDs, preserves the original Contact/User link and old accepted invitation, and does not create another User. The membership history contains deactivation and invitation-reactivation events. Company access-dialog coverage checks recipient/consequence, Keep unchanged and focus restoration, then deactivates once and shows that a new invitation is required. |
| 4 — Employee account lifecycle and self-protection | `EmployeeDisableRestorePreservesMembershipAndRolesAndRejectsAdministratorSelfDisable` starts with an active synthetic Phaeno employee with only Operator capability. Disabling the employee produces a disabled session, removes effective Lab operation access and makes active-actor admission fail. The membership and recorded role remain. Reactivation restores Operator capability without platform/user-administration authority or a duplicate role. Disabled/reactivated audit events remain. Attempting to disable the acting platform administrator returns Forbid and leaves that administrator active. Component coverage reviews and cancels employee deactivation, then deactivates/restores the same user; existing self-action checks also pass. |

The grant/source/file facts are explicitly synthetic metadata fixtures used only to verify preservation. They are not proof of scientific publication, real scanning, stored bytes or download acceptance. Fresh restoration is the existing-user invitation path; it retains the previously established CRM identity link rather than creating another Contact link.

## Verification

- **23 backend checks passed, zero failures/skips**: two new disposable-database lifecycle journeys, ten account authorization checks and eleven session-access checks. Evidence: `tmp/account-lifecycle-results/account-lifecycle-final.trx`.
- **14 component checks passed, zero failures/skips**: Company lifecycle dialog, Company person access and user-management lifecycle/self-deactivation. Four new cases cover Company deactivate/reactivate review, membership-only deactivation and employee disable/restore. Evidence: `tmp/account-lifecycle-results/components-final.json`.
- TypeScript, scoped ESLint, linked evidence paths and whitespace checks passed. No product source or guide behavior changed, so no application build or documentation-corpus regeneration was needed.
- No live browser/E2E run or real identity/provider operation is claimed. The screen checks use actual React components with mocked API responses.

Initial test setup needed two missing imports, a current tracked Organization/Department reference when arranging the grant, and the existing `Updated` audit operation name. The employee session fixture now explicitly selects its Phaeno scope. Older self-action tests also expected a dropdown for a single available action; current shared UI correctly shows a direct Edit/Reactivate button. Those test expectations were updated without changing the product.

## Cleanup and remaining gates

Actual commits occur only in uniquely named `pseq_invite_test_<random>` databases created against the known loopback PostgreSQL instance. The original UAT database is only the connection source; it is not migrated or populated by these tests. Each disposable database is removed afterward, and final inspection found none remaining. Existing UAT users, Companies, memberships, invitations, orders and grants were preserved.

No real messages, identity-provider changes, shared migrations, Git mutations, commit/push or deployment occurred. ACC-06 remains open for its distinct sign-in/MFA, expired-session draft and role-intent/role-change requirements. Final provider and operational acceptance remains open for this simulated case.
