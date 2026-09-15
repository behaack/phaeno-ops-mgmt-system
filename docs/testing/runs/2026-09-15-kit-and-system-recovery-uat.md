# Kit purchase and cross-system recovery acceptance — September 15, 2026

**KIT-01 and SYS-01 pass isolated software acceptance. Total: 33/81 (40.7%); 48 remain.** Four primarily remote cases and 44 named-gate cases remain. No required step was removed. This checkpoint extends the [shipping recovery pass](2026-09-15-shipping-recovery-uat.md) and carries forward the identified connected variants from the [ten-case execution](2026-09-14-ten-case-execution.md), rather than repeating completed purchases and authorizations.

## Scope and baseline

The owner authorized continuing UAT, fixing gaps, and bounded isolated prerequisites. Actual Clerk sessions used P-PRICE, P-ADMIN, K-DEPT, K-ADMIN and the existing CashOperator. No new roles were granted. The UI is the working source at `https://localhost:3016`; the API remains the owned `https://localhost:7116` process against `127.0.0.1:5436/phaeno_ops_lab06_uat`. Source HEAD is `6208b7f459a0da10d1c359d1221616df5db11080` plus the recorded working changes. API assembly SHA256 remains `4B5929455CCB972970742E47D0525FE1E2965B2CB217E49049F49026362EDB50`. This pass changes the Company editor and help, not API behavior.

New TEST ONLY Partner catalog/offering/profile/address/entitlement configuration supplied the Kit prerequisite. Both new profile versions are eligible software definitions, conspicuously labeled TEST ONLY; they are not scientific validation or actual processed outputs. The offering, catalog, both profiles and address are now inactive and the entitlement ended. Existing shipping addresses and both frozen purchase DTOs compare exactly before/after cleanup. No system defaults or original walkthrough records were changed.

Finance uses one new explicitly synthetic $10 invoice/receipt pair. Its PDF is deliberately unavailable and its source order is not a completed laboratory Job. This proves allocation recovery only; it does not close FIN-01/03 invoice issuance, original-PDF or scientific gates.

## KIT-01 complete crosswalk

| Step | Connected evidence and independent result |
| --- | --- |
| 1 | K-DEPT creates and reopens the two-unit draft with retained shipping instructions and missing PO/address. It remains Draft with zero units/cases. |
| 2 | Fractional quantity is blocked in the form without an API write. Fractional, below-minimum, above-maximum and incorrect-increment requests return 400 with unchanged draft. Inactive offering and missing PO/invalid address prevent placement; zero units/cases exist. Restoring an offering correctly changes its version, so the draft is refreshed before testing missing fields independently. |
| 3 | K-DEPT purchase returns 403. K-ADMIN completes the draft and opens the actual review showing two included cases, frozen profile version 1, $250 per Kit/$500 total, PO and address. The desktop review was visually inspected. |
| 4 | The placement commits while its response is held; submit/dismissal controls are disabled and Escape cannot close it. Dropping only the successful response shows retained retry. Deliberate retry reads the already purchased order and returns to its detail. Refresh and PostgreSQL show the exact same two units/two cases, one Placed event, one UnderReview event and one placement notice. UnderReview is the expected post-placement status. |
| 5 | A separate two-unit draft is reviewed at $500/profile 1. The offering changes to $300 per Kit/profile 2 while that review is open. Direct stale placement returns 409. UI submission saves updated draft terms but refuses placement pending fresh review. PO/instructions remain; Refresh offerings and review again shows $600/profile 2 and requires deliberate confirmation. The original purchase remains exactly unchanged. |

Main retained order: **REAG-20260915-45033f2d72**, `67e3c24d-5915-4934-b774-db8e4cf64ca7`, $500/profile 1. Deliberate changed-terms order: **REAG-20260915-3378dc6795**, `f39e323e-3463-4b4a-8d23-23c318a3f4da`, $600/profile 2. Each has two distinct original units and two cases, no shipment, no Assembly submission and no billing source. Both await Commercial review. Preserve the main order for KIT-02; do not place it again.

## SYS-01 complete crosswalk

| Step | Workflow-specific evidence |
| --- | --- |
| 1 | New Company edit in separate P-PRICE/P-ADMIN sessions: first save persists and second returns 409 with its entered name retained. Existing `ten-trial-connected.json` phase `two-session-draft-conflict` independently proves the same rule on a Trial draft. Retained quote stale-terms and Finance stale-record variants supplement these editable-record checks. |
| 2 | Company now loads current changed details, blocks save until **Use reviewed record**, keeps entered values and deliberately saves using the reviewed version. Current-record read failure exposes Retry current record (focused regression). The retained Trial run uses **Reload current Trial; keep my entries**, then saves the second user's objective using the current version. Retained standard quote recovery requires refreshed terms and fresh acceptance. |
| 3 | Actual held Company and Finance responses protect save/Cancel, Escape and before-unload navigation; Company fields are disabled. Kit placement protects its submit/Keep editing/Escape controls. The retained standard quote acceptance journal also verifies its own held-response busy controls and Escape protection. Trial submission and sample finalization provide the distinct committed-loss/replay checks in step 4. Requests and version readback, not button appearance alone, establish absence of repeat mutations. |
| 4 | Company: after committed response loss, retry returns 409; current review displays the already saved name. Discarding the retained draft and refreshing recovers that single committed version. Finance: a $3 allocation commits, response is dropped, entered amount remains, and stale retry returns 409; review shows $7 unapplied. Reopening the receipt recovers the exact allocation. Kit: retry recovers the purchased record with the same case/unit IDs. Retained `ten-orders-connected.json`, `ten-trial-submission.json` and `ten-roster.json` prove one accepted quote and single populated submission/finalization authorization/Job/shipment/sample sets after response loss. |
| 5 | Independent PostgreSQL readback at 2026-09-15T13:08Z confirms both intended Kit histories and IDs, one $3 allocation with CashOperator attribution, receipt/invoice versions 2 with $7 balances, and Company version 5 with the expected P-ADMIN audit attribution. Retained ten-case SQL/verification artifacts cover the previously completed quote, Trial and sample-finalization IDs and counts. New UI refreshes agree with the saved Company, receipt and Kit records. |

Company: `5d24770f-4ec1-4e8e-acdc-0d558a5f1cac`, final name **TEST ONLY SYS01 Company response recovered**, version 5. Finance receipt: `b2e5f6c9-0d48-4d46-9e19-6efe2da2d2a6`; invoice: `ab29ef4f-adaf-4185-84b3-cfac76342a9c`; allocation: `2781c3bd-5f1e-4d2d-907c-3dded0680693`. Retain these records and their audit history.

## Defect fixed and validation

The Company editor previously retained a stale draft but offered no path to review the current version and finish saving. It also permitted dismissal while saving. The fix preserves the draft across record-version refresh, displays changed profile/access/owner details, requires explicit review, retries a failed current-record read, and protects pending submission/dismissal/navigation. A dirty cancellation asks before discarding entries. Backend concurrency and authorization remain unchanged.

Both focused test files pass: **10 tests** covering Company forms and CRM reviewed snapshots, including failed current-record reload, retained fields, explicit reviewed retry, pending dismissal and submission guards. TypeScript and scoped lint pass. Actual connected Company conflict and committed-loss checks pass. The React review found no added dependencies or cross-application contract change. Updated Phaeno Company/recovery guides and generated documentation check pass: 56 guides, corpus hash `5b43038f91a939a2e1e970db8e1f7a6ed3d3719f116c6aceeafad2a543374b1e`. This is generated-source validation, not a new deployed search-corpus claim.

Harness corrections were isolated from product behavior: PostgreSQL timestamp precision was normalized for response-versus-read comparisons; allocation history uses its nested allocation/invoice shape; CashOperator correctly cannot use the broader invoice-list endpoint, so readback uses its authorized linked invoice plus independent SQL. The initial fixture writer was denied file creation before its transaction saved; retry with workspace-created journal files succeeded once. No committed business mutation was repeated to work around a harness failure.

All response interception ends with browser-context closure. Notification rows marked Sent are produced by the isolated LoggingOrderNotificationSender, not provider/inbox delivery. Scanner, physical, provider, invoice-PDF and final release gates remain open where required. No deployment, shared migration, external message or Git mutation was performed.

## Evidence and next work

Ignored connected journals under `tmp/uat-closure/`: `kit01-setup.json`, `kit01-connected.json`, `kit01-changed-terms.json`, `kit01-cleanup.json`, `sys01-company.json` (original defect), `sys01-company-recovery.json`, `sys01-finance-fixture.json`, `sys01-finance.json`, `kit-system-readback.sql/.json` and `kit-system-verified.json`. `verify-kit-system.mjs` asserts exact counts, IDs, totals, snapshots and attribution. Corresponding scripts are under `tmp/uat-closure-identities/`. The full step crosswalk above is the durable closure record.

Remaining primarily remote cases: LAB-09, SHP-09, SHP-14 and SYS-05. Continue their named missing variants; reuse the completed recovery evidence. The 44 named-gate cases retain their explicit prerequisites and are not normalized into fractional passes.
