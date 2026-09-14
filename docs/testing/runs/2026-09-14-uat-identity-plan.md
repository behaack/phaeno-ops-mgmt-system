# Bounded connected-UAT identity plan

Status: authorized by the Product Owner's subsequent “Continue” on 2026-09-14; execution is journaled under `tmp/uat-closure-identities`. Account setup is a prerequisite, not a passed acceptance case.

The existing reusable Finance logins and independent-reviewer session do not provide the other audience and operating sessions required by the 81-case pack. Reuse existing dedicated accounts when their credentials/session are available. Otherwise prepare at most 19 additional clearly labeled UAT identities in the existing Clerk development instance, with memberships and role assignments only in the isolated loopback UAT database. Use the current authentication flow and existing role model. Do not reset real-user credentials or broaden application authorization to bypass a failed test.

| Maximum new identities | Test responsibilities and boundaries |
| --- | --- |
| 1 | P-ADMIN, also P-FULFILL/P-FILE: isolated setup, CRM/admin, fulfillment and file configuration. |
| 1 | P-SALES: ordinary Phaeno commercial member, no platform administration. |
| 1 | P-PRICE/P-TRIAL-C: documented commercial/pricing and Trial commercial approval responsibilities. Any missing application capability is a defect to investigate, not permission to grant unrelated administration. |
| 1 | P-TRIAL-S: independent Scientific Operations Trial approver. |
| 2 | P-PROTOCOL-A/B: distinct protocol authorship and approval identities. |
| 2 | P-LAB/P-SUP: distinct routine operator and supervisor. Neither is the scientific reviewer. |
| 1 | P-RELEASE: separate Result Release Manager; no scientific-review contribution. |
| 4 | Customer A organization admin, Research Department admin and Research member; separate Customer B member with no Customer A access. |
| 3 | Prospect organization admin, Research Department admin and Research member. |
| 3 | Partner organization admin, Research Department admin and Research member. |

Use the existing marked UAT organizations when appropriate, or separately marked synthetic organizations for destructive account-lifecycle variants. Preserve existing real and historical fixture memberships. Keep Department-scoped users out of Operations. Persist account/role identifiers and encrypted credentials locally, never in source or reports. Record every grant and its purpose; deactivate new grants after their dependent acceptance journeys finish, preserving audit history.

This authorization covers only these test accounts and local fixture permissions. It does not cover production access, changing existing users' roles/passwords, authentication-policy changes, real invitations/emails, provider publication, deletion of retained UAT packages or fabricated laboratory observations. INVITED/WRONG-EMAIL delivery variants remain separately gated by controlled-recipient authorization.

Execution uses the exact role/audience scripts in [TEST-DATA](../TEST-DATA.md) and [the closure ledger](2026-09-14-uat-closure-reconciliation.md). Pass requires each scripted step, not successful account creation. The earlier one-time reviewer Operator grant remains inactive and is not reused.

Repository permission basis: [AGENTS.md](../../../AGENTS.md), “Do not add dependencies, change auth, or change a cross-app contract without a short plan and explicit scope.” Treat this bounded account/permission expansion as requiring explicit scope; ordinary UAT continuation did not explicitly authorize replacing the prior one-account approval with an unrestricted cohort.

## Executed cohort

Created exactly 19 dedicated identities in the verified Clerk development instance, with encrypted credentials and a retry-safe inventory journal. Applied 19 audited local memberships in one committed transaction; the first setup attempt rolled back completely after a fixture dependency-order error, verified as zero committed cohort users/organizations before correction. No existing primary Trial authority was replaced: the two test approval identities delegate to the respective existing primary. Research-only members have no Operations membership. New Prospect and Partner organizations are explicitly TEST ONLY. No existing account/password or reviewer role changed. Active test grants remain available for their unfinished dependent acceptance journeys; deactivate only after those journeys conclude.

Real sign-in and effective-role readback verified P-ADMIN, P-LAB, P-SUP and the three external member audiences. P-ADMIN cannot read native Finance invoices/receipts without a Finance role. Account creation alone closes no case. Local artifacts: `definitions.json`, `identities.json`, `local-grants.json` and encrypted per-alias credential files under the ignored `tmp/uat-closure-identities` directory.


Later connected checks verified Customer A Organization/Department administrators, the Scientific Operations Trial delegate and the CommercialOperator. P-PRICE fulfills the non-admin Sales responsibility for CRM-02; bare P-SALES membership alone is correctly denied CRM under current business-role rules. No extra role was assigned. ACC-03 temporarily changed only the cohort member's Department assignments through reviewed UI actions; original Research-only access was restored and the new temporary Department retired, with revoked history retained.
