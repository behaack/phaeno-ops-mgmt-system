# 07 — Finance

Use [shared prerequisites](TEST-DATA.md) and isolated financial fixtures. These cases test PSeq native receivables. Partner Kit accounting remains attached to its original shipment context; no Partner Finance expansion is assumed.

## FIN-01 — Approved billing, frozen invoice and scientific independence

**Setup:** P-BILL, completed Customer Job, 100.00 × two specimens/test 10% tax fixture, approved terms; separate pre-tax quote variant.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | In Finance → Customer billing complete billing contact/address, terms and tax determination; obtain required Finance approval. | Unapproved/incomplete profile cannot support final standard commitment or invoice issuance. |
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
| 1 | Compare invoice due dates/outstanding balances to aging buckets at recorded run time. | Bucket totals reconcile to invoice facts, adjustments and allocations; currencies are not silently mixed. |
| 2 | Filter Finance to Customer A, open a record and return. | Customer filter/section retained; detail retains record identity. |
| 3 | Export all invoices/all receipts and inspect known Customer B fixture. | Exports explicitly include all Customers; aging is also all-Customer, independent from displayed list filter. |
| 4 | Trigger one section/supporting choices failure and use Retry. | Failure is distinct from no records; unrelated usable sections remain available; creation waits for required choices. |
| 5 | Follow overdue/unapplied/reconciliation attention items where enabled and compare an unavailable legacy connector. | Correct owning record opens; disabled queue is labeled as unavailable, and absent connector cannot fabricate paid/posted/zero-balance success. |

**Cleanup:** Restore test network behavior; record disabled attention/provider prerequisites as Blocked rather than empty success.

**Sources:** [Finance guide](../../frontend/src/content/docs/phaeno/order-billing-payment-release.mdx), [receivables plan](../plans/PSEQ-ACCOUNTS-RECEIVABLE-PLAN.md), [Finance controller](../../backend/app/Features/OrderManagement/Controllers/AccountsReceivableController.cs), [evidence database tests](../../backend/test/AccountsReceivableEvidencePostgresTests.cs), [payment-import domain tests](../../backend/test/PaymentImportBatchDomainTests.cs).
