# Production laboratory release verification — September 12, 2026

Scope: read-only follow-up after deployment of application revision 5365a38015e8fd444b6e802b5e5345c1dbe6ab57; release evidence is in ../../plans/LAB-WORKFLOW-RELEASE-2026-09-12.md.

- Opened https://portal.phaenobiotech.com in Edge tab 276179565. The page settled on the invitation-only sign-in screen with email/password fields. Captured browser error log was empty.
- Unauthenticated GET of /api/platform/lab-operations returned HTTP 401 through both api.phaenobiotech.com and the Portal API proxy. No credentials were supplied and no records were changed.
- Production session is not signed in. Owner was asked to sign in with a production Phaeno account; local test accounts are not production credentials. Tab marked for handoff. Signed-in navigation, laboratory sections, release queue default and account-specific permissions remain pending.
- Newer local concurrent-registration and narrow-reflow corrections are present in the working tree and recorded in the LAB-14 UAT run. They are not part of deployed application revision 5365a38. This checkpoint did not alter, commit, deploy or retest those changes, and did not touch retained local package fixtures.

Initial result: signed-out entry and authentication boundary passed; signed-in acceptance was pending login.

## Signed-in follow-up

Owner completed sign-in. The account menu confirms Bill Haack (bhaack@phaenobiotech.com) and exposes Administration entries. This confirms the observed account, not every role-specific permission.

- Passed: Receipt and accession opens with all five expected tabs; Kit requests displays its empty state.
- Passed: sidebar order and separators show Receipt & accession, Library prep, Sequencing batches, Results & review; PSeq kits and Data assembly; Materials and Equipment; Lab configurations.
- Passed: Library prep opens the Preparation batches list with New preparation batch and an explanatory empty state. No preparation batches exist in the displayed list.
- Passed: Lab configurations exposes Protocols, Workflows and Tray formats. Protocols loads existing records; Tray formats shows an empty state with New tray format. No configuration was changed.
- Passed: Results & review opens and reports no received laboratory jobs available for review.
- Passed: Order operations opens and Result release defaults to Ready For Release.
- Blocked: the result queue reports “Governed result delivery is not enabled.” Production governed release acceptance cannot proceed under the current configuration. No flag was changed.
- Open UX finding: the dashboard shows “Attention unavailable”; the Attention page clarifies “Operational attention queues are not enabled.” Disabled capabilities remain exposed as failure states. The result queue has the same presentation issue. Configuration-aware navigation/feedback needs follow-up; neither disabled capability was enabled during this check.
- The account menu opens by keyboard and Escape closes it. Earlier pointer attempts did not expose the menu in the following snapshot; pointer behavior is not marked passed.
- Vercel CLI inspection reconfirmed portal.phaenobiotech.com targets Ready production deployment dpl_3EJvA2hr3qVj3H1eZCN8mhWeYkXv. The browser feedback iframe carried a different deployment marker; that marker was not used as release identity evidence.

Result: bounded signed-in navigation and release-default checks passed. Overall production workflow acceptance remains partial: no populated preparation tray or received review job was available, governed release is disabled, and physical/provider/scanner/customer-publication gates remain open. No operational form was submitted, package published, production configuration changed, or local fixture altered. Newer local corrections remain outside deployed revision 5365a38.

## Local correction of disabled-feature presentation

The owner continued the follow-up. Explicit disabled responses now render neutral Not enabled guidance locally, with no unusable queue filter or stale result rows/actions. The dashboard removes its disabled Attention retry/shortcut; stable workspace navigation still explains availability. Actual permission, missing-record and outage errors remain errors. Direct result-package links have the same disabled guidance and a return link. No backend/authentication/runtime configuration changed.

Twelve focused component tests, TypeScript, scoped ESLint and the generated 56-guide documentation check passed. The Phaeno guide and living frontend/E2E plans are updated. This is local automated/rendered-component evidence; a signed-in browser visual pass for the disabled state and a deployed production retest remain pending. Production and retained local operational records were not changed; no commit/push/deployment occurred.

## Signed-in local browser continuation

Retained Edge tab 276179556 on localhost:3016 confirmed William Agnew (wsa+clerk_test@example.com). Attention is disabled in this local runtime; governed results remain enabled.

- Passed: real Attention navigation renders `Attention queues not enabled` as a status, with neither the Queue selector nor an error alert.
- Passed: selecting light/dark display themes retains the notice. At innerWidth/clientWidth/scrollWidth 2124/2124/2124, there is no horizontal page overflow. Dark notice colors are foreground oklch(0.95 0.008 245), background oklch(0.22 0.026 253); light uses foreground oklch(0.19 0.025 253), white background. This is DOM/computed-style evidence, not screenshot or full contrast certification.
- Passed: keyboard Enter opens the user menu; Escape closes it and settled focus returns to `Open user menu`, aria-expanded=false. System theme restored.
- Passed: keyboard navigation to Result release retains the Ready For Release filter and the existing TEST-LAB06-READY package, reviewed by Independent Reviewer. No release action submitted.
- Restored the original real-byte ingestion package URL, 3c42f211-a219-421d-a7bc-dd07c6dba5e7, and retained the tab for continuation. Its initial read remained Scanning with Pending artifact and no approval/release recorded. No operational form was submitted.
- Still pending: narrow viewport, signed-in disabled result queue/direct-detail and dashboard correction, independent CRM recovery, and deployed correction. The separate viewport-control CLI could not attach to the existing browser (`No running Chrome instance found`); no browser was relaunched or profile copied, and no production feature was activated.

### New finding: UAT-20260912-03 — commercial navigation permission mismatch

Open. This reviewer/release-manager session is shown Order intake and lands there from Order ops. The page then reports `Customer organizations could not be loaded` / `This Phaeno operation requires an order-management platform capability.` and `Commercial intake could not be loaded` / `Phaeno CRM access is required.` Result release remains usable. Source inspection shows general sections use canViewAllOperationalOrders, which is insufficient for the CRM-backed intake queries in this observed session. Follow-up must align entry navigation/default section and query permissions with the actual commercial capability, without broadening backend access. Do not classify these permission denials as disabled features. No corrective source or role changes were made in this browser checkpoint.

### UAT-20260912-03 correction and retest

Status supersedes Open above: fixed and retested locally. Current administrator-only queue endpoints remain unchanged. UI uses the existing administrator-derived capability for those navigation entries, selects an available landing workspace, and fetches supporting lists only when their permitted workspace is selected.

Live William session in retained Edge tab 276179556: Order ops toolbar opens Result release with Ready For Release and TEST-LAB06-READY reviewed by Independent Reviewer. Sidebar has Trial projects, Attention and Result release; no Intake/PSeq kits/Assembly/Legacy integrations. Direct old `https://localhost:3016/order-operations?orderSection=intake` also renders that release queue without commercial permission alerts. Explicit Attention keyboard selection still shows the neutral disabled status. No Save/Confirm/release/withdrawal action was submitted; original ingestion package URL restored for continuation.

Verification: seven role-navigation tests plus twelve related component regressions passed (19 total); TypeScript/scoped ESLint and documentation generation/check passed. Phaeno Order operations guide and catalog updated, 56-guide corpus a5508d7b3533. Live administrator/Finance/commercial-role checks and deployed production retest are not claimed. No role assignment, API contract, backend authorization, feature activation, Git mutation or deployment.

### Related package links — correction supplement

The next read-only check reproduced the same administrator-only access failure through View commercial order from package 3c42f211-a219-421d-a7bc-dd07c6dba5e7. Applied the same existing capability gate to the related link. After refresh, William sees View scientific review, no commercial-order link, and unchanged Scanning/Pending file context. Scientific review opens work ec79d627-3001-4a91-802e-d1a65cffd716 on Review: Awaiting Specimens, zero specimens, no scientific approval. This confirms navigation, not a complete scientific workflow for the synthetic ingestion fixture. Original package checkpoint restored; no operational action submitted.

Two new tests preserve the distinction between reviewer/release access and administrator commercial links; 21 focused tests pass. TypeScript, scoped lint and 56-guide generation/check pass (5d5dc935a350). Guide explains related links by role. No production deployment, authorization change, record mutation, publication or withdrawal. Narrow viewport, disabled result/dashboard browser coverage, other-role live checks and external/provider/scanner acceptance remain open as previously recorded.

## Isolated responsive browser verification

The owner continued acceptance. A temporary Vite preview at loopback port 3018 renders the actual ConnectedOperationsSummary, OperationalAttentionPanel and ResultReleasePanel components with application CSS. An Axios adapter supplies simulated disabled responses and empty commercial intake; it rejects non-GET requests and performs no backend requests. A separate Playwright Chromium context blocks non-preview network traffic. This is browser component acceptance, not signed-in end-to-end or production evidence.

| Width | Light | Dark | Horizontal overflow | Keyboard focus |
| --- | --- | --- | --- | --- |
| 320 | Pass | Pass | None; client/scroll 320/320 | Tab reaches Review holds with focus-visible |
| 390 | Pass | Pass | None; client/scroll 390/390 | Same |
| 1440 | Pass | Pass | None; client/scroll 1440/1440 | Same |

All six combinations display neutral Attention/Result release statuses, no queue selectors, no destructive alerts, and no dashboard Attention retry/shortcut. A separate simulated 503 at 320px retains two error alerts, both filters, dashboard retry and the Attention shortcut. No page errors were captured. Screenshot inspection confirmed readable wrapping and card/notice contrast in both themes; this is not a full WCAG audit.

Initial preview screenshots exposed missing generated component utility styles. Added the full frontend source scan and a guard asserting card flex layout/nonzero radius; discarded the initial visual result and regenerated all screenshots. A first adapter mapping also targeted the wrong commercial URL; corrected to the actual /platform/orders endpoint before final verification. No product workaround was introduced. Agent-browser launch failed; the installed project Playwright runner completed the checks.

Temporary evidence is retained under `tmp/disabled-ui-preview/`: preview.tsx, preview.css, server.mjs, check.mjs, results.json, and width/theme screenshots plus 320-failure.png. The preview server and test browser are stopped after verification. Existing 3014/3016 sessions, databases, accounts and saved fixtures remain unchanged.

This closes the isolated responsive/layout checks for the three corrected queue components. Signed-in disabled result/dashboard coverage, direct-detail narrow layout, other-role live checks, deployed production retest and physical/provider/scanner/customer-publication acceptance remain open. No new product source, production configuration, Git mutation or deployment in this checkpoint.

## Administrator acceptance handoff

Next signed-in checks require Bill Haack's existing local administrator account at https://localhost:3016. The retained package still shows Scanning, Pending artifact, and no approval/release recorded. Opened the account menu for the owner to switch accounts; did not sign out automatically or change roles. After login, confirm administrator commercial sidebar/Intake landing and commercial-detail link remain available, and verify the corrected disabled Attention dashboard message against the real local API. Governed result delivery is enabled in this environment, so disabled-result end-to-end acceptance remains a separate configuration gate. No operational saves or synthetic publication are needed for these checks. Existing package URL and tab 276179556 are retained.

## Administrator acceptance completed locally

Bill Haack signed in on retained Edge tab 276179556 at localhost:3016. Commercial intake loads six orders. This account is a platform administrator without an assigned operational Attention role in this role-enforced runtime. The dashboard incorrectly requested that queue and displayed Attention unavailable; this is a permission mismatch, not a disabled-feature response.

Correction: gate the operational Attention request, count, retry, shortcut and panel using the existing business-role capabilities. Retain administrator Attention navigation for the independently authorized CRM sale-summary recovery panel. Cached Attention data must not appear when the account lacks the role. No backend permission or role assignment changed.

- Passed: Bill's dashboard shows Active commercial intake and six orders, with Open Intake and Review holds; no Attention count, error, retry or shortcut.
- Passed: administrator Attention opens CRM sale summaries and its No sale summaries need attention empty state, without an operational permission error. No retry was submitted; populated recovery remains untested.
- Passed: original package shows View commercial order and View scientific review. The commercial link opens TEST-LAB06-FILE-INGESTION successfully, with its Draft Request state and matching Job number; no permission alert.
- Package remains Scanning, with one 158-byte Pending artifact and no approval or release recorded. No operational form or publication action was submitted.

Verification: 23 focused tests across role navigation, disabled capabilities and result links passed. Final TypeScript, scoped ESLint and documentation check passed; 56-guide corpus 68829f5db33f. This closes the administrator navigation/dashboard/empty CRM recovery acceptance checkpoint. Finance-role browser checks, populated CRM recovery, signed-in disabled result queue/detail, deployed retest and external scanner/provider/physical delivery gates remain open. Original package checkpoint restored for continuation. No Git mutation or deployment was performed in this checkpoint.

## Signed-in disabled result release — local LAB-14 continuation

Continued in the already-running localhost:3014/API 7114 environment. Its retained launcher has GovernedPSeqResults=false; no flag, role, account, database or runtime changes were needed. New Edge tab 276179603 reused Bill Haack's existing sign-in, confirmed through the account menu. This environment exposes administrator Result release navigation, unlike the role-enforced LAB-06 environment; do not treat it as a Finance-only or release-manager-only role test.

- Passed: Result release queue settles to the neutral Result release not enabled status with no Package state selector, error alert or package actions.
- Passed: direct package URL using 3c42f211-a219-421d-a7bc-dd07c6dba5e7 settles to the same neutral status with Back to result packages. This exercises the feature gate before package lookup; it does not claim that the LAB-06 package exists in LAB-14. Keyboard Enter on the return link navigates to the result queue; subsequent queue inspection confirms the neutral status.
- Passed: dashboard settles to six active intake orders and Attention queues not enabled, with Open Intake and Review holds retained; Attention shortcut/retry are absent.
- Passed: real disabled result queue in both light and dark themes has one status, no errors or selectors, and no desktop overflow (client/scroll 2124/2124). Dark foreground/background: oklch(0.95 0.008 245)/oklch(0.22 0.026 253); light: oklch(0.19 0.025 253)/white. Evidence is DOM/computed styles, not a full contrast audit. System preference restored.

Initial loading/filter states were observed before the API error/retry settled; only settled states are marked passed. Two browser-control timeouts during theme selection were resolved by inspecting current UI and retrying the uncompleted click. No operational submission occurred. Original LAB-06 tab/package remains preserved; the additional LAB-14 tab is left at the disabled result queue.

This closes signed-in local disabled result queue/direct-link and disabled Attention dashboard coverage. No product source changed and no automated suite rerun was needed for this manual checkpoint; documentation whitespace check passed. Remaining: direct-detail narrow layout, role-enforced Finance browser coverage, populated CRM recovery, deployed correction retest, and real scanner/storage-transfer/full scientific lineage/Customer publication and physical validation gates. Existing synthetic packages must remain unpublished.

## Result package narrow layout — UAT-20260912-04

Found and fixed locally: long uninterrupted Job/sample identifiers overflowed the package header and scientific facts; the same identifiers overflowed the release confirmation description. At 320px the page expanded to 1528px and the dialog's 286px content expanded to 701px. Scoped the correction to ResultPackageDetailPage: allow the heading group and fact cells to shrink and wrap identifiers, file/manifest evidence and confirmation descriptions without truncating their values. No action or permission behavior changed.

Verification uses the actual detail component, application CSS and a temporary simulated session/GET adapter in the isolated preview. No Clerk session, backend API, operational record or production service is involved. Adapter rejects all non-GET requests. Long test identifiers and a long filename intentionally stress wrapping; the simulated ReadyForRelease/Clean metadata is not scientific or scanner evidence.

- Passed: ReadyForRelease detail with expanded checksum/manifest and disabled direct-detail view at 320, 390 and 1440px in light/dark themes; client width equals scroll width in all six combinations.
- Passed: release confirmation remains within viewport with no internal horizontal overflow (286/286px at 320; 510/510px at 1440). Four successive Tab presses stay inside the dialog; Cancel closes it and restores focus to Release to Customer.
- Passed: withdrawal Confirm is disabled without a reason, enabled after entering test text; Escape cancels and restores focus to Withdraw. No confirmation was submitted.
- Passed: disabled direct-detail return link is focus-visible; no release action is rendered. Zero browser page errors. Reduced-motion preference used for stable dialog measurements; screenshots inspected at 320 light and 390 dark.

Retained temporary evidence: tmp/disabled-ui-preview/check-detail.mjs, detail-results.json, detail-*.png and dialog-*.png. The preview server and browser were stopped; retained signed-in 3014/3016 tabs and packages were untouched. All 23 focused component/role tests, TypeScript and scoped ESLint passed. Reviewed the Phaeno billing/payment/release guide: no procedure or wording change is needed for this wrapping-only correction. Living plans updated; no commit, deployment or production retest. This closes isolated direct-detail responsive coverage; signed-in/full-shell responsive, role-enforced Finance, populated CRM recovery and external/physical end-to-end gates remain separate.

## Finance access continuation — UAT-20260912-05

Read-only inventory of active commercial_ops.business_role_assignments in local 127.0.0.1:5436/phaeno_ops_lab06_uat found only William's ResultReleaseManager role. There are no active BillingOperator/CashOperator/CashReconciler assignments; signed-in Finance-role acceptance remains Blocked on identity setup. No roles or accounts changed. Proposed three development-only identities and isolated memberships/roles are recorded in the owning plan, pending owner authorization.

Live Bill on 3016: explicit orderSection=finance bookmark renders permitted commercial intake with six orders, no Finance sidebar entry. Direct invoice route with all-zero UUID renders This record is unavailable in your current Finance view, with Back to Finance and no record controls. The all-zero probe checks client gating only, not existing-record authorization or API bypass. Original ingestion package URL restored; no financial or laboratory action submitted.

Source tracing found invoice Open order was unconditional despite the destination's administrator requirement. A new Billing-only component case failed as expected. Corrected the link using the existing commercial-administration capability at both Finance panel callers. Billing adjustment remains available to Billing Operators; administrator commercial link is retained. Two regressions cover both cases. No backend access expanded.

All 57 focused tests across PSeqOrderToCashPanels, FinanceCorrections, order-sections, ResultReleasePanel and DisabledOperationalCapabilities pass. TypeScript/scoped ESLint and documentation generation/check pass, 56-guide corpus 98d5a6df074c. The expanded test run also found two stale mock errors for isOrderFeatureDisabled; retained the real module exports in the partial mock and reran successfully. Help and living plans updated. No Git mutation, deployment, account creation or financial writes; populated signed-in Finance and production checks remain open.

## Approved Finance identities and role acceptance — UAT-20260912-06

Owner approved the three-account proposal with Continue. Verified Clerk environment_type=development, instance ins_3EaSONG9skFvfhZDZcWQuSitf9y, matching test-key configuration and local development authority. Exact-email duplicate checks found none; created password-enabled, test-address identities without invitation email or provider-policy changes. The first array-filtered provider lookup returned unrelated users, so creation relied on locally checking exact addresses in the complete small user inventory, not that filter result.

Created audited domain users/memberships/roles through a scoped EF helper against 127.0.0.1:5436/phaeno_ops_lab06_uat only, in one transaction with Bill as setup actor. Every identity has one Phaeno membership, General department, the single role below, no organization/department administration and no Lab role. The helper's initial compile used the wrong department property; corrected to DepartmentId before execution. Final build: zero warnings/errors.

| Identity | Internal user ID | Clerk subject | Role |
| --- | --- | --- | --- |
| uat.billing+clerk_test@example.com | c1c897e7-0885-4e17-a298-51550068f4b8 | user_3JFXBv0bCvHbIkTd9krUyy0wbAg | BillingOperator |
| uat.cash+clerk_test@example.com | d5021433-7c72-43f8-9707-dc69f7db4f5a | user_3JFXBulv7oPxoW13u3qT5IdUqth | CashOperator |
| uat.reconciler+clerk_test@example.com | 5854d2ed-fc8c-4f01-a961-238b4e2d74da | user_3JFXBzUaDEWg9dhnGon9q4OR8u3 | CashReconciler |

Generated passwords are retained only as current-Windows-user protected credential files under ignored tmp/finance-uat-identities, not plaintext/source. The helper scripts contain no credentials. User/role readback confirmed all three accounts active, with General access and both administrator flags false. Prior Bill/William/independent-reviewer records and shared/production databases were not modified.

Real Billing login exposed UAT-20260912-06: after sign-in redirects home, dashboard mounted commercial intake and displayed a platform-capability denial. Corrected dashboard composition: administrators retain their commercial summary; role-only users see links to their allowed workspaces without loading commercial queries. Existing section rules supply those links. Phaeno help updated.

Separate Playwright contexts using actual password plus the development test-email verification-code flow passed:

- All three sign-ins, role dashboard, no commercial-intake alert or shortcut, and Finance link navigation.
- Billing: Invoices and aging plus Customer billing, with successful Customer list reads.
- Cash: Receipts, Import receipts and Reconciliation; no Billing or release workspace.
- Reconciler: Reconciliation only; no New reconciliation or Record receipt action.
- All three: sidebar has Attention/Finance, excludes administrator queues and Result release; old orderSection=intake bookmarks fall back to Finance. No application HTTP failures, page errors or attempted operational writes.
- All three role dashboards: 320px client/scroll widths match. Settled Billing dark-theme screenshot inspected. Initial screenshot during theme change had stale inherited text colors; waiting for the actual dark computed foreground produced correct readable text, without a product workaround. Do not use the initial screenshot as settled contrast evidence.

The first browser attempt omitted Continue after entering the code; the next reached the genuine dashboard defect. Final successful runs explicitly completed verification and used the real dashboard Finance link. Browser test contexts close after each role; existing owner CUA tabs/sessions remain untouched. Application non-GET requests were blocked in these read-only test contexts and none were attempted.

Evidence: tmp/finance-uat-identities/identities.json, browser-results.json, check-finance-logins.mjs and role screenshots; protected credential files are excluded from source. Financial row counts before/after remain invoices=0, payment_receipts=0, reconciliation_batches=0. Therefore populated record access, invoice link browser proof, allocation/reversal, independent closeout and scanner-backed receipt evidence remain Not run/Blocked by their prerequisites. No financial data was fabricated or submitted.

Six new OrderOperationsSummary tests plus existing focused coverage: 63 passed across six files. TypeScript/scoped ESLint and documentation generation/check passed (56 guides, ac2efe54ca0b). Identity setup and signed-in role navigation are complete; no new deployment, Git mutation, provider settings change or production activation.

## Populated Finance acceptance — September 12, 2026

Continued at isolated UI 3016/API 7116 and 127.0.0.1:5436/phaeno_ops_lab06_uat. Created two TEST-ONLY-FIN-20260912 Customers and six synthetic invoices through an audited domain helper, in one transaction as Bill. These are arithmetic fixtures: source Jobs are not completed, quotes are not accepted, PDF keys are deliberately unavailable and checksums placeholders. They cannot establish FIN-01 issuance, scientific completion or PDF success. Existing lab fixtures and shared/production data were untouched.

Setup build passed with zero warnings/errors after a missing namespace correction. Database commit succeeded, then the manifest file write was denied. Read-only database recovery obtained the saved IDs; setup was not rerun. The helper prevents duplicate creation. Real Clerk-authenticated Billing/Cash/Reconciler browser contexts then performed supported financial operations. Runner write guards restricted requests to the named local fixture routes, amounts and identifiers. No unexpected writes or browser page errors occurred. Owner browser sessions remained intact.

| Coverage | Passed observations |
| --- | --- |
| Populated Billing / UAT-20260912-05 | $220 invoice opens; adjustment action available; forbidden Open order absent. Return preserves Customer A filter; Customer B invoice excluded. |
| FIN-04 import | Invalid amount returns 400/payment_import_row_invalid with values retained and no receipt. Two-row $325 preview displays Customer/source/rows/total and creates no cash. Change input removes confirmation and requires another preview. Confirm creates exactly two unapplied receipts; repeat file returns 409/payment_import_duplicate. |
| FIN-02 allocation | $221 blocked in UI before request. Other-Customer invoice absent from matching. $100 + $120 allocations produce invoice balance $0 and receipt unapplied $30, with two history entries. Fully paid invoice excluded from further matching; allocated receipt cannot be reversed through UI. |
| FIN-03 partial reversal | Reasoned $120 reversal retains original history, restores invoice balance $120 and receipt unapplied $150. One active $100 allocation remains; receipt reversal still unavailable. |
| FIN-05 reconciliation | Separate $75 receipt selected. Bank $70 produces visible $5 difference and disables submission. Reasoned edit to $75 retains before/after history. Cash submits; edit/cancel disappear and Cash has no approval action. Independent Reconciler approves; saved closeout contains $75 bank/ledger, $0 difference, one source, edit history and independent approver ID. Approval action disappears. |

Independent database readback confirms:

| Record | Identifier | Final saved state |
| --- | --- | --- |
| Customer A | ae3fa8da-5ccd-4f4d-a2f1-2ffe266dbe34 | TEST-ONLY-FIN-20260912 Customer A |
| Customer B | 92d8b3f0-28fb-4e80-a0ed-67049580cdb1 | TEST-ONLY-FIN-20260912 Customer B |
| Main invoice | e8d77773-2477-4c16-986b-7cb080f6a1d1 | $220 total, $100 applied, $120 balance, version 4 |
| Main receipt | 82530522-9a11-4444-93ec-b9884f8a551d / RCT-20260913-91D82AC7 | $250 amount, $100 applied, $150 unapplied, version 4 |
| Active allocation | 440f90b1-af33-49b8-bfef-87f9a9c1c769 | $100, not reversed |
| Reversed allocation | c11a4216-d3cb-4d02-82a0-bd67533cb47f | $120; reason/time retained |
| Reconciliation receipt | 355eceaf-fe0b-44cc-8a33-ee81a2cdf36f / RCT-20260913-2DDA9224 | $75 unapplied, version 1 |
| Confirmed import | 5d28aab8-1b68-4331-9f1e-6e933225100a | Two rows, $325, version 2 |
| Reconciliation | bdfb9157-35e6-4057-aea3-34a0c6813dfb / REC-20260913-7CA177A4 | Approved, bank/ledger $75, difference $0, version 4 |

Cash d5021433-7c72-43f8-9707-dc69f7db4f5a imported, allocated, reversed, created, edited and submitted. Reconciler 5854d2ed-fc8c-4f01-a961-238b4e2d74da only approved; it had no contributing operation. Other synthetic invoices remain $100 each. Generated receipt/reconciliation numbers use September 13 UTC; the run occurred September 12 locally.

Evidence in ignored tmp/finance-uat-fixtures: manifest.json; finance-flow.mjs, allocate-flow.mjs, reconcile-flow.mjs; flow-results.json, allocation-results.json, reconciliation-results.json and progress files; billing-populated.png, import-preview.png, allocated-receipt.png, reversed-120.png and reconciliation-approved.png. Import preview and approved reconciliation screenshots visually inspected. Initial runner retries corrected sign-in auto-submit timing, required-marker selectors and expected API success status (the envelope returns 200). These were runner corrections, not duplicate submissions or product defects.

Remaining: FIN-01 legitimate invoice generation/PDF/scientific independence; scanner-backed receipt evidence; forged cross-Customer/currency/backend over-allocation negatives; many-to-many allocations; duplicate reversal rejection and remaining $100/receipt reversal; credit/debit/write-off and stale-version cases; second-Cash-Operator import ownership; separate reconciliation cancellation and contributor-with-approval-role denial; closeout export, aging/export arithmetic and recovery. The closeout disclosure currently displays raw JSON; readable/downloadable report presentation remains a usability follow-up. No complete FIN-01–06 case or production acceptance is claimed.

No product code, auth configuration, dependencies or migrations changed. Guides remain accurate; no corpus regeneration or application suite rerun was needed. Living plans updated; no Git mutation or deployment.

## Finance closeout and corrections — September 12, 2026

The preceding raw-JSON closeout usability finding is fixed locally. FinanceCloseoutReport presents the saved approved totals, period, source count and approval time, with expandable reviewer/UTC references and a readable text download. The download includes draft changes and references contained in the saved evidence. Parsing validates the required fields and matches the report's identity, approver, period and totals to the approved batch. Missing, malformed, mismatched or unapproved evidence produces an explicit error and no report download. Nothing is recomputed or saved as a replacement approval; no API contract, authorization, schema or dependency changed.

Verification: 44 tests passed across FinanceCloseoutReport, FinanceCorrections and PSeqOrderToCashPanels. Ten new report cases cover readable output, downloaded frozen totals/change references, malformed/missing/mismatched evidence, an older valid report without draft changes, unapproved state and download failure. TypeScript and scoped ESLint passed. React review checked hook order, pure parsing, accessible structure, safe text rendering, responsive wrapping and reuse of already-authorized data. Phaeno help and corpus updated: 56 guides, eb12cf6e1e64; generation check passed.

Signed-in CashReconciler opened the saved REC-20260913-7CA177A4 and downloaded its report. Readback verified bank/ledger $75, difference $0, the independent reviewer ID and the deliberate $70-to-$75 draft correction. Desktop 1440px and narrow 320px in both themes had equal page/client widths. Tab reached Approval reference from the download button; Enter toggled the disclosure. Screenshots inspected; a first full-page capture placed the sticky header at the prior scroll offset, so final captures reset scroll to the top. No application writes were allowed during report/export checks, and none occurred.

Continued real signed-in Cash/Billing operations from the existing saved fixtures; no duplicate setup or import:

| Case | Passed result and final state |
| --- | --- |
| FIN-03 remaining allocation | Missing reason blocked submission. Reasoned reversal of 440f90b1-af33-49b8-bfef-87f9a9c1c769 restored the main invoice to $220 outstanding and main receipt to $250 unapplied. Both original allocations retain their reversal history; no further reversal buttons remain. |
| FIN-03 receipt reversal | Only after both allocations were reversed, Cash reversed RCT-20260913-91D82AC7 with a reason. Saved receipt remains $250 original amount, $0 applied/unapplied, Reversed, version 6; allocation and receipt-reversal controls disappear. Main invoice e8d77773-2477-4c16-986b-7cb080f6a1d1 is Issued, $220 balance, version 5. |
| FIN-03 credit | 01e51575-99b9-4f75-a79a-4c4f666563aa: $10 Credit produces $90 balance, version 2. |
| FIN-03 debit | cb40daa5-98c7-4ad0-9dfd-dafa1523319a: $15 Debit produces $115 balance, version 2. |
| FIN-03 write-off | 342c9491-4fd9-4cee-98df-8ba3f1c28b82: $100 WriteOff produces $0 balance, WrittenOff, version 2; further adjustment action absent. |
| FIN-06 invoice exports | With Customer A selected and B excluded from the displayed list, Export all invoices contains all six synthetic invoices including Customer B and the write-off. Export aging has five open invoices totaling $625; all are current at this run time. The all-Customer current aging display also shows $625. |
| FIN-06 cash/reconciliation exports | With Customer B selected and the receipt list empty, Export all receipts still includes both Customer A receipts and retains the reversed $250 entry. Unapplied cash contains only RECON-75 at $75. Reconciliation export retains the Approved $75/$75/$0 batch and distinct contributing/approving actors. |

Independent PostgreSQL readback confirmed invoice/receipt balances, statuses, versions and append-only adjustment kinds/amounts/reasons. Synthetic invoice subtotal, tax and deliberately unavailable PDF keys stayed unchanged; this does not prove preservation of actual PDF bytes. Independent CSV parsing confirmed six invoices, five current open invoices, $625 outstanding, two retained receipts, $75 unapplied and one independently approved reconciliation. The prior approved reconciliation bdfb9157-35e6-4057-aea3-34a0c6813dfb and RECON-75 receipt were preserved. Cash and Billing retained their existing roles; no new identities were created.

Evidence under ignored tmp/finance-uat-fixtures: check-closeout.mjs, closeout-results.json, closeout-{320,1440}-{light,dark}.png, approved-closeout.txt; corrections-flow.mjs, correction-results.json and per-action screenshots; check-exports.mjs, export-results.json and five downloaded CSVs. No browser page errors or unexpected writes. Existing owner browser sessions and lab fixtures remain intact. No commit or deployment; report UI/help change is local.

Next open cases: scanner-backed receipt evidence; legitimate FIN-01 completed-Job invoice/PDF/scientific independence; forged cross-Customer/currency/backend over-allocation negatives; many-to-many allocation variants; duplicate reversal API rejection and stale/unauthorized adjustment cases; second-Cash-Operator import ownership; separate reconciliation cancellation and contributor-with-approval-role denial; overdue aging buckets and controlled section recovery. Readable closeout/download, basic receipt reversal, basic adjustments, current aging and all-Customer exports are now verified locally. Full FIN-01–06 and production acceptance remain incomplete.

## Finance exceptions and upload correction — September 12, 2026

Continued actual signed-in isolated LAB-06 testing from the saved records. Existing three test identities/roles, owner sessions, laboratory records and approved $75 reconciliation were preserved. Negative API requests used the signed-in Cash session's authorization only in memory; no credentials or tokens were logged or persisted. They targeted known local fixtures with deliberately invalid commands. UI writes were restricted to explicitly planned fixture amounts/identifiers.

| Coverage | Observed result |
| --- | --- |
| Duplicate reversals | Current-version attempts to reverse the already reversed $120 allocation and $250 receipt both returned 409/accounts_receivable_transition_invalid. Receipt, allocation history and approved reconciliation readbacks were identical before/after all Cash negative probes. |
| Cash adjustment authority | Direct Cash attempt to credit the known invoice returned 403/business_role_required. |
| Allocation scope and amount | Direct cross-Customer allocation returned 400/allocation_scope_mismatch; direct $76 allocation from the $75 receipt returned 409/accounts_receivable_transition_invalid. This verifies backend rejection in addition to prior UI gating. |
| Currency | EUR import preview returned 400/payment_import_row_invalid; no import or receipt was created. |
| Two-session adjustment | Both Billing sessions reviewed Credit fixture $90/version 2. Second session saved $5 credit, producing $85/version 3. First session's $10 credit returned 409/concurrency_conflict; amount/reason remained, current $85 was shown, and Save was disabled until Use reviewed record. Explicit review then saved once, producing $75/version 4. |
| One receipt across invoices | New SPLIT-150 receipt allocated $100 to SPLIT invoice and $50 to MAIN. Two distinct allocation histories retained; receipt fully applied. |
| Several receipts to one invoice | New SECOND-30 and THIRD-40 receipts allocated $30/$40 to MAIN. These receipts became fully applied; MAIN ended at $100 outstanding/version 8. |
| Draft cancellation | Created a separate balanced $25 reconciliation using only CANCEL-25 receipt. Reasoned cancellation retained history and set Cancelled/version 2; edit, submit and cancel controls disappeared. All receipt readbacks were identical before/after cancellation. |
| Aging recovery | Controlled browser-only 503 left invoice links usable and displayed Aging unavailable. Retry restored actual all-Customer current balance $390. |
| Customer lookup recovery | Controlled browser-only 503 left receipts visible and disabled Record receipt. Retry restored actual choices and creation. Both simulated failures were removed with their closed test contexts. |

New supported import c085dbd4-344d-4677-814d-b3bd110ecb46, source TEST-ONLY-FIN-20260912-VARIANTS, confirmed four receipts totaling $245. Preserve these records; do not rerun setup/import/mutations:

| Fixture | Identifier | Saved amount/state |
| --- | --- | --- |
| SPLIT-150 | eabac431-98ef-4259-85ea-a7a920df85de / RCT-20260913-7DC2C8CC | $150 fully applied |
| SECOND-30 | c3ffddf0-4dcb-4116-936e-ae5313735847 / RCT-20260913-5E7FA194 | $30 fully applied |
| THIRD-40 | f30bd6e1-7765-4f03-b3d2-134da587625c / RCT-20260913-1ACFA14F | $40 fully applied |
| CANCEL-25 | 74fa9bd8-0b66-43aa-be9d-cff1d0244fa2 / RCT-20260913-33D9DBB1 | $25 unapplied |
| Cancelled reconciliation | 2a1ba655-7067-468a-8c34-31f30d8bf67b | $25 bank/ledger, Cancelled/version 2 |

Upload testing found and fixed two product defects. Receipt FormData inherited application/json and Axios converted it to JSON, causing required file/payload binding errors before storage/scanning. The existing result filter then wrapped ValidationProblemDetails in success=true/data despite HTTP 400, so the UI only showed generic retry text. The receipt command now explicitly selects multipart/form-data while retaining its idempotency key; the filter returns success=false, data=null, validation_error, clear field messages and existing field-detail shape for validation problems. No auth, schema, dependency or new envelope shape changed.

Verification: receipt-upload.test.ts exercises the real Axios transform/adapter, ensuring a File remains in FormData rather than becoming JSON. Thirty-eight frontend tests across receipt-upload, pseq-order-to-cash API, FinanceCorrections and PSeqOrderToCashPanels passed. Eight backend tests across ApiResponseEnvelopeFilterTests/ApiResponseTests passed, including malformed multipart fields, validation status/fallback and unchanged success wrapping. TypeScript/scoped ESLint passed. Reviewed Phaeno receipt help: its existing scanner-failure/retained-entry instructions remain accurate; no additional help or corpus change needed.

Restarted only the verified port-7116 isolated API, using tmp/finance-upload-fix-build/Debug/net10.0/PSeq.Operations.Api.dll with the prior configuration copied to tmp/finance-uat-fixtures/start-fixed-api.ps1. Health returned 200. A malformed authenticated upload now returns HTTP 400 with success=false, validation_error, and file/payload details. The real UI request has multipart/form-data with boundary and reaches the unavailable scanner. It returns HTTP 400/receipt_evidence_not_clean, displays the specific reason, and retains the Customer/reference/amount/attachment. No FIN-SCANNER-UNAVAILABLE receipt was saved. Local evidence storage retained only the original 158-byte ingestion artifact; no uploaded receipt artifact remained. Scanner settings were not changed or bypassed. Initial upload runner attempt was blocked by its multipart guard before the API; after adapting the guard to the reviewed form, the real product defects were reproduced and fixed. Final retest passed without blocked/unexpected writes or browser page errors.

Independent database readback: six invoices, $390 outstanding; six receipts, $100 unapplied. Invoice balances are MAIN $100/v8, CREDIT $75/v4, DEBIT $115/v2, OTHER $100/v1, SPLIT $0/v2, WRITEOFF $0/v2. Original MAIN-250 receipt remains Reversed/v6. RECON-75 and its Approved reconciliation remain unchanged at receipt v1/batch v4. There are six retained allocations (two reversed originals, four new active) and five append-only adjustments. Unsupported-currency import count and scanner-test receipt count are zero.

Evidence under ignored tmp/finance-uat-fixtures: negative-flow.mjs and negative-results.json; variants-flow.mjs and variants-results.json; recovery-flow.mjs and recovery-results.json; per-operation progress files and stale-adjustment-review.png, cancelled-reconciliation.png, scanner-unavailable-receipt.png. Stale adjustment and scanner-failure screenshots inspected. Living plans updated; no Git mutation, deployment, migration, new identity or role change.

Remaining gates: legitimate FIN-01 completion/issuance/real PDF/scientific independence; clean scanner-backed upload and protected evidence download; second-Cash-Operator import ownership; contributor-with-approval-role denial; overdue aging buckets and production/physical/provider checks. The existing test identities do not provide the extra Cash/contributing-reviewer role combinations. The current scanner implementation returns unavailable unless the trusted development fixture option is enabled; enabling that option would not establish a real scanning positive. Full FIN cases and production acceptance remain incomplete.


## Finance aging boundaries — September 12, 2026

Actual signed-in Billing verification passed all eight aging boundaries (0, 1, 30, 31, 60, 61, 90 and 91 days) using separately marked isolated fixtures. At UTC date 2026-09-13, bucket totals are $391 current, $6 at 1-30 days, $24 at 31-60, $96 at 61-90 and $128 over 90: $645 outstanding. Aging CSV has 12 open rows; all-invoice CSV has 14 rows, including Paid and WrittenOff. Customer filtering leaves the labeled all-Customer aging/export scope unchanged. Existing receipts, allocations, adjustments and reconciliations were preserved; unapplied cash remains $100. Desktop and fresh 390px page screenshots inspected. This is synthetic arithmetic/export evidence, not legitimate issuance/PDF or production acceptance.

Added eight invoices under TEST-ONLY-FIN-AGING-20260912 for new synthetic Customer bd21020e-04d1-4516-9aae-c3238fadd91c, through domain constructors and the audited local context in a single transaction against fixed 127.0.0.1:5436/phaeno_ops_lab06_uat. A prefix guard rejects duplicate setup. Their source Jobs are deliberately not completed, quote acceptance is not established, and PDF keys are deliberately unavailable. These records do not satisfy FIN-01. UTC as-of date is September 13, although this run's local date is September 12.

| Days past due | Invoice ID | Due date | Balance |
| --- | --- | --- | --- |
| 0 | d1bd5610-94c7-4105-b6f2-d550f426356e | 2026-09-13 | $1 |
| 1 | 890af4f5-031f-4c07-bd5c-a1e51250014e | 2026-09-12 | $2 |
| 30 | ca1b6e57-7eb7-401b-8b19-ae13a2f86bc9 | 2026-08-14 | $4 |
| 31 | d0d82e05-e032-43c1-ab8a-8a668e5ccdf7 | 2026-08-13 | $8 |
| 60 | aa3dfc06-fa9e-4d3e-8745-8d8cb973cad7 | 2026-07-15 | $16 |
| 61 | 00a04e61-0384-452f-b170-4b5c70621b91 | 2026-07-14 | $32 |
| 90 | 764591ab-84dd-479d-8107-3865746f6bad | 2026-06-15 | $64 |
| 91 | 92cec6ff-946f-4ba4-9665-d0865d30a125 | 2026-06-14 | $128 |

Signed-in Billing browser checks verified each displayed bucket before/after filtering to the new Customer. Downloaded CSVs were parsed independently: every new due date, days-past-due and balance matched saved facts; recomputed buckets matched the UI and sum $645. All-invoice export includes the other Customer and terminal invoices despite the selected Customer filter. Read-only database check confirms the original six invoice balances remain $100/$75/$115/$100/$0/$0; six receipts retain $100 unapplied; original Approved reconciliation remains version 4 and cancelled variant version 2. No application API writes occurred in the browser run; no page errors or unexpected requests occurred.

The first narrow check ran immediately during viewport resize and observed transient overflow/squeezed sidebar padding. A fresh 390px page load was inspected and correctly collapses navigation, wraps long identifiers/details, and fits controls without horizontal overflow. This establishes the fresh narrow layout; no product defect or correction was concluded from the transition capture. An intermediate harness rerun had a text-encoding selector error, corrected before final pass. The fixture transaction committed before a local artifact permission failure; manifest was recovered using a read-only query, without rerunning setup or creating duplicates. The helper build passed with zero warnings/errors. No product code or new automated test suite changed, so no additional application unit suites ran. Existing user help was reviewed and remains accurate.

Evidence is under ignored tmp/finance-aging-uat: Program.cs, FinanceAging.csproj, recovered manifest.json, check-aging.mjs, results.json, geometry.json, aging-boundaries.csv, all-invoices.csv, aging-desktop.png and aging-mobile.png. Preserve setup and dated facts; a later UTC date changes bucket expectations. Final live results contain 12 open-export rows, 14 all-invoice rows, buckets [391,6,24,96,128], no browser errors and no writes. No owner browser session, authentication policy, existing identity/role, migration, Git state or deployment changed.

Next bounded role-test scope, pending explicit approval: one additional development-only Finance test login with CashOperator and CashReconciler on the isolated LAB-06 database. It would test rejection when confirming another Cash Operator's preview, then rejection of approval on its own contributed reconciliation, preserving the existing independent reviewer and approved batch. No production roles, existing human accounts, provider policy or invitation delivery would change. Do not provision or grant these extra roles until approved.

Remaining gates: second-Cash-Operator import ownership and contributor-with-approval-role denial; clean real scanner-backed upload/protected download; legitimate completed-Job invoice/PDF and scientific independence; enabled attention and production/physical/provider checks. FIN-06 aging, export and recovery subcases are verified locally; the complete case remains partial because its enabled attention/provider prerequisites remain unavailable. Full FIN and production acceptance remain incomplete.


## Finance role separation — September 12, 2026

Owner approved one additional development-only CashOperator + CashReconciler login. Actual signed-in UAT passed second-operator import ownership rejection (preview and direct confirm), with retained input and no receipt created. The combined-role user then imported a separate $7 receipt; a different Cash Operator created/submitted its reconciliation. Approval by the receipt contributor returned 409 and left the batch Submitted/version 2 with no approval/report. This isolates contribution exclusion from creator/submitter exclusion. Existing approved reconciliation and all previous receipt readbacks remained identical. Outstanding invoices remain $645; seven receipts now have $107 unapplied. No product defect, code, production role, provider policy, migration, Git or deployment change.

Approval: owner explicitly approved the preceding bounded account/role scope. Created uat.cash-review+clerk_test@example.com (UAT Cash Review), subject user_3JFiHYEKfMYOv9xHLCOJIdCzIkF, only after checking development keys and exact Clerk development instance ins_3EaSONG9skFvfhZDZcWQuSitf9y. Password generated randomly and retained only in local Windows-encrypted credential storage. No password/token in run evidence, no invitation/email delivery and no provider policy change. Audited domain setup against fixed 127.0.0.1:5436/phaeno_ops_lab06_uat linked internal user 32a2774b-9cfe-4e99-933a-79770a0aa055, active Phaeno membership 9ff77b04-f127-41fe-84b3-44f9331850f9 and General department 786c1d1b-b17c-4532-884d-77742441e9dd. Independent database query verifies exactly CashOperator and CashReconciler, no organization/department administration and zero Lab roles. Existing accounts/roles were not edited.

| Check | Live evidence |
| --- | --- |
| New account login | Actual Clerk login with development verification challenge; Finance navigation Receipts, Import receipts, Reconciliation. |
| Import ownership | Original Cash previewed one $3 row, source TEST-ONLY-FIN-OWNERSHIP-20260912. New Cash attempted the same preview: 409/payment_import_preview_owned. Source/CSV stayed entered, no confirm action appeared. A direct authenticated confirm with the current saved version also returned 409/payment_import_preview_owned. All six prior receipts remained identical. |
| Legitimate own import | New Cash previewed and confirmed one separate $7 row, source TEST-ONLY-FIN-CONTRIBUTOR-20260912. Exactly one receipt created and remains unapplied. |
| Contributor independence | Original Cash created and submitted a balanced $7 reconciliation containing only the new user's receipt. New Cash/Reconciler clicked Approve independently: 409/accounts_receivable_transition_invalid with explicit independence explanation. Creator/submitter are the original Cash user, so the denied actor is solely the receipt contributor. |
| No failed-approval writes | Full reconciliation detail was identical before/after rejection: Submitted/version 2, no approver/report. Original Approved $75 reconciliation readback was identical. Every preexisting receipt readback was identical; invoices remain 14/$645 and receipts are seven/$107 unapplied. |

Preserve these records and do not replay setup/import/create/submit commands:

| Record | ID | Saved state |
| --- | --- | --- |
| Ownership preview | 96cd1c03-d321-4f01-b73c-6a5327059502 | Preview/version 1, one row/$3; owned by original Cash, no receipts |
| Contributor import | 989956fe-ea3a-45d8-860c-c9963da43d58 | Confirmed/version 2, one row/$7 |
| Contributor receipt RCT-20260913-E729C81C | 44c6612d-595f-478d-8ae0-73d57a3a1ce0 | $7 unapplied/version 1; recorded by new combined-role user |
| Reconciliation REC-20260913-F72C1E7B | e2f1d7ea-4de1-4d7b-afca-5446717245db | Submitted/version 2, $7 bank/ledger, zero difference; created/submitted by original Cash |

Helper build passed with zero warnings/errors. Signed-in browser harness used separate contexts and a narrow API write allowlist; direct ownership-confirm negative used only that new user's signed-in headers in memory. No browser page errors or unexpected/blocked writes. Import ownership and approval rejection screenshots inspected. Evidence: ignored tmp/finance-role-uat/Program.cs, FinanceRoles.csproj, check-roles.mjs, progress.json, results.json, import-owned-rejection.png, contributor-approval-rejection.png; provider setup helper/metadata/DPAPI credential remain under ignored tmp/finance-uat-identities. New account is retained for controlled UAT; no need for the owner to switch their active login. No application source changed or additional unit suite needed. Existing Phaeno help already states import ownership and independent reconciliation approval and remains accurate; living plans and this checkpoint updated.

Remaining scope: FIN-04 ownership subcase and FIN-05 receipt-contributor rejection are now verified locally. This does not independently browser-test every creator/editor/allocator/reversal/adjustment exclusion; those variants must not be marked passed from this one receipt-contributor case. Real scanner-backed receipt upload/protected evidence download, legitimate completed-Job invoice/PDF and scientific independence, and enabled attention/production/physical/provider checks remain incomplete. The next integration prerequisite is a real malware scanner for operational evidence: current EnvironmentOperationalFileScanner returns Unavailable unless its trusted-development fixture option is enabled. That fixture option is not a substitute for clean-scanner acceptance. No scanner setting or implementation changed in this turn.


## Real scanner and receipt evidence — September 12, 2026

Real ClamAV is now active only for the isolated LAB-06 API. The integration already existed; the earlier missing-integration diagnosis traced only the DevelopmentFixture implementation and was incomplete. Real clean/EICAR/encrypted/oversize/health checks and both injected storage/scanner adapter checks passed. Signed-in Cash upload rejected EICAR with no receipt, retained entries, then saved one $1 receipt after a clean replacement. Exact 83-byte download passed; Billing-only access returned 403 and anonymous access 401. A discovered client filename defect was fixed locally: supported server extensions are retained for receipt evidence, including JSON imports. Nine scanner tests, ten focused frontend tests, TypeScript, scoped lint and documentation checks passed. Existing balances/history remain intact; there are 14 invoices/$645 outstanding and eight receipts/$108 unapplied.

Correction to the preceding checkpoints: Program.cs registers AddFileScanning. Infrastructure/Storage/FileScanning.cs already implements real ClamAv INSTREAM and the OperationalFileScannerAdapter, as documented in the September 7 completion plan. The isolated API had defaulted to DevelopmentFixture and therefore EnvironmentOperationalFileScanner. Looking only at that class incorrectly suggested no real integration existed. The gap was local service/configuration readiness. Historical production activation remains separate from this local verification; no production service or configuration was accessed or changed.

Local Docker recovery: installed Docker Desktop was initially stopped and failed startup due to stale Windows socket reparse entries (dockerInference, docker-secrets-engine/engine.sock and userAnalyticsOtlpHttp.sock). Windows could not rename them. After verifying the processes started for this UAT, they were stopped and the exact socket entries were preserved under .uat-preserved-* names through Ubuntu; later failed attempts recreated entries, so the known set was preserved together before successful startup. Docker data, volumes, user settings and credentials were not reset/deleted. The backup entries remain in their original directories. Existing Ubuntu had no ClamAV installation; no OS package installation or application dependency change occurred.

Scanner runtime:

- Separate Docker compose project phaeno-finance-uat, container phaeno-finance-uat-scanner, dedicated phaeno-finance-uat_signatures volume. No managed-file volume is exposed to the scanner; file content streams through the existing adapter. Compose/script mounts contain only temporary UAT configuration/evidence.
- Repository image clamav/clamav:1.4_base resolved to image sha256:eebd9ef9fa33bd29706c54879e0fdd732f1a54afcf1bf515fe15ccf4e5eca781. Actual loaded version ClamAV 1.4.6/28121, signatures built Sat Sep 12 06:24:41 2026. FreshClam updater and loaded-signature age checks passed.
- Port binding is only 127.0.0.1:3316 -> container 3310. Reused repository clamd.conf, supervise.sh, health.sh and smoke.sh with LF endings. Same complete-scan, encryption, heuristic and 100 MiB stream limits; no bypass or relaxed size/signature checks. Runtime has 4 GiB/2 CPU limits.
- Existing smoke script passed clean text, harmless EICAR rejection, encrypted ZIP rejection, exact oversized INSTREAM rejection and current scanner health. Existing --verify-file-services command passed both storage areas, SHA-256, exact readback, real clean scanning and verified deletion without database/HTTP/workers.
- Restarted only verified API port 7116, same tested finance-upload-fix-build binary, LAB-06 database/storage/roles/other settings. New temporary launcher tmp/finance-scanner-uat/start-scanned-api.ps1 sets FileScanning Provider=ClamAv, Host=127.0.0.1, Port=3316, TimeoutSeconds=120, MaximumStreamBytes=104857600, ClamAvLimitsConfirmed=true after verification. API returned health 200; final API PID 46072 (launcher 21292), scanner healthy. Old start-fixed-api.ps1 remains historical and would restore the development selection; use the new launcher for this saved checkpoint. Owner browser sessions were not switched.

Actual Cash UI proof:

1. Started separate external reference FIN-REAL-SCANNER-20260912 for Customer A, $1, harmless synthetic payer/method/reference. Uploaded standard harmless antivirus test text held in memory. Real scanner rejected it: HTTP 400/receipt_evidence_not_clean. External reference/amount/attached-file state remained, no receipt was created and all seven prior receipt readbacks were identical.
2. Replaced evidence with clean text in the same form. Saved exactly one receipt: 5d0b4cda-4c82-4fc5-a44c-24b12738f644, RCT-20260913-DB6D4025, Unapplied/version 1, $1 amount/unapplied. Original failed-upload fixture was cleaned up.
3. Download evidence as Cash returned exact 83 bytes. Billing-only authenticated GET returned 403/business_role_required; anonymous GET returned 401. No unauthorized file bytes returned.
4. Client initially discarded the server filename extension. Corrected downloadPaymentEvidence to retain supported Content-Disposition extensions (PDF/PNG/JPG/JPEG/TXT/JSON) on the receipt-based filename and use .bin for absent/unsupported headers. Protected retrieval and object-URL cleanup are unchanged. Real read-only retest saved RCT-20260913-DB6D4025-evidence.txt with matching bytes and RCT-20260913-E729C81C-evidence.json with the retained one-row $7 import content. No mutations during the retest.

Storage readback retains exactly original ingestion artifact 0e10ef6f92024cc490de81fdffe882ac.txt (158 bytes) plus new receipt file order-files/2026/09/864d8156aa05406091c0f9bf1d930080.txt (83 bytes). Saved and downloaded SHA-256 both 50BA6E94BC7A5DE3DF30D2A53D0F283892BFEE52DA115507493B0ADC6D304422. Receipt evidence key is receipt-evidence:2026/09/864d8156aa05406091c0f9bf1d930080.txt. Database readback shows exactly one receipt with the new external reference. Original reconciliations remain Approved/v4, Cancelled/v2 and Submitted/v2; 14 invoices total $645, eight receipts $108 unapplied. Do not replay the upload creation or prior financial mutations.

Validation: nine existing FileScanningTests passed. Ten frontend tests passed across receipt-evidence-download (six new cases), receipt-upload and pseq-order-to-cash API. TypeScript initially found an untyped this in the new test stub; explicit HTMLAnchorElement annotation corrected it, and TypeScript plus scoped ESLint and the six filename tests passed again. No full suite run. Phaeno cash help now states receipt-based filenames, retained extensions and JSON import evidence. Generated documentation is 56 guides / 9e7fac7318fd; check and diff whitespace validation passed. Rejection and saved-receipt screenshots inspected; no browser page errors or unexpected writes.

Ignored evidence: tmp/finance-scanner-uat/compose.yml, clamd.conf, health.sh, supervise.sh, smoke.sh, verify-services.ps1, start-scanned-api.ps1, API logs, check-upload.mjs, upload-progress.json, upload-results.json, saved-receipt.json, check-downloads.mjs, filename-results.json, downloaded-evidence.txt, verified-download.txt, verified-import.json, antivirus-rejection.png and clean-receipt.png. Scanner/API are left running for continued local UAT. Stopping Docker makes new uploads fail closed; do not substitute DevelopmentFixture to claim real scanning.

Remaining acceptance: FIN-02 real text scanning/rejection/recovery and protected download are verified locally; not every approved file format or production configuration is covered. Failed antivirus uploads still use the same general scanner-not-cleared message as unavailable scanning; presenting a distinct rejected-file recovery message is a remaining usability follow-up, not a failed rejection boundary. FIN-01 legitimate completed-Job invoice/real PDF and scientific independence, additional role contribution variants, enabled attention and production/physical/provider gates remain open. Existing metadata-only result package must not be published as a shortcut. No Git staging/commit/push, deployment, migration, production mutation, new role or auth-policy change in this turn.

## Billing approval and completion handoff - September 12, 2026

Continued FIN-01 in the existing isolated LAB-06 runtime (UI 3016/API 7116/database phaeno_ops_lab06_uat). Signed in as the existing BillingOperator. No production, deployment, Git, migration, identity or role changes.

Passed with TEST-ONLY-FIN-20260912 Customer A (ae3fa8da-5ccd-4f4d-a2f1-2ffe266dbe34):

- Missing billing fields, a 101% tax rate, and Exempt without evidence show field errors without submitting a write. Approval is unavailable before setup and while billing changes are unsaved. Empty approval notes are rejected.
- Saved synthetic contact/address, Net 30 and a 10% test tax rate; saved profile required approval. Approval succeeded with explicit TEST ONLY notes.
- Changing terms to Net 45 cleared approval. Fresh approval succeeded. Exactly four profile writes occurred (save, approve, save, approve), all HTTP 200/success=true.
- Fresh signed-in readback and page reload retained Net 45, Taxable/0.1 and approval. Profile b2761d1b-882b-4c9d-b26e-a33f069a4a12 is version 4/configuration version 3, approved by c1c897e7-0885-4e17-a298-51550068f4b8 at 2026-09-13T02:13:05.259522Z. Preserve it; do not rerun the mutation script.
- All 14 invoice API readbacks were identical before/after. Receipt count/unapplied total remain 8/$108; outstanding invoices remain $645. This proves existing synthetic invoice readbacks remain unchanged, not legitimate issuance or PDF immutability.
- Inspected settled desktop and 390px screenshots. At 390px, body width is 390 and dialog spans x=16 to 374; content scrolls within the modal, with the required legend and Close in its footer. No browser page errors. This is bounded billing-screen evidence, not full mobile acceptance.

Evidence: tmp/finance-scanner-uat/billing-before.json, billing-progress.json, billing-final.json, billing-approved-desktop.png and billing-approved-mobile.png. check-billing.mjs contains completed writes and MUST NOT be rerun. check-billing-readback.mjs is read-only. Harness corrections: Billing-only receipt GET correctly returned 403, so invoice preservation uses authorized reads and receipt totals use read-only DB inspection; the first run stopped after all four successful writes because two Close controls shared a name. Resumption was read-only. Initial animation-frame capture was replaced after animation completion.

FIN-01 remains partial. Step 1's setup/approval behavior passed; issuance rejection with an incomplete profile, genuine completed-Job issuance/PDF, idempotent completion recovery, pre-tax invoicing and unpaid scientific download remain unverified.

### Completion blockers and next implementation slice

Read-only evidence shows both genuine saved InProgress Jobs still have only Accessioned Commercial samples: 69SJN4PA (0b494109-5104-4369-8b18-578bbaec2b4b, seven samples, version 14) and HS5Y7DB7 (88967799-264c-490d-abe2-17e7833c6065, nine samples, version 16). No saved Completed or ResultsAvailable Job is ready for this test. Synthetic Finance invoice source Jobs remain DraftRequest and are not substitutes.

Code tracing identifies a real workflow disconnect:

- OrderOperationsPage.primaryActions offers hold/quote actions but no Job completion action; the former LabOperationsPanel was removed when physical work moved to Lab Operations. The completion endpoint remains in PlatformLabServiceOrdersController.Complete.
- LabServiceOrder.Complete requires every Commercial sample to be Completed or Rejected. CommercialLabIntakeProgressService updates receipt/accession only. The governed PSeq result Release action creates release/retention/delivery records but does not update the Commercial sample or Job status. Legacy manual sample transitions still exist in the API; manually fabricating those transitions is not acceptable end-to-end proof.
- The local enforced-role runtime has no active CommercialOperator. Completion requires that role, including for administrators when enforcement is on. Adding a test role requires separately scoped owner authorization; no role was added.

Next implementation slice: connect authoritative Lab outcomes to Commercial completion readiness, retain failure versus intake-rejection meaning, and expose an authorized, version-checked Complete Job action with visible reasons when blocked. Preserve quote/billing snapshots, idempotent invoice issuance and independent scientific release. Cover partial completion, exhausted material/failure, stale/duplicate events, held work, corrections/withdrawals, authorization and repeat completion. Do not equate library-prep completion with final Job completion, or make payment a scientific gate. Resume real invoice/PDF UAT only with an eligible fixture advanced through those supported paths.

Minor observed presentation follow-up: immediately after approval, the same open billing modal can still display the earlier save-success instruction to review/approve. The approved badge and saved state are correct; reopening clears the stale message. Not changed in this checkpoint.
