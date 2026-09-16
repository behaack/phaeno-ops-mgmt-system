# 07 — Finance

## Remaining-case review — September 15, 2026

FIN-01 and FIN-03 now pass the approved simulated scope: authoritative Lab completion creates the invoice/PDF, failed processing remains billable under the approved policy, current holds block completion, and original PDF bytes survive billing changes and adjustments. Existing operational cash records were preserved. [Current crosswalk](runs/2026-09-15-remaining-case-acceptance.md). Historical checkpoints below are unchanged.

## Billing approval and completion handoff - September 12, 2026

Actual signed-in FIN-01 billing validation, approval, approval reset after a terms change, reapproval and reload passed on the existing marked Customer A. Saved profile is version 4/configuration 3, Net 45 with a synthetic 10% tax rate. All invoice readbacks stayed identical; receipt totals remain 8/$108 unapplied. Settled desktop/390px billing screenshots inspected. FIN-01 remains partial: neither saved InProgress Job has terminal Commercial samples, governed release does not advance those statuses, the current Job UI has no completion action, and this isolated runtime lacks CommercialOperator. No completion, invoice issuance, PDF, role change or production action was performed. [Saved checkpoint and blockers](runs/2026-09-12-lab-production-verification.md#billing-approval-and-completion-handoff---september-12-2026). Preserve the approved Customer profile; do not replay setup.

Use [shared prerequisites](TEST-DATA.md) and isolated financial fixtures. These cases test PSeq native receivables. Partner Kit accounting remains attached to its original shipment context; no Partner Finance expansion is assumed.

## Latest isolated run — September 12, 2026

Real ClamAV is now active only for the isolated LAB-06 API. The integration already existed; the earlier missing-integration diagnosis traced only the DevelopmentFixture implementation and was incomplete. Real clean/EICAR/encrypted/oversize/health checks and both injected storage/scanner adapter checks passed. Signed-in Cash upload rejected EICAR with no receipt, retained entries, then saved one $1 receipt after a clean replacement. Exact 83-byte download passed; Billing-only access returned 403 and anonymous access 401. A discovered client filename defect was fixed locally: supported server extensions are retained for receipt evidence, including JSON imports. Nine scanner tests, ten focused frontend tests, TypeScript, scoped lint and documentation checks passed. Existing balances/history remain intact; there are 14 invoices/$645 outstanding and eight receipts/$108 unapplied. [Latest real-scanner checkpoint](runs/2026-09-12-lab-production-verification.md#real-scanner-and-receipt-evidence--september-12-2026). Preserve the saved $1 receipt and its evidence; do not rerun the create flow. This confirms the text-evidence path, not every permitted format or production acceptance.

### Earlier role-separation checkpoint

Owner approved one additional development-only CashOperator + CashReconciler login. Actual signed-in UAT passed second-operator import ownership rejection (preview and direct confirm), with retained input and no receipt created. The combined-role user then imported a separate $7 receipt; a different Cash Operator created/submitted its reconciliation. Approval by the receipt contributor returned 409 and left the batch Submitted/version 2 with no approval/report. This isolates contribution exclusion from creator/submitter exclusion. Existing approved reconciliation and all previous receipt readbacks remained identical. Outstanding invoices remain $645; seven receipts now have $107 unapplied. No product defect, code, production role, provider policy, migration, Git or deployment change. [Role-separation checkpoint](runs/2026-09-12-lab-production-verification.md#finance-role-separation--september-12-2026). Preserve the unconfirmed $3 preview and Submitted $7 batch as evidence; do not rerun mutations.

### Earlier aging checkpoint

Actual signed-in Billing verification passed all eight aging boundaries (0, 1, 30, 31, 60, 61, 90 and 91 days) using separately marked isolated fixtures. At UTC date 2026-09-13, bucket totals are $391 current, $6 at 1-30 days, $24 at 31-60, $96 at 61-90 and $128 over 90: $645 outstanding. Aging CSV has 12 open rows; all-invoice CSV has 14 rows, including Paid and WrittenOff. Customer filtering leaves the labeled all-Customer aging/export scope unchanged. Existing receipts, allocations, adjustments and reconciliations were preserved; unapplied cash remains $100. Desktop and fresh 390px page screenshots inspected. This is synthetic arithmetic/export evidence, not legitimate issuance/PDF or production acceptance. [Latest aging checkpoint](runs/2026-09-12-lab-production-verification.md#finance-aging-boundaries--september-12-2026). Do not rerun seed helpers or earlier mutations.

### Earlier exceptions checkpoint

The [exceptions and upload checkpoint](runs/2026-09-12-lab-production-verification.md#finance-exceptions-and-upload-correction--september-12-2026) records the preceding saved state: backend duplicate/scope/amount/authority negatives, two-session recovery, split allocations, cancellation, section recovery and unavailable-scanner rejection passed. Receipt multipart and validation-envelope defects were fixed locally. MAIN is now $100 outstanding; CREDIT $75; total outstanding $390 and unapplied cash $100. New VARIANTS receipts and cancelled draft are retained. The original approved reconciliation remains unchanged. Do not replay earlier mutations. At that checkpoint, positive scanning/real issuance, remaining identity cases and overdue cases were open; overdue coverage is recorded above.

### Earlier closeout and corrections checkpoint

The [closeout and corrections continuation](runs/2026-09-12-lab-production-verification.md#finance-closeout-and-corrections--september-12-2026) supersedes the saved balances below: both main allocations and the $250 receipt are now reversed; the main invoice is $220 outstanding. Credit/debit/write-off fixtures are $90/$115/$0. Readable closeout/text download, remaining receipt reversal, basic adjustments, current aging and all-Customer exports passed. Preserve those records; do not rerun their mutations. Remaining negative/concurrency/ownership/overdue/scanner/full-issuance cases are recorded in that checkpoint.

### Earlier populated checkpoint

The [populated Finance checkpoint](runs/2026-09-12-lab-production-verification.md#populated-finance-acceptance--september-12-2026) records real Billing/Cash/Reconciler acceptance of invoice detail/filter return, CSV validation/confirmation/duplicate prevention, $100 + $120 allocation, the $120 reversal, and separate $75 reconciliation approval. Preserve the main fixture's $120 invoice balance and $150 unapplied cash for remaining FIN-03 steps. Synthetic invoices do not establish FIN-01 issuance/PDF. Full cases remain partial; exact remaining coverage and raw-JSON closeout presentation are recorded in the checkpoint.

## FIN-01 — Approved billing, frozen invoice and scientific independence

**Setup:** P-BILL, completed Customer Job, 100.00 × two specimens/test 10% tax fixture, approved terms; separate pre-tax quote variant.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | In Finance → Customer billing complete billing contact/address, terms and tax determination; obtain required Finance approval. | Incomplete fields and missing approval notes are rejected; billing changes clear approval. An approved profile supports frozen tax/terms. Explicitly pre-tax quotes may precede approval; invoice issuance still requires complete approved billing when the quote lacks those snapshots. |
| 2 | Complete legitimate Job workflow and inspect generated invoice/PDF. | One numbered immutable invoice; expected fixture total 220.00, due date based on completion and frozen terms. |
| 3 | Repeat completion notification/recovery through engineering-supported idempotency check. | Same invoice/document identity; no duplicate invoice or accounting source. |
| 4 | Change current billing/tax after issuance and reopen old invoice; test pre-tax quote variant once billing is approved. | Existing invoice/approved snapshots unchanged; pre-tax path freezes approved terms at invoicing. |
| 5 | Keep invoice unpaid and verify eligible LAB-06 release/download. | Scientific PSeq results remain independent from receivable balance; immutable invoice remains collectible. |

**Handoff:** Retain invoice/PDF checksum, amount/due date and outstanding balance for FIN-02–05.

## FIN-02 — Receipt evidence, split allocation and overpayment

**Setup:** P-CASH; 220.00 invoice, 250.00 controlled receipt, another same-Customer invoice and different-Customer invoice, approved harmless evidence file.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Record receipt with payer/date/method/references and approved-format evidence within 10 MB. | Scanner must pass before save; persisted receipt/evidence link available only to authorized roles. |
| 2 | On separate draft simulate unavailable/rejected scanner. | Receipt remains unsaved; entries retained, no false success or duplicate receipt on recovery. |
| 3 | Allocate 100.00 then 120.00 to the 220.00 invoice. | Invoice balance 0.00; receipt unapplied 30.00; each allocation retains amount, actor and history. |
| 4 | Test over-allocation, cross-Customer invoice, and unsupported currency combination. | Invalid combinations rejected; matching suggestions/search alone never apply money. |
| 5 | Use separate fixtures for one receipt across two invoices and two receipts against one invoice. | Individual balances and unapplied totals reconcile; selected invoice remains reviewed while paging/searching. |

**Handoff:** Preserve main 120.00 allocation ID for FIN-03; record independent balance readback.

## FIN-03 — Allocation reversal, receipt reversal and invoice adjustments

**Setup:** FIN-02 main arithmetic fixture; P-CASH/P-BILL; separate adjustment invoices.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Reverse the 120.00 allocation with reason. | Original allocation retained; invoice outstanding 120.00, receipt unapplied 150.00. |
| 2 | Try reversing that allocation again and reversing receipt while 100.00 remains allocated. | Duplicate reversal and premature receipt reversal blocked; balances unchanged. |
| 3 | Reverse remaining active allocation, then reverse receipt with reason. | Receipt reversal permitted only after no active allocation remains; original receipt/evidence/audit retained. |
| 4 | As Billing Operator add separate credit, debit and write-off adjustments to their test invoices. | Original invoice/PDF unchanged; append-only amount/reason/actor retained and outstanding balance adjusts correctly. |
| 5 | As unauthorized limited role attempt adjustment; concurrently edit reviewed invoice balance in two sessions. | Authority/stale version enforced; recovery preserves entries and requires deliberate review of refreshed record. |

**Cleanup:** Retain financial audit; never delete an issued invoice or reverse real cash for testing.

## FIN-04 — Receipt import preview, ownership and duplicate prevention

**Setup:** Two Cash Operators, controlled CSV/source/Customer, valid rows totaling known amount, invalid-row variant.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Preview invalid CSV, then corrected valid input. | Row errors are clear; preview creates no receipts; valid preview freezes Customer/source/rows/total. |
| 2 | Change input or Customer after preview and attempt confirmation. | Old preview cannot authorize changed input; a fresh review is required. |
| 3 | Open the same file as second operator and attempt confirmation. | Only the operator who owns/reviewed the preview may confirm; no file renaming workaround. |
| 4 | Original operator confirms and retries unchanged accepted file. | One import batch with unapplied receipts; confirmed file cannot import twice. |
| 5 | Inspect source evidence, matching suggestions and Finance totals. | Source/identifiers retained; no automatic allocation; totals equal accepted rows once. |

**Handoff:** Use unique unallocated import receipts for reconciliation, separate from reversal tests.

## FIN-05 — Draft reconciliation, independent approval and immutable closeout

**Setup:** P-CASH and P-RECON with no contributing activity; test receipts totaling known bank amount; draft-editor second identity.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Create reconciliation with deliberate bank-total difference, then attempt submit. | Difference visible; unbalanced batch cannot submit. |
| 2 | Edit draft period/bank total/selected receipts with reason to balance. | Totals recompute; before/after selections and editor recorded; related difference attention resolves where enabled. |
| 3 | Cancel a separate draft with reason. | Cancelled batch retained; underlying receipts/allocations unchanged. |
| 4 | Submit balanced main batch; attempt creator/contributor/editor self-approval. | Dual-control exclusions enforced; submitted batch cannot use draft edit/cancel. |
| 5 | Independent eligible Cash Reconciler approves and downloads closeout report. | Immutable approved report matches selected contributing records/totals; actor/time retained. |

**Cleanup:** Preserve approval evidence and contributor identities; do not reuse contributors as independent reviewers.

## FIN-06 — Aging, exports, attention and section recovery

**Setup:** Known current/overdue invoices and unapplied receipts for two Customers, authorized finance roles; controlled failed section request.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Compare invoice due dates/outstanding balances at the recorded UTC aging date, including exactly 0, 1, 30, 31, 60, 61, 90 and 91 days past due. | Bucket totals reconcile to invoice facts, adjustments and allocations; currencies are not silently mixed. |
| 2 | Filter Finance to Customer A, open a record and return. | Customer filter/section retained; detail retains record identity. |
| 3 | Export all invoices/all receipts and inspect known Customer B fixture. | Exports explicitly include all Customers; aging is also all-Customer, independent from displayed list filter. |
| 4 | Trigger one section/supporting choices failure and use Retry. | Failure is distinct from no records; unrelated usable sections remain available; creation waits for required choices. |
| 5 | Follow overdue/unapplied/reconciliation attention items where enabled and compare an unavailable legacy connector. | Correct owning record opens; disabled queue is labeled as unavailable, and absent connector cannot fabricate paid/posted/zero-balance success. |

**Cleanup:** Restore test network behavior; record disabled attention/provider prerequisites as Blocked rather than empty success.

**Sources:** [Finance guide](../../frontend/src/content/docs/phaeno/order-billing-payment-release.mdx), [receivables plan](../plans/PSEQ-ACCOUNTS-RECEIVABLE-PLAN.md), [Finance controller](../../backend/app/Features/OrderManagement/Controllers/AccountsReceivableController.cs), [evidence database tests](../../backend/test/AccountsReceivableEvidencePostgresTests.cs), [payment-import domain tests](../../backend/test/PaymentImportBatchDomainTests.cs).
