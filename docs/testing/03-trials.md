# 03 — Trial lifecycle

Use [shared prerequisites](TEST-DATA.md). Main path uses a two-sample extracted-RNA evaluation. Trials create no paid order, quote, invoice or payment gate.

## TRI-01 — CRM request to shared scope draft

**Setup:** Active Prospect/Department, active linked Opportunity, Trial staff and two separate staff sessions.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | From Company Requests create Work → Trial Project; choose Start Trial. | Exact Company/request carries forward with a return link; one request creates at most one Trial. |
| 2 | Define scope with objective and allowance, leaving approval-required scientific/date fields incomplete; Save draft. | Valid partial scope saves without approval, Prospect visibility, sample authorization or Lab work. |
| 3 | Resume draft in another authorized staff session. | Saved values and last editor/time are shared; active approved scope, if any, is unchanged. |
| 4 | Change draft in both sessions and save sequentially. | Stale save cannot overwrite the newer draft silently; entries remain available for reviewed recovery. |
| 5 | Complete required approved test definitions, terms/window/material instructions and Submit scope for approval. | One scope revision is created; draft clears only after success. Missing/invalid fields block submission. |

**Handoff:** Retain request, Trial, scope revision and pinned scientific IDs for TRI-02.

## TRI-02 — Independent approvals and Prospect acceptance

**Setup:** P-TRIAL-C/P-TRIAL-S are different effective authorities; dual-domain authority variant; R-ADMIN/R-DEPT.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Inspect Trial configuration; assign/designate test authorities through the permitted primary/delegate roles. | Optional note may be blank; assignment history persists and no scope decision is fabricated. |
| 2 | Record Commercial approval; inspect Prospect submission controls. | One approval alone does not authorize acceptance/submission. |
| 3 | Attempt both domains with one dual-domain person, then approve Scientific Operations with the other person. | Same-person second approval fails; two affirmative decisions from different authorized people satisfy the gate. |
| 4 | As R-DEPT attempt scope acceptance; as R-ADMIN open Review and accept scope and affirm terms. | Department admin cannot accept; Organization admin sees exact revision and RUO/no-PHI terms before acceptance. |
| 5 | Refresh staff and Prospect views. On a separate scope choose Request changes. | Acceptance and approvals persist; requested changes require a new revision and decisions. Internal estimated value/cost is absent externally. |

**Handoff:** Accepted main Trial goes to TRI-03; keep change-request variant separate.

## TRI-03 — Bounded submission and sample/shipment authorization

**Setup:** Accepted Trial, open window, allowance two, approved type/destination/rules; R-ADMIN/R-DEPT.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | As R-ADMIN choose Submit samples; enter two coded samples sharing RNA type/destination with one/two tubes and required analytical metadata. | Required quantities, units and concentration follow the approved analyses; no PHI is requested. |
| 2 | Try duplicate reference, missing required metadata and invalid quantity variants before valid submission. | Clear validation; no partial roster, shipment or Lab authorization is created. |
| 3 | Confirm RUO/no-PHI and submit valid roster; refresh/retry the completed operation. | Exactly one authorization/shipment for the batch; Lab work pins scope/workflow and three tube slots; no duplicate on replay. |
| 4 | Try a third original sample and repeat as R-DEPT. | Original allowance and Organization-admin gate enforced by server. |
| 5 | On separate fixtures test before/after window, unaccepted revision, hold and closed state. | Each relevant gate blocks submission and explains the current cause. |

**Handoff:** Open Shipping and packets; continue ORD-05 and LAB-02–06. Retain sample/Lab/tube lineage.

## TRI-04 — Amendment, holds and one authorized replacement

**Setup:** Separate accepted Trial with submitted failed sample; staff authority and Prospect admin; existing pinned scope.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Amend scope, save planning changes, then submit revision. | Earlier scope/history remain; draft alone changes no approval or operational authorization. |
| 2 | Attempt use of amended scope before two fresh approvals and Prospect acceptance; then complete those reviews. | Revised scope cannot bypass approvals/acceptance; reviewed version becomes authoritative. |
| 3 | Place Trial on hold; attempt scientific progress/shipping mutation and record a legitimate custody exception. | Scientific/shipping progress is blocked; custody/exception facts remain recordable through supported paths. |
| 4 | Resolve hold, authorize one replacement with failed sample, responsibility, reason and authority; submit it as Prospect admin. | Exactly one replacement links to original; frozen original allowance is not increased. |
| 5 | Try to reuse replacement authorization and edit frozen return arrangements after first submission. | Reuse and retroactive material-term changes are rejected; original lineage remains. |

**Cleanup:** Resolve test hold; retain amendments/replacement history for release validation.

## TRI-05 — Partial and complete scientific result release

**Setup:** LAB-06 approved packages for every submitted sample/replacement; P-RELEASE, R-ADMIN/R-MEMBER; real test storage/scanner.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Try a package missing a frozen deliverable, failed scan or required scientific approval. | Release is blocked; no downloadable incomplete package is published. |
| 2 | Release an eligible subset as Partial; download as authorized Prospect member. | Only approved files available; archive manifest links scope/sample/file/checksum and exact RUO statement. Partial release does not start complete-package retention. |
| 3 | Attempt Complete before every submitted sample/replacement has its approved package. | Completeness gate fails without closing the Trial. |
| 4 | Select all complete approved packages and release Complete. Refresh both roles. | Trial completes; effective retention freezes once. No invoice, payment or credit requirement appears. |
| 5 | Inspect earlier partial archive and current complete receipt; follow DAT-04 transfer checks. | Partial history links to complete package; internal downloads do not satisfy external retention completion. |

**Handoff:** Preserve full manifest/receipt metadata for TRI-06 and DAT-05/06. Do not store scientific contents in the run log.

## TRI-06 — Closure, material disposition, CRM follow-up and conversion

**Setup:** Completed main Trial; separate incomplete Trial; controlled CRM publication failure; Prospect conversion request fixture.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Close incomplete variant with appropriate outcome and Prospect-safe reason. | New submissions stop; unfinished Lab authorizations receive cancellation requests, custody/history remain. |
| 2 | Inspect material retention at terminal closure; record an authorized actual disposition once, with a held variant. | Scope-frozen closure-based due date is retained; due date alone records no destruction; hold blocks disposition and duplicate recording fails. |
| 3 | Review commercial follow-up owner/date; retry failed CRM publication from original Trial. | Safe milestone/deep link reaches CRM once; sample/scientific/internal cost details do not leak or block Trial operations. |
| 4 | Approve/apply Prospect → Customer or Partner relationship through CRM and reopen old Trial. | Same organization, memberships/grants/history remain; no new order, extended deadlines or reopened submissions. |
| 5 | On unconverted closed Prospect fixture choose Close Prospect access, first with open Opportunity/grant/other Trial, then after legitimate resolution. | Outstanding relationships/holds block closure; valid closure deactivates access with reason and keeps history/deadlines. |

**Cleanup:** Record actual material decisions only with Lab owner evidence. Keep converted and closed test histories.

**Sources:** [Trial guide](../../frontend/src/content/docs/phaeno/trial-projects.mdx), [Prospect guide](../../frontend/src/content/docs/en-US/prospect/trial-projects.mdx), [Trial plan](../plans/PROSPECT-TRIAL-PROJECT-PLAN.md), [database tests](../../backend/test/TrialProjectPostgresTests.cs), [Trial E2E](../../frontend/e2e/trials.spec.ts).
